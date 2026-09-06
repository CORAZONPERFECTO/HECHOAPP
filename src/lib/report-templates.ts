import { Ticket, TicketReportSection, TicketPhoto, ChecklistItem, TitleSection, TextSection, ListSection, PhotoSection, BeforeAfterSection } from "@/types/schema";

export interface ReportTemplate {
    id: string;
    name: string;
    description: string;
    generateSections: (ticket: Ticket) => TicketReportSection[];
}

const formatChecklistItems = (checklist: ChecklistItem[]): string[] => {
    if (!checklist || checklist.length === 0) return ["No se realizó checklist."];
    return checklist.map(item => `${item.checked ? '[OK]' : '[-]'} ${item.text || (item as any).label || "Item"}`);
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

const getAllTicketPhotos = (ticket: Ticket): TicketPhoto[] => {
    const photos: TicketPhoto[] = [...(ticket.photos || [])];
    if (ticket.surveyAreas && Array.isArray(ticket.surveyAreas)) {
        ticket.surveyAreas.forEach(area => {
            (area.photos || []).forEach(p => {
                if (p && p.url && !photos.some(existing => existing.url === p.url)) {
                    photos.push({
                        ...p,
                        area: p.area || area.name,
                        description: p.description || `Evidencia en ${area.name}`
                    });
                }
            });
        });
    }
    return photos;
};

export const REPORT_TEMPLATES: Record<string, ReportTemplate> = {
    'MANTENIMIENTO': {
        id: 'maintenance',
        name: 'Mantenimiento Preventivo',
        description: 'Plantilla estándar para servicios de mantenimiento preventivo.',
        generateSections: (ticket: Ticket) => {
            const sections: TicketReportSection[] = [];
            const allPhotos = getAllTicketPhotos(ticket);
            const { before, during, after } = groupPhotos(allPhotos);

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
            const allPhotos = getAllTicketPhotos(ticket);
            const { before, during, after } = groupPhotos(allPhotos);

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
            const allPhotos = getAllTicketPhotos(ticket);
            const { before, during, after } = groupPhotos(allPhotos);

            sections.push(createTitle('Reporte de Reparación', 'h1'));

            // Falla Reportada
            sections.push(createTitle('Falla Reportada'));
            sections.push(createText(ticket.description || "Sin descripción de falla."));

            // Diagnóstico
            sections.push(createTitle('Diagnóstico Técnico'));
            sections.push(createText(ticket.diagnosis || "Describir el diagnóstico técnico de la avería encontrada..."));

            if (before.length > 0) {
                sections.push(createTitle('Evidencia de la Falla'));
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

    'LEVANTAMIENTO': {
        id: 'survey',
        name: 'Levantamiento Técnico & Carga Térmica',
        description: 'Plantilla especializada por áreas, cálculo de BTU, evidencias proporcionales y presupuesto.',
        generateSections: (ticket: Ticket) => {
            const sections: TicketReportSection[] = [];
            const areas = ticket.surveyAreas || [];

            // 1. Título y Análisis Técnico del Levantamiento
            sections.push(createTitle('Reporte de Levantamiento Técnico', 'h1'));
            
            if (ticket.description && ticket.description.trim()) {
                sections.push(createText(ticket.description.trim()));
            } else {
                sections.push(createText(
                    `Levantamiento técnico realizado en ${ticket.locationName}${ticket.specificLocation ? ` (${ticket.specificLocation})` : ''}. ` +
                    `Se evaluaron las condiciones estructurales, requerimientos de carga térmica, factibilidad eléctrica y recorrido de tuberías para climatización.`
                ));
            }

            // 2. Cuadro Resumen de Carga Térmica y Equipos Recomendados
            if (areas.length > 0) {
                sections.push(createTitle('Dimensionamiento & Carga Térmica por Área'));
                const summaryItems = areas.map((a) => {
                    const m2 = a.areaSquareMeters || (a.lengthMeters && a.widthMeters ? (a.lengthMeters * a.widthMeters) : 0);
                    const btu = a.requiredBtu || (m2 > 0 ? Math.round(m2 * 650) : 0);
                    const volt = a.voltage || "220V";
                    const isTechnical = /techo|condensador|tablero|acometida|eléctrico|maquin/i.test(a.name);
                    
                    if (isTechnical && (!btu || btu === 0)) {
                        return `• ${a.name}: Ubicación técnica exterior / soporte para unidades condensadoras`;
                    }

                    const parts: string[] = [];
                    if (m2 > 0) {
                        parts.push(`${m2} m2`);
                    }
                    if (btu > 0) {
                        parts.push(`Carga Térmica: ${btu.toLocaleString()} BTU`);
                    }
                    if (a.recommendedEquipment && a.recommendedEquipment.trim()) {
                        parts.push(`Equipo: ${a.recommendedEquipment} (${volt})`);
                    } else if (btu > 0) {
                        parts.push(`Equipo: Split Inverter ${btu.toLocaleString()} BTU (${volt})`);
                    }

                    // Ficha Técnica (Marca, Modelo, Serial, Refrigerante)
                    const techParts: string[] = [];
                    if (a.brand) techParts.push(`Marca: ${a.brand}`);
                    if (a.modelNumber) techParts.push(`Mod: ${a.modelNumber}`);
                    if (a.serialNumber) techParts.push(`S/N: ${a.serialNumber}`);
                    if (a.refrigerant) techParts.push(`Gas: ${a.refrigerant}`);
                    if (techParts.length > 0) {
                        parts.push(`[${techParts.join(' | ')}]`);
                    }

                    if (parts.length === 0) {
                        return `• ${a.name}: Área registrada (especificaciones técnicas pendientes)`;
                    }

                    return `• ${a.name}: ${parts.join(' | ')}`;
                });
                sections.push({
                    id: crypto.randomUUID(),
                    type: 'list',
                    items: summaryItems
                });
            }

            // 3. Evidencias Fotográficas por Ambiente / Área (Tamaño proporcional)
            const areaPhotoUrls = new Set<string>();
            if (areas.length > 0) {
                areas.forEach((area) => {
                    const hasPhotos = (area.photos && area.photos.length > 0) || area.platePhotoUrl || area.boardPhotoUrl;
                    if (hasPhotos) {
                        sections.push(createTitle(`Evidencias Fotográficas: ${area.name}`));
                        if (area.notes) {
                            sections.push(createText(`Observaciones: ${area.notes}`));
                        }
                        // Fotos generales del área
                        (area.photos || []).forEach((photo) => {
                            if (photo.url) {
                                areaPhotoUrls.add(photo.url);
                                sections.push({
                                    id: crypto.randomUUID(),
                                    type: 'photo',
                                    photoUrl: photo.url,
                                    description: photo.description || `Evidencia técnica en ${area.name}`,
                                    size: 'medium'
                                });
                            }
                        });
                        // Foto de Placa Técnica
                        if (area.platePhotoUrl) {
                            areaPhotoUrls.add(area.platePhotoUrl);
                            sections.push({
                                id: crypto.randomUUID(),
                                type: 'photo',
                                photoUrl: area.platePhotoUrl,
                                description: `Placa Técnica - ${area.name}${area.brand || area.modelNumber ? ` (${[area.brand, area.modelNumber].filter(Boolean).join(' ')})` : ''}`,
                                size: 'medium'
                            });
                        }
                        // Foto de Tarjeta / Conexión Eléctrica
                        if (area.boardPhotoUrl) {
                            areaPhotoUrls.add(area.boardPhotoUrl);
                            sections.push({
                                id: crypto.randomUUID(),
                                type: 'photo',
                                photoUrl: area.boardPhotoUrl,
                                description: `Tarjeta Electrónica / Conexión Condensador - ${area.name}`,
                                size: 'medium'
                            });
                        }
                    }
                });
            }

            // También agregar fotos adicionales de ticket.photos que no estén en ningún área
            const extraPhotos = (ticket.photos || []).filter(p => p.url && !areaPhotoUrls.has(p.url));
            if (extraPhotos.length > 0) {
                sections.push(createTitle('Otras Evidencias Fotográficas'));
                sections.push(...createPhotoSections(extraPhotos));
            }

            // 4. Diagnóstico Técnico & Hallazgos
            if (ticket.diagnosis) {
                sections.push(createTitle('Diagnóstico Técnico & Estado Actual'));
                sections.push(createText(ticket.diagnosis));
            }

            // 5. Recomendaciones Técnicas
            sections.push(createTitle('Recomendaciones Técnicas'));
            if (ticket.recommendations) {
                sections.push(createText(ticket.recommendations));
            } else {
                sections.push(createText(
                    "1. Se recomienda instalar protectores de voltaje de alta capacidad para cada equipo.\n" +
                    "2. Asegurar que las tuberías de drenaje cuenten con la pendiente requerida hacia el punto de desagüe.\n" +
                    "3. Mantener despejadas las áreas de condensadores para asegurar el flujo adecuado de disipación de calor."
                ));
            }

            // 6. Presupuesto / Propuesta Económica Estimada
            if (ticket.surveyBudget) {
                sections.push(createTitle('Presupuesto Estimado de Inversión'));
                const budgetItems: string[] = [];
                ticket.surveyBudget.equipmentItems?.forEach(e => {
                    budgetItems.push(`• ${e.description} (Cant: ${e.quantity}) — RD$ ${e.total.toLocaleString()}`);
                });
                ticket.surveyBudget.materialItems?.forEach(m => {
                    budgetItems.push(`• ${m.description} (Cant: ${m.quantity}) — RD$ ${m.total.toLocaleString()}`);
                });
                if (ticket.surveyBudget.laborCost) {
                    budgetItems.push(`• Mano de Obra de Instalación — RD$ ${ticket.surveyBudget.laborCost.toLocaleString()}`);
                }
                budgetItems.push(`TOTAL ESTIMADO: RD$ ${ticket.surveyBudget.totalEstimated.toLocaleString()}`);

                sections.push({
                    id: crypto.randomUUID(),
                    type: 'list',
                    items: budgetItems
                });
            }

            return sections;
        }
    },

    'INSPECCION': {
        id: 'inspection',
        name: 'Inspección Técnica',
        description: 'Plantilla de inspección técnica estructurada.',
        generateSections: (ticket: Ticket) => {
            // Reutiliza la plantilla especializada de levantamiento
            return REPORT_TEMPLATES['LEVANTAMIENTO'].generateSections(ticket);
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

            const allPhotos = getAllTicketPhotos(ticket);
            const { before, during, after } = groupPhotos(allPhotos);
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
