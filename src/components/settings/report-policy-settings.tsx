"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ShieldCheck, MessageSquare, Lightbulb, Save, Loader2, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export interface ReportPolicySettings {
    warrantyPolicies: string;
    defaultRecommendations: string;
    whatsappTemplate: string;
    companyNotes: string;
}

export const DEFAULT_REPORT_POLICIES: ReportPolicySettings = {
    warrantyPolicies: "1. Garantía de 30 días sobre la mano de obra del servicio realizado.\n2. Las garantías no cubren fallas por variaciones de voltaje, descargas eléctricas o manipulación por personal ajeno a HECHO SRL.\n3. Los repuestos e insumos nuevos cuentan con la garantía directa del fabricante.",
    defaultRecommendations: "• Se recomienda realizar mantenimiento preventivo cada 3 meses para prolongar la vida útil de los equipos y reducir el consumo eléctrico.\n• Mantener los filtros de aire limpios revisándolos quincenalmente.\n• Reportar cualquier ruido anormal o pérdida de enfriamiento a la mayor brevedad.",
    whatsappTemplate: "Estimado/a *{{cliente}}*, adjuntamos el informe técnico oficial del servicio realizado en *{{ubicacion}}* (Ticket #{{ticket}}).\n\nPuede consultar el informe interactivo con evidencia fotográfica y recomendaciones aquí:\n{{enlace}}\n\nAtentamente,\n*HECHO SRL • Ingeniería & Climatización*",
    companyNotes: "Gracias por confiar en HECHO SRL. Para soporte continuo o contrataciones recurrentes, comuníquese con nuestra central."
};

export function ReportPolicySettingsComponent() {
    const [settings, setSettings] = useState<ReportPolicySettings>(DEFAULT_REPORT_POLICIES);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const docSnap = await getDoc(doc(db, "settings", "reports"));
                if (docSnap.exists()) {
                    setSettings({
                        ...DEFAULT_REPORT_POLICIES,
                        ...(docSnap.data() as ReportPolicySettings)
                    });
                }
            } catch (error) {
                console.error("Error loading report policies:", error);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "reports"), settings, { merge: true });
            toast({
                title: "✅ Configuración Guardada",
                description: "Las políticas y recomendaciones predeterminadas se aplicarán a los nuevos informes."
            });
        } catch (error) {
            console.error("Error saving report policies:", error);
            toast({
                title: "Error",
                description: "No se pudo guardar la configuración.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 bg-slate-50 rounded-2xl border border-slate-200 animate-pulse">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                <span className="text-sm text-slate-600 font-medium">Cargando políticas de informes...</span>
            </div>
        );
    }

    return (
        <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden mt-6">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Políticas, Garantías y Mensajes para Informes Finales
                        </CardTitle>
                        <CardDescription>
                            Define los textos y políticas de garantía que se incluirán automáticamente en los informes enviados a clientes.
                        </CardDescription>
                    </div>
                    <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-sm rounded-xl"
                    >
                        {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                        Guardar Políticas
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* 1. Políticas de Garantía */}
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Términos de Garantía y Condiciones del Servicio
                    </Label>
                    <p className="text-xs text-slate-500">
                        Este texto aparecerá al pie del informe técnico (PDF y enlace cliente).
                    </p>
                    <Textarea
                        rows={4}
                        value={settings.warrantyPolicies}
                        onChange={(e) => setSettings({ ...settings, warrantyPolicies: e.target.value })}
                        placeholder="Ej: Garantía de 30 días sobre mano de obra..."
                        className="text-xs font-mono leading-relaxed bg-slate-50/50 rounded-xl border-slate-200"
                    />
                </div>

                {/* 2. Recomendaciones Preventivas Base */}
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        Recomendaciones Preventivas Predeterminadas
                    </Label>
                    <p className="text-xs text-slate-500">
                        Consejos sugeridos al cliente que se insertarán por defecto al generar el informe.
                    </p>
                    <Textarea
                        rows={4}
                        value={settings.defaultRecommendations}
                        onChange={(e) => setSettings({ ...settings, defaultRecommendations: e.target.value })}
                        placeholder="Ej: Realizar mantenimiento preventivo cada 3 meses..."
                        className="text-xs leading-relaxed bg-slate-50/50 rounded-xl border-slate-200"
                    />
                </div>

                {/* 3. Plantilla de WhatsApp */}
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        Plantilla de Mensaje para Enviar por WhatsApp
                    </Label>
                    <p className="text-xs text-slate-500">
                        Variables disponibles: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-bold">{"{{cliente}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-bold">{"{{ubicacion}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-bold">{"{{ticket}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-bold">{"{{enlace}}"}</code>.
                    </p>
                    <Textarea
                        rows={5}
                        value={settings.whatsappTemplate}
                        onChange={(e) => setSettings({ ...settings, whatsappTemplate: e.target.value })}
                        placeholder="Mensaje que se abrirá en WhatsApp al presionar Enviar al Cliente..."
                        className="text-xs font-mono leading-relaxed bg-slate-50/50 rounded-xl border-slate-200"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
