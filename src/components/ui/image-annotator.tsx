"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Circle, Square, ArrowUpRight, PenTool, Undo, Save, X, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

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
    points?: {x: number, y: number}[];
}

export function ImageAnnotator({ open, onOpenChange, imageUrl, onSave }: ImageAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>("rect");
  const [color, setColor] = useState<Color>("#ef4444");
  
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [currentAction, setCurrentAction] = useState<DrawAction | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rotation, setRotation] = useState<number>(0);

  // Cargar imagen
  useEffect(() => {
    if (open && imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImageObj(img);
        setActions([]);
        setCurrentAction(null);
      };
      img.src = imageUrl;
    }
  }, [open, imageUrl]);

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
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (action.tool === "arrow") {
        drawArrow(ctx, action.startX, action.startY, action.endX, action.endY);
      }
    };

    actions.forEach(draw);
    if (currentAction) draw(currentAction);

  }, [actions, currentAction, imageObj]);

  useEffect(() => {
    if (imageObj && canvasRef.current && containerRef.current) {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        
        const isRotated = rotation === 90 || rotation === 270;
        const imgW = isRotated ? imageObj.height : imageObj.width;
        const imgH = isRotated ? imageObj.width : imageObj.height;

        // Escalar el canvas al contenedor manteniendo el aspect ratio
        const ratio = imgW / imgH;
        const maxWidth = container.clientWidth;
        const maxHeight = container.clientHeight;
        
        let newWidth = maxWidth;
        let newHeight = newWidth / ratio;
        
        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * ratio;
        }

        canvas.width = newWidth;
        canvas.height = newHeight;
        
        redrawCanvas();
    }
  }, [imageObj, redrawCanvas, open, rotation]);

  // Manejo de eventos (Touch y Mouse)
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
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
    // Exportamos a máxima calidad JPG
    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9);
    onSave(dataUrl);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2 md:p-4 bg-zinc-950 text-white border-zinc-800">
        <DialogHeader className="px-2">
          <DialogTitle>Marcar Fotografía</DialogTitle>
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

            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg">
                {(["#ef4444", "#eab308", "#22c55e", "#3b82f6", "#ffffff", "#000000"] as Color[]).map(c => (
                    <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={cn(
                            "w-6 h-6 rounded-full transition-transform",
                            color === c ? "scale-110 ring-2 ring-white ring-offset-1 ring-offset-zinc-900" : "hover:scale-110"
                        )}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRotation((r) => (r + 90) % 360)} className="text-zinc-400 hover:text-white">
                  <RotateCw className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Rotar</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleUndo} disabled={actions.length === 0} className="text-zinc-400 hover:text-white">
                  <Undo className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Deshacer</span>
              </Button>
            </div>
        </div>

        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 overflow-hidden relative flex items-center justify-center bg-zinc-950/50 rounded-lg my-2 select-none touch-none">
            {imageObj ? (
                 <canvas
                 ref={canvasRef}
                 onMouseDown={handleStart}
                 onMouseMove={handleMove}
                 onMouseUp={handleEnd}
                 onMouseOut={handleEnd}
                 onTouchStart={handleStart}
                 onTouchMove={handleMove}
                 onTouchEnd={handleEnd}
                 className="shadow-2xl border border-zinc-800 bg-black cursor-crosshair touch-none"
               />
            ) : (
                <div className="text-zinc-500 animate-pulse">Cargando imagen...</div>
            )}
        </div>

        <DialogFooter className="px-2 flex-row justify-between sm:justify-between items-center mt-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-white">
                Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
