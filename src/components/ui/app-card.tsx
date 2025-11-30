"use client";

import { useRouter } from "next/navigation";
import { LucideIcon } from "lucide-react";

interface AppCardProps {
    icon: LucideIcon;
    label: string;
    href: string;
    color?: string;
    onClick?: () => void;
}

export function AppCard({ icon: Icon, label, href, color = "text-gray-700", onClick }: AppCardProps) {
    const router = useRouter();

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            router.push(href);
        }
    };

    return (
        <div
            onClick={handleClick}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-gray-50 aspect-square border border-gray-100"
        >
            <Icon className={`h-12 w-12 mb-3 ${color}`} />
            <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
    );
}
