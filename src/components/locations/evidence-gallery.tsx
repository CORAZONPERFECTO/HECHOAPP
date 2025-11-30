"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket } from "@/types/schema";
import { ImageIcon, ExternalLink } from "lucide-react";
import Image from "next/image";

interface EvidenceGalleryProps {
    locationId: string;
}

export function EvidenceGallery({ locationId }: EvidenceGalleryProps) {
    const [images, setImages] = useState<{ url: string; ticketId: string; ticketCode: string; date: Date }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Query tickets for this location
        const q = query(
            collection(db, "tickets"),
            where("locationId", "==", locationId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allImages: { url: string; ticketId: string; ticketCode: string; date: Date }[] = [];

            snapshot.docs.forEach((doc) => {
                const ticket = doc.data() as Ticket;
                if (ticket.attachments && Array.isArray(ticket.attachments)) {
                    ticket.attachments.forEach((url) => {
                        allImages.push({
                            url,
                            ticketId: doc.id,
                            ticketCode: ticket.codigo,
                            date: new Date(ticket.createdAt.seconds * 1000),
                        });
                    });
                }
            });

            setImages(allImages);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [locationId]);

    if (loading) {
        return <div className="text-center py-12 text-gray-500">Cargando evidencias...</div>;
    }

    if (images.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay evidencias</h3>
                <p className="mt-1 text-sm text-gray-500">Los tickets de esta ubicación no tienen fotos adjuntas.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, index) => (
                <div key={`${img.ticketId}-${index}`} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                    {/* Note: Using standard img tag for external URLs if domain not configured in next.config.js, 
              but assuming we might configure it later. For now, standard img is safer for arbitrary URLs. 
              If using Next Image, we need to add domains to config. */}
                    <img
                        src={img.url}
                        alt={`Evidencia ${img.ticketCode}`}
                        className="object-cover w-full h-full transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <p className="text-white text-xs font-medium truncate">{img.ticketCode}</p>
                        <p className="text-white/80 text-[10px]">{img.date.toLocaleDateString()}</p>
                        <a
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white"
                        >
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>
            ))}
        </div>
    );
}
