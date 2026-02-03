import { QrCode, MapPin, Monitor, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProofType = "qr" | "geo" | "kiosk" | "manual";

interface ProofChipProps {
    type: ProofType;
    className?: string;
}

const proofConfig: Record<ProofType, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
    qr: {
        label: "QR Code",
        icon: QrCode,
        className: "proof-qr",
    },
    geo: {
        label: "Location",
        icon: MapPin,
        className: "proof-geo",
    },
    kiosk: {
        label: "Kiosk",
        icon: Monitor,
        className: "proof-kiosk",
    },
    manual: {
        label: "Manual",
        icon: UserCheck,
        className: "proof-manual",
    },
};

export function ProofChip({ type, className }: ProofChipProps) {
    const config = proofConfig[type] || proofConfig.manual;
    const Icon = config.icon;

    return (
        <span className={cn(config.className, className)}>
            <Icon className="h-3.5 w-3.5" />
            {config.label}
        </span>
    );
}
