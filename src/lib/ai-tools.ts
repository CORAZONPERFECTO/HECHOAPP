import { getProducts } from "./inventory-service";

/**
 * Searches the active products catalog in Firestore.
 * Filter is done locally on fetched active products for simplicity and flexibility.
 */
export async function searchInventoryTool(searchQuery: string) {
    try {
        console.log(`[AI Tool] Ejecutando searchInventory para query: "${searchQuery}"`);
        const products = await getProducts(true);
        const term = searchQuery.toLowerCase().trim();

        if (!term) {
            return { products: [] };
        }

        // Filter products matching the query in name, description, or category
        const matched = products.filter(p => {
            const nameMatch = p.name?.toLowerCase().includes(term);
            const descMatch = p.description?.toLowerCase().includes(term);
            const categoryMatch = p.category?.toLowerCase().includes(term);
            return nameMatch || descMatch || categoryMatch;
        });

        // Map and limit to essential fields for Gemini context window efficiency
        const results = matched.slice(0, 10).map(p => ({
            id: p.id,
            name: p.name,
            price: p.referencePrice || p.averageCost || 0,
            description: p.description || "",
            category: p.category || ""
        }));

        console.log(`[AI Tool] Encontrados ${results.length} productos coincidentes.`);
        return { products: results };
    } catch (error) {
        console.error("[AI Tool] Error en searchInventoryTool:", error);
        return { error: "No se pudo consultar el catálogo de inventario." };
    }
}
