"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.erpNextService = exports.ERPNextService = void 0;
class ERPNextService {
    constructor(config) {
        this.config = {
            baseUrl: (config === null || config === void 0 ? void 0 : config.baseUrl) || process.env.ERPNEXT_URL || "",
            apiKey: (config === null || config === void 0 ? void 0 : config.apiKey) || process.env.ERPNEXT_API_KEY || "",
            apiSecret: (config === null || config === void 0 ? void 0 : config.apiSecret) || process.env.ERPNEXT_API_SECRET || "",
        };
        if (!this.config.baseUrl) {
            console.warn("ERPNextService: Missing ERPNEXT_URL in environment.");
        }
    }
    get headers() {
        return {
            "Authorization": `token ${this.config.apiKey}:${this.config.apiSecret}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
        };
    }
    async request(endpoint, method = "GET", body) {
        if (!this.config.baseUrl)
            throw new Error("ERPNext URL is not configured.");
        const url = `${this.config.baseUrl}/api/resource/${endpoint}`;
        try {
            const response = await fetch(url, {
                method,
                headers: this.headers,
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!response.ok) {
                const errorText = await response.text();
                // Try parsing JSON error
                let errorDetails = errorText;
                try {
                    const jsonError = JSON.parse(errorText);
                    errorDetails = JSON.stringify(jsonError);
                }
                catch (e) { }
                throw new Error(`ERPNext Error (${response.status}) [${endpoint}]: ${errorDetails}`);
            }
            const json = await response.json();
            return json.data;
        }
        catch (error) {
            console.error(`ERPNext Request Failed [${method} ${endpoint}]:`, error);
            throw error;
        }
    }
    async createSalesInvoice(payload) {
        return this.request("Sales Invoice", "POST", payload);
    }
    async findCustomer(name) {
        // Safe URL encoding
        const filters = JSON.stringify([["name", "=", name]]);
        const endpoint = `Customer?filters=${encodeURIComponent(filters)}&fields=["name"]`;
        try {
            const results = await this.request(endpoint, "GET");
            if (results && results.length > 0) {
                return results[0].name;
            }
            return null;
        }
        catch (error) {
            // If 404 or other fetch error, return null to prompt creation (or handle strictly)
            console.warn("Error finding customer, assuming not found:", error);
            return null;
        }
    }
    async createCustomer(customer) {
        const result = await this.request("Customer", "POST", customer);
        return result.name;
    }
    async getCustomer(name) {
        try {
            return await this.request(`Customer/${encodeURIComponent(name)}`, "GET");
        }
        catch (e) {
            return null;
        }
    }
}
exports.ERPNextService = ERPNextService;
exports.erpNextService = new ERPNextService();
//# sourceMappingURL=service.js.map