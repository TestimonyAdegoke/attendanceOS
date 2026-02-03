"use client";

import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckInButtonProps {
    className?: string;
    size?: "default" | "lg";
}

export function CheckInButton({ className, size = "default" }: CheckInButtonProps) {
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200",
                "bg-gradient-to-r from-primary to-accent text-white shadow-primary",
                "hover:shadow-primary-lg hover:brightness-105 active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                size === "default" && "h-10 px-5 text-sm",
                size === "lg" && "h-12 px-6 text-base",
                className
            )}
        >
            <Activity className={cn("h-4 w-4", size === "lg" && "h-5 w-5")} />
            Quick Check-in
        </button>
    );
}
