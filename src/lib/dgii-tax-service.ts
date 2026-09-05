import { Purchase } from "@/types/purchase";
import { Invoice } from "@/types/schema";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export interface Formato606Row {
    rncCedula: string;
    tipoId: "1" | "2" | "3"; // 1 RNC, 2 Cedula, 3 Pasaporte
    tipoBienesServicios: string; // 01 a 11
    ncf: string;
    ncfModificado?: string;
    fechaComprobante: string; // AAAAMMDD
    fechaPago: string; // AAAAMMDD
    montoServicios: number;
    montoBienes: number;
    totalFacturado: number;
    itbisFacturado: number;
    itbisRetenido: number;
    itbisSujetoProporcionalidad: number;
    itbisLlevadoCosto: number;
    itbisPorAdelantar: number;
    itbisPercibido: number;
    tipoRetencionIsr?: string;
    montoRetencionRenta: number;
    isrPercibido: number;
    isc: number;
    otrosImpuestos: number;
    propinaLegal: number;
    formaPago: string; // 01 Efectivo, 02 Cheque/Transf, 03 Tarjeta, 04 Credito
}

export interface Formato607Row {
    rncCedula: string;
    tipoId: "1" | "2" | "3";
    ncf: string;
    ncfModificado?: string;
    tipoIngreso: string; // 01 Operacionales, 02 Financieros, 03 Extraordinarios, 04 Arrendamientos, 05 Venta Activo, 06 Otros
    fechaComprobante: string; // AAAAMMDD
    fechaRetencion?: string;
    montoFacturado: number;
    itbisFacturado: number;
    itbisRetenidoTerceros: number;
    itbisPercibido: number;
    retencionRentaTerceros: number;
    isrPercibido: number;
    isc: number;
    otrosImpuestos: number;
    propinaLegal: number;
    montoEfectivo: number;
    montoChequeTransf: number;
    montoTarjeta: number;
    montoCredito: number;
}

export function cleanRnc(raw: string = ""): { rnc: string; tipoId: "1" | "2" | "3" } {
    const cleaned = raw.replace(/[^0-9]/g, "").trim();
    if (cleaned.length === 9) return { rnc: cleaned, tipoId: "1" };
    if (cleaned.length === 11) return { rnc: cleaned, tipoId: "2" };
    return { rnc: cleaned || "131947532", tipoId: "1" };
}

export function formatDateToAAAAMMDD(dateObj: any): string {
    if (!dateObj) return new Date().toISOString().slice(0, 10).replace(/-/g, "");
    try {
        const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}${mm}${dd}`;
    } catch {
        return new Date().toISOString().slice(0, 10).replace(/-/g, "");
    }
}

export function mapPaymentMethodToDgii(method: string = "CARD"): string {
    switch (method) {
        case "CASH": return "01";
        case "TRANSFER": return "02";
        case "CARD": return "03";
        default: return "02";
    }
}

export function buildFormato606(purchases: Purchase[], rncEmpresa: string = "131947532", periodo: string = ""): { txt: string; rows: Formato606Row[]; totalMonto: number; totalItbis: number } {
    const defaultPeriod = periodo || new Date().toISOString().slice(0, 7).replace("-", "");
    const rows: Formato606Row[] = [];
    let totalMonto = 0;
    let totalItbis = 0;

    purchases.forEach((p) => {
        const { rnc, tipoId } = cleanRnc(p.rnc || p.dgiiData?.rncEmisor || "000000000");
        const ncf = (p.eNcf || p.ncf || p.dgiiData?.eNcf || p.dgiiData?.ncf || "B0200000001").trim();
        const fecha = formatDateToAAAAMMDD(p.date || p.createdAt);
        
        const isEquipmentOrAsset = p.expenseType === "CAPEX_EQUIPO";
        const isServices = p.items?.some(i => i.description.toLowerCase().includes("servicio") || i.description.toLowerCase().includes("instalacion"));

        const tipoBienesServicios = isEquipmentOrAsset ? "10" : (isServices ? "02" : "09");
        const monto = Number(p.subtotal || p.total || 0);
        const itbis = Number(p.tax || 0);

        const montoServicios = isServices ? monto : 0;
        const montoBienes = !isServices ? monto : 0;

        totalMonto += Number(p.total || 0);
        totalItbis += itbis;

        rows.push({
            rncCedula: rnc,
            tipoId,
            tipoBienesServicios,
            ncf,
            ncfModificado: "",
            fechaComprobante: fecha,
            fechaPago: fecha,
            montoServicios,
            montoBienes,
            totalFacturado: Number(p.total || 0),
            itbisFacturado: itbis,
            itbisRetenido: p.dgiiData?.itbisWithheld || 0,
            itbisSujetoProporcionalidad: 0,
            itbisLlevadoCosto: 0,
            itbisPorAdelantar: itbis,
            itbisPercibido: 0,
            tipoRetencionIsr: "",
            montoRetencionRenta: p.dgiiData?.isrWithheld || 0,
            isrPercibido: 0,
            isc: 0,
            otrosImpuestos: 0,
            propinaLegal: 0,
            formaPago: mapPaymentMethodToDgii(p.paymentMethod)
        });
    });

    // Cabecera estándar DGII: 606|RNC|PERIODO(AAAAMM)|CANTIDAD_REGISTROS|TOTAL_MONTO
    const header = `606|${rncEmpresa}|${defaultPeriod}|${rows.length}|${totalMonto.toFixed(2)}`;
    
    // Lineas delimitadas por |
    const lines = rows.map(r => [
        r.rncCedula,
        r.tipoId,
        r.tipoBienesServicios,
        r.ncf,
        r.ncfModificado || "",
        r.fechaComprobante,
        r.fechaPago,
        r.montoServicios.toFixed(2),
        r.montoBienes.toFixed(2),
        r.totalFacturado.toFixed(2),
        r.itbisFacturado.toFixed(2),
        r.itbisRetenido.toFixed(2),
        r.itbisSujetoProporcionalidad.toFixed(2),
        r.itbisLlevadoCosto.toFixed(2),
        r.itbisPorAdelantar.toFixed(2),
        r.itbisPercibido.toFixed(2),
        r.tipoRetencionIsr || "",
        r.montoRetencionRenta.toFixed(2),
        r.isrPercibido.toFixed(2),
        r.isc.toFixed(2),
        r.otrosImpuestos.toFixed(2),
        r.propinaLegal.toFixed(2),
        r.formaPago
    ].join("|"));

    const txt = [header, ...lines].join("\r\n");

    return { txt, rows, totalMonto, totalItbis };
}

export function buildFormato607(invoices: Invoice[], rncEmpresa: string = "131947532", periodo: string = ""): { txt: string; rows: Formato607Row[]; totalMonto: number; totalItbis: number } {
    const defaultPeriod = periodo || new Date().toISOString().slice(0, 7).replace("-", "");
    const rows: Formato607Row[] = [];
    let totalMonto = 0;
    let totalItbis = 0;

    invoices.forEach(inv => {
        const { rnc, tipoId } = cleanRnc(inv.clientRnc || (inv as any).rnc || "000000000");
        const ncf = (inv.ncf || "B0100000001").trim();
        const fecha = formatDateToAAAAMMDD(inv.issueDate || inv.createdAt);
        const itbis = Number(inv.taxTotal || (inv as any).tax || 0);
        const total = Number(inv.total || 0);
        const payMethod = (inv as any).paymentMethod || "TRANSFER";

        totalMonto += total;
        totalItbis += itbis;

        rows.push({
            rncCedula: rnc,
            tipoId,
            ncf,
            ncfModificado: "",
            tipoIngreso: "01",
            fechaComprobante: fecha,
            fechaRetencion: "",
            montoFacturado: total,
            itbisFacturado: itbis,
            itbisRetenidoTerceros: 0,
            itbisPercibido: 0,
            retencionRentaTerceros: 0,
            isrPercibido: 0,
            isc: 0,
            otrosImpuestos: 0,
            propinaLegal: 0,
            montoEfectivo: payMethod === "CASH" ? total : 0,
            montoChequeTransf: payMethod === "TRANSFER" ? total : 0,
            montoTarjeta: payMethod === "CARD" ? total : 0,
            montoCredito: payMethod === "CREDIT" ? total : 0
        });
    });

    const header = `607|${rncEmpresa}|${defaultPeriod}|${rows.length}|${totalMonto.toFixed(2)}`;
    const lines = rows.map(r => [
        r.rncCedula,
        r.tipoId,
        r.ncf,
        r.ncfModificado || "",
        r.tipoIngreso,
        r.fechaComprobante,
        r.fechaRetencion || "",
        r.montoFacturado.toFixed(2),
        r.itbisFacturado.toFixed(2),
        r.itbisRetenidoTerceros.toFixed(2),
        r.itbisPercibido.toFixed(2),
        r.retencionRentaTerceros.toFixed(2),
        r.isrPercibido.toFixed(2),
        r.isc.toFixed(2),
        r.otrosImpuestos.toFixed(2),
        r.propinaLegal.toFixed(2),
        r.montoEfectivo.toFixed(2),
        r.montoChequeTransf.toFixed(2),
        r.montoTarjeta.toFixed(2),
        r.montoCredito.toFixed(2)
    ].join("|"));

    const txt = [header, ...lines].join("\r\n");

    return { txt, rows, totalMonto, totalItbis };
}

export function exportFormato606Txt(purchases: Purchase[], rnc: string = "131947532", periodo: string = "") {
    const { txt } = buildFormato606(purchases, rnc, periodo);
    const p = periodo || new Date().toISOString().slice(0, 7).replace("-", "");
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `606_${rnc}_${p}.txt`);
}

export function exportFormato606Excel(purchases: Purchase[], rnc: string = "131947532", periodo: string = "") {
    const { rows } = buildFormato606(purchases, rnc, periodo);
    const p = periodo || new Date().toISOString().slice(0, 7).replace("-", "");
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Formato 606");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Formato_606_${rnc}_${p}.xlsx`);
}

export function exportFormato607Txt(invoices: Invoice[], rnc: string = "131947532", periodo: string = "") {
    const { txt } = buildFormato607(invoices, rnc, periodo);
    const p = periodo || new Date().toISOString().slice(0, 7).replace("-", "");
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `607_${rnc}_${p}.txt`);
}

export function exportFormato607Excel(invoices: Invoice[], rnc: string = "131947532", periodo: string = "") {
    const { rows } = buildFormato607(invoices, rnc, periodo);
    const p = periodo || new Date().toISOString().slice(0, 7).replace("-", "");
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Formato 607");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Formato_607_${rnc}_${p}.xlsx`);
}
