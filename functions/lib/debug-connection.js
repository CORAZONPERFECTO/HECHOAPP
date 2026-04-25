"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const path = require("path");
// Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });
async function debug() {
    const baseUrl = process.env.ERPNEXT_URL;
    const apiKey = process.env.ERPNEXT_API_KEY;
    const apiSecret = process.env.ERPNEXT_API_SECRET;
    if (!baseUrl || !apiKey || !apiSecret) {
        console.error("Missing env vars");
        return;
    }
    const url = `${baseUrl}/api/resource/Customer?limit_page_length=1`;
    console.log("Fetching:", url);
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `token ${apiKey}:${apiSecret}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        });
        console.log("Status:", response.status, response.statusText);
        console.log("Content-Type:", response.headers.get("content-type"));
        const text = await response.text();
        console.log("Body Start:", text.substring(0, 500));
    }
    catch (e) {
        console.error("Fetch error:", e);
    }
}
debug();
//# sourceMappingURL=debug-connection.js.map