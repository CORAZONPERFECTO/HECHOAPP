"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface AppCardProps {
    icon: LucideIcon;
    label: string;
    href: string;
    color?: string;
    onClick?: () => void;
}

export function AppCard({ icon: Icon, label, href, color = "text-gray-700", onClick }: AppCardProps) {
    const content = (
        <div className="flex flex-col items-center justify-center h-full w-full">
            <Icon className={`h-12 w-12 mb-3 ${color}`} />
            <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
        </div>
    );

    const containerClasses = "flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-gray-50 aspect-square border border-gray-100 select-none";

    if (onClick) {
        return (
            <div onClick={onClick} className={containerClasses} role="button">
                {content}
            </div>
        );
    }

    return (
        <Link href={href} className={containerClasses}>
            {content}
        </Link>
    );
}
