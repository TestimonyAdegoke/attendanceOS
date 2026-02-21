"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import {
  Activity,
  BadgeCheck,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  QrCode,
  Settings,
  Users,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { loadOrgThemeBySlug, applyOrgThemeCssVars } from "@/lib/org-theme";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  org_id: string;
  name: string;
  session_date: string;
  start_at: string;
  end_at: string;
  status: string;
  public_code?: string | null;
  event_qr_token?: string | null;
  rules?: any;
  allowed_methods?: any;
  locations?: { id: string; name: string; lat: number | null; lng: number | null } | null;
  event_series?: { id: string; name: string } | null;
};

type Metric = { label: string; value: number; tone?: "default" | "danger" | "success" };

type ScopeRow = { id: string; scope_type: string; scope_id: string | null };

export default function EventCommandCenterPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");
  const [event, setEvent] = useState<Session | null>(null);

  const [tab, setTab] = useState("overview");

  const [metrics, setMetrics] = useState<Metric[]>([]);

  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const [scopes, setScopes] = useState<ScopeRow[]>([]);
  const [scopeType, setScopeType] = useState<"org" | "cohort" | "group" | "person">("org");
  const [scopeId, setScopeId] = useState<string>("");

  const [people, setPeople] = useState<{ id: string; full_name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [cohorts, setCohorts] = useState<{ id: string; name: string }[]>([]);

  const [attendeeFilter, setAttendeeFilter] = useState<"all" | "checked_in" | "late" | "absent" | "denied">("all");
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const statusTone = (s: string) => {
    if (s === "active") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (s === "completed") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (s === "cancelled") return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-muted text-muted-foreground";
  };

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (!org) {
      setLoading(false);
      return;
    }

    const currentOrgId = (org as any).id as string;
    setOrgId(currentOrgId);

    const theme = await loadOrgThemeBySlug(orgSlug);
    if (theme) applyOrgThemeCssVars(theme);

    const { data: session } = await supabase
      .from("sessions")
      .select(
        `
        id, org_id, name, session_date, start_at, end_at, status, public_code, event_qr_token, rules, allowed_methods,
        locations (id, name, lat, lng),
        event_series (id, name)
      `
      )
      .eq("org_id", currentOrgId)
      .eq("id", eventId)
      .single();

    setEvent((session as any) || null);

    const [{ data: scopeRows }, { data: peopleRows }, { data: groupRows }, { data: cohortRows }] = await Promise.all([
      supabase.from("event_attendance_scopes").select("id, scope_type, scope_id").eq("event_id", eventId),
      supabase.from("people").select("id, full_name").eq("org_id", currentOrgId).eq("status", "active").order("full_name").limit(500),
      supabase.from("groups").select("id, name").eq("org_id", currentOrgId).order("name").limit(500),
      supabase.from("cohorts").select("id, name").eq("org_id", currentOrgId).order("name").limit(500),
    ]);

    setScopes((scopeRows as any[]) || []);
    setPeople((peopleRows as any[]) || []);
    setGroups((groupRows as any[]) || []);
    setCohorts((cohortRows as any[]) || []);

    const { data: records } = await supabase
      .from("attendance_records")
      .select("id, status, method, checked_in_at, person_id, people(full_name)")
      .eq("session_id", eventId);

    setAttendanceRows((records as any[]) || []);

    const checkedIn = ((records as any[]) || []).filter((r) => r.status === "present" || r.status === "late").length;
    const late = ((records as any[]) || []).filter((r) => r.status === "late").length;
    const absent = 0;
    const denied = 0;

    setMetrics([
      { label: "Expected", value: 0 },
      { label: "Checked In", value: checkedIn, tone: "success" },
      { label: "Late", value: late },
      { label: "Absent", value: absent },
      { label: "Denied", value: denied, tone: "danger" },
    ]);

    setLoading(false);
  }, [eventId, orgSlug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const makeQr = async () => {
      if (!event?.event_qr_token) return;
      const data = `attend://event/${event.event_qr_token}`;
      const url = await QRCode.toDataURL(data, { width: 512, margin: 2 });
      setQrDataUrl(url);
    };
    makeQr();
  }, [event?.event_qr_token]);

  const heroAccent = useMemo(() => {
    return {
      backgroundImage: `radial-gradient(900px circle at 15% 0%, var(--color-accent, #06b6d4)22, transparent 55%), radial-gradient(900px circle at 85% 0%, var(--color-primary, #4f46e5)22, transparent 55%)`,
    } as any;
  }, []);

  const filteredAttendance = useMemo(() => {
    if (attendeeFilter === "all") return attendanceRows;
    if (attendeeFilter === "checked_in") return attendanceRows.filter((r) => r.status === "present" || r.status === "late");
    if (attendeeFilter === "late") return attendanceRows.filter((r) => r.status === "late");
    if (attendeeFilter === "absent") return [];
    if (attendeeFilter === "denied") return [];
    return attendanceRows;
  }, [attendanceRows, attendeeFilter]);

  const addScope = async () => {
    if (!orgId) return;
    const supabase = createClient();

    const payload: any = {
      org_id: orgId,
      event_id: eventId,
      scope_type: scopeType,
      scope_id: scopeType === "org" ? null : scopeId || null,
    };

    await supabase.from("event_attendance_scopes").insert(payload as any);
    await load();
  };

  const removeScope = async (id: string) => {
    const supabase = createClient();
    await supabase.from("event_attendance_scopes").delete().eq("id", id);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Event not found.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl border overflow-hidden" style={heroAccent}>
        <div className={cn("p-6 md:p-8 bg-background/70 backdrop-blur-xl")}> 
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{event.name}</h1>
                <Badge variant="outline">Event</Badge>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.session_date).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatTime(event.start_at)} - {formatTime(event.end_at)}
                </span>
                {event.locations && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {event.locations.name}
                  </span>
                )}
              </div>

              <div className="pt-2">
                <Badge variant="outline" className={cn("border", statusTone(event.status))}>
                  {event.status}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2">
                <Play className="h-4 w-4" />
                Start Check-in
              </Button>
              <Button asChild className="gap-2">
                <Link href={`/${orgSlug}/kiosk/${event.id}`}>
                  <ExternalLink className="h-4 w-4" />
                  Open Kiosk
                </Link>
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setTab("overview")}
              >
                <QrCode className="h-4 w-4" />
                View QR
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <Link href={`/${orgSlug}/dashboard/sessions/${event.id}`}>
                  <Settings className="h-4 w-4" />
                  Edit Event
                </Link>
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <Link href={`/${orgSlug}/checkin`}>
                  <BadgeCheck className="h-4 w-4" />
                  Org Kiosk
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-2xl border bg-background/75 backdrop-blur p-4">
                <div className="text-xs text-muted-foreground">{m.label}</div>
                <div
                  className={cn(
                    "text-2xl font-bold mt-1 transition-all",
                    m.tone === "danger" && "text-red-600",
                    m.tone === "success" && "text-emerald-600"
                  )}
                >
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="attendees" className="gap-2">
            <Users className="h-4 w-4" />
            Attendees
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Check-in Settings
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity & Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Event Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Define who can attend. If any scopes exist, attendees must match at least one scope.
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={scopeType}
                    onChange={(e) => {
                      setScopeType(e.target.value as any);
                      setScopeId("");
                    }}
                    className="input-field h-10 sm:w-48"
                  >
                    <option value="org">Entire Org</option>
                    <option value="cohort">Cohort</option>
                    <option value="group">Group</option>
                    <option value="person">Person</option>
                  </select>

                  {scopeType === "org" ? null : scopeType === "group" ? (
                    <select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className="input-field h-10 flex-1">
                      <option value="">Select group...</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  ) : scopeType === "cohort" ? (
                    <select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className="input-field h-10 flex-1">
                      <option value="">Select cohort...</option>
                      {cohorts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className="input-field h-10 flex-1">
                      <option value="">Select person...</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                    </select>
                  )}

                  <Button onClick={addScope} disabled={scopeType !== "org" && !scopeId}>
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {scopes.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No scopes configured (event is open to policy rules).</div>
                  ) : (
                    scopes.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                        <div className="text-sm">
                          <span className="font-medium capitalize">{s.scope_type}</span>
                          {s.scope_id ? <span className="text-muted-foreground ml-2 font-mono text-xs">{s.scope_id}</span> : null}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => removeScope(s.id)}>
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event QR & Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border bg-background/60 p-4">
                    <div className="text-xs text-muted-foreground">Event Code</div>
                    <div className="text-2xl font-bold mt-1 font-mono tracking-wider">
                      {event.public_code || "—"}
                    </div>
                  </div>
                  <div className="rounded-2xl border bg-background/60 p-4">
                    <div className="text-xs text-muted-foreground">QR Token</div>
                    <div className="text-sm font-mono mt-2 break-all text-muted-foreground">
                      {event.event_qr_token || "—"}
                    </div>
                  </div>
                </div>

                {qrDataUrl ? (
                  <div className="rounded-2xl border bg-background/60 p-4 flex flex-col items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="Event QR" className="w-64 h-64 rounded-xl bg-white p-3" />
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = qrDataUrl;
                          a.download = `${event.name.replace(/\s+/g, "_")}_event_qr.png`;
                          a.click();
                        }}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button asChild className="gap-2">
                        <Link href={`/${orgSlug}/kiosk/${event.id}`}>
                          <ExternalLink className="h-4 w-4" />
                          Open Kiosk
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No QR token configured.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendees" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {([
                  { v: "all", label: "All" },
                  { v: "checked_in", label: "Checked in" },
                  { v: "late", label: "Late" },
                  { v: "absent", label: "Not checked in" },
                  { v: "denied", label: "Denied" },
                ] as any[]).map((f) => (
                  <button
                    key={f.v}
                    onClick={() => setAttendeeFilter(f.v)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg border transition-colors",
                      attendeeFilter === f.v ? "bg-primary/10 border-primary/30" : "hover:bg-muted/30"
                    )}
                  >
                    <div className="text-sm font-medium">{f.label}</div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAttendance.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No attendance yet.</div>
                ) : (
                  <div className="divide-y">
                    {filteredAttendance.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <div className="font-medium">{r.people?.full_name || r.person_id}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.method} · {new Date(r.checked_in_at).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant="outline">{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Check-in Policy (Preview)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Session-level settings are currently stored in rules/allowed_methods and self_checkin_policies.
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border p-4">
                  <div className="text-xs text-muted-foreground">Allowed methods</div>
                  <div className="text-sm font-mono mt-2 break-all text-muted-foreground">
                    {JSON.stringify(event.allowed_methods || {})}
                  </div>
                </div>
                <div className="rounded-2xl border p-4">
                  <div className="text-xs text-muted-foreground">Rules</div>
                  <div className="text-sm font-mono mt-2 break-all text-muted-foreground">
                    {JSON.stringify(event.rules || {})}
                  </div>
                </div>
                <div className="rounded-2xl border p-4">
                  <div className="text-xs text-muted-foreground">Geofence</div>
                  <div className="text-sm mt-2 text-muted-foreground">Mandatory</div>
                </div>
                <div className="rounded-2xl border p-4">
                  <div className="text-xs text-muted-foreground">Scope</div>
                  <div className="text-sm mt-2 text-muted-foreground">event_attendance_scopes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Audit log UI will be wired to audit_logs and denied attempts.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground">
        Event routes are backed by sessions. eventId = sessionId.
      </div>
    </div>
  );
}
