"use client";

import { useState } from "react";
import { TicketEvent } from "@/types/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Circle, CheckCircle2, Clock, User, AlertCircle, MessageSquare, Image as ImageIcon, Send, Loader2 } from "lucide-react";
import Image from "next/image";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TicketTimelineProps {
    events: TicketEvent[];
    ticketId?: string;
    currentUserId?: string;
    currentUserName?: string;
}

export function TicketTimeline({ events, ticketId, currentUserId, currentUserName }: TicketTimelineProps) {
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddComment = async () => {
        if (!newComment.trim() || !ticketId || !currentUserId) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "ticketEvents"), {
                ticketId,
                userId: currentUserId,
                userName: currentUserName || "Usuario",
                type: 'COMMENT',
                description: newComment.trim(),
                timestamp: serverTimestamp()
            });
            setNewComment("");
        } catch (error) {
            console.error("Error adding comment:", error);
            alert("Error al agregar comentario");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'CREACION': return <Circle className="h-4 w-4 text-blue-500" />;
            case 'CAMBIO_ESTADO': return <Clock className="h-4 w-4 text-orange-500" />;
            case 'FINALIZACION': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'ASIGNACION': return <User className="h-4 w-4 text-purple-500" />;
            case 'COMMENT': return <MessageSquare className="h-4 w-4 text-indigo-500" />;
            case 'PHOTO_UPLOAD': return <ImageIcon className="h-4 w-4 text-pink-500" />;
            case 'TOOL_REPORT': return <AlertCircle className="h-4 w-4 text-orange-600" />;
            default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
        }
    };

    // Sort events by date descending
    const sortedEvents = [...(events || [])].sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
    });

    return (
        <div className="space-y-6">
            {/* Comment Input Box */}
            {ticketId && currentUserId && (
                <div className="flex gap-3 items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <MessageSquare className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <Textarea 
                            placeholder="Escribe un comentario o actualización..." 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[80px] bg-white resize-none"
                        />
                        <div className="flex justify-end">
                            <Button 
                                size="sm" 
                                onClick={handleAddComment} 
                                disabled={!newComment.trim() || isSubmitting}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Comentar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Timeline Feed */}
            <div className="space-y-4">
                {sortedEvents.length === 0 ? (
                    <div className="text-sm text-gray-500 italic text-center py-6">No hay eventos registrados.</div>
                ) : (
                    sortedEvents.map((event, index) => (
                        <div key={event.id} className="flex gap-4">
                            {/* Icon Line */}
                            <div className="flex flex-col items-center">
                                <div className="h-8 w-8 rounded-full bg-slate-100 border flex items-center justify-center shrink-0 mt-1">
                                    {getIcon(event.type)}
                                </div>
                                {index < sortedEvents.length - 1 && (
                                    <div className="w-0.5 h-full bg-slate-200 my-1" />
                                )}
                            </div>
                            
                            {/* Content Card */}
                            <div className="flex-1 pb-6">
                                <div className={`p-4 rounded-xl border ${event.type === 'COMMENT' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm font-semibold text-slate-800">
                                            {event.userName || 'Sistema'}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {event.timestamp ? format(new Date(event.timestamp.seconds * 1000), "d MMM yyyy, HH:mm", { locale: es }) : '...'}
                                        </span>
                                    </div>
                                    
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{event.description}</p>
                                    
                                    {/* Inline Media */}
                                    {event.mediaUrl && (
                                        <div className="mt-3 relative h-48 sm:h-64 w-full rounded-lg overflow-hidden border border-slate-200">
                                            <Image 
                                                src={event.mediaUrl} 
                                                alt="Evidencia" 
                                                fill 
                                                className="object-cover"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
