import React from 'react';
import { Document } from '@react-pdf/renderer';
import { DocumentData } from '@/lib/document-generator';
import ClassicTemplate from './ClassicTemplate';
import ModernTemplate from './ModernTemplate';
import SimpleTemplate from './SimpleTemplate';
import { DocumentFormat } from '@/stores/document-settings-store';

interface DocumentProps {
    data: DocumentData;
    format?: DocumentFormat;
}

export const DocumentPDF: React.FC<DocumentProps> = ({ data, format = 'classic' }) => {
    return (
        <Document
            title={`${data.type} - ${data.number}`}
            author={data.company.name}
            subject={data.type}
            creator="Hecho Nexus App"
        >
            {format === 'classic' && <ClassicTemplate data={data} />}
            {format === 'modern' && <ModernTemplate data={data} />}
            {format === 'simple' && <SimpleTemplate data={data} />}
        </Document>
    );
};

export default DocumentPDF;
