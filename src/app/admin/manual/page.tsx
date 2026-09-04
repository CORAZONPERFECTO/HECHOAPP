"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ManualGerencialPage() {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 print:p-0 print:max-w-none print:m-0">
            {/* Action Bar (Hidden when printing) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl print:hidden">
                <div className="space-y-1">
                    <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-300 text-[10px] font-black rounded-full uppercase tracking-wider border border-blue-400/30">
                        Documento Oficial de Capacitación & Gobierno
                    </span>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight">Manual Gerencial HECHOAPP</h1>
                    <p className="text-xs md:text-sm text-slate-300 max-w-xl">
                        Guía completa explicada para directores, gerentes y supervisores de HECHO SRL.
                    </p>
                </div>

                <Button
                    onClick={handlePrint}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg gap-2 h-11 px-6 text-xs shrink-0"
                >
                    <Download className="w-4 h-4" /> Descargar Manual en PDF / Imprimir
                </Button>
            </div>

            {/* PRINTABLE MANUAL CONTAINER */}
            <div className="bg-white p-6 md:p-12 rounded-3xl border border-slate-200 shadow-sm print:border-none print:p-0 space-y-10 text-slate-800">
                
                {/* COVER / HEADER */}
                <div className="border-b-2 border-slate-900 pb-8 space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-xs uppercase font-extrabold tracking-widest text-blue-600 block">MANUAL ESTRATÉGICO DE OPERACIONES Y FINANZAS</span>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight mt-1">HECHOAPP: Guía del Gerente</h1>
                            <p className="text-sm font-semibold text-slate-600 mt-1">Todo lo que la empresa puede lograr, explicado paso a paso con máxima claridad.</p>
                        </div>
                        <div className="text-right hidden sm:block">
                            <span className="font-black text-xl text-slate-900 block">HECHO SRL</span>
                            <span className="text-xs font-mono text-slate-500">RNC: 131947532</span>
                            <span className="text-[10px] font-bold text-emerald-600 block mt-1">Versión Gerencial 2026</span>
                        </div>
                    </div>
                </div>

                {/* INTRODUCCION SIMPLE */}
                <div className="bg-blue-50/70 border border-blue-200 p-6 rounded-2xl space-y-2">
                    <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
                        🌟 ¿Qué es HECHOAPP explicado en 1 minuto?
                    </h3>
                    <p className="text-xs md:text-sm text-blue-900 leading-relaxed">
                        Imagina que <strong>HECHOAPP</strong> es el control remoto inteligente de toda la empresa. 
                        Le dice a los técnicos qué hacer en su celular, toma fotos de cada trabajo terminado, calcula cuánto se ganó exactamente, emite la factura fiscal para cobrarle al cliente de inmediato y vigila que no se pierda un solo peso ni en compras ni en repuestos.
                    </p>
                </div>

                {/* TEMA 1 */}
                <section className="space-y-4 pt-2">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">1</div>
                        <h2 className="text-xl font-black text-slate-950">El Centro de Mando & Consejo Asesor con IA (El Cerebro)</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                📊 1.1 Tablero en Vivo
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                En una sola pantalla ves: cuántos técnicos están trabajando hoy, cuántos tickets están abiertos y cuánto dinero se ha cobrado este mes.
                            </p>
                            <span className="text-[10px] font-bold text-blue-700 block pt-1">💡 Beneficio: Control en 5 segundos.</span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                🚨 1.2 Monitor de Fugas
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                Es el "policía financiero". Te avisa si se compró una pieza en la calle a sobreprecio, si se gastó dinero sin comprobante con NCF o si un ticket dio pérdidas.
                            </p>
                            <span className="text-[10px] font-bold text-rose-700 block pt-1">💡 Beneficio: Cero dinero perdido.</span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                ✨ 1.3 Consejo Asesor IA
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                Con 1 clic, una Inteligencia Artificial analiza todos tus números y te entrega recomendaciones estratégicas de Operaciones, Finanzas y Personal.
                            </p>
                            <span className="text-[10px] font-bold text-purple-700 block pt-1">💡 Beneficio: 3 asesores expertos 24/7.</span>
                        </div>
                    </div>
                </section>

                {/* TEMA 2 */}
                <section className="space-y-4 pt-2">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">2</div>
                        <h2 className="text-xl font-black text-slate-950">Operaciones en Calle & Torre de Tickets (El Trabajo)</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                📱 2.1 App Móvil del Técnico
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                El técnico ve en su celular sus tareas del día, llena checklists digitales, graba notas de voz y toma la firma del cliente al terminar.
                            </p>
                            <span className="text-[10px] font-bold text-blue-700 block pt-1">💡 Beneficio: Cero papeles ni olvidos.</span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                📸 2.2 Reportes con Fotos
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                Fotos obligatorias de "Antes" y "Después". Si un cliente pregunta qué se hizo, se le envía un informe con fotos y diagnóstico.
                            </p>
                            <span className="text-[10px] font-bold text-emerald-700 block pt-1">💡 Beneficio: Cero reclamos y máxima confianza.</span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                🚐 2.3 Flotilla & Rutas
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                Registro de kilometraje por ticket, aviso de cambio de aceite para cada camioneta y optimización de rutas por zona geográfica.
                            </p>
                            <span className="text-[10px] font-bold text-indigo-700 block pt-1">💡 Beneficio: Menos gasto de combustible.</span>
                        </div>
                    </div>
                </section>

                {/* TEMA 3 */}
                <section className="space-y-4 pt-2">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">3</div>
                        <h2 className="text-xl font-black text-slate-950">Facturación, Cobros & Tesorería (El Dinero)</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                ⚡ 3.1 Facturación en 1 Clic
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                Al terminar un ticket, presionas un botón y el sistema suma mano de obra + repuestos + kilometraje y genera la factura fiscal (B01 / B02).
                            </p>
                            <span className="text-[10px] font-bold text-amber-700 block pt-1">💡 Beneficio: Facturación en 3 segundos.</span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                💬 3.2 Cobro por WhatsApp
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                Con un botón envías al cliente por WhatsApp la factura con NCF y el enlace con todas las fotos de respaldo para cobro inmediato.
                            </p>
                            <span className="text-[10px] font-bold text-emerald-700 block pt-1">💡 Beneficio: Cobros 3 veces más rápidos.</span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                🏦 3.3 Bancos & Caja Chica
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                Monitoreo del saldo real en Banco Popular, Banreservas y Arqueo Diario de Caja Chica para cuadrar el efectivo al centavo.
                            </p>
                            <span className="text-[10px] font-bold text-blue-700 block pt-1">💡 Beneficio: Cero descuadres de caja.</span>
                        </div>
                    </div>
                </section>

                {/* TEMA 4 */}
                <section className="space-y-4 pt-2">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">4</div>
                        <h2 className="text-xl font-black text-slate-950">Almacén, Stock en Camionetas & Compras (La Bodega)</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                📦 4.1 Inventario Central
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                Control de stock de repuestos, precios de costo promedio y alertas cuando una pieza se está agotando.
                            </p>
                            <span className="text-[10px] font-bold text-blue-700 block pt-1">💡 Beneficio: Nunca quedarte sin repuestos clave.</span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                🚚 4.2 Stock en Camionetas
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                Cada vehículo tiene asignado un "Kit Estándar" (capacitores, gas, contactores). Al gastar una pieza, se descuenta de su camioneta.
                            </p>
                            <span className="text-[10px] font-bold text-indigo-700 block pt-1">💡 Beneficio: Ahorro en compras de emergencia.</span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                🖨️ 4.3 Facturas con Fondo Blanco
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                Escáner con Inteligencia Artificial que limpia las fotos de facturas arrugadas y blanquea el fondo para imprimir sin gastar tinta.
                            </p>
                            <span className="text-[10px] font-bold text-emerald-700 block pt-1">💡 Beneficio: Soporte contable limpio y ahorro.</span>
                        </div>
                    </div>
                </section>

                {/* TEMA 5 */}
                <section className="space-y-4 pt-2">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">5</div>
                        <h2 className="text-xl font-black text-slate-950">Talento Humano & Cultura de Mérito (El Personal)</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                🏆 5.1 Ranking de Técnicos
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                Puntuación de 0 a 100 evaluando: puntualidad, tickets resueltos, cero retornos de garantía y cumplimiento de fotos.
                            </p>
                            <span className="text-[10px] font-bold text-purple-700 block pt-1">💡 Beneficio: Evaluación justa con datos reales.</span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                💵 5.2 Bonos por Margen Limpio
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                El sistema calcula automáticamente un bono del 5% del beneficio neto para técnicos estrella que cuiden los costos y no den garantías.
                            </p>
                            <span className="text-[10px] font-bold text-emerald-700 block pt-1">💡 Beneficio: Técnicos motivados y fieles.</span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                💬 5.3 Encuesta de Clima
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                Micro-encuesta anónima en el celular para conocer si al técnico le faltan herramientas o si siente trabas en calle.
                            </p>
                            <span className="text-[10px] font-bold text-pink-700 block pt-1">💡 Beneficio: Retención del mejor personal.</span>
                        </div>
                    </div>
                </section>

                {/* RESUMEN DE IMPACTO FINAL */}
                <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl space-y-4">
                    <h3 className="text-lg font-black text-center text-amber-300">
                        🎯 Los 3 Resultados Garantizados para la Gerencia de HECHO SRL
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-center">
                        <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                            <span className="text-2xl font-black text-emerald-400 block mb-1">Cero Fugas</span>
                            <p className="text-slate-300">Cada compra tiene comprobante fiscal y cada repuesto sale registrado.</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                            <span className="text-2xl font-black text-blue-400 block mb-1">Cobro Inmediato</span>
                            <p className="text-slate-300">El trabajo terminado se factura y se cobra en menos de 24 horas.</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                            <span className="text-2xl font-black text-purple-400 block mb-1">Tranquilidad Total</span>
                            <p className="text-slate-300">Control total de la empresa desde tu teléfono celular sin estar encima.</p>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <span>HECHO SRL © 2026 - Todos los derechos reservados</span>
                    <span className="font-mono">Documento de Acreditación Gerencial HECHOAPP</span>
                </div>
            </div>
        </div>
    );
}
