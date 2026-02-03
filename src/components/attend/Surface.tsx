import { cn } from "@/lib/utils";
import React from "react";

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "elevated" | "interactive" | "ghost";
    padding?: "none" | "sm" | "md" | "lg";
}

/**
 * Surface Component - AttendOS V3
 * A foundational layout primitive for creating depth and hierarchy
 */
export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
    ({ className, variant = "default", padding = "none", children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative rounded-xl transition-all duration-200",
                    // Variants
                    variant === "default" && "bg-card border border-border/50 shadow-sm",
                    variant === "elevated" && "bg-card border border-border/50 shadow-md",
                    variant === "interactive" && [
                        "bg-card border border-border/50 shadow-sm cursor-pointer",
                        "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5",
                        "active:translate-y-0 active:shadow-sm",
                    ],
                    variant === "ghost" && "bg-transparent",
                    // Padding
                    padding === "sm" && "p-3",
                    padding === "md" && "p-4",
                    padding === "lg" && "p-6",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Surface.displayName = "Surface";
