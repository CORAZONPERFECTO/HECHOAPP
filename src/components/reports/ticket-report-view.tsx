"use client";

import { useState } from "react";
import { InlineEditableText } from "@/components/ui/inline-editable-text";
import { BeforeAfterBlock } from "@/components/reports/blocks/before-after-block";
import { TicketReportNew, TicketReportSection, TitleSection, TextSection, ListSection, PhotoSection, GallerySection } from "@/types/schema";
import { deduplicateReportSections } from "@/lib/report-generator";
import { Lightbulb, ShieldCheck, Wrench, FileText, CheckCircle2, User, Calendar, MapPin, ZoomIn, X, Edit3 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface TicketReportViewProps {
    report: TicketReportNew;
    isInteractive?: boolean;
    onUpdateSection?: (sectionId: string, updates: Partial<TicketReportSection>) => void;
    onUpdateHeader?: (updates: Partial<TicketReportNew['header']>) => void;
}

function SmartFormattedReportContent({ text }: { text: string }) {
    if (!text) return null;
    const lines = text.split('\n');

    return (
        <div className="space-y-1.5">
            {lines.map((rawLine, idx) => {
                const line = rawLine.trim();
                if (!line) {
                    return <div key={idx} className="h-1.5" />;
                }

                // 1. TÍTULOS NUMERADOS (Ej: "1. Capacidad de los Equipos", "2. Verificación...")
                const numMatch = line.match(/^(\d+[\.\)]\s+)(.*)$/);
                if (numMatch) {
                    return (
                        <div key={idx} className="pt-3 pb-1 mt-3 border-b-2 border-emerald-600/30 dark:border-emerald-500/30 flex items-center gap-2">
                            <span className="w-2 h-4 bg-emerald-700 dark:bg-emerald-500 rounded-sm inline-block shrink-0" />
                            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base md:text-lg tracking-tight">
                                {line}
                            </h3>
                        </div>
                    );
                }

                // 2. DICTAMEN / EVALUACIÓN GENERAL / ADVERTENCIA
                const calloutMatch = line.match(/^(Evaluación general|Dictamen técnico|Advertencia|Nota crítica|Conclusión):\s*(.*)$/i);
                if (calloutMatch) {
                    const tag = calloutMatch[1];
                    const val = calloutMatch[2];
                    return (
                        <div key={idx} className="my-3 p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border-l-4 border-emerald-600 dark:border-emerald-500 shadow-sm border border-slate-200/60 dark:border-zinc-800">
                            <span className="font-extrabold text-slate-900 dark:text-zinc-100 block mb-1 text-xs tracking-wider uppercase">
                                {tag}:
                            </span>
                            <p className="text-sm italic text-slate-700 dark:text-zinc-300 leading-relaxed font-medium">
                                {val}
                            </p>
                        </div>
                    );
                }

                // 3. CLAVE: VALOR (Ej: "Estudio: 12,000 BTU...", "Área de la Entrada: El Fan Coil...")
                const colonMatch = line.match(/^([^:\n]{2,45}):\s*(.*)$/);
                if (colonMatch) {
                    const key = colonMatch[1].trim();
                    const val = colonMatch[2].trim();
                    return (
                        <div key={idx} className="py-1 text-sm leading-relaxed flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-zinc-100 shrink-0">
                                {key}:
                            </span>
                            <span className="italic text-slate-600 dark:text-zinc-300 font-medium">
                                {val}
                            </span>
                        </div>
                    );
                }

                // 4. TEXTO PLANO
                return (
                    <p key={idx} className="text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
                        {line}
                    </p>
                );
            })}
        </div>
    );
}

export function TicketReportView({ report, isInteractive = false, onUpdateSection, onUpdateHeader }: TicketReportViewProps) {
    const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title?: string } | null>(null);
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

    const isRecommendationsTitle = (text: string) => {
        const lower = text.toLowerCase();
        return lower.includes('recomendaci') || lower.includes('sugerencia') || lower.includes('preventiv');
    };

    const isWarrantyTitle = (text: string) => {
        const lower = text.toLowerCase();
        return lower.includes('garant') || lower.includes('política') || lower.includes('terminos') || lower.includes('condicion');
    };

    const isDiagnosisTitle = (text: string) => {
        const lower = text.toLowerCase();
        return lower.includes('diagnóstic') || lower.includes('hallazgo') || lower.includes('inspecci');
    };

    const isSolutionTitle = (text: string) => {
        const lower = text.toLowerCase();
        return lower.includes('trabajo') || lower.includes('soluci') || lower.includes('ejecuci');
    };

    const renderSection = (section: TicketReportSection, index: number, allSections: TicketReportSection[]) => {
        const handleSave = (val: string) => {
            if (onUpdateSection) {
                if (section.type !== 'list') {
                    onUpdateSection(section.id, { content: val } as any);
                }
            }
            setEditingSectionId(null);
        };

        const prevSection = index > 0 ? allSections[index - 1] : null;
        const prevTitle = prevSection && (prevSection.type === 'h1' || prevSection.type === 'h2') ? (prevSection as TitleSection).content : '';

        switch (section.type) {
            case 'h1':
            case 'h2': {
                const titleText = (section as TitleSection).content;
                const isRec = isRecommendationsTitle(titleText);
                const isWar = isWarrantyTitle(titleText);
                const isDiag = isDiagnosisTitle(titleText);
                const isSol = isSolutionTitle(titleText);

                return (
                    <div key={section.id} className="mt-8 mb-3 first:mt-2">
                        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-zinc-800">
                            {isRec && <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />}
                            {isWar && <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />}
                            {isDiag && <FileText className="w-5 h-5 text-blue-600 shrink-0" />}
                            {isSol && <Wrench className="w-5 h-5 text-indigo-600 shrink-0" />}
                            {!isRec && !isWar && !isDiag && !isSol && <div className="w-2 h-5 bg-emerald-600 rounded-full shrink-0" />}
                            
                            <InlineEditableText
                                value={titleText}
                                onSave={handleSave}
                                disabled={!isInteractive}
                                className="text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight"
                                as="input"
                            />
                        </div>
                    </div>
                );
            }

            case 'text': {
                const textSection = section as TextSection;
                const isRecText = isRecommendationsTitle(prevTitle);
                const isWarText = isWarrantyTitle(prevTitle);
                const isEditing = editingSectionId === section.id;

                if (isRecText) {
                    return (
                        <div key={section.id} className="mb-6 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-amber-950 dark:text-amber-200">
                            <div className="flex items-start gap-3">
                                <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <InlineEditableText
                                        value={textSection.content}
                                        onSave={handleSave}
                                        disabled={!isInteractive}
                                        className="text-sm font-medium leading-relaxed whitespace-pre-line"
                                    />
                                </div>
                            </div>
                        </div>
                    );
                }

                if (isWarText) {
                    return (
                        <div key={section.id} className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300">
                            <div className="flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <InlineEditableText
                                        value={textSection.content}
                                        onSave={handleSave}
                                        disabled={!isInteractive}
                                        className="text-xs font-mono leading-relaxed whitespace-pre-line text-slate-600 dark:text-zinc-400"
                                    />
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={section.id} className="mb-4 text-slate-700 dark:text-zinc-300 group relative">
                        {isInteractive && !isEditing ? (
                            <div 
                                onClick={() => setEditingSectionId(section.id)}
                                className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 p-2 rounded-xl border border-transparent hover:border-dashed hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
                                title="Clic para editar texto"
                            >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-1 rounded-md shadow-xs flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                    <Edit3 className="w-3 h-3" /> Editar
                                </div>
                                <SmartFormattedReportContent text={textSection.content} />
                            </div>
                        ) : isInteractive && isEditing ? (
                            <div className="p-2 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                                <InlineEditableText
                                    value={textSection.content}
                                    onSave={handleSave}
                                    disabled={false}
                                    className="text-sm leading-relaxed"
                                />
                            </div>
                        ) : (
                            <SmartFormattedReportContent text={textSection.content} />
                        )}
                    </div>
                );
            }

            case 'list': {
                const listSec = section as ListSection;
                return (
                    <ul key={section.id} className="space-y-2 mb-5 text-sm pl-1">
                        {listSec.items.filter(item => item && item.trim()).map((rawItem, i) => {
                            const item = rawItem.trim();
                            const colonMatch = item.match(/^([^:\n]{2,45}):\s*(.*)$/);
                            if (colonMatch) {
                                const key = colonMatch[1].trim();
                                const val = colonMatch[2].trim();
                                return (
                                    <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-2 shrink-0" />
                                        <div className="flex-1">
                                            <span className="font-bold text-slate-900 dark:text-zinc-100">{key}:</span>{' '}
                                            <span className="italic text-slate-600 dark:text-zinc-300">{val}</span>
                                        </div>
                                    </li>
                                );
                            }
                            return (
                                <li key={i} className="flex items-start gap-2.5 leading-relaxed text-slate-700 dark:text-zinc-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-2 shrink-0" />
                                    <span>{item}</span>
                                </li>
                            );
                        })}
                    </ul>
                );
            }

            case 'beforeAfter':
                return (
                    <div key={section.id} className="mb-6">
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

            case 'photo': {
                const photoSection = section as PhotoSection;
                return (
                    <div key={section.id} className="mb-6 break-inside-avoid photo-container">
                        <div 
                            className="relative w-full aspect-video bg-slate-100 dark:bg-zinc-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm group cursor-pointer"
                            onClick={() => photoSection.photoUrl && setSelectedPhoto({ url: photoSection.photoUrl, title: photoSection.description })}
                        >
                            {photoSection.photoUrl ? (
                                <>
                                    <img
                                        src={photoSection.photoUrl}
                                        alt={photoSection.description || 'Evidencia'}
                                        className="w-full h-full object-contain photo-print"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1.5 font-medium">
                                        <ZoomIn className="w-4 h-4" /> Ampliar
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-xs">Sin imagen</div>
                            )}
                        </div>
                        {photoSection.description && (
                            <div className="mt-2 text-center text-xs text-slate-600 dark:text-zinc-400 italic font-medium">
                                {photoSection.description}
                            </div>
                        )}
                    </div>
                );
            }

            case 'gallery': {
                const gallerySection = section as GallerySection;
                if (!gallerySection.photos || gallerySection.photos.length === 0) return null;

                return (
                    <div key={section.id} className="mb-8 break-inside-avoid">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {gallerySection.photos.map((photo, index) => (
                                <div key={index} className="flex flex-col gap-1.5 page-break-inside-avoid group">
                                    <div 
                                        className="relative w-full aspect-[4/3] bg-slate-100 dark:bg-zinc-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm photo-container cursor-pointer transition-all hover:shadow-md hover:scale-[1.01]"
                                        onClick={() => setSelectedPhoto({ url: photo.photoUrl, title: photo.description || `Foto ${index + 1}` })}
                                    >
                                        <img
                                            src={photo.photoUrl}
                                            alt={photo.description || `Foto ${index + 1}`}
                                            className="w-full h-full object-contain bg-slate-100 dark:bg-zinc-900 photo-print"
                                            loading="lazy"
                                        />
                                        {photo.photoMeta?.phase && (
                                            <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider backdrop-blur-md ${
                                                photo.photoMeta.phase === 'BEFORE' 
                                                    ? 'bg-rose-600/90 text-white' 
                                                    : photo.photoMeta.phase === 'AFTER' 
                                                    ? 'bg-emerald-600/90 text-white' 
                                                    : 'bg-black/60 text-white'
                                            }`}>
                                                {photo.photoMeta.phase === 'BEFORE' ? 'Antes' : photo.photoMeta.phase === 'AFTER' ? 'Después' : 'Durante'}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                            <ZoomIn className="w-4 h-4" /> Ver
                                        </div>
                                    </div>
                                    {photo.description && (
                                        <p className="text-[11px] text-slate-600 dark:text-zinc-400 text-center italic px-1 font-medium line-clamp-2">
                                            {photo.description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            case 'divider':
                return <hr key={section.id} className="my-6 border-slate-200 dark:border-zinc-800" />;

            default:
                return null;
        }
    };

    return (
        <div className="report-page bg-white dark:bg-zinc-950 p-6 md:p-10 rounded-2xl max-w-4xl mx-auto shadow-sm border border-slate-200/80 dark:border-zinc-800">
            {/* Executive Header */}
            <header className="mb-8 pb-6 border-b-2 border-slate-200 dark:border-zinc-800">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-emerald-600/20">
                            H
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">HECHO SRL</h2>
                            <p className="text-xs text-slate-500 font-medium">Ingeniería, Climatización y Servicios Especializados</p>
                        </div>
                    </div>

                    <div className="text-left sm:text-right">
                        <span className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-200/60 font-mono">
                            {report.header.ticketNumber ? `TK #${report.header.ticketNumber}` : 'INFORME TÉCNICO'}
                        </span>
                        <p className="text-xs text-slate-500 mt-1 flex items-center sm:justify-end gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {report.header.date}
                        </p>
                    </div>
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-zinc-50 mb-4 tracking-tight">
                    {report.header.title}
                </h1>

                {/* Metadata Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-slate-50/80 dark:bg-zinc-900/60 p-4 rounded-2xl border border-slate-200/60 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Cliente</span>
                            <span className="font-bold text-slate-800 dark:text-zinc-200">{report.header.clientName || 'Cliente General'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Ubicación</span>
                            <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate">{report.header.address || 'En sitio'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-purple-600 shrink-0" />
                        <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Técnico Responsable</span>
                            <span className="font-semibold text-slate-800 dark:text-zinc-200">{report.header.technicianName || 'HECHO SRL'}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Sections Content */}
            <div className="space-y-2">
                {deduplicateReportSections(report.sections || []).map((section, index, allClean) => renderSection(section, index, allClean))}

                {/* Signatures */}
                {report.signatures && (
                    <div className="mt-12 pt-8 border-t border-slate-200 dark:border-zinc-800 break-inside-avoid">
                        <h3 className="text-sm font-bold mb-6 text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-center">
                            Conformidad y Aprobación del Servicio
                        </h3>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="flex flex-col items-center space-y-3">
                                <div className="h-28 w-full max-w-[220px] bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-center p-2">
                                    {report.signatures.technicianSignature ? (
                                        <img src={report.signatures.technicianSignature} alt="Firma Técnico" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <span className="text-slate-400 text-xs italic">Firma Electrónica Técnico</span>
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-xs text-slate-900 dark:text-zinc-200">
                                        {report.signatures.technicianName || report.header.technicianName || "Técnico Especialista"}
                                    </p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Técnico Responsable</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center space-y-3">
                                <div className="h-28 w-full max-w-[220px] bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-center p-2">
                                    {report.signatures.clientSignature ? (
                                        <img src={report.signatures.clientSignature} alt="Firma Cliente" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <span className="text-slate-400 text-xs italic">Firma del Cliente</span>
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-xs text-slate-900 dark:text-zinc-200">
                                        {report.signatures.clientName || report.header.clientName || "Cliente / Receptor"}
                                    </p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Cliente de Conformidad</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Photo Zoom Lightbox Dialog */}
            <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
                <DialogContent className="max-w-4xl p-2 bg-black/95 border-none text-white overflow-hidden">
                    {selectedPhoto && (
                        <div className="flex flex-col items-center justify-center p-2">
                            <img src={selectedPhoto.url} alt={selectedPhoto.title || 'Foto'} className="max-h-[80vh] w-auto object-contain rounded-lg" />
                            {selectedPhoto.title && (
                                <p className="text-sm text-slate-200 mt-3 text-center px-4 font-medium">{selectedPhoto.title}</p>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 1.5cm;
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
