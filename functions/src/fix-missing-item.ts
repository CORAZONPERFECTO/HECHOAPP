import * as dotenv from "dotenv";
import * as path from "path";

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Import service
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { erpNextService } = require("./erpnext/service");

async function createServiceItem() {
    console.log("🛠️ Creating missing Item 'Servicio Técnico'...");

    const itemCode = "Servicio Técnico";

    try {
        // Check if exists
        try {
            const existing = await erpNextService.request(`Item/${encodeURIComponent(itemCode)}`, "GET");
            console.log(`✅ Item already exists: ${existing.name}`);
            return;
        } catch (e) {
            console.log("   Item not found. Proceeding to create...");
        }

        // Create Item
        const payloads = {
            item_code: itemCode,
            item_name: "Servicio Técnico General",
            item_group: "Services", // Standard group
            stock_uom: "Unit",
            is_stock_item: 0, // Service, not stock
            include_item_in_manufacturing: 0,
            is_sales_item: 1,
            is_purchase_item: 0,
            standard_rate: 1000 // Default price
        };

        // Note: 'Services' Item Group must exist. If not, we might fail again.
        // We'll try 'All Item Groups' or 'Products' if 'Services' fails, but 'Services' is standard.
        // Actually, let's try to fetch Item Groups first to be safe? No, let's try strict creation first.

        const result = await erpNextService.request("Item", "POST", payloads);
        console.log(`🎉 Item Created Successfully: ${result.name}`);

    } catch (error) {
        console.error("❌ Failed to create item:", error);
    }
}

createServiceItem();
