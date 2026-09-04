# 🧠 HECHOAPP: Base de Conocimiento y Guía de Diagnóstico Rápido (Brain)

Este documento centraliza todas las lecciones aprendidas, patrones de solución rápida y diagnósticos de errores comunes para despliegues en **Vercel** y servicios de **Google Firebase / Firestore / Auth**.

---

## 📌 1. Ficha Técnica del Proyecto (Credenciales Maestras)

| Parámetro | Valor Oficial y Verificado | Ubicación / Uso |
|---|---|---|
| **Proyecto Firebase** | `hecho-srl-free` | Firebase Console / GCP |
| **API Key Pública** | `AIzaSyCZKE9ZRLhNJGxf-PNdbR6IjgMCl5xvkbA` | `src/lib/firebase.ts` (Cliente) |
| **Auth Domain** | `hecho-srl-free.firebaseapp.com` | Firebase Auth |
| **Storage Bucket** | `hecho-srl-free.firebasestorage.app` | Firebase Storage |
| **App ID** | `1:216623683956:web:7b7de0220203978c6db421` | Configuración Web |
| **Cuenta de Servicio** | `firebase-adminsdk-fbsvc@hecho-srl-free.iam.gserviceaccount.com` | `GCP_CLIENT_EMAIL` (Backend) |
| **Super Administrador**| `lcaa27@gmail.com` | Rol `ADMIN` en Firestore |
| **Dominios Autorizados**| `localhost`, `hechoapp.vercel.app`, `www.hechosrl.online`, `hechosrl.online` | Firebase Auth Settings |

---

## 🚨 2. Catálogo de Errores y Diagnóstico Inmediato

### Error 1: `auth/api-key-not-valid`
- **Síntoma:** Al intentar iniciar sesión en Vercel (Producción) con Google o correo, aparece `Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)`.
- **Causa Raíz:** En Next.js, las variables `process.env.NEXT_PUBLIC_*` se incrustan en el cliente **en tiempo de compilación**. Si Vercel no tiene la variable cargada o tiene comillas/espacios, el JavaScript del navegador recibe `undefined` o `""`.
- **Regla de Prevención:**
  En `src/lib/firebase.ts`, **nunca** depender únicamente de `process.env.NEXT_PUBLIC_FIREBASE_API_KEY`. Siempre fijar los valores oficiales del proyecto como constantes directas de respaldo.
  ```typescript
  const firebaseConfig = {
    apiKey: FIREBASE_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
    appId: FIREBASE_APP_ID,
    measurementId: FIREBASE_MEASUREMENT_ID
  };
  ```

---

### Error 2: `auth/unauthorized-domain`
- **Síntoma:** El login con Google falla o se cancela silenciosamente en producción (`https://hechoapp.vercel.app` o `https://www.hechosrl.online`).
- **Causa Raíz:** Firebase Auth bloquea por seguridad cualquier petición OAuth que provenga de un dominio que no esté en la lista blanca de la consola de Firebase.
- **Solución Rápida:**
  1. Ir a [Firebase Console](https://console.firebase.google.com/project/hecho-srl-free/authentication/settings).
  2. Pestaña **Ajustes** ➔ **Dominios autorizados**.
  3. Agregar `hechoapp.vercel.app`, `www.hechosrl.online` y `hechosrl.online`.

---

### Error 3: `NET::ERR_CERT_DATE_INVALID` (Certificado SSL)
- **Síntoma:** Al entrar a `https://www.hechosrl.online`, el navegador muestra "Su conexión no es privada".
- **Causa Raíz:** El certificado SSL de Let's Encrypt / Vercel para el dominio personalizado está pendiente de emisión o renovación DNS.
- **Acción Inmediata de Respaldo:**
  - Usar directamente el subdominio de Vercel: `https://hechoapp.vercel.app/login` (posee SSL automático wildcard `*.vercel.app` que nunca vence).
  - En Vercel: Ir a **Settings** ➔ **Domains** ➔ Hacer clic en **Refresh / Generate Certificate**.

---

### Error 4: Fallo en Server Actions con Firebase Admin (`GCP_PRIVATE_KEY`)
- **Síntoma:** Acciones de servidor (como `quick-auth.ts` o reseteo de contraseñas) fallan con `PEM_read_bio_PrivateKey` o `Invalid private key`.
- **Causa Raíz:** Vercel almacena los saltos de línea de la clave RSA como `\n` literales en lugar de caracteres de nueva línea.
- **Solución Obligatoria:**
  ```typescript
  const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  ```

---

### Error 5: Caché Persistente del Navegador / PWA Service Worker
- **Síntoma:** Se hace un despliegue con cambios en el código pero el navegador sigue mostrando el error anterior.
- **Causa Raíz:** La aplicación incluye un Service Worker (`public/sw.js`) para PWA que cachea los bundles de JavaScript.
- **Solución:**
  - Forzar recarga con omisión de caché: **`Ctrl + F5`** o **`Ctrl + Shift + R`**.
  - O abrir en ventana de incógnito (`Ctrl + Shift + N`).

---

## ⚡ 3. Checklist de Verificación para Todo Despliegue

Antes de dar por concluida una tarea de autenticación o despliegue:

1. [ ] **Verificar API Key con Identity Toolkit:**
   Ejecutar prueba de autenticación directa vía script de Node.
2. [ ] **Compilar localmente:**
   `npm run build` debe generar las **71 rutas** con 0 errores TypeScript.
3. [ ] **Hacer push a `master`:**
   `git push origin master` activa el webhook de Vercel automáticamente.
4. [ ] **Verificar Dominios Autorizados en Firebase Console.**
5. [ ] **Probar en navegador limpio (`Ctrl + F5`).**

---
*Documento mantenido y respaldado para HECHO SRL — Sistema Nexus.*
