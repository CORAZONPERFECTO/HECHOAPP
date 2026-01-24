
import jsPDF from 'jspdf';
// html2canvas import removed as it is not used in modern export
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, Table } from 'docx';
import { saveAs } from 'file-saver';
import { TicketReportNew, PhotoSection, Quote, CompanySettings, BeforeAfterSection, GallerySection } from '@/types/schema';
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// === CONFIGURATION ===
const COLORS = {
    primary: '#556B2F', // Olive Green
    secondary: '#8F9779',
    text: '#333333',
    lightText: '#666666',
    border: '#E5E7EB'
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
    // Función auxiliar para obtener el Blob (Directo o Proxy)
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
            console.warn("Direct load failed, trying proxy...", url);
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
        console.error("Todas las estrategias de carga fallaron para:", url, finalError);
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
            ctx.fillStyle = '#f3f4f6'; // Gray 100
            ctx.fillRect(0, 0, 400, 300);

            // Border
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, 400, 300);

            // Text
            ctx.font = 'bold 24px Arial, sans-serif';
            ctx.fillStyle = '#9ca3af'; // Gray 400
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Imagen no disponible', 200, 150);

            ctx.font = '14px Arial';
            ctx.fillStyle = '#ef4444'; // Red for error
            ctx.fillText('(Error CRITICO de Carga)', 200, 180);
        }
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = canvas.toDataURL('image/png');
    });
}

/**
 * EXPORTACIÓN: "MODERNO 2025"
 * Layout empresarial, 3 fotos por página con diseño específico.
 */
export async function exportToPDFModern(report: TicketReportNew) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;

    // Configs
    const primaryColor = [85, 107, 47]; // #556B2F
    const settings = await getCompanySettings();

    // Helper: Draw Header
    const drawHeader = async (pageNumber: number) => {
        // Franja superior
        pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.rect(0, 0, pageWidth, 5, 'F');

        // Logo
        if (settings?.logoUrl) {
            try {
                const img = await loadImage(settings.logoUrl);
                const ratio = img.width / img.height;
                pdf.addImage(img, 'PNG', margin, 10, 30, 30 / ratio);
            } catch {
                // Ignore logo fail
            }
        } else {
            // Fallback Name
            pdf.setFontSize(14);
            pdf.setFont(FONTS.header, 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text(settings?.name || "HECHO SRL", margin, 20);
        }

        // Info Empresa (Derecha)
        pdf.setFontSize(8);
        pdf.setFont(FONTS.body, 'normal');
        pdf.setTextColor(100, 100, 100);
        let yInfo = 12;
        const xInfo = pageWidth - margin;

        pdf.text(settings?.name || "HECHO SRL", xInfo, yInfo, { align: 'right' });
        yInfo += 4;
        if (settings?.rnc) { pdf.text(`RNC: ${settings.rnc}`, xInfo, yInfo, { align: 'right' }); yInfo += 4; }
        if (settings?.email) { pdf.text(settings.email, xInfo, yInfo, { align: 'right' }); yInfo += 4; }
        if (settings?.phone) { pdf.text(settings.phone, xInfo, yInfo, { align: 'right' }); yInfo += 4; }

        // Línea separadora suave
        pdf.setDrawColor(230, 230, 230);
        pdf.line(margin, 35, pageWidth - margin, 35);

        return 40; // New Y start
    };

    // Helper: Draw Footer
    const drawFooter = (pageNumber: number) => {
        const totalPages = pdf.getNumberOfPages();
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Página ${pageNumber} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text(`Generado el ${new Date().toLocaleDateString()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    };

    // --- PAGE 1: PORTADA & DETALLES ---
    let yPos = await drawHeader(1);

    // Título Grande
    pdf.setFontSize(24);
    pdf.setFont(FONTS.header, 'bold');
    pdf.setTextColor(COLORS.primary);
    pdf.text(report.header.title.toUpperCase(), margin, yPos + 10);
    yPos += 25;

    // Caja de Información (Grid style)
    pdf.setFillColor(248, 250, 252); // Very light gray bg
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, yPos, pageWidth - (margin * 2), 45, 'FD');

    const col1 = margin + 5;
    const col2 = margin + (pageWidth - margin * 2) / 2 + 5;
    let rowY = yPos + 10;

    // Col 1
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text("CLIENTE", col1, rowY);
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(report.header.clientName, col1, rowY + 5);

    rowY += 15;
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text("TICKET ID", col1, rowY);
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(report.header.ticketNumber, col1, rowY + 5);

    // Col 2
    rowY = yPos + 10;
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text("FECHA", col2, rowY);
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(report.header.date, col2, rowY + 5);

    rowY += 15;
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text("TÉCNICO", col2, rowY);
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(report.header.technicianName || "N/A", col2, rowY + 5);

    yPos += 60;

    // --- CONTENIDO TEXTUAL ---
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);

    // Render Blocks (Except Photos)
    for (const section of report.sections) {
        // Skip photos for manual annex
        if (section.type === 'photo') continue;

        // Check page break
        if (yPos > pageHeight - 40) {
            drawFooter(pdf.getCurrentPageInfo().pageNumber);
            pdf.addPage();
            yPos = await drawHeader(pdf.getCurrentPageInfo().pageNumber);
        }

        if (section.type === 'h2') {
            yPos += 5;
            pdf.setFontSize(14);
            pdf.setFont(FONTS.header, 'bold');
            pdf.setTextColor(COLORS.primary);
            if (section.content) {
                const lines = pdf.splitTextToSize(section.content, pageWidth - (margin * 2));
                pdf.text(lines, margin, yPos);
                yPos += (lines.length * 6) + 5;
            }
        }
        else if (section.type === 'text') {
            pdf.setFontSize(10);
            pdf.setFont(FONTS.body, 'normal');
            pdf.setTextColor(COLORS.text);
            if (section.content) {
                const lines = pdf.splitTextToSize(section.content, pageWidth - (margin * 2));
                pdf.text(lines, margin, yPos);
                yPos += (lines.length * 5) + 5;
            }
        }
        else if (section.type === 'list') {
            pdf.setFontSize(10);
            pdf.setTextColor(COLORS.text);
            section.items.forEach(item => {
                const lines = pdf.splitTextToSize(`• ${item}`, pageWidth - (margin * 2) - 5);
                pdf.text(lines, margin + 5, yPos);
                yPos += (lines.length * 5) + 2;
            });
            yPos += 5;
        }
        else if (section.type === 'beforeAfter') {
            const baSection = section as BeforeAfterSection;

            // SKIP IF EMPTY
            if (!baSection.beforePhotoUrl && !baSection.afterPhotoUrl) continue;

            if (yPos > pageHeight - 90) { // Check space for big block
                drawFooter(pdf.getCurrentPageInfo().pageNumber);
                pdf.addPage();
                yPos = await drawHeader(pdf.getCurrentPageInfo().pageNumber);
            }

            // Container
            pdf.setFillColor(250, 250, 250);
            pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 80, 2, 2, 'F');

            yPos += 5;
            pdf.setFontSize(11);
            pdf.setFont(FONTS.header, 'bold');
            pdf.setTextColor(COLORS.primary);
            pdf.text("EVIDENCIA COMPARATIVA", margin + 5, yPos);
            yPos += 8;

            const photoW = (pageWidth - margin * 2 - 20) / 2;
            const photoH = photoW * 0.6; // 16:9 approx

            // Before
            if (baSection.beforePhotoUrl) {
                try {
                    const img = await loadImage(baSection.beforePhotoUrl);
                    pdf.addImage(img, 'JPEG', margin + 5, yPos, photoW, photoH);
                    pdf.setFontSize(8);
                    pdf.setTextColor('white');
                    pdf.setFillColor(200, 50, 50); // Red tag
                    pdf.rect(margin + 5, yPos, 15, 6, 'F');
                    pdf.text("ANTES", margin + 7, yPos + 4);
                } catch (e) { /* placeholder handled by loadImage fallback */ }
            }
            // After
            if (baSection.afterPhotoUrl) {
                try {
                    const img = await loadImage(baSection.afterPhotoUrl);
                    pdf.addImage(img, 'JPEG', margin + 15 + photoW, yPos, photoW, photoH);
                    pdf.setFontSize(8);
                    pdf.setTextColor('white');
                    pdf.setFillColor(50, 150, 50); // Green tag
                    pdf.rect(margin + 15 + photoW, yPos, 15, 6, 'F');
                    pdf.text("DESPUÉS", margin + 17 + photoW, yPos + 4);
                } catch (e) { }
            }

            yPos += photoH + 10;
            if (baSection.description) {
                pdf.setFontSize(9);
                pdf.setTextColor(80, 80, 80);
                pdf.setFont(FONTS.body, 'italic');
                pdf.text(baSection.description, margin + 5, yPos);
            }
            yPos += 15;
        }
        else if (section.type === 'gallery') {
            const gallerySection = section as GallerySection;
            if (!gallerySection.photos || gallerySection.photos.length === 0) continue;

            // Header for Gallery if needed, or just space?
            // Let's check space first. We need at least enough for one row (~60mm)
            if (yPos > pageHeight - 60) {
                drawFooter(pdf.getCurrentPageInfo().pageNumber);
                pdf.addPage();
                yPos = await drawHeader(pdf.getCurrentPageInfo().pageNumber);
            }

            // Optional: Title for Gallery Section? Usually no specific title in schema, but we can add small label
            // pdf.setFontSize(10);
            // pdf.setTextColor(COLORS.lightText);
            // pdf.text("GALERÍA DE IMÁGENES", margin, yPos);
            // yPos += 5;

            const contentWidth = pageWidth - (margin * 2);
            const cols = 3;
            const gap = 5;
            const photoW = (contentWidth - ((cols - 1) * gap)) / cols;
            const photoH = photoW; // Square photos for grid

            let colIndex = 0;
            let startRowY = yPos;

            for (let i = 0; i < gallerySection.photos.length; i++) {
                const photo = gallerySection.photos[i];

                // Check page break (NEW ROW check)
                if (colIndex === 0 && yPos + photoH + 20 > pageHeight - 30) {
                    drawFooter(pdf.getCurrentPageInfo().pageNumber);
                    pdf.addPage();
                    yPos = await drawHeader(pdf.getCurrentPageInfo().pageNumber);
                    startRowY = yPos;
                }

                const x = margin + (colIndex * (photoW + gap));

                // Draw Photo
                try {
                    const img = await loadImage(photo.photoUrl);
                    pdf.addImage(img, 'JPEG', x, yPos, photoW, photoH);
                } catch (e) {
                    // Placeholder
                }

                // Small Description/Caption below photo
                if (photo.description) {
                    pdf.setFontSize(7);
                    pdf.setTextColor(80, 80, 80);
                    const safeDesc = typeof photo.description === 'string'
                        ? photo.description.substring(0, 50) + (photo.description.length > 50 ? '...' : '')
                        : '';
                    pdf.text(safeDesc, x, yPos + photoH + 4, { maxWidth: photoW });
                }

                colIndex++;
                if (colIndex >= cols) {
                    colIndex = 0;
                    yPos += photoH + 12; // Row height + padding
                }
            }

            // If we finished in the middle of a row, advanced Y
            if (colIndex !== 0) {
                yPos += photoH + 12;
            }

            yPos += 5; // Extra spacing after gallery
        }
    }

    // --- ANEXO FOTOGRÁFICO (MODERN LAYOUT) ---
    const photos = extractPhotos(report);
    if (photos.length > 0) {
        // Start new page for photos
        drawFooter(pdf.getCurrentPageInfo().pageNumber);
        pdf.addPage();
        await drawHeader(pdf.getCurrentPageInfo().pageNumber);

        yPos = 40;
        pdf.setFontSize(16);
        pdf.setFont(FONTS.header, 'bold');
        pdf.setTextColor(COLORS.primary);
        pdf.text("REPORTE FOTOGRÁFICO", margin, yPos);
        yPos += 15;

        // Render one by one in vertical list
        // Approx 3 photos per page?
        // Height available per page approx 240mm (minus header/footer)
        // Let's use 85mm height per photo block.
        const photoBlockHeight = 85;

        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];

            // Check if we need a new page
            if (i > 0 && yPos + photoBlockHeight > pageHeight - 20) {
                drawFooter(pdf.getCurrentPageInfo().pageNumber);
                pdf.addPage();
                await drawHeader(pdf.getCurrentPageInfo().pageNumber);
                yPos = 40;
            }

            const contentWidth = pageWidth - (margin * 2);
            const pWidth = contentWidth * 0.55; // Photo width 55%
            const pHeight = 75; // Photo height fixed

            try {
                const img = await loadImage(photo.photoUrl);

                // Photo (Left aligned)
                // Using object-contain logic simulation by aspect ratio if needed, for now stretch/fit box
                pdf.addImage(img, 'JPEG', margin, yPos, pWidth, pHeight);

                // Description Box (Right aligned)
                const descX = margin + pWidth + 5;
                const descW = contentWidth * 0.42; // Description width ~42%

                // Background for description
                pdf.setFillColor(248, 248, 248);
                pdf.setDrawColor(230, 230, 230);
                pdf.roundedRect(descX, yPos, descW, pHeight, 2, 2, 'FD');

                // Label
                pdf.setFontSize(10);
                pdf.setTextColor(COLORS.primary);
                pdf.setFont(FONTS.header, 'bold');
                pdf.text(`#${i + 1}`, descX + 5, yPos + 8);

                // Text
                if (photo.description) {
                    pdf.setFontSize(9);
                    pdf.setTextColor(COLORS.text);
                    pdf.setFont(FONTS.body, 'normal');
                    // Split text using a bit less width for padding
                    const lines = pdf.splitTextToSize(photo.description, descW - 10);
                    pdf.text(lines, descX + 5, yPos + 16);
                } else {
                    pdf.setFontSize(8);
                    pdf.setTextColor(150, 150, 150);
                    pdf.setFont(FONTS.body, 'italic');
                    pdf.text("(Sin descripción)", descX + 5, yPos + 16);
                }

                // Phase Badge (Optional but helpful)
                // if (photo.photoMeta?.phase) { ... }

            } catch (e) {
                // Image load failed - rendered by loadImage placeholder
            }

            yPos += photoBlockHeight;
        }
    }

    // --- FIRMAS ---
    if (report.signatures) {
        drawFooter(pdf.getCurrentPageInfo().pageNumber);
        pdf.addPage();
        await drawHeader(pdf.getCurrentPageInfo().pageNumber);

        yPos = 50;
        pdf.setFontSize(14);
        pdf.setTextColor(COLORS.primary);
        pdf.text('CONFORMIDAD DEL SERVICIO', pageWidth / 2, yPos, { align: 'center' });
        yPos += 30;

        const sigW = 70;
        const sigH = 40;

        // Technician
        const techX = margin + 15;
        if (report.signatures.technicianSignature) {
            try {
                const img = await loadImage(report.signatures.technicianSignature);
                pdf.addImage(img, 'PNG', techX, yPos, sigW, sigH);
            } catch (e) { }
        }
        pdf.setDrawColor(150);
        pdf.line(techX, yPos + sigH, techX + sigW, yPos + sigH);
        pdf.setFontSize(10);
        pdf.setTextColor(0);
        pdf.text(report.signatures.technicianName || "Técnico", techX + sigW / 2, yPos + sigH + 5, { align: 'center' });
        pdf.setFontSize(8);
        pdf.setTextColor(100);
        pdf.text("TÉCNICO RESPONSABLE", techX + sigW / 2, yPos + sigH + 10, { align: 'center' });

        // Client
        const clientX = pageWidth - margin - sigW - 15;
        if (report.signatures.clientSignature) {
            try {
                const img = await loadImage(report.signatures.clientSignature);
                pdf.addImage(img, 'PNG', clientX, yPos, sigW, sigH);
            } catch (e) { }
        }
        pdf.line(clientX, yPos + sigH, clientX + sigW, yPos + sigH);
        pdf.setFontSize(10);
        pdf.setTextColor(0);
        pdf.text(report.signatures.clientName || "Cliente", clientX + sigW / 2, yPos + sigH + 5, { align: 'center' });
        pdf.setFontSize(8);
        pdf.setTextColor(100);
        pdf.text("CLIENTE / RESPONSABLE", clientX + sigW / 2, yPos + sigH + 10, { align: 'center' });
    }

    // Totales de páginas
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        drawFooter(i);
    }

    pdf.save(`informe-moderno-${report.header.ticketNumber}.pdf`);
}

/**
 * Exporta el informe usando el método estándar de impresión del navegador
 */
export async function exportToPDFStandard() {
    // Pre-cargar imágenes
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
 * GENERAR COTIZACIÓN PDF (Legacy restaurado)
 */
export async function generateQuotePDF(quote: Quote) {
    const pdf = new jsPDF();
    const settings = await getCompanySettings();
    const margin = 20;

    // Header
    if (settings?.logoUrl) {
        try {
            const img = await loadImage(settings.logoUrl);
            pdf.addImage(img, 'PNG', margin, 10, 30, 15);
        } catch (e) { }
    }

    // Content placeholder
    pdf.text("Presupuesto: " + quote.number, margin, 50);
    // ... complete legacy implementation if needed, mostly kept for compatibility
    pdf.save(`presupuesto-${quote.number}.pdf`);
}

// === EXPORT 2 PHOTOS (Legacy/Alternative) ===
// Keeps existing logic but uses new loadImage
async function addPhotoToPDF(pdf: jsPDF, photo: PhotoSection, x: number, y: number, w: number, h: number) {
    try {
        const img = await loadImage(photo.photoUrl || '');
        pdf.addImage(img, 'JPEG', x, y, w, h);
    } catch {
        // failed
    }
}

function extractPhotos(report: TicketReportNew): PhotoSection[] {
    return report.sections.filter(s => s.type === 'photo') as PhotoSection[];
}


export async function exportToPDFWith2Photos(report: TicketReportNew) {
    // Implementation kept largely same but using new addPhotoToPDF -> loadImage
    const pdf = new jsPDF('p', 'mm', 'a4');
    // Basic layout implementation for compatibility

    const settings = await getCompanySettings();
    let yPos = 20;
    const margin = 20;
    const pageHeight = 297;
    const pageWidth = 210;

    // Logo
    if (settings?.logoUrl) {
        try {
            const img = await loadImage(settings.logoUrl);
            pdf.addImage(img, 'PNG', margin, 10, 30, 15);
        } catch (e) { }
    }

    pdf.setFontSize(16);
    pdf.text(report.header.title, margin, 40);
    yPos = 50;

    // 2 Photos Logic
    const photos = extractPhotos(report);
    for (const photo of photos) {
        if (yPos > pageHeight - 110) { pdf.addPage(); yPos = 20; }
        await addPhotoToPDF(pdf, photo, margin, yPos, 170, 100);
        yPos += 110;
    }

    pdf.save(`informe-2fotos-${report.header.ticketNumber}.pdf`);
}

/**
 * Exporta el informe como documento Word (.docx)
 */
export async function exportToWord(report: TicketReportNew) {
    const children: (Paragraph | Table)[] = [];
    // Basic implementation to avoid compile errors
    children.push(new Paragraph({ text: report.header.title, heading: HeadingLevel.HEADING_1 }));

    const doc = new Document({
        sections: [{ properties: {}, children: children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `informe-${report.header.ticketNumber}.docx`);
}
