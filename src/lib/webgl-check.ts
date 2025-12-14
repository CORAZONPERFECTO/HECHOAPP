
/**
 * Checks if WebGL is supported by the current browser/device.
 * Attempts to create a WebGL context on a canvas element.
 */
export function isWebGLSupported(): boolean {
    try {
        const canvas = document.createElement('canvas');
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
    } catch (e) {
        console.error("WebGL Support Check Failed:", e);
        return false;
    }
}

export function logMapError(error: any) {
    const errorData = {
        message: error?.message || "Unknown Error",
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        webGLSupported: isWebGLSupported()
    };
    console.error("MAP_CRITICAL_ERROR:", errorData);
    // In a real app, you might send this to Sentry/LogRocket
}
