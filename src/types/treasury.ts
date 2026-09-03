export interface BankAccount {
    id: string;
    name: string;
    accountNumber?: string;
    type: 'BANK' | 'CASH';
    currency: 'DOP' | 'USD';
    currentBalance: number;
    updatedAt: any;
}

export interface TreasuryMovement {
    id: string;
    accountId: string;
    accountName: string;
    type: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';
    category: 'COBRO_FACTURA' | 'GASTO_OPERATIVO' | 'COMPRA_CALLE' | 'FONDEO' | 'NOMINA';
    amount: number;
    reference?: string;
    description: string;
    receiptPhotoUrl?: string;
    createdAt: any;
    createdBy: string;
}

export interface DailyCashReconciliation {
    id: string;
    date: string;
    startingBalance: number;
    totalIncome: number;
    totalExpenses: number;
    expectedBalance: number;
    actualCountedBalance: number;
    difference: number;
    status: 'CUADRADO' | 'DESCUADRADO';
    notes?: string;
    closedAt: any;
    closedBy: string;
}
