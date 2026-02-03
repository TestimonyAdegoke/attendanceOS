import { createClient } from "@/lib/supabase/server";
import { Surface } from "@/components/attend/Surface";
import {
    Users, Calendar, ClipboardCheck, MapPin, TrendingUp,
    CheckCircle2, ArrowRight, Clock, Activity,
    CalendarDays, UserCheck, AlertCircle, ChevronRight,
    BarChart3, Plus, ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Get user's org
    const { data: membership } = await supabase
        .from("org_memberships")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

    const orgId = (membership as { org_id: string } | null)?.org_id || "";

    if (!orgId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <Surface variant="elevated" padding="lg" className="max-w-md">
                    <div className="empty-state">
                        <AlertCircle className="empty-state-icon" />
                        <h3 className="empty-state-title">No Organization Found</h3>
                        <p className="empty-state-description">
                            Complete the onboarding process to set up your organization and start tracking attendance.
                        </p>
                        <Link
                            href="/onboarding"
                            className="btn btn-primary"
                        >
                            Complete Setup
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </Surface>
            </div>
        );
    }

    // Get counts
    const [peopleCount, locationsCount, sessionsToday, attendanceToday] = await Promise.all([
        supabase.from("people").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        supabase.from("locations").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        supabase.from("sessions").select("id", { count: "exact", head: true })
            .eq("org_id", orgId)
            .eq("session_date", new Date().toISOString().split("T")[0]),
        supabase.from("attendance_records").select("id", { count: "exact", head: true })
            .eq("org_id", orgId)
            .gte("checked_in_at", new Date().toISOString().split("T")[0]),
    ]);

    const stats = [
        {
            label: "Total People",
            value: peopleCount.count || 0,
            icon: Users,
            href: "/dashboard/people",
            change: "+12%",
            changeType: "positive" as const,
        },
        {
            label: "Locations",
            value: locationsCount.count || 0,
            icon: MapPin,
            href: "/dashboard/locations",
            change: "Stable",
            changeType: "neutral" as const,
        },
        {
            label: "Today's Sessions",
            value: sessionsToday.count || 0,
            icon: Calendar,
            href: "/dashboard/sessions",
            change: "Active",
            changeType: "positive" as const,
        },
        {
            label: "Check-ins Today",
            value: attendanceToday.count || 0,
            icon: UserCheck,
            href: "/dashboard/attendance",
            change: "84%",
            changeType: "positive" as const,
        },
    ];

    // Get today's sessions
    const { data: todaySessions } = await supabase
        .from("sessions")
        .select("*, locations(name)")
        .eq("org_id", orgId)
        .eq("session_date", new Date().toISOString().split("T")[0])
        .order("start_at", { ascending: true })
        .limit(5);

    // Get recent check-ins
    const { data: recentCheckins } = await supabase
        .from("attendance_records")
        .select("*, people(full_name), sessions(name)")
        .eq("org_id", orgId)
        .order("checked_in_at", { ascending: false })
        .limit(6);

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    const attendanceRate = Math.round((attendanceToday.count || 0) / Math.max(peopleCount.count || 1, 1) * 100);

    return (
        <div className="space-y-6 pb-8 animate-fade-in">
            {/* Page Header */}
            <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">{greeting()}</h1>
                    <p className="page-subtitle">
                        Here's what's happening with your organization today.
                    </p>
                </div>
                <div className="page-actions">
                    <Link href="/dashboard/sessions/new" className="btn btn-secondary btn-sm">
                        <Plus className="h-4 w-4" />
                        New Session
                    </Link>
                    <Link href="/checkin" className="btn btn-primary btn-sm">
                        <Activity className="h-4 w-4" />
                        Quick Check-in
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Link key={stat.label} href={stat.href}>
                        <Surface variant="interactive" padding="md" className="h-full">
                            <div className="flex items-start justify-between">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <stat.icon className="h-5 w-5 text-primary" />
                                </div>
                                <div className={cn(
                                    "badge",
                                    stat.changeType === "positive" ? "badge-success" : "badge-default"
                                )}>
                                    {stat.changeType === "positive" && <TrendingUp className="h-3 w-3" />}
                                    {stat.change}
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="stat-value">{stat.value}</div>
                                <div className="stat-label">{stat.label}</div>
                            </div>
                        </Surface>
                    </Link>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Today's Sessions */}
                <Surface variant="elevated" className="lg:col-span-2 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <CalendarDays className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Today's Sessions</h3>
                                <p className="text-sm text-muted-foreground">
                                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard/sessions"
                            className="btn btn-ghost btn-sm"
                        >
                            View All
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div>
                        {todaySessions && todaySessions.length > 0 ? (
                            <div className="divide-y divide-border">
                                {todaySessions.map((session: any) => {
                                    const startTime = new Date(session.start_at);
                                    const isUpcoming = startTime > new Date();
                                    const isActive = !isUpcoming && new Date() < new Date(session.end_at);

                                    return (
                                        <div
                                            key={session.id}
                                            className="data-row py-4 px-4"
                                        >
                                            <div className="w-16 shrink-0">
                                                <div className="text-lg font-semibold tabular-nums">
                                                    {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{session.name}</div>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        {session.locations?.name || "No location"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                {isActive ? (
                                                    <span className="status-present">
                                                        <span className="status-dot status-dot-present" />
                                                        Live
                                                    </span>
                                                ) : isUpcoming ? (
                                                    <span className="status-active">
                                                        <Clock className="h-3 w-3" />
                                                        Upcoming
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-default">Completed</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state py-12">
                                <CalendarDays className="empty-state-icon" />
                                <h4 className="empty-state-title">No sessions today</h4>
                                <p className="empty-state-description">
                                    Create a session to start tracking attendance.
                                </p>
                                <Link href="/dashboard/sessions/new" className="btn btn-primary btn-sm">
                                    <Plus className="h-4 w-4" />
                                    Create Session
                                </Link>
                            </div>
                        )}
                    </div>
                </Surface>

                {/* Quick Stats & Actions */}
                <div className="space-y-6">
                    {/* Attendance Rate */}
                    <Surface variant="elevated" padding="md">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-success/10">
                                <Activity className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Attendance Rate</h3>
                                <p className="text-xs text-muted-foreground">Today</p>
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="text-4xl font-bold tabular-nums text-success">
                                {attendanceRate}%
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                                <div>{attendanceToday.count || 0} of {peopleCount.count || 0}</div>
                                <div>checked in</div>
                            </div>
                        </div>
                        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-success rounded-full transition-all duration-500"
                                style={{ width: `${attendanceRate}%` }}
                            />
                        </div>
                    </Surface>

                    {/* Quick Actions */}
                    <Surface variant="elevated" padding="md">
                        <h3 className="font-semibold mb-3">Quick Actions</h3>
                        <div className="space-y-2">
                            {[
                                { label: "Add Person", href: "/dashboard/people", icon: Users },
                                { label: "New Location", href: "/dashboard/locations", icon: MapPin },
                                { label: "View Reports", href: "/dashboard/reports", icon: BarChart3 },
                            ].map((action) => (
                                <Link
                                    key={action.label}
                                    href={action.href}
                                    className="data-row rounded-lg"
                                >
                                    <div className="p-1.5 rounded-md bg-muted">
                                        <action.icon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium flex-1">{action.label}</span>
                                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                                </Link>
                            ))}
                        </div>
                    </Surface>
                </div>
            </div>

            {/* Recent Check-ins */}
            <Surface variant="elevated" className="overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <ClipboardCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Recent Check-ins</h3>
                            <p className="text-sm text-muted-foreground">Latest attendance records</p>
                        </div>
                    </div>
                    <Link href="/dashboard/attendance" className="btn btn-ghost btn-sm">
                        View All
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>

                {recentCheckins && recentCheckins.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="table-cell table-header text-left">Person</th>
                                    <th className="table-cell table-header text-left">Session</th>
                                    <th className="table-cell table-header text-left">Method</th>
                                    <th className="table-cell table-header text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentCheckins.map((record: any) => (
                                    <tr key={record.id} className="table-row">
                                        <td className="table-cell">
                                            <div className="flex items-center gap-3">
                                                <div className="avatar avatar-sm bg-primary/10">
                                                    <span className="avatar-initials text-primary">
                                                        {record.people?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?"}
                                                    </span>
                                                </div>
                                                <span className="font-medium">{record.people?.full_name || "Unknown"}</span>
                                            </div>
                                        </td>
                                        <td className="table-cell text-muted-foreground">
                                            {record.sessions?.name || "—"}
                                        </td>
                                        <td className="table-cell">
                                            <span className={cn(
                                                "proof-chip",
                                                record.method === "qr" && "proof-qr",
                                                record.method === "geo" && "proof-geo",
                                                record.method === "kiosk" && "proof-kiosk",
                                                (!record.method || record.method === "manual") && "proof-manual"
                                            )}>
                                                {record.method || "Manual"}
                                            </span>
                                        </td>
                                        <td className="table-cell text-right tabular-nums">
                                            {new Date(record.checked_in_at).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state py-12">
                        <UserCheck className="empty-state-icon" />
                        <h4 className="empty-state-title">No check-ins yet</h4>
                        <p className="empty-state-description">
                            Check-ins will appear here once people start attending sessions.
                        </p>
                    </div>
                )}
            </Surface>
        </div>
    );
}
