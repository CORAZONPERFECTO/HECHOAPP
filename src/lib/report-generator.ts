import { Ticket, TicketReportNew, TicketReportSection, TitleSection, TextSection, ListSection, PhotoSection, DividerSection, BeforeAfterSection } from "@/types/schema";

/**
 * Helper to create ID
 */
const uuid = () => crypto.randomUUID();

/**
 * Generates a complete report from a ticket
 * Adapts the "Modern" structure requested by user to existing Schema types.
 */
export function generateReportFromTicket(ticket: Ticket): TicketReportNew {
    const sections: TicketReportSection[] = [];

    // --- 0. TÍTULO PRINCIPAL & DATOS GENERALES ---
    // Mapped from user's "KeyValue" to a List for compatibility
    sections.push({
        id: uuid(),
        type: 'h2', // Using h2 as main section header within the report body
        content: 'Resumen del Servicio'
    } as TitleSection);

    const generalDataItems = [
        `Ticket: ${ticket.ticketNumber || ticket.id.slice(0, 8)}`,
        `Cliente: ${ticket.clientName || 'N/D'}`,
        `Ubicación: ${ticket.locationName || ticket.specificLocation || 'N/D'}`,
        `Tipo de servicio: ${ticket.serviceType || 'N/D'}`,
        `Fecha: ${ticket.createdAt ? new Date((ticket.createdAt as any).seconds * 1000).toLocaleDateString() : 'N/D'}`,
        `Técnico: ${ticket.technicianName || 'N/D'}`
    ];

    sections.push({
        id: uuid(),
        type: 'list',
        items: generalDataItems
    } as ListSection);

    // --- 0.2 RESUMEN DEL SERVICIO (Objective/Notes) ---
    // The user had objective/initialNotes in their interface. 
    // We map ticket.description (our equivalent) here if needed, or leave blank if strictly following new template fields we might not have yet.
    // We'll use ticket.description as "Falla Reportada" or "Objetivo"
    if (ticket.description) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Solicitud / Falla Reportada'
        } as TitleSection);

        sections.push({
            id: uuid(),
            type: 'text',
            content: ticket.description
        } as TextSection);
    }

    // --- 1. DIAGNÓSTICO ---
    if (ticket.diagnosis && ticket.diagnosis.trim().length > 0) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Diagnóstico Técnico'
        } as TitleSection);

        sections.push({
            id: uuid(),
            type: 'text',
            content: ticket.diagnosis
        } as TextSection);
    }

    // --- 2. SOLUCIÓN ---
    if (ticket.solution && ticket.solution.trim().length > 0) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Solución Aplicada'
        } as TitleSection);

        sections.push({
            id: uuid(),
            type: 'text',
            content: ticket.solution
        } as TextSection);
    }

    // --- 3. FOTOS (Agrupadas por fase) ---
    if (ticket.photos && ticket.photos.length > 0) {
        const photosBefore = ticket.photos.filter(p => p.type === 'BEFORE');
        const photosDuring = ticket.photos.filter(p => p.type === 'DURING');
        const photosAfter = ticket.photos.filter(p => p.type === 'AFTER');

        const addPhotoGroup = (title: string, photos: typeof ticket.photos, phase: 'BEFORE' | 'DURING' | 'AFTER') => {
            if (photos.length === 0) return;

            sections.push({
                id: uuid(),
                type: 'h2',
                content: title
            } as TitleSection);

            // Add photos sequentially. The "Modern PDF" export will handle the grid layout.
            // attempting to create "BeforeAfter" sections if pairs exist could be smart, but let's stick to simple photos for now to be safe.
            photos.forEach(photo => {
                sections.push({
                    id: uuid(),
                    type: 'photo',
                    photoUrl: photo.url,
                    description: photo.description || photo.details || '',
                    photoMeta: {
                        originalId: (photo as any).id || uuid(),
                        area: photo.area,
                        phase: phase
                    }
                } as PhotoSection);
            });
        };

        addPhotoGroup('Evidencia ANTES', photosBefore, 'BEFORE');
        addPhotoGroup('Proceso del trabajo', photosDuring, 'DURING');
        addPhotoGroup('Resultado FINAL', photosAfter, 'AFTER');
    }

    // --- 4. CHECKLIST ---
    if (ticket.checklist && ticket.checklist.length > 0) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Checklist de Servicio'
        } as TitleSection);

        const checklistItems = ticket.checklist.map(item => {
            const text = item.text || (item as any).label || 'Item';
            return (item.checked ? '✅ ' : '⬜ ') + text;
        });

        sections.push({
            id: uuid(),
            type: 'list',
            items: checklistItems
        } as ListSection);
    }

    // --- 5. RECOMENDACIONES ---
    if (ticket.recommendations && ticket.recommendations.trim().length > 0) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Recomendaciones'
        } as TitleSection);

        sections.push({
            id: uuid(),
            type: 'text',
            content: ticket.recommendations
        } as TextSection);
    }

    return {
        ticketId: ticket.id,
        header: {
            clientName: ticket.clientName,
            ticketNumber: ticket.ticketNumber || ticket.id.slice(0, 6),
            address: ticket.locationName || ticket.specificLocation || '',
            date: new Date().toLocaleDateString('es-DO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            technicianName: ticket.technicianName || 'Técnico Asignado',
            title: `Informe Técnico #${ticket.ticketNumber || ticket.id.slice(0, 6)}`
        },
        sections,
        lastGeneratedFromTicketAt: new Date().toISOString()
    };
}

/**
 * Updates photos in report without losing existing content
 */
export function updatePhotosFromTicket(
    report: TicketReportNew,
    ticket: Ticket
): TicketReportNew {
    // Get existing photo IDs
    const existingPhotoIds = new Set(
        report.sections
            .filter((s): s is PhotoSection => s.type === 'photo' && !!s.photoMeta?.originalId)
            .map(s => s.photoMeta!.originalId!)
    );

    // Find new photos
    const newPhotos = (ticket.photos || []).filter(
        photo => !(photo as any).id || !existingPhotoIds.has((photo as any).id)
    );

    if (newPhotos.length === 0) {
        return report; // No new photos
    }

    // Group new photos by phase
    const newPhotosByPhase = {
        BEFORE: newPhotos.filter(p => p.type === 'BEFORE'),
        DURING: newPhotos.filter(p => p.type === 'DURING'),
        AFTER: newPhotos.filter(p => p.type === 'AFTER')
    };

    const updatedSections = [...report.sections];

    // Helper to find insertion point for a phase
    const findInsertionPoint = (phase: 'BEFORE' | 'DURING' | 'AFTER'): number => {
        // Find the subheading
        const headerTexts = {
            BEFORE: 'Evidencia ANTES',
            DURING: 'Proceso del trabajo',
            AFTER: 'Resultado FINAL'
        };

        // 1. Try to find the header
        let headerIndex = updatedSections.findIndex(s => s.type === 'h2' && (s as TitleSection).content === headerTexts[phase]);

        if (headerIndex !== -1) {
            // Found header, append after the last photo of this group
            // Scan forward until we hit a non-photo or end
            let i = headerIndex + 1;
            while (i < updatedSections.length && updatedSections[i].type === 'photo') {
                i++;
            }
            return i;
        }

        // 2. If header doesn't exist, we need to create it? 
        // For simplicity in this updater, we append to end if structure is missing, 
        // or just insert at end. (Refining this would require more logic)
        return updatedSections.length;
    };

    // Add new photos
    Object.entries(newPhotosByPhase).forEach(([phase, photos]) => {
        if (photos.length > 0) {
            const Phase = phase as 'BEFORE' | 'DURING' | 'AFTER';
            let insertPoint = findInsertionPoint(Phase);

            // If header didn't exist (insertPoint at end), checking if we should add header
            // This is complex because we might be appending to a report that deleted sections.
            // Let's just append the photos for safety.

            const newPhotoSections: PhotoSection[] = photos.map(photo => ({
                id: uuid(),
                type: 'photo',
                photoUrl: photo.url,
                description: photo.description || photo.details || '',
                photoMeta: {
                    originalId: (photo as any).id || uuid(),
                    area: photo.area,
                    phase: Phase
                }
            }));

            updatedSections.splice(insertPoint, 0, ...newPhotoSections);
        }
    });

    return {
        ...report,
        sections: updatedSections
    };
}

