import { Ticket, TicketReportNew, TicketReportSection, TitleSection, TextSection, ListSection, PhotoSection, DividerSection, BeforeAfterSection, GallerySection } from "@/types/schema";

/**
 * Helper to create ID
 */
const uuid = () => crypto.randomUUID();

/**
 * Helper to safely format ticket date
 */
const formatTicketDate = (date: any): string => {
    if (!date) return 'N/D';
    try {
        if (date.seconds) {
            return new Date(date.seconds * 1000).toLocaleDateString();
        }
        if (date instanceof Date) {
            return date.toLocaleDateString();
        }
        if (typeof date === 'string') {
            return new Date(date).toLocaleDateString();
        }
        return 'N/D';
    } catch (e) {
        return 'N/D';
    }
};

/**
 * Generates a complete report from a ticket
 * Adapts the "Modern" structure requested by user to existing Schema types.
 */
export function generateReportFromTicket(ticket: Ticket): TicketReportNew {
    const sections: TicketReportSection[] = [];

    // --- 0. TÍTULO PRINCIPAL & DATOS GENERALES ---
    sections.push({
        id: uuid(),
        type: 'h2',
        content: 'Resumen del Servicio'
    } as TitleSection);

    const generalDataItems = [
        `Ticket: ${ticket.ticketNumber || ticket.id.slice(0, 8)}`,
        `Cliente: ${ticket.clientName || 'N/D'}`,
        `Fecha: ${formatTicketDate(ticket.createdAt)}`,
        `Técnico: ${ticket.technicianName || 'N/D'}`
    ];

    sections.push({
        id: uuid(),
        type: 'list',
        items: generalDataItems
    } as ListSection);

    // --- 1. DESCRIPCIÓN PRINCIPAL ---
    if (ticket.description) {
        sections.push({
            id: uuid(),
            type: 'text',
            content: ticket.description
        } as TextSection);
    }

    // --- 2. FOTOS (TODAS LAS EVIDENCIAS) ---
    // Catch-all: Include ALL photos, grouped under one GallerySection
    if (ticket.photos && ticket.photos.length > 0) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Evidencia Fotográfica'
        } as TitleSection);

        sections.push({
            id: uuid(),
            type: 'gallery',
            photos: ticket.photos.map(photo => ({
                photoUrl: photo.url,
                description: photo.description || photo.details || '',
                photoMeta: {
                    originalId: (photo as any).id || uuid(),
                    area: photo.area,
                    phase: photo.type
                }
            }))
        } as GallerySection);
    }

    // --- 3. OBSERVACIONES FINALES (Editable) ---
    sections.push({
        id: uuid(),
        type: 'h2',
        content: 'Observaciones Finales'
    } as TitleSection);

    sections.push({
        id: uuid(),
        type: 'text',
        content: 'El servicio fue realizado a satisfacción. Se realizaron pruebas de funcionamiento y limpieza del área.'
    } as TextSection);

    return {
        ticketId: ticket.id,
        header: {
            clientName: ticket.clientName,
            ticketNumber: ticket.ticketNumber || ticket.id.slice(0, 6),
            address: ticket.locationName || ticket.specificLocation || '',
            date: formatTicketDate(ticket.createdAt),
            technicianName: ticket.technicianName || 'Técnico Asignado',
            title: `Informe Técnico #${ticket.ticketNumber || ticket.id.slice(0, 6)}`
        },
        sections,
        lastGeneratedFromTicketAt: new Date().toISOString()
    };
}

/**
 * Updates photos in report without losing existing content
 * Rewritten to be a "Catch-all" append using GallerySection
 */
export function updatePhotosFromTicket(
    report: TicketReportNew,
    ticket: Ticket
): TicketReportNew {
    // Get existing photo IDs by scanning both PhotoSections and GallerySections
    const existingPhotoIds = new Set<string>();

    report.sections.forEach(section => {
        if (section.type === 'photo' && section.photoMeta?.originalId) {
            existingPhotoIds.add(section.photoMeta.originalId);
        }
        if (section.type === 'gallery' && section.photos) {
            section.photos.forEach(p => {
                if (p.photoMeta?.originalId) {
                    existingPhotoIds.add(p.photoMeta.originalId);
                }
            });
        }
    });

    // Find new photos (ANY photo not in report)
    const newPhotos = (ticket.photos || []).filter(
        photo => !(photo as any).id || !existingPhotoIds.has((photo as any).id)
    );

    if (newPhotos.length === 0) {
        return report;
    }

    const updatedSections = [...report.sections];

    // Create a new GallerySection for new photos
    const newGallerySection: GallerySection = {
        id: uuid(),
        type: 'gallery',
        photos: newPhotos.map(photo => ({
            photoUrl: photo.url,
            description: photo.description || photo.details || '',
            photoMeta: {
                originalId: (photo as any).id || uuid(),
                area: photo.area,
                phase: photo.type
            }
        }))
    };

    // Find insertion point (before Final Observations)
    let insertIndex = -1;
    const finalObsIndex = updatedSections.findIndex(s => s.type === 'h2' && (s as TitleSection).content === 'Observaciones Finales');

    if (finalObsIndex !== -1) {
        insertIndex = finalObsIndex;
    } else {
        insertIndex = updatedSections.length;
    }

    updatedSections.splice(insertIndex, 0, newGallerySection);

    return {
        ...report,
        sections: updatedSections
    };
}
