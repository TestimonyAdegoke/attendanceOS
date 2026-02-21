"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    UsersRound,
    MapPin,
    CalendarDays,
    ClipboardCheck,
    Monitor,
    BarChart3,
    Settings,
    Building,
    Palette,
    BadgeCheck,
    Shield,
    Activity,
    Repeat,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardNavProps {
    orgSlug?: string;
    className?: string;
    onNavigate?: () => void;
}

export function getNavSections(basePath: string) {
    return [
        {
            title: "Overview",
            items: [
                { href: `${basePath}`, label: "Dashboard", icon: LayoutDashboard },
            ],
        },
        {
            title: "Manage",
            items: [
                { href: `${basePath}/people`, label: "People", icon: Users },
                { href: `${basePath}/groups`, label: "Groups", icon: UsersRound },
                { href: `${basePath}/locations`, label: "Locations", icon: MapPin },
            ],
        },
        {
            title: "Attendance",
            items: [
                { href: `${basePath}/calendar`, label: "Calendar", icon: CalendarDays },
                { href: `${basePath}/series`, label: "Series", icon: Repeat },
                { href: `${basePath}/sessions`, label: "Sessions", icon: Activity },
                { href: `${basePath}/attendance`, label: "Records", icon: ClipboardCheck },
            ],
        },
        {
            title: "Analytics",
            items: [
                { href: `${basePath}/reports`, label: "Reports", icon: BarChart3 },
            ],
        },
        {
            title: "Settings",
            items: [
                {
                    label: "Organization",
                    href: `${basePath}/settings`,
                    icon: Building,
                },
                {
                    label: "Appearance",
                    href: `${basePath}/settings/appearance`,
                    icon: Palette,
                },
                {
                    label: "Badge Designer",
                    href: `${basePath}/settings/badge-designer`,
                    icon: BadgeCheck,
                },
                {
                    label: "Team",
                    href: `${basePath}/users`,
                    icon: Users,
                },
                { href: `${basePath}/devices`, label: "Kiosks", icon: Monitor },
                { href: `${basePath}/settings`, label: "Settings", icon: Settings },
            ],
        },
    ];
}

export function DashboardNav({ orgSlug, className, onNavigate }: DashboardNavProps) {
    const pathname = usePathname();
    const basePath = orgSlug ? `/${orgSlug}/dashboard` : "/dashboard";
    const navSections = getNavSections(basePath);

    return (
        <nav
            className={cn(
                "w-56 shrink-0 border-r border-border bg-surface-1 h-full overflow-y-auto scrollbar-thin",
                className
            )}
        >
            <div className="p-4 space-y-6">
                {navSections.map((section) => (
                    <div key={section.title}>
                        <h3 className="nav-section-title mb-2">
                            {section.title}
                        </h3>
                        <ul className="space-y-1">
                            {section.items.map((item) => {
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== basePath && pathname.startsWith(item.href));

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "nav-item",
                                                isActive && "nav-item-active"
                                            )}
                                            onClick={onNavigate}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            <span className="flex-1">{item.label}</span>
                                            {isActive && (
                                                <ChevronRight className="h-3 w-3 opacity-50" />
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>

            {/* System Status */}
            <div className="p-4 mt-auto border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="status-dot status-dot-active" />
                    <span>System Online</span>
                </div>
            </div>
        </nav>
    );
}
