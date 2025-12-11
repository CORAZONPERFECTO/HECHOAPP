import React from 'react';
import { Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { DocumentData } from '@/lib/document-generator';
import { themes } from './DocumentTheme';

const theme = themes.classic;

const styles = StyleSheet.create({
    page: {
        fontFamily: theme.fontMain,
        fontSize: theme.fontSize.body,
        padding: 40,
        lineHeight: 1.5,
        flexDirection: 'column',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 10,
    },
    logoContainer: {
        width: '40%',
    },
    logo: {
        width: 120,
        height: 'auto',
        objectFit: 'contain',
    },
    companyInfo: {
        width: '50%',
        textAlign: 'right',
        fontSize: 9,
    },
    companyName: {
        fontSize: 14,
        fontFamily: theme.fontBold,
        marginBottom: 4,
    },
    documentTitleBlock: {
        marginTop: 10,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    mainTitle: {
        fontSize: 18,
        fontFamily: theme.fontBold,
        textTransform: 'uppercase',
    },
    metaBlock: {
        textAlign: 'right',
    },
    metaText: {
        fontSize: 10,
    },
    clientBlock: {
        marginTop: 0,
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#eee',
    },
    clientLabel: {
        fontFamily: theme.fontBold,
        fontSize: 10,
        marginBottom: 2,
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#bfbfbf',
        marginBottom: 10,
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#bfbfbf',
        minHeight: 24,
        alignItems: 'center',
    },
    tableHeader: {
        backgroundColor: '#e6e6e6',
        fontFamily: theme.fontBold,
        fontSize: 9,
    },
    tableColDesc: {
        width: '50%',
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: '#bfbfbf',
    },
    tableColQty: {
        width: '10%',
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: '#bfbfbf',
        textAlign: 'center',
    },
    tableColPrice: {
        width: '20%',
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: '#bfbfbf',
        textAlign: 'right',
    },
    tableColTotal: {
        width: '20%',
        padding: 5,
        textAlign: 'right',
    },
    totalsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    totalsTable: {
        width: '40%',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    totalLabel: {
        fontFamily: theme.fontBold,
    },
    totalValue: {
        textAlign: 'right',
    },
    grandTotal: {
        fontFamily: theme.fontBold,
        fontSize: 12,
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingTop: 4,
        marginTop: 4,
    },
    footer: {
        marginTop: 40,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    notes: {
        fontSize: 9,
        fontStyle: 'italic',
        color: '#555',
    },
    signatures: {
        marginTop: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    signatureBlock: {
        width: '40%',
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingTop: 10,
        alignItems: 'center',
    },
});

interface Props {
    data: DocumentData;
}

export const ClassicTemplate: React.FC<Props> = ({ data }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-DO', {
            style: 'currency',
            currency: data.currency || 'DOP',
        }).format(amount);
    };

    return (
        <Page size="A4" style={styles.page}>

            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.logoContainer}>
                    {/* Logo Placeholder - Replace with actual Image logic if URL exists */}
                    {data.company.logoUrl ? (
                        // Note: react-pdf Image requires a valid URL or base64. 
                        // We assume the generator passes a proxy URL if needed, similar to current export-utils
                        <Image src={data.company.logoUrl} style={styles.logo} />
                    ) : (
                        <Text style={{ fontSize: 20, fontFamily: theme.fontBold }}>{data.company.name}</Text>
                    )}
                </View>
                <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>{data.company.name}</Text>
                    {data.company.rnc && <Text>RNC: {data.company.rnc}</Text>}
                    <Text>{data.company.address}</Text>
                    <Text>{data.company.phone} | {data.company.email}</Text>
                </View>
            </View>

            {/* Title & Document Meta */}
            <View style={styles.documentTitleBlock}>
                <View>
                    <Text style={styles.mainTitle}>{data.type}</Text>
                    {data.status && <Text style={{ fontSize: 10, color: '#666', marginTop: 4 }}>Estado: {data.status}</Text>}
                </View>
                <View style={styles.metaBlock}>
                    <Text style={styles.metaText}>No. {data.number}</Text>
                    <Text style={styles.metaText}>Fecha: {data.date.toLocaleDateString()}</Text>
                    {data.validUntil && <Text style={styles.metaText}>Válida hasta: {data.validUntil.toLocaleDateString()}</Text>}
                    {data.dueDate && <Text style={styles.metaText}>Vence: {data.dueDate.toLocaleDateString()}</Text>}
                </View>
            </View>

            {/* Client Info */}
            <View style={styles.clientBlock}>
                <Text style={styles.clientLabel}>CLIENTE:</Text>
                <Text style={{ fontFamily: theme.fontBold }}>{data.client.name}</Text>
                {data.client.rnc && <Text>RNC/Cédula: {data.client.rnc}</Text>}
                {data.client.address && <Text>{data.client.address}</Text>}
                {data.client.phone && <Text>Tel: {data.client.phone}</Text>}
            </View>

            {/* Items Table */}
            <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <View style={styles.tableColDesc}><Text>DESCRIPCIÓN</Text></View>
                    <View style={styles.tableColQty}><Text>CANT.</Text></View>
                    <View style={styles.tableColPrice}><Text>PRECIO</Text></View>
                    <View style={styles.tableColTotal}><Text>TOTAL</Text></View>
                </View>

                {data.items.map((item, index) => (
                    <View style={styles.tableRow} key={index}>
                        <View style={styles.tableColDesc}><Text>{item.description}</Text></View>
                        <View style={styles.tableColQty}><Text>{item.quantity}</Text></View>
                        <View style={styles.tableColPrice}><Text>{formatCurrency(item.unitPrice)}</Text></View>
                        <View style={styles.tableColTotal}><Text>{formatCurrency(item.total)}</Text></View>
                    </View>
                ))}
            </View>

            {/* Totals */}
            <View style={styles.totalsContainer}>
                <View style={styles.totalsTable}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Subtotal:</Text>
                        <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>ITBIS/Impuestos:</Text>
                        <Text style={styles.totalValue}>{formatCurrency(data.taxTotal)}</Text>
                    </View>
                    {data.discountTotal > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Descuento:</Text>
                            <Text style={styles.totalValue}>-{formatCurrency(data.discountTotal)}</Text>
                        </View>
                    )}
                    <View style={[styles.totalRow, styles.grandTotal]}>
                        <Text style={styles.totalLabel}>TOTAL:</Text>
                        <Text style={styles.totalValue}>{formatCurrency(data.total)}</Text>
                    </View>
                </View>
            </View>

            {/* Signatures */}
            <View style={styles.signatures}>
                <View style={styles.signatureBlock}>
                    <Text>Autorizado por</Text>
                </View>
                <View style={styles.signatureBlock}>
                    <Text>Recibido por</Text>
                </View>
            </View>

            {/* Footer / Notes */}
            {(data.notes || data.terms) && (
                <View style={styles.footer}>
                    {data.notes && (
                        <View style={{ marginBottom: 10 }}>
                            <Text style={[styles.clientLabel, { marginBottom: 2 }]}>Notas:</Text>
                            <Text style={styles.notes}>{data.notes}</Text>
                        </View>
                    )}
                    {data.terms && (
                        <View>
                            <Text style={[styles.clientLabel, { marginBottom: 2 }]}>Términos y Condiciones:</Text>
                            <Text style={styles.notes}>{data.terms}</Text>
                        </View>
                    )}
                </View>
            )}
        </Page>
    );
};

export default ClassicTemplate;
