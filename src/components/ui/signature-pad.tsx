
"use client";

import { useRef, useState, useImperativeHandle, forwardRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
    className?: string;
    onEnd?: () => void;
}

export interface SignaturePadRef {
    clear: () => void;
    isEmpty: () => boolean;
    toDataURL: () => string;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
    ({ className, onEnd }, ref) => {
        const sigPad = useRef<SignatureCanvas>(null);
        const [isEmpty, setIsEmpty] = useState(true);

        useImperativeHandle(ref, () => ({
            clear: () => {
                sigPad.current?.clear();
                setIsEmpty(true);
            },
            isEmpty: () => sigPad.current?.isEmpty() ?? true,
            toDataURL: () => sigPad.current?.toDataURL() ?? "",
        }));

        const handleEnd = () => {
            setIsEmpty(sigPad.current?.isEmpty() ?? true);
            onEnd?.();
        };

        const handleClear = () => {
            sigPad.current?.clear();
            setIsEmpty(true);
            onEnd?.(); // Trigger change on clear
        };

        return (
            <div className={`relative border rounded-xl overflow-hidden bg-white shadow-sm ${className}`}>
                <SignatureCanvas
                    ref={sigPad}
                    penColor="black"
                    canvasProps={{
                        className: "w-full h-full cursor-crosshair touch-none",
                        style: { width: '100%', height: '100%' } // Force full size
                    }}
                    onEnd={handleEnd}
                />
                {!isEmpty && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        onClick={handleClear}
                        type="button"
                    >
                        <Eraser className="h-4 w-4" />
                    </Button>
                )}
                {isEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300 text-sm select-none">
                        Firmar aquí
                    </div>
                )}
            </div>
        );
    }
);

SignaturePad.displayName = "SignaturePad";
