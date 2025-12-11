
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { TicketReportNew, PhotoSection, Quote, CompanySettings } from '@/types/schema';
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// === CONFIGURATION ===
const COLORS = {
    primary: '#556B2F', // Olive Green (User requested or similar)
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
 * Carga una imagen con reintentos y fallback
 */
async function loadImage(url: string, retries = 3): Promise<HTMLImageElement> {
    const attemptLoad = (useProxy = false): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Try standard CORS first

            const src = useProxy ? `/api/proxy-image?url=${encodeURIComponent(url)}` : url;

            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    };

    try {
        // Attempt 1: Direct
        return await attemptLoad(false);
    } catch (e) {
        try {
            // Attempt 2: Proxy
            return await attemptLoad(true);
        } catch (e2) {
            if (retries > 0) {
                // Retry with delay
                await new Promise(r => setTimeout(r, 1000));
                return loadImage(url, retries - 1);
            }
            // Fallback: Return a placeholder canvas
            return createPlaceholderImage();
        }
    }
}

function createPlaceholderImage(): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(0, 0, 400, 300);
            ctx.font = '20px Arial';
            ctx.fillStyle = '#9ca3af';
            ctx.textAlign = 'center';
            ctx.fillText('Imagen no disponible', 200, 150);
        }
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = canvas.toDataURL();
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
            const lines = pdf.splitTextToSize(section.content, pageWidth - (margin * 2));
            pdf.text(lines, margin, yPos);
            yPos += (lines.length * 6) + 5;
        }
        else if (section.type === 'text') {
            pdf.setFontSize(10);
            pdf.setFont(FONTS.body, 'normal');
            pdf.setTextColor(COLORS.text);
            const lines = pdf.splitTextToSize(section.content, pageWidth - (margin * 2));
            pdf.text(lines, margin, yPos);
            yPos += (lines.length * 5) + 5;
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
            const baSection = section as any;
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

        // Render in groups of 3
        for (let i = 0; i < photos.length; i += 3) {
            const pagePhotos = photos.slice(i, i + 3);

            // Check if we need a new page (but we just started one, or we loop)
            if (i > 0) {
                drawFooter(pdf.getCurrentPageInfo().pageNumber);
                pdf.addPage();
                await drawHeader(pdf.getCurrentPageInfo().pageNumber);
                yPos = 40;
            }

            // Layout specs
            const contentWidth = pageWidth - (margin * 2);

            // PHOTO 1: LEFT BIG
            if (pagePhotos[0]) {
                const p1 = pagePhotos[0];
                const p1Height = 85;
                const p1Width = contentWidth * 0.6; // 60% width

                try {
                    const img = await loadImage(p1.photoUrl);
                    // Clip/Crop aspect ratio could be complex in jsPDF, we just fit
                    // Object fit cover simulation:
                    pdf.addImage(img, 'JPEG', margin, yPos, p1Width, p1Height);

                    // Description Side
                    const descX = margin + p1Width + 5;
                    const descW = contentWidth * 0.38;

                    pdf.setFillColor(245, 245, 245);
                    pdf.roundedRect(descX, yPos, descW, p1Height, 2, 2, 'F');

                    pdf.setFontSize(10);
                    pdf.setTextColor(COLORS.primary);
                    pdf.setFont(FONTS.header, 'bold');
                    pdf.text(`Foto #${i + 1}`, descX + 5, yPos + 10);

                    if (p1.description) {
                        pdf.setFontSize(9);
                        pdf.setTextColor(COLORS.text);
                        pdf.setFont(FONTS.body, 'normal');
                        const lines = pdf.splitTextToSize(p1.description, descW - 10);
                        pdf.text(lines, descX + 5, yPos + 20);
                    }
                } catch (e) { }

                yPos += p1Height + 10;
            }

            // PHOTO 2 & 3: BOTTOM ROW
            const row2Y = yPos;
            const itemWidth = (contentWidth - 10) / 2;
            const itemHeight = 75;

            // Foto 2
            if (pagePhotos[1]) {
                const p2 = pagePhotos[1];
                try {
                    const img = await loadImage(p2.photoUrl);
                    pdf.addImage(img, 'JPEG', margin, row2Y, itemWidth, itemHeight);

                    // Label overlay strip
                    pdf.setFillColor(0, 0, 0, 0.5); // transparent black
                    pdf.rect(margin, row2Y + itemHeight - 12, itemWidth, 12, 'F');

                    pdf.setFontSize(9);
                    pdf.setTextColor(255, 255, 255);
                    pdf.text(`Foto #${i + 2}`, margin + 5, row2Y + itemHeight - 4);

                    if (p2.description) {
                        // Description below? Or inside? User said "Foto #X - Descripción" below.
                        // Let's put description below the image
                        pdf.setFontSize(9);
                        pdf.setTextColor(COLORS.text);
                        const lines = pdf.splitTextToSize(p2.description, itemWidth);
                        pdf.text(lines, margin, row2Y + itemHeight + 5);
                    }
                } catch (e) { }
            }

            // Foto 3
            if (pagePhotos[2]) {
                const p3 = pagePhotos[2];
                const xPos = margin + itemWidth + 10;
                try {
                    const img = await loadImage(p3.photoUrl);
                    pdf.addImage(img, 'JPEG', xPos, row2Y, itemWidth, itemHeight);

                    pdf.setFillColor(0, 0, 0, 0.5);
                    pdf.rect(xPos, row2Y + itemHeight - 12, itemWidth, 12, 'F');

                    pdf.setFontSize(9);
                    pdf.setTextColor(255, 255, 255);
                    pdf.text(`Foto #${i + 3}`, xPos + 5, row2Y + itemHeight - 4);

                    if (p3.description) {
                        pdf.setFontSize(9);
                        pdf.setTextColor(COLORS.text);
                        const lines = pdf.splitTextToSize(p3.description, itemWidth);
                        pdf.text(lines, xPos, row2Y + itemHeight + 5);
                    }
                } catch (e) { }
            }
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
            const img = await loadImage(report.signatures.technicianSignature);
            pdf.addImage(img, 'PNG', techX, yPos, sigW, sigH);
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
            const img = await loadImage(report.signatures.clientSignature);
            pdf.addImage(img, 'PNG', clientX, yPos, sigW, sigH);
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
    const imagePromises = Array.from(images).map((img: any) => {
        return new Promise((resolve) => {
            if (img.complete) {
                resolve(true);
            } else {
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
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
 * Exporta el informe como PDF con anexo de 2 fotos por página
 */
export async function exportToPDFWith2Photos(report: TicketReportNew) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;

    const settings = await getCompanySettings();

    // 1. Agregar encabezado del informe
    let yPos = margin;

    // Logo de la empresa
    if (settings?.logoUrl) {
        try {
            // Cargar logo (asíumiendo que es una URL accesible)
            const img = await loadImage(settings.logoUrl);
            // Ajustar tamaño del logo (ej. max ancho 40mm, max alto 20mm)
            const logoWidth = 40;
            const logoHeight = 20;
            const ratio = img.width / img.height;
            let w = logoWidth;
            let h = w / ratio;
            if (h > logoHeight) {
                h = logoHeight;
                w = h * ratio;
            }
            pdf.addImage(img, 'PNG', margin, yPos, w, h);
        } catch (e) {
            console.warn("Could not load company logo for PDF", e);
        }
    }

    // Datos de la empresa (Derecha)
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    const companyName = settings?.name || "HECHO SRL";
    pdf.text(companyName, pageWidth - margin, yPos + 5, { align: 'right' });

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    let companyY = yPos + 10;
    if (settings?.rnc) {
        pdf.text(`RNC: ${settings.rnc}`, pageWidth - margin, companyY, { align: 'right' });
        companyY += 4;
    }
    if (settings?.phone) {
        pdf.text(`Tel: ${settings.phone}`, pageWidth - margin, companyY, { align: 'right' });
        companyY += 4;
    }
    if (settings?.email) {
        pdf.text(settings.email, pageWidth - margin, companyY, { align: 'right' });
        companyY += 4;
    }

    // Título del Reporte
    yPos += 30;
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(report.header.title, pageWidth / 2, yPos, { align: 'center' });

    yPos += 15;

    // 2. Información del encabezado
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Cliente: ${report.header.clientName}`, margin, yPos);
    yPos += 6;
    pdf.text(`Ticket: ${report.header.ticketNumber}`, margin, yPos);
    yPos += 6;
    if (report.header.address) {
        pdf.text(`Dirección: ${report.header.address}`, margin, yPos);
        yPos += 6;
    }
    pdf.text(`Fecha: ${report.header.date}`, margin, yPos);
    yPos += 6;
    if (report.header.technicianName) {
        pdf.text(`Técnico: ${report.header.technicianName}`, margin, yPos);
        yPos += 6;
    }

    yPos += 10;
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // 3. Contenido del informe (sin fotos)
    for (const section of report.sections) {
        if (section.type === 'h2') {
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            const lines = pdf.splitTextToSize(section.content || "", pageWidth - 2 * margin);
            pdf.text(lines, margin, yPos);
            yPos += lines.length * 7 + 5;
        } else if (section.type === 'text') {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            const lines = pdf.splitTextToSize(section.content || "", pageWidth - 2 * margin);
            pdf.text(lines, margin, yPos);
            yPos += lines.length * 5 + 3;
        } else if (section.type === 'list') {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            (section.items || []).forEach(item => {
                const lines = pdf.splitTextToSize(`• ${item}`, pageWidth - 2 * margin - 5);
                pdf.text(lines, margin + 5, yPos);
                yPos += lines.length * 5 + 2;
            });
            yPos += 3;
        } else if (section.type === 'beforeAfter') {
            const baSection = section as any;
            // Nueva página si no cabe
            if (yPos > pageHeight - margin - 80) {
                pdf.addPage();
                yPos = margin;
            }

            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Evidencia Comparativa", margin, yPos);
            yPos += 8;

            const photoWidth = (pageWidth - 2 * margin - 10) / 2;
            const photoHeight = photoWidth * 0.56; // 16:9 aspect ratio

            // Antes
            if (baSection.beforePhotoUrl) {
                await addPhotoToPDF(pdf, { photoUrl: baSection.beforePhotoUrl } as any, margin, yPos, photoWidth, photoHeight);
                pdf.setFontSize(9);
                pdf.text("ANTES", margin + photoWidth / 2, yPos - 2, { align: 'center' });
            }

            // Después
            if (baSection.afterPhotoUrl) {
                await addPhotoToPDF(pdf, { photoUrl: baSection.afterPhotoUrl } as any, margin + photoWidth + 10, yPos, photoWidth, photoHeight);
                pdf.setFontSize(9);
                pdf.text("DESPUÉS", margin + photoWidth + 10 + photoWidth / 2, yPos - 2, { align: 'center' });
            }

            yPos += photoHeight + 10;

            if (baSection.description) {
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'italic');
                const lines = pdf.splitTextToSize(baSection.description, pageWidth - 2 * margin);
                pdf.text(lines, margin, yPos);
                yPos += lines.length * 5 + 5;
            }
        }

        // Nueva página si es necesario
        if (yPos > pageHeight - margin - 20) {
            pdf.addPage();
            yPos = margin;
        }
    }

    // 4. Anexo fotográfico (2 fotos por página)
    const photos = extractPhotos(report);
    if (photos.length > 0) {
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ANEXO FOTOGRÁFICO', pageWidth / 2, margin, { align: 'center' });

        let py = margin + 20;

        for (const photo of photos) {
            if (py > pageHeight - 120) {
                pdf.addPage();
                py = margin;
            }

            await addPhotoToPDF(pdf, photo, margin, py, pageWidth - margin * 2, 100);
            py += 110;
        }
    }

    // 5. Firmas
    if (report.signatures) {
        if (yPos > pageHeight - margin - 60) {
            pdf.addPage();
            yPos = margin + 20;
        } else {
            yPos += 20;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('CONFORMIDAD DEL SERVICIO', pageWidth / 2, yPos, { align: 'center' });
        yPos += 20;

        const sigWidth = 70;
        const sigHeight = 35;

        // Técnico
        if (report.signatures.technicianSignature) {
            await addPhotoToPDF(pdf, { photoUrl: report.signatures.technicianSignature } as any, margin + 10, yPos, sigWidth, sigHeight);
        }
        pdf.setDrawColor(100);
        pdf.line(margin + 10, yPos + sigHeight + 5, margin + 10 + sigWidth, yPos + sigHeight + 5);
        pdf.setFontSize(10);
        pdf.text(report.signatures.technicianName || "Técnico", margin + 10 + sigWidth / 2, yPos + sigHeight + 10, { align: 'center' });
        pdf.setFontSize(8);
        pdf.text("TÉCNICO RESPONSABLE", margin + 10 + sigWidth / 2, yPos + sigHeight + 15, { align: 'center' });

        // Cliente
        if (report.signatures.clientSignature) {
            await addPhotoToPDF(pdf, { photoUrl: report.signatures.clientSignature } as any, pageWidth - margin - 10 - sigWidth, yPos, sigWidth, sigHeight);
        }
        pdf.line(pageWidth - margin - 10 - sigWidth, yPos + sigHeight + 5, pageWidth - margin - 10, yPos + sigHeight + 5);
        pdf.setFontSize(10);
        pdf.text(report.signatures.clientName || "Cliente", pageWidth - margin - 10 - sigWidth / 2, yPos + sigHeight + 10, { align: 'center' });
        pdf.setFontSize(8);
        pdf.text("CLIENTE / RESPONSABLE", pageWidth - margin - 10 - sigWidth / 2, yPos + sigHeight + 15, { align: 'center' });
    }

    pdf.save(`informe-${report.header.ticketNumber}.pdf`);
}

/**
 * Exporta el informe como documento Word (.docx)
 */
export async function exportToWord(report: TicketReportNew) {
    const children: any[] = [];

    // Título
    children.push(
        new Paragraph({
            text: report.header.title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
        })
    );

    // Información del encabezado
    children.push(
        new Paragraph({
            children: [
                new TextRun({ text: 'Cliente: ', bold: true }),
                new TextRun(report.header.clientName),
            ],
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Ticket: ', bold: true }),
                new TextRun(report.header.ticketNumber),
            ],
        })
    );

    if (report.header.address) {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Dirección: ', bold: true }),
                    new TextRun(report.header.address),
                ],
            })
        );
    }

    children.push(
        new Paragraph({
            children: [
                new TextRun({ text: 'Fecha: ', bold: true }),
                new TextRun(report.header.date),
            ],
        })
    );

    if (report.header.technicianName) {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Técnico: ', bold: true }),
                    new TextRun(report.header.technicianName),
                ],
            })
        );
    }

    children.push(new Paragraph({ text: '' })); // Espacio

    // Contenido
    for (const section of report.sections) {
        if (section.type === 'h2') {
            children.push(
                new Paragraph({
                    text: section.content,
                    heading: HeadingLevel.HEADING_2,
                })
            );
        } else if (section.type === 'text') {
            children.push(
                new Paragraph({
                    text: section.content,
                })
            );
        } else if (section.type === 'list') {
            (section.items || []).forEach(item => {
                children.push(
                    new Paragraph({
                        text: `• ${item}`,
                    })
                );
            });
        } else if (section.type === 'photo') {
            const photoSection = section as PhotoSection;
            if (photoSection.description) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: photoSection.description,
                                italics: true,
                            }),
                        ],
                    })
                );
            }
        }
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `informe-${report.header.ticketNumber}.docx`);
}

/**
 * Extrae todas las fotos del informe
 */
function extractPhotos(report: TicketReportNew): PhotoSection[] {
    return report.sections
        .filter(s => s.type === 'photo')
        .map(s => s as PhotoSection);
}

/**
 * Agrega una foto al PDF
 */
async function addPhotoToPDF(
    pdf: jsPDF,
    photo: PhotoSection,
    x: number,
    y: number,
    width: number,
    height: number
) {
    try {
        const img = await loadImage(photo.photoUrl);

        // Calcular dimensiones manteniendo aspect ratio
        const imgRatio = img.width / img.height;
        const boxRatio = width / height;

        let finalWidth = width;
        let finalHeight = height;
        let offsetX = 0;
        let offsetY = 0;

        if (imgRatio > boxRatio) {
            finalHeight = width / imgRatio;
            offsetY = (height - finalHeight) / 2;
        } else {
            finalWidth = height * imgRatio;
            offsetX = (width - finalWidth) / 2;
        }

        pdf.addImage(img, 'JPEG', x + offsetX, y + offsetY, finalWidth, finalHeight);

        // Agregar descripción
        if (photo.description) {
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'italic');
            const lines = pdf.splitTextToSize(photo.description, width);
            pdf.text(lines, x, y + height + 3);
        }
    } catch (error) {
        console.error('Error loading image:', photo.photoUrl, error);
        // Dibujar rectángulo placeholder
        pdf.setDrawColor(200);
        pdf.rect(x, y, width, height);
        pdf.setFontSize(10);
        pdf.text('Imagen no disponible', x + width / 2, y + height / 2, { align: 'center' });
    }
}

/**
 * Carga una imagen desde una URL
 */
// (This was already defined earlier in the file, ensuring no duplicate - wait, I defined it above.
// The code I'm writing has 'loadImage' at the top. I don't need it again here.
// But I need 'generateQuotePDF' which was at the end.)

/**
 * Genera un PDF básico para una Cotización
 */
export async function generateQuotePDF(quote: Quote) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const margin = 20;
    let yPos = margin;

    const settings = await getCompanySettings();

    // 1. Encabezado
    // Logo y Datos Empresa
    if (settings?.logoUrl) {
        try {
            const img = await loadImage(settings.logoUrl);
            const logoWidth = 40;
            const logoHeight = 20;
            const ratio = img.width / img.height;
            let w = logoWidth;
            let h = w / ratio;
            if (h > logoHeight) {
                h = logoHeight;
                w = h * ratio;
            }
            pdf.addImage(img, 'PNG', margin, yPos, w, h);
        } catch (e) {
            console.warn("Could not load company logo", e);
        }
    }

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    const companyName = settings?.name || "HECHO";
    pdf.text(companyName, margin, yPos + 25);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    let companyY = yPos + 30;
    if (settings?.rnc) { pdf.text(`RNC: ${settings.rnc}`, margin, companyY); companyY += 4; }
    if (settings?.address) { pdf.text(settings.address, margin, companyY); companyY += 4; }
    if (settings?.phone) { pdf.text(`Tel: ${settings.phone}`, margin, companyY); companyY += 4; }
    if (settings?.website) { pdf.text(settings.website, margin, companyY); companyY += 4; }

    // Título Cotización (Derecha)
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text("COTIZACIÓN", pageWidth - margin, margin + 10, { align: 'right' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(quote.number || "Borrador", pageWidth - margin, margin + 16, { align: 'right' });

    yPos = Math.max(companyY + 10, margin + 40);

    // 2. Info Cliente
    pdf.setDrawColor(200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text("Cliente:", margin, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(quote.clientName, margin + 20, yPos);

    if (quote.validUntil) {
        pdf.setFont('helvetica', 'bold');
        pdf.text("Válida hasta:", pageWidth / 2, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(new Date(quote.validUntil.seconds * 1000).toLocaleDateString(), (pageWidth / 2) + 30, yPos);
    }

    yPos += 20;

    // 3. Tabla de Ítems (Manual basic table)
    // Header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text("DESCRIPCIÓN", margin + 2, yPos + 5.5);
    pdf.text("CANT.", pageWidth - margin - 45, yPos + 5.5, { align: 'right' });
    pdf.text("PRECIO", pageWidth - margin - 25, yPos + 5.5, { align: 'right' });
    pdf.text("TOTAL", pageWidth - margin - 2, yPos + 5.5, { align: 'right' });
    yPos += 12;

    // Rows
    pdf.setFont('helvetica', 'normal');

    quote.items.forEach((item) => {
        const descLines = pdf.splitTextToSize(item.description, 100);
        pdf.text(descLines, margin + 2, yPos);

        pdf.text(item.quantity.toString(), pageWidth - margin - 45, yPos, { align: 'right' });
        pdf.text(item.unitPrice.toLocaleString(), pageWidth - margin - 25, yPos, { align: 'right' });
        pdf.text(item.total.toLocaleString(), pageWidth - margin - 2, yPos, { align: 'right' });

        yPos += Math.max(descLines.length * 4, 6) + 2;
    });

    yPos += 5;
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // 4. Totales
    const xTotals = pageWidth - margin - 40;

    pdf.text("Subtotal:", xTotals, yPos);
    pdf.text(quote.subtotal.toLocaleString(), pageWidth - margin - 2, yPos, { align: 'right' });
    yPos += 6;

    pdf.text("ITBIS:", xTotals, yPos);
    pdf.text(quote.taxTotal.toLocaleString(), pageWidth - margin - 2, yPos, { align: 'right' });
    yPos += 8;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text("TOTAL:", xTotals, yPos);
    pdf.text(`RD$ ${quote.total.toLocaleString()}`, pageWidth - margin - 2, yPos, { align: 'right' });

    // 5. Footer / Notas
    if (quote.notes) {
        yPos += 20;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text("Notas:", margin, yPos);
        yPos += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        const noteLines = pdf.splitTextToSize(quote.notes, pageWidth - 2 * margin);
        pdf.text(noteLines, margin, yPos);
    }

    pdf.save(`cotizacion-${quote.number || 'borrador'}.pdf`);
}
