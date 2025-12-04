const XLSX = require('xlsx');
const path = require('path');

const services = [
    {
        servicio: "MANTENIMIENTO",
        descripcion_tecnica: "Limpieza profunda de filtros, paneles, blower y serpentín; revisión de presiones, amperaje, drenaje y estado general del equipo. Se corrigen obstrucciones menores y se deja el sistema funcionando en óptimas condiciones.",
        checklist: ""
    },
    {
        servicio: "INSTALACIÓN",
        descripcion_tecnica: "Montaje del equipo, fijación de unidad interior y exterior, instalación de tuberías, vacío, conexión eléctrica, carga según especificación y pruebas finales de funcionamiento.",
        checklist: ""
    },
    {
        servicio: "REPARACIÓN",
        descripcion_tecnica: "Identificación de falla, reemplazo o corrección de piezas defectuosas, pruebas de operación y confirmación de que el equipo quede estable y trabajando correctamente.",
        checklist: ""
    },
    {
        servicio: "LEVANTAMIENTO",
        descripcion_tecnica: "Medición del área, altura del techo y carga térmica; revisión de puntos eléctricos y drenajes; cálculo de distancia de tuberías hasta el condensador; verificación de espacios para unidades; identificación de obstáculos y registro fotográfico para cotización o instalación.",
        checklist: "Medir área y altura del techo, Revisar puntos eléctricos y drenaje, Calcular distancia de tuberías, Verificar espacio para unidades, Tomar fotos del área interior y exterior"
    },
    {
        servicio: "ARRANQUE_EQUIPOS",
        descripcion_tecnica: "Encendido inicial, verificación de presiones, calibración de controles, revisión de sensores y confirmación de que el equipo esté trabajando dentro de parámetros normales.",
        checklist: ""
    },
    {
        servicio: "VERIFICACIÓN",
        descripcion_tecnica: "Revisión de parámetros eléctricos y frigoríficos, comprobación de funcionamiento, búsqueda de ruidos anormales o vibraciones y validación del estado general.",
        checklist: ""
    },
    {
        servicio: "CHEQUEO_GENERAL",
        descripcion_tecnica: "Inspección completa del sistema: tuberías, presiones, ventiladores, tarjeta, sensores, drenaje, cableado y estructura. Se registran hallazgos para acciones correctivas.",
        checklist: ""
    },
    {
        servicio: "DESINSTALACIÓN",
        descripcion_tecnica: "Desconexión eléctrica, recuperación de gas si aplica, retiro de tuberías, desmonte de unidad interior y exterior, dejando todo ordenado y documentado con fotos.",
        checklist: ""
    },
    {
        servicio: "EMERGENCIA",
        descripcion_tecnica: "Atención inmediata para resolver una falla crítica. Diagnóstico rápido, corrección temporal o definitiva y reporte detallado de la causa del problema.",
        checklist: ""
    },
    {
        servicio: "PREVENTIVO",
        descripcion_tecnica: "Revisión general orientada a prevenir fallas: limpieza ligera, ajuste de conexiones, medición de parámetros y detección de piezas desgastadas.",
        checklist: ""
    },
    {
        servicio: "DIAGNÓSTICO",
        descripcion_tecnica: "Identificación de la causa raíz mediante pruebas eléctricas, mediciones de presiones, revisión de sensores, tarjeta y componentes mecánicos.",
        checklist: ""
    },
    {
        servicio: "INSPECCIÓN",
        descripcion_tecnica: "Verificación visual y funcional del equipo: estado físico, ruidos, vibraciones, funcionamiento básico y condiciones del entorno.",
        checklist: ""
    }
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(services);

// Set column widths
ws['!cols'] = [
    { wch: 20 }, // servicio
    { wch: 100 }, // descripcion_tecnica
    { wch: 50 }  // checklist
];

XLSX.utils.book_append_sheet(wb, ws, "Servicios");

const outputPath = path.resolve(__dirname, 'initial_services.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Excel file created at: ${outputPath}`);
