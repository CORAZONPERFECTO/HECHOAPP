const fs = require('fs');
let file = fs.readFileSync('D:/06_PROYECTOS_Y_DESARROLLO/HECHOAPP/src/app/api/gemini/route.ts', 'utf8');

file = file.replace(
  'const { prompt, context, task, image, imageUrl } = await req.json();',
  'const { prompt, context, task, image, imageUrl, imageUrls } = await req.json();'
);

file = file.replace(
  'if (!prompt && !context && !image && !imageUrl) {',
  'if (!prompt && !context && !image && !imageUrl && (!imageUrls || imageUrls.length === 0)) {'
);

const summarizeTask = `if (task === 'summarize-area') {
            systemInstruction += \`Tu tarea es analizar las notas previas y/o múltiples fotos de un área específica y generar un resumen técnico detallado.
Debes devolver un JSON con esta estructura exacta:
{
  "notes": "Un resumen abundante, detallado y profesional documentando las observaciones, el estado encontrado, las recomendaciones, y cualquier otro detalle técnico relevante a nivel general de esta área.",
  "photoDescriptions": [
    "Descripción técnica detallada y específica para la foto 1",
    "Descripción técnica detallada y específica para la foto 2"
  ]
}
Nota: El array de photoDescriptions debe tener exactamente la misma longitud y orden que las fotos enviadas. Devuelve SOLO JSON válido.\`;
        } else if (task === 'refine') {`;

file = file.replace("if (task === 'refine') {", summarizeTask);

file = file.replace(
  `if (['generate-report', 'parse-invoice', 'generate-quote', 'parse-ticket', 'extract-gauge-readings'].includes(task))`,
  `if (['generate-report', 'parse-invoice', 'generate-quote', 'parse-ticket', 'extract-gauge-readings', 'summarize-area'].includes(task))`
);

// We also need to process imageUrls
const imagesLogic = `
        if (imageUrl) {
            if (!isAllowedImageUrl(imageUrl)) {
                return NextResponse.json({ error: "URL de imagen no permitida." }, { status: 400 });
            }
            try {
                const imgRes = await fetch(imageUrl);
                const arrayBuffer = await imgRes.arrayBuffer();
                imageBase64 = Buffer.from(arrayBuffer).toString('base64');
            } catch (e) {
                console.error("Error fetching image URL:", e);
                // Continue without image or fail? Fail better.
                return NextResponse.json({ error: "Failed to download image from URL" }, { status: 400 });
            }
        }

        if (imageBase64) {
            // Expecting 'image' to be base64 string without data:image/xxx prefix preferably, or strip it
            const base64Data = imageBase64.replace(/^data:image\\/\\w+;base64,/, "");
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data
                }
            });
        }
        
        // Handle multiple images if provided
        if (imageUrls && imageUrls.length > 0) {
             for (const url of imageUrls) {
                  if (isAllowedImageUrl(url)) {
                       try {
                           const imgRes = await fetch(url);
                           const arrayBuffer = await imgRes.arrayBuffer();
                           const b64 = Buffer.from(arrayBuffer).toString('base64');
                           parts.push({
                                inlineData: {
                                    mimeType: "image/jpeg",
                                    data: b64
                                }
                           });
                       } catch(e) {
                           console.error("Error fetching one of imageUrls:", e);
                       }
                  }
             }
        }
`;

file = file.replace(`
        // If imageUrl provided, fetch it (solo desde hosts permitidos para evitar SSRF)
        if (imageUrl) {
            if (!isAllowedImageUrl(imageUrl)) {
                return NextResponse.json({ error: "URL de imagen no permitida." }, { status: 400 });
            }
            try {
                const imgRes = await fetch(imageUrl);
                const arrayBuffer = await imgRes.arrayBuffer();
                imageBase64 = Buffer.from(arrayBuffer).toString('base64');
            } catch (e) {
                console.error("Error fetching image URL:", e);
                // Continue without image or fail? Fail better.
                return NextResponse.json({ error: "Failed to download image from URL" }, { status: 400 });
            }
        }

        if (imageBase64) {
            // Expecting 'image' to be base64 string without data:image/xxx prefix preferably, or strip it
            const base64Data = imageBase64.replace(/^data:image\\/\\w+;base64,/, "");
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data
                }
            });
        }
`, imagesLogic);

fs.writeFileSync('D:/06_PROYECTOS_Y_DESARROLLO/HECHOAPP/src/app/api/gemini/route.ts', file, 'utf8');
