import JSZip from "jszip";
import { saveAs } from "file-saver";

interface AlbumPhoto {
    url: string;
    areaName?: string;
    tag?: string;
    date?: string;
}

/**
 * Descarga y comprime en un archivo .ZIP todas las fotos de una visita técnica o villa,
 * organizándolas automáticamente en carpetas por ambiente (ej. "Habitacion Master/antes.jpg").
 */
export async function downloadVisitAlbumZip({
    villaName,
    visitTitle,
    photos,
    onProgress,
}: {
    villaName: string;
    visitTitle: string;
    photos: AlbumPhoto[];
    onProgress?: (progress: number, statusText: string) => void;
}): Promise<void> {
    if (!photos || photos.length === 0) {
        throw new Error("No hay fotos para descargar en esta visita.");
    }

    const zip = new JSZip();
    const safeVillaName = (villaName || "Villa").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeVisitTitle = (visitTitle || "Visita").replace(/[^a-zA-Z0-9_-]/g, "_");
    const rootFolder = zip.folder(`${safeVillaName}_${safeVisitTitle}`) || zip;

    let completed = 0;
    const total = photos.length;

    for (let i = 0; i < photos.length; i++) {
        const item = photos[i];
        const areaFolder = (item.areaName || "General").replace(/[/\\?%*:|"<>]/g, "_").trim();
        const folder = rootFolder.folder(areaFolder) || rootFolder;

        const tag = (item.tag || "evidencia").replace(/[^a-zA-Z0-9_-]/g, "_");
        const fileName = `${String(i + 1).padStart(2, "0")}_${tag}.jpg`;

        if (onProgress) {
            onProgress(Math.round((completed / total) * 90), `Descargando ${i + 1}/${total}: ${areaFolder}...`);
        }

        try {
            // Intentar descargar imagen como blob
            const res = await fetch(item.url, { mode: "cors" });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const blob = await res.blob();
            folder.file(fileName, blob);
        } catch (err) {
            console.warn(`No se pudo descargar la imagen directa de ${item.url}, intentando fallback:`, err);
            // Intentar fallback si falla CORS
            try {
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(item.url)}`;
                const proxyRes = await fetch(proxyUrl);
                if (proxyRes.ok) {
                    const blob = await proxyRes.blob();
                    folder.file(fileName, blob);
                }
            } catch (proxyErr) {
                console.error(`Fallo definitivo al descargar foto ${item.url}:`, proxyErr);
            }
        }

        completed++;
    }

    if (onProgress) {
        onProgress(95, "Comprimiendo archivo ZIP...");
    }

    const content = await zip.generateAsync({ type: "blob" });
    const zipFilename = `Album_${safeVillaName}_${safeVisitTitle}.zip`;
    saveAs(content, zipFilename);

    if (onProgress) {
        onProgress(100, "¡Descarga completa!");
    }
}

/**
 * Genera la URL del código QR para el portal de la villa
 */
export function generateVillaQrUrl(locationId: string, origin?: string): string {
    const baseUrl = origin || (typeof window !== "undefined" ? window.location.origin : "");
    const targetUrl = `${baseUrl}/villas/${locationId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(targetUrl)}&format=svg`;
}
