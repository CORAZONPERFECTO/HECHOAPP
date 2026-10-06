import { authFetch } from "@/lib/api-client";

/** Obtiene (creando si hace falta) el ID público de la villa para compartirlo con el propietario. */
export async function getVillaPublicCode(locationId: string, regenerate = false): Promise<string> {
    const res = await authFetch(`/api/villas/${locationId}/public-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
    });
    if (!res.ok) throw new Error("No se pudo generar el enlace público de la villa.");
    const data = await res.json();
    return data.publicCode as string;
}

/** URL pública del portal del propietario (Villa Care Pass). */
export async function getVillaShareUrl(locationId: string): Promise<string> {
    const code = await getVillaPublicCode(locationId);
    return `${window.location.origin}/villas/${code}`;
}
