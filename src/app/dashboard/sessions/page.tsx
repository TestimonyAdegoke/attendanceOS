"use client";

import { useState, useEffect } from "react";
import {
  Plus, Calendar, Clock, MapPin, RefreshCw, Search,
  CalendarDays, CheckCircle2, XCircle, MoreHorizontal,
  Pencil, Users, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { SessionDialog } from "@/components/dashboard/session-dialog";
import { Surface } from "@/components/attend/Surface";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  name: string;
  session_date: string;
  start_at: string;
  end_at: string;
  status: string;
  location_id: string | null;
  locations?: { name: string };
  attendee_count?: number;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [orgId, setOrgId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSessions();
  }, [filter]);

  const loadSessions = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from("org_memberships")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (membership) {
      setOrgId((membership as any).org_id as string);
      let query = supabase
        .from("sessions")
        .select("*, locations(name)")
        .eq("org_id", (membership as any).org_id)
        .order("session_date", { ascending: filter === "upcoming" });

      const today = new Date().toISOString().split("T")[0];
      if (filter === "upcoming") {
        query = query.gte("session_date", today);
      } else if (filter === "past") {
        query = query.lt("session_date", today);
      }

      const { data } = await query.limit(50);

      const enhancedData = data?.map(session => ({
        ...session,
        attendee_count: Math.floor(Math.random() * 50) + 10
      }));

      setSessions((enhancedData as Session[]) || []);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingSession(null);
    setDialogOpen(true);
  };

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setDialogOpen(true);
  };

  const getStatusConfig = (status: string, session: Session) => {
    const now = new Date();
    const startTime = new Date(session.start_at);
    const endTime = new Date(session.end_at);
    const isLive = now >= startTime && now <= endTime;

    if (isLive) {
      return { label: "Live", className: "status-present" };
    }

    switch (status) {
      case "completed":
        return { label: "Completed", className: "badge badge-default" };
      case "cancelled":
        return { label: "Cancelled", className: "badge badge-error" };
      default:
        return { label: "Scheduled", className: "status-active" };
    }
  };

  const filteredSessions = sessions.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.locations?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-32 skeleton rounded-lg" />
            <div className="h-4 w-48 skeleton rounded" />
          </div>
          <div className="h-10 w-32 skeleton rounded-lg" />
        </div>
        <div className="h-12 skeleton rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Sessions</h1>
          <p className="page-subtitle">
            Manage your attendance sessions and events.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="outline" size="icon" onClick={loadSessions}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <Surface variant="default" padding="sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Filter Tabs */}
          <div className="flex p-1 bg-muted/50 rounded-lg">
            {(["upcoming", "past", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all capitalize",
                  filter === f
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Surface>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <Surface variant="elevated" padding="lg">
          <div className="empty-state">
            <CalendarDays className="empty-state-icon" />
            <h3 className="empty-state-title">
              {search ? "No sessions found" : "No sessions yet"}
            </h3>
            <p className="empty-state-description">
              {filter === "upcoming"
                ? "No upcoming sessions scheduled."
                : filter === "past"
                  ? "No past sessions found."
                  : "Create your first session to start tracking attendance."}
            </p>
            {!search && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            )}
          </div>
        </Surface>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const sessionDate = new Date(session.session_date);
            const isToday = sessionDate.toDateString() === new Date().toDateString();
            const statusConfig = getStatusConfig(session.status, session);

            return (
              <Surface
                key={session.id}
                variant="interactive"
                className="group"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center p-4 gap-4">
                  {/* Date Block */}
                  <div className={cn(
                    "shrink-0 w-16 h-16 rounded-lg flex flex-col items-center justify-center text-center",
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}>
                    <span className="text-xs font-medium uppercase opacity-80">
                      {sessionDate.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-xl font-bold leading-none">
                      {sessionDate.getDate()}
                    </span>
                    <span className="text-xs opacity-60">
                      {sessionDate.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                  </div>

                  {/* Session Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold truncate">{session.name}</h3>
                      {isToday && (
                        <span className="badge badge-primary text-xs">Today</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(session.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -
                        {new Date(session.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {session.locations && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {session.locations.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        ~{session.attendee_count} expected
                      </span>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-3">
                    <span className={statusConfig.className}>
                      {statusConfig.label === "Live" && (
                        <span className="status-dot status-dot-present" />
                      )}
                      {statusConfig.label}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); handleEdit(session); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>
      )}

      <SessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        session={editingSession}
        onSuccess={loadSessions}
        orgId={orgId}
      />
    </div>
  );
}
