"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const path = require("path");
// Load .env from functions root
dotenv.config({ path: path.resolve(__dirname, "../.env") });
// Import service after env is loaded
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { erpNextService } = require("./erpnext/service");
async function testConnection() {
    console.log("Testing ERPNext Connection...");
    console.log("URL:", process.env.ERPNEXT_URL);
    try {
        console.log("Attempting to find customer 'Test Connection'...");
        // Attempts to find a customer. If connection works, it returns null or the name.
        // If auth fails, it throws.
        const customer = await erpNextService.findCustomer("Test Connection");
        console.log("✅ Connection Successful!");
        console.log("Result:", customer ? "Found" : "Not Found (Authorized)");
    }
    catch (error) {
        console.error("❌ Connection Failed:", error);
        process.exit(1);
    }
}
testConnection();
//# sourceMappingURL=test-connection.js.map