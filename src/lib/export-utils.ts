import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, Table } from 'docx';
import { saveAs } from 'file-saver';
import { TicketReportNew, PhotoSection, Quote, CompanySettings, BeforeAfterSection, GallerySection, TitleSection, TextSection, ListSection } from '@/types/schema';
import { deduplicateReportSections } from './report-generator';
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

interface LoadedImageResult {
    img: HTMLImageElement;
    dataUrl: string;
    width: number;
    height: number;
}

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
 * Carga y decodifica cualquier formato de imagen (data URL, blob, Firebase Storage, HTTP/HTTPS)
 * garantizando conversión a JPEG nítido de alta resolución y compatibilidad absoluta con jsPDF.
 */
async function loadImage(url: string): Promise<LoadedImageResult> {
    if (!url || typeof url !== 'string' || !url.trim()) {
        return createPlaceholderData();
    }

    const trimmedUrl = url.trim();

    // Helper: Convertir cualquier HTMLImageElement a LoadedImageResult con formato JPEG uniforme
    const imageToResult = (img: HTMLImageElement): LoadedImageResult => {
        const width = img.naturalWidth || img.width || 800;
        const height = img.naturalHeight || img.height || 600;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Fondo blanco por si la imagen tiene transparencia
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
                return { img, dataUrl: jpegDataUrl, width, height };
            }
        } catch {
            // Si el canvas está contaminado por CORS, usamos la imagen con dataUrl existente
        }
        return { img, dataUrl: trimmedUrl, width, height };
    };

    // Helper: Cargar HTMLImageElement desde un src
    const loadHtmlImage = (src: string, useCors = false): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            if (useCors) {
                img.crossOrigin = "anonymous";
            }
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = src;
        });
    };

    // 1. SI YA ES DATA URL (Base64) - NO HACER FETCH
    if (trimmedUrl.startsWith('data:')) {
        try {
            const img = await loadHtmlImage(trimmedUrl, false);
            return imageToResult(img);
        } catch (dataErr) {
            console.warn("Error decodificando data URL:", dataErr);
        }
    }

    // 2. SI ES BLOB LOCAL (blob:http...) - NO HACER PROXY
    if (trimmedUrl.startsWith('blob:')) {
        try {
            const img = await loadHtmlImage(trimmedUrl, false);
            return imageToResult(img);
        } catch (blobErr) {
            console.warn("Error decodificando blob URL:", blobErr);
        }
    }

    // 3. INTENTO DIRECTO CON CORS EN NAVEGADOR
    try {
        const img = await loadHtmlImage(trimmedUrl, true);
        const result = imageToResult(img);
        if (result.dataUrl.startsWith('data:image/jpeg')) {
            return result;
        }
    } catch {
        // Fallback a fetch / proxy
    }

    // 4. INTENTO FETCH DIRECTO COMO BLOB
    try {
        const res = await fetch(trimmedUrl, { mode: 'cors', cache: 'default' });
        if (res.ok) {
            const blob = await res.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            const img = await loadHtmlImage(dataUrl, false);
            return imageToResult(img);
        }
    } catch {
        // Fallback a proxy
    }

    // 5. INTENTO A TRAVÉS DE PROXY SERVER-SIDE (GET)
    try {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(trimmedUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const blob = await res.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            const img = await loadHtmlImage(dataUrl, false);
            return imageToResult(img);
        }
    } catch {
        // Fallback a proxy POST
    }

    // 6. INTENTO A TRAVÉS DE PROXY SERVER-SIDE (POST)
    try {
        const res = await fetch('/api/proxy-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: trimmedUrl })
        });
        if (res.ok) {
            const blob = await res.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            const img = await loadHtmlImage(dataUrl, false);
            return imageToResult(img);
        }
    } catch (finalErr) {
        console.warn("Todos los métodos de carga de imagen fallaron para:", trimmedUrl, finalErr);
    }

    return createPlaceholderData();
}

function createPlaceholderData(): LoadedImageResult {
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const img = new Image();
    img.src = dataUrl;
    return { img, dataUrl, width: 400, height: 300 };
}

/**
 * Calcula dimensiones de encaje proporcional (Aspect-Fit)
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
        renderW = boxW;
        renderH = boxW / imgRatio;
    } else {
        renderH = boxH;
        renderW = boxH * imgRatio;
    }

    const offsetX = (boxW - renderW) / 2;
    const offsetY = (boxH - renderH) / 2;

    return { renderW, renderH, offsetX, offsetY };
}

function cleanPDFText(text: string): string {
    if (!text) return '';
    return text
        .replace(/📍/g, '')
        .replace(/➔/g, '->')
        .replace(/✅/g, '[OK]')
        .replace(/⬜/g, '[-]')
        .replace(/📷/g, '')
        .replace(/💰/g, '')
        .replace(/💡/g, '')
        .replace(/⭐/g, '*')
        .replace(/m²/g, 'm2')
        .replace(/²/g, '2')
        .replace(/³/g, '3')
        .replace(/Ø=ÜÍ/g, '')
        .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
        .replace(/[\u{2600}-\u{27BF}]/gu, '')
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\u00A0/g, ' ')
        .trim();
}

/**
 * EXPORTACIÓN: "MODERNO 2026 - FORMATEADOR INTELIGENTE DE INGENIERÍA"
 */
export async function exportToPDFModern(report: TicketReportNew) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2); // 180mm
    const maxContentY = 272; // Margen de seguridad estricto

    const primaryColor = [85, 107, 47]; // #556B2F Verde Oliva
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
                const imgData = await loadImage(settings.logoUrl);
                const ratio = imgData.width / imgData.height;
                const logoH = 14;
                const logoW = Math.min(34, logoH * ratio);
                pdf.addImage(imgData.dataUrl, 'JPEG', margin, 7, logoW, logoH, undefined, 'FAST');
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
    const cleanTitle = cleanPDFText(report.header.title || "INFORME TÉCNICO DE LEVANTAMIENTO").toUpperCase();
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
    pdf.text(cleanPDFText(report.header.clientName || "Cliente General"), col1X, yPos + 11);
    pdf.setFont(FONTS.body, 'normal');
    pdf.text(cleanPDFText(report.header.date || new Date().toLocaleDateString('es-DO')), col2X, yPos + 11);

    pdf.setFontSize(7.5);
    pdf.setFont(FONTS.header, 'bold');
    pdf.setTextColor(140, 140, 140);
    pdf.text("TICKET ID / REFERENCIA", col1X, yPos + 18);
    pdf.text("TÉCNICO RESPONSABLE", col2X, yPos + 18);

    pdf.setFontSize(9.5);
    pdf.setFont(FONTS.body, 'bold');
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.text(cleanPDFText(report.header.ticketNumber ? `TK #${report.header.ticketNumber}` : "N/A"), col1X, yPos + 23);

    pdf.setFont(FONTS.body, 'normal');
    pdf.setTextColor(30, 30, 30);
    pdf.text(cleanPDFText(report.header.technicianName || "HECHO SRL"), col2X, yPos + 23);

    if (report.header.address) {
        pdf.setFontSize(7.5);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Ubicación: ${cleanPDFText(report.header.address)}`, col1X, yPos + 29);
    }

    yPos += metaBoxHeight + 8;

    // --- FORMATEADOR INTELIGENTE DE SECCIONES (DEDUPLICACIÓN ACTIVA) ---
    const cleanSections = deduplicateReportSections(report.sections || []);
    for (const section of cleanSections) {
        if (section.type === 'h1' || section.type === 'h2') {
            const titleSection = section as TitleSection;
            const headingText = cleanPDFText(titleSection.content || '');
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

            const rawLines = content.split('\n');

            for (let lIdx = 0; lIdx < rawLines.length; lIdx++) {
                const line = cleanPDFText(rawLines[lIdx].trim());
                if (!line) {
                    yPos += 2;
                    continue;
                }

                // 1. TÍTULOS NUMERADOS (Ej: "1. Capacidad de los Equipos", "2. Verificación de...")
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

                    pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                    pdf.setLineWidth(0.4);
                    pdf.line(margin, yPos, margin + Math.min(contentWidth, 120), yPos);
                    yPos += 4;
                    continue;
                }

                // 2. CAJA DE DICTAMEN / EVALUACIÓN GENERAL / ADVERTENCIA
                const calloutMatch = line.match(/^(Evaluación general|Dictamen técnico|Advertencia|Nota crítica|Conclusión):\s*(.*)$/i);
                if (calloutMatch) {
                    const tag = cleanPDFText(calloutMatch[1]);
                    const val = cleanPDFText(calloutMatch[2]);

                    const valLines = pdf.splitTextToSize(val, contentWidth - 16);
                    const boxH = (valLines.length * 4.6) + 12;

                    await checkAndAddPage(boxH + 4);

                    pdf.setFillColor(248, 250, 252);
                    pdf.setDrawColor(203, 213, 225);
                    pdf.setLineWidth(0.3);
                    pdf.roundedRect(margin, yPos, contentWidth, boxH, 2, 2, 'FD');

                    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                    pdf.rect(margin, yPos, 3, boxH, 'F');

                    pdf.setFont(FONTS.header, 'bold');
                    pdf.setFontSize(9);
                    pdf.setTextColor(30, 41, 59);
                    pdf.text(`${tag.toUpperCase()}:`, margin + 8, yPos + 5.5);

                    pdf.setFont(FONTS.body, 'italic');
                    pdf.setFontSize(9);
                    pdf.setTextColor(51, 65, 85);
                    pdf.text(valLines, margin + 8, yPos + 10.5);

                    yPos += boxH + 4;
                    continue;
                }

                // 3. CAMPOS CON DOS PUNTOS (Ej: "Estudio: 12,000 BTU...", "Área de la Entrada: El Fan Coil...")
                const colonMatch = line.match(/^([^:\n]{2,45}):\s*(.*)$/);
                if (colonMatch) {
                    const key = cleanPDFText(colonMatch[1].trim());
                    const val = cleanPDFText(colonMatch[2].trim());

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
                const item = cleanPDFText(rawItem.trim());

                const itemColonMatch = item.match(/^([^:\n]{2,45}):\s*(.*)$/);

                if (itemColonMatch) {
                    const key = cleanPDFText(itemColonMatch[1].trim());
                    const val = cleanPDFText(itemColonMatch[2].trim());
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

            if (baSection.beforePhotoUrl) {
                try {
                    const imgData = await loadImage(baSection.beforePhotoUrl);
                    const fit = getAspectFitDimensions(imgData.width, imgData.height, photoBoxW, photoBoxH);
                    
                    pdf.setFillColor(241, 245, 249);
                    pdf.roundedRect(margin + 5, photoY, photoBoxW, photoBoxH, 1.5, 1.5, 'F');
                    
                    pdf.addImage(imgData.dataUrl, 'JPEG', margin + 5 + fit.offsetX, photoY + fit.offsetY, fit.renderW, fit.renderH, undefined, 'FAST');

                    pdf.setFillColor(225, 29, 72);
                    pdf.rect(margin + 5, photoY, 18, 5, 'F');
                    pdf.setFontSize(7.5);
                    pdf.setFont(FONTS.header, 'bold');
                    pdf.setTextColor(255, 255, 255);
                    pdf.text("ANTES", margin + 7, photoY + 3.8);
                } catch { }
            }

            if (baSection.afterPhotoUrl) {
                try {
                    const imgData = await loadImage(baSection.afterPhotoUrl);
                    const fit = getAspectFitDimensions(imgData.width, imgData.height, photoBoxW, photoBoxH);
                    
                    pdf.setFillColor(241, 245, 249);
                    pdf.roundedRect(margin + 11 + photoBoxW, photoY, photoBoxW, photoBoxH, 1.5, 1.5, 'F');
                    
                    pdf.addImage(imgData.dataUrl, 'JPEG', margin + 11 + photoBoxW + fit.offsetX, photoY + fit.offsetY, fit.renderW, fit.renderH, undefined, 'FAST');

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
                const descLines = pdf.splitTextToSize(cleanPDFText(baSection.description), contentWidth - 12);
                pdf.text(descLines, margin + 6, photoY + photoBoxH + 5);
            }

            yPos += cardH + 6;
        }
        else if (section.type === 'photo') {
            const photoSec = section as PhotoSection;
            if (!photoSec.photoUrl) continue;

            // Foto amplia y nítida (Full width de la página)
            const boxW = contentWidth; // 180mm
            const boxH = 85; // 85mm de altura para visualización nítida de placas y detalles
            const hasDesc = !!photoSec.description;
            const cardH = boxH + (hasDesc ? 14 : 4);

            await checkAndAddPage(cardH + 4);

            try {
                const imgData = await loadImage(photoSec.photoUrl);
                const fit = getAspectFitDimensions(imgData.width, imgData.height, boxW, boxH);

                // Marco contenedor sutil
                pdf.setFillColor(248, 250, 252);
                pdf.setDrawColor(226, 232, 240);
                pdf.setLineWidth(0.3);
                pdf.roundedRect(margin, yPos, boxW, boxH, 2, 2, 'FD');

                // Imagen en proporción real
                pdf.addImage(imgData.dataUrl, 'JPEG', margin + fit.offsetX, yPos + fit.offsetY, fit.renderW, fit.renderH, undefined, 'FAST');

                // Pie de foto descriptivo
                if (photoSec.description) {
                    pdf.setFontSize(8.5);
                    pdf.setFont(FONTS.body, 'italic');
                    pdf.setTextColor(71, 85, 105);
                    const descLines = pdf.splitTextToSize(cleanPDFText(photoSec.description), contentWidth - 4);
                    pdf.text(descLines, margin + 2, yPos + boxH + 5);
                }
            } catch (e) {
                console.warn("Error dibujando foto en PDF:", e);
            }

            yPos += cardH + 6;
        }
        else if (section.type === 'gallery') {
            const galSection = section as GallerySection;
            if (!galSection.photos || galSection.photos.length === 0) continue;

            const cols = 2;
            const gap = 6;
            const photoBoxW = (contentWidth - gap) / cols; // 87mm
            const photoBoxH = 62;
            const rowH = photoBoxH + 16;

            // Solo fotos con URL real (https://...) — omitir placeholders vacíos
            const validPhotos = galSection.photos.filter(p => p.photoUrl && p.photoUrl.trim().startsWith('http'));
            if (validPhotos.length === 0) continue;

            for (let i = 0; i < validPhotos.length; i += cols) {
                await checkAndAddPage(rowH + 4);

                for (let c = 0; c < cols; c++) {
                    const photoIdx = i + c;
                    if (photoIdx >= validPhotos.length) break;

                    const photo = validPhotos[photoIdx];
                    const x = margin + (c * (photoBoxW + gap));

                    try {
                        const imgData = await loadImage(photo.photoUrl);
                        const fit = getAspectFitDimensions(imgData.width, imgData.height, photoBoxW, photoBoxH);

                        pdf.setFillColor(248, 250, 252);
                        pdf.setDrawColor(226, 232, 240);
                        pdf.setLineWidth(0.3);
                        pdf.roundedRect(x, yPos, photoBoxW, photoBoxH, 1.5, 1.5, 'FD');

                        pdf.addImage(imgData.dataUrl, 'JPEG', x + fit.offsetX, yPos + fit.offsetY, fit.renderW, fit.renderH, undefined, 'FAST');

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
                            const descLines = pdf.splitTextToSize(cleanPDFText(photo.description), photoBoxW);
                            pdf.text(descLines.slice(0, 2), x, yPos + photoBoxH + 4);
                        }
                    } catch (e) {
                        console.warn("Error dibujando galería en PDF:", e);
                    }
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
                const imgData = await loadImage(report.signatures.technicianSignature);
                const fit = getAspectFitDimensions(imgData.width, imgData.height, sigBoxW - 10, sigBoxH);
                pdf.addImage(imgData.dataUrl, 'JPEG', techX + 5 + fit.offsetX, yPos + fit.offsetY, fit.renderW, fit.renderH, undefined, 'FAST');
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
                const imgData = await loadImage(report.signatures.clientSignature);
                const fit = getAspectFitDimensions(imgData.width, imgData.height, sigBoxW - 10, sigBoxH);
                pdf.addImage(imgData.dataUrl, 'JPEG', clientX + 5 + fit.offsetX, yPos + fit.offsetY, fit.renderW, fit.renderH, undefined, 'FAST');
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
            const imgData = await loadImage(settings.logoUrl);
            pdf.addImage(imgData.dataUrl, 'PNG', margin, 10, 30, 15);
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
            const imgData = await loadImage(settings.logoUrl);
            pdf.addImage(imgData.dataUrl, 'PNG', margin, 10, 30, 15);
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
            const imgData = await loadImage(photo.photoUrl || '');
            const fit = getAspectFitDimensions(imgData.width, imgData.height, contentWidth, 90);
            pdf.setFillColor(248, 250, 252);
            pdf.roundedRect(margin, yPos, contentWidth, 90, 2, 2, 'F');
            pdf.addImage(imgData.dataUrl, 'JPEG', margin + fit.offsetX, yPos + fit.offsetY, fit.renderW, fit.renderH);
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
