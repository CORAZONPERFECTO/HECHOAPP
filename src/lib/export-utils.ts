import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { TicketReportNew, PhotoSection } from '@/types/schema';

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

    // 1. Agregar encabezado del informe
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(report.header.title, pageWidth / 2, margin, { align: 'center' });

    let yPos = margin + 15;

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
                await addPhotoToPDF(pdf, photos[photoIndex], margin, photoYPos, pageWidth - 2 * margin, 90);
                photoIndex++;
                photoYPos += 100;
            }

            // Foto 2
            if (photos[photoIndex]) {
                await addPhotoToPDF(pdf, photos[photoIndex], margin, photoYPos, pageWidth - 2 * margin, 90);
                photoIndex++;
            }
        }
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

    // 1. Agregar encabezado del informe (igual que 2 fotos)
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(report.header.title, pageWidth / 2, margin, { align: 'center' });

    let yPos = margin + 15;

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
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}
