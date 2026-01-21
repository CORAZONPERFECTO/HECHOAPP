import { Ticket, TicketReportNew, TicketReportSection } from "@/types/schema";

interface GenerateReportParams {
    ticket: Ticket;
    image?: string; // base64 if photo analysis is needed
}

interface ReportGenerationResult {
    success: boolean;
    report?: TicketReportNew;
    error?: string;
}

export async function generateReportWithAI(params: GenerateReportParams): Promise<ReportGenerationResult> {
    const { ticket } = params;

    try {
        // Build a rich context prompt for the AI
        const prompt = buildReportPrompt(ticket);

        // Prepare photos for AI analysis
        const photos = ticket.photos || [];
        const photoDescriptions: string[] = [];

        // Analyze photos if they exist
        if (photos.length > 0) {
            // We'll send photo URLs to Gemini for vision analysis
            for (const photo of photos.slice(0, 6)) { // Limit to 6 photos for performance
                try {
                    const description = await analyzePhoto(photo.url, photo.type);
                    photoDescriptions.push(`${photo.type}: ${description}`);
                } catch (err) {
                    console.error("Error analyzing photo:", err);
                }
            }
        }

        // Call Gemini API with all context
        const response = await fetch("/api/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                task: "generate-report",
                prompt,
                ticketData: {
                    serviceType: ticket.serviceType,
                    priority: ticket.priority,
                    description: ticket.description,
                    diagnosis: ticket.diagnosis,
                    solution: ticket.solution,
                    recommendations: ticket.recommendations,
                    photoDescriptions,
                    materialsUsed: ticket.materialsCost ? `Materiales: $${ticket.materialsCost}` : undefined,
                    laborHours: ticket.laborHours,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            return { success: false, error: data.error };
        }

        // Parse AI response into report structure
        const generatedSections = parseAIResponseToSections(data.output, ticket);

        const report: TicketReportNew = {
            ticketId: ticket.id!,
            header: {
                clientName: ticket.clientName,
                ticketNumber: ticket.ticketNumber || ticket.id.slice(0, 8),
                address: ticket.locationName + (ticket.specificLocation ? `, ${ticket.specificLocation}` : ''),
                date: new Date().toLocaleDateString('es-DO'),
                technicianName: ticket.technicianName,
                title: `Reporte de ${ticket.serviceType.replace(/_/g, ' ')}`
            },
            sections: generatedSections,
            signatures: undefined,
            lastGeneratedFromTicketAt: new Date().toISOString()
        };

        return { success: true, report };

    } catch (error: any) {
        console.error("Error generating report with AI:", error);
        return {
            success: false,
            error: error.message || "Error desconocido al generar reporte"
        };
    }
}

function buildReportPrompt(ticket: Ticket): string {
    return `Genera un reporte técnico profesional en español para un ticket de servicio.

CONTEXTO DEL TICKET:
- Tipo de Servicio: ${ticket.serviceType.replace(/_/g, ' ')}
- Cliente: ${ticket.clientName}
- Ubicación: ${ticket.locationName}
- Descripción Inicial: ${ticket.description}
- Diagnóstico: ${ticket.diagnosis || 'No especificado'}
- Solución: ${ticket.solution || 'No especificada'}
- Recomendaciones: ${ticket.recommendations || 'Ninguna'}

INSTRUCCIONES:
1. Crea un reporte estructurado y profesional
2. Usa títulos (h1, h2) para organizar secciones
3. Incluye:
   - Resumen ejecutivo
   - Diagnóstico técnico
   - Trabajo realizado
   - Recomendaciones
   - Conclusión
4. Usa lenguaje técnico pero comprensible
5. Si hay fotos, menciona que se incluyen evidencias fotográficas
6. Sé conciso pero completo

Devuelve el reporte en formato markdown estructurado.`;
}

async function analyzePhoto(photoUrl: string, photoType: string): Promise<string> {
    // In a real implementation, this would send the image to Gemini Vision for analysis
    // For now, we'll return a placeholder
    try {
        const response = await fetch("/api/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                task: "analyze-photo",
                image: photoUrl,
                context: `Imagen tipo: ${photoType}`
            })
        });

        if (!response.ok) {
            throw new Error("Photo analysis failed");
        }

        const data = await response.json();
        return data.output || "Imagen del equipo";
    } catch (error) {
        console.error("Error analyzing photo:", error);
        return `Evidencia fotográfica (${photoType})`;
    }
}

function parseAIResponseToSections(aiOutput: string, ticket: Ticket): TicketReportSection[] {
    const sections: TicketReportSection[] = [];

    // Split the AI output by markdown headers
    const lines = aiOutput.split('\n');
    let currentSection: TicketReportSection | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
        // Check for H1
        if (line.startsWith('# ')) {
            if (currentSection) {
                currentSection.content = currentContent.join('\n').trim();
                sections.push(currentSection);
            }
            currentSection = {
                id: crypto.randomUUID(),
                type: 'h1',
                content: line.substring(2).trim()
            };
            currentContent = [];
        }
        // Check for H2
        else if (line.startsWith('## ')) {
            if (currentSection) {
                currentSection.content = currentContent.join('\n').trim();
                sections.push(currentSection);
            }
            currentSection = {
                id: crypto.randomUUID(),
                type: 'h2',
                content: line.substring(3).trim()
            };
            currentContent = [];
        }
        // Check for list items
        else if (line.startsWith('- ') || line.startsWith('* ')) {
            if (currentSection && currentSection.type !== 'list') {
                currentSection.content = currentContent.join('\n').trim();
                sections.push(currentSection);
                currentSection = {
                    id: crypto.randomUUID(),
                    type: 'list',
                    items: [line.substring(2).trim()]
                };
                currentContent = [];
            } else if (currentSection && currentSection.type === 'list') {
                currentSection.items = currentSection.items || [];
                currentSection.items.push(line.substring(2).trim());
            }
        }
        // Regular text
        else if (line.trim()) {
            currentContent.push(line);
        }
        // Empty line
        else if (currentSection && currentContent.length > 0) {
            if (currentSection.type === 'text') {
                currentSection.content = (currentSection.content || '') + '\n' + currentContent.join('\n');
            } else {
                currentSection.content = currentContent.join('\n').trim();
                sections.push(currentSection);
                currentSection = null;
            }
            currentContent = [];
        }
    }

    // Push last section
    if (currentSection) {
        if (currentContent.length > 0) {
            currentSection.content = currentContent.join('\n').trim();
        }
        sections.push(currentSection);
    }

    // Add photo sections from ticket
    const photoSections = addPhotoSections(ticket);
    sections.push(...photoSections);

    return sections;
}

function addPhotoSections(ticket: Ticket): TicketReportSection[] {
    const sections: TicketReportSection[] = [];

    if (!ticket.photos || ticket.photos.length === 0) {
        return sections;
    }

    // Group photos by type
    const beforePhotos = ticket.photos.filter(p => p.type === 'BEFORE');
    const duringPhotos = ticket.photos.filter(p => p.type === 'DURING');
    const afterPhotos = ticket.photos.filter(p => p.type === 'AFTER');

    // Add divider before photos
    sections.push({
        id: crypto.randomUUID(),
        type: 'divider'
    });

    // Add title
    sections.push({
        id: crypto.randomUUID(),
        type: 'h2',
        content: 'Evidencia Fotográfica'
    });

    // Add photos as gallery if multiple, individual if single
    if (beforePhotos.length > 0) {
        sections.push({
            id: crypto.randomUUID(),
            type: 'h2',
            content: 'Antes del Servicio'
        });

        if (beforePhotos.length > 1) {
            sections.push({
                id: crypto.randomUUID(),
                type: 'gallery',
                photos: beforePhotos.map(p => ({
                    photoUrl: p.url,
                    description: p.description,
                    photoMeta: {
                        phase: 'BEFORE',
                        area: p.area
                    }
                }))
            });
        } else {
            sections.push({
                id: crypto.randomUUID(),
                type: 'photo',
                photoUrl: beforePhotos[0].url,
                description: beforePhotos[0].description,
                photoMeta: {
                    phase: 'BEFORE',
                    area: beforePhotos[0].area
                }
            });
        }
    }

    if (afterPhotos.length > 0) {
        sections.push({
            id: crypto.randomUUID(),
            type: 'h2',
            content: 'Después del Servicio'
        });

        if (afterPhotos.length > 1) {
            sections.push({
                id: crypto.randomUUID(),
                type: 'gallery',
                photos: afterPhotos.map(p => ({
                    photoUrl: p.url,
                    description: p.description,
                    photoMeta: {
                        phase: 'AFTER',
                        area: p.area
                    }
                }))
            });
        } else {
            sections.push({
                id: crypto.randomUUID(),
                type: 'photo',
                photoUrl: afterPhotos[0].url,
                description: afterPhotos[0].description,
                photoMeta: {
                    phase: 'AFTER',
                    area: afterPhotos[0].area
                }
            });
        }
    }

    if (duringPhotos.length > 0 && duringPhotos.length <= 3) {
        sections.push({
            id: crypto.randomUUID(),
            type: 'h2',
            content: 'Durante el Servicio'
        });

        duringPhotos.forEach(p => {
            sections.push({
                id: crypto.randomUUID(),
                type: 'photo',
                photoUrl: p.url,
                description: p.description,
                size: 'medium',
                photoMeta: {
                    phase: 'DURING',
                    area: p.area
                }
            });
        });
    }

    return sections;
}
