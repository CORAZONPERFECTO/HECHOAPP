# 🛠️ HECHOAPP — Playbook de Desarrollo & Mostrador de Trabajo
> **Manual Operativo, Catálogo de Reglas y Caja de Herramientas para Pair-Programming con IA**

Bienvenido a tu **Mostrador de Trabajo (Dev Hub / Playbook)**. Este documento centraliza las reglas, convenciones, lógica de negocio y comandos rápidos que utilizamos para desarrollar, mantener y escalar **HECHOAPP**.

---

## 📋 1. Reglas de Trabajo Permanentes (Protocolo de 11 Pasos)

### Antes de implementar
1. **Explorar antes de codificar:** Revisar la estructura de carpetas, componentes y dependencias antes de escribir código.
2. **Respetar convenciones existentes:** Seguir la arquitectura establecida (Next.js App Router, Tailwind, Shadcn UI, Firebase).
3. **Supuestos explícitos:** Si un requerimiento es ambiguo, declarar la suposición razonable y avanzar sin bloquear.
4. **No duplicar:** Verificar si ya existe una función o componente antes de crear uno nuevo.
5. **No eliminar sin verificar:** Hacer búsqueda transversal (grep) para confirmar que nada usa lo que se planea borrar.

### Durante la implementación
6. **Cambios atómicos e incrementales:** Un commit por problema resuelto. Separar fixes, refactors y features.
7. **No hardcodear valores variables:** Textos de UI, timeouts, colores de marca y límites deben residir en constantes o configuración.
8. **Documentar decisiones no obvias:** Comentar el por qué técnico (ej: useRef para evitar race conditions en onSnapshot).

### Después de implementar
9. **Verificación obligatoria:** Ejecutar `npx tsc --noEmit` y `npm run build` antes de dar por concluida una tarea.
10. **Explicar con síntesis:** Resumen directo del qué y por qué, sin narrativas extensas.
11. **Señalar impacto cruzado:** Avisar previamente si un cambio toca múltiples módulos del sistema.

---

## ❄️ 2. Diccionario de Negocio & Lógica de Climatización (HVAC)

| Concepto | Regla Técnica en HECHOAPP |
| :--- | :--- |
| **Factor de Carga Térmica** | Factor base: `650 BTU / m²` para clima tropical República Dominicana. |
| **Capacidades Estándar** | `9,000 BTU (0.75 TR)`, `12,000 BTU (1.0 TR)`, `18,000 BTU (1.5 TR)`, `24,000 BTU (2.0 TR)`, `36,000 BTU (3.0 TR)`, `48,000 BTU (4.0 TR)`, `60,000 BTU (5.0 TR)`. |
| **Áreas Técnicas / Exteriores** | Zonas como *Techo / Condensadores*, *Tablero Eléctrico*, *Cuarto de Máquinas* **no llevan carga térmica de confort ni cálculo forzado de m²**. Se reportan como soportes/ubicación técnica. |
| **Medición Opcional** | Si el técnico no ingresa Largo x Ancho, el sistema **no asume 20 m²**. Permite seleccionar la capacidad BTU directamente o dejarlo como diseño visual. |
| **Almacenamiento de Fotos** | Se comprimen a JPEG y se suben a Firebase Storage (`/tickets/{id}/surveys/...`). Nunca se guardan base64 inline en Firestore para no superar el límite de 1MB por documento. |

---

## 🧰 3. Caja de Herramientas: Comandos y Prompts Rápidos

Cuando quieras pedirme tareas en el chat, puedes usar estas fórmulas directas:

### 🔹 Para Nuevas Funcionalidades
> "[Feature]: Diseña un nuevo flujo para [Módulo]. Sigue el Playbook de HECHOAPP. Revisa primero los componentes existentes."

### 🔹 Para Corregir Errores de Interfaz o Lógica
> "[Fix]: En la pantalla [X], el campo [Y] tiene este comportamiento inesperado: [Detalle]. Aplica la regla 1 y 9 del Playbook."

### 🔹 Para Generación de Reportes / PDF
> "[Reportes]: Ajusta la plantilla del servicio [LEVANTAMIENTO / MANTENIMIENTO] para que muestre [X información]. Asegura que en export-utils.ts se mantenga la regla de no renderizar placeholders vacíos."

### 🔹 Para Agregar una Nueva Regla al Mostrador
> "[Nueva Regla]: Agrega esta convención al Playbook: [Descripción]. Actualiza también el GEMINI.md global."

---

## 🏛️ 4. Registro de Decisiones de Arquitectura (ADR Resumido)

1. **Estado en Tiempo Real vs. Dirty State:**  
   En `src/app/tickets/[id]/page.tsx` y `ticket-survey-areas.tsx`, utilizamos `isDirtyRef` y `areasRef` para impedir que el listener `onSnapshot` de Firestore sobreescriba cambios locales mientras el usuario o técnico está subiendo fotos o editando.
2. **Editor de Informes Modular:**  
   El editor de informes utiliza un sidebar izquierdo vertical para inserción de bloques, manteniendo la barra de acciones fijada en la parte superior fuera del scroll container.
3. **Exportación de PDF Limpia:**  
   En `src/lib/export-utils.ts`, cualquier foto que carezca de URL HTTPS válida es filtrada automáticamente para evitar la generación de placeholders grises vacíos en el documento final.

---

## 🏡 5. Gestión de Clientes: Villas con Iguala vs. Servicios Eventuales

### A. Clasificación de la Visita / Cliente
- **Villa con Iguala (Cliente Igualado / Contrato Activo):**
  - Se activa el **Censo Técnico Completo de la Villa**: registro de ambientes (`surveyAreas`), capacidades BTU, marca, modelo, serial, refrigerante, y fotos de placa técnica y tarjeta.
  - Los datos de la villa **se heredan automáticamente** de visita en visita al crear tickets de mantenimiento preventivo.
  - El técnico visualiza directamente la lista de áreas de la villa y sube fotos organizadas por cada aire.
- **Servicio Eventual / Sin Iguala (Visita Puntual):**
  - No se realiza el levantamiento exhaustivo de placas ni se crean áreas persistentes, ya que no se tiene certeza de continuidad del servicio.
  - Se utiliza el flujo estándar de evidencias fotográficas generales (*Antes / Durante / Después*).

### B. Herramienta: "Bitácora Digital de la Villa" (Villa Care Pass)
- **Propósito:** Portal de transparencia y valor agregado para el propietario de la villa con iguala.
- **Alcance visible para el cliente:**
  1. **Lo que se hizo:** Historial de mantenimientos anteriores, fotos de trabajo y piezas atendidas.
  2. **Lo que se está haciendo:** Servicio actual en curso e informe final del día.
  3. **Lo que se va a hacer:** Próximo mantenimiento preventivo programado según calendario de iguala.
  4. **Ficha Técnica de Equipos:** Registro de inventario de aires con su tipo de gas y fotos de placa/tarjeta.

### C. Política de Retención y Depuración (Ventana de 3 Años)
- El historial fotográfico y técnico activo en la bitácora cubre **3 años**.
- **Regla de oro:** El sistema **NUNCA** borra datos automáticamente sin supervisión humana.
- Al cumplirse 3 años de una evidencia, el sistema genera una **notificación / alerta al Administrador**:
  > *"La Villa [Nombre] tiene registros fotográficos con más de 3 años de antigüedad. ¿Deseas mantenerlos en archivo histórico o liberar espacio de Firebase Storage?"*
- El Administrador tiene el control absoluto para decidir conservar o depurar.

---

## 🌌 6. Catálogo de Misiones & Versiones (Constelaciones de HECHOAPP)

Para coordinar el desarrollo con precisión, cada gran paquete de implementación lleva el nombre clave de una constelación o estrella:

| Misión / Constelación | Estado | Alcance & Módulos |
| :--- | :--- | :--- |
| **Misión ATLAS** | ✅ Completada | Playbook operativo, Editor de informes Split-View interactivo, corrección de BTU sin defaults forzados, censo técnico de placas/tarjetas y navegación GPS con fallback. |
| **Misión POLARIS** | 🚀 En Curso | **1.** Selector Villa con Iguala vs. Servicio Eventual.<br>**2.** Herencia automática de áreas y equipos censados entre visitas.<br>**3.** Pestaña de evidencias híbrida (por áreas para igualas, por fases antes/después para eventuales).<br>**4.** Plantilla de informe de Mantenimiento Multi-Área para Villas.<br>**5.** Arquitectura de la Bitácora Digital de la Villa (*Villa Care Pass*) con política de retención de 3 años. |
| **Misión ORIÓN** | 🔭 Planificada | Portal público/privado interactivo de la Villa para el propietario con historial cronológico, timeline de 3 años y vista 360° de sus unidades. |
| **Misión PHOENIX** | 🔭 Planificada | Automatización de alertas de vencimiento de contratos de iguala, mantenimiento recurrente y panel de depuración inteligente de almacenamiento. |


