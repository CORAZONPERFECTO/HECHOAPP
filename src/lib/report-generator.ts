import { Ticket, TicketReportNew, TicketReportSection, TitleSection, TextSection, ListSection, PhotoSection, DividerSection } from "@/types/schema";

/**
 * Generates a complete report from a ticket
 */
export function generateReportFromTicket(ticket: Ticket): TicketReportNew {
    const sections: TicketReportSection[] = [];

    // 1. Diagnosis
    if (ticket.diagnosis) {
        sections.push({
            id: crypto.randomUUID(),
            type: 'h2',
            content: 'Diagnóstico'
        } as TitleSection);

        sections.push({
            id: crypto.randomUUID(),
            type: 'text',
            content: ticket.diagnosis
        } as TextSection);
    }

    // 2. Solution
    if (ticket.solution) {
        sections.push({
            id: crypto.randomUUID(),
            type: 'h2',
            content: 'Solución'
        } as TitleSection);

        sections.push({
            id: crypto.randomUUID(),
            type: 'text',
            content: ticket.solution
        } as TextSection);
    }

    // 3. Photos grouped by phase
    if (ticket.photos && ticket.photos.length > 0) {
        const photosBefore = ticket.photos.filter(p => p.type === 'BEFORE');
        const photosDuring = ticket.photos.filter(p => p.type === 'DURING');
        const photosAfter = ticket.photos.filter(p => p.type === 'AFTER');

        // BEFORE photos
        if (photosBefore.length > 0) {
            sections.push({
                id: crypto.randomUUID(),
                type: 'h2',
                content: 'Evidencia ANTES'
            } as TitleSection);

            photosBefore.forEach(photo => {
                sections.push({
                    id: crypto.randomUUID(),
                    type: 'photo',
                    photoUrl: photo.url,
                    description: photo.description || photo.details || '',
                    photoMeta: {
                        originalId: (photo as any).id || crypto.randomUUID(),
                        area: photo.area,
                        phase: 'BEFORE'
                    }
                } as PhotoSection);
            });
        }

        // DURING photos
        if (photosDuring.length > 0) {
            sections.push({
                id: crypto.randomUUID(),
                type: 'h2',
                content: 'Proceso del trabajo'
            } as TitleSection);

            photosDuring.forEach(photo => {
                sections.push({
                    id: crypto.randomUUID(),
                    type: 'photo',
                    photoUrl: photo.url,
                    description: photo.description || photo.details || '',
                    photoMeta: {
                        originalId: (photo as any).id || crypto.randomUUID(),
                        area: photo.area,
                        phase: 'DURING'
                    }
                } as PhotoSection);
            });
        }

        // AFTER photos
        if (photosAfter.length > 0) {
            sections.push({
                id: crypto.randomUUID(),
                type: 'h2',
                content: 'Resultado FINAL'
            } as TitleSection);

            photosAfter.forEach(photo => {
                sections.push({
                    id: crypto.randomUUID(),
                    type: 'photo',
                    photoUrl: photo.url,
                    description: photo.description || photo.details || '',
                    photoMeta: {
                        originalId: (photo as any).id || crypto.randomUUID(),
                        area: photo.area,
                        phase: 'AFTER'
                    }
                } as PhotoSection);
            });
        }
    }

    // 4. Checklist
    if (ticket.checklist && ticket.checklist.length > 0) {
        sections.push({
            id: crypto.randomUUID(),
            type: 'h2',
            content: 'Checklist de servicio'
        } as TitleSection);

        const checklistItems = ticket.checklist.map(item => {
            const text = item.text || (item as any).label || 'Item sin nombre';
            return (item.checked ? '✅ ' : '⬜ ') + text;
        });

        sections.push({
            id: crypto.randomUUID(),
            type: 'list',
            items: checklistItems
        } as ListSection);
    }

    // 5. Recommendations
    if (ticket.recommendations) {
        sections.push({
            id: crypto.randomUUID(),
            type: 'h2',
            content: 'Recomendaciones'
        } as TitleSection);

        sections.push({
            id: crypto.randomUUID(),
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
            title: `Informe final del servicio #${ticket.ticketNumber || ticket.id.slice(0, 6)}`
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
        // Find the last photo of this phase
        for (let i = updatedSections.length - 1; i >= 0; i--) {
            const section = updatedSections[i];
            if (section.type === 'photo' && (section as PhotoSection).photoMeta?.phase === phase) {
                return i + 1;
            }
        }
        // If no photos of this phase, find the header
        const headerTexts = {
            BEFORE: 'Evidencia ANTES',
            DURING: 'Proceso del trabajo',
            AFTER: 'Resultado FINAL'
        };

        for (let i = 0; i < updatedSections.length; i++) {
            const section = updatedSections[i];
            if (section.type === 'h2' && (section as TitleSection).content === headerTexts[phase]) {
                return i + 1;
            }
        }

        // If no header, append at end
        return updatedSections.length;
    };

    // Add new photos
    Object.entries(newPhotosByPhase).forEach(([phase, photos]) => {
        if (photos.length > 0) {
            const insertPoint = findInsertionPoint(phase as 'BEFORE' | 'DURING' | 'AFTER');
            const newPhotoSections: PhotoSection[] = photos.map(photo => ({
                id: crypto.randomUUID(),
                type: 'photo',
                photoUrl: photo.url,
                description: photo.description || photo.details || '',
                photoMeta: {
                    originalId: (photo as any).id || crypto.randomUUID(),
                    area: photo.area,
                    phase: phase as 'BEFORE' | 'DURING' | 'AFTER'
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
