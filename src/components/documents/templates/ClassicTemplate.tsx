import React from 'react';
import { Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { DocumentData } from '@/lib/document-generator';
import { HECHO_LOGO_BASE64, HECHO_LOGO_JPG_BASE64, HECHO_SELLO_BASE64, HECHO_SELLO_JPG_BASE64, DEFAULT_COMPANY_DETAILS } from '@/lib/company-branding';

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 8,
        paddingTop: 24,
        paddingBottom: 24,
        paddingHorizontal: 28,
        lineHeight: 1.3,
        flexDirection: 'column',
        color: '#111827',
    },
    // Top Header
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        paddingBottom: 4,
    },
    companyInfo: {
        width: '60%',
    },
    companyName: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        color: '#000000',
        marginBottom: 1,
    },
    companySubtitle: {
        fontSize: 9.5,
        fontFamily: 'Helvetica-Bold',
        color: '#000000',
        marginBottom: 2,
    },
    companyTagline: {
        fontSize: 7.5,
        color: '#1f2937',
        marginBottom: 1.5,
    },
    companyRncAddress: {
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
        color: '#1f2937',
    },
    logoContainer: {
        width: '38%',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    logo: {
        width: 125,
        height: 42,
    },

    // Main Green Title Block
    titleBlock: {
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 12,
    },
    mainTitle: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        color: '#166534',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        textAlign: 'center',
        marginBottom: 4,
    },
    subTitle: {
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: '#15803d',
        textAlign: 'center',
        marginBottom: 4,
    },
    docNumber: {
        fontSize: 9.5,
        fontFamily: 'Helvetica-Bold',
        color: '#111827',
        textAlign: 'center',
        marginTop: 2,
        marginBottom: 8,
    },

    // Client & Meta Table (2 columns grid)
    metaTable: {
        borderWidth: 1,
        borderColor: '#9ca3af',
        borderRadius: 2,
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#d1d5db',
        minHeight: 17,
        alignItems: 'center',
    },
    metaRowLast: {
        flexDirection: 'row',
        minHeight: 17,
        alignItems: 'center',
    },
    metaColLabel: {
        width: '15%',
        paddingVertical: 2.5,
        paddingHorizontal: 5,
        fontFamily: 'Helvetica-Bold',
        fontSize: 7.5,
        color: '#111827',
        backgroundColor: '#f9fafb',
    },
    metaColValue: {
        width: '35%',
        paddingVertical: 2.5,
        paddingHorizontal: 5,
        fontSize: 7.5,
        color: '#111827',
        borderRightWidth: 1,
        borderRightColor: '#d1d5db',
    },
    metaColValueRight: {
        width: '35%',
        paddingVertical: 2.5,
        paddingHorizontal: 5,
        fontSize: 7.5,
        color: '#111827',
    },

    // Objeto Section
    sectionHeading: {
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: '#166534',
        textTransform: 'uppercase',
        marginTop: 3,
        marginBottom: 2,
    },
    objetoText: {
        fontSize: 7.5,
        color: '#1f2937',
        marginBottom: 6,
        lineHeight: 1.25,
    },

    // Items Table
    itemsTable: {
        borderWidth: 1,
        borderColor: '#166534',
        marginBottom: 6,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#166534',
        minHeight: 18,
        alignItems: 'center',
    },
    headerCell: {
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
        fontSize: 7.5,
        paddingVertical: 2.5,
        paddingHorizontal: 4,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        minHeight: 17,
        alignItems: 'center',
    },
    tableRowEven: {
        backgroundColor: '#fdfdfd',
    },
    cellNo: {
        width: '6%',
        textAlign: 'center',
        fontSize: 7.5,
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
        paddingVertical: 3,
    },
    cellDesc: {
        width: '54%',
        fontSize: 7.5,
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
        paddingVertical: 3,
        paddingHorizontal: 5,
    },
    cellQty: {
        width: '10%',
        textAlign: 'center',
        fontSize: 7.5,
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
        paddingVertical: 3,
    },
    cellPrice: {
        width: '15%',
        textAlign: 'right',
        fontSize: 7.5,
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
        paddingVertical: 3,
        paddingHorizontal: 5,
    },
    cellTotal: {
        width: '15%',
        textAlign: 'right',
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
        paddingVertical: 3,
        paddingHorizontal: 5,
    },

    // Totals Box
    totalsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 6,
    },
    totalsBox: {
        width: '40%',
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    totalLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2.5,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    totalLineGrand: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3.5,
        paddingHorizontal: 6,
        backgroundColor: '#f0fdf4',
    },
    totalLabel: {
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
        color: '#374151',
    },
    totalValue: {
        fontSize: 7.5,
        color: '#111827',
    },
    grandTotalLabel: {
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        color: '#166534',
    },
    grandTotalValue: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#166534',
    },

    // Notas Importantes
    notesContainer: {
        marginTop: 2,
        marginBottom: 6,
    },
    noteItem: {
        fontSize: 7.2,
        color: '#374151',
        marginBottom: 1.5,
        lineHeight: 1.2,
    },

    // Datos de Pago Banner
    paymentBanner: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingVertical: 3,
        paddingHorizontal: 6,
        marginVertical: 4,
        textAlign: 'center',
    },
    paymentText: {
        fontSize: 6.8,
        fontFamily: 'Helvetica-Bold',
        color: '#1e293b',
        textAlign: 'center',
    },

    // Signatures
    signaturesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 6,
        marginBottom: 6,
        paddingHorizontal: 20,
    },
    signatureBlockLeft: {
        width: '45%',
        alignItems: 'center',
    },
    signatureBlockRight: {
        width: '45%',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    signatureHeader: {
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
        color: '#1f2937',
        marginBottom: 4,
        textAlign: 'center',
    },
    signatureLine: {
        width: '80%',
        borderBottomWidth: 1,
        borderBottomColor: '#4b5563',
        marginBottom: 4,
        marginTop: 22,
    },
    signName: {
        fontSize: 7.8,
        fontFamily: 'Helvetica-Bold',
        color: '#111827',
    },
    signRole: {
        fontSize: 7,
        color: '#4b5563',
    },
    signCompany: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#166534',
    },
    selloImage: {
        width: 110,
        height: 55,
        backgroundColor: '#ffffff',
    },

    // Footer
    pageFooter: {
        marginTop: 'auto',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 3,
        textAlign: 'center',
    },
    footerCompanyLine: {
        fontSize: 6.5,
        fontFamily: 'Helvetica-Bold',
        color: '#4b5563',
        textAlign: 'center',
        marginBottom: 1,
    },
    footerDisclaimer: {
        fontSize: 6,
        fontStyle: 'italic',
        color: '#9ca3af',
        textAlign: 'center',
    },

    // Watermark overlay for internal documents
    watermarkContainer: {
        position: 'absolute',
        top: 250,
        left: 20,
        right: 20,
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'rotate(-35deg)',
        opacity: 0.08,
        zIndex: 10,
    },
    watermarkText: {
        fontSize: 32,
        fontFamily: 'Helvetica-Bold',
        color: '#dc2626',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    internalNoticeBadge: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fca5a5',
        borderRadius: 3,
        paddingVertical: 3,
        paddingHorizontal: 6,
        marginBottom: 6,
        textAlign: 'center',
    },
    internalNoticeText: {
        color: '#991b1b',
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
    },
});

interface Props {
    data: DocumentData;
}

export const ClassicTemplate: React.FC<Props> = ({ data }) => {
    const isUSD = data.currency === 'USD';
    const currencyPrefix = isUSD ? 'US$' : 'RD$';

    const formatNumber = (amount: number) => {
        return (amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatDateSpanish = (d: Date) => {
        try {
            return new Intl.DateTimeFormat('es-DO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).format(d);
        } catch {
            return d.toLocaleDateString();
        }
    };

    let docTitle = 'PRESUPUESTO';
    let displaySubtitle = '';
    const clientName = data.client.name || 'Cliente General';
    const clientLocation = data.client.address || 'Punta Cana, Rep. Dominicana';
    const formattedDate = formatDateSpanish(data.date || new Date());

    if (data.type === 'FACTURA PROFORMA') {
        docTitle = 'FACTURA PROFORMA';
        displaySubtitle = 'Comprobante Comercial Proforma';
    } else if (data.type === 'ORDEN DE COMPRA') {
        docTitle = 'ORDEN DE COMPRA';
        displaySubtitle = 'Documento Oficial de Adquisición y Suministro';
    } else if (data.type === 'FACTURA') {
        docTitle = 'FACTURA DE VENTA';
        displaySubtitle = 'Comprobante Fiscal de Venta';
    } else if (data.type === 'PRESUPUESTO INTERNO' || data.isInternalOnly) {
        docTitle = 'PRESUPUESTO INTERNO DE COSTOS';
        displaySubtitle = 'DOCUMENTO PRIVADO Y CONFIDENCIAL — DESGLOSE DE COSTOS DIRECTOS E INDIRECTOS';
    } else if (data.type === 'COTIZACIÓN') {
        docTitle = 'PRESUPUESTO';
        if (data.items.length === 1) {
            displaySubtitle = data.items[0].description.length > 55
                ? data.items[0].description.slice(0, 52) + '...'
                : data.items[0].description;
        } else if (data.items.length > 1) {
            displaySubtitle = 'Mantenimientos y Servicios Técnicos Especializados';
        }
    } else {
        docTitle = data.type;
        displaySubtitle = data.items.length > 0 ? data.items[0].description.slice(0, 50) : '';
    }

    const logoSrc = HECHO_LOGO_JPG_BASE64;
    const stampSrc = HECHO_SELLO_JPG_BASE64;

    // Dynamic payment terms display in metadata box
    const paymentTermsDisplay = data.terms && data.terms.trim()
        ? data.terms.split('.')[0]
        : '100% al confirmar';

    // Dynamically build notes list reflecting the user's customized terms and notes
    const dynamicNotes: string[] = [];
    
    if (data.notes && data.notes.trim()) {
        const rawLines = data.notes.split(/\n|\.(?=\s[A-Z])/).map(l => l.trim()).filter(Boolean);
        rawLines.forEach(line => {
            const clean = line.replace(/^\d+[\.\)]\s*/, '');
            if (clean) {
                dynamicNotes.push(clean.endsWith('.') ? clean : `${clean}.`);
            }
        });
    } else {
        dynamicNotes.push(`Alcance: ${data.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}.`);
        dynamicNotes.push('Garantía: 30 días de garantía en mano de obra y servicios técnicos realizados.');
    }

    // Add tax note
    dynamicNotes.push(data.taxTotal > 0 
        ? 'ITBIS: Los precios incluyen el 18% de ITBIS de ley.' 
        : 'ITBIS: Los precios no incluyen ITBIS (aplica al facturar formalmente).'
    );

    // Add terms note
    if (data.terms && data.terms.trim()) {
        const termsClean = data.terms.trim();
        dynamicNotes.push(`Condiciones de pago y entrega: ${termsClean.endsWith('.') ? termsClean : termsClean + '.'}`);
    } else {
        dynamicNotes.push('Forma de pago: 100% al confirmar el servicio.');
        dynamicNotes.push('Validez: Esta cotización tiene una validez de 15 días a partir de la fecha de emisión.');
    }

    return (
        <Page size="LETTER" style={styles.page}>
            {/* Watermark for internal documents */}
            {data.isInternalOnly && (
                <View style={styles.watermarkContainer} fixed>
                    <Text style={styles.watermarkText}>
                        {data.watermarkText || 'DOCUMENTO INTERNO — NO ENVIAR AL CLIENTE'}
                    </Text>
                </View>
            )}

            {/* Header: Left Company Info | Right HECHO Logo */}
            <View style={styles.headerContainer}>
                <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>{data.company.name || DEFAULT_COMPANY_DETAILS.name}</Text>
                    <Text style={styles.companySubtitle}>{DEFAULT_COMPANY_DETAILS.subtitle}</Text>
                    <Text style={styles.companyTagline}>{DEFAULT_COMPANY_DETAILS.tagline}</Text>
                    <Text style={styles.companyRncAddress}>
                        RNC: {data.company.rnc || DEFAULT_COMPANY_DETAILS.rnc} | {data.company.address || DEFAULT_COMPANY_DETAILS.address}
                    </Text>
                </View>
                <View style={styles.logoContainer}>
                    <Image src={logoSrc} style={styles.logo} />
                </View>
            </View>

            {data.isInternalOnly && (
                <View style={styles.internalNoticeBadge}>
                    <Text style={styles.internalNoticeText}>
                        CONFIDENCIAL — USO EXCLUSIVO ADMINISTRACIÓN Y GERENCIA HECHO SRL
                    </Text>
                </View>
            )}

            {/* Title & Document Meta with generous vertical spacing */}
            <View style={styles.titleBlock}>
                <Text style={styles.mainTitle}>{docTitle}</Text>
                {displaySubtitle ? <Text style={styles.subTitle}>{displaySubtitle}</Text> : null}
                <Text style={styles.docNumber}>No. {data.number}</Text>
            </View>

            {/* 2-Column Metadata Grid */}
            <View style={styles.metaTable}>
                <View style={styles.metaRow}>
                    <Text style={styles.metaColLabel}>Cliente:</Text>
                    <Text style={styles.metaColValue}>{clientName}</Text>
                    <Text style={styles.metaColLabel}>Fecha:</Text>
                    <Text style={styles.metaColValueRight}>{formattedDate}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Text style={styles.metaColLabel}>Ubicación:</Text>
                    <Text style={styles.metaColValue}>{clientLocation}</Text>
                    <Text style={styles.metaColLabel}>Pago:</Text>
                    <Text style={styles.metaColValueRight}>{paymentTermsDisplay}</Text>
                </View>
                <View style={styles.metaRowLast}>
                    <Text style={styles.metaColLabel}>Validez:</Text>
                    <Text style={styles.metaColValue}>15 días</Text>
                    <Text style={styles.metaColLabel}>Entrega:</Text>
                    <Text style={styles.metaColValueRight}>Coordinar con cliente</Text>
                </View>
            </View>

            {/* OBJETO DEL PRESUPUESTO */}
            <View>
                <Text style={styles.sectionHeading}>OBJETO DEL {docTitle}</Text>
                <Text style={styles.objetoText}>
                    {data.items.map(item => `${item.quantity} ${item.description}`).join('. ')}. Servicios ejecutados por técnicos especializados con garantía de calidad.
                </Text>
            </View>

            {/* Items Table */}
            <View style={styles.itemsTable}>
                <View style={styles.tableHeaderRow}>
                    <Text style={[styles.headerCell, { width: '6%', textAlign: 'center' }]}>No.</Text>
                    <Text style={[styles.headerCell, { width: '54%' }]}>Descripción del Servicio</Text>
                    <Text style={[styles.headerCell, { width: '10%', textAlign: 'center' }]}>Cant.</Text>
                    <Text style={[styles.headerCell, { width: '15%', textAlign: 'right' }]}>Precio Unit. {currencyPrefix}</Text>
                    <Text style={[styles.headerCell, { width: '15%', textAlign: 'right' }]}>Total {currencyPrefix}</Text>
                </View>

                {data.items.map((item, index) => (
                    <View style={[styles.tableRow, index % 2 === 1 ? styles.tableRowEven : {}]} key={index}>
                        <Text style={styles.cellNo}>{index + 1}</Text>
                        <Text style={styles.cellDesc}>{item.description}</Text>
                        <Text style={styles.cellQty}>{item.quantity}</Text>
                        <Text style={styles.cellPrice}>{formatNumber(item.unitPrice)}</Text>
                        <Text style={styles.cellTotal}>{formatNumber(item.total)}</Text>
                    </View>
                ))}
            </View>

            {/* Totals Table */}
            <View style={styles.totalsContainer}>
                <View style={styles.totalsBox}>
                    <View style={styles.totalLine}>
                        <Text style={styles.totalLabel}>Sub-total {currencyPrefix}</Text>
                        <Text style={styles.totalValue}>{formatNumber(data.subtotal)}</Text>
                    </View>
                    <View style={styles.totalLine}>
                        <Text style={styles.totalLabel}>ITBIS</Text>
                        <Text style={styles.totalValue}>
                            {data.taxTotal > 0 ? `${currencyPrefix} ${formatNumber(data.taxTotal)}` : 'No incluido'}
                        </Text>
                    </View>
                    <View style={styles.totalLineGrand}>
                        <Text style={styles.grandTotalLabel}>TOTAL A PAGAR {currencyPrefix}</Text>
                        <Text style={styles.grandTotalValue}>{formatNumber(data.total)}</Text>
                    </View>
                </View>
            </View>

            {/* NOTAS IMPORTANTES (Dinámicas según lo editado por el usuario) */}
            <View style={styles.notesContainer}>
                <Text style={styles.sectionHeading}>NOTAS IMPORTANTES</Text>
                {dynamicNotes.map((note, idx) => (
                    <Text style={styles.noteItem} key={idx}>
                        {idx + 1}. {note}
                    </Text>
                ))}
            </View>

            {/* DATOS DE PAGO (solo para clientes, no en presupuesto interno) */}
            {!data.isInternalOnly && (
                <View style={styles.paymentBanner}>
                    <Text style={styles.paymentText}>
                        DATOS DE PAGO: HECHO SRL RNC 131-94753-2 | BanReservas: 960-3657-898 | Johanna Guzmán 829-649-2702 | info@hecho.do
                    </Text>
                </View>
            )}

            {/* Signatures & Seal */}
            <View style={styles.signaturesRow}>
                <View style={styles.signatureBlockLeft}>
                    <Text style={styles.signatureHeader}>PREPARADO POR</Text>
                    <View style={styles.signatureLine} />
                    <Text style={styles.signName}>{DEFAULT_COMPANY_DETAILS.manager}</Text>
                    <Text style={styles.signRole}>{DEFAULT_COMPANY_DETAILS.managerTitle}</Text>
                    <Text style={styles.signCompany}>{DEFAULT_COMPANY_DETAILS.name}</Text>
                </View>

                <View style={styles.signatureBlockRight}>
                    <Text style={styles.signatureHeader}>SELLO Y FIRMA</Text>
                    <Image src={stampSrc} style={styles.selloImage} />
                </View>
            </View>

            {/* Bottom Footer */}
            <View style={styles.pageFooter}>
                <Text style={styles.footerCompanyLine}>
                    HECHO SRL | RNC 131-94753-2 | Punta Cana, Rep. Dominicana | Tel: 829-649-2702 | info@hecho.do | BanReservas 960-3657-898
                </Text>
                <Text style={styles.footerDisclaimer}>
                    Documento generado el {new Date().toLocaleDateString('es-DO')} — Este presupuesto no constituye factura fiscal. Gracias por su preferencia.
                </Text>
            </View>
        </Page>
    );
};

export default ClassicTemplate;
