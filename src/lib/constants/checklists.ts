import { ServiceType, ChecklistItem } from "@/types/schema";

export const SERVICE_CHECKLISTS: Record<ServiceType, string[]> = {
    'MANTENIMIENTO': [
        "Inspección visual inicial del equipo y entorno",
        "Limpieza de filtros de aire y rejillas",
        "Limpieza de serpentines (evaporador y condensador)",
        "Verificación y limpieza de drenajes",
        "Revisión de conexiones eléctricas y apriete de terminales",
        "Medición de voltajes y amperajes de operación",
        "Verificación de presiones de refrigerante",
        "Lubricación de motores y rodamientos (si aplica)",
        "Prueba de funcionamiento en todos los modos",
        "Limpieza general del área de trabajo"
    ],
    'INSTALACION': [
        "Verificación del sitio de instalación y puntos de anclaje",
        "Montaje de unidad interior (evaporadora) a nivel",
        "Montaje de unidad exterior (condensadora) sobre bases",
        "Instalación y conexión de tuberías de refrigeración",
        "Conexión de cableado eléctrico y control",
        "Prueba de hermeticidad con nitrógeno (búsqueda de fugas)",
        "Evacuación del sistema (Vacío) a 500 micrones",
        "Apertura de válvulas y liberación de refrigerante",
        "Arranque inicial y medición de parámetros",
        "Explicación de uso al cliente"
    ],
    'REPARACION': [
        "Diagnóstico de la falla reportada por el cliente",
        "Aislamiento eléctrico del equipo para seguridad",
        "Identificación y desmontaje del componente dañado",
        "Instalación del repuesto nuevo original o compatible",
        "Revisión de componentes periféricos relacionados",
        "Pruebas de funcionamiento del componente reemplazado",
        "Verificación de ciclos de operación completos",
        "Medición de parámetros finales",
        "Limpieza del equipo tras la reparación"
    ],
    'LEVANTAMIENTO': [ // Mapped to INSPECCION or similar if LEVANTAMIENTO not in ServiceType, assuming new type needed or mapping to INSPECCION
        "Recopilación de datos del cliente y necesidades",
        "Medición del área a climatizar (m2 y altura)",
        "Identificación de cargas térmicas (ventanas, equipos, personas)",
        "Revisión de disponibilidad de suministro eléctrico",
        "Determinación de ubicación para unidades interior/exterior",
        "Cálculo de capacidad requerida (BTU/Ton)",
        "Estimación de materiales requeridos (tubería, cable, etc.)",
        "Toma de fotografías del sitio"
    ],
    'ARRANQUE_EQUIPOS': [ // Need to ensure this key exists in ServiceType or use generic
        "Verificación de instalación mecánica y eléctrica completa",
        "Comprobación de voltaje de suministro correcto",
        "Revisión de fases (en equipos trifásicos)",
        "Verificación de niveles de aceite (si aplica)",
        "Encendido de resistencia de cárter (precalentamiento)",
        "Arranque del equipo y monitoreo de ruidos/vibraciones",
        "Medición y registro de parámetros de operación (Bitácora)",
        "Ajuste de setpoints y configuración de termostato",
        "Capacitación básica al usuario"
    ],
    'VERIFICACION': [
        "Confirmar modelo del equipo",
        "Confirmar capacidad",
        "Revisar instalación",
        "Revisar tuberías",
        "Revisar comunicación eléctrica",
        "Medición de parámetros",
        "Determinar si el equipo opera en rango",
        "Informe al cliente"
    ],
    'CHEQUEO_GENERAL': [
        "Confirmar modelo y capacidad",
        "Revisar instalación y tuberías",
        "Revisar comunicación eléctrica",
        "Medición de parámetros",
        "Determinar rango de operación",
        "Foto de etiqueta",
        "Lista de hallazgos",
        "Recomendaciones numeradas"
    ],
    'DESINSTALACION': [
        "Revisar si hay refrigerante",
        "Recuperación",
        "Desmontaje seguro",
        "Tuberías selladas",
        "Limpieza del área",
        "Fotos antes y después"
    ],
    'EMERGENCIA': [
        "Diagnóstico inmediato",
        "Identificación del riesgo",
        "Medidas temporales",
        "Recomendaciones urgentes",
        "Cierre rápido"
    ],
    'PREVENTIVO': [
        "Revisiones programadas",
        "Hallazgos",
        "Recomendaciones"
    ],
    'DIAGNOSTICO': [
        "Preguntas clave al cliente",
        "Medición de parámetros",
        "Informe técnico"
    ],
    'INSPECCION': [
        "Fotos obligatorias",
        "Hallazgos detallados",
        "Informe exportable"
    ]
};

export function getChecklistForService(type: ServiceType): ChecklistItem[] {
    const items = SERVICE_CHECKLISTS[type] || [];
    return items.map((text, index) => ({
        id: `chk-${Date.now()}-${index}`,
        text,
        checked: false
    }));
}
