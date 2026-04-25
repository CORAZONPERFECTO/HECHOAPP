"use client";

import { useState } from "react";
import { Intervention } from "@/types/hvac";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, FileText, User, ShieldCheck, Send, MessageCircle, Printer } from "lucide-react";

interface InterventionTimelineProps {
    interventions: Intervention[];
    currentUser?: any;
    onAddComment?: (interventionId: string, text: string) => Promise<void>;
}

export function InterventionTimeline({ interventions, currentUser, onAddComment }: InterventionTimelineProps) {
    // State to track which intervention is being replied to { interventionId: text }
    const [replyState, setReplyState] = useState<Record<string, string>>({});
    const [openReply, setOpenReply] = useState<Record<string, boolean>>({});
    const [sending, setSending] = useState<Record<string, boolean>>({});

    const handleSend = async (id: string) => {
        const text = replyState[id];
        if (!text || !text.trim() || !onAddComment) return;

        setSending(prev => ({ ...prev, [id]: true }));
        try {
            await onAddComment(id, text);
            setReplyState(prev => ({ ...prev, [id]: "" }));
            setOpenReply(prev => ({ ...prev, [id]: false }));
        } catch (error) {
            console.error("Error sending comment", error);
        } finally {
            setSending(prev => ({ ...prev, [id]: false }));
        }
    };

    if (interventions.length === 0) {
        return <div className="text-center py-8 text-gray-500">No hay intervenciones registradas.</div>;
    }

    return (
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {interventions.map((event, index) => (
                <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">

                    {/* Icon / Marker */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        {event.type === 'PREVENTIVE' && <ShieldCheck className="w-5 h-5 text-green-600" />}
                        {event.type === 'CORRECTIVE' && <WrenchIcon className="w-5 h-5 text-orange-600" />}
                        {event.type === 'DIAGNOSIS' && <FileText className="w-5 h-5 text-blue-600" />}
                        {!['PREVENTIVE', 'CORRECTIVE', 'DIAGNOSIS'].includes(event.type) && <FileText className="w-5 h-5 text-gray-500" />}
                    </div>

                    {/* Content Card */}
                    <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                                <div>
                                    <Badge variant="outline" className="mb-2">{event.type}</Badge>
                                    <CardTitle className="text-base font-semibold text-gray-800">
                                        {event.summary}
                                    </CardTitle>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                        {format(event.createdAt.toDate(), "dd MMM yyyy, HH:mm", { locale: es })}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-gray-400 hover:text-blue-600"
                                        title="Imprimir Reporte PDF"
                                        onClick={() => window.open(`/hvac/print/intervention/${event.id}`, '_blank')}
                                    >
                                        <Printer className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slategray-500 mt-1">
                                <User className="w-3 h-3" />
                                <span>{event.technicianName}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Summary / Technical Report */}
                            <p className="text-sm text-gray-600 bg-slate-50 p-2 rounded border border-slate-100">
                                {event.technicalReport}
                            </p>

                            {/* Photos */}
                            {event.photos && event.photos.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {event.photos.map((photo, i) => (
                                        <div key={i} className="relative w-20 h-20 shrink-0 rounded-md overflow-hidden border">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={photo.url} alt={photo.caption} className="object-cover w-full h-full" />
                                            {photo.stage && (
                                                <div className="absolute bottom-0 left-0 w-full bg-black/50 text-[10px] text-white text-center py-0.5">
                                                    {photo.stage}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Comments Stream */}
                            {(event.comments && event.comments.length > 0) || openReply[event.id] ? (
                                <div className="space-y-2 mt-4 pt-4 border-t border-dashed">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase">Conversación</h4>

                                    {/* Existing Comments */}
                                    {event.comments?.map((comment, idx) => (
                                        <div key={idx} className="flex gap-3 text-sm">
                                            <Avatar className="w-6 h-6">
                                                <AvatarFallback className={comment.authorRole === 'CLIENTE' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}>
                                                    {comment.authorName ? comment.authorName.charAt(0) : '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-baseline">
                                                    <span className={`font-semibold text-xs ${comment.authorRole === 'CLIENTE' ? 'text-red-700' : 'text-blue-700'}`}>
                                                        {comment.authorName} ({comment.authorRole})
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {format(comment.createdAt.toDate(), "dd/MM HH:mm")}
                                                    </span>
                                                </div>
                                                <p className={`mt-0.5 ${comment.authorRole === 'CLIENTE' ? 'text-red-800' : 'text-blue-900 border-l-2 border-blue-200 pl-2'}`}>
                                                    {comment.text}
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* New Comment Input */}
                                    {openReply[event.id] && currentUser && (
                                        <div className="flex gap-2 mt-2 items-center animate-in fade-in slide-in-from-top-1">
                                            <Input
                                                className="h-10 text-sm"
                                                placeholder="Escribe un comentario..."
                                                value={replyState[event.id] || ""}
                                                onChange={(e) => setReplyState(prev => ({ ...prev, [event.id]: e.target.value }))}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSend(event.id)}
                                            />
                                            <Button size="icon" className="h-10 w-10 shrink-0" onClick={() => handleSend(event.id)} disabled={sending[event.id]}>
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            {/* Reply Action */}
                            {!openReply[event.id] && currentUser && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 text-sm text-gray-500 w-full"
                                    onClick={() => setOpenReply(prev => ({ ...prev, [event.id]: true }))}
                                >
                                    <MessageCircle className="w-3 h-3 mr-1" />
                                    Responder / Comentar
                                </Button>
                            )}

                        </CardContent>
                    </Card>
                </div>
            ))}
        </div>
    );
}

function WrenchIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
    );
}
