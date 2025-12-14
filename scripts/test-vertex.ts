
import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs';
import path from 'path';

// Manual .env parser to avoid installing dotenv
const envPath = path.resolve(process.cwd(), '.env.local');
const env: Record<string, string> = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
        // Simple key-value parse, ignoring comments
        if (line.trim().startsWith('#') || !line.includes('=')) return;

        const firstEq = line.indexOf('=');
        const key = line.substring(0, firstEq).trim();
        let value = line.substring(firstEq + 1).trim();

        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    });
}

async function testVertex() {
    const projectId = env.GCP_PROJECT_ID;
    const clientEmail = env.GCP_CLIENT_EMAIL;
    // Unescape \\n to \n
    const privateKey = env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const location = env.GCP_LOCATION || 'us-central1';

    console.log('Testing Vertex AI Connection...');
    console.log('Project:', projectId);
    console.log('Email:', clientEmail);
    console.log('Key Length:', privateKey?.length);

    if (!projectId || !clientEmail || !privateKey) {
        console.error('❌ Missing credentials in .env.local');
        return;
    }

    try {
        const vertexAI = new VertexAI({
            project: projectId,
            location: location,
            googleAuthOptions: {
                credentials: {
                    client_email: clientEmail,
                    private_key: privateKey,
                }
            }
        });

        const modelsToTry = [
            'gemini-1.5-flash-001',
            'gemini-1.5-flash',
            'gemini-1.0-pro-001',
            'gemini-1.0-pro',
            'gemini-pro'
        ];

        for (const model of modelsToTry) {
            console.log(`\nTesting model: ${model}...`);
            try {
                const generativeModel = vertexAI.getGenerativeModel({ model });
                const result = await generativeModel.generateContent({
                    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
                });
                const response = await result.response;
                const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

                console.log(`✅ Success with ${model}! Response: ${text}`);
                return; // Exit on success
            } catch (e: any) {
                console.log(`❌ Failed with ${model}: ${e.message.split(' ').slice(0, 10).join(' ')}...`);
            }
        }
        console.error('\n❌ All models failed.');

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
    }
}

testVertex();
