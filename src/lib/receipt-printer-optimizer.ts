/**
 * Optimizes receipt and invoice images for printing with maximum ink saving.
 * Turns gray/dark backgrounds into pure white (#FFFFFF) and enhances text sharpness.
 */

export interface ReceiptProcessOptions {
    mode: 'bw_scanner' | 'enhanced_color' | 'original';
    threshold?: number; // 0 to 255, default ~140-160
    contrast?: number;  // 1.0 to 2.5
    brightness?: number; // -50 to 50
}

export async function processReceiptImage(
    imageSrc: string,
    options: ReceiptProcessOptions = { mode: 'bw_scanner', threshold: 145, contrast: 1.6, brightness: 15 }
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageSrc;

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(imageSrc);
                    return;
                }

                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;

                ctx.drawImage(img, 0, 0);

                if (options.mode === 'original') {
                    resolve(canvas.toDataURL('image/jpeg', 0.95));
                    return;
                }

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const threshold = options.threshold ?? 145;
                const contrast = options.contrast ?? 1.6;
                const brightness = options.brightness ?? 15;

                // Precompute contrast factor
                const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Standard Rec. 601 Luminance
                    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

                    if (options.mode === 'bw_scanner') {
                        // High-contrast document scanner:
                        // If luminance is above threshold (paper, surface, light), force to pure white #FFFFFF
                        // Otherwise, darken to pure/dark black
                        if (luminance > threshold) {
                            data[i] = 255;
                            data[i + 1] = 255;
                            data[i + 2] = 255;
                        } else {
                            // Dark text enhancement
                            const val = Math.max(0, Math.min(255, luminance * 0.6));
                            data[i] = val;
                            data[i + 1] = val;
                            data[i + 2] = val;
                        }
                    } else if (options.mode === 'enhanced_color') {
                        // Boost brightness of background to pure white while preserving ink colors
                        if (luminance > threshold + 15) {
                            data[i] = 255;
                            data[i + 1] = 255;
                            data[i + 2] = 255;
                        } else {
                            // Apply contrast to color pixels
                            data[i] = Math.max(0, Math.min(255, factor * (r - 128) + 128 + brightness));
                            data[i + 1] = Math.max(0, Math.min(255, factor * (g - 128) + 128 + brightness));
                            data[i + 2] = Math.max(0, Math.min(255, factor * (b - 128) + 128 + brightness));
                        }
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (err) {
                console.warn("Error processing receipt image (possibly CORS on canvas):", err);
                resolve(imageSrc);
            }
        };

        img.onerror = () => {
            resolve(imageSrc);
        };
    });
}
