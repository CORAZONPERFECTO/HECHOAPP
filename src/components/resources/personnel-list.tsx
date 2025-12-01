"use client";

import { useState, useEffect } from "react";
import { PersonnelResource, PersonnelType } from "@/types/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, User, Phone, FileText } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PersonnelListProps {
    onSelect: (person: PersonnelResource) => void;
    onNew: () => void;
}

export function PersonnelList({ onSelect, onNew }: PersonnelListProps) {
    const [personnel, setPersonnel] = useState<PersonnelResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>("ALL");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const q = query(collection(db, "personnel"), orderBy("fullName"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PersonnelResource));
            setPersonnel(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredPersonnel = personnel.filter(p => {
        const matchesType = filterType === "ALL" || p.type === filterType;
        const matchesSearch = p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.cedula.includes(searchTerm) ||
            p.phone.includes(searchTerm);
        return matchesType && matchesSearch;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por nombre, cédula..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos</SelectItem>
                            <SelectItem value="EMPLEADO">Empleados</SelectItem>
                            <SelectItem value="TECNICO">Técnicos</SelectItem>
                            <SelectItem value="CONTRATISTA">Contratistas</SelectItem>
                            <SelectItem value="AYUDANTE">Ayudantes</SelectItem>
                            <SelectItem value="GERENTE">Gerentes</SelectItem>
                            <SelectItem value="ADMINISTRATIVO">Admin.</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={onNew} className="gap-2">
                        <Plus className="h-4 w-4" /> Nuevo
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPersonnel.map((person) => (
                    <Card key={person.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSelect(person)}>
                        <CardContent className="p-4 flex items-start gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                {person.fullName.charAt(0)}
                            </div>
                            <div className="flex-1 space-y-1">
                                <h3 className="font-semibold text-gray-900">{person.fullName}</h3>
                                <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">{person.type}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                                    <FileText className="h-3 w-3" />
                                    <span>{person.cedula}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="h-3 w-3" />
                                    <span>{person.phone}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredPersonnel.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No se encontraron resultados.
                    </div>
                )}
            </div>
        </div>
    );
}
