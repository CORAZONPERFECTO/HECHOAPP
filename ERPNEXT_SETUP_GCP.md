# Guía de Instalación: ERPNext en Google Cloud Platform (GCP)

Esta guía te permite instalar tu propio servidor de ERPNext utilizando la infraestructura de Google Cloud que ya tienes.

## Paso 1: Crear la Máquina Virtual
ERPNext requiere un servidor con al menos 4GB de RAM (preferiblemente 8GB) para funcionar fluido.

1.  Ve a [Google Cloud Console - Compute Engine](https://console.cloud.google.com/compute/instances).
2.  Haz clic en **"Crear instancia"**.
3.  **Configuración Recomendada**:
    *   **Nombre**: `erpnext-server`
    *   **Región**: `us-central1` (o la misma que usas para Firebase).
    *   **Tipo de máquina**: `e2-standard-2` (2 vCPU, 8 GB de memoria).
        *   *Nota: Puedes intentar con `e2-medium` (4GB), pero podría ser lento.*
    *   **Disco de arranque**:
        *   Haz clic en "Cambiar".
        *   Sistema Operativo: **Ubuntu**.
        *   Versión: **Ubuntu 22.04 LTS**.
        *   Tipo de disco: **SSD persistente equilibrado**.
        *   Tamaño: **40 GB**.
    *   **Firewall**: Marca las casillas **"Permitir tráfico HTTP"** y **"Permitir tráfico HTTPS"**.
4.  Haz clic en **"Crear"**.

## Paso 2: Conectarse e Instalar
Espera a que la máquina arranque (icono verde).

1.  En la lista de instancias, haz clic en el botón **SSH** (se abrirá una ventana de terminal en tu navegador).
2.  **Ejecuta estos comandos uno por uno** (copia y pega):

### 2.1 Preparar el Sistema
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-dev python3-setuptools python3-pip virtualenv git libffi-dev libssl-dev libmysqlclient-dev
```

### 2.2 Descargar e Instalar (Script Oficial)
Usaremos Docker para una instalación limpia y fácil de mantener.

```bash
# Instalar Git y Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Instalar Docker Compose
sudo apt-get install -y docker-compose-plugin

# Descargar Frappe Docker
git clone https://github.com/frappe/frappe_docker
cd frappe_docker

# Copiar configuración de ejemplo
cp env-example .env
```

### 2.3 Iniciar ERPNext
Este comando descargará e iniciará todo (puede tardar 5-10 minutos).

```bash
docker compose -f compose.yaml -f overrides/compose.erpnext.yaml -f overrides/compose.mariadb.yaml -f overrides/compose.redis.yaml up -d
```

## Paso 3: Acceder
1.  Vuelve a la consola de Google Cloud Compute Engine.
2.  Copia la **IP Externa** de tu máquina (ej: `34.123.45.67`).
3.  Pégala en tu navegador: `http://34.123.45.67`

¡Deberías ver la pantalla de inicio de sesión de ERPNext!
*   **Usuario por defecto**: `Administrator`
*   **Contraseña**: (Debes buscarla en los logs o configurarla. En Docker suele ser `admin` o la que aparezca en el archivo `.env`).

## Paso 4: Conectar con HECHOAPP
1.  Crea un Usuario API en ERPNext.
2.  Genera **API Key** y **API Secret**.
3.  Ve a tu proyecto HECHOAPP (`functions/.env`) y pon:
    ```ini
    ERPNEXT_URL=http://<TU_IP_EXTERNA>
    ERPNEXT_API_KEY=<TU_API_KEY>
    ERPNEXT_API_SECRET=<TU_API_SECRET>
    ```
