import React from 'react';
import { Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { DocumentData } from '@/lib/document-generator';
import { themes } from './DocumentTheme';

const theme = themes.simple;

const styles = StyleSheet.create({
    page: {
        fontFamily: theme.fontMain,
        fontSize: theme.fontSize.body,
        padding: 30,
        lineHeight: 1.3,
    },
    header: {
        textAlign: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingBottom: 10,
    },
    title: {
        fontSize: 20,
        fontFamily: theme.fontBold,
        textTransform: 'uppercase',
        marginBottom: 5,
    },
    companyName: {
        fontSize: 12,
        fontFamily: theme.fontBold,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    column: {
        width: '48%',
    },
    label: {
        fontSize: 8,
        fontFamily: theme.fontBold,
        textTransform: 'uppercase',
    },
    sectionTitle: {
        fontSize: 10,
        fontFamily: theme.fontBold,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        marginBottom: 5,
        marginTop: 10,
        textTransform: 'uppercase',
    },
    itemRow: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    itemDesc: {
        width: '60%',
    },
    itemQty: {
        width: '10%',
        textAlign: 'center',
    },
    itemPrice: {
        width: '15%',
        textAlign: 'right',
    },
    itemTotal: {
        width: '15%',
        textAlign: 'right',
    },
    totalsBlock: {
        marginTop: 10,
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingTop: 5,
    },
    totalRow: {
        flexDirection: 'row',
        width: '50%',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    totalLabel: {
        fontFamily: theme.fontBold,
    },
    footer: {
        marginTop: 30,
        fontSize: 9,
        textAlign: 'center',
    }
});

interface Props {
    data: DocumentData;
}

export const SimpleTemplate: React.FC<Props> = ({ data }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-DO', {
            style: 'currency',
            currency: data.currency || 'DOP',
        }).format(amount);
    };

    return (
        <Page size="A4" style={styles.page}>

            <View style={styles.header}>
                <Text style={styles.companyName}>{data.company.name}</Text>
                <Text style={{ fontSize: 10 }}>{data.company.rnc ? `RNC: ${data.company.rnc}` : ''} {data.company.phone ? `| Tel: ${data.company.phone}` : ''}</Text>
                <Text style={styles.title}>{data.type}</Text>
                <Text>No. {data.number}</Text>
            </View>

            <View style={styles.infoRow}>
                <View style={styles.column}>
                    <Text style={styles.label}>CLIENTE</Text>
                    <Text>{data.client.name}</Text>
                    <Text>{data.client.address}</Text>
                    <Text>{data.client.rnc ? `RNC: ${data.client.rnc}` : ''}</Text>
                </View>
                <View style={[styles.column, { alignItems: 'flex-end' }]}>
                    <Text style={styles.label}>FECHA</Text>
                    <Text>{data.date.toLocaleDateString()}</Text>
                    {data.dueDate && (
                        <>
                            <Text style={[styles.label, { marginTop: 5 }]}>VENCIMIENTO</Text>
                            <Text>{data.dueDate.toLocaleDateString()}</Text>
                        </>
                    )}
                </View>
            </View>

            <Text style={styles.sectionTitle}>DETALLE</Text>

            {/* Header Row */}
            <View style={[styles.itemRow, { fontFamily: theme.fontBold, fontSize: 9 }]}>
                <Text style={styles.itemDesc}>DESCRIPCIÓN</Text>
                <Text style={styles.itemQty}>CANT</Text>
                <Text style={styles.itemPrice}>PRECIO</Text>
                <Text style={styles.itemTotal}>TOTAL</Text>
            </View>

            {/* Items */}
            {data.items.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                    <Text style={styles.itemDesc}>{item.description}</Text>
                    <Text style={styles.itemQty}>{item.quantity}</Text>
                    <Text style={styles.itemPrice}>{formatCurrency(item.unitPrice)}</Text>
                    <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
                </View>
            ))}

            {/* Totals */}
            <View style={styles.totalsBlock}>
                <View style={styles.totalRow}>
                    <Text>Subtotal</Text>
                    <Text>{formatCurrency(data.subtotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text>Impuestos</Text>
                    <Text>{formatCurrency(data.taxTotal)}</Text>
                </View>
                <View style={[styles.totalRow, { fontFamily: theme.fontBold, fontSize: 12, marginTop: 5 }]}>
                    <Text>TOTAL</Text>
                    <Text>{formatCurrency(data.total)}</Text>
                </View>
            </View>

            {/* Notes */}
            {(data.notes) && (
                <View style={{ marginTop: 20 }}>
                    <Text style={styles.label}>NOTAS</Text>
                    <Text>{data.notes}</Text>
                </View>
            )}

            {/* Firmas simple */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 50 }}>
                <View style={{ borderTopWidth: 1, width: '40%', alignItems: 'center', paddingTop: 5 }}>
                    <Text>Firma Autorizada</Text>
                </View>
                <View style={{ borderTopWidth: 1, width: '40%', alignItems: 'center', paddingTop: 5 }}>
                    <Text>Recibido Conforme</Text>
                </View>
            </View>

        </Page>
    );
};

export default SimpleTemplate;
