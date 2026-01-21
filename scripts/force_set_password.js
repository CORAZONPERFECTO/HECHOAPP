const admin = require('firebase-admin');
const serviceAccountRaw = require('./temp-sa.json');

try {
    if (admin.apps.length === 0) {
        // Fix private key formatting (newlines and escaped slashes)
        const formattedKey = serviceAccountRaw.private_key
            .replace(/\\n/g, '\n')
            .replace(/\\\//g, '/');

        const serviceAccount = {
            projectId: serviceAccountRaw.project_id,
            clientEmail: serviceAccountRaw.client_email,
            privateKey: formattedKey
        };

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const email = 'lcaa27@gmail.com';
    const newPassword = 'temporaltemporal';

    console.log(`Setting password for ${email} to '${newPassword}'...`);

    admin.auth().updateUser('WOOeUiWxzkOy5sjFfcL3kl6B7893', { // UID from users.json export
        password: newPassword
    })
        .then((userRecord) => {
            console.log('PASSWORD_UPDATED_SUCCESSFULLY');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error updating user:', error);
            process.exit(1);
        });

} catch (e) {
    console.error('Script initialization error:', e);
    process.exit(1);
}
