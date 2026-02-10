# Guía de Despliegue (HECHOAPP)

Esta guía detalla los pasos para desplegar la aplicación en Vercel, asegurando que las variables de entorno y la configuración de PWA funcionen correctamente.

## 1. Variables de Entorno

### Configuración en Vercel
Al importar el proyecto en Vercel, debes agregar las siguientes variables en **Settings > Environment Variables**. Copia los valores desde tu archivo `.env.local` o usa los valores por defecto (ver `.env.example`).

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | API Key de Firebase Project |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de autenticación |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | URL de Realtime Database (opcional) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID (hecho-srl-free) |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket de Storage |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID para FCM |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Web App ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Analytics ID |

> **Nota Importante:** El código actual contiene valores "fallback" (por defecto) en `src/lib/firebase.ts` para facilitar el desarrollo local, pero se recomienda encarecidamente sobreescribirlos con variables de entorno en producción.

## 2. Configuración de Build (Next.js 16)

Debido a la integración de PWA (`next-pwa`) con Next.js 16, el comando de build ha sido ajustado para forzar el uso de Webpack en lugar de Turbopack.

- **Build Command**: `next build --webpack`
- **Install Command**: `npm install` (default)
- **Output Directory**: `.next` (default)

Asegúrate de que el `Build Command` en Vercel coincida con el script `build` en `package.json`.

## 3. PWA y Archivos Estáticos

El proceso de build genera automáticamente:
- `public/sw.js` (Service Worker)
- `public/workbox-*.js`

No es necesario subir estos archivos al repositorio (deben estar en `.gitignore`), ya que se regeneran en cada despliegue.

## 4. Verificación Post-Despliegue

1. Accede a la URL del despliegue.
2. Abre Developer Tools > Application > Service Workers. Verifica que el SW esté activo.
3. Prueba la funcionalidad Offline desactivando la red.
4. Verifica que los datos se carguen (Firestore Persistence).

## 5. Despliegue del Backend (Cloud Functions)

Las notificaciones y los triggers de IA residen en Firebase Cloud Functions. Debes desplegarlas por separado:

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

> **Nota:** Asegúrate de tener `firebase-tools` instalado y haber hecho login con `firebase login`.

---
Generado por Antigravity.
