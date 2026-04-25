"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.erpNextService = exports.ERPNextService = void 0;
// import * as functions from "firebase-functions";
const cache_1 = require("./cache");
class ERPNextService {
    constructor(config) {
        // Try config arg, then process.env, then functions.config()
        // const erpConfig = functions.config().erpnext || {};
        const erpConfig = {};
        this.config = {
            baseUrl: (config === null || config === void 0 ? void 0 : config.baseUrl) || process.env.ERPNEXT_URL || erpConfig.url || "",
            apiKey: (config === null || config === void 0 ? void 0 : config.apiKey) || process.env.ERPNEXT_API_KEY || erpConfig.api_key || "",
            apiSecret: (config === null || config === void 0 ? void 0 : config.apiSecret) || process.env.ERPNEXT_API_SECRET || erpConfig.api_secret || "",
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
        // Ensure no double slashes if baseUrl has trailing slash
        const baseUrl = this.config.baseUrl.endsWith('/') ? this.config.baseUrl.slice(0, -1) : this.config.baseUrl;
        const url = `${baseUrl}/api/resource/${endpoint}`;
        try {
            console.log(`ERPNext Request: ${method} ${url}`);
            const response = await fetch(url, {
                method,
                headers: this.headers,
                body: body ? JSON.stringify(body) : undefined,
                // Removed redirect: 'manual' to allow following redirects
            });
            if (!response.ok) {
                const errorText = await response.text();
                let errorDetails = errorText;
                try {
                    const jsonError = JSON.parse(errorText);
                    // Extract helpful error message from Frappe response 
                    // (often in _server_messages or exc)
                    if (jsonError._server_messages) {
                        const msgs = JSON.parse(jsonError._server_messages);
                        errorDetails = msgs.map((m) => JSON.parse(m).message).join(" | ");
                    }
                    else if (jsonError.exception) {
                        errorDetails = jsonError.exception;
                    }
                    else {
                        errorDetails = JSON.stringify(jsonError);
                    }
                }
                catch (e) { }
                throw new Error(`ERPNext Error (${response.status}) [${endpoint}]: ${errorDetails}`);
            }
            const text = await response.text();
            let json;
            try {
                json = JSON.parse(text);
            }
            catch (e) {
                throw new Error(`Failed to parse JSON response (${response.status}). Content: ${text.slice(0, 200)}...`);
            }
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
        const filters = JSON.stringify([["customer_name", "=", name]]);
        // Note: Searching by customer_name is safer than name (ID)
        const endpoint = `Customer?filters=${encodeURIComponent(filters)}&fields=["name"]`;
        const results = await this.request(endpoint, "GET");
        if (results && results.length > 0) {
            return results[0].name;
        }
        return null;
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
    async getItemPrice(itemCode, priceList = "Standard Selling") {
        var _a;
        try {
            // 1. Try cache first (all Item Prices are fetched together once and cached)
            const allPrices = await (0, cache_1.getCatalog)("item_prices", this);
            const match = allPrices.find((p) => p.item_code === itemCode);
            if (match)
                return (_a = match.price_list_rate) !== null && _a !== void 0 ? _a : 0;
            // 2. Cache had no match — fall back to direct ERPNext lookup
            console.warn(`Item price not in cache for "${itemCode}", fetching directly.`);
            const filters = JSON.stringify([["item_code", "=", itemCode], ["price_list", "=", priceList]]);
            const endpoint = `Item Price?filters=${encodeURIComponent(filters)}&fields=["price_list_rate"]&limit_page_length=1`;
            const results = await this.request(endpoint, "GET");
            if (results && results.length > 0)
                return results[0].price_list_rate;
            // 3. Final fallback: standard_rate from Item master
            const item = await this.request(`Item/${encodeURIComponent(itemCode)}`, "GET");
            return item.standard_rate || 0;
        }
        catch (error) {
            console.warn(`Failed to fetch price for ${itemCode}:`, error);
            return 0;
        }
    }
    /** Creates a Quotation draft in ERPNext. Returns the Quotation name (e.g. "SAL-QTN-2026-00001"). */
    async createQuotation(payload) {
        var _a;
        const body = Object.assign(Object.assign({}, payload), { quotation_to: (_a = payload.quotation_to) !== null && _a !== void 0 ? _a : "Customer", docstatus: 0 });
        return this.request("Quotation", "POST", body);
    }
    /** Ensures a customer exists in ERPNext. Creates it if not found. Returns the ERP customer name. */
    async ensureCustomer(params) {
        const existing = await this.findCustomer(params.name);
        if (existing)
            return existing;
        return this.createCustomer({
            name: params.name,
            customer_name: params.name,
            customer_type: "Company",
            customer_group: "Commercial",
            territory: "All Territories",
            tax_id: params.rnc,
            email_id: params.email,
        });
    }
}
exports.ERPNextService = ERPNextService;
exports.erpNextService = new ERPNextService();
//# sourceMappingURL=service.js.map