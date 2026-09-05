import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, Table } from 'docx';
import { saveAs } from 'file-saver';
import { TicketReportNew, PhotoSection, Quote, CompanySettings, BeforeAfterSection, GallerySection, TitleSection, TextSection, ListSection } from '@/types/schema';
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// === CONFIGURATION ===
const COLORS = {
    primary: '#556B2F', // Olive Green
    secondary: '#8F9779',
    text: '#2D3748',
    lightText: '#718096',
    border: '#E2E8F0',
    cardBg: '#F8FAFC'
};

const FONTS = {
    header: 'helvetica',
    body: 'helvetica'
};

/**
 * Obtiene la configuración de la empresa
 */
async function getCompanySettings(): Promise<CompanySettings | null> {
    try {
        const docRef = doc(db, "settings", "company");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as CompanySettings;
        }
    } catch (error) {
        console.error("Error fetching company settings:", error);
    }
    return null;
}

/**
 * Carga una imagen asegurando compatibilidad con jsPDF sin pérdida de resolución
 */
async function loadImage(url: string, retries = 2): Promise<HTMLImageElement> {
    if (!url || typeof url !== 'string' || !url.trim()) {
        return createPlaceholderImage();
    }

    const fetchBlob = async (targetUrl: string): Promise<Blob> => {
        try {
            const res = await fetch(targetUrl, { cache: 'no-store' });
            if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
            return await res.blob();
        } catch (e) {
            throw e;
        }
    };

    try {
        let blob: Blob;

        try {
            blob = await fetchBlob(url);
        } catch (e) {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
            blob = await fetchBlob(proxyUrl);
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error("Failed to decode image"));
                img.src = reader.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

    } catch (finalError) {
        return createPlaceholderImage();
    }
}

function createPlaceholderImage(): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(0, 0, 400, 300);

            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, 400, 300);

            ctx.font = 'bold 18px Arial, sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Evidencia Fotográfica', 200, 140);

            ctx.font = '12px Arial';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('HECHO SRL • Registro Técnico', 200, 165);
        }
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = canvas.toDataURL('image/png');
    });
}

/**
 * Calcula las dimensiones y desfases para encajar una imagen proporcionalmente (Aspect-Fit)
 * dentro de un contenedor sin recortar ni deformar sus letras o placas técnicas.
 */
function getAspectFitDimensions(
    imgW: number,
    imgH: number,
    boxW: number,
    boxH: number
): { renderW: number; renderH: number; offsetX: number; offsetY: number } {
    if (!imgW || !imgH || imgW <= 0 || imgH <= 0) {
        return { renderW: boxW, renderH: boxH, offsetX: 0, offsetY: 0 };
    }

    const imgRatio = imgW / imgH;
    const boxRatio = boxW / boxH;

    let renderW: number;
    let renderH: number;

    if (imgRatio > boxRatio) {
        // Imagen horizontal / panorámica
        renderW = boxW;
        renderH = boxW / imgRatio;
    } else {
        // Imagen vertical / cuadrada
        renderH = boxH;
        renderW = boxH * imgRatio;
    }

    const offsetX = (boxW - renderW) / 2;
    const offsetY = (boxH - renderH) / 2;

    return { renderW, renderH, offsetX, offsetY };
}

/**
 * EXPORTACIÓN: "MODERNO 2026 - FORMATEADOR INTELIGENTE DE INGENIERÍA"
 * Soporte de fotos de alta resolución en proporción exacta (Aspect-Fit), títulos numerados con subrayado,
 * pares clave-valor (Negrita: Cursiva) y cajas de dictamen/evaluación técnica.
 */
export async function exportToPDFModern(report: TicketReportNew) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2); // 180mm
    const maxContentY = 272; // Margen de seguridad estricto

    const primaryColor = [85, 107, 47]; // #556B2F Verde Oliva
    const accentDark = [30, 41, 59]; // Slate 800
    const settings = await getCompanySettings();

    // Helper: Encabezado corporativo
    const drawHeader = async (pageNumber: number): Promise<number> => {
        // Franja verde corporativa superior
        pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.rect(0, 0, pageWidth, 4, 'F');

        // Logo
        let logoDrawn = false;
        if (settings?.logoUrl) {
            try {
                const img = await loadImage(settings.logoUrl);
                const ratio = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
                const logoH = 14;
                const logoW = Math.min(34, logoH * ratio);
                pdf.addImage(img, 'PNG', margin, 7, logoW, logoH, undefined, 'FAST');
                logoDrawn = true;
            } catch {
                logoDrawn = false;
            }
        }

        if (!logoDrawn) {
            pdf.setFontSize(13);
            pdf.setFont(FONTS.header, 'bold');
            pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            pdf.text(settings?.name || "HECHO SRL", margin, 15);
            pdf.setFontSize(7.5);
            pdf.setFont(FONTS.body, 'normal');
            pdf.setTextColor(110, 110, 110);
            pdf.text("Ingeniería & Climatización Especializada", margin, 19);
        }

        // Info Empresa
        pdf.setFontSize(8);
        pdf.setFont(FONTS.body, 'normal');
        pdf.setTextColor(100, 100, 100);
        let yInfo = 9;
        const xInfo = pageWidth - margin;

        pdf.setFont(FONTS.header, 'bold');
        pdf.setTextColor(50, 50, 50);
        pdf.text(settings?.name || "HECHO SRL", xInfo, yInfo, { align: 'right' });
        yInfo += 3.8;

        pdf.setFont(FONTS.body, 'normal');
        pdf.setTextColor(110, 110, 110);
        if (settings?.rnc) { pdf.text(`RNC: ${settings.rnc}`, xInfo, yInfo, { align: 'right' }); yInfo += 3.5; }
        if (settings?.email) { pdf.text(settings.email, xInfo, yInfo, { align: 'right' }); yInfo += 3.5; }
        if (settings?.phone) { pdf.text(settings.phone, xInfo, yInfo, { align: 'right' }); yInfo += 3.5; }

        // Separador
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(margin, 26, pageWidth - margin, 26);

        return 32;
    };

    let yPos = await drawHeader(1);

    const checkAndAddPage = async (requiredSpace: number) => {
        if (yPos + requiredSpace > maxContentY) {
            pdf.addPage();
            yPos = await drawHeader(pdf.getNumberOfPages());
            return true;
        }
        return false;
    };

    // --- PÁGINA 1: TÍTULO Y METADATOS ---
    pdf.setFontSize(15);
    pdf.setFont(FONTS.header, 'bold');
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const cleanTitle = (report.header.title || "INFORME TÉCNICO DE LEVANTAMIENTO").toUpperCase();
    const titleLines = pdf.splitTextToSize(cleanTitle, contentWidth);
    pdf.text(titleLines, margin, yPos + 4);
    yPos += (titleLines.length * 5.5) + 4;

    // Caja de Metadatos
    const metaBoxHeight = 32;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(margin, yPos, contentWidth, metaBoxHeight, 2, 2, 'FD');

    const col1X = margin + 6;
    const col2X = margin + (contentWidth / 2) + 4;

    pdf.setFontSize(7.5);
    pdf.setFont(FONTS.header, 'bold');
    pdf.setTextColor(140, 140, 140);
    pdf.text("CLIENTE", col1X, yPos + 6);
    pdf.text("FECHA DEL SERVICIO", col2X, yPos + 6);

    pdf.setFontSize(9.5);
    pdf.setFont(FONTS.body, 'bold');
    pdf.setTextColor(30, 30, 30);
    pdf.text(report.header.clientName || "Cliente General", col1X, yPos + 11);
    pdf.setFont(FONTS.body, 'normal');
    pdf.text(report.header.date || new Date().toLocaleDateString('es-DO'), col2X, yPos + 11);

    pdf.setFontSize(7.5);
    pdf.setFont(FONTS.header, 'bold');
    pdf.setTextColor(140, 140, 140);
    pdf.text("TICKET ID / REFERENCIA", col1X, yPos + 18);
    pdf.text("TÉCNICO RESPONSABLE", col2X, yPos + 18);

    pdf.setFontSize(9.5);
    pdf.setFont(FONTS.body, 'bold');
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.text(report.header.ticketNumber ? `TK #${report.header.ticketNumber}` : "N/A", col1X, yPos + 23);

    pdf.setFont(FONTS.body, 'normal');
    pdf.setTextColor(30, 30, 30);
    pdf.text(report.header.technicianName || "HECHO SRL", col2X, yPos + 23);

    if (report.header.address) {
        pdf.setFontSize(7.5);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`📍 Ubicación: ${report.header.address}`, col1X, yPos + 29);
    }

    yPos += metaBoxHeight + 8;

    // --- FORMATEADOR INTELIGENTE DE SECCIONES ---
    for (const section of report.sections) {
        if (section.type === 'h1' || section.type === 'h2') {
            const titleSection = section as TitleSection;
            const headingText = titleSection.content || '';
            if (!headingText.trim()) continue;

            await checkAndAddPage(20);

            // Marcador decorativo izquierdo
            pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            pdf.roundedRect(margin, yPos + 1, 3.5, 6, 0.8, 0.8, 'F');

            pdf.setFontSize(11);
            pdf.setFont(FONTS.header, 'bold');
            pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            
            const lines = pdf.splitTextToSize(headingText, contentWidth - 8);
            pdf.text(lines, margin + 6, yPos + 5.5);
            yPos += (lines.length * 6) + 4;
        }
        else if (section.type === 'text') {
            const textSection = section as TextSection;
            const content = textSection.content || '';
            if (!content.trim()) continue;

            const lines = content.split('\n');

            for (let lIdx = 0; lIdx < lines.length; lIdx++) {
                const line = lines[lIdx].trim();
                if (!line) {
                    yPos += 2;
                    continue;
                }

                // 1. REGLA 1: TÍTULOS NUMERADOS (Ej: "1. Capacidad de los Equipos", "2. Verificación de...")
                const numberedMatch = line.match(/^(\d+[\.\)]\s+)(.*)$/);
                if (numberedMatch) {
                    await checkAndAddPage(16);
                    yPos += 2;

                    pdf.setFont(FONTS.header, 'bold');
                    pdf.setFontSize(10.5);
                    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                    
                    const numTitleLines = pdf.splitTextToSize(line, contentWidth);
                    pdf.text(numTitleLines, margin, yPos + 4);
                    yPos += (numTitleLines.length * 5) + 2;

                    // Línea / Raya de subrayado sutil
                    pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                    pdf.setLineWidth(0.4);
                    pdf.line(margin, yPos, margin + Math.min(contentWidth, 120), yPos);
                    yPos += 4;
                    continue;
                }

                // 2. REGLA 2: CAJA DE DICTAMEN / EVALUACIÓN GENERAL / ADVERTENCIA
                const calloutMatch = line.match(/^(Evaluación general|Dictamen técnico|Advertencia|Nota crítica|Conclusión):\s*(.*)$/i);
                if (calloutMatch) {
                    const tag = calloutMatch[1];
                    const val = calloutMatch[2];

                    const valLines = pdf.splitTextToSize(val, contentWidth - 16);
                    const boxH = (valLines.length * 4.6) + 12;

                    await checkAndAddPage(boxH + 4);

                    // Contenedor Callout
                    pdf.setFillColor(248, 250, 252);
                    pdf.setDrawColor(203, 213, 225);
                    pdf.setLineWidth(0.3);
                    pdf.roundedRect(margin, yPos, contentWidth, boxH, 2, 2, 'FD');

                    // Borde lateral de acento
                    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                    pdf.rect(margin, yPos, 3, boxH, 'F');

                    // Etiqueta en Negrita
                    pdf.setFont(FONTS.header, 'bold');
                    pdf.setFontSize(9);
                    pdf.setTextColor(30, 41, 59);
                    pdf.text(`${tag.toUpperCase()}:`, margin + 8, yPos + 5.5);

                    // Valor en Cursiva
                    pdf.setFont(FONTS.body, 'italic');
                    pdf.setFontSize(9);
                    pdf.setTextColor(51, 65, 85);
                    pdf.text(valLines, margin + 8, yPos + 10.5);

                    yPos += boxH + 4;
                    continue;
                }

                // 3. REGLA 3: CAMPOS CON DOS PUNTOS (Ej: "Estudio: 12,000 BTU...", "Área de la Entrada: El Fan Coil...")
                // Formato: Etiqueta en NEGRITA, valor en CURSIVA
                const colonMatch = line.match(/^([^:\n]{2,45}):\s*(.*)$/);
                if (colonMatch) {
                    const key = colonMatch[1].trim();
                    const val = colonMatch[2].trim();

                    const keyStr = `${key}: `;
                    pdf.setFont(FONTS.header, 'bold');
                    pdf.setFontSize(9.5);
                    const keyWidth = pdf.getTextWidth(keyStr);

                    if (keyWidth + pdf.getTextWidth(val) <= contentWidth - 5) {
                        await checkAndAddPage(5.2);
                        pdf.setFont(FONTS.header, 'bold');
                        pdf.setFontSize(9.5);
                        pdf.setTextColor(30, 41, 59);
                        pdf.text(keyStr, margin, yPos);

                        pdf.setFont(FONTS.body, 'italic');
                        pdf.setFontSize(9.5);
                        pdf.setTextColor(71, 85, 105);
                        pdf.text(val, margin + keyWidth, yPos);
                        yPos += 4.8;
                    } else {
                        await checkAndAddPage(5.2);
                        pdf.setFont(FONTS.header, 'bold');
                        pdf.setFontSize(9.5);
                        pdf.setTextColor(30, 41, 59);
                        pdf.text(keyStr, margin, yPos);
                        yPos += 4.5;

                        const valLines = pdf.splitTextToSize(val, contentWidth - 4);
                        for (const vLine of valLines) {
                            await checkAndAddPage(5);
                            pdf.setFont(FONTS.body, 'italic');
                            pdf.setFontSize(9);
                            pdf.setTextColor(71, 85, 105);
                            pdf.text(vLine, margin + 4, yPos);
                            yPos += 4.5;
                        }
                    }
                    yPos += 1;
                    continue;
                }

                // 4. TEXTO PLANO ESTÁNDAR
                const normalLines = pdf.splitTextToSize(line, contentWidth);
                for (const nLine of normalLines) {
                    await checkAndAddPage(5.2);
                    pdf.setFont(FONTS.body, 'normal');
                    pdf.setFontSize(9.5);
                    pdf.setTextColor(45, 55, 72);
                    pdf.text(nLine, margin, yPos);
                    yPos += 4.8;
                }
                yPos += 1.5;
            }
            yPos += 2;
        }
        else if (section.type === 'list') {
            const listSection = section as ListSection;
            if (!listSection.items || listSection.items.length === 0) continue;

            for (const rawItem of listSection.items) {
                if (!rawItem || !rawItem.trim()) continue;
                const item = rawItem.trim();

                const itemColonMatch = item.match(/^([^:\n]{2,45}):\s*(.*)$/);

                if (itemColonMatch) {
                    const key = itemColonMatch[1].trim();
                    const val = itemColonMatch[2].trim();
                    const keyStr = `${key}: `;

                    pdf.setFont(FONTS.header, 'bold');
                    pdf.setFontSize(9.5);
                    const keyWidth = pdf.getTextWidth(keyStr);

                    await checkAndAddPage(5.2);
                    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                    pdf.setFont(FONTS.header, 'bold');
                    pdf.text("•", margin + 1, yPos);

                    pdf.setTextColor(30, 41, 59);
                    pdf.text(keyStr, margin + 6, yPos);

                    if (keyWidth + pdf.getTextWidth(val) <= contentWidth - 12) {
                        pdf.setFont(FONTS.body, 'italic');
                        pdf.setTextColor(71, 85, 105);
                        pdf.text(val, margin + 6 + keyWidth, yPos);
                        yPos += 4.8;
                    } else {
                        yPos += 4.5;
                        const valLines = pdf.splitTextToSize(val, contentWidth - 10);
                        for (const vl of valLines) {
                            await checkAndAddPage(5);
                            pdf.setFont(FONTS.body, 'italic');
                            pdf.setFontSize(9);
                            pdf.setTextColor(71, 85, 105);
                            pdf.text(vl, margin + 10, yPos);
                            yPos += 4.5;
                        }
                    }
                } else {
                    const lines = pdf.splitTextToSize(item, contentWidth - 8);
                    for (let i = 0; i < lines.length; i++) {
                        await checkAndAddPage(5.2);
                        pdf.setFont(FONTS.body, 'normal');
                        pdf.setFontSize(9.5);

                        if (i === 0) {
                            pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                            pdf.setFont(FONTS.header, 'bold');
                            pdf.text("•", margin + 1, yPos);
                        }

                        pdf.setFont(FONTS.body, 'normal');
                        pdf.setTextColor(45, 55, 72);
                        pdf.text(lines[i], margin + 6, yPos);
                        yPos += 4.8;
                    }
                }
                yPos += 1;
            }
            yPos += 3;
        }
        else if (section.type === 'beforeAfter') {
            const baSection = section as BeforeAfterSection;
            if (!baSection.beforePhotoUrl && !baSection.afterPhotoUrl) continue;

            const cardH = 82;
            await checkAndAddPage(cardH + 6);

            // Contenedor comparativo
            pdf.setFillColor(248, 250, 252);
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.3);
            pdf.roundedRect(margin, yPos, contentWidth, cardH, 2, 2, 'FD');

            pdf.setFontSize(9);
            pdf.setFont(FONTS.header, 'bold');
            pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            pdf.text("EVIDENCIA COMPARATIVA (ANTES / DESPUÉS)", margin + 6, yPos + 6);

            const photoBoxW = (contentWidth - 16) / 2;
            const photoBoxH = 54;
            const photoY = yPos + 9;

            // Foto Antes
            if (baSection.beforePhotoUrl) {
                try {
                    const img = await loadImage(baSection.beforePhotoUrl);
                    const fit = getAspectFitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, photoBoxW, photoBoxH);
                    
                    // Fondo interior para la foto
                    pdf.setFillColor(241, 245, 249);
                    pdf.roundedRect(margin + 5, photoY, photoBoxW, photoBoxH, 1.5, 1.5, 'F');
                    
                    // Render sin distorsión
                    pdf.addImage(img, 'JPEG', margin + 5 + fit.offsetX, photoY + fit.offsetY, fit.renderW, fit.renderH);

                    // Badge ANTES
                    pdf.setFillColor(225, 29, 72);
                    pdf.rect(margin + 5, photoY, 18, 5, 'F');
                    pdf.setFontSize(7.5);
                    pdf.setFont(FONTS.header, 'bold');
                    pdf.setTextColor(255, 255, 255);
                    pdf.text("ANTES", margin + 7, photoY + 3.8);
                } catch { }
            }

            // Foto Después
            if (baSection.afterPhotoUrl) {
                try {
                    const img = await loadImage(baSection.afterPhotoUrl);
                    const fit = getAspectFitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, photoBoxW, photoBoxH);
                    
                    pdf.setFillColor(241, 245, 249);
                    pdf.roundedRect(margin + 11 + photoBoxW, photoY, photoBoxW, photoBoxH, 1.5, 1.5, 'F');
                    
                    pdf.addImage(img, 'JPEG', margin + 11 + photoBoxW + fit.offsetX, photoY + fit.offsetY, fit.renderW, fit.renderH);

                    // Badge DESPUÉS
                    pdf.setFillColor(16, 185, 129);
                    pdf.rect(margin + 11 + photoBoxW, photoY, 20, 5, 'F');
                    pdf.setFontSize(7.5);
                    pdf.setFont(FONTS.header, 'bold');
                    pdf.setTextColor(255, 255, 255);
                    pdf.text("DESPUÉS", margin + 13 + photoBoxW, photoY + 3.8);
                } catch { }
            }

            if (baSection.description) {
                pdf.setFontSize(8.5);
                pdf.setTextColor(71, 85, 105);
                pdf.setFont(FONTS.body, 'italic');
                const descLines = pdf.splitTextToSize(baSection.description, contentWidth - 12);
                pdf.text(descLines, margin + 6, photoY + photoBoxH + 5);
            }

            yPos += cardH + 6;
        }
        else if (section.type === 'photo') {
            const photoSec = section as PhotoSection;
            if (!photoSec.photoUrl) continue;

            const isLarge = (photoSec as any).size === 'large' || (photoSec as any).size === 'full';

            if (isLarge || !photoSec.description) {
                // Layout Grande / Panorámico
                const boxW = contentWidth;
                const boxH = 90;
                const hasDesc = !!photoSec.description;
                const totalH = boxH + (hasDesc ? 14 : 4);

                await checkAndAddPage(totalH + 4);

                try {
                    const img = await loadImage(photoSec.photoUrl);
                    const fit = getAspectFitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, boxW, boxH);

                    pdf.setFillColor(248, 250, 252);
                    pdf.setDrawColor(226, 232, 240);
                    pdf.setLineWidth(0.3);
                    pdf.roundedRect(margin, yPos, boxW, boxH, 2, 2, 'FD');

                    pdf.addImage(img, 'JPEG', margin + fit.offsetX, yPos + fit.offsetY, fit.renderW, fit.renderH);

                    if (photoSec.description) {
                        pdf.setFontSize(8.5);
                        pdf.setFont(FONTS.body, 'italic');
                        pdf.setTextColor(71, 85, 105);
                        const descLines = pdf.splitTextToSize(photoSec.description, contentWidth);
                        pdf.text(descLines, margin + 2, yPos + boxH + 5);
                    }
                } catch { }

                yPos += totalH + 6;
            } else {
                // Layout Estándar con panel lateral
                const cardH = 75;
                await checkAndAddPage(cardH + 4);

                const pBoxW = 105;
                const pBoxH = 68;

                try {
                    const img = await loadImage(photoSec.photoUrl);
                    const fit = getAspectFitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, pBoxW, pBoxH);

                    // Contenedor foto
                    pdf.setFillColor(248, 250, 252);
                    pdf.setDrawColor(226, 232, 240);
                    pdf.setLineWidth(0.3);
                    pdf.roundedRect(margin, yPos, pBoxW, pBoxH, 2, 2, 'FD');

                    // Imagen sin distorsión
                    pdf.addImage(img, 'JPEG', margin + fit.offsetX, yPos + fit.offsetY, fit.renderW, fit.renderH);

                    // Panel lateral descriptivo
                    const descX = margin + pBoxW + 6;
                    const descW = contentWidth - pBoxW - 6;

                    pdf.setFillColor(248, 250, 252);
                    pdf.roundedRect(descX, yPos, descW, pBoxH, 2, 2, 'FD');

                    pdf.setFontSize(8.5);
                    pdf.setFont(FONTS.header, 'bold');
                    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                    pdf.text("EVIDENCIA TÉCNICA", descX + 5, yPos + 7);

                    if (photoSec.description) {
                        pdf.setFontSize(8.5);
                        pdf.setFont(FONTS.body, 'normal');
                        pdf.setTextColor(45, 55, 72);
                        const descLines = pdf.splitTextToSize(photoSec.description, descW - 10);
                        pdf.text(descLines, descX + 5, yPos + 14);
                    }
                } catch { }

                yPos += cardH + 4;
            }
        }
        else if (section.type === 'gallery') {
            const galSection = section as GallerySection;
            if (!galSection.photos || galSection.photos.length === 0) continue;

            const cols = 2;
            const gap = 6;
            const photoBoxW = (contentWidth - gap) / cols; // 87mm
            const photoBoxH = 62; // Altura del marco
            const rowH = photoBoxH + 16;

            for (let i = 0; i < galSection.photos.length; i += cols) {
                await checkAndAddPage(rowH + 4);

                for (let c = 0; c < cols; c++) {
                    const photoIdx = i + c;
                    if (photoIdx >= galSection.photos.length) break;

                    const photo = galSection.photos[photoIdx];
                    const x = margin + (c * (photoBoxW + gap));

                    try {
                        const img = await loadImage(photo.photoUrl);
                        const fit = getAspectFitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, photoBoxW, photoBoxH);

                        // Marco / Fondo de la foto
                        pdf.setFillColor(248, 250, 252);
                        pdf.setDrawColor(226, 232, 240);
                        pdf.setLineWidth(0.3);
                        pdf.roundedRect(x, yPos, photoBoxW, photoBoxH, 1.5, 1.5, 'FD');

                        // Imagen renderizada en proporción real (sin deformar letras ni placas)
                        pdf.addImage(img, 'JPEG', x + fit.offsetX, yPos + fit.offsetY, fit.renderW, fit.renderH);

                        if (photo.photoMeta?.phase) {
                            const phase = photo.photoMeta.phase;
                            const isBefore = phase === 'BEFORE';
                            const isAfter = phase === 'AFTER';
                            const tagColor = isBefore ? [225, 29, 72] : isAfter ? [16, 185, 129] : [71, 85, 105];
                            const tagText = isBefore ? "Antes" : isAfter ? "Después" : "Durante";

                            pdf.setFillColor(tagColor[0], tagColor[1], tagColor[2]);
                            pdf.rect(x, yPos, 18, 4.5, 'F');
                            pdf.setFontSize(7);
                            pdf.setFont(FONTS.header, 'bold');
                            pdf.setTextColor(255, 255, 255);
                            pdf.text(tagText, x + 2, yPos + 3.3);
                        }

                        if (photo.description) {
                            pdf.setFontSize(7.5);
                            pdf.setFont(FONTS.body, 'normal');
                            pdf.setTextColor(71, 85, 105);
                            const descLines = pdf.splitTextToSize(photo.description, photoBoxW);
                            pdf.text(descLines.slice(0, 2), x, yPos + photoBoxH + 4);
                        }
                    } catch { }
                }

                yPos += rowH + 4;
            }
        }
    }

    // --- FIRMAS DE CONFORMIDAD ---
    if (report.signatures) {
        const sigBlockH = 52;
        await checkAndAddPage(sigBlockH + 6);

        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        pdf.setFontSize(10);
        pdf.setFont(FONTS.header, 'bold');
        pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.text("CONFORMIDAD Y APROBACIÓN DEL SERVICIO", pageWidth / 2, yPos + 3, { align: 'center' });
        yPos += 10;

        const sigBoxW = 75;
        const sigBoxH = 26;

        // Firma Técnico
        const techX = margin + 10;
        if (report.signatures.technicianSignature) {
            try {
                const img = await loadImage(report.signatures.technicianSignature);
                const fit = getAspectFitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, sigBoxW - 10, sigBoxH);
                pdf.addImage(img, 'PNG', techX + 5 + fit.offsetX, yPos + fit.offsetY, fit.renderW, fit.renderH);
            } catch { }
        }
        pdf.setDrawColor(160, 174, 192);
        pdf.line(techX, yPos + sigBoxH + 2, techX + sigBoxW, yPos + sigBoxH + 2);

        pdf.setFontSize(9);
        pdf.setFont(FONTS.header, 'bold');
        pdf.setTextColor(30, 41, 59);
        pdf.text(report.signatures.technicianName || report.header.technicianName || "Técnico Especialista", techX + (sigBoxW / 2), yPos + sigBoxH + 7, { align: 'center' });

        pdf.setFontSize(7.5);
        pdf.setFont(FONTS.body, 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text("TÉCNICO RESPONSABLE", techX + (sigBoxW / 2), yPos + sigBoxH + 11, { align: 'center' });

        // Firma Cliente
        const clientX = pageWidth - margin - sigBoxW - 10;
        if (report.signatures.clientSignature) {
            try {
                const img = await loadImage(report.signatures.clientSignature);
                const fit = getAspectFitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, sigBoxW - 10, sigBoxH);
                pdf.addImage(img, 'PNG', clientX + 5 + fit.offsetX, yPos + fit.offsetY, fit.renderW, fit.renderH);
            } catch { }
        }
        pdf.line(clientX, yPos + sigBoxH + 2, clientX + sigBoxW, yPos + sigBoxH + 2);

        pdf.setFontSize(9);
        pdf.setFont(FONTS.header, 'bold');
        pdf.setTextColor(30, 41, 59);
        pdf.text(report.signatures.clientName || report.header.clientName || "Cliente / Receptor", clientX + (sigBoxW / 2), yPos + sigBoxH + 7, { align: 'center' });

        pdf.setFontSize(7.5);
        pdf.setFont(FONTS.body, 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text("CLIENTE DE CONFORMIDAD", clientX + (sigBoxW / 2), yPos + sigBoxH + 11, { align: 'center' });

        yPos += sigBlockH;
    }

    // --- PASADA FINAL DE PIE DE PÁGINA ---
    const totalPages = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);

        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        pdf.setFontSize(8);
        pdf.setFont(FONTS.body, 'normal');
        pdf.setTextColor(140, 150, 160);

        pdf.text(`HECHO SRL • Ticket #${report.header.ticketNumber || 'N/A'}`, margin, pageHeight - 9);
        pdf.text(`Página ${p} de ${totalPages}`, pageWidth / 2, pageHeight - 9, { align: 'center' });
        pdf.text(`Generado: ${new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' })}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
    }

    pdf.save(`informe-moderno-${report.header.ticketNumber || 'reporte'}.pdf`);
}

/**
 * Exporta el informe usando el método estándar de impresión del navegador
 */
export async function exportToPDFStandard() {
    const images = document.querySelectorAll('.photo-print');
    const imagePromises = Array.from(images).map((img) => {
        const imageElement = img as HTMLImageElement;
        return new Promise((resolve) => {
            if (imageElement.complete) {
                resolve(true);
            } else {
                imageElement.onload = () => resolve(true);
                imageElement.onerror = () => resolve(false);
                setTimeout(() => resolve(false), 5000);
            }
        });
    });

    await Promise.all(imagePromises);

    setTimeout(() => {
        window.print();
    }, 500);
}

/**
 * GENERAR COTIZACIÓN PDF
 */
export async function generateQuotePDF(quote: Quote) {
    const pdf = new jsPDF();
    const settings = await getCompanySettings();
    const margin = 20;

    if (settings?.logoUrl) {
        try {
            const img = await loadImage(settings.logoUrl);
            pdf.addImage(img, 'PNG', margin, 10, 30, 15);
        } catch { }
    }

    const quoteNum = (quote as any).number || quote.name || 'N/A';
    pdf.setFontSize(14);
    pdf.text("Presupuesto: " + quoteNum, margin, 50);
    pdf.save(`presupuesto-${quoteNum}.pdf`);
}

function extractPhotos(report: TicketReportNew): PhotoSection[] {
    const allPhotos: PhotoSection[] = [];
    for (const section of report.sections) {
        if (section.type === 'photo') {
            allPhotos.push(section as PhotoSection);
        } else if (section.type === 'gallery') {
            (section as GallerySection).photos.forEach(p => {
                allPhotos.push({
                    id: p.photoMeta?.originalId || String(Date.now()),
                    type: 'photo',
                    photoUrl: p.photoUrl,
                    description: p.description
                } as PhotoSection);
            });
        }
    }
    return allPhotos;
}

export async function exportToPDFWith2Photos(report: TicketReportNew) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const settings = await getCompanySettings();
    let yPos = 20;
    const margin = 15;
    const pageHeight = 297;
    const pageWidth = 210;
    const contentWidth = pageWidth - (margin * 2);

    if (settings?.logoUrl) {
        try {
            const img = await loadImage(settings.logoUrl);
            pdf.addImage(img, 'PNG', margin, 10, 30, 15);
        } catch { }
    }

    pdf.setFontSize(15);
    pdf.setFont(FONTS.header, 'bold');
    pdf.text(report.header.title, margin, 35);
    yPos = 45;

    const photos = extractPhotos(report);
    for (const photo of photos) {
        if (yPos > pageHeight - 110) { 
            pdf.addPage(); 
            yPos = 20; 
        }
        try {
            const img = await loadImage(photo.photoUrl || '');
            const fit = getAspectFitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, contentWidth, 90);
            pdf.setFillColor(248, 250, 252);
            pdf.roundedRect(margin, yPos, contentWidth, 90, 2, 2, 'F');
            pdf.addImage(img, 'JPEG', margin + fit.offsetX, yPos + fit.offsetY, fit.renderW, fit.renderH);
        } catch { }
        yPos += 98;
    }

    pdf.save(`informe-simple-${report.header.ticketNumber}.pdf`);
}

/**
 * Exporta el informe como documento Word (.docx)
 */
export async function exportToWord(report: TicketReportNew) {
    const children: (Paragraph | Table)[] = [];
    children.push(new Paragraph({ text: report.header.title, heading: HeadingLevel.HEADING_1 }));

    report.sections.forEach(sec => {
        if (sec.type === 'h1' || sec.type === 'h2') {
            children.push(new Paragraph({ text: (sec as TitleSection).content, heading: HeadingLevel.HEADING_2 }));
        } else if (sec.type === 'text') {
            children.push(new Paragraph({ text: (sec as TextSection).content }));
        } else if (sec.type === 'list') {
            (sec as ListSection).items.forEach(item => {
                children.push(new Paragraph({ text: `• ${item}` }));
            });
        }
    });

    const doc = new Document({
        sections: [{ properties: {}, children: children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `informe-${report.header.ticketNumber}.docx`);
}
