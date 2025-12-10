import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function exportToExcel(data: any[], fileName: string, sheetName: string = "Sheet1") {
    // 1. Convert standard JSON data to Worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 2. Create Workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 3. Generate buffer and download
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function formatInvoiceForExport(invoices: any[]) {
    return invoices.map(inv => ({
        "Número": inv.number,
        "Cliente": inv.clientName || "N/A",
        "RNC": inv.rnc || "N/A",
        "Fecha": inv.date?.seconds ? format(new Date(inv.date.seconds * 1000), "dd/MM/yyyy", { locale: es }) : "N/A",
        "Vencimiento": inv.dueDate?.seconds ? format(new Date(inv.dueDate.seconds * 1000), "dd/MM/yyyy", { locale: es }) : "N/A",
        "Subtotal": inv.subtotal,
        "ITBIS": inv.taxAmount,
        "Total": inv.total,
        "Estado": inv.status === "PAID" ? "Pagada" : inv.status === "PENDING" ? "Pendiente" : "Cancelada",
        "Notas": inv.notes || ""
    }));
}

export function formatPaymentForExport(payments: any[]) {
    return payments.map(pay => ({
        "Número": pay.number,
        "Cliente": pay.clientName,
        "Monto": pay.amount,
        "Método": pay.method,
        "Referencia": pay.reference || "N/A",
        "Fecha": pay.date?.seconds ? format(new Date(pay.date.seconds * 1000), "dd/MM/yyyy HH:mm", { locale: es }) : "N/A",
        "Factura Asociada": pay.invoiceNumber || "N/A"
    }));
}

export function formatClientForExport(clients: any[]) {
    return clients.map(client => ({
        "Nombre Comercial": client.nombreComercial,
        "RNC": client.rnc || "N/A",
        "Contacto": client.personaContacto,
        "Teléfono": client.telefonoContacto,
        "Email": client.emailContacto || "N/A",
        "Tipo": client.tipoCliente,
        "Dirección": client.direccion || "N/A"
    }));
}
