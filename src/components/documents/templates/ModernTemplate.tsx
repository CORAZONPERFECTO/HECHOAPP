import React from 'react';
import { Page, Text, View, StyleSheet, Image, Svg, Rect } from '@react-pdf/renderer';
import { DocumentData } from '@/lib/document-generator';
import { themes } from './DocumentTheme';

const theme = themes.modern;

const styles = StyleSheet.create({
    page: {
        fontFamily: theme.fontMain,
        fontSize: theme.fontSize.body,
        paddingBottom: 40,
        lineHeight: 1.4,
        color: '#333',
    },
    topBar: {
        height: 15,
        backgroundColor: theme.accentColor,
        width: '100%',
    },
    header: {
        padding: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    logo: {
        width: 100,
        height: 'auto',
    },
    docTitle: {
        fontSize: 24,
        color: theme.primaryColor,
        fontFamily: theme.fontBold,
        textTransform: 'uppercase',
    },
    subHeader: {
        flexDirection: 'row',
        backgroundColor: theme.secondaryColor,
        padding: 20,
        marginHorizontal: 30,
        borderRadius: 8,
        justifyContent: 'space-between',
    },
    colLeft: {
        width: '55%',
    },
    colRight: {
        width: '40%',
    },
    label: {
        fontSize: 8,
        color: '#666',
        textTransform: 'uppercase',
        marginBottom: 2,
        fontFamily: theme.fontBold,
    },
    value: {
        fontSize: 10,
        marginBottom: 8,
    },
    accentValue: {
        fontSize: 11,
        fontFamily: theme.fontBold,
        color: theme.primaryColor,
    },
    table: {
        marginTop: 30,
        marginHorizontal: 30,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.primaryColor,
        paddingBottom: 8,
        marginBottom: 8,
    },
    th: {
        fontSize: 9,
        fontFamily: theme.fontBold,
        color: theme.primaryColor,
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 6,
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    cellDesc: { width: '50%' },
    cellQty: { width: '10%', textAlign: 'center' },
    cellPrice: { width: '20%', textAlign: 'right' },
    cellTotal: { width: '20%', textAlign: 'right', fontFamily: theme.fontBold },

    summaryBlock: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginRight: 30,
        marginTop: 20,
    },
    card: {
        width: 200,
        backgroundColor: theme.secondaryColor,
        padding: 15,
        borderRadius: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    totalText: {
        fontSize: 14,
        fontFamily: theme.fontBold,
        color: theme.accentColor,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        fontSize: 9,
        color: '#888',
        textAlign: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: theme.secondaryColor,
        alignSelf: 'flex-start',
        marginTop: 5,
    },
    statusText: {
        fontSize: 9,
        fontFamily: theme.fontBold,
        color: theme.primaryColor,
    }
});

interface Props {
    data: DocumentData;
}

export const ModernTemplate: React.FC<Props> = ({ data }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-DO', {
            style: 'currency',
            currency: data.currency || 'DOP',
        }).format(amount);
    };

    return (
        <Page size="A4" style={styles.page}>
            <View style={styles.topBar} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.docTitle}>{data.type}</Text>
                    <Text style={{ fontSize: 10, color: '#888' }}>No. {data.number}</Text>
                    {data.status && (
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{data.status}</Text>
                        </View>
                    )}
                </View>
                {data.company.logoUrl ? (
                    <Image src={data.company.logoUrl} style={styles.logo} />
                ) : (
                    <Text style={{ fontSize: 16, fontFamily: theme.fontBold }}>{data.company.name}</Text>
                )}
            </View>

            {/* Info Block */}
            <View style={styles.subHeader}>
                <View style={styles.colLeft}>
                    <Text style={styles.label}>Facturado A:</Text>
                    <Text style={styles.accentValue}>{data.client.name}</Text>
                    <Text style={styles.value}>{data.client.address || 'N/A'}</Text>
                    {data.client.rnc && <Text style={styles.value}>RNC: {data.client.rnc}</Text>}
                </View>
                <View style={styles.colRight}>
                    <Text style={styles.label}>Detalles Emisor:</Text>
                    <Text style={styles.value}>{data.company.name}</Text>
                    <Text style={styles.value}>{data.company.email}</Text>

                    <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View>
                            <Text style={styles.label}>Fecha:</Text>
                            <Text style={styles.value}>{data.date.toLocaleDateString()}</Text>
                        </View>
                        {data.dueDate && (
                            <View>
                                <Text style={styles.label}>Vence:</Text>
                                <Text style={styles.value}>{data.dueDate.toLocaleDateString()}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Table */}
            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, styles.cellDesc]}>Descripción</Text>
                    <Text style={[styles.th, styles.cellQty]}>Cant.</Text>
                    <Text style={[styles.th, styles.cellPrice]}>Precio</Text>
                    <Text style={[styles.th, styles.cellTotal]}>Total</Text>
                </View>

                {data.items.map((item, i) => (
                    <View key={i} style={[styles.tableRow, i % 2 === 0 ? {} : { backgroundColor: '#fdfdfd' }]}>
                        <Text style={styles.cellDesc}>{item.description}</Text>
                        <Text style={styles.cellQty}>{item.quantity}</Text>
                        <Text style={styles.cellPrice}>{formatCurrency(item.unitPrice)}</Text>
                        <Text style={styles.cellTotal}>{formatCurrency(item.total)}</Text>
                    </View>
                ))}
            </View>

            {/* Summary */}
            <View style={styles.summaryBlock}>
                <View style={styles.card}>
                    <View style={styles.summaryRow}>
                        <Text style={{ fontSize: 10 }}>Subtotal</Text>
                        <Text style={{ fontSize: 10 }}>{formatCurrency(data.subtotal)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={{ fontSize: 10 }}>Impuestos</Text>
                        <Text style={{ fontSize: 10 }}>{formatCurrency(data.taxTotal)}</Text>
                    </View>
                    {data.discountTotal > 0 && (
                        <View style={styles.summaryRow}>
                            <Text style={{ fontSize: 10 }}>Descuento</Text>
                            <Text style={{ fontSize: 10, color: 'red' }}>-{formatCurrency(data.discountTotal)}</Text>
                        </View>
                    )}
                    <View style={styles.totalRow}>
                        <Text style={[styles.totalText, { fontSize: 12 }]}>Total a Pagar</Text>
                        <Text style={styles.totalText}>{formatCurrency(data.total)}</Text>
                    </View>
                </View>
            </View>

            {/* Notes Area inline (not footer) */}
            {(data.notes || data.terms) && (
                <View style={{ marginHorizontal: 30, marginTop: 40, padding: 15, borderLeftWidth: 3, borderLeftColor: theme.primaryColor, backgroundColor: '#f9f9f9' }}>
                    <Text style={styles.label}>Notas / Términos</Text>
                    <Text style={{ fontSize: 9 }}>{data.notes}</Text>
                    <Text style={{ fontSize: 9, marginTop: 4 }}>{data.terms}</Text>
                </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
                <Text>Gracias por su preferencia.</Text>
                <Text>{data.company.address} • {data.company.phone} • {data.company.website}</Text>
            </View>

        </Page>
    );
};

export default ModernTemplate;
