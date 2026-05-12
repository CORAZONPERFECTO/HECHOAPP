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

if (!privateKey) {
    console.log("No se pudo leer la llave de Firebase.");
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: envVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: envVars.GCP_CLIENT_EMAIL,
        privateKey: privateKey,
    })
});

async function fixUser() {
    const uid = 'TCTvdLvo5gcuu16STeMLNZKln1u2';
    const email = 'gerenteticket01@hecho.do';
    const password = '8494493444';

    try {
        console.log("Verificando si el usuario existe en Firebase Auth...");
        try {
            await admin.auth().getUser(uid);
            console.log("El usuario ya existe. Actualizando contraseña...");
            await admin.auth().updateUser(uid, { password: password });
            console.log("✅ Contraseña actualizada con éxito a 8494493444.");
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                console.log("El usuario no existe en Auth. Creándolo ahora mismo...");
                await admin.auth().createUser({
                    uid: uid,
                    email: email,
                    password: password,
                    displayName: 'Gerente de Tiket 01'
                });
                console.log("✅ Usuario creado con éxito y vinculado a Firestore con clave 8494493444.");
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error("Error fatal:", error);
    }
}

fixUser();
