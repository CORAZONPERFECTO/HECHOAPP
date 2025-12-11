import { Ticket, TicketReportSection, TicketPhoto, ChecklistItem, TitleSection, TextSection, ListSection, PhotoSection, BeforeAfterSection } from "@/types/schema";

export interface ReportTemplate {
    id: string;
    name: string;
    description: string;
    generateSections: (ticket: Ticket) => TicketReportSection[];
}

const formatChecklistItems = (checklist: ChecklistItem[]): string[] => {
    if (!checklist || checklist.length === 0) return ["No se realizó checklist."];
    return checklist.map(item => `${item.checked ? '✅' : '⬜'} ${item.text || (item as any).label || "Item"}`);
};

const groupPhotos = (photos: TicketPhoto[]): { before: TicketPhoto[], during: TicketPhoto[], after: TicketPhoto[] } => {
    return {
        before: photos.filter(p => p.type === 'BEFORE'),
        during: photos.filter(p => p.type === 'DURING'),
        after: photos.filter(p => p.type === 'AFTER')
    };
};

const createPhotoSections = (photos: TicketPhoto[]): PhotoSection[] => {
    const sections: PhotoSection[] = [];

    photos.forEach(photo => {
        if (photo.url) {
            sections.push({
                id: crypto.randomUUID(),
                type: 'photo',
                photoUrl: photo.url,
                description: photo.description || photo.details || ''
            });
        }
    });

    return sections;
};

// Helper to create title
const createTitle = (content: string, level: 'h1' | 'h2' = 'h2'): TitleSection => ({
    id: crypto.randomUUID(),
    type: level,
    content
});

// Helper to create text
const createText = (content: string): TextSection => ({
    id: crypto.randomUUID(),
    type: 'text',
    content
});

export const REPORT_TEMPLATES: Record<string, ReportTemplate> = {
    'MANTENIMIENTO': {
        id: 'maintenance',
        name: 'Mantenimiento Preventivo',
        description: 'Plantilla estándar para servicios de mantenimiento preventivo.',
        generateSections: (ticket: Ticket) => {
            const sections: TicketReportSection[] = [];
            const { before, during, after } = groupPhotos(ticket.photos || []);

            // 1. Resumen Ejecutivo
            sections.push(createTitle('Reporte de Mantenimiento Preventivo', 'h1'));
            sections.push(createText(`Se realizó el servicio de mantenimiento preventivo al equipo ubicado en ${ticket.locationName}${ticket.locationArea ? ` - ${ticket.locationArea}` : ''}. El objetivo del servicio es asegurar el óptimo funcionamiento.`));

            // 2. Estado Inicial (Fotos Antes)
            if (before.length > 0) {
                sections.push(createTitle('Estado Inicial del Equipo'));
                sections.push(createText('Condiciones encontradas antes de iniciar el servicio:'));
                sections.push(...createPhotoSections(before));
            }

            // 3. Actividades Realizadas (Checklist)
            sections.push(createTitle('Actividades Realizadas'));
            const checklistItems = formatChecklistItems(ticket.checklist || []);
            sections.push({
                id: crypto.randomUUID(),
                type: 'list',
                items: checklistItems
            });

            // 4. Proceso (Fotos Durante)
            if (during.length > 0) {
                sections.push(createTitle('Durante el Servicio'));
                sections.push(...createPhotoSections(during));
            }

            // 5. Diagnóstico Técnico
            if (ticket.diagnosis) {
                sections.push(createTitle('Diagnóstico Técnico'));
                sections.push(createText(ticket.diagnosis));
            }

            // 6. Resultado Final (Fotos Después)
            sections.push(createTitle('Resultado Final'));
            if (after.length > 0) {
                sections.push(...createPhotoSections(after));
            } else {
                sections.push(createText('El equipo quedó operativo y limpio.'));
            }

            // 7. Recomendaciones
            if (ticket.recommendations) {
                sections.push(createTitle('Recomendaciones'));
                sections.push(createText(ticket.recommendations));
            }

            return sections;
        }
    },

    'INSTALACION': {
        id: 'installation',
        name: 'Instalación de Equipo',
        description: 'Plantilla para instalación de equipos nuevos.',
        generateSections: (ticket: Ticket) => {
            const sections: TicketReportSection[] = [];
            const { before, during, after } = groupPhotos(ticket.photos || []);

            sections.push(createTitle('Reporte de Instalación', 'h1'));
            sections.push(createText(`Instalación de equipo en ${ticket.locationName}. Se procedió según las normas técnicas y especificaciones del fabricante.`));

            sections.push(createTitle('Datos de Instalación'));
            sections.push({
                id: crypto.randomUUID(),
                type: 'list',
                items: [
                    `Ubicación: ${ticket.specificLocation || 'No especificada'}`,
                    `Tipo de Equipo: ${ticket.serviceType || 'Aire Acondicionado'}`,
                    `Voltaje: Verificar en campo`
                ]
            });

            if (during.length > 0) {
                sections.push(createTitle('Proceso de Instalación'));
                sections.push(...createPhotoSections(during));
            }

            sections.push(createTitle('Pruebas de Funcionamiento'));
            sections.push({
                id: crypto.randomUUID(),
                type: 'list',
                items: formatChecklistItems(ticket.checklist || [])
            });

            sections.push(createTitle('Instalación Finalizada'));
            if (after.length > 0) {
                sections.push(...createPhotoSections(after));
            }

            if (ticket.diagnosis) {
                sections.push(createTitle('Notas del Técnico'));
                sections.push(createText(ticket.diagnosis));
            }

            return sections;
        }
    },

    'REPARACION': {
        id: 'repair',
        name: 'Reparación Correctiva',
        description: 'Plantilla enfocada en diagnóstico y solución de fallas.',
        generateSections: (ticket: Ticket) => {
            const sections: TicketReportSection[] = [];
            const { before, during, after } = groupPhotos(ticket.photos || []);

            sections.push(createTitle('Reporte de Reparación', 'h1'));

            // Falla Reportada
            sections.push(createTitle('Falla Reportada'));
            sections.push(createText(ticket.description || "Sin descripción de falla."));

            // Diagnóstico
            sections.push(createTitle('Diagnóstico Técnico'));
            sections.push(createText(ticket.diagnosis || "Describir el diagnóstico técnico de la avería encontrada..."));

            if (before.length > 0) {
                sections.push(createTitle('Evidencia de la Falla')); // Optional subtitle logic
                sections.push(...createPhotoSections(before));
            }

            // Solución
            sections.push(createTitle('Solución Aplicada'));
            sections.push(createText(ticket.solution || "Describir la reparación realizada..."));

            if (during.length > 0) {
                sections.push(createTitle('Proceso de Reparación'));
                sections.push(...createPhotoSections(during));
            }

            // Pruebas Finales
            sections.push(createTitle('Pruebas y Resultado'));
            if (after.length > 0) {
                sections.push(...createPhotoSections(after));
            }
            sections.push(createText('El equipo quedó operando correctamente dentro de sus parámetros normales.'));

            return sections;
        }
    },

    'DEFAULT': {
        id: 'default',
        name: 'Reporte Estándar',
        description: 'Plantilla genérica basada en la estructura del ticket.',
        generateSections: (ticket: Ticket) => {
            const sections: TicketReportSection[] = [];

            if (ticket.diagnosis) {
                sections.push(createTitle('Diagnóstico'));
                sections.push(createText(ticket.diagnosis));
            }

            if (ticket.solution) {
                sections.push(createTitle('Solución Aplicada'));
                sections.push(createText(ticket.solution));
            }

            const { before, during, after } = groupPhotos(ticket.photos || []);
            if (before.length > 0 || during.length > 0 || after.length > 0) {
                sections.push(createTitle('Evidencia Fotográfica'));
                if (before.length > 0) sections.push(...createPhotoSections(before));
                if (during.length > 0) sections.push(...createPhotoSections(during));
                if (after.length > 0) sections.push(...createPhotoSections(after));
            }

            if (ticket.checklist && ticket.checklist.length > 0) {
                sections.push(createTitle('Lista de Verificación'));
                sections.push({
                    id: crypto.randomUUID(),
                    type: 'list',
                    items: formatChecklistItems(ticket.checklist)
                });
            }

            if (ticket.recommendations) {
                sections.push(createTitle('Recomendaciones'));
                sections.push(createText(ticket.recommendations));
            }

            return sections;
        }
    }
};
