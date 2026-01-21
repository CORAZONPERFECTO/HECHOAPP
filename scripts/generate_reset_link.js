const admin = require('firebase-admin');
const serviceAccountRaw = require('./temp-sa.json');

try {
    if (admin.apps.length === 0) {
        // Fix private key formatting (newlines and escaped slashes)
        const formattedKey = serviceAccountRaw.private_key
            .replace(/\\n/g, '\n')
            .replace(/\\\//g, '/'); // Fix escaped slashes like \/ -> /

        console.log('DEBUG: Original Key snippet:', serviceAccountRaw.private_key.substring(0, 50));
        console.log('DEBUG: Formatted Key snippet:', formattedKey.substring(0, 50));
        console.log('DEBUG: Formatted Key has newline?', formattedKey.includes('\n'));

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

    console.log(`Generating password reset link for ${email}...`);

    admin.auth().generatePasswordResetLink(email)
        .then((link) => {
            console.log('LINK_GENERATED_SUCCESSFULLY');
            console.log(link);
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error generating link:', error);
            process.exit(1);
        });

} catch (e) {
    console.error('Script initialization error:', e);
    process.exit(1);
}
