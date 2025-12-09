"use client";

import { useState, useEffect } from "react";
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
    Minus,
    List,
    ListOrdered,
    Quote,
    Copy,
    ChevronDown,
    ChevronUp,
    Share2
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
    onDuplicate,
    isFirst,
    isLast,
    readOnly = false
}: {
    section: ReportSection,
    onChange: (s: ReportSection) => void,
    onDelete: () => void,
    onMoveUp: () => void,
    onMoveDown: () => void,
    onDuplicate: () => void,
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
            case 'h1': return <h1 style={style} className="text-3xl font-bold text-gray-900 mb-4 mt-6 break-after-avoid">{section.content}</h1>;
            case 'h2': return <h2 style={style} className="text-2xl font-bold text-gray-800 mb-3 mt-5 break-after-avoid">{section.content}</h2>;
            case 'h3': return <h3 style={style} className="text-xl font-semibold text-gray-800 mb-2 mt-4 break-after-avoid">{section.content}</h3>;
            case 'bullet-list':
                return (
                    <ul style={style} className="list-disc pl-5 space-y-1 mb-4">
                        {section.content?.split('\n').filter(item => item.trim()).map((item, i) => (
                            <li key={i} className="break-inside-avoid">{item}</li>
                        ))}
                    </ul>
                );
            case 'numbered-list':
                return (
                    <ol style={style} className="list-decimal pl-5 space-y-1 mb-4">
                        {section.content?.split('\n').filter(item => item.trim()).map((item, i) => <li key={i} className="break-inside-avoid">{item}</li>)}
                    </ol>
                );
            case 'blockquote':
                return <blockquote style={style} className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4 break-inside-avoid">{section.content}</blockquote>;
            case 'separator': return <hr className="my-6 border-gray-300" />;
            case 'photo':
                const sizeClass = section.attributes?.size === 'small' ? 'w-1/3' :
                    section.attributes?.size === 'medium' ? 'w-1/2' :
                        section.attributes?.size === 'large' ? 'w-3/4' :
                            'w-full';
                return (
                    <div className={`mb-6 break-inside-avoid ${sizeClass} mx-auto`}>
                        <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
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
                return <p style={style} className="mb-3 text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{section.content}</p>;
        }
    }

    // Render for Editor
    return (
        <div className="group relative border-2 border-transparent hover:border-blue-200 rounded-xl p-4 bg-white hover:shadow-md transition-all mb-4">
            {/* Block Controls (Top Right) */}
            <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onDuplicate} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Duplicar">
                    <Copy className="h-4 w-4" />
                </button>
                <button onClick={onMoveUp} disabled={isFirst} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30" title="Subir">
                    <MoveUp className="h-4 w-4" />
                </button>
                <button onClick={onMoveDown} disabled={isLast} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30" title="Bajar">
                    <MoveDown className="h-4 w-4" />
                </button>
                <button onClick={onDelete} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            {/* Drag Handle */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
            </div>

            <div className="pl-6">
                {/* Inline Toolbar for Text Blocks */}
                {section.type !== 'photo' && section.type !== 'separator' && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b flex-wrap">
                        <select
                            className="text-sm border rounded-lg px-3 py-1.5 bg-white font-medium"
                            value={section.type}
                            onChange={(e) => onChange({ ...section, type: e.target.value as ReportBlockType })}
                        >
                            <option value="text">Párrafo</option>
                            <option value="h1">Título Principal</option>
                            <option value="h2">Título Sección</option>
                            <option value="h3">Subtítulo</option>
                            <option value="bullet-list">Lista con Viñetas</option>
                            <option value="numbered-list">Lista Numerada</option>
                            <option value="blockquote">Cita</option>
                        </select>

                        <div className="h-6 w-px bg-gray-200" />

                        <button
                            className={`p-1.5 rounded ${section.attributes?.bold ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                            onClick={() => updateAttr({ bold: !section.attributes?.bold })}
                            title="Negrita"
                        >
                            <Bold className="h-4 w-4" />
                        </button>
                        <button
                            className={`p-1.5 rounded ${section.attributes?.italic ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                            onClick={() => updateAttr({ italic: !section.attributes?.italic })}
                            title="Cursiva"
                        >
                            <Italic className="h-4 w-4" />
                        </button>
                        <button
                            className={`p-1.5 rounded ${section.attributes?.underline ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                            onClick={() => updateAttr({ underline: !section.attributes?.underline })}
                            title="Subrayado"
                        >
                            <Underline className="h-4 w-4" />
                        </button>

                        <div className="h-6 w-px bg-gray-200" />

                        <button
                            className={`p-1.5 rounded ${section.attributes?.align === 'left' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                            onClick={() => updateAttr({ align: 'left' })}
                            title="Alinear Izquierda"
                        >
                            <AlignLeft className="h-4 w-4" />
                        </button>
                        <button
                            className={`p-1.5 rounded ${section.attributes?.align === 'center' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                            onClick={() => updateAttr({ align: 'center' })}
                            title="Centrar"
                        >
                            <AlignCenter className="h-4 w-4" />
                        </button>
                        <button
                            className={`p-1.5 rounded ${section.attributes?.align === 'right' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                            onClick={() => updateAttr({ align: 'right' })}
                            title="Alinear Derecha"
                        >
                            <AlignRight className="h-4 w-4" />
                        </button>
                        <button
                            className={`p-1.5 rounded ${section.attributes?.align === 'justify' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                            onClick={() => updateAttr({ align: 'justify' })}
                            title="Justificar"
                        >
                            <AlignJustify className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Photo Size Toolbar */}
                {section.type === 'photo' && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                        <span className="text-sm font-medium text-gray-700">Tamaño:</span>
                        <Button
                            variant={section.attributes?.size === 'small' ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateAttr({ size: 'small' })}
                        >
                            Pequeño
                        </Button>
                        <Button
                            variant={section.attributes?.size === 'medium' ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateAttr({ size: 'medium' })}
                        >
                            Mediano
                        </Button>
                        <Button
                            variant={section.attributes?.size === 'large' ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateAttr({ size: 'large' })}
                        >
                            Grande
                        </Button>
                        <Button
                            variant={!section.attributes?.size || section.attributes?.size === 'full' ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateAttr({ size: 'full' })}
                        >
                            Completo
                        </Button>
                    </div>
                )}

                {/* Content Input */}
                {section.type === 'separator' ? (
                    <hr className="my-4 border-gray-300" />
                ) : section.type === 'photo' ? (
                    <div className="flex gap-4">
                        <div className="relative w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 shrink-0 overflow-hidden">
                            {section.photoUrl ? (
                                <Image src={section.photoUrl} alt="Preview" fill className="object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <ImageIcon className="h-8 w-8" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 space-y-3">
                            <div>
                                <Label className="text-sm font-medium mb-1 block">URL de la imagen</Label>
                                <Input
                                    value={section.photoUrl || ''}
                                    onChange={(e) => onChange({ ...section, photoUrl: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium mb-1 block">Descripción</Label>
                                <Textarea
                                    value={section.description || section.details || ''}
                                    onChange={(e) => onChange({ ...section, description: e.target.value, details: e.target.value })}
                                    placeholder="Descripción o pie de foto..."
                                    className="min-h-[80px]"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <Textarea
                        value={section.content || ''}
                        onChange={(e) => updateContent(e.target.value)}
                        className={`min-h-[120px] resize-y border-none shadow-none focus-visible:ring-0 p-0 text-gray-800 ${section.type === 'h1' ? 'text-3xl font-bold' :
                            section.type === 'h2' ? 'text-2xl font-bold' :
                                section.type === 'h3' ? 'text-xl font-semibold' :
                                    section.type === 'blockquote' ? 'italic text-gray-600 pl-4 border-l-4 border-gray-300' :
                                        'text-base'
                            }`}
                        placeholder={
                            section.type === 'bullet-list' ? 'Escribe cada punto en una línea nueva...' :
                                section.type === 'numbered-list' ? 'Escribe cada ítem en una línea nueva...' :
                                    'Escribe aquí...'
                        }
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
    const [hasNewPhotos, setHasNewPhotos] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [report, setReport] = useState<TicketReport>({
        ticketId: ticket.id,
        header: {
            clientName: ticket.clientName,
            ticketNumber: ticket.ticketNumber || ticket.id.slice(0, 6),
            address: ticket.locationName || "",
            date: new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' }),
            technicianName: ticket.technicianName || "Técnico Asignado",
            title: "REPORTE TÉCNICO"
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

        // 4. Checklist
        if (t.checklist && t.checklist.length > 0) {
            sections.push({ id: crypto.randomUUID(), type: 'h2', content: 'Lista de Verificación' });
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

    // Check for new photos
    useEffect(() => {
        if (!loading && report.sections.length > 0) {
            const reportPhotoCount = report.sections.filter(s => s.type === 'photo').length;
            const ticketPhotoCount = ticket.photos?.length || 0;
            if (ticketPhotoCount > reportPhotoCount) {
                setHasNewPhotos(true);
            } else {
                setHasNewPhotos(false);
            }
        }
    }, [loading, report.sections, ticket.photos]);

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
            setHasNewPhotos(false);
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
            // Show success toast (you could use a toast library here)
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
            toast.textContent = '✓ Informe guardado correctamente';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
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
            content: type === 'text' ? '' : type === 'photo' ? '' : type === 'separator' ? '' : 'Nuevo Bloque',
            photoUrl: type === 'photo' ? '' : undefined
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

    const duplicateSection = (index: number) => {
        const sectionToDuplicate = report.sections[index];
        const duplicated = { ...sectionToDuplicate, id: crypto.randomUUID() };
        const newSections = [...report.sections];
        newSections.splice(index + 1, 0, duplicated);
        setReport({ ...report, sections: newSections });
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

    const handleShare = () => {
        const url = `${window.location.origin}/tickets/${ticket.id}`;
        navigator.clipboard.writeText(url);
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.textContent = '✓ Enlace copiado al portapapeles';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    if (currentUserRole === 'TECNICO') {
        return <div className="p-8 text-center text-red-500">No tienes permiso para ver este informe.</div>;
    }

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Sticky Action Bar */}
            <div className="sticky top-0 z-20 bg-white border-b shadow-sm print:hidden">
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-gray-900">Editor de Informe</h2>
                        {hasNewPhotos && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                Nuevas fotos disponibles
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                            <Share2 className="h-4 w-4" />
                            Compartir
                        </Button>
                        <Button variant="outline" size="sm" onClick={reloadFromTicket} className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Recargar
                        </Button>
                        <Button onClick={saveReport} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Guardar
                        </Button>
                        <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Printer className="h-4 w-4" />
                            Exportar PDF
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Editor Sidebar */}
                <div className={`${sidebarCollapsed ? 'w-16' : 'w-96'} bg-white border-r transition-all duration-300 print:hidden flex flex-col`}>
                    <div className="p-4 border-b flex items-center justify-between">
                        {!sidebarCollapsed && <h3 className="font-semibold text-gray-900">Bloques de Contenido</h3>}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            {sidebarCollapsed ? <ChevronDown className="h-5 w-5 rotate-90" /> : <ChevronUp className="h-5 w-5 -rotate-90" />}
                        </button>
                    </div>

                    {!sidebarCollapsed && (
                        <>
                            {/* Header Config */}
                            <div className="p-4 border-b space-y-3">
                                <div>
                                    <Label className="text-xs font-medium text-gray-700">Título del Reporte</Label>
                                    <Input
                                        value={report.header.title}
                                        onChange={(e) => setReport({ ...report, header: { ...report.header, title: e.target.value } })}
                                        className="mt-1"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-xs font-medium text-gray-700">Técnico</Label>
                                        <Input
                                            value={report.header.technicianName}
                                            onChange={(e) => setReport({ ...report, header: { ...report.header, technicianName: e.target.value } })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-medium text-gray-700">Fecha</Label>
                                        <Input
                                            value={report.header.date}
                                            onChange={(e) => setReport({ ...report, header: { ...report.header, date: e.target.value } })}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Add Block Buttons */}
                            <div className="p-4 border-b">
                                <Label className="text-xs font-medium text-gray-700 mb-2 block">Agregar Bloque</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" size="sm" onClick={() => addBlock('text')} className="justify-start gap-2">
                                        <Type className="h-4 w-4" />
                                        Texto
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addBlock('h2')} className="justify-start gap-2">
                                        <Heading2 className="h-4 w-4" />
                                        Título
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addBlock('bullet-list')} className="justify-start gap-2">
                                        <List className="h-4 w-4" />
                                        Lista
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addBlock('numbered-list')} className="justify-start gap-2">
                                        <ListOrdered className="h-4 w-4" />
                                        Numerada
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addBlock('photo')} className="justify-start gap-2">
                                        <ImageIcon className="h-4 w-4" />
                                        Foto
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addBlock('separator')} className="justify-start gap-2">
                                        <Minus className="h-4 w-4" />
                                        Separador
                                    </Button>
                                </div>
                            </div>

                            {/* Blocks List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {report.sections.map((section, index) => (
                                    <BlockRenderer
                                        key={section.id}
                                        section={section}
                                        onChange={(s) => updateSection(index, s)}
                                        onDelete={() => deleteSection(index)}
                                        onDuplicate={() => duplicateSection(index)}
                                        onMoveUp={() => moveSection(index, 'up')}
                                        onMoveDown={() => moveSection(index, 'down')}
                                        isFirst={index === 0}
                                        isLast={index === report.sections.length - 1}
                                    />
                                ))}
                                {report.sections.length === 0 && (
                                    <div className="text-center py-12 text-gray-400">
                                        <FileDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">No hay bloques aún</p>
                                        <p className="text-xs mt-1">Usa los botones de arriba para agregar contenido</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Live Preview */}
                <div className="flex-1 overflow-y-auto bg-gray-100 p-8 print:p-0 print:bg-white">
                    {/* Print-only Header (Fixed on every page) */}
                    <div id="print-header" className="hidden print:block print:fixed print:top-0 print:left-0 print:right-0 print:z-50 bg-white">
                        <div className="h-3 bg-[#556B2F]"></div>
                        <div className="px-16 pt-6 pb-4 bg-white border-b-2 border-gray-200">
                            <div className="flex justify-between items-start">
                                <div className="w-1/2">
                                    {companySettings?.logoUrl ? (
                                        <div className="h-10 w-32 relative mb-2">
                                            <img
                                                src={companySettings.logoUrl}
                                                alt="Logo"
                                                className="h-full w-full object-contain object-left"
                                                crossOrigin="anonymous"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-10 w-32 bg-gray-200 flex items-center justify-center text-gray-500 text-xs mb-2">
                                            LOGO
                                        </div>
                                    )}
                                    <h1 className="text-xl font-bold text-[#556B2F] uppercase">{report.header.title}</h1>
                                </div>
                                <div className="w-1/2 text-right space-y-0.5 text-xs text-gray-600">
                                    <p className="font-bold text-gray-900 text-sm">#{report.header.ticketNumber}</p>
                                    <p><span className="font-semibold">Cliente:</span> {report.header.clientName}</p>
                                    <p><span className="font-semibold">Ubicación:</span> {report.header.address}</p>
                                    <p><span className="font-semibold">Fecha:</span> {report.header.date}</p>
                                    <p><span className="font-semibold">Técnico:</span> {report.header.technicianName}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-[21cm] mx-auto bg-white shadow-2xl print:shadow-none print:max-w-none">
                        {/* Screen Header - Only on screen */}
                        <div className="print:hidden px-16 pt-12 pb-8">
                            <div className="flex justify-between items-start">
                                <div className="w-1/2">
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
                        </div>

                        {/* Content */}
                        <div className="px-16 py-8 print:pt-[140px] min-h-[800px]">
                            {report.sections.map((section) => (
                                <BlockRenderer
                                    key={section.id}
                                    section={section}
                                    onChange={() => { }}
                                    onDelete={() => { }}
                                    onDuplicate={() => { }}
                                    onMoveUp={() => { }}
                                    onMoveDown={() => { }}
                                    isFirst={false}
                                    isLast={false}
                                    readOnly={true}
                                />
                            ))}
                        </div>

                        {/* Footer - Only on last page */}
                        <div className="px-16 pb-12 mt-12 break-inside-avoid">
                            <div className="pt-8 border-t-2 border-gray-100 grid grid-cols-2 gap-12">
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

                            <div className="mt-8 text-center text-xs text-gray-400">
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
            </div>

            <style jsx global>{`
                @media print {
                    @page { 
                        margin: 140px 0 0 0;
                        size: letter;
                    }
                    
                    body { 
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    #print-header {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        z-index: 9999 !important;
                        background: white !important;
                    }
                    
                    .print\\:fixed {
                        position: fixed !important;
                    }
                    
                    .print\\:top-0 {
                        top: 0 !important;
                    }
                    
                    .print\\:left-0 {
                        left: 0 !important;
                    }
                    
                    .print\\:right-0 {
                        right: 0 !important;
                    }
                    
                    .print\\:z-50 {
                        z-index: 9999 !important;
                    }
                    
                    .print\\:pt-\\[140px\\] {
                        padding-top: 140px !important;
                    }
                    
                    .break-inside-avoid {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                    
                    .break-after-avoid {
                        break-after: avoid;
                        page-break-after: avoid;
                    }
                }
            `}</style>
        </div>
    );
}
