import * as XLSX from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Invoice } from "@/types/finance";
import { Payment } from "@/types/finance";
import { Client } from "@/types/users";

export function exportToExcel(data: Record<string, unknown>[], fileName: string, sheetName: string = "Sheet1") {
    // 1. Convert standard JSON data to Worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 2. Create Workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 3. Generate buffer and download
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function formatInvoiceForExport(invoices: Invoice[]) {
    return invoices.map(inv => ({
        "Número": inv.number,
        "Cliente": inv.clientName || "N/A",
        "RNC": inv.clientRnc || "N/A",
        "Fecha": inv.issueDate?.seconds ? format(new Date(inv.issueDate.seconds * 1000), "dd/MM/yyyy", { locale: es }) : "N/A",
        "Vencimiento": inv.dueDate?.seconds ? format(new Date(inv.dueDate.seconds * 1000), "dd/MM/yyyy", { locale: es }) : "N/A",
        "Subtotal": inv.subtotal,
        "ITBIS": inv.taxTotal,
        "Total": inv.total,
        "Estado": inv.status === "PAID" ? "Pagada" : inv.status === "CANCELLED" ? "Cancelada" : "Pendiente",
        "Notas": inv.notes || ""
    }));
}

export function formatPaymentForExport(payments: Payment[]) {
    return payments.map(pay => ({
        "Número": pay.number,
        "Cliente": pay.clientName,
        "Monto": pay.amount,
        "Método": pay.method,
        "Referencia": pay.reference || "N/A",
        "Fecha": pay.date?.seconds ? format(new Date(pay.date.seconds * 1000), "dd/MM/yyyy HH:mm", { locale: es }) : "N/A",
        "Factura Asociada": pay.invoiceId || "N/A"
    }));
}

export function formatClientForExport(clients: Client[]) {
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
