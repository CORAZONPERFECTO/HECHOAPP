
import dotenv from 'dotenv';
import { VertexAI } from '@google-cloud/vertexai';

dotenv.config({ path: '.env.local' });

const projectId = process.env.GCP_PROJECT_ID;
const clientEmail = process.env.GCP_CLIENT_EMAIL;
const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n');

async function verify() {
    console.log(`Verifying AI for project '${projectId}'...`);

    if (!projectId || !clientEmail || !privateKey) {
        console.error("Missing credentials in .env.local");
        process.exit(1);
    }

    // Robust cleaning
    const cleanKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '').trim();

    console.log("Key length:", cleanKey.length);
    console.log("Contains real newlines?", cleanKey.includes('\n'));
    console.log("Contains literal \\n?", cleanKey.includes('\\n'));
    console.log("First 30 chars:", cleanKey.substring(0, 30));

    try {
        const vertexAI = new VertexAI({
            project: projectId,
            location: 'us-central1',
            googleAuthOptions: {
                credentials: {
                    client_email: clientEmail,
                    private_key: cleanKey,
                }
            }
        });

        const model = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const res = await model.generateContent("Say 'System Operational'");
        const text = res.response.candidates?.[0].content.parts[0].text;

        console.log("\n--- RESULT ---");
        console.log("Response:", text);
        console.log("Status: SUCCESS");

    } catch (error: any) {
        console.error("\n--- FAILED ---");
        if (error.message) console.error(error.message);
        if (error.statusDetails) console.error(JSON.stringify(error.statusDetails, null, 2));
    }
}

verify();
