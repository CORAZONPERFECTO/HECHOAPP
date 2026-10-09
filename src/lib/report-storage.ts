import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { TicketReportNew, GallerySection, PhotoSection, BeforeAfterSection } from "@/types/schema";
import { cleanUndefined } from "@/lib/utils";

/**
 * Convierte cualquier Data URL (base64) o Blob URL a un Blob binario nativo.
 */
async function dataUrlToBlob(url: string): Promise<Blob> {
    const res = await fetch(url);
    return res.blob();
}

/**
 * Sube una imagen base64 o blob a Firebase Storage y retorna su URL pública permanente.
 */
export async function uploadBase64ToStorage(url: string, storagePath: string): Promise<string> {
    if (!url || (!url.startsWith('data:') && !url.startsWith('blob:'))) {
        return url;
    }

    try {
        const blob = await dataUrlToBlob(url);
        const storageRef = ref(storage, storagePath);
        const contentType = blob.type || (storagePath.endsWith('.png') ? 'image/png' : 'image/jpeg');
        const snapshot = await uploadBytes(storageRef, blob, { contentType });
        return await getDownloadURL(snapshot.ref);
    } catch (error) {
        console.error("Error subiendo media de reporte a Firebase Storage:", storagePath, error);
        return url;
    }
}

/**
 * Sube automáticamente todas las imágenes locales o base64 (anotaciones, firmas, subidas locales)
 * a Firebase Storage antes de guardar en Firestore, evitando exceder el límite de 1MB por documento.
 */
export async function persistReportWithMedia(
    report: TicketReportNew,
    ticketId: string
): Promise<TicketReportNew> {
    const effectiveTicketId = ticketId || report.ticketId;
    if (!effectiveTicketId) {
        throw new Error("ID de ticket no proporcionado");
    }

    // Copia profunda para no mutar inesperadamente
    const processedReport: TicketReportNew = JSON.parse(JSON.stringify(report));
    processedReport.ticketId = effectiveTicketId;

    if (!processedReport.sections || !Array.isArray(processedReport.sections)) {
        processedReport.sections = [];
    }

    const timestamp = Date.now();

    // 1. Procesar secciones con imágenes
    for (let i = 0; i < processedReport.sections.length; i++) {
        const section = processedReport.sections[i];

        if (section.type === 'photo') {
            const photoSec = section as PhotoSection;
            if (photoSec.photoUrl && (photoSec.photoUrl.startsWith('data:') || photoSec.photoUrl.startsWith('blob:'))) {
                const path = `tickets/${effectiveTicketId}/reports/photo_${section.id || i}_${timestamp}.jpg`;
                photoSec.photoUrl = await uploadBase64ToStorage(photoSec.photoUrl, path);
            }
        } else if (section.type === 'gallery') {
            const galSec = section as GallerySection;
            if (galSec.photos && Array.isArray(galSec.photos)) {
                for (let pIdx = 0; pIdx < galSec.photos.length; pIdx++) {
                    const photo = galSec.photos[pIdx];
                    if (photo.photoUrl && (photo.photoUrl.startsWith('data:') || photo.photoUrl.startsWith('blob:'))) {
                        const path = `tickets/${effectiveTicketId}/reports/gallery_${section.id || i}_${pIdx}_${timestamp}.jpg`;
                        photo.photoUrl = await uploadBase64ToStorage(photo.photoUrl, path);
                    }
                }
            }
        } else if (section.type === 'beforeAfter') {
            const baSec = section as BeforeAfterSection;
            if (baSec.beforePhotoUrl && (baSec.beforePhotoUrl.startsWith('data:') || baSec.beforePhotoUrl.startsWith('blob:'))) {
                const path = `tickets/${effectiveTicketId}/reports/ba_before_${section.id || i}_${timestamp}.jpg`;
                baSec.beforePhotoUrl = await uploadBase64ToStorage(baSec.beforePhotoUrl, path);
            }
            if (baSec.afterPhotoUrl && (baSec.afterPhotoUrl.startsWith('data:') || baSec.afterPhotoUrl.startsWith('blob:'))) {
                const path = `tickets/${effectiveTicketId}/reports/ba_after_${section.id || i}_${timestamp}.jpg`;
                baSec.afterPhotoUrl = await uploadBase64ToStorage(baSec.afterPhotoUrl, path);
            }
        }
    }

    // 2. Procesar firmas si son base64 (canvas draw)
    if (processedReport.signatures) {
        if (processedReport.signatures.technicianSignature?.startsWith('data:')) {
            const path = `tickets/${effectiveTicketId}/reports/sig_tech_${timestamp}.png`;
            processedReport.signatures.technicianSignature = await uploadBase64ToStorage(
                processedReport.signatures.technicianSignature,
                path
            );
        }
        if (processedReport.signatures.clientSignature?.startsWith('data:')) {
            const path = `tickets/${effectiveTicketId}/reports/sig_client_${timestamp}.png`;
            processedReport.signatures.clientSignature = await uploadBase64ToStorage(
                processedReport.signatures.clientSignature,
                path
            );
        }
    }

    // 3. Sanitizar undefined para Firestore
    const cleanedReport = cleanUndefined(processedReport);

    // 4. Guardar en Firestore
    await setDoc(doc(db, "ticketReports", effectiveTicketId), cleanedReport, { merge: true });

    return processedReport;
}
