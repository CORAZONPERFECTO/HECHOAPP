"use client";

import { TicketReportNew, TicketReportSection, TitleSection, TextSection, ListSection, PhotoSection } from "@/types/schema";

interface TicketReportViewProps {
    report: TicketReportNew;
}

export function TicketReportView({ report }: TicketReportViewProps) {
    const renderSection = (section: TicketReportSection) => {
        switch (section.type) {
            case 'h1':
                return (
                    <h1 key={section.id} className="text-3xl font-bold text-gray-900 mb-4 mt-6">
                        {(section as TitleSection).content}
                    </h1>
                );

            case 'h2':
                return (
                    <h2 key={section.id} className="text-2xl font-bold text-gray-800 mb-3 mt-5">
                        {(section as TitleSection).content}
                    </h2>
                );

            case 'text':
                return (
                    <p key={section.id} className="mb-3 text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {(section as TextSection).content}
                    </p>
                );

            case 'list':
                return (
                    <ul key={section.id} className="list-disc pl-5 space-y-1 mb-4">
                        {(section as ListSection).items.filter(item => item.trim()).map((item, i) => (
                            <li key={i} className="text-gray-700">{item}</li>
                        ))}
                    </ul>
                );

            case 'photo':
                const photoSection = section as PhotoSection;
                return (
                    <div key={section.id} className="mb-6 break-inside-avoid">
                        <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                            {photoSection.photoUrl && (
                                <img
                                    src={photoSection.photoUrl}
                                    alt={photoSection.description || 'Evidence'}
                                    className="w-full h-full object-contain"
                                    crossOrigin="anonymous"
                                />
                            )}
                        </div>
                        {photoSection.description && (
                            <p className="mt-2 text-sm text-gray-600 text-center italic">
                                {photoSection.description}
                            </p>
                        )}
                    </div>
                );

            case 'divider':
                return <hr key={section.id} className="my-6 border-gray-300" />;

            default:
                return null;
        }
    };

    return (
        <div className="report-page bg-white">
            {/* Header */}
            <header className="mb-8 pb-6 border-b-2 border-gray-200">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{report.header.title}</h1>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                        <p><span className="font-semibold">Cliente:</span> {report.header.clientName}</p>
                        <p><span className="font-semibold">Ticket:</span> {report.header.ticketNumber}</p>
                    </div>
                    <div>
                        {report.header.address && (
                            <p><span className="font-semibold">Dirección:</span> {report.header.address}</p>
                        )}
                        <p><span className="font-semibold">Fecha:</span> {report.header.date}</p>
                        {report.header.technicianName && (
                            <p><span className="font-semibold">Técnico:</span> {report.header.technicianName}</p>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="space-y-2">
                {report.sections.map(section => renderSection(section))}
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 2cm;
                        size: letter;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .break-inside-avoid {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                }
            `}</style>
        </div>
    );
}
