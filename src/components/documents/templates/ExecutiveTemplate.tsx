import React from 'react';
import { Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { DocumentData } from '@/lib/document-generator';
import { themes } from './DocumentTheme';

// Using Helvetica-Bold instead of downloading custom fonts for simplicity, 
// wait to see if client explicitly requests custom fonts.
const theme = themes.executive;

const styles = StyleSheet.create({
    page: {
        fontFamily: theme.fontMain,
        fontSize: theme.fontSize.body,
        paddingTop: 36,
        paddingBottom: 36,
        paddingLeft: 40,
        paddingRight: 40,
        lineHeight: 1.4,
        color: '#000000',
    },
    headerSpace: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 30,
    },
    companyBlock: {
        flexDirection: 'column',
    },
    companyName: {
        fontSize: 16,
        fontFamily: theme.fontBold,
        color: theme.primaryColor,
        marginBottom: 4,
    },
    companyDetail: {
        fontSize: 8,
        color: theme.secondaryColor,
        marginBottom: 2,
    },
    documentTitleBlock: {
        alignItems: 'flex-end',
    },
    documentTitle: {
        fontSize: 22,
        fontFamily: theme.fontBold,
        color: theme.primaryColor,
        letterSpacing: 2,
        marginBottom: 8,
    },
    titleBox: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 4,
    },
    titleBoxLabel: {
        fontSize: 9,
        color: theme.secondaryColor,
        width: 80,
        textAlign: 'right',
        marginRight: 10,
    },
    titleBoxValue: {
        fontSize: 9,
        fontFamily: theme.fontBold,
        width: 80,
        textAlign: 'right',
    },
    clientSection: {
        marginBottom: 25,
    },
    clientTitle: {
        fontSize: 9,
        fontFamily: theme.fontBold,
        color: theme.secondaryColor,
        marginBottom: 6,
    },
    clientRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    clientLabel: {
        fontSize: 9,
        color: theme.secondaryColor,
        width: 60,
    },
    clientValue: {
        fontSize: 10,
        fontFamily: theme.fontBold,
        flex: 1,
    },
    table: {
        width: '100%',
        marginBottom: 20,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: theme.primaryColor,
        padding: 6,
        alignItems: 'center',
    },
    tableHeaderCell: {
        color: '#FFFFFF',
        fontFamily: theme.fontBold,
        fontSize: 8,
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E7EB',
        padding: 6,
        alignItems: 'center',
        minHeight: 24,
    },
    colDesc: { width: '56%', textAlign: 'left', paddingRight: 10 },
    colQty: { width: '9%', textAlign: 'center' },
    colPrice: { width: '17.5%', textAlign: 'right' },
    colTotal: { width: '17.5%', textAlign: 'right' },

    summarySection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 30,
    },
    summaryBox: {
        width: '40%',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E7EB',
    },
    summaryLabel: {
        fontSize: 9,
        color: theme.secondaryColor,
    },
    summaryValue: {
        fontSize: 9,
        fontFamily: theme.fontBold,
    },
    summaryRowTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        marginTop: 2,
    },
    summaryLabelTotal: {
        fontSize: 11,
        fontFamily: theme.fontBold,
        color: theme.primaryColor,
    },
    summaryValueTotal: {
        fontSize: 11,
        fontFamily: theme.fontBold,
        color: theme.primaryColor,
    },
    notesSection: {
        marginBottom: 20,
    },
    notesTitle: {
        fontSize: 9,
        fontFamily: theme.fontBold,
        color: theme.primaryColor,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    noteItem: {
        fontSize: 8,
        color: theme.secondaryColor,
        marginBottom: 3,
        paddingLeft: 10, // Indent for bullets
    },
    bankingSection: {
        marginTop: 10,
        padding: 10,
        backgroundColor: '#F9FAFB',
        borderLeftWidth: 3,
        borderLeftColor: theme.primaryColor,
    },
    bankingItem: {
        fontSize: 8,
        color: '#4B5563',
        marginBottom: 2,
    },
    signatureSection: {
        marginTop: 50,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    signatureBlock: {
        width: 200,
        alignItems: 'center',
    },
    signatureLine: {
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#000000',
        marginBottom: 5,
    },
    signatureName: {
        fontSize: 10,
        fontFamily: theme.fontBold,
    },
    signatureTitle: {
        fontSize: 8,
        color: theme.secondaryColor,
    }
});

interface Props {
    data: DocumentData;
}

export const ExecutiveTemplate: React.FC<Props> = ({ data }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-DO', {
            style: 'currency',
            currency: data.currency || 'DOP',
        }).format(amount);
    };

    const documentTitle = data.type === 'Cotización' ? 'COTIZACIÓN' : data.type.toUpperCase();

    // Split notes by newline to render as list
    const noteItems = data.notes ? data.notes.split('\n').filter(n => n.trim().length > 0) : [];

    return (
        <Page size="LETTER" style={styles.page}>
            {/* Header */}
            <View style={styles.headerSpace}>
                <View style={styles.companyBlock}>
                    <Text style={styles.companyName}>{data.company.name}</Text>
                    <Text style={styles.companyDetail}>{data.company.address}</Text>
                    <Text style={styles.companyDetail}>{`Tel: ${data.company.phone} | Correo: ${data.company.email}`}</Text>
                    <Text style={styles.companyDetail}>{`RNC: ${data.company.rnc}`}</Text>
                </View>

                <View style={styles.documentTitleBlock}>
                    <Text style={styles.documentTitle}>{documentTitle}</Text>

                    <View style={styles.titleBox}>
                        <Text style={styles.titleBoxLabel}>Cotización #</Text>
                        <Text style={styles.titleBoxValue}>{data.number}</Text>
                    </View>

                    <View style={styles.titleBox}>
                        <Text style={styles.titleBoxLabel}>Fecha de emisión</Text>
                        <Text style={styles.titleBoxValue}>{data.date.toLocaleDateString()}</Text>
                    </View>

                    {data.dueDate && (
                        <View style={styles.titleBox}>
                            <Text style={styles.titleBoxLabel}>Válida hasta</Text>
                            <Text style={styles.titleBoxValue}>{data.dueDate.toLocaleDateString()}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Client Section */}
            <View style={styles.clientSection}>
                <Text style={styles.clientTitle}>DATOS DEL CLIENTE</Text>
                <View style={styles.clientRow}>
                    <Text style={styles.clientLabel}>Cliente:</Text>
                    <Text style={styles.clientValue}>{data.client.name.toUpperCase()}</Text>
                </View>
                {data.client.rnc && (
                    <View style={styles.clientRow}>
                        <Text style={styles.clientLabel}>RNC:</Text>
                        <Text style={styles.clientValue}>{data.client.rnc}</Text>
                    </View>
                )}
                {/* Asumimos que podemos poner la dirección u otra info relevante aquí */}
                {data.client.address && (
                    <View style={styles.clientRow}>
                        <Text style={styles.clientLabel}>Dirección:</Text>
                        <Text style={[styles.clientValue, { fontSize: 9, fontFamily: theme.fontMain }]}>{data.client.address}</Text>
                    </View>
                )}
            </View>

            {/* Table */}
            <View style={styles.table}>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, styles.colDesc]}>Descripción</Text>
                    <Text style={[styles.tableHeaderCell, styles.colQty]}>Cant.</Text>
                    <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio Unit.</Text>
                    <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
                </View>

                {/* Table Rows */}
                {data.items.map((item, idx) => (
                    <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? { backgroundColor: '#F9FAFB' } : {}]}>
                        <Text style={[styles.colDesc, { fontSize: 9 }]}>{item.description}</Text>
                        <Text style={[styles.colQty, { fontSize: 9 }]}>{item.quantity}</Text>
                        <Text style={[styles.colPrice, { fontSize: 9 }]}>{formatCurrency(item.unitPrice)}</Text>
                        <Text style={[styles.colTotal, { fontSize: 9 }]}>{formatCurrency(item.total)}</Text>
                    </View>
                ))}
            </View>

            {/* Summary */}
            <View style={styles.summarySection}>
                <View style={styles.summaryBox}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(data.subtotal)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>ITBIS (18%)</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(data.taxTotal)}</Text>
                    </View>
                    <View style={styles.summaryRowTotal}>
                        <Text style={styles.summaryLabelTotal}>TOTAL GENERAL</Text>
                        <Text style={styles.summaryValueTotal}>{formatCurrency(data.total)}</Text>
                    </View>
                </View>
            </View>

            {/* Notes and Conditions */}
            {noteItems.length > 0 && (
                <View style={styles.notesSection}>
                    <Text style={styles.notesTitle}>Notas y Condiciones</Text>
                    {noteItems.map((note, idx) => (
                        <Text key={idx} style={styles.noteItem}>• {note}</Text>
                    ))}
                </View>
            )}

            {/* Banking Section */}
            <View style={styles.bankingSection}>
                <Text style={[styles.notesTitle, { marginBottom: 4 }]}>Datos Bancarios</Text>
                <Text style={styles.bankingItem}>Banco Popular – Cuenta Corriente RD$: 814834933</Text>
                <Text style={styles.bankingItem}>Banco de Reservas – Cuenta Corriente: 9603657898</Text>
                <Text style={styles.bankingItem}>HECHO, SRL | RNC: 131947532</Text>
            </View>

            {/* Signature */}
            <View style={styles.signatureSection}>
                <View style={styles.signatureBlock}>
                    <View style={styles.signatureLine}></View>
                    <Text style={styles.signatureName}>Luis C. Alberti</Text>
                    <Text style={styles.signatureTitle}>Representante</Text>
                </View>
            </View>

        </Page>
    );
};

export default ExecutiveTemplate;
