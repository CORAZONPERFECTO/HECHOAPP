"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Circle, Square, ArrowUpRight, PenTool, Undo, Save, X, RotateCw, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/api-client";

interface ImageAnnotatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onSave: (annotatedImageUrl: string) => void;
}

type Tool = "pen" | "rect" | "circle" | "arrow";
type Color = "#ef4444" | "#eab308" | "#22c55e" | "#3b82f6" | "#ffffff" | "#000000";

interface DrawAction {
    tool: Tool;
    color: Color;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    points?: { x: number; y: number }[];
}

export function ImageAnnotator({ open, onOpenChange, imageUrl, onSave }: ImageAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const [tool, setTool] = useState<Tool>("rect");
  const [color, setColor] = useState<Color>("#ef4444");
  
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [currentAction, setCurrentAction] = useState<DrawAction | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rotation, setRotation] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Limpieza de Object URLs para evitar fugas de memoria
  const cleanupBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  // Cargar imagen de forma resiliente con soporte multi-nivel (Directo / Blob / Proxy)
  useEffect(() => {
    if (!open || !imageUrl) {
      setImageObj(null);
      setIsLoading(false);
      setLoadError(null);
      cleanupBlobUrl();
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setImageObj(null);
    setActions([]);
    setCurrentAction(null);
    setRotation(0);
    cleanupBlobUrl();

    const loadImgFromSource = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        if (!src.startsWith("data:") && !src.startsWith("blob:")) {
          img.crossOrigin = "anonymous";
        }
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
      });
    };

    const fetchImageResiliently = async () => {
      // 1. Data URLs o Blobs locales -> Carga directa
      if (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
        try {
          const img = await loadImgFromSource(imageUrl);
          if (!isCancelled) {
            setImageObj(img);
            setIsLoading(false);
          }
          return;
        } catch (err) {
          console.error("Error al cargar data/blob URL:", err);
        }
      }

      // 2. Fetch directo como Blob (Garantiza que el Canvas no se ensucie con CORS)
      try {
        const res = await fetch(imageUrl, { mode: "cors" });
        if (res.ok) {
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          blobUrlRef.current = objUrl;
          const img = await loadImgFromSource(objUrl);
          if (!isCancelled) {
            setImageObj(img);
            setIsLoading(false);
          }
          return;
        }
      } catch (directErr) {
        console.warn("Fallo fetch directo, intentando fallback proxy...", directErr);
      }

      // 3. Fallback a proxy autenticado /api/proxy-image
      try {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
        const res = await authFetch(proxyUrl);
        if (res.ok) {
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          blobUrlRef.current = objUrl;
          const img = await loadImgFromSource(objUrl);
          if (!isCancelled) {
            setImageObj(img);
            setIsLoading(false);
          }
          return;
        }
      } catch (proxyErr) {
        console.warn("Fallo proxy authFetch, intentando carga directa de imagen...", proxyErr);
      }

      // 4. Último recurso: Image() directo con crossOrigin
      try {
        const img = await loadImgFromSource(imageUrl);
        if (!isCancelled) {
          setImageObj(img);
          setIsLoading(false);
        }
        return;
      } catch (finalErr) {
        if (!isCancelled) {
          console.error("No se pudo cargar la imagen para anotación:", finalErr);
          setLoadError("No se pudo cargar la fotografía. Verifique la conexión o el enlace.");
          setIsLoading(false);
        }
      }
    };

    fetchImageResiliently();

    return () => {
      isCancelled = true;
      cleanupBlobUrl();
    };
  }, [open, imageUrl, reloadKey, cleanupBlobUrl]);

  const drawArrow = (ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number) => {
      const headlen = 15;
      const dx = tox - fromx;
      const dy = toy - fromy;
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(fromx, fromy);
      ctx.lineTo(tox, toy);
      ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(tox, toy);
      ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Limpiar y dibujar imagen base
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    
    const isRotated = rotation === 90 || rotation === 270;
    const imgWidth = isRotated ? canvas.height : canvas.width;
    const imgHeight = isRotated ? canvas.width : canvas.height;
    
    ctx.drawImage(imageObj, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    ctx.restore();

    // Dibujar todas las acciones
    const draw = (action: DrawAction) => {
      ctx.strokeStyle = action.color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (action.tool === "pen" && action.points) {
        ctx.beginPath();
        if (action.points.length > 0) {
            ctx.moveTo(action.points[0].x, action.points[0].y);
            for (let i = 1; i < action.points.length; i++) {
                ctx.lineTo(action.points[i].x, action.points[i].y);
            }
        }
        ctx.stroke();
      } else if (action.tool === "rect") {
        ctx.strokeRect(action.startX, action.startY, action.endX - action.startX, action.endY - action.startY);
      } else if (action.tool === "circle") {
        const radiusX = Math.abs(action.endX - action.startX) / 2;
        const radiusY = Math.abs(action.endY - action.startY) / 2;
        const centerX = action.startX + (action.endX - action.startX) / 2;
        const centerY = action.startY + (action.endY - action.startY) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (action.tool === "arrow") {
        drawArrow(ctx, action.startX, action.startY, action.endX, action.endY);
      }
    };

    actions.forEach(draw);
    if (currentAction) draw(currentAction);

  }, [actions, currentAction, imageObj, rotation]);

  useEffect(() => {
    if (imageObj && canvasRef.current && containerRef.current) {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        
        const isRotated = rotation === 90 || rotation === 270;
        const imgW = isRotated ? imageObj.height : imageObj.width;
        const imgH = isRotated ? imageObj.width : imageObj.height;

        // Escalar el canvas al contenedor manteniendo el aspect ratio
        const ratio = (imgW && imgH) ? (imgW / imgH) : 1;
        const maxWidth = Math.max(200, container.clientWidth - 16);
        const maxHeight = Math.max(200, container.clientHeight - 16);
        
        let newWidth = maxWidth;
        let newHeight = newWidth / ratio;
        
        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * ratio;
        }

        canvas.width = Math.round(newWidth);
        canvas.height = Math.round(newHeight);
        
        redrawCanvas();
    }
  }, [imageObj, redrawCanvas, open, rotation]);

  // Manejo de eventos (Touch y Mouse)
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: (clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (clientY - rect.top) * (canvasRef.current.height / rect.height)
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // prevent scrolling
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    setCurrentAction({
        tool,
        color,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        points: tool === "pen" ? [{x, y}] : undefined
    });
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentAction) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    
    if (tool === "pen" && currentAction.points) {
        setCurrentAction({
            ...currentAction,
            points: [...currentAction.points, {x, y}],
            endX: x,
            endY: y
        });
    } else {
        setCurrentAction({
            ...currentAction,
            endX: x,
            endY: y
        });
    }
  };

  const handleEnd = () => {
    if (!isDrawing || !currentAction) return;
    setIsDrawing(false);
    // Solo guardamos si realmente se movió (para evitar clics muertos)
    if (tool === 'pen' && (!currentAction.points || currentAction.points.length < 2)) {
        setCurrentAction(null);
        return;
    }
    if (tool !== 'pen' && Math.abs(currentAction.endX - currentAction.startX) < 2 && Math.abs(currentAction.endY - currentAction.startY) < 2) {
        setCurrentAction(null);
        return;
    }

    setActions([...actions, currentAction]);
    setCurrentAction(null);
  };

  const handleUndo = () => {
    setActions(actions.slice(0, -1));
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    setIsSaving(true);
    try {
      // Exportamos a calidad JPG
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.92);
      onSave(dataUrl);
      onOpenChange(false);
    } catch (err) {
      console.error("Error al exportar imagen anotada:", err);
      alert("Error al exportar la imagen. Intente nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2 md:p-4 bg-zinc-950 text-white border-zinc-800">
        <DialogHeader className="px-2">
          <DialogTitle className="flex items-center gap-2 text-zinc-100 font-semibold">
            <PenTool className="w-5 h-5 text-emerald-500" />
            Marcar Fotografía
          </DialogTitle>
        </DialogHeader>
        
        {/* Toolbar superior */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2 border-b border-zinc-800">
            <div className="flex bg-zinc-900 rounded-lg p-1">
                {[
                    { id: "rect", icon: <Square className="w-4 h-4" />, label: "Cuadro" },
                    { id: "circle", icon: <Circle className="w-4 h-4" />, label: "Círculo" },
                    { id: "arrow", icon: <ArrowUpRight className="w-4 h-4" />, label: "Flecha" },
                    { id: "pen", icon: <PenTool className="w-4 h-4" />, label: "Libre" },
                ].map((t) => (
                    <Button
                        key={t.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTool(t.id as Tool)}
                        className={cn("h-8 px-3 rounded-md", tool === t.id ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white")}
                    >
                        {t.icon}
                        <span className="ml-2 hidden sm:inline text-xs">{t.label}</span>
                    </Button>
                ))}
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 rounded-lg">
                {(["#ef4444", "#eab308", "#22c55e", "#3b82f6", "#ffffff", "#000000"] as Color[]).map(c => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        aria-label={`Color ${c}`}
                        className={cn(
                            "w-6 h-6 rounded-full transition-transform",
                            color === c ? "scale-110 ring-2 ring-white ring-offset-1 ring-offset-zinc-900" : "hover:scale-110 opacity-80 hover:opacity-100"
                        )}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={() => setRotation((r) => (r + 90) % 360)} 
                className="text-zinc-400 hover:text-white"
                disabled={isLoading || !imageObj}
              >
                  <RotateCw className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline text-xs">Rotar</span>
              </Button>
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={handleUndo} 
                disabled={actions.length === 0 || isLoading} 
                className="text-zinc-400 hover:text-white"
              >
                  <Undo className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline text-xs">Deshacer</span>
              </Button>
            </div>
        </div>

        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 overflow-hidden relative flex items-center justify-center bg-zinc-950/60 rounded-lg my-2 select-none touch-none border border-zinc-900">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    <span className="text-sm font-medium">Cargando imagen en alta resolución...</span>
                </div>
            ) : loadError ? (
                <div className="flex flex-col items-center justify-center gap-3 p-6 text-center max-w-md">
                    <AlertCircle className="w-10 h-10 text-rose-500" />
                    <p className="text-sm text-zinc-300">{loadError}</p>
                    <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        onClick={() => setReloadKey(k => k + 1)}
                        className="text-xs bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
                    >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Reintentar carga
                    </Button>
                </div>
            ) : imageObj ? (
                 <canvas
                 ref={canvasRef}
                 onMouseDown={handleStart}
                 onMouseMove={handleMove}
                 onMouseUp={handleEnd}
                 onMouseOut={handleEnd}
                 onTouchStart={handleStart}
                 onTouchMove={handleMove}
                 onTouchEnd={handleEnd}
                 className="shadow-2xl border border-zinc-800 bg-black cursor-crosshair touch-none rounded"
               />
            ) : null}
        </div>

        <DialogFooter className="px-2 flex-row justify-between sm:justify-between items-center mt-auto border-t border-zinc-900 pt-2">
            <Button 
                type="button"
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                className="text-zinc-400 hover:text-white"
            >
                Cancelar
            </Button>
            <Button 
                type="button"
                onClick={handleSave} 
                disabled={isLoading || !imageObj || isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
                {isSaving ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Guardando...
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4 mr-2" />
                        Guardar Fotografía
                    </>
                )}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
