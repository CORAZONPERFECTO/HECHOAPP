import { Ticket, TicketReportNew, TicketReportSection, TitleSection, TextSection, ListSection, GallerySection, PhotoSection, BeforeAfterSection } from "@/types/schema";
import { REPORT_TEMPLATES } from "./report-templates";
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
 * Generates a complete report from a ticket with executive structure
 */
export function generateReportFromTicket(
    ticket: Ticket,
    customPolicies?: { warrantyPolicies?: string; defaultRecommendations?: string }
): TicketReportNew {
    // Si existe una plantilla especializada para el tipo de servicio (ej: LEVANTAMIENTO, MANTENIMIENTO, REPARACION, INSTALACION, INSPECCION)
    if (ticket.serviceType && REPORT_TEMPLATES[ticket.serviceType]) {
        const templateSections = REPORT_TEMPLATES[ticket.serviceType].generateSections(ticket);
        
        // Agregar términos de garantía al final si no están presentes
        const hasWarranty = templateSections.some(s => s.type === 'h2' && (s as TitleSection).content?.toLowerCase().includes('garantía'));
        if (!hasWarranty) {
            templateSections.push({
                id: uuid(),
                type: 'h2',
                content: 'Términos de Garantía y Condiciones'
            } as TitleSection);
            templateSections.push({
                id: uuid(),
                type: 'text',
                content: customPolicies?.warrantyPolicies || 
                    '1. Garantía de 30 días sobre la mano de obra del servicio realizado.\n2. La garantía no cubre averías ocasionadas por fluctuaciones de voltaje, descargas eléctricas, mal uso o manipulación por terceros no autorizados.\n3. Los repuestos e insumos cuentan con la garantía directa otorgada por el fabricante.'
            } as TextSection);
        }

        return {
            ticketId: ticket.id,
            header: {
                clientName: ticket.clientName,
                ticketNumber: ticket.ticketNumber || ticket.id.slice(0, 6),
                address: ticket.locationName || ticket.specificLocation || '',
                date: formatTicketDate(ticket.createdAt),
                technicianName: ticket.technicianName || 'Técnico Especialista',
                title: `Informe Técnico #${ticket.ticketNumber || ticket.id.slice(0, 6)}`
            },
            sections: templateSections,
            lastGeneratedFromTicketAt: new Date().toISOString()
        };
    }

    const sections: TicketReportSection[] = [];

    // --- 0. DATOS GENERALES DEL SERVICIO ---
    sections.push({
        id: uuid(),
        type: 'h2',
        content: 'Resumen del Servicio'
    } as TitleSection);

    const generalDataItems = [
        `Ticket: ${ticket.ticketNumber || ticket.id.slice(0, 8)}`,
        `Cliente: ${ticket.clientName || 'N/D'}`,
        `Ubicación: ${ticket.locationName || ticket.specificLocation || 'N/D'}`,
        `Fecha de Ejecución: ${formatTicketDate(ticket.createdAt)}`,
        `Técnico Responsable: ${ticket.technicianName || 'Técnico Especialista'}`,
        `Tipo de Servicio: ${ticket.serviceType ? ticket.serviceType.replace(/_/g, ' ') : 'Mantenimiento General'}`
    ];

    sections.push({
        id: uuid(),
        type: 'list',
        items: generalDataItems
    } as ListSection);

    // --- 1. DESCRIPCIÓN INICIAL / REQUERIMIENTO DEL CLIENTE (UNA SOLA VEZ) ---
    if (ticket.description && ticket.description.trim()) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Descripción del Requerimiento Inicial'
        } as TitleSection);

        sections.push({
            id: uuid(),
            type: 'text',
            content: ticket.description
        } as TextSection);
    }

    // --- 2. DIAGNÓSTICO & HALLAZGOS (NO DUPLICA DESCRIPCIÓN) ---
    sections.push({
        id: uuid(),
        type: 'h2',
        content: 'Diagnóstico y Hallazgos Técnicos'
    } as TitleSection);

    sections.push({
        id: uuid(),
        type: 'text',
        content: ticket.diagnosis || 'Se realizó inspección técnica de las condiciones del equipo e instalaciones.'
    } as TextSection);

    // --- 3. TRABAJO REALIZADO & SOLUCIÓN (NO DUPLICA DESCRIPCIÓN) ---
    sections.push({
        id: uuid(),
        type: 'h2',
        content: 'Trabajo Realizado y Solución Técnica'
    } as TitleSection);

    sections.push({
        id: uuid(),
        type: 'text',
        content: ticket.solution || 'Mantenimiento y trabajos técnicos ejecutados conforme a los estándares de calidad de HECHO SRL.'
    } as TextSection);

    // --- 2.5 MATERIALES Y REPUESTOS (SI APLICA) ---
    if (ticket.materialsChecklist && ticket.materialsChecklist.length > 0) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Materiales e Insumos Utilizados'
        } as TitleSection);

        const materialsList = ticket.materialsChecklist.map(m => `• ${m.text} ${m.checked ? '(Utilizado/Instalado)' : ''}`);
        sections.push({
            id: uuid(),
            type: 'list',
            items: materialsList
        } as ListSection);
    }

    // --- 3. RECOMENDACIONES TÉCNICAS AL CLIENTE (DESTACADO) ---
    sections.push({
        id: uuid(),
        type: 'h2',
        content: 'Recomendaciones Técnicas para el Cliente'
    } as TitleSection);

    const recommendationsText = ticket.recommendations || customPolicies?.defaultRecommendations || 
        '• Se recomienda realizar mantenimiento preventivo cada 3 meses para asegurar el rendimiento óptimo del equipo y evitar sobrecostos energéticos.\n• Mantener los filtros de retorno libres de obstrucciones y limpios.\n• Notificar oportunamente cualquier sonido inusual o variación en la temperatura del sistema.';

    sections.push({
        id: uuid(),
        type: 'text',
        content: recommendationsText
    } as TextSection);

    // --- 4. EVIDENCIA FOTOGRÁFICA (TODAS LAS FOTOS) ---
    if (ticket.photos && ticket.photos.length > 0) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Evidencia Fotográfica de los Trabajos'
        } as TitleSection);

        sections.push({
            id: uuid(),
            type: 'gallery',
            photos: ticket.photos.map(photo => ({
                photoUrl: photo.url,
                description: photo.description || photo.details || (photo.type === 'BEFORE' ? 'Condición Inicial (Antes)' : photo.type === 'AFTER' ? 'Trabajo Finalizado (Después)' : 'Durante la Ejecución'),
                photoMeta: {
                    originalId: (photo as { id?: string }).id || uuid(),
                    area: photo.area,
                    phase: photo.type || 'EVIDENCE'
                }
            }))
        } as GallerySection);
    }

    // --- 5. POLÍTICAS DE GARANTÍA Y TÉRMINOS ---
    sections.push({
        id: uuid(),
        type: 'h2',
        content: 'Términos de Garantía y Condiciones'
    } as TitleSection);

    const warrantyText = customPolicies?.warrantyPolicies || 
        '1. Garantía de 30 días sobre la mano de obra del servicio realizado.\n2. La garantía no cubre averías ocasionadas por fluctuaciones de voltaje, descargas eléctricas, mal uso o manipulación por terceros no autorizados.\n3. Los repuestos e insumos cuentan con la garantía directa otorgada por el fabricante.';

    sections.push({
        id: uuid(),
        type: 'text',
        content: warrantyText
    } as TextSection);

    return {
        ticketId: ticket.id,
        header: {
            clientName: ticket.clientName,
            ticketNumber: ticket.ticketNumber || ticket.id.slice(0, 6),
            address: ticket.locationName || ticket.specificLocation || '',
            date: formatTicketDate(ticket.createdAt),
            technicianName: ticket.technicianName || 'Técnico Especialista',
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
