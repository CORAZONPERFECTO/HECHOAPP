# Guía de Configuración: Google Cloud Vertex AI

Para activar la inteligencia artificial en tu aplicación, sigue estos pasos:

## 1. Crear Proyecto y Habilitar API
1.  Ve a [Google Cloud Console](https://console.cloud.google.com/).
2.  Crea un **Nuevo Proyecto** (ej: `nexus-hecho-ai`).
3.  En la barra de búsqueda, escribe **"Vertex AI API"** y selecciónalo.
4.  Haz clic en **Habilitar** (Enable).

## 2. Crear Cuenta de Servicio (Service Account)
1.  Ve al menú **IAM y administración** -> **Cuentas de servicio**.
2.  Haz clic en **+ CREAR CUENTA DE SERVICIO**.
3.  Nombre: `vertex-ai-user` (o lo que prefieras).
4.  Haz clic en **Crear y Continuar**.
5.  **Rol:** Busca y selecciona **"Vertex AI User"** (Usuario de Vertex AI). Esto es crucial para tener permisos.
6.  Haz clic en **Listo**.

## 3. Generar la Llave (JSON Key)
1.  En la lista de cuentas de servicio, haz clic en los tres puntos (acciones) de la cuenta que acabas de crear -> **Administrar claves**.
2.  Haz clic en **AGREGAR CLAVE** -> **Crear clave nueva**.
3.  Tipo: **JSON** (ya seleccionado por defecto).
4.  Haz clic en **Crear**.
5.  Se descargará un archivo `.json` a tu computadora. **¡Guárdalo bien!**

## 4. Configurar tu Aplicación
Abre el archivo `.json` que descargaste con un editor de texto (Notepad, VS Code, etc.). Verás algo así:

```json
{
  "type": "service_account",
  "project_id": "nexus-hecho-ai-123",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANIg...\n-----END PRIVATE KEY-----\n",
  "client_email": "vertex-ai-user@nexus-hecho-ai.iam.gserviceaccount.com",
  ...
}
```

Copia esos valores y pégalos en tu archivo `.env.local` que ya he preparado para ti:

*   `GCP_PROJECT_ID` -> copia el valor de `project_id`
*   `GCP_CLIENT_EMAIL` -> copia el valor de `client_email`
*   `GCP_PRIVATE_KEY` -> copia el valor de `private_key` (TODO el texto largo, incluidas las comillas si es necesario, aunque en el .env usualmente va entre comillas dobles).

## 5. Ubicación (Opcional)
Si no tocaste nada, deja `GCP_LOCATION=us-central1`.

---
**¡Listo!** Reinicia tu servidor local (`npm run dev`) si es necesario para que tome los cambios, y prueba el botón mágico ✨.
