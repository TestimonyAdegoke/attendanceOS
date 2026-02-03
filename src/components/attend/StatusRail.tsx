import { cn } from "@/lib/utils";

interface StatusRailProps {
    value: number;
    max?: number;
    variant?: "default" | "success" | "warning" | "danger";
    size?: "sm" | "md";
    showLabel?: boolean;
    className?: string;
}

export function StatusRail({
    value,
    max = 100,
    variant = "default",
    size = "md",
    showLabel = false,
    className,
}: StatusRailProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const variantClasses = {
        default: "bg-primary",
        success: "bg-success",
        warning: "bg-warning",
        danger: "bg-destructive",
    };

    return (
        <div className={cn("w-full", className)}>
            {showLabel && (
                <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium tabular-nums">{Math.round(percentage)}%</span>
                </div>
            )}
            <div
                className={cn(
                    "relative w-full overflow-hidden rounded-full bg-muted",
                    size === "sm" && "h-1.5",
                    size === "md" && "h-2"
                )}
            >
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        variantClasses[variant]
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
