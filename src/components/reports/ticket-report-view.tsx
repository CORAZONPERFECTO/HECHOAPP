"use client";

import { InlineEditableText } from "@/components/ui/inline-editable-text";
import { BeforeAfterBlock } from "@/components/reports/blocks/before-after-block";
import { TicketReportNew, TicketReportSection, TitleSection, TextSection, ListSection, PhotoSection } from "@/types/schema";

interface TicketReportViewProps {
    report: TicketReportNew;
    isInteractive?: boolean;
    onUpdateSection?: (sectionId: string, updates: Partial<TicketReportSection>) => void;
    onUpdateHeader?: (updates: Partial<TicketReportNew['header']>) => void;
}

export function TicketReportView({ report, isInteractive = false, onUpdateSection, onUpdateHeader }: TicketReportViewProps) {
    const renderSection = (section: TicketReportSection) => {
        const handleSave = (val: string) => {
            if (onUpdateSection) {
                // If text/h1/h2, content is the field. 
                // For list, we might need special handling but for now let's focus on text blocks
                if (section.type === 'list') {
                    // special case
                } else {
                    onUpdateSection(section.id, { content: val } as any);
                }
            }
        };

        switch (section.type) {
            case 'h1': // Usually not used in body, but supported
                return (
                    <div key={section.id} className="mb-4 mt-6">
                        <InlineEditableText
                            value={(section as TitleSection).content}
                            onSave={handleSave}
                            disabled={!isInteractive}
                            className="text-3xl font-bold text-gray-900 dark:text-zinc-50 leading-tight"
                            as="input"
                        />
                    </div>
                );

            case 'h2':
                return (
                    <div key={section.id} className="mb-3 mt-5">
                        <InlineEditableText
                            value={(section as TitleSection).content}
                            onSave={handleSave}
                            disabled={!isInteractive}
                            className="text-2xl font-bold text-gray-800 dark:text-zinc-200 leading-tight"
                            as="input"
                        />
                    </div>
                );

            case 'text':
                return (
                    <div key={section.id} className="mb-3">
                        <InlineEditableText
                            value={(section as TextSection).content}
                            onSave={handleSave}
                            disabled={!isInteractive}
                            className="text-gray-700 dark:text-zinc-300 leading-relaxed"
                        />
                    </div>
                );

            case 'list':
                // For simplicity, list items aren't fully inline editable yet in this pass unless requested.
                // Or we can make a simple implementation if easy.
                return (
                    <ul key={section.id} className="list-disc pl-5 space-y-1 mb-4 text-gray-700 dark:text-zinc-300">
                        {(section as ListSection).items.filter(item => item.trim()).map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                );

            case 'beforeAfter':
                return (
                    <div className="mb-6">
                        <BeforeAfterBlock
                            section={section as any}
                            onChange={(updated) => {
                                if (onUpdateSection && isInteractive) {
                                    onUpdateSection(section.id, updated);
                                }
                            }}
                            onRemove={() => { }}
                            readOnly={!isInteractive}
                        />
                    </div>
                );

            case 'photo':
                const photoSection = section as PhotoSection;
                return (
                    <div key={section.id} className="mb-6 break-inside-avoid photo-container">
                        <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm group">
                            {photoSection.photoUrl ? (
                                <>
                                    <img
                                        src={photoSection.photoUrl}
                                        alt={photoSection.description || 'Evidence'}
                                        className="w-full h-full object-contain photo-print"
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                            console.error("Error cargando imagen:", photoSection.photoUrl);
                                            e.currentTarget.style.display = 'none';
                                            const errorDiv = document.createElement('div');
                                            errorDiv.className = "flex flex-col items-center justify-center h-full text-red-500 text-xs p-4 text-center";
                                            errorDiv.innerHTML = `<span>Error cargando imagen</span><span class="text-[10px] text-gray-400 mt-2 break-all">${photoSection.photoUrl}</span>`;
                                            e.currentTarget.parentElement?.appendChild(errorDiv);
                                        }}
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs p-4 break-all pointer-events-none">
                                        {photoSection.photoUrl}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    Sin imagen
                                </div>
                            )}
                        </div>
                        <div className="mt-2 text-center">
                            <InlineEditableText
                                value={photoSection.description || ''}
                                onSave={(val) => {
                                    if (onUpdateSection) onUpdateSection(section.id, { description: val } as any)
                                }}
                                disabled={!isInteractive}
                                className="text-sm text-gray-600 italic inline-block min-w-[50px]"
                                placeholder="Agregar descripción..."
                            />
                        </div>
                    </div>
                );

            case 'beforeAfter':
                const baSection = section as any; // Cast temporarily until import is updated
                return (
                    <div key={section.id} className="mb-6 break-inside-avoid">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Antes</span>
                                <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                    {baSection.beforePhotoUrl ? (
                                        <img
                                            src={baSection.beforePhotoUrl}
                                            alt="Antes"
                                            className="w-full h-full object-cover photo-print"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400 text-xs">Sin foto</div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Después</span>
                                <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                    {baSection.afterPhotoUrl ? (
                                        <img
                                            src={baSection.afterPhotoUrl}
                                            alt="Después"
                                            className="w-full h-full object-cover photo-print"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400 text-xs">Sin foto</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {baSection.description && (
                            <p className="mt-3 text-sm text-gray-600 text-center italic">
                                {baSection.description}
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
        <div className="report-page bg-white dark:bg-zinc-950 transition-colors duration-200">
            {/* Header */}
            <header className="mb-8 pb-6 border-b-2 border-gray-200 dark:border-zinc-800">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-50 mb-4">{report.header.title}</h1>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-zinc-400">
                    <div>
                        <p><span className="font-semibold text-gray-900 dark:text-zinc-200">Cliente:</span> {report.header.clientName}</p>
                        <p><span className="font-semibold text-gray-900 dark:text-zinc-200">Ticket:</span> {report.header.ticketNumber}</p>
                    </div>
                    <div>
                        {report.header.address && (
                            <p><span className="font-semibold text-gray-900 dark:text-zinc-200">Dirección:</span> {report.header.address}</p>
                        )}
                        <p><span className="font-semibold text-gray-900 dark:text-zinc-200">Fecha:</span> {report.header.date}</p>
                        {report.header.technicianName && (
                            <p><span className="font-semibold text-gray-900 dark:text-zinc-200">Técnico:</span> {report.header.technicianName}</p>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="space-y-2">
                {report.sections.map(section => renderSection(section))}

                {/* Signatures View */}
                {report.signatures && (
                    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-zinc-800 break-inside-avoid">
                        <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-zinc-100 uppercase tracking-wider text-center">Conformidad del Servicio</h3>
                        <div className="grid grid-cols-2 gap-12">
                            {/* Technician */}
                            <div className="flex flex-col items-center space-y-4">
                                <div className="h-32 w-full max-w-[240px] border-b-2 border-gray-300 flex items-center justify-center">
                                    {report.signatures.technicianSignature ? (
                                        <img src={report.signatures.technicianSignature} alt="Firma Técnico" className="max-h-full max-w-full" />
                                    ) : (
                                        <span className="text-gray-400 text-sm italic">Sin firma</span>
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-gray-900 dark:text-zinc-200">
                                        {report.signatures.technicianName || "Técnico"}
                                    </p>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Técnico Responsable</p>
                                </div>
                            </div>

                            {/* Client */}
                            <div className="flex flex-col items-center space-y-4">
                                <div className="h-32 w-full max-w-[240px] border-b-2 border-gray-300 flex items-center justify-center">
                                    {report.signatures.clientSignature ? (
                                        <img src={report.signatures.clientSignature} alt="Firma Cliente" className="max-h-full max-w-full" />
                                    ) : (
                                        <span className="text-gray-400 text-sm italic">Sin firma</span>
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-gray-900 dark:text-zinc-200">
                                        {report.signatures.clientName || "Cliente"}
                                    </p>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Cliente / Representante</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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
                    .photo-container {
                        display: block !important;
                        visibility: visible !important;
                    }
                    .photo-print {
                        display: block !important;
                        max-width: 100%;
                        height: auto;
                    }
                }
            `}</style>
        </div>
    );
}
