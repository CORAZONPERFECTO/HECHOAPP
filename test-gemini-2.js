const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const apiKey = envConfig.GEMINI_API_KEY;

if (!apiKey) {
    console.error("No se encontró GEMINI_API_KEY en .env.local");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    console.log(`\nProbando modelo: ${modelName} ...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Dime 'Hola'");
        console.log(`✅ ÉXITO con ${modelName}:`, result.response.text());
    } catch (e) {
        console.error(`❌ ERROR con ${modelName}:`, e.message);
    }
}

async function runAll() {
    await testModel("gemini-1.5-pro");
    await testModel("gemini-1.5-flash-8b");
    await testModel("gemini-exp-1206");
    await testModel("learnlm-1.5-pro-experimental");
}

runAll();
