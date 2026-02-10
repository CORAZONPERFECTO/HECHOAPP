"use client";

import { HierarchyType, LocationNode } from "@/types/hvac";
import { Button } from "@/components/ui/button";
import { ChevronRight, Home, Building, MapPin, Grid, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface HierarchyBrowserProps {
    path: LocationNode[]; // Breadcrumb path
    currentNodes: LocationNode[]; // Siblings/Children to display
    onNavigate: (node: LocationNode) => void;
    onBack: () => void;
    loading?: boolean;
}

const iconConfig: Record<HierarchyType, any> = {
    'CLIENT': Home,
    'PROJECT': Building,
    'COMPLEX': Grid,
    'VILLA': Home,
    'AREA': Layers,
};

export function HierarchyBrowser({ path, currentNodes, onNavigate, onBack, loading }: HierarchyBrowserProps) {
    return (
        <div className="space-y-4">
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-2 text-sm text-gray-500 overflow-x-auto pb-2">
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => onBack()}>
                    <Home className="h-4 w-4" />
                </Button>
                {path.map((node, idx) => (
                    <div key={node.id} className="flex items-center">
                        <ChevronRight className="h-4 w-4 mx-1" />
                        <span className={cn(
                            "whitespace-nowrap font-medium",
                            idx === path.length - 1 ? "text-blue-600" : "text-gray-600"
                        )}>
                            {node.name}
                        </span>
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentNodes.map((node) => {
                    const Icon = iconConfig[node.type] || MapPin;
                    return (
                        <div
                            key={node.id}
                            onClick={() => onNavigate(node)}
                            className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate group-hover:text-blue-700">
                                        {node.name}
                                    </p>
                                    <p className="text-xs text-gray-500 capitalize">
                                        {node.type.toLowerCase()}
                                    </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
