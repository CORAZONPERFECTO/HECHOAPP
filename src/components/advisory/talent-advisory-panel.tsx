"use client";

import { useState } from "react";
import { AdvisoryMetrics } from "@/types/advisory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Users, Sparkles, MessageSquareHeart, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TalentAdvisoryPanelProps {
    metrics: AdvisoryMetrics;
}

export function TalentAdvisoryPanel({ metrics }: TalentAdvisoryPanelProps) {
    const { talent } = metrics;
    const [surveyOpen, setSurveyOpen] = useState(false);

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200/80 rounded-2xl shadow-sm bg-white">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Puntuación Promedio</span>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-black font-mono text-purple-600">{talent.avgTechnicianScore}/100</span>
                            <Award className="w-5 h-5 text-purple-500" />
                        </div>
                        <p className="text-[11px] text-slate-500">Índice de Excelencia Técnica</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 rounded-2xl shadow-sm bg-white">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Técnico Estrella del Mes</span>
                        <div className="flex items-center justify-between">
                            <span className="text-base font-black text-slate-900 truncate max-w-[160px]">{talent.topPerformerName}</span>
                            <Sparkles className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="text-[11px] text-emerald-600 font-semibold">Mayor margen y cero garantías</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 rounded-2xl shadow-sm bg-white">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Incentivos por Margen Limpio</span>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-black font-mono text-emerald-600">RD$ {talent.totalSuggestedBonuses.toLocaleString()}</span>
                            <DollarSign className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-[11px] text-slate-500">Bonos sugeridos por mérito</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200/80 rounded-2xl shadow-sm bg-white">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Encuestas de Clima & Pulso</span>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900">Activo (Móvil)</span>
                            <MessageSquareHeart className="w-5 h-5 text-pink-500" />
                        </div>
                        <Button 
                            variant="link" 
                            className="p-0 h-auto text-[11px] text-pink-600 font-bold"
                            onClick={() => setSurveyOpen(true)}
                        >
                            Ver Encuesta de Personal
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Technicians Performance Leaderboard */}
            <Card className="border-slate-200 rounded-3xl shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5">
                    <CardTitle className="text-base font-extrabold text-slate-900 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-600" />
                            Tabla de Desempeño Técnico, Calidad & Bonos Sugeridos
                        </span>
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 text-[11px]">
                                <TableRow>
                                    <TableHead>Técnico</TableHead>
                                    <TableHead className="text-center">Tickets Resueltos</TableHead>
                                    <TableHead className="text-center">Garantías / Retornos</TableHead>
                                    <TableHead className="text-center">Fotos %</TableHead>
                                    <TableHead className="text-right">Beneficio Generado</TableHead>
                                    <TableHead className="text-center">Score (0-100)</TableHead>
                                    <TableHead className="text-right">Bono Sugerido</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {talent.technicians.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-400">
                                            No hay técnicos registrados en la base de datos.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    talent.technicians.map((tech, idx) => (
                                        <TableRow key={tech.userId} className="hover:bg-slate-50/80">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                                        idx === 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-xs text-slate-900 block">{tech.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">{tech.role}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-mono font-bold text-xs">
                                                {tech.ticketsResolved}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                                    tech.warrantyReworkCount === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                                }`}>
                                                    {tech.warrantyReworkCount}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-xs text-slate-600">
                                                {tech.photoComplianceRate}%
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-xs text-emerald-700">
                                                RD$ {tech.totalProfitGenerated.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={`font-mono text-xs ${
                                                    tech.overallScore >= 80 ? 'bg-emerald-600' : tech.overallScore >= 60 ? 'bg-amber-600' : 'bg-slate-600'
                                                }`}>
                                                    {tech.overallScore} pts
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-black text-xs text-blue-700">
                                                {tech.suggestedBonus > 0 ? `RD$ ${tech.suggestedBonus.toLocaleString()}` : 'RD$ 0.00'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Pulse Survey Modal */}
            <Dialog open={surveyOpen} onOpenChange={setSurveyOpen}>
                <DialogContent className="max-w-md p-6 rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <MessageSquareHeart className="w-5 h-5 text-pink-600" />
                            Encuesta de Pulso & Clima Laboral (App Móvil)
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 text-xs text-slate-700 pt-2">
                        <p className="text-slate-500">
                            Esta micro-encuesta aparece mensualmente en el celular de los técnicos de manera anónima para medir el clima operativo:
                        </p>

                        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div>
                                <strong className="block text-slate-900 font-semibold mb-1">1. Herramientas y Repuestos</strong>
                                <span className="text-slate-500">¿Cuentas con las herramientas y stock necesario para hacer tu trabajo con calidad?</span>
                            </div>
                            <div className="border-t pt-2">
                                <strong className="block text-slate-900 font-semibold mb-1">2. Reconocimiento de Esfuerzo</strong>
                                <span className="text-slate-500">¿Sientes que tu rendimiento y esfuerzo son valorados por la empresa?</span>
                            </div>
                            <div className="border-t pt-2">
                                <strong className="block text-slate-900 font-semibold mb-1">3. Trabas Operativas</strong>
                                <span className="text-slate-500">¿Qué proceso administrativo o demora en calle te quita más tiempo?</span>
                            </div>
                        </div>

                        <Button onClick={() => setSurveyOpen(false)} className="w-full bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold">
                            Entendido
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
