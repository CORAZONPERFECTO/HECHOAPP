"use client";

import { useState, useEffect, useRef } from "react";
import { Ticket, TicketReport, ReportSection, UserRole, ReportBlockType, ReportBlockAttributes, CompanySettings } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    MoveUp,
    MoveDown,
    Trash2,
    Plus,
    FileDown,
    Printer,
    GripVertical,
    Type,
    Image as ImageIcon,
    Save,
    Loader2,
    RefreshCw,
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Heading2,
    Minus
} from "lucide-react";
import Image from "next/image";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ReportEditorProps {
    ticket: Ticket;
    currentUserRole?: UserRole;
}

// --- Block Components ---

const BlockRenderer = ({
    section,
    onChange,
    onDelete,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast,
    readOnly = false
}: {
    section: ReportSection,
    onChange: (s: ReportSection) => void,
    onDelete: () => void,
    onMoveUp: () => void,
    onMoveDown: () => void,
    isFirst: boolean,
    isLast: boolean,
    readOnly?: boolean
}) => {
    const updateContent = (content: string) => onChange({ ...section, content });
    const updateAttr = (attr: Partial<ReportBlockAttributes>) => onChange({ ...section, attributes: { ...section.attributes, ...attr } });

    if (readOnly) {
        // Render for Print/Preview
        const style = {
            textAlign: section.attributes?.align || 'left',
            fontWeight: section.attributes?.bold ? 'bold' : 'normal',
            fontStyle: section.attributes?.italic ? 'italic' : 'normal',
            textDecoration: section.attributes?.underline ? 'underline' : 'none',
        };

        switch (section.type) {
            case 'h1': return <h1 style={style} className="text-3xl font-bold text-gray-900 mb-4 mt-6">{section.content}</h1>;
            case 'h2': return <h2 style={style} className="text-2xl font-bold text-gray-800 mb-3 mt-5">{section.content}</h2>;
            case 'h3': return <h3 style={style} className="text-xl font-semibold text-gray-800 mb-2 mt-4">{section.content}</h3>;
            case 'bullet-list':
                return (
                    <ul style={style} className="list-disc pl-5 space-y-1 mb-4 print:grid print:grid-cols-2 print:gap-x-4 print:gap-y-1 print:pl-0 print:list-none">
                        {section.content?.split('\n').map((item, i) => (
                            <li key={i} className="break-inside-avoid">
                                {item}
                            </li>
                        ))}
                    </ul>
                );
            case 'numbered-list':
                return (
                    <ol style={style} className="list-decimal pl-5 space-y-1 mb-4">
                        {section.content?.split('\n').map((item, i) => <li key={i}>{item}</li>)}
                    </ol>
                );
            case 'blockquote':
                return <blockquote style={style} className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">{section.content}</blockquote>;
            case 'separator': return <hr className="my-6 border-gray-300" />;
            case 'photo':
                return (
                    <div className="mb-6 break-inside-avoid">
                        <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                            {/* Use standard img tag for better print compatibility */}
                            {section.photoUrl && (
                                <img
                                    src={section.photoUrl}
                                    alt="Evidence"
                                    className="w-full h-full object-contain"
                                    crossOrigin="anonymous"
                                />
                            )}
                        </div>
                        {(section.description || section.details) && (
                            <p className="mt-2 text-sm text-gray-600 text-center italic">
                                {section.description || section.details}
                            </p>
                        )}
                    </div>
                );
            default: // text / paragraph
                return <p style={style} className="mb-3 text-gray-700 leading-relaxed whitespace-pre-wrap">{section.content}</p>;
        }
    }

    // Render for Editor
    return (
        <div className="group relative border rounded-lg p-3 bg-white hover:shadow-sm transition-all mb-3">
            {/* Block Controls (Left) */}
            <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-50 rounded-l-lg border-r">
                <button onClick={onMoveUp} disabled={isFirst} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><MoveUp className="h-3 w-3" /></button>
                <GripVertical className="h-3 w-3 text-gray-400 cursor-grab" />
                <button onClick={onMoveDown} disabled={isLast} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><MoveDown className="h-3 w-3" /></button>
                <button onClick={onDelete} className="p-1 hover:bg-red-100 text-red-500 rounded mt-2"><Trash2 className="h-3 w-3" /></button>
            </div>

            <div className="pl-8">
                {/* Toolbar for Text Blocks */}
                {section.type !== 'photo' && section.type !== 'separator' && (
                    <div className="flex items-center gap-1 mb-2 border-b pb-2 overflow-x-auto">
                        <Button variant={section.attributes?.bold ? "secondary" : "ghost"} size="icon" className="h-6 w-6" onClick={() => updateAttr({ bold: !section.attributes?.bold })}><Bold className="h-3 w-3" /></Button>
                        <Button variant={section.attributes?.italic ? "secondary" : "ghost"} size="icon" className="h-6 w-6" onClick={() => updateAttr({ italic: !section.attributes?.italic })}><Italic className="h-3 w-3" /></Button>
                        <Button variant={section.attributes?.underline ? "secondary" : "ghost"} size="icon" className="h-6 w-6" onClick={() => updateAttr({ underline: !section.attributes?.underline })}><Underline className="h-3 w-3" /></Button>
                        <div className="w-px h-4 bg-gray-200 mx-1" />
                        <Button variant={section.attributes?.align === 'left' ? "secondary" : "ghost"} size="icon" className="h-6 w-6" onClick={() => updateAttr({ align: 'left' })}><AlignLeft className="h-3 w-3" /></Button>
                        <Button variant={section.attributes?.align === 'center' ? "secondary" : "ghost"} size="icon" className="h-6 w-6" onClick={() => updateAttr({ align: 'center' })}><AlignCenter className="h-3 w-3" /></Button>
                        <Button variant={section.attributes?.align === 'right' ? "secondary" : "ghost"} size="icon" className="h-6 w-6" onClick={() => updateAttr({ align: 'right' })}><AlignRight className="h-3 w-3" /></Button>
                        <Button variant={section.attributes?.align === 'justify' ? "secondary" : "ghost"} size="icon" className="h-6 w-6" onClick={() => updateAttr({ align: 'justify' })}><AlignJustify className="h-3 w-3" /></Button>
                        <div className="w-px h-4 bg-gray-200 mx-1" />
                        <select
                            className="text-xs border rounded px-1 h-6 bg-transparent"
                            value={section.type}
                            onChange={(e) => onChange({ ...section, type: e.target.value as ReportBlockType })}
                        >
                            <option value="text">Normal</option>
                            <option value="h1">Título 1</option>
                            <option value="h2">Título 2</option>
                            <option value="h3">Título 3</option>
                            <option value="bullet-list">Lista Puntos</option>
                            <option value="numbered-list">Lista Num.</option>
                            <option value="blockquote">Cita</option>
                        </select>
                    </div>
                )}

                {/* Content Input */}
                {section.type === 'separator' ? (
                    <hr className="my-4 border-gray-300" />
                ) : section.type === 'photo' ? (
                    <div className="flex gap-4">
                        <div className="relative w-24 h-24 bg-gray-100 rounded border shrink-0">
                            {section.photoUrl ? (
                                <Image src={section.photoUrl} alt="Preview" fill className="object-cover rounded" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400"><ImageIcon className="h-6 w-6" /></div>
                            )}
                        </div>
                        <div className="flex-1 space-y-2">
                            <Input
                                value={section.photoUrl || ''}
                                onChange={(e) => onChange({ ...section, photoUrl: e.target.value })}
                                placeholder="URL de la imagen"
                                className="text-xs"
                            />
                            <Textarea
                                value={section.description || section.details || ''}
                                onChange={(e) => onChange({ ...section, description: e.target.value, details: e.target.value })}
                                placeholder="Descripción o pie de foto..."
                                className="text-sm min-h-[60px]"
                            />
                        </div>
                    </div>
                ) : (
                    <Textarea
                        value={section.content || ''}
                        onChange={(e) => updateContent(e.target.value)}
                        className={`min-h-[40px] resize-y border-none shadow-none focus-visible:ring-0 p-0 text-gray-800 ${section.type === 'h1' ? 'text-2xl font-bold' :
                            section.type === 'h2' ? 'text-xl font-bold' :
                                section.type === 'h3' ? 'text-lg font-semibold' :
                                    section.type === 'blockquote' ? 'italic text-gray-600 pl-4 border-l-2' :
                                        'text-base'
                            }`}
                        placeholder="Escribe aquí..."
                        style={{
                            textAlign: section.attributes?.align,
                            fontWeight: section.attributes?.bold ? 'bold' : 'normal',
                            fontStyle: section.attributes?.italic ? 'italic' : 'normal',
                            textDecoration: section.attributes?.underline ? 'underline' : 'none',
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export function ReportEditor({ ticket, currentUserRole }: ReportEditorProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [report, setReport] = useState<TicketReport>({
        ticketId: ticket.id,
        header: {
            clientName: ticket.clientName,
            ticketNumber: ticket.ticketNumber || ticket.id.slice(0, 6),
            address: ticket.locationName || "",
            date: new Date().toLocaleDateString(),
            technicianName: "Técnico Asignado",
            title: "Reporte Técnico"
        },
        sections: []
    });

    const generateSectionsFromTicket = (t: Ticket): ReportSection[] => {
        const sections: ReportSection[] = [];

        // 1. Diagnosis
        if (t.diagnosis) {
            sections.push({ id: crypto.randomUUID(), type: 'h2', content: 'Diagnóstico' });
            sections.push({ id: crypto.randomUUID(), type: 'text', content: t.diagnosis });
        }

        // 2. Solution
        if (t.solution) {
            sections.push({ id: crypto.randomUUID(), type: 'h2', content: 'Solución Aplicada' });
            sections.push({ id: crypto.randomUUID(), type: 'text', content: t.solution });
        }

        // 3. Photos (Grouped by Stage)
        if (t.photos && t.photos.length > 0) {
            sections.push({ id: crypto.randomUUID(), type: 'h2', content: 'Evidencia Fotográfica' });

            const photosBefore = t.photos.filter(p => p.type === 'BEFORE');
            const photosDuring = t.photos.filter(p => p.type === 'DURING');
            const photosAfter = t.photos.filter(p => p.type === 'AFTER');

            if (photosBefore.length > 0) {
                sections.push({ id: crypto.randomUUID(), type: 'h3', content: 'Antes' });
                photosBefore.forEach(photo => {
                    if (photo.url) {
                        sections.push({
                            id: crypto.randomUUID(),
                            type: 'photo',
                            photoUrl: photo.url,
                            description: photo.description || photo.details || '',
                            area: photo.area
                        });
                    }
                });
            }

            if (photosDuring.length > 0) {
                sections.push({ id: crypto.randomUUID(), type: 'h3', content: 'Durante' });
                photosDuring.forEach(photo => {
                    if (photo.url) {
                        sections.push({
                            id: crypto.randomUUID(),
                            type: 'photo',
                            photoUrl: photo.url,
                            description: photo.description || photo.details || '',
                            area: photo.area
                        });
                    }
                });
            }

            if (photosAfter.length > 0) {
                sections.push({ id: crypto.randomUUID(), type: 'h3', content: 'Después' });
                photosAfter.forEach(photo => {
                    if (photo.url) {
                        sections.push({
                            id: crypto.randomUUID(),
                            type: 'photo',
                            photoUrl: photo.url,
                            description: photo.description || photo.details || '',
                            area: photo.area
                        });
                    }
                });
            }
        }

        // 4. Checklist (New!)
        if (t.checklist && t.checklist.length > 0) {
            sections.push({ id: crypto.randomUUID(), type: 'h2', content: 'Lista de Verificación' });
            // Use a special format for checklist to render it better
            // We'll store it as a JSON string in content to parse it in the renderer, or just formatted text
            // For now, let's stick to text but ensure we access the right property
            // The schema says 'text', but let's be safe
            const checklistText = t.checklist.map(item => {
                const text = item.text || (item as any).label || "Item sin nombre";
                return `${item.checked ? '✅' : '⬜'} ${text}`;
            }).join('\n');
            sections.push({ id: crypto.randomUUID(), type: 'bullet-list', content: checklistText });
        }

        // 5. Recommendations
        if (t.recommendations) {
            sections.push({ id: crypto.randomUUID(), type: 'h2', content: 'Recomendaciones' });
            sections.push({ id: crypto.randomUUID(), type: 'text', content: t.recommendations });
        }

        return sections;
    };

    // Load existing report or initialize from ticket
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load Company Settings
                const companyDoc = await getDoc(doc(db, "settings", "company"));
                if (companyDoc.exists()) {
                    setCompanySettings(companyDoc.data() as CompanySettings);
                }

                // Load Report
                const reportRef = doc(db, "ticketReports", ticket.id);
                const reportDoc = await getDoc(reportRef);

                if (reportDoc.exists()) {
                    setReport(reportDoc.data() as TicketReport);
                } else {
                    setReport(prev => ({ ...prev, sections: generateSectionsFromTicket(ticket) }));
                }
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [ticket.id]);

    const reloadFromTicket = () => {
        if (confirm("¿Recargar datos del ticket? Se perderán los cambios manuales.")) {
            const newSections = generateSectionsFromTicket(ticket);
            setReport(prev => ({
                ...prev,
                header: {
                    ...prev.header,
                    clientName: ticket.clientName,
                    address: ticket.locationName,
                },
                sections: newSections
            }));
        }
    };

    const saveReport = async () => {
        setSaving(true);
        try {
            const reportRef = doc(db, "ticketReports", ticket.id);
            await setDoc(reportRef, {
                ...report,
                updatedAt: serverTimestamp()
            });
            alert("Informe guardado correctamente.");
        } catch (error) {
            console.error("Error saving report:", error);
            alert("Error al guardar el informe.");
        } finally {
            setSaving(false);
        }
    };

    const addBlock = (type: ReportBlockType) => {
        const newBlock: ReportSection = {
            id: crypto.randomUUID(),
            type,
            content: type === 'text' ? '' : type === 'photo' ? '' : 'Nuevo Bloque',
            photoUrl: type === 'photo' ? 'https://placehold.co/600x400?text=Foto' : undefined
        };
        setReport(prev => ({ ...prev, sections: [...prev.sections, newBlock] }));
    };

    const updateSection = (index: number, updatedSection: ReportSection) => {
        const newSections = [...report.sections];
        newSections[index] = updatedSection;
        setReport({ ...report, sections: newSections });
    };

    const deleteSection = (index: number) => {
        if (confirm("¿Eliminar bloque?")) {
            const newSections = report.sections.filter((_, i) => i !== index);
            setReport({ ...report, sections: newSections });
        }
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const newSections = [...report.sections];
        if (direction === 'up' && index > 0) {
            [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
        } else if (direction === 'down' && index < newSections.length - 1) {
            [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
        }
        setReport({ ...report, sections: newSections });
    };

    const handlePrint = () => {
        window.print();
    };

    if (currentUserRole === 'TECNICO') {
        return <div className="p-8 text-center text-red-500">No tienes permiso para ver este informe.</div>;
    }

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Editor Sidebar */}
            <div className="w-full lg:w-1/3 space-y-4 print:hidden overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold flex items-center gap-2">
                                <FileDown className="h-4 w-4" />
                                Configuración
                            </h3>
                            <Button variant="ghost" size="sm" onClick={reloadFromTicket} title="Recargar datos">
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Título</Label>
                                <Input value={report.header.title} onChange={(e) => setReport({ ...report, header: { ...report.header, title: e.target.value } })} className="h-8" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Técnico</Label>
                                <Input value={report.header.technicianName} onChange={(e) => setReport({ ...report, header: { ...report.header, technicianName: e.target.value } })} className="h-8" />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1 pt-2">
                            <Button variant="outline" size="sm" onClick={() => addBlock('text')} title="Texto"><Type className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => addBlock('h2')} title="Título"><Heading2 className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => addBlock('photo')} title="Foto"><ImageIcon className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => addBlock('separator')} title="Separador"><Minus className="h-4 w-4" /></Button>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button onClick={saveReport} disabled={saving} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Guardar
                            </Button>
                            <Button onClick={handlePrint} variant="secondary" className="flex-1 gap-2">
                                <Printer className="h-4 w-4" />
                                PDF
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-2 pb-20">
                    {report.sections.map((section, index) => (
                        <BlockRenderer
                            key={section.id}
                            section={section}
                            onChange={(s) => updateSection(index, s)}
                            onDelete={() => deleteSection(index)}
                            onMoveUp={() => moveSection(index, 'up')}
                            onMoveDown={() => moveSection(index, 'down')}
                            isFirst={index === 0}
                            isLast={index === report.sections.length - 1}
                        />
                    ))}
                </div>
            </div>

            {/* Preview / Print View */}
            <div className="flex-1 bg-white shadow-lg rounded-lg p-8 print:shadow-none print:p-0 print:w-full overflow-y-auto max-h-[calc(100vh-200px)] print:max-h-none">
                <div className="max-w-[21cm] mx-auto print:max-w-none min-h-[29.7cm] relative">
                    {/* Corporate Header */}
                    <div className="absolute top-0 left-0 w-full h-3 bg-[#556B2F] print:block hidden"></div> {/* Green Band */}

                    <div className="px-8 print:px-16">
                        <div className="flex justify-between items-start mb-12 pt-8">
                            <div className="w-1/2">
                                {/* Logo Placeholder */}
                                {companySettings?.logoUrl ? (
                                    <div className="h-16 w-48 relative mb-4">
                                        <img
                                            src={companySettings.logoUrl}
                                            alt="Logo"
                                            className="h-full w-full object-contain object-left"
                                            crossOrigin="anonymous"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-16 w-48 bg-gray-200 flex items-center justify-center text-gray-500 text-xs mb-4">
                                        LOGO HECHO SRL
                                    </div>
                                )}
                                <h1 className="text-3xl font-bold text-[#556B2F] uppercase tracking-wide">{report.header.title}</h1>
                            </div>
                            <div className="w-1/2 text-right space-y-1 text-sm text-gray-600">
                                <p className="font-bold text-gray-900 text-lg mb-2">#{report.header.ticketNumber}</p>
                                <p><span className="font-semibold">Cliente:</span> {report.header.clientName}</p>
                                <p><span className="font-semibold">Ubicación:</span> {report.header.address}</p>
                                <p><span className="font-semibold">Fecha:</span> {report.header.date}</p>
                                <p><span className="font-semibold">Técnico:</span> {report.header.technicianName}</p>
                            </div>
                        </div>

                        {/* Content Blocks */}
                        <div className="space-y-2">
                            {report.sections.map((section) => (
                                <BlockRenderer
                                    key={section.id}
                                    section={section}
                                    onChange={() => { }}
                                    onDelete={() => { }}
                                    onMoveUp={() => { }}
                                    onMoveDown={() => { }}
                                    isFirst={false}
                                    isLast={false}
                                    readOnly={true}
                                />
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="mt-20 pt-8 border-t-2 border-gray-100 grid grid-cols-2 gap-12 break-inside-avoid">
                            <div className="text-center">
                                <div className="h-24 border-b border-gray-300 mb-2"></div>
                                <p className="font-semibold text-gray-700">Firma del Técnico</p>
                            </div>
                            <div className="text-center">
                                <div className="h-24 border-b border-gray-300 mb-2 flex items-end justify-center">
                                    {ticket.clientSignature && (
                                        <img src={ticket.clientSignature} alt="Firma Cliente" className="h-16 object-contain" />
                                    )}
                                </div>
                                <p className="font-semibold text-gray-700">Firma del Cliente</p>
                            </div>
                        </div>

                        <div className="mt-12 text-center text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
                            <p>{companySettings?.name || "HECHO SRL - Servicios Generales y Mantenimiento"}</p>
                            <p>
                                {companySettings?.phone && `Tel: ${companySettings.phone} | `}
                                {companySettings?.email && `Email: ${companySettings.email} | `}
                                {companySettings?.rnc && `RNC: ${companySettings.rnc}`}
                            </p>
                            {companySettings?.address && <p>{companySettings.address}</p>}
                            {companySettings?.website && <p>{companySettings.website}</p>}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body { -webkit-print-color-adjust: exact; }
                    .print\\:hidden { display: none !important; }
                    .print\\:block { display: block !important; }
                    .print\\:max-w-none { max-width: none !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:p-0 { padding: 0 !important; }
                    .print\\:w-full { width: 100% !important; }
                    .print\\:max-h-none { max-height: none !important; }
                }
            `}</style>
        </div>
    );
}
