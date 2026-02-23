import * as dotenv from "dotenv";
import * as path from "path";

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Import service
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { erpNextService } = require("./erpnext/service");

async function checkRecentActivity() {
    console.log("🔍 Checking Recent ERPNext Activity...");

    try {
        // 1. Recent Invoices
        console.log("\n📄 Recent Sales Invoices (Last 5):");
        const invoices = await erpNextService.request("Sales Invoice?fields=[\"name\",\"customer\",\"posting_date\",\"grand_total\"]&order_by=creation desc&limit_page_length=5", "GET");

        if (invoices && invoices.length > 0) {
            invoices.forEach((inv: any) => {
                console.log(` - [${inv.name}] ${inv.customer} (${inv.posting_date}) - $${inv.grand_total}`);
            });
        } else {
            console.log("   (No invoices found)");
        }

        // 2. Recent Customers
        console.log("\nbusts Recent Customers (Last 5):");
        const customers = await erpNextService.request("Customer?fields=[\"name\",\"customer_name\",\"creation\"]&order_by=creation desc&limit_page_length=5", "GET");

        if (customers && customers.length > 0) {
            customers.forEach((cust: any) => {
                console.log(` - [${cust.name}] ${cust.customer_name} (Created: ${cust.creation.split(' ')[0]})`);
            });
        } else {
            console.log("   (No customers found)");
        }

    } catch (error) {
        console.error("❌ Failed to fetch activity:", error);
    }
}

checkRecentActivity();
