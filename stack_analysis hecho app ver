# 🏗️ Stack Tecnológico de HECHOAPP

> Análisis basado en el código fuente actual — Mayo 2026

---

## 🎨 Modern Web Stack (Frontend)

```
Next.js 16 (App Router)  ←  El núcleo del proyecto
├── React 19              ←  La versión más nueva de React
├── TypeScript 5.9        ←  Tipado estricto en todo el proyecto
├── Tailwind CSS 3.4      ←  Estilos utility-first
├── shadcn/ui + Radix UI  ←  Componentes accesibles (Select, Dialog, Tabs, Toast...)
└── Lucide React          ←  Iconografía consistente
```

### ¿Qué hace especial este frontend?

| Característica | Tecnología | Archivo clave |
|---|---|---|
| **PWA (Offline)** | `@ducanh2912/next-pwa` + Workbox | `next.config.ts` |
| **Drag & Drop** | `@dnd-kit/core` + `@dnd-kit/sortable` | `page.tsx` (dashboard) |
| **Gráficas** | Recharts | `income-chart.tsx` |
| **Calendario** | `react-big-calendar` | Módulo agenda |
| **Formularios** | `react-hook-form` + Zod | Formularios validados |
| **Mapas** | Mapbox GL | Vista de ruta técnico |
| **Firma Digital** | `react-signature-canvas` | Cierre de tickets |
| **Exportación** | jsPDF + html2canvas + xlsx + docx | Reportes y facturas |
| **Estado Global** | Zustand 5 | Stores de app |

---

## ☁️ Serverless Stack (Backend sin servidor)

```
Google Firebase (hecho-srl-free)
├── 🔐 Firebase Auth      → Login/Logout, gestión de usuarios
├── 🗄️ Firestore          → Base de datos NoSQL en tiempo real
├── 📦 Firebase Storage   → Fotos de tickets (firebasestorage.googleapis.com)
├── ⚡ Cloud Functions v2 → Lógica de servidor (triggers automáticos)
└── 📡 FCM                → Notificaciones Push (planeadas)

Google Cloud Platform (GCP)
├── 🤖 Vertex AI          → Gemini 2.0 Flash (IA de reportes y cotizaciones)
└── 🗂️ Cloud Storage      → @google-cloud/storage (assets pesados)
```

### Cómo funciona el modelo Serverless

```
CLIENTE (Browser/PWA)
       │
       ▼
Next.js App Router (Vercel Edge)
       │
   ┌───┴────────────────────┐
   │                        │
   ▼                        ▼
Firebase SDK           Next.js API Routes
(Client-side)          /api/gemini → Vertex AI
       │               /api/jobs   → Background tasks
       ▼               /api/admin  → Firebase Admin SDK
Firestore Realtime
(onSnapshot listeners)
```

### Firebase Cloud Functions (en `/functions/src`)

| Función | Propósito |
|---|---|
| `tickets/` | Triggers automáticos al cambiar estado de tickets |
| `service-agent/` | Agente de servicio AI |
| `erpnext/triggers` | Integración con ERPNext (cotizaciones) |
| `erpnext/quotes` | Generación de cotizaciones desde ERP |
| `seed/` | Datos de prueba iniciales |
| `createAdminUser` | Crear usuario en Firebase Auth desde server |
| `refreshErpCache` | Limpia caché del catálogo ERP |

---

## 🔄 Flujo CI/CD Moderno

```
┌──────────────────────────────────────────┐
│           FLUJO DE DEPLOY                │
└──────────────────────────────────────────┘

  Tu PC (VS Code)
       │
       │  git add . && git commit && git push
       ▼
  GitHub (master branch)
  github.com/CORAZONPERFECTO/HECHOAPP
       │
       │  Push detectado → Webhook automático
       ▼
  ┌─────────────────────────────────┐
  │     VERCEL (CI automático)      │
  │                                 │
  │  1. npm install                 │
  │  2. next build --webpack        │
  │     (patch-exfat-build.js)      │
  │  3. PWA Service Worker generado │
  │  4. Deploy a Edge Network       │
  └─────────────────────────────────┘
       │
       ▼
  hechoapp.vercel.app ✅ LIVE

  ┌─────────────────────────────────┐
  │  FIREBASE (deploy manual)       │
  │                                 │
  │  firebase deploy --only         │
  │    functions                    │
  │    firestore:rules              │
  │    firestore:indexes            │
  └─────────────────────────────────┘
```

### Variables de Entorno por Capa

```
.env.local (Desarrollo)          Vercel Dashboard (Producción)
──────────────────────           ────────────────────────────
NEXT_PUBLIC_FIREBASE_*     →     NEXT_PUBLIC_FIREBASE_*
GCP_PROJECT_ID             →     GCP_PROJECT_ID
GCP_CLIENT_EMAIL           →     GCP_CLIENT_EMAIL
GCP_PRIVATE_KEY            →     GCP_PRIVATE_KEY
GCP_LOCATION               →     GCP_LOCATION
```

---

## 📱 PWA + Offline-First Architecture

```
Service Worker (Workbox)
├── Cache estratégico de rutas Next.js
├── Offline fallback para páginas
└── Background Sync (planeado)

IndexedDB (TechnicianOfflineDB)
├── Store: tickets        → Tickets guardados offline
├── Store: purchases      → Compras sin conexión
└── Sync Queue (localStorage) → Cola de operaciones pendientes

Firestore Offline Persistence (enableMultiTabIndexedDbPersistence)
└── Cache automático de Firestore en el browser
```

---

## 🔐 Seguridad y RBAC

```
Capa 1: Firebase Auth
└── Verifica identidad del usuario

Capa 2: Firestore Rules (⚠️ ADVERTENCIA)
└── allow read, write: if true;   ← MODO DEV (sin restricciones)
    → Necesita ser endurecido para producción

Capa 3: Next.js (page.tsx)
└── if (profile.rol === "TECNICO") router.push("/technician/my-day")
    → Redirige técnicos fuera del dashboard admin

Capa 4: UI (filtrado de módulos)
└── visibleModules.filter(m => m.role === 'ALL' || (!isTechnician && m.role === 'ADMIN'))
```

### Roles del Sistema

| Rol | Dashboard | Tickets | Técnicos | Reportes | Ingresos | Mi Día |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (emular) |
| `TECNICO` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (solo) |
| `CLIENTE` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (pendiente) |

---

## ⚠️ Puntos Críticos a Atender

> [!CAUTION]
> **Firestore Rules en modo abierto** — `allow read, write: if true` expone TODA la base de datos sin autenticación. Debe produccionalizarse con reglas por rol antes de agregar datos sensibles.

> [!WARNING]
> **`firebase-admin` está en `dependencies`** (no `devDependencies`) — Esto significa que el SDK de Admin se incluye en el bundle del cliente. Solo debe usarse en API Routes del servidor.

> [!NOTE]
> **`patch-exfat-build.js`** — Script especial que parchea el build de Next.js para funcionar desde unidades exFAT (tu disco externo). Necesario mientras desarrolles en la unidad F:\

---

## 📊 Resumen Visual del Stack

```
┌─────────────────────────────────────────────────────────┐
│                    HECHOAPP                             │
├─────────────────────────────────────────────────────────┤
│  PRESENTATION     │  Next.js 16 + React 19 + Tailwind   │
│  COMPONENTS       │  shadcn/ui + Radix UI + Lucide       │
│  STATE            │  Zustand 5 + React State             │
├─────────────────────────────────────────────────────────┤
│  API LAYER        │  Next.js API Routes (serverless)     │
│  AI               │  Vertex AI → Gemini 2.0 Flash        │
│  BACKGROUND       │  Firebase Cloud Functions v2         │
├─────────────────────────────────────────────────────────┤
│  DATABASE         │  Firestore (realtime + offline)      │
│  AUTH             │  Firebase Auth                       │
│  FILES            │  Firebase Storage                    │
├─────────────────────────────────────────────────────────┤
│  OFFLINE          │  PWA (Workbox) + IndexedDB           │
│  DEPLOY           │  Vercel (auto) + Firebase CLI        │
│  MONITORING       │  Firebase Analytics (opcional)       │
└─────────────────────────────────────────────────────────┘
```
