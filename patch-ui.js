const fs = require('fs');
let file = fs.readFileSync('D:/06_PROYECTOS_Y_DESARROLLO/HECHOAPP/src/components/tickets/ticket-survey-areas.tsx', 'utf8');

if (!file.includes('const [generatingAI, setGeneratingAI]')) {
  file = file.replace("const [uploadingSpecial, setUploadingSpecial] = useState<{ areaId: string; type: 'plate' | 'board' } | null>(null);",
    "const [uploadingSpecial, setUploadingSpecial] = useState<{ areaId: string; type: 'plate' | 'board' } | null>(null);\n    const [generatingAI, setGeneratingAI] = useState<string | null>(null);");
}

const aiFunction = `    const handleGenerateAreaSummaryWithAI = async (areaId: string) => {
        const area = areasRef.current.find(a => a.id === areaId);
        if (!area) return;
        
        const imageUrls = area.photos.map(p => p.url).filter(Boolean);
        if (imageUrls.length === 0 && !area.notes) {
            alert('Agrega fotos o algunas notas antes de generar el resumen.');
            return;
        }
        
        setGeneratingAI(areaId);
        
        try {
            const { auth } = await import('@/lib/firebase');
            const token = await auth.currentUser?.getIdToken();
            
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({
                    task: 'summarize-area',
                    imageUrls,
                    context: area.notes || ''
                })
            });
            
            if (!response.ok) throw new Error('Error al generar resumen');
            const data = await response.json();
            
            if (data.output) {
                const { notes, photoDescriptions } = data.output;
                
                const currentAreas = areasRef.current;
                const updated = currentAreas.map(a => {
                    if (a.id === areaId) {
                        const newPhotos = [...a.photos];
                        if (photoDescriptions && Array.isArray(photoDescriptions)) {
                            newPhotos.forEach((p, idx) => {
                                if (photoDescriptions[idx]) {
                                    p.description = photoDescriptions[idx];
                                }
                            });
                        }
                        return { ...a, notes: notes || a.notes, photos: newPhotos };
                    }
                    return a;
                });
                
                updateAreas(updated);
            }
        } catch (e) {
            console.error(e);
            alert('Ocurrió un error al generar el resumen con IA.');
        } finally {
            setGeneratingAI(null);
        }
    };`;

if (!file.includes('handleGenerateAreaSummaryWithAI')) {
  file = file.replace('const handleAddArea = (nameToAdd?: string) => {', aiFunction + '\n\n    const handleAddArea = (nameToAdd?: string) => {');
}

// Add the button in the UI
const buttonUI = `                                            </div>
  
                                            <div className="flex justify-between items-center mt-2">
                                                <Label className="text-[11px] font-bold">Notas & Observaciones Técnicas</Label>
                                                <Button 
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-[10px] px-2 py-0 border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold gap-1"
                                                    onClick={() => handleGenerateAreaSummaryWithAI(area.id)}
                                                    disabled={generatingAI === area.id}
                                                >
                                                    {generatingAI === area.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="w-3 h-3 text-purple-500" />
                                                    )}
                                                    Resumir Área con IA
                                                </Button>
                                            </div>
                                            <div>
                                                <Input`;

file = file.replace(
`                                            </div>
  
                                            <div>
                                                <Label className="text-[11px] font-bold">Notas & Observaciones Técnicas</Label>
                                                <Input`, buttonUI);

fs.writeFileSync('D:/06_PROYECTOS_Y_DESARROLLO/HECHOAPP/src/components/tickets/ticket-survey-areas.tsx', file, 'utf8');
