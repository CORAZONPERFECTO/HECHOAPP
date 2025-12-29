import { Timestamp } from "firebase/firestore";

export type ReportBlockType = 'h1' | 'h2' | 'h3' | 'text' | 'bullet-list' | 'numbered-list' | 'blockquote' | 'separator' | 'photo';

export interface ReportBlockAttributes {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    align?: 'left' | 'center' | 'right' | 'justify';
    size?: 'small' | 'medium' | 'large' | 'full';
}

export interface ReportSection {
    id: string;
    type: ReportBlockType;
    content?: string; // For text, titles, lists
    photoUrl?: string; // For photo sections
    description?: string; // For photo sections
    attributes?: ReportBlockAttributes;
    // Legacy/Optional fields
    area?: string;
    details?: string;
}

export interface TicketReport {
    id?: string;
    ticketId: string;
    header: {
        clientName: string;
        ticketNumber: string;
        address: string;
        date: string;
        technicianName: string;
        title: string;
    };
    sections: ReportSection[];
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// --- New Report Module Types ---

export type SectionType = 'h1' | 'h2' | 'text' | 'list' | 'photo' | 'divider' | 'beforeAfter' | 'gallery';

export interface BaseSection {
    id: string;
    type: SectionType;
}

export interface TitleSection extends BaseSection {
    type: 'h1' | 'h2';
    content: string;
}

export interface TextSection extends BaseSection {
    type: 'text';
    content: string;
}

export interface ListSection extends BaseSection {
    type: 'list';
    items: string[];
}

export interface PhotoSection extends BaseSection {
    type: 'photo';
    photoUrl: string;
    description?: string;
    size?: 'small' | 'medium' | 'large'; // Default: medium
    photoMeta?: {
        originalId?: string;
        area?: string;
        phase?: 'BEFORE' | 'DURING' | 'AFTER';
    };
}

export interface GallerySection extends BaseSection {
    type: 'gallery';
    photos: Array<{
        photoUrl: string;
        description?: string;
        photoMeta?: {
            originalId?: string;
            area?: string;
            phase?: 'BEFORE' | 'DURING' | 'AFTER';
        };
    }>;
}

export interface DividerSection extends BaseSection {
    type: 'divider';
}

export interface BeforeAfterSection extends BaseSection {
    type: 'beforeAfter';
    beforePhotoUrl: string;
    afterPhotoUrl: string;
    beforeMeta?: {
        originalId?: string;
        area?: string;
    };
    afterMeta?: {
        originalId?: string;
        area?: string;
    };
    description?: string;
}

export type TicketReportSection =
    | TitleSection
    | TextSection
    | ListSection
    | PhotoSection
    | GallerySection
    | DividerSection
    | BeforeAfterSection;

export interface TicketReportHeader {
    clientName: string;
    ticketNumber: string;
    address?: string;
    date: string;
    technicianName?: string;
    title: string;
}

export interface TicketReportSignatures {
    technicianSignature?: string; // URL
    technicianName?: string;
    technicianSignedAt?: Timestamp;
    clientSignature?: string; // URL
    clientName?: string;
    clientSignedAt?: Timestamp;
}

export interface TicketReportNew {
    ticketId: string;
    header: TicketReportHeader;
    sections: TicketReportSection[];
    signatures?: TicketReportSignatures;
    lastGeneratedFromTicketAt?: string;
    lockedBy?: {
        userId: string;
        userName: string;
        at: Timestamp;
    };
}
