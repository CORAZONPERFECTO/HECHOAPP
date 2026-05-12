const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.log("No .env.local found");
    process.exit(1);
}

const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    }
});

const privateKey = envVars.GCP_PRIVATE_KEY ? envVars.GCP_PRIVATE_KEY.replace(/\\n/g, "\n") : undefined;

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: envVars.GCP_CLIENT_EMAIL,
        privateKey: privateKey,
    })
});

async function nukeUser() {
    const email = 'gerenteticket01@hecho.do';
    
    console.log(`Buscando cualquier rastro del correo ${email}...`);
    try {
        // 1. Borrar de Auth (esto libera el correo)
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            await admin.auth().deleteUser(userRecord.uid);
            console.log("✅ Eliminado del sistema de contraseñas de Google (Auth).");
            
            // Si el UID en Firestore era el mismo que el de Auth
            await admin.firestore().collection('users').doc(userRecord.uid).delete();
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.log("No existía en Auth (el correo ya estaba libre).");
            } else {
                throw e;
            }
        }

        // 2. Borrar también el registro atascado de Firestore (el que tiene el ID raro)
        const uidAtascado = 'TCTvdLvo5gcuu16STeMLNZKln1u2';
        await admin.firestore().collection('users').doc(uidAtascado).delete();
        console.log("✅ Registro visual eliminado de la base de datos.");
        
        console.log("\n==============================================");
        console.log("🚀 ¡LISTO! El usuario ha sido fulminado por completo.");
        console.log("Ya puedes ir a la página web y crearlo desde cero.");
        console.log("==============================================\n");

    } catch (error) {
        console.error("Error al borrar:", error);
    }
}

nukeUser();
