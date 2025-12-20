const admin = require('firebase-admin');
const { Storage: GoogleCloudStorage } = require('@google-cloud/storage');
const serviceAccountPath = './temp-sa.json'; // Ensure this matches your path
const serviceAccount = require(serviceAccountPath);

// 1. Sanitization Logic (Reused from seed-errors.ts)
console.log('Sanitizing private key...');
let keyBody = serviceAccount.private_key;
keyBody = keyBody.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '');
keyBody = keyBody.replace(/\\s/g, ''); // Remove whitespace
keyBody = keyBody.replace(/\\\\n/g, ''); // Remove literal \n
// Keep only valid base64 chars
keyBody = keyBody.replace(/[^a-zA-Z0-9+/=]/g, '');

// Rebuild PEM
const finalKey = `-----BEGIN PRIVATE KEY-----\n${keyBody.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`;
serviceAccount.private_key = finalKey;

// 2. Initialize Storage Client
const storage = new GoogleCloudStorage({
    projectId: serviceAccount.project_id,
    credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
    }
});

const bucketName = serviceAccount.project_id + '.appspot.com'; // Default Firebase bucket naming

async function configureCors() {
    console.log(`Configuring CORS for bucket: ${bucketName}...`);
    try {
        const bucket = storage.bucket(bucketName);

        await bucket.setCorsConfiguration([
            {
                maxAgeSeconds: 3600,
                method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
                origin: ['*'], // Allow all origins (simpler for dev/prod combo). Use specific domains for stricter security.
                responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable'],
            },
        ]);

        console.log('CORS configuration updated successfully!');

        // Verify
        const [metadata] = await bucket.getMetadata();
        console.log('New CORS Config:', JSON.stringify(metadata.cors, null, 2));

    } catch (error) {
        console.error('Error configuring CORS:', error);
    }
}

configureCors();
