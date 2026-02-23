// import * as functions from "firebase-functions";

export interface ERPNextConfig {
    baseUrl: string;
    apiKey: string;
    apiSecret: string;
}

export interface ERPNextCustomer {
    name: string;
    customer_name: string;
    customer_type: "Company" | "Individual";
    customer_group: string;
    tax_id?: string; // RNC/Cedula
    email_id?: string;
    mobile_no?: string;
    territory?: string;
}

export interface SalesInvoiceItem {
    item_code: string;
    qty: number;
    rate: number;
    description?: string;
    uom?: string; // Unit of Measure
    conversion_factor?: number;
}

export interface SalesInvoicePayload {
    customer: string;
    posting_date: string;
    due_date: string;
    items: SalesInvoiceItem[];
    docstatus?: 0 | 1; // 0=Draft, 1=Submitted
    currency?: string;
    remarks?: string; // Notes
    po_no?: string; // Reference (e.g. Ticket Number)
}

export class ERPNextService {
    private config: ERPNextConfig;

    constructor(config?: Partial<ERPNextConfig>) {
        // Try config arg, then process.env, then functions.config()
        // const erpConfig = functions.config().erpnext || {};
        const erpConfig = {} as any;

        this.config = {
            baseUrl: config?.baseUrl || process.env.ERPNEXT_URL || erpConfig.url || "",
            apiKey: config?.apiKey || process.env.ERPNEXT_API_KEY || erpConfig.api_key || "",
            apiSecret: config?.apiSecret || process.env.ERPNEXT_API_SECRET || erpConfig.api_secret || "",
        };

        if (!this.config.baseUrl) {
            console.warn("ERPNextService: Missing ERPNEXT_URL in environment.");
        }
    }

    private get headers() {
        return {
            "Authorization": `token ${this.config.apiKey}:${this.config.apiSecret}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
        };
    }

    private async request<T>(endpoint: string, method: string = "GET", body?: any): Promise<T> {
        if (!this.config.baseUrl) throw new Error("ERPNext URL is not configured.");

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
                        errorDetails = msgs.map((m: any) => JSON.parse(m).message).join(" | ");
                    } else if (jsonError.exception) {
                        errorDetails = jsonError.exception;
                    } else {
                        errorDetails = JSON.stringify(jsonError);
                    }
                } catch (e) { }

                throw new Error(`ERPNext Error (${response.status}) [${endpoint}]: ${errorDetails}`);
            }

            const text = await response.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                throw new Error(`Failed to parse JSON response (${response.status}). Content: ${text.slice(0, 200)}...`);
            }
            return json.data;
        } catch (error) {
            console.error(`ERPNext Request Failed [${method} ${endpoint}]:`, error);
            throw error;
        }
    }

    async createSalesInvoice(payload: SalesInvoicePayload): Promise<any> {
        return this.request("Sales Invoice", "POST", payload);
    }

    async findCustomer(name: string): Promise<string | null> {
        // Safe URL encoding
        const filters = JSON.stringify([["customer_name", "=", name]]);
        // Note: Searching by customer_name is safer than name (ID)
        const endpoint = `Customer?filters=${encodeURIComponent(filters)}&fields=["name"]`;

        const results = await this.request<any[]>(endpoint, "GET");
        if (results && results.length > 0) {
            return results[0].name;
        }
        return null;
    }

    async createCustomer(customer: ERPNextCustomer): Promise<string> {
        const result = await this.request<{ name: string }>("Customer", "POST", customer);
        return result.name;
    }

    async getCustomer(name: string): Promise<ERPNextCustomer | null> {
        try {
            return await this.request<ERPNextCustomer>(`Customer/${encodeURIComponent(name)}`, "GET");
        } catch (e) {
            return null;
        }
    }

    async getItemPrice(itemCode: string, priceList: string = "Standard Selling"): Promise<number> {
        try {
            const filters = JSON.stringify([["item_code", "=", itemCode], ["price_list", "=", priceList]]);
            const endpoint = `Item Price?filters=${encodeURIComponent(filters)}&fields=["price_list_rate"]&limit_page_length=1`;
            const results = await this.request<any[]>(endpoint, "GET");

            if (results && results.length > 0) {
                return results[0].price_list_rate;
            }

            // Fallback: Get standard rate from Item master
            const item = await this.request<any>(`Item/${encodeURIComponent(itemCode)}`, "GET");
            return item.standard_rate || 0;

        } catch (error) {
            console.warn(`Failed to fetch price for ${itemCode}:`, error);
            return 0;
        }
    }
}

export const erpNextService = new ERPNextService();
