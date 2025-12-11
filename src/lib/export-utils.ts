import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { TicketReportNew, PhotoSection, Quote, CompanySettings } from '@/types/schema';
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
            const lines = pdf.splitTextToSize(section.content, pageWidth - 2 * margin);
            pdf.text(lines, margin, yPos);
            yPos += lines.length * 7 + 5;
        } else if (section.type === 'text') {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            const lines = pdf.splitTextToSize(section.content, pageWidth - 2 * margin);
            pdf.text(lines, margin, yPos);
            yPos += lines.length * 5 + 3;
        } else if (section.type === 'list') {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            section.items.forEach(item => {
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
        // ... photos loop ...
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
 * Exporta el informe como PDF con anexo de 3 fotos por página
 */
export async function exportToPDFWith3Photos(report: TicketReportNew) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;

    const settings = await getCompanySettings();

    // 1. Agregar encabezado del informe
    let yPos = margin;

    // Logo
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
            console.warn(e);
        }
    }

    // Datos
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(settings?.name || "HECHO SRL", pageWidth - margin, yPos + 5, { align: 'right' });

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    let companyY = yPos + 10;
    if (settings?.rnc) { pdf.text(`RNC: ${settings.rnc}`, pageWidth - margin, companyY, { align: 'right' }); companyY += 4; }
    if (settings?.phone) { pdf.text(`Tel: ${settings.phone}`, pageWidth - margin, companyY, { align: 'right' }); companyY += 4; }

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

            // Check space
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

        if (yPos > pageHeight - margin - 20) {
            pdf.addPage();
            yPos = margin;
        }
    }

    // 4. Anexo fotográfico (3 fotos por página en grid)
    const photos = extractPhotos(report);
    if (photos.length > 0) {
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ANEXO FOTOGRÁFICO', pageWidth / 2, margin, { align: 'center' });

        let photoIndex = 0;
        let currentPage = true;

        while (photoIndex < photos.length) {
            if (!currentPage) {
                pdf.addPage();
            }
            currentPage = false;

            let photoYPos = margin + 20;

            // Foto 1
            if (photos[photoIndex]) {
                await addPhotoToPDF(pdf, photos[photoIndex], margin, photoYPos, pageWidth - 2 * margin, 60);
                photoIndex++;
                photoYPos += 70;
            }

            // Foto 2
            if (photos[photoIndex]) {
                await addPhotoToPDF(pdf, photos[photoIndex], margin, photoYPos, pageWidth - 2 * margin, 60);
                photoIndex++;
                photoYPos += 70;
            }

            // Foto 3
            if (photos[photoIndex]) {
                await addPhotoToPDF(pdf, photos[photoIndex], margin, photoYPos, pageWidth - 2 * margin, 60);
                photoIndex++;
            }
        }
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
            section.items.forEach(item => {
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
            // Note: Agregar imágenes a Word requiere descargarlas primero
            // Por ahora solo agregamos la descripción
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
function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const loadWithProxy = () => {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
            fetch(proxyUrl)
                .then(res => {
                    if (!res.ok) throw new Error("Proxy failed");
                    return res.blob();
                })
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.src = reader.result as string;
                    };
                    reader.readAsDataURL(blob);
                })
                .catch(err => {
                    console.error("Proxy fetch error:", err);
                    // Final fallback: try to load as normal image, might work if cached
                    const fallbackImg = new Image();
                    fallbackImg.crossOrigin = 'anonymous';
                    fallbackImg.onload = () => resolve(fallbackImg);
                    fallbackImg.onerror = () => reject(err);
                    fallbackImg.src = url;
                });
        };

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.warn(`Direct load failed for ${url}, trying proxy...`);
            loadWithProxy();
        };
        img.src = url;
    });
}
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
