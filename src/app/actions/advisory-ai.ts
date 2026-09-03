"use server";

import { AIAdvisoryAuditResult, AdvisoryMetrics } from "@/types/advisory";

export async function runAIAdvisoryAuditAction(metrics: AdvisoryMetrics): Promise<{
    success: boolean;
    data?: AIAdvisoryAuditResult;
    error?: string;
}> {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return { success: false, error: "GEMINI_API_KEY no configurada en el servidor" };
        }

        const prompt = `Eres el Consejo Asesor Ejecutivo con IA de la empresa HECHO SRL en República Dominicana (especialistas en climatización, refrigeración comercial, mantenimiento y obras técnicas).
Actúa como un panel de 3 asesores directivos de alto nivel:
1. Director de Operaciones & Eficiencia (COO)
2. Director Financiero & Compras (CFO)
3. Director de Talento Humano & Cultura (CHRO)

Analiza las siguientes métricas y números reales del sistema HECHOAPP:
- Salud General: ${metrics.overallHealthScore}/100
- Fugas de Capital Estimadas: RD$ ${metrics.totalEstimatedLeaks.toLocaleString()}
- Operaciones: ${metrics.operations.totalTickets} tickets (${metrics.operations.openTickets} abiertos, ${metrics.operations.stuckTicketsCount} estancados >24h). Tasa de retorno de garantía: ${metrics.operations.warrantyReworkRate}%. Cumplimiento de fotos: ${metrics.operations.photoComplianceRate}%. Km promedio/ticket: ${metrics.operations.avgKmPerTicket} km.
- Finanzas: Ingresos RD$ ${metrics.finance.totalRevenue.toLocaleString()}, Costos RD$ ${metrics.finance.totalCosts.toLocaleString()}, Margen: ${metrics.finance.profitMargin}%. Compras en calle: RD$ ${metrics.finance.streetPurchasesTotal.toLocaleString()} (de las cuales RD$ ${metrics.finance.informalPurchasesTotal.toLocaleString()} fueron sin NCF, generando RD$ ${metrics.finance.informalPurchasesTaxLoss.toLocaleString()} en pérdida de ITBIS). Tickets con margen negativo: ${metrics.finance.negativeMarginTicketsCount}.
- Talento: ${metrics.talent.totalTechnicians} técnicos activos. Puntuación promedio: ${metrics.talent.avgTechnicianScore}/100. Técnico estrella: ${metrics.talent.topPerformerName}. Bonos sugeridos por margen limpio: RD$ ${metrics.talent.totalSuggestedBonuses.toLocaleString()}.

Genera un dictamen directivo contundente, estratégico y aplicable a la realidad dominicana.
Responde ÚNICAMENTE con un objeto JSON válido con este formato:
{
  "executiveSummary": "Resumen ejecutivo directo de 2-3 párrafos con el estado de HECHO SRL, principales victorias y áreas de riesgo inmediato.",
  "operationalDiagnosis": {
    "bottlenecks": ["Punto de fricción 1", "Punto de fricción 2"],
    "recommendations": ["Recomendación operativa 1", "Recomendación operativa 2"]
  },
  "financialDiagnosis": {
    "leakSources": ["Fuente de fuga 1", "Fuente de fuga 2"],
    "pricingAndProcurementPlan": ["Estrategia de precios/compras 1", "Estrategia de compras 2"]
  },
  "talentDiagnosis": {
    "incentiveRecommendations": ["Plan de bonos/incentivos 1", "Plan de reconocimiento 2"],
    "trainingNeeds": ["Capacitación técnica sugerida 1", "Capacitación 2"]
  },
  "actionPlan": [
    {
      "priority": "ALTA",
      "title": "Acción estratégica inmediata 1",
      "responsible": "Operaciones / Finanzas / Gerencia",
      "expectedImpact": "Impacto esperado en RD$ o tiempo"
    },
    {
      "priority": "ALTA",
      "title": "Acción estratégica inmediata 2",
      "responsible": "Compras / Almacén",
      "expectedImpact": "Ahorro del 15% en insumos de calle"
    },
    {
      "priority": "MEDIA",
      "title": "Acción estratégica 3",
      "responsible": "Talento Humano",
      "expectedImpact": "Aumento del 20% en satisfacción del equipo"
    }
  ]
}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.2,
                        responseMimeType: "application/json"
                    }
                })
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
            throw new Error("No se recibió respuesta del modelo de IA");
        }

        const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned) as AIAdvisoryAuditResult;

        return { success: true, data: parsed };
    } catch (error: any) {
        console.error("Error in runAIAdvisoryAuditAction:", error);
        return { success: false, error: error.message || "Error procesando auditoría IA" };
    }
}
