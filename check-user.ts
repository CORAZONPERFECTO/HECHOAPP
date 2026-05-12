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
            const userRecord = await admin.auth().getUser(uid);
            console.log("El usuario ya existe. Actualizando contraseña...");
            await admin.auth().updateUser(uid, { password });
            console.log("Contraseña actualizada con éxito.");
        } catch (err: any) {
            if (err.code === 'auth/user-not-found') {
                console.log("El usuario no existe en Auth. Creándolo ahora mismo...");
                await admin.auth().createUser({
                    uid,
                    email,
                    password,
                    displayName: 'Gerente de Tiket 01'
                });
                console.log("Usuario creado con éxito y vinculado a Firestore.");
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error("Error fatal:", error);
    }
}

fixUser();
