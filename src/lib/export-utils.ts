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
 * Carga una imagen asegurando compatibilidad con jsPDF (evita Tainted Canvas via Base64)
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

        // 1. Intento Directo
        try {
            blob = await fetchBlob(url);
        } catch (e) {
            // 2. Intento Proxy
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
            blob = await fetchBlob(proxyUrl);
        }

        // 3. Convertir Blob a DataURL (Base64)
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
        console.warn("Estrategia de carga de imagen falló para:", url);
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
 * EXPORTACIÓN: "MODERNO 2026"
 * Motor con paginación inteligente, corte automático de líneas y márgenes de seguridad.
 */
export async function exportToPDFModern(report: TicketReportNew) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2); // 180mm
    const maxContentY = 272; // Margen de seguridad estricto para no tocar el pie de página

    const primaryColor = [85, 107, 47]; // #556B2F
    const settings = await getCompanySettings();

    // Helper: Dibujar Encabezado en cada página
    const drawHeader = async (pageNumber: number): Promise<number> => {
        // Franja verde corporativa superior
        pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.rect(0, 0, pageWidth, 4, 'F');

        // Logo
        let logoDrawn = false;
        if (settings?.logoUrl) {
            try {
                const img = await loadImage(settings.logoUrl);
                const ratio = img.width / img.height;
                const logoH = 14;
                const logoW = Math.min(32, logoH * ratio);
                pdf.addImage(img, 'PNG', margin, 7, logoW, logoH);
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

        // Información de la empresa (Alineada a la derecha)
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

        // Línea separadora suave
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(margin, 26, pageWidth - margin, 26);

        return 32; // Punto de inicio para el contenido
    };

    // Helper: Control dinámico de saltos de página con encabezado
    let yPos = await drawHeader(1);

    const checkAndAddPage = async (requiredSpace: number) => {
        if (yPos + requiredSpace > maxContentY) {
            pdf.addPage();
            yPos = await drawHeader(pdf.getNumberOfPages());
            return true;
        }
        return false;
    };

    // --- PÁGINA 1: TÍTULO Y METADATOS EJECUTIVOS ---
    pdf.setFontSize(16);
    pdf.setFont(FONTS.header, 'bold');
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const cleanTitle = (report.header.title || "INFORME TÉCNICO DE SERVICIO").toUpperCase();
    const titleLines = pdf.splitTextToSize(cleanTitle, contentWidth);
    pdf.text(titleLines, margin, yPos + 4);
    yPos += (titleLines.length * 6) + 4;

    // Caja de Metadatos (Grid Card)
    const metaBoxHeight = 32;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(margin, yPos, contentWidth, metaBoxHeight, 2, 2, 'FD');

    const col1X = margin + 6;
    const col2X = margin + (contentWidth / 2) + 4;

    // Fila 1
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

    // Fila 2
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

    // Ubicación si existe
    if (report.header.address) {
        pdf.setFontSize(7.5);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`📍 Ubicación: ${report.header.address}`, col1X, yPos + 29);
    }

    yPos += metaBoxHeight + 8;

    // --- RENDERIZADO INTELIGENTE DE SECCIONES ---
    for (const section of report.sections) {
        if (section.type === 'h1' || section.type === 'h2') {
            const titleSection = section as TitleSection;
            const headingText = titleSection.content || '';
            if (!headingText.trim()) continue;

            // Evitar encabezado huérfano (exige al menos 20mm libres)
            await checkAndAddPage(20);

            // Marcador decorativo izquierdo
            pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            pdf.roundedRect(margin, yPos + 1, 3, 5.5, 0.8, 0.8, 'F');

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

            const paragraphs = content.split('\n');
            for (const para of paragraphs) {
                if (!para.trim()) {
                    yPos += 2;
                    continue;
                }

                const lines = pdf.splitTextToSize(para, contentWidth);
                for (const line of lines) {
                    await checkAndAddPage(5.2);
                    pdf.setFont(FONTS.body, 'normal');
                    pdf.setFontSize(9.5);
                    pdf.setTextColor(45, 55, 72);
                    pdf.text(line, margin, yPos);
                    yPos += 4.8;
                }
                yPos += 2; // Espacio entre párrafos
            }
            yPos += 2;
        }
        else if (section.type === 'list') {
            const listSection = section as ListSection;
            if (!listSection.items || listSection.items.length === 0) continue;

            for (const item of listSection.items) {
                if (!item || !item.trim()) continue;

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
                yPos += 1;
            }
            yPos += 3;
        }
        else if (section.type === 'beforeAfter') {
            const baSection = section as BeforeAfterSection;
            if (!baSection.beforePhotoUrl && !baSection.afterPhotoUrl) continue;

            const cardH = 76;
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

            const photoW = (contentWidth - 16) / 2;
            const photoH = 48;
            const photoY = yPos + 9;

            // Foto Antes
            if (baSection.beforePhotoUrl) {
                try {
                    const img = await loadImage(baSection.beforePhotoUrl);
                    pdf.addImage(img, 'JPEG', margin + 5, photoY, photoW, photoH);
                    
                    // Badge ANTES
                    pdf.setFillColor(225, 29, 72); // Rose Red
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
                    pdf.addImage(img, 'JPEG', margin + 11 + photoW, photoY, photoW, photoH);
                    
                    // Badge DESPUÉS
                    pdf.setFillColor(16, 185, 129); // Emerald Green
                    pdf.rect(margin + 11 + photoW, photoY, 20, 5, 'F');
                    pdf.setFontSize(7.5);
                    pdf.setFont(FONTS.header, 'bold');
                    pdf.setTextColor(255, 255, 255);
                    pdf.text("DESPUÉS", margin + 13 + photoW, photoY + 3.8);
                } catch { }
            }

            if (baSection.description) {
                pdf.setFontSize(8.5);
                pdf.setTextColor(71, 85, 105);
                pdf.setFont(FONTS.body, 'italic');
                const descLines = pdf.splitTextToSize(baSection.description, contentWidth - 12);
                pdf.text(descLines, margin + 6, photoY + photoH + 5);
            }

            yPos += cardH + 6;
        }
        else if (section.type === 'photo') {
            const photoSec = section as PhotoSection;
            if (!photoSec.photoUrl) continue;

            const cardH = 70;
            await checkAndAddPage(cardH + 4);

            const pWidth = 98;
            const pHeight = 62;

            try {
                const img = await loadImage(photoSec.photoUrl);
                pdf.addImage(img, 'JPEG', margin, yPos, pWidth, pHeight);

                // Panel lateral descriptivo
                const descX = margin + pWidth + 6;
                const descW = contentWidth - pWidth - 6;

                pdf.setFillColor(248, 250, 252);
                pdf.setDrawColor(226, 232, 240);
                pdf.setLineWidth(0.3);
                pdf.roundedRect(descX, yPos, descW, pHeight, 2, 2, 'FD');

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
        else if (section.type === 'gallery') {
            const galSection = section as GallerySection;
            if (!galSection.photos || galSection.photos.length === 0) continue;

            const cols = 2;
            const gap = 6;
            const photoW = (contentWidth - gap) / cols; // 87mm
            const photoH = 58; // 3:2 aprox
            const rowH = photoH + 14;

            for (let i = 0; i < galSection.photos.length; i += cols) {
                await checkAndAddPage(rowH + 4);

                for (let c = 0; c < cols; c++) {
                    const photoIdx = i + c;
                    if (photoIdx >= galSection.photos.length) break;

                    const photo = galSection.photos[photoIdx];
                    const x = margin + (c * (photoW + gap));

                    try {
                        const img = await loadImage(photo.photoUrl);
                        pdf.addImage(img, 'JPEG', x, yPos, photoW, photoH);

                        // Tag de fase si existe
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
                            const descLines = pdf.splitTextToSize(photo.description, photoW);
                            pdf.text(descLines.slice(0, 2), x, yPos + photoH + 4);
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

        // Firma Técnico (Izquierda)
        const techX = margin + 10;
        if (report.signatures.technicianSignature) {
            try {
                const img = await loadImage(report.signatures.technicianSignature);
                pdf.addImage(img, 'PNG', techX + 5, yPos, sigBoxW - 10, sigBoxH);
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

        // Firma Cliente (Derecha)
        const clientX = pageWidth - margin - sigBoxW - 10;
        if (report.signatures.clientSignature) {
            try {
                const img = await loadImage(report.signatures.clientSignature);
                pdf.addImage(img, 'PNG', clientX + 5, yPos, sigBoxW - 10, sigBoxH);
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

    // --- PASADA FINAL DE PIE DE PÁGINA (Sin sobreposiciones) ---
    const totalPages = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);

        // Línea divisoria del pie
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        // Textos del pie
        pdf.setFontSize(8);
        pdf.setFont(FONTS.body, 'normal');
        pdf.setTextColor(140, 150, 160);

        // Izquierda
        pdf.text(`HECHO SRL • Ticket #${report.header.ticketNumber || 'N/A'}`, margin, pageHeight - 9);

        // Centro
        pdf.text(`Página ${p} de ${totalPages}`, pageWidth / 2, pageHeight - 9, { align: 'center' });

        // Derecha
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
            pdf.addImage(img, 'JPEG', margin, yPos, contentWidth, 90);
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
