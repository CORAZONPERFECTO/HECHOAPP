
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Hammer, Monitor, FileText, Camera, ShieldCheck, Download, AlertCircle } from "lucide-react";

export function UserManualViewer() {
    return (
        <ScrollArea className="h-[calc(100vh-200px)] pr-4">
            <div className="space-y-8 max-w-4xl mx-auto pb-12">

                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900 border-b pb-4">Manual de Usuario - NEXUS HECHO</h1>
                    <p className="text-gray-600 leading-relaxed">
                        Bienvenido a la guía oficial de la plataforma NEXUS HECHO. Esta documentación te ayudará a navegar por las funciones principales tanto para el personal en campo como para la administración.
                    </p>
                </div>

                {/* 1. Roles */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-blue-600" />
                        <h2 className="text-2xl font-semibold text-gray-800">1. Acceso y Roles</h2>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Perfiles de Usuario</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-2 mb-2 font-bold text-blue-800">
                                    <Monitor className="w-4 h-4" /> ADMIN / SUPERVISOR
                                </div>
                                <p className="text-sm text-blue-700">Acceso total a finanzas, configuración, reportes, inventario y gestión de usuarios.</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                <div className="flex items-center gap-2 mb-2 font-bold text-green-800">
                                    <Hammer className="w-4 h-4" /> TÉCNICO
                                </div>
                                <p className="text-sm text-green-700">Interfaz simplificada enfocada en "Mi Día", tickets asignados y herramientas de diagnóstico.</p>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* 2. Tecnicos */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Hammer className="w-6 h-6 text-orange-600" />
                        <h2 className="text-2xl font-semibold text-gray-800">2. Para Técnicos (Campo)</h2>
                    </div>
                    <div className="grid gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <span className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                    Mi Día (Gestión de Tickets)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-gray-600 space-y-2">
                                <p>Accede desde el botón <strong>"Tickets"</strong> o <strong>"Mi Día"</strong> en el menú.</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Pendiente:</strong> Ticket asignado, esperando inicio.</li>
                                    <li><strong>En Progreso:</strong> Trabajo iniciado (cronómetro activo).</li>
                                    <li><strong>Resuelto:</strong> Trabajo finalizado, listo para revisión.</li>
                                </ul>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <span className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                    Ejecución del Trabajo
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-gray-600 space-y-2">
                                <p>Dentro de cada ticket puedes:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Bitácora:</strong> Registrar horas de entrada y salida..</li>
                                    <li><strong>Evidencias:</strong> Subir fotos ilimitadas. <Badge variant="outline" className="text-xs">Importante</Badge> Sube TODAS las fotos necesarias, el sistema las ordenará.</li>
                                    <li><strong>Diagnóstico IA:</strong> Consulta códigos de error de aires acondicionados al instante.</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* 3. Reportes */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-purple-600" />
                        <h2 className="text-2xl font-semibold text-gray-800">3. Reportes Profesionales PDF</h2>
                    </div>
                    <Card className="border-purple-200 bg-purple-50/30">
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">1</div>
                                        Generar
                                    </h3>
                                    <p className="text-sm text-gray-600">Al finalizar un ticket, ve a la pestaña <strong>Reporte</strong>. Se generará un borrador automático con los datos y fotos del ticket.</p>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">2</div>
                                        Personalizar
                                    </h3>
                                    <p className="text-sm text-gray-600">Revisa la galería de fotos. Si faltan imágenes recientes, usa el botón <strong>Actualizar Fotos</strong>. Edita las descripciones si es necesario.</p>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">3</div>
                                        Exportar
                                    </h3>
                                    <p className="text-sm text-gray-600">Haz clic en <strong>Exportar PDF</strong> y selecciona <em>"PDF Profesional (Motor Python)"</em> para descargar el documento final en alta calidad.</p>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded border border-purple-100 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-purple-500 mt-0.5" />
                                <div className="text-sm text-gray-700">
                                    <strong>Bloqueo de Edición:</strong> Para evitar conflictos, si alguien más está editando el reporte, verás un aviso de "Bloqueado" y no podrás guardar cambios hasta que se libere.
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* 4. Admin */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Monitor className="w-6 h-6 text-gray-600" />
                        <h2 className="text-2xl font-semibold text-gray-800">4. Administración (Oficina)</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle className="text-base">Finanzas</CardTitle></CardHeader>
                            <CardContent className="text-sm text-gray-600">
                                <ul className="space-y-2">
                                    <li><strong>Facturas:</strong> Emisión de comprobantes fiscales.</li>
                                    <li><strong>Cotizaciones:</strong> Presupuestos convertibles a factura.</li>
                                    <li><strong>Recurrentes:</strong> Automatización de cobros mensuales.</li>
                                </ul>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-base">Inventario</CardTitle></CardHeader>
                            <CardContent className="text-sm text-gray-600">
                                <ul className="space-y-2">
                                    <li>Control de existencias de repuestos y equipos.</li>
                                    <li>Registro de entradas y salidas (Movimientos) para auditoría.</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <div className="text-center pt-8 text-gray-400 text-sm">
                    manual_v1.0 • NEXUS HECHO Platform
                </div>
            </div>
        </ScrollArea>
    );
}
