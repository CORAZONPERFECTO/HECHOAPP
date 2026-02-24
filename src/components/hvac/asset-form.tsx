"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Save } from "lucide-react";
import { AssetStatus } from "@/types/hvac";

const assetSchema = z.object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
    status: z.enum(['OPERATIONAL', 'WARNING', 'CRITICAL', 'OFFLINE', 'MAINTENANCE'] as const),
    brand: z.string().min(2, "La marca es requerida"),
    model: z.string().min(2, "El modelo es requerido"),
    serialNumber: z.string().min(2, "El número de serie es requerido"),
    btu: z.number().optional(),
    voltage: z.string().optional(),
    type: z.string().min(2, "El tipo de equipo es requerido"),
    refrigerant: z.string().optional(),
});

interface AssetFormProps {
    defaultValues?: Partial<z.infer<typeof assetSchema>>;
    onSubmit: (data: z.infer<typeof assetSchema>) => Promise<void>;
    isSubmitting?: boolean;
}

export function AssetForm({ defaultValues, onSubmit, isSubmitting = false }: AssetFormProps) {
    const form = useForm<z.infer<typeof assetSchema>>({
        resolver: zodResolver(assetSchema),
        defaultValues: {
            name: "",
            status: 'OPERATIONAL',
            brand: "",
            model: "",
            serialNumber: "",
            type: "Split",
            ...defaultValues,
        },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Equipo</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. Aire Master Bedroom" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Marca</FormLabel>
                                <FormControl>
                                    <Input placeholder="Daikin" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Modelo</FormLabel>
                                <FormControl>
                                    <Input placeholder="RX50..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="serialNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>No. Serie</FormLabel>
                                <FormControl>
                                    <Input placeholder="S/N..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione tipo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Split">Split Muro</SelectItem>
                                        <SelectItem value="Cassette">Cassette</SelectItem>
                                        <SelectItem value="FloorCeiling">Piso Techo</SelectItem>
                                        <SelectItem value="Central">Central</SelectItem>
                                        <SelectItem value="Package">Paquete</SelectItem>
                                        <SelectItem value="VRF">VRF</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="btu"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>BTU</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="12000" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="voltage"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Voltaje</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="V" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="110v">110v</SelectItem>
                                        <SelectItem value="220v">220v</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="refrigerant"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Gas</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Gas" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="R410A">R410A</SelectItem>
                                        <SelectItem value="R22">R22</SelectItem>
                                        <SelectItem value="R32">R32</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Equipo
                </Button>
            </form>
        </Form>
    );
}
