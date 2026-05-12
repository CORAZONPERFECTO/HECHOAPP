import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ReportTemplate, TicketReportSection } from "@/types/reports";

// ─────────────────────────────────────────────
// Helper: build a section with a fresh UUID
// ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const s = (section: any): TicketReportSection => ({
    ...section,
    id: crypto.randomUUID(),
} as TicketReportSection);

// ─────────────────────────────────────────────
// BUILT-IN TEMPLATES  (not stored in Firestore)
// ─────────────────────────────────────────────
export const BUILT_IN_TEMPLATES: ReportTemplate[] = [
    {
        id: "builtin-mantenimiento",
        name: "Mantenimiento Preventivo",
        description: "Estructura estándar para visitas de mantenimiento programado.",
        icon: "🔧",
        serviceTypes: ["MANTENIMIENTO", "PREVENTIVO"],
        isBuiltIn: true,
        sections: [
            s({ type: "h1", content: "INFORME DE MANTENIMIENTO PREVENTIVO" }),
            s({ type: "divider" }),
            s({ type: "h2", content: "1. Objetivo de la Visita" }),
            s({ type: "text", content: "Realizar mantenimiento preventivo programado al equipo, garantizando su correcto funcionamiento y prolongando su vida útil." }),
            s({ type: "h2", content: "2. Estado Inicial del Equipo" }),
            s({ type: "text", content: "Describa las condiciones encontradas al inicio de la visita: temperatura, presiones, niveles de refrigerante, y observaciones generales." }),
            s({ type: "h2", content: "3. Trabajos Realizados" }),
            s({ type: "list", items: [
                "Limpieza de filtros y serpentines",
                "Verificación de conexiones eléctricas",
                "Revisión de niveles de refrigerante",
                "Lubricación de partes móviles",
                "Prueba de funcionamiento general",
            ]}),
            s({ type: "h2", content: "4. Materiales Utilizados" }),
            s({ type: "text", content: "Detalle los materiales, repuestos o insumos utilizados durante la intervención." }),
            s({ type: "h2", content: "5. Estado Final del Equipo" }),
            s({ type: "text", content: "Describa las condiciones del equipo al finalizar la visita. Incluya lecturas de temperatura, presión y resultado de las pruebas." }),
            s({ type: "h2", content: "6. Recomendaciones" }),
            s({ type: "text", content: "Liste cualquier acción adicional recomendada, piezas que requieren sustitución próximamente o condiciones a monitorear." }),
            s({ type: "divider" }),
            s({ type: "h2", content: "7. Próxima Visita Programada" }),
            s({ type: "text", content: "Indique la fecha estimada para la siguiente visita de mantenimiento preventivo." }),
        ],
    },
    {
        id: "builtin-instalacion",
        name: "Instalación de Equipo",
        description: "Para documentar la puesta en marcha e instalación de equipos nuevos.",
        icon: "⚙️",
        serviceTypes: ["INSTALACION", "ARRANQUE_EQUIPOS"],
        isBuiltIn: true,
        sections: [
            s({ type: "h1", content: "INFORME DE INSTALACIÓN" }),
            s({ type: "divider" }),
            s({ type: "h2", content: "1. Alcance de la Instalación" }),
            s({ type: "text", content: "Describa el alcance del trabajo de instalación acordado con el cliente, incluyendo equipos a instalar y área de trabajo." }),
            s({ type: "h2", content: "2. Equipos Instalados" }),
            s({ type: "list", items: [
                "Modelo y número de serie del equipo principal",
                "Accesorios y componentes adicionales",
                "Materiales de instalación utilizados",
            ]}),
            s({ type: "h2", content: "3. Especificaciones Técnicas" }),
            s({ type: "text", content: "Registre los parámetros técnicos de configuración: voltaje, amperaje, presiones de operación, distancias de tuberías, etc." }),
            s({ type: "h2", content: "4. Pruebas de Funcionamiento" }),
            s({ type: "text", content: "Documente las pruebas realizadas durante la puesta en marcha y los resultados obtenidos." }),
            s({ type: "h2", content: "5. Instrucciones al Cliente" }),
            s({ type: "text", content: "Detalle las instrucciones de uso básico, cuidados y procedimientos de emergencia explicados al cliente durante la entrega." }),
            s({ type: "h2", content: "6. Observaciones Adicionales" }),
            s({ type: "text", content: "Cualquier condición especial observada, limitaciones de la instalación o recomendaciones para el correcto uso del equipo." }),
        ],
    },
    {
        id: "builtin-reparacion",
        name: "Reparación / Correctivo",
        description: "Para documentar diagnóstico, causa raíz y solución de una falla.",
        icon: "🛠️",
        serviceTypes: ["REPARACION", "EMERGENCIA", "DIAGNOSTICO"],
        isBuiltIn: true,
        sections: [
            s({ type: "h1", content: "INFORME DE REPARACIÓN" }),
            s({ type: "divider" }),
            s({ type: "h2", content: "1. Síntoma Reportado" }),
            s({ type: "text", content: "Describa la falla o problema reportado por el cliente que motivó la visita técnica." }),
            s({ type: "h2", content: "2. Diagnóstico Técnico" }),
            s({ type: "text", content: "Describa el proceso de diagnóstico realizado y los hallazgos técnicos encontrados durante la inspección del equipo." }),
            s({ type: "h2", content: "3. Causa Raíz Identificada" }),
            s({ type: "text", content: "Identifique y explique la causa raíz que originó la falla." }),
            s({ type: "h2", content: "4. Solución Aplicada" }),
            s({ type: "list", items: [
                "Componente reemplazado o reparado",
                "Ajustes de configuración realizados",
                "Pruebas de verificación post-reparación",
            ]}),
            s({ type: "h2", content: "5. Evidencias (Antes / Después)" }),
            s({ type: "text", content: "Adjunte fotografías del estado antes de la intervención y el resultado final de la reparación." }),
            s({ type: "h2", content: "6. Garantía del Trabajo" }),
            s({ type: "text", content: "Indique los términos de garantía aplicables al trabajo realizado y las condiciones que la invalidan." }),
            s({ type: "h2", content: "7. Recomendaciones Preventivas" }),
            s({ type: "text", content: "Sugiera acciones preventivas para evitar la recurrencia de la falla y mejorar el desempeño del equipo." }),
        ],
    },
    {
        id: "builtin-inspeccion",
        name: "Inspección / Diagnóstico",
        description: "Para reportes de inspección técnica sin intervención directa.",
        icon: "🔍",
        serviceTypes: ["INSPECCION", "VERIFICACION", "CHEQUEO_GENERAL", "LEVANTAMIENTO"],
        isBuiltIn: true,
        sections: [
            s({ type: "h1", content: "INFORME DE INSPECCIÓN TÉCNICA" }),
            s({ type: "divider" }),
            s({ type: "h2", content: "1. Alcance de la Inspección" }),
            s({ type: "text", content: "Defina el alcance y los objetivos de la inspección técnica realizada." }),
            s({ type: "h2", content: "2. Hallazgos por Área" }),
            s({ type: "text", content: "Describa los hallazgos encontrados en cada área o equipo inspeccionado. Organice por criticidad." }),
            s({ type: "h2", content: "3. Condiciones Críticas" }),
            s({ type: "list", items: [
                "Componentes en estado crítico que requieren atención inmediata",
                "Riesgos de seguridad identificados",
                "Fallas en proceso o inminentes",
            ]}),
            s({ type: "h2", content: "4. Evaluación General" }),
            s({ type: "text", content: "Proporcione una evaluación general del estado del sistema inspeccionado (Óptimo / Bueno / Regular / Crítico)." }),
            s({ type: "h2", content: "5. Recomendaciones Prioritarias" }),
            s({ type: "list", items: [
                "Prioridad ALTA: Acciones inmediatas requeridas",
                "Prioridad MEDIA: Acciones a realizar en próximas 2-4 semanas",
                "Prioridad BAJA: Acciones programables a mediano plazo",
            ]}),
            s({ type: "h2", content: "6. Presupuesto Estimado" }),
            s({ type: "text", content: "Indique si aplica un presupuesto estimado para las reparaciones o mejoras recomendadas." }),
        ],
    },
    {
        id: "builtin-blank",
        name: "Plantilla en Blanco",
        description: "Empieza con una hoja en blanco y construye tu propia estructura.",
        icon: "📄",
        isBuiltIn: true,
        sections: [
            s({ type: "h1", content: "TÍTULO DEL INFORME" }),
            s({ type: "divider" }),
            s({ type: "text", content: "Comienza a escribir aquí..." }),
        ],
    },
];

// ─────────────────────────────────────────────
// FIRESTORE CRUD  (custom templates)
// ─────────────────────────────────────────────

export async function getCustomTemplates(): Promise<ReportTemplate[]> {
    try {
        const q = query(collection(db, "reportTemplates"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReportTemplate));
    } catch {
        return [];
    }
}

export async function getAllTemplates(): Promise<ReportTemplate[]> {
    const custom = await getCustomTemplates();
    return [...BUILT_IN_TEMPLATES, ...custom];
}

export async function createTemplate(
    data: Omit<ReportTemplate, "id" | "createdAt" | "updatedAt" | "isBuiltIn">,
    userId: string
): Promise<ReportTemplate> {
    const docRef = await addDoc(collection(db, "reportTemplates"), {
        ...data,
        isBuiltIn: false,
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, ...data, isBuiltIn: false };
}

export async function updateTemplate(id: string, data: Partial<ReportTemplate>): Promise<void> {
    await updateDoc(doc(db, "reportTemplates", id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteTemplate(id: string): Promise<void> {
    await deleteDoc(doc(db, "reportTemplates", id));
}

// ─────────────────────────────────────────────
// Smart suggestion based on ticket service type
// ─────────────────────────────────────────────
export function suggestTemplate(serviceType?: string): ReportTemplate | undefined {
    if (!serviceType) return undefined;
    const upper = serviceType.toUpperCase();
    return BUILT_IN_TEMPLATES.find(t =>
        t.serviceTypes?.some(st => upper.includes(st))
    );
}
