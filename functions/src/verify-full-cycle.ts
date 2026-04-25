import * as dotenv from "dotenv";
import * as path from "path";
// Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Import service
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { erpNextService } = require("./erpnext/service");

async function verifyCycle() {
    console.log("🚀 Iniciando prueba de ciclo completo (Lectura/Escritura)...");

    const testCustomerName = "Cliente De Prueba API";

    try {
        // 1. Check if exists
        console.log(`1️⃣ Buscando si existe '${testCustomerName}'...`);
        let existing = await erpNextService.findCustomer(testCustomerName);

        if (existing) {
            console.log(`⚠️ El cliente ya existe: ${existing}. No es necesario crear.`);
        } else {
            // 2. Create if not exists
            console.log(`2️⃣ Creando cliente '${testCustomerName}'...`);
            const payload = {
                name: testCustomerName, // This limits the ID in some setups, but 'customer_name' is the mandatory one usually
                customer_name: testCustomerName,
                customer_type: "Individual",
                customer_group: "Commercial", // Standard group usually available
                territory: "All Territories" // Standard territory
            };

            // Note: Adapting payload to likely defaults if specific ones fail
            // We'll try a minimal payload first
            const newCustomerName = await erpNextService.createCustomer(payload);
            console.log(`✅ Cliente creado con éxito: ${newCustomerName}`);
            existing = newCustomerName;
        }

        // 3. Verify again
        console.log(`3️⃣ Verificando lectura de '${testCustomerName}'...`);
        const found = await erpNextService.findCustomer(testCustomerName);

        if (found === existing) {
            console.log("🎉 ¡Prueba Exitosa! Lectura y Escritura confirmadas.");
        } else {
            console.error("❌ Algo falló. No se encontró el cliente recién creado/existente.");
        }

    } catch (error) {
        console.error("❌ Error durante la prueba:", error);
    }
}

verifyCycle();
