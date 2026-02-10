
import { TicketReportNew } from "@/types/schema";

export async function generatePdfWithWorker(report: TicketReportNew, orgId: string = "default-org"): Promise<void> {
    const jobId = `pdf-${report.ticketId}-${Date.now()}`;
    const payload = {
        orgId: orgId,
        jobId: jobId,
        type: "GENERATE_PDF_REPORT",
        input: {
            report: report,
            ticket: {
                id: report.ticketId,
                ticketNumber: report.header.ticketNumber,
                clientName: report.header.clientName,
                locationName: report.header.address || "Dirección no especificada",
                assignedToName: report.header.technicianName,
                status: "GENERATED",
                description: "Informe Técnico"
            },
            org: {
                name: "HECHO SRL", // Should come from settings
                logoUrl: "https://hecho.blob.core.windows.net/public/logo.png" // Placeholder
            }
        }
    };

    console.log("🚀 Triggering PDF Worker Job:", jobId);

    try {
        // Use Internal Next.js API Proxy
        const res = await fetch("/api/jobs/pdf", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // specific headers if needed, but no auth to worker here (handled by proxy)
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Worker returned ${res.status}: ${err}`);
        }

        const data = await res.json();
        console.log("✅ Job Queued:", data);
        alert(`Generación iniciada en segundo plano (Job: ${data.jobId}).\nRevisa la consola del worker.`);

    } catch (error) {
        console.error("❌ PDF Worker Error:", error);
        alert("Error al conectar con el servidor de PDF. Asegúrate de que python-worker esté corriendo.\n\n" + error);
    }
}
