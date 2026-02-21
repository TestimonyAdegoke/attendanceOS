"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus, Calendar, Clock, MapPin, RefreshCw, Search,
  CalendarDays, Play, CheckCircle2, XCircle, MoreHorizontal,
  Pencil, Users
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { SessionDialog } from "@/components/dashboard/session-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Session {
  id: string;
  name: string;
  session_date: string;
  start_at: string;
  end_at: string;
  status: string;
  location_id: string | null;
  locations?: { name: string } | null;
}

export default function OrgSessionsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const loadSessions = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (!org) return;

    const currentOrgId = (org as { id: string }).id;
    setOrgId(currentOrgId);

    let query = supabase
      .from("sessions")
      .select("*, locations(name)")
      .eq("org_id", currentOrgId)
      .order("session_date", { ascending: filter === "upcoming" });

    const now = new Date().toISOString().split("T")[0];
    if (filter === "upcoming") {
      query = query.gte("session_date", now);
    } else if (filter === "past") {
      query = query.lt("session_date", now);
    }

    const { data } = await query.limit(50);
    setSessions((data as Session[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, [orgSlug, filter]);

  const filteredSessions = sessions.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    const supabase = createClient();
    await supabase.from("sessions").delete().eq("id", sessionId);
    await loadSessions();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split("T")[0];
    return dateString === today;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-9 w-32 bg-muted animate-pulse rounded-lg mb-2" />
            <div className="h-5 w-64 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-muted-foreground mt-1">Manage attendance sessions and events</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={loadSessions}
            size="icon"
            className="rounded-xl"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => { setSelectedSession(null); setDialogOpen(true); }}
            className="rounded-xl bg-gradient-to-r from-primary to-violet-600 shadow-lg shadow-primary/25"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Session
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-muted/50 border-transparent focus:border-primary/50"
          />
        </div>
        <div className="flex rounded-xl border p-1 bg-muted/30">
          {(["upcoming", "past", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                filter === f
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 && sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 mb-4">
              <CalendarDays className="h-10 w-10 text-cyan-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Create your first session to start tracking attendance.
            </p>
            <Button 
              onClick={() => { setSelectedSession(null); setDialogOpen(true); }}
              className="rounded-xl bg-gradient-to-r from-primary to-violet-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Session
            </Button>
          </CardContent>
        </Card>
      ) : filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-8 w-8 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground">No sessions match &quot;{search}&quot;</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <Card 
              key={session.id} 
              className={`overflow-hidden hover:shadow-md transition-all group ${
                isToday(session.session_date) ? "ring-2 ring-primary/50" : ""
              }`}
            >
              <CardContent
                className="p-4 cursor-pointer"
                onClick={() => router.push(`/${orgSlug}/dashboard/sessions/${session.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/${orgSlug}/dashboard/sessions/${session.id}`);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Date Badge */}
                  <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl ${
                    isToday(session.session_date)
                      ? "bg-gradient-to-br from-primary to-violet-600 text-white"
                      : "bg-muted"
                  }`}>
                    <span className="text-xs font-medium uppercase">
                      {new Date(session.session_date).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-2xl font-bold">
                      {new Date(session.session_date).getDate()}
                    </span>
                  </div>

                  {/* Session Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {session.name}
                      </h3>
                      {isToday(session.session_date) && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(session.start_at)} - {formatTime(session.end_at)}
                      </span>
                      {session.locations && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {session.locations.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      session.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : session.status === "completed"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {session.status === "active" ? (
                        <Play className="h-3 w-3" />
                      ) : session.status === "completed" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {session.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSession(session);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                      <Link
                        href={`/${orgSlug}/dashboard/sessions/${session.id}`}
                        aria-label="Assign attendees"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Users className="h-4 w-4" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/${orgSlug}/dashboard/sessions/${session.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(session);
                            setDialogOpen(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/${orgSlug}/dashboard/sessions/${session.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Assign attendees
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(session.id);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        session={selectedSession as any}
        orgId={orgId || ""}
        onSuccess={loadSessions}
      />
    </div>
  );
}
