import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(__dirname, '.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.log("No .env.local found");
    process.exit(1);
}

const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
});

const privateKey = envVars.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");
const projectId = envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: envVars.GCP_CLIENT_EMAIL,
        privateKey: privateKey,
    }),
    // El bucket por defecto siempre es tu-proyecto.appspot.com
    storageBucket: `${projectId}.appspot.com` 
});

async function testStorage() {
    try {
        console.log("Verificando estado de la cuota de Storage...");
        const bucket = admin.storage().bucket();
        const file = bucket.file('test-blaze-plan.txt');
        
        // Intentamos subir un archivo minúsculo. Si hay bloqueo de cuota, esto fallará.
        await file.save('Este es un archivo de prueba para verificar si el plan Blaze está activo.');
        
        console.log(" ");
        console.log("=========================================");
        console.log("✅ ¡ÉXITO! El archivo de prueba se subió.");
        console.log("✅ Tu proyecto ya NO tiene el bloqueo gratuito.");
        console.log("✅ ¡EL PLAN BLAZE ESTÁ ACTIVO Y FUNCIONANDO!");
        console.log("=========================================");
        console.log(" ");
        
        // Limpiamos la basura
        await file.delete();
    } catch (error: any) {
        console.log(" ");
        if (error.message && (error.message.includes("quota") || error.message.includes("exceeded"))) {
            console.error("❌ ERROR: El sistema sigue rechazando los archivos.");
            console.error("❌ Al parecer AÚN ESTÁS EN EL PLAN GRATUITO (Spark). Revisa si guardaste los cambios en Firebase.");
        } else {
            console.error("❌ ERROR de conexión:", error.message || error);
        }
        console.log(" ");
    }
}

testStorage();
