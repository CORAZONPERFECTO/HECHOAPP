import { Ticket, TicketReportNew, TicketReportSection, TitleSection, TextSection, ListSection, GallerySection, PhotoSection, BeforeAfterSection } from "@/types/schema";
import { Timestamp } from "firebase/firestore";

/**
 * Helper to create ID
 */
const uuid = () => crypto.randomUUID();

/**
 * Helper to safely format ticket date
 */
const formatTicketDate = (date: Timestamp | Date | string | number | null | undefined): string => {
    if (!date) return 'N/D';
    try {
        if (date instanceof Timestamp) {
            return new Date(date.seconds * 1000).toLocaleDateString();
        }
        if (date instanceof Date) {
            return date.toLocaleDateString();
        }
        if (typeof date === 'string') {
            return new Date(date).toLocaleDateString();
        }
        return 'N/D';
    } catch (_e) {
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
                    originalId: (photo as { id?: string }).id || uuid(),
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
    // Get existing photo identifiers (IDs and URLs)
    const existingIds = new Set<string>();
    const existingUrls = new Set<string>();

    report.sections.forEach(section => {
        if (section.type === 'photo') {
            const p = section as PhotoSection;
            if (p.photoMeta?.originalId) existingIds.add(p.photoMeta.originalId);
            if (p.photoUrl) existingUrls.add(p.photoUrl);
        }
        if (section.type === 'gallery') {
            const g = section as GallerySection;
            if (g.photos) {
                g.photos.forEach(p => {
                    if (p.photoMeta?.originalId) existingIds.add(p.photoMeta.originalId);
                    if (p.photoUrl) existingUrls.add(p.photoUrl);
                });
            }
        }
        // Also check before/after blocks
        if (section.type === 'beforeAfter') {
            const ba = section as BeforeAfterSection;
            if (ba.beforePhotoUrl) existingUrls.add(ba.beforePhotoUrl);
            if (ba.afterPhotoUrl) existingUrls.add(ba.afterPhotoUrl);
        }
    });

    // Find new photos logic:
    // A photo is new if:
    // 1. It has an ID and that ID is NOT in existingIds
    // 2. OR (if no ID or ID check passed) its URL is NOT in existingUrls
    const newPhotos = (ticket.photos || []).filter(photo => {
        const hasId = (photo as any).id;
        const knownId = hasId && existingIds.has(hasId);

        // Correct logic:
        // If it has a known ID, it's NOT new.
        if (hasId && existingIds.has(hasId)) return false;

        // If it has a known URL, it's NOT new.
        if (photo.url && existingUrls.has(photo.url)) return false;

        return true;
    });

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
                originalId: (photo as { id?: string }).id || uuid(),
                area: photo.area || undefined,
                phase: photo.type || 'EVIDENCE'
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
