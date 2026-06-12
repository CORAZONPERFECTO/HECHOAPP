export function getOrCreateDeviceId(): string {
    if (typeof window === "undefined") return "";
    
    let deviceId = localStorage.getItem("hecho_device_id");
    if (!deviceId) {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            deviceId = `dev_${crypto.randomUUID()}`;
        } else {
            // Fallback robusto en caso de que crypto.randomUUID no esté disponible
            deviceId = `dev_${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`;
        }
        localStorage.setItem("hecho_device_id", deviceId);
    }
    return deviceId;
}
