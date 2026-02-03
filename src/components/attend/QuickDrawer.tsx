import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import React, { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

interface QuickDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export const QuickDrawer: React.FC<QuickDrawerProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
}) => {
    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content
                    className={cn(
                        "fixed inset-y-2 right-2 z-50 flex w-full max-w-lg flex-col border border-white/10 bg-surface-2 shadow-2xl transition-transform duration-500 rounded-3xl",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full"
                    )}
                >
                    <div className="flex items-center justify-between p-6">
                        <div className="space-y-1">
                            {title && (
                                <DialogPrimitive.Title className="text-xl font-bold tracking-tight">
                                    {title}
                                </DialogPrimitive.Title>
                            )}
                            {description && (
                                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                                    {description}
                                </DialogPrimitive.Description>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 hover:bg-muted transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-2">
                        {children}
                    </div>
                    {footer && (
                        <div className="border-t border-border/50 p-6">
                            {footer}
                        </div>
                    )}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};
