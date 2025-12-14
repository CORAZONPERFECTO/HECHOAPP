
import fs from 'fs';
import path from 'path';
import { VertexAI } from '@google-cloud/vertexai';
import { GoogleAuth } from 'google-auth-library';

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    });
}

async function main() {
    console.log("🔍 Verifying Vertex AI Configuration...");

    const projectId = process.env.GCP_PROJECT_ID;
    const clientEmail = process.env.GCP_CLIENT_EMAIL;
    const privateKey = process.env.GCP_PRIVATE_KEY;
    const location = process.env.GCP_LOCATION || 'us-central1';

    if (!projectId || !clientEmail || !privateKey) {
        console.error("❌ Missing credentials in .env.local");
        console.log(`GCP_PROJECT_ID: ${projectId ? 'OK' : 'MISSING'}`);
        console.log(`GCP_CLIENT_EMAIL: ${clientEmail ? 'OK' : 'MISSING'}`);
        console.log(`GCP_PRIVATE_KEY: ${privateKey ? 'OK' : 'MISSING'}`);
        process.exit(1);
    }

    console.log(`✅ Credentials found for project: ${projectId}`);
    // console.log(`   Email: ${clientEmail}`); // Privacy

    try {
        // Handle escaped newlines from .env if any
        const key = privateKey.replace(/\\n/g, '\n');


        // Debug Key (safe printing)
        console.log("Debug - Client Email:", clientEmail);
        console.log("Debug - Key Length:", key.length);
        console.log("Debug - Key Start:", JSON.stringify(key.substring(0, 30)));
        console.log("Debug - Key End:", JSON.stringify(key.substring(key.length - 30)));

        // Try simpler init first
        const vertexAI = new VertexAI({
            project: projectId,
            location: location,
            googleAuthOptions: {
                credentials: {
                    client_email: clientEmail,
                    private_key: key,
                },
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            }
        });


        // Try Generative Model again with exact knonw one
        const model = vertexAI.getGenerativeModel({
            model: 'gemini-1.5-flash-001',
        });


        console.log("📡 Sending test request to Gemini...");
        const result = await model.generateContent("Respond with exactly: Connection Successful");
        const response = result.response;
        const text = response.candidates?.[0].content.parts[0].text;

        console.log("🤖 AI Response:", text);
        console.log("✨ SUCCESS! Vertex AI is correctly configured.");

    } catch (error: any) {
        console.error("❌ Connection Failed:", error.message);
        if (error.message.includes("PEM")) {
            console.error("💡 Hint: There might be an issue with how the Private Key was copied. Check for extra spaces or missing newlines.");
        }
    }
}

main();
