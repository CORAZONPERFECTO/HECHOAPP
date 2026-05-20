const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Manual .env.local parsing
const envPath = path.resolve(process.cwd(), '.env.local');
const env = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
        if (line.trim().startsWith('#') || !line.includes('=')) return;
        const firstEq = line.indexOf('=');
        const key = line.substring(0, firstEq).trim();
        let value = line.substring(firstEq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    });
}

const apiKey = env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("No API key found.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say hello");
        console.log(`✅ Success for ${modelName}:`, result.response.text());
        return true;
    } catch (e) {
        console.log(`❌ Failed for ${modelName}:`, e.message);
        return false;
    }
}

async function run() {
    const models = [
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash-lite",
        "gemini-3.1-flash-lite"
    ];
    for (const m of models) {
        await testModel(m);
    }
}

run();
