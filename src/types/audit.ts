import { Timestamp } from "firebase/firestore";

export interface FinancialAuditLog {
    id: string;
    entityType: 'COST' | 'INCENTIVE' | 'WARRANTY' | 'LOAN' | 'PERIOD' | 'RATE' | 'FLEET' | 'COST_CENTER';
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'ACTIVATE' | 'DEACTIVATE' | 'APPROVE' | 'REJECT' | 'ADJUST';
    userId: string;
    userName: string;
    userEmail: string;
    timestamp: Timestamp | Date;
    previousValue?: any;
    newValue?: any;
    reason?: string;
}
