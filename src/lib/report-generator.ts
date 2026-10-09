import { 
    Ticket, 
    TicketReportNew, 
    TicketReportSection, 
    TitleSection, 
    TextSection, 
    ListSection, 
    GallerySection, 
    PhotoSection, 
    BeforeAfterSection 
} from "@/types/schema";
import { REPORT_TEMPLATES } from "./report-templates";
import { 
    Timestamp, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cleanUndefined } from "@/lib/utils";
import { PropertyLocation, EquipmentPassport, EquipmentIntervention } from "@/types/equipment";
import { InventoryMovement } from "@/types/inventory";
import { getEquipmentByLocation } from "@/lib/equipment-service";

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

export function buildTicketFullAddress(ticket: Ticket): string {
    const parts: string[] = [];
    if (ticket.locationName) parts.push(ticket.locationName);
    if (ticket.locationStreet) parts.push(ticket.locationStreet);
    if (ticket.locationHouseNumber) parts.push(`N° ${ticket.locationHouseNumber}`);
    if (ticket.specificLocation && !ticket.locationName?.includes(ticket.specificLocation)) {
        parts.push(ticket.specificLocation);
    }
    return parts.filter(Boolean).join(', ') || ticket.locationArea || '';
}

export interface AdditionalReportData {
    location?: PropertyLocation | any | null;
    equipments?: EquipmentPassport[];
    interventions?: EquipmentIntervention[];
    movements?: InventoryMovement[];
    companySettings?: any;
}

/**
 * Generates a complete report from a ticket with executive structure
 */
export function generateReportFromTicket(
    ticket: Ticket,
    customPolicies?: { warrantyPolicies?: string; defaultRecommendations?: string },
    additionalData?: AdditionalReportData
): TicketReportNew {
    const fullAddress = buildTicketFullAddress(ticket);

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
                address: fullAddress,
                date: formatTicketDate(ticket.createdAt),
                technicianName: ticket.technicianName || 'Técnico Especialista',
                title: `Informe Técnico #${ticket.ticketNumber || ticket.id.slice(0, 6)}`
            },
            sections: templateSections,
            signatures: {
                technicianSignature: (ticket as any).technicianSignature || undefined,
                technicianName: ticket.technicianName || 'Técnico Especialista',
                clientSignature: ticket.clientSignature || undefined,
                clientName: ticket.clientSignatureName || ticket.clientName || 'Cliente / Receptor',
                includeCompanySeal: true,
                includeCompanySignature: true
            },
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
        `Ubicación: ${fullAddress || 'N/D'}`,
        `Fecha de Ejecución: ${formatTicketDate(ticket.createdAt)}`,
        `Técnico Responsable: ${ticket.technicianName || 'Técnico Especialista'}`,
        `Tipo de Servicio: ${ticket.serviceType ? ticket.serviceType.replace(/_/g, ' ') : 'Mantenimiento General'}`
    ];

    if (ticket.startMileage || ticket.endMileage) {
        generalDataItems.push(`Kilometraje Registrado: ${ticket.startMileage ? `${ticket.startMileage} km inicial` : ''}${ticket.endMileage ? ` / ${ticket.endMileage} km final` : ''}`);
    }

    sections.push({
        id: uuid(),
        type: 'list',
        items: generalDataItems
    } as ListSection);

    // --- 1. FICHA DE LA VILLA / PROPIEDAD (SI APLICA) ---
    const loc = additionalData?.location;
    if (loc || ticket.locationId || ticket.locationUrl) {
        const propCode = loc?.code || (ticket.locationId ? `PROP-${ticket.locationId.slice(0, 5).toUpperCase()}` : null);
        const propName = loc?.nombre || ticket.locationName || 'Villa / Propiedad';
        const propArea = loc?.locationArea || ticket.locationArea || '';
        const propUrl = loc?.locationUrl || ticket.locationUrl || '';
        const facadePhoto = loc?.facadePhotoUrl || loc?.frontPhotoUrl;

        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Ficha de la Propiedad / Villa'
        } as TitleSection);

        const villaDetails = [
            `Propiedad: ${propName}`,
            propCode ? `Código de Registro: ${propCode}` : null,
            propArea ? `Sector / Complejo: ${propArea}` : null,
            propUrl ? `Ubicación GPS / Mapa: ${propUrl}` : null,
            ticket.isRetainer ? `Modalidad de Servicio: Contrato Villa Care Pass (Iguala Periódica)` : null
        ].filter(Boolean) as string[];

        sections.push({
            id: uuid(),
            type: 'list',
            items: villaDetails
        } as ListSection);

        if (facadePhoto) {
            sections.push({
                id: uuid(),
                type: 'photo',
                photoUrl: facadePhoto,
                description: `Fachada Principal - ${propName}${propCode ? ` (${propCode})` : ''}`,
                size: 'medium'
            } as PhotoSection);
        }
    }

    // --- 2. CENSO E INVENTARIO DE EQUIPOS INTERVENIDOS ---
    const eqs = additionalData?.equipments || (ticket.surveyAreas && ticket.surveyAreas.length > 0 ? ticket.surveyAreas.map((area, idx) => ({
        id: area.id || `eq-${idx}`,
        code: `EQ-${(area.id || String(idx + 1)).slice(0, 5).toUpperCase()}`,
        areaName: area.name,
        specs: {
            brand: area.brand || 'Genérica',
            model: area.modelNumber || area.model || '',
            btu: (area.requiredBtu && area.requiredBtu > 0) ? area.requiredBtu : (area.btuCapacity || 18000),
            refrigerant: area.refrigerant || 'R410A'
        },
        status: 'OPERATIONAL'
    } as any)) : []);

    if (eqs && eqs.length > 0) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Censo e Inventario de Equipos (Alcance del Servicio)'
        } as TitleSection);

        const eqLines = eqs.map((eq, i) => {
            const code = eq.code || `EQ-${String(i + 1).padStart(4, '0')}`;
            const area = eq.areaName || eq.name || 'Área General';
            const brand = eq.specs?.brand || (eq as any).marca || 'AC';
            const model = eq.specs?.model || (eq as any).modelo || '';
            const btu = eq.specs?.btu || (eq as any).capacidadBTU || '18,000';
            const parsedBtu = typeof btu === 'number' ? btu.toLocaleString() : btu;
            const gas = eq.specs?.refrigerant || (eq as any).refrigerante || 'R410A';
            const statusLabel = eq.status === 'OPERATIONAL' ? 'Operativo' : (eq.status || 'Revisado');
            return `[${code}] ${area}: ${brand} ${model ? `${model} ` : ''}- ${parsedBtu} BTU (${gas}) | Estado: ${statusLabel}`;
        });

        sections.push({
            id: uuid(),
            type: 'list',
            items: eqLines
        } as ListSection);
    }

    // --- 3. MEDICIONES OPERATIVAS Y DIAGNÓSTICO DE REFRIGERANTE CON IA ---
    const interventions = additionalData?.interventions || [];
    if (interventions.length > 0) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Mediciones Operativas y Diagnóstico de Carga de Refrigerante'
        } as TitleSection);

        interventions.forEach(int => {
            const hasMeas = int.measurements && (int.measurements.psiLow !== undefined || int.measurements.amp !== undefined || int.measurements.tempDelta !== undefined);
            if (hasMeas || int.diagnosis) {
                const headerText = `${int.equipmentCode ? `[${int.equipmentCode}] ` : ''}${int.areaName || 'Unidad de Climatización'}:`;
                const measDetails: string[] = [];
                if (int.measurements?.psiLow !== undefined) measDetails.push(`• Presión de baja (succión): ${int.measurements.psiLow} PSI`);
                if (int.measurements?.amp !== undefined) measDetails.push(`• Amperaje de consumo: ${int.measurements.amp} A`);
                if (int.measurements?.tempDelta !== undefined) measDetails.push(`• Salto térmico (ΔT): ${int.measurements.tempDelta} °C`);
                if (int.diagnosis) measDetails.push(`• Diagnóstico Técnico: ${int.diagnosis}`);

                sections.push({
                    id: uuid(),
                    type: 'text',
                    content: `${headerText}\n${measDetails.join('\n')}`
                } as TextSection);
            }
        });
    }

    // --- 4. MATERIALES Y REFRIGERANTE CONSUMIDO (CONTROL DE STOCK) ---
    const movements = additionalData?.movements || [];
    const outgoingMovements = movements.filter(m => m.type === 'SALIDA');

    if (outgoingMovements.length > 0) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Materiales, Repuestos y Refrigerante Consumidos'
        } as TitleSection);

        const movLines = outgoingMovements.map(m => {
            const name = m.productName || m.reason || 'Material';
            const qty = m.quantity;
            const unit = (m as any).unit || (name.toLowerCase().includes('r410') || name.toLowerCase().includes('r22') ? 'Lbs' : 'Ud(s)');
            return `• ${qty} ${unit} - ${name} (Descontado de Unidad Móvil / Camioneta)`;
        });

        sections.push({
            id: uuid(),
            type: 'list',
            items: movLines
        } as ListSection);
    } else if (ticket.materialsChecklist && ticket.materialsChecklist.length > 0) {
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

    // --- 5. DESCRIPCIÓN INICIAL / REQUERIMIENTO DEL CLIENTE ---
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

    // --- 6. DIAGNÓSTICO & HALLAZGOS TÉCNICOS ---
    sections.push({
        id: uuid(),
        type: 'h2',
        content: 'Diagnóstico y Hallazgos Técnicos'
    } as TitleSection);

    const areaDiagnosis = (ticket.surveyAreas || []).filter(a => a.notes && a.notes.trim());
    let diagnosisText = ticket.diagnosis || 'Se realizó inspección técnica completa de las condiciones operativas de los equipos e instalaciones.';
    if (areaDiagnosis.length > 0) {
        diagnosisText = areaDiagnosis.map(a => `**${a.name}**:\n${a.notes}`).join('\n\n');
    }

    sections.push({
        id: uuid(),
        type: 'text',
        content: diagnosisText
    } as TextSection);

    // --- 7. TRABAJO REALIZADO & SOLUCIÓN ---
    sections.push({
        id: uuid(),
        type: 'h2',
        content: 'Trabajo Realizado y Solución Técnica'
    } as TitleSection);

    sections.push({
        id: uuid(),
        type: 'text',
        content: ticket.solution || 'Mantenimiento preventivo, limpieza y trabajos técnicos ejecutados conforme a los protocolos institucionales de HECHO SRL.'
    } as TextSection);

    // --- 8. RECOMENDACIONES TÉCNICAS AL CLIENTE ---
    sections.push({
        id: uuid(),
        type: 'h2',
        content: 'Recomendaciones Técnicas para el Cliente'
    } as TitleSection);

    const areaRecommendations = (ticket.surveyAreas || []).filter(a => a.recommendations && a.recommendations.trim());
    let recommendationsText = ticket.recommendations || customPolicies?.defaultRecommendations || '';
    if (areaRecommendations.length > 0) {
        recommendationsText = areaRecommendations.map(a => `**${a.name}**:\n${a.recommendations}`).join('\n\n');
    }

    if (recommendationsText.trim()) {
        sections.push({
            id: uuid(),
            type: 'text',
            content: recommendationsText
        } as TextSection);
    }

    // --- 8.5 RESUMEN DE MATERIALES REQUERIDOS (PARA COTIZACION) ---
    const allRequiredMaterials = (ticket.surveyAreas || []).flatMap(a => (a.requiredMaterials || []).map(m => ({ ...m, area: a.name })));
    const allRecommendedEquipments = (ticket.surveyAreas || []).filter(a => a.recommendedEquipment && a.recommendedEquipment.trim() !== "");

    if (allRecommendedEquipments.length > 0) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Equipos Recomendados (Cálculo de Carga Térmica)'
        } as TitleSection);

        const eqLines = allRecommendedEquipments.map(a => `  📍 ${a.name}: ${a.recommendedEquipment}`);
        sections.push({
            id: uuid(),
            type: 'list',
            items: eqLines
        } as ListSection);
    }

    if (allRequiredMaterials.length > 0) {
        sections.push({
            id: uuid(),
            type: 'h2',
            content: 'Materiales y Repuestos Requeridos (Diagnóstico)'
        } as TitleSection);

        const matLines = allRequiredMaterials.map(m => `• ${m.quantity} ${m.unit} - ${m.description} (${m.area})`);
        sections.push({
            id: uuid(),
            type: 'list',
            items: matLines
        } as ListSection);
    }

    // --- 9. EVIDENCIA FOTOGRÁFICA EN 3 FASES ---
    const allPhotosForReport: any[] = [...(ticket.photos || [])];
    if (ticket.surveyAreas && Array.isArray(ticket.surveyAreas)) {
        ticket.surveyAreas.forEach(area => {
            (area.photos || []).forEach(p => {
                if (p && p.url && !allPhotosForReport.some(existing => existing.url === p.url)) {
                    allPhotosForReport.push({
                        ...p,
                        area: p.area || area.name,
                        description: p.description || `Evidencia en ${area.name}`
                    });
                }
            });
            if (area.platePhotoUrl && !allPhotosForReport.some(existing => existing.url === area.platePhotoUrl)) {
                allPhotosForReport.push({
                    url: area.platePhotoUrl,
                    type: 'SURVEY',
                    area: area.name,
                    description: `Placa Técnica - ${area.name}${area.brand || area.modelNumber ? ` (${[area.brand, area.modelNumber].filter(Boolean).join(' ')})` : ''}`
                });
            }
            if (area.boardPhotoUrl && !allPhotosForReport.some(existing => existing.url === area.boardPhotoUrl)) {
                allPhotosForReport.push({
                    url: area.boardPhotoUrl,
                    type: 'SURVEY',
                    area: area.name,
                    description: `Tarjeta / Conexión Condensador - ${area.name}`
                });
            }
        });
    }

    if (allPhotosForReport.length > 0) {
        const photosByArea: Record<string, any[]> = {};
        const generalPhotos: any[] = [];
        
        allPhotosForReport.forEach(photo => {
            if (photo.area) {
                if (!photosByArea[photo.area]) photosByArea[photo.area] = [];
                photosByArea[photo.area].push(photo);
            } else {
                generalPhotos.push(photo);
            }
        });

        const areaNames = Object.keys(photosByArea);
        if (areaNames.length > 0) {
            sections.push({
                id: uuid(),
                type: 'h2',
                content: 'Evidencia Fotográfica de los Trabajos por Área'
            } as TitleSection);

            areaNames.forEach(areaName => {
                sections.push({
                    id: uuid(),
                    type: 'text',
                    content: `**📍 Área: ${areaName}**`
                } as TextSection);
                
                sections.push({
                    id: uuid(),
                    type: 'gallery',
                    photos: photosByArea[areaName].map(photo => ({
                        photoUrl: photo.url,
                        description: photo.description || photo.details || (
                            photo.type === 'BEFORE' ? 'Condición Inicial (Antes)' : 
                            photo.type === 'AFTER' ? 'Trabajo Finalizado (Después)' : 
                            photo.type === 'SURVEY' ? 'Placa / Relevamiento Técnico' :
                            'Durante la Ejecución'
                        ),
                        photoMeta: {
                            originalId: photo.id || uuid(),
                            area: photo.area,
                            phase: photo.type || 'EVIDENCE'
                        }
                    }))
                } as GallerySection);
            });
        }

        if (generalPhotos.length > 0) {
            sections.push({
                id: uuid(),
                type: 'h2',
                content: areaNames.length > 0 ? 'Otras Evidencias Generales' : 'Evidencia Fotográfica de los Trabajos (Antes / Durante / Después)'
            } as TitleSection);

            sections.push({
                id: uuid(),
                type: 'gallery',
                photos: generalPhotos.map(photo => ({
                    photoUrl: photo.url,
                    description: photo.description || photo.details || (
                        photo.type === 'BEFORE' ? 'Condición Inicial (Antes)' : 
                        photo.type === 'AFTER' ? 'Trabajo Finalizado (Después)' : 
                        photo.type === 'SURVEY' ? 'Placa / Relevamiento Técnico' :
                        'Durante la Ejecución'
                    ),
                    photoMeta: {
                        originalId: photo.id || uuid(),
                        area: photo.area,
                        phase: photo.type || 'EVIDENCE'
                    }
                }))
            } as GallerySection);
        }
    }

    // --- 10. POLÍTICAS DE GARANTÍA Y TÉRMINOS ---
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

    const cleanedSections = deduplicateReportSections(sections);

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
        sections: cleanedSections,
        signatures: {
            technicianSignature: (ticket as any).technicianSignature || undefined,
            technicianName: ticket.technicianName || 'Técnico Especialista',
            clientSignature: ticket.clientSignature || undefined,
            clientName: ticket.clientSignatureName || ticket.clientName || 'Cliente / Receptor',
            includeCompanySeal: true,
            includeCompanySignature: true
        },
        lastGeneratedFromTicketAt: new Date().toISOString()
    };
}

/**
 * Deduplica y limpia secciones de reporte eliminando repeticiones de contenido idéntico o prefijado
 */
export function deduplicateReportSections(sections: TicketReportSection[]): TicketReportSection[] {
    if (!sections || sections.length === 0) return [];

    const cleanedSections: TicketReportSection[] = [];
    const seenTextContent = new Set<string>();

    const normalizeText = (t: string): string => {
        return t
            .replace(/^Ejecución de servicio técnico:\s*/i, '')
            .replace(/^Reporte de Levantamiento Técnico[^:\n]*:\s*/i, '')
            .replace(/^Descripción del Requerimiento[^:\n]*:\s*/i, '')
            .replace(/^Falla Reportada:\s*/i, '')
            .trim()
            .toLowerCase();
    };

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];

        // 1. Títulos
        if (section.type === 'h1' || section.type === 'h2') {
            const titleSection = section as TitleSection;
            const titleText = (titleSection.content || '').trim();
            if (!titleText) continue;

            // Verificar si el título actual es idéntico al último título agregado
            const lastSection = cleanedSections[cleanedSections.length - 1];
            if (lastSection && (lastSection.type === 'h1' || lastSection.type === 'h2')) {
                if ((lastSection as TitleSection).content?.trim().toLowerCase() === titleText.toLowerCase()) {
                    continue;
                }
            }

            // Mirar hacia adelante: si el contenido de texto que sigue es un duplicado que va a ser eliminado
            const nextSection = sections[i + 1];
            if (nextSection && nextSection.type === 'text') {
                const nextContent = ((nextSection as TextSection).content || '').trim();
                const normalizedNext = normalizeText(nextContent);
                if (normalizedNext.length > 30 && seenTextContent.has(normalizedNext)) {
                    continue;
                }
            }

            cleanedSections.push(section);
        }
        // 2. Textos
        else if (section.type === 'text') {
            const textSection = section as TextSection;
            const rawContent = (textSection.content || '').trim();
            if (!rawContent) continue;

            const normalized = normalizeText(rawContent);

            if (normalized.length > 30 && seenTextContent.has(normalized)) {
                const lastSection = cleanedSections[cleanedSections.length - 1];
                if (lastSection && (lastSection.type === 'h1' || lastSection.type === 'h2')) {
                    const lastTitle = (lastSection as TitleSection).content?.toLowerCase() || '';
                    if (lastTitle.includes('trabajo realizado') || lastTitle.includes('diagnóstico') || lastTitle.includes('solución') || lastTitle.includes('falla') || lastTitle.includes('requerimiento')) {
                        cleanedSections.pop();
                    }
                }
                continue;
            }

            if (normalized.length > 30) {
                seenTextContent.add(normalized);
            }

            if (rawContent.startsWith("Ejecución de servicio técnico: ")) {
                const cleanedText = rawContent.replace(/^Ejecución de servicio técnico:\s*/i, '');
                cleanedSections.push({
                    ...textSection,
                    content: cleanedText
                });
            } else {
                cleanedSections.push(section);
            }
        }
        // 3. Listas, Fotos, Galerías, etc.
        else {
            cleanedSections.push(section);
        }
    }

    while (cleanedSections.length > 0 && (cleanedSections[cleanedSections.length - 1].type === 'h1' || cleanedSections[cleanedSections.length - 1].type === 'h2')) {
        cleanedSections.pop();
    }

    return cleanedSections;
}

/**
 * Updates photos in report without losing existing content
 */
export function updatePhotosFromTicket(
    report: TicketReportNew,
    ticket: Ticket
): TicketReportNew {
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
        if (section.type === 'beforeAfter') {
            const ba = section as BeforeAfterSection;
            if (ba.beforePhotoUrl) existingUrls.add(ba.beforePhotoUrl);
            if (ba.afterPhotoUrl) existingUrls.add(ba.afterPhotoUrl);
        }
    });

    const allCandidatePhotos: any[] = [...(ticket.photos || [])];
    if (ticket.surveyAreas && Array.isArray(ticket.surveyAreas)) {
        ticket.surveyAreas.forEach(area => {
            if (area.photos && Array.isArray(area.photos)) {
                area.photos.forEach(p => {
                    if (p && p.url && !allCandidatePhotos.some(existing => existing.url === p.url)) {
                        allCandidatePhotos.push({
                            ...p,
                            area: p.area || area.name,
                            description: p.description || `Evidencia en ${area.name}`
                        });
                    }
                });
            }
            if (area.platePhotoUrl && !allCandidatePhotos.some(existing => existing.url === area.platePhotoUrl)) {
                allCandidatePhotos.push({
                    url: area.platePhotoUrl,
                    type: 'SURVEY',
                    area: area.name,
                    description: `Placa Técnica - ${area.name}${area.brand || area.modelNumber ? ` (${[area.brand, area.modelNumber].filter(Boolean).join(' ')})` : ''}`
                });
            }
            if (area.boardPhotoUrl && !allCandidatePhotos.some(existing => existing.url === area.boardPhotoUrl)) {
                allCandidatePhotos.push({
                    url: area.boardPhotoUrl,
                    type: 'SURVEY',
                    area: area.name,
                    description: `Tarjeta / Conexión Condensador - ${area.name}`
                });
            }
        });
    }

    const newPhotos = allCandidatePhotos.filter(photo => {
        if (!photo || !photo.url) return false;
        const hasId = photo.id;
        if (hasId && existingIds.has(hasId)) return false;
        if (photo.url && existingUrls.has(photo.url)) return false;
        return true;
    });

    if (newPhotos.length === 0) {
        return report;
    }

    const updatedSections = [...report.sections];

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

/**
 * Genera, compila y persiste automáticamente el Informe Técnico PDF en Firestore
 * recopilando la villa, censo de equipos, lecturas de refrigerante e insumos consumidos.
 */
export async function generateAndSaveTicketReport(
    ticketId: string,
    customTicket?: Ticket
): Promise<TicketReportNew> {
    try {
        let ticketData = customTicket;
        if (!ticketData) {
            const ticketSnap = await getDoc(doc(db, "tickets", ticketId));
            if (!ticketSnap.exists()) {
                throw new Error(`Ticket #${ticketId} no encontrado para generar reporte.`);
            }
            ticketData = { id: ticketSnap.id, ...ticketSnap.data() } as Ticket;
        }

        // 1. Cargar Villa / Propiedad si existe
        let locationData: PropertyLocation | null = null;
        if (ticketData.locationId) {
            try {
                const locSnap = await getDoc(doc(db, "locations", ticketData.locationId));
                if (locSnap.exists()) {
                    locationData = { id: locSnap.id, ...locSnap.data() } as PropertyLocation;
                }
            } catch (err) {
                console.warn("Could not load location data for report:", err);
            }
        }

        // 2. Cargar censo de equipos
        let equipments: EquipmentPassport[] = [];
        if (ticketData.locationId) {
            try {
                equipments = await getEquipmentByLocation(ticketData.locationId);
            } catch (err) {
                console.warn("Could not load equipments for report:", err);
            }
        }

        // 3. Cargar intervenciones técnicas con lecturas de manómetros y amperaje
        let interventions: EquipmentIntervention[] = [];
        try {
            const intQuery = query(collection(db, "interventions"), where("ticketId", "==", ticketId));
            const intSnap = await getDocs(intQuery);
            interventions = intSnap.docs.map(d => ({ id: d.id, ...d.data() } as EquipmentIntervention));
        } catch (err) {
            console.warn("Could not load interventions for report:", err);
        }

        // 4. Cargar consumos de materiales y refrigerante del ticket
        let movements: InventoryMovement[] = [];
        try {
            const movQuery = query(collection(db, "inventory_movements"), where("ticketId", "==", ticketId));
            const movSnap = await getDocs(movQuery);
            movements = movSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryMovement));
        } catch (err) {
            console.warn("Could not load inventory movements for report:", err);
        }

        // 5. Cargar políticas predeterminadas
        let policies: { warrantyPolicies?: string; defaultRecommendations?: string } | undefined;
        try {
            const polSnap = await getDoc(doc(db, "settings", "reports"));
            if (polSnap.exists()) {
                policies = polSnap.data() as any;
            }
        } catch {}

        // 6. Generar informe técnico enriquecido
        const report = generateReportFromTicket(ticketData, policies, {
            location: locationData,
            equipments,
            interventions,
            movements
        });

        // 7. Sanitizar y guardar en Firestore (ticketReports)
        const sanitizedReport = cleanUndefined(report);
        await setDoc(doc(db, "ticketReports", ticketId), sanitizedReport, { merge: true });

        // 8. Actualizar flag en el ticket
        await updateDoc(doc(db, "tickets", ticketId), {
            reportStatus: 'GENERATED',
            reportGeneratedAt: serverTimestamp()
        }).catch(err => console.warn("Could not update ticket reportStatus:", err));

        return report;
    } catch (error) {
        console.error("Error in generateAndSaveTicketReport:", error);
        throw error;
    }
}


