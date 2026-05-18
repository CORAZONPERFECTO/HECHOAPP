import { Timestamp } from "firebase/firestore";

export interface LogisticTask {
    id?: string;
    title: string;
    description?: string;
    assignedToId: string;
    assignedToName: string;
    status: 'PENDING' | 'COMPLETED';
    createdAt: Timestamp;
    createdBy: string;
    completedAt?: Timestamp;
}
