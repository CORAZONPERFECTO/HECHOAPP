"use client";

import { TicketReportSection, TitleSection, TextSection, ListSection, PhotoSection } from "@/types/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, Copy } from "lucide-react";
import Image from "next/image";

interface SectionEditorProps {
    section: TicketReportSection;
    onChange: (section: TicketReportSection) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
}

export function SectionEditor({
    section,
    onChange,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast
}: SectionEditorProps) {
    const renderEditor = () => {
        switch (section.type) {
            case 'h1':
            case 'h2':
                return (
                    <div>
                        <Label className="text-sm font-medium mb-2 block">
                            {section.type === 'h1' ? 'Título Principal' : 'Título de Sección'}
                        </Label>
                        <Input
                            value={(section as TitleSection).content}
                            onChange={(e) => onChange({ ...section, content: e.target.value } as TitleSection)}
                            className="text-lg font-semibold"
                            placeholder="Escribe el título..."
                        />
                    </div>
                );

            case 'text':
                return (
                    <div>
                        <Label className="text-sm font-medium mb-2 block">Texto</Label>
                        <Textarea
                            value={(section as TextSection).content}
                            onChange={(e) => onChange({ ...section, content: e.target.value } as TextSection)}
                            className="min-h-[120px]"
                            placeholder="Escribe el contenido..."
                        />
                    </div>
                );

            case 'list':
                return (
                    <div>
                        <Label className="text-sm font-medium mb-2 block">
                            Lista (un item por línea)
                        </Label>
                        <Textarea
                            value={(section as ListSection).items.join('\n')}
                            onChange={(e) => {
                                const items = e.target.value.split('\n');
                                onChange({ ...section, items } as ListSection);
                            }}
                            className="min-h-[120px] font-mono text-sm"
                            placeholder="Item 1&#10;Item 2&#10;Item 3"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {(section as ListSection).items.length} items
                        </p>
                    </div>
                );

            case 'photo':
                const photoSection = section as PhotoSection;
                return (
                    <div className="space-y-3">
                        <div className="flex gap-4">
                            <div className="relative w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 shrink-0 overflow-hidden">
                                {photoSection.photoUrl ? (
                                    <Image
                                        src={photoSection.photoUrl}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                                        Sin imagen
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 space-y-2">
                                <div>
                                    <Label className="text-sm font-medium mb-1 block">URL de la imagen</Label>
                                    <Input
                                        value={photoSection.photoUrl}
                                        onChange={(e) => onChange({ ...section, photoUrl: e.target.value } as PhotoSection)}
                                        placeholder="https://..."
                                        className="text-sm"
                                    />
                                </div>
                                {photoSection.photoMeta && (
                                    <div className="flex gap-2 text-xs text-gray-500">
                                        {photoSection.photoMeta.phase && (
                                            <span className="px-2 py-1 bg-gray-100 rounded">
                                                {photoSection.photoMeta.phase}
                                            </span>
                                        )}
                                        {photoSection.photoMeta.area && (
                                            <span className="px-2 py-1 bg-gray-100 rounded">
                                                {photoSection.photoMeta.area}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <Label className="text-sm font-medium mb-1 block">Descripción</Label>
                            <Textarea
                                value={photoSection.description || ''}
                                onChange={(e) => onChange({ ...section, description: e.target.value } as PhotoSection)}
                                placeholder="Descripción de la imagen..."
                                className="min-h-[60px]"
                            />
                        </div>
                    </div>
                );

            case 'divider':
                return (
                    <div className="py-4">
                        <hr className="border-2 border-gray-300" />
                        <p className="text-center text-xs text-gray-500 mt-2">Separador</p>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="group relative border-2 border-gray-200 hover:border-blue-300 rounded-lg p-4 bg-white transition-all">
            {/* Drag Handle */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                <GripVertical className="h-5 w-5 text-gray-400" />
            </div>

            {/* Controls */}
            <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDuplicate}
                    className="h-8 w-8 p-0"
                    title="Duplicar"
                >
                    <Copy className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Eliminar"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Content */}
            <div className="pl-6">
                {renderEditor()}
            </div>
        </div>
    );
}
