/**
 * Compresses and resizes an image file.
 * @param file The original image file.
 * @param maxWidth The maximum width of the output image.
 * @param quality The quality of the output image (0 to 1).
 * @returns A Promise that resolves to the compressed Blob.
 */
export async function compressImage(file: File, maxWidth: number = 800, quality: number = 0.7): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Use the original file type or fallback to jpeg. Prefer png for transparency.
                const outputType = file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error("Compression failed"));
                        }
                    },
                    outputType,
                    quality
                );
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}
