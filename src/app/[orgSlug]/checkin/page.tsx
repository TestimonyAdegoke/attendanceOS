"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle,
  Loader2,
  QrCode,
  Search,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRScanner } from "@/components/kiosk/qr-scanner";
import { createClient } from "@/lib/supabase/client";
import { applyBrandingCssVars, normalizeBranding, type OrgBranding } from "@/lib/org-branding";

export default function CheckinPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("Check-in");
  const [branding, setBranding] = useState<OrgBranding>(() =>
    normalizeBranding({ primary: "#4f46e5", accent: "#06b6d4", logoUrl: null })
  );

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [mode, setMode] = useState<"scan" | "search">("scan");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [checkedInName, setCheckedInName] = useState("");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  const say = useCallback(
    (text: string) => {
      if (!audioEnabled) return;
      if (typeof window === "undefined") return;
      if (!("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1;
        utter.pitch = 1;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore
      }
    },
    [audioEnabled]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem("attendos:kiosk:audio");
      if (raw === "0") setAudioEnabled(false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("attendos:kiosk:audio", audioEnabled ? "1" : "0");
    } catch {
      // ignore
    }
  }, [audioEnabled]);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, brand_primary, brand_accent, brand_logo_url")
      .eq("slug", orgSlug)
      .single();

    if (!org) {
      setLoading(false);
      return;
    }

    const typedOrg = org as any;
    setOrgId(typedOrg.id);
    setOrgName(typedOrg.name || "Check-in");
    const normalized = normalizeBranding({
      primary: typedOrg.brand_primary,
      accent: typedOrg.brand_accent,
      logoUrl: typedOrg.brand_logo_url,
      orgName: typedOrg.name,
    });
    setBranding(normalized);
    applyBrandingCssVars(normalized);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const { data: sessionsData } = await supabase
      .from("sessions")
      .select("id, name, session_date, start_at, end_at, status")
      .eq("org_id", typedOrg.id)
      .gte("start_at", todayStart)
      .lt("start_at", todayEnd)
      .in("status", ["scheduled", "active"])
      .order("start_at");

    const rows = (sessionsData as Session[]) || [];
    setSessions(rows);
    if (!selectedSessionId && rows.length > 0) setSelectedSessionId(rows[0].id);

    setLoading(false);
  }, [orgSlug, selectedSessionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (status === "success" || status === "error") {
      const t = setTimeout(() => {
        setStatus("idle");
        setMessage("");
        setCheckedInName("");
        setSearch("");
        setSearchResults([]);
      }, 3200);
      return () => clearTimeout(t);
    }
  }, [status]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const searchPeople = useCallback(async () => {
    if (!orgId) return;
    const q = search.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("people")
      .select("id, full_name, email, phone, checkin_code")
      .eq("org_id", orgId)
      .eq("status", "active")
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,external_id.ilike.%${q}%`)
      .limit(8);
    setSearchResults((data as any[]) || []);
  }, [orgId, search]);

  useEffect(() => {
    if (mode !== "search") return;
    const t = setTimeout(() => {
      searchPeople();
    }, 200);
    return () => clearTimeout(t);
  }, [searchPeople, mode]);

  const isAssignedToSession = async (personId: string) => {
    if (!selectedSessionId) return false;
    const supabase = createClient();
    const [{ data: sp }, { data: sg }] = await Promise.all([
      supabase.from("session_people").select("person_id").eq("session_id", selectedSessionId),
      supabase.from("session_groups").select("group_id").eq("session_id", selectedSessionId),
    ]);

    const peopleIds = new Set(((sp as any[]) || []).map((r) => r.person_id as string));
    const groupIds = ((sg as any[]) || []).map((r) => r.group_id as string).filter(Boolean);
    const hasAssignments = peopleIds.size > 0 || groupIds.length > 0;
    if (!hasAssignments) return true;
    if (peopleIds.has(personId)) return true;
    if (groupIds.length === 0) return false;

    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("person_id", personId)
      .in("group_id", groupIds)
      .limit(1);

    return !!membership && (membership as any[]).length > 0;
  };

  const performCheckin = async (person: Person) => {
    if (!orgId) return;
    if (!selectedSessionId) {
      setStatus("error");
      setMessage("Select a session first");
      say("Please select a session");
      return;
    }

    setStatus("loading");
    const supabase = createClient();

    const allowed = await isAssignedToSession(person.id);
    if (!allowed) {
      setStatus("error");
      setMessage("Not assigned to this session");
      say("Not assigned to this session");
      return;
    }

    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("session_id", selectedSessionId)
      .eq("person_id", person.id)
      .single();

    if (existing) {
      setStatus("error");
      setMessage("Already checked in");
      say("Already checked in");
      return;
    }

    const { error } = await (supabase as any)
      .from("attendance_records")
      .insert({
        org_id: orgId,
        session_id: selectedSessionId,
        person_id: person.id,
        method: "kiosk",
        status: "present",
        meta: { org_kiosk: true },
      });

    if (error) {
      setStatus("error");
      setMessage("Check-in failed");
      say("Check in failed");
      return;
    }

    setStatus("success");
    setCheckedInName(person.full_name);
    setMessage("Check-in successful");
    say(`Welcome ${person.full_name}`);
  };

  const handleQRScan = useCallback(
    async (scannedCode: string) => {
      if (status === "loading") return;
      if (!orgId) return;

      const match = scannedCode.match(/attend:\/\/person\/(.+)/);
      if (!match) {
        setStatus("error");
        setMessage("Invalid QR code");
        say("Invalid QR code");
        return;
      }

      setStatus("loading");
      const checkinCode = match[1];
      const supabase = createClient();
      const { data: person } = await supabase
        .from("people")
        .select("id, full_name, email, phone, checkin_code")
        .eq("org_id", orgId)
        .eq("checkin_code", checkinCode)
        .eq("status", "active")
        .single();

      if (!person) {
        setStatus("error");
        setMessage("Person not found");
        say("Person not found");
        return;
      }

      await performCheckin(person as any);
    },
    [orgId, performCheckin, say, status]
  );

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-10 text-white"
        style={{ backgroundImage: `linear-gradient(135deg, ${branding.primary}, ${branding.accent})` }}
      >
        <div className="text-center">
          <CheckCircle className="mx-auto h-28 w-28 mb-6" />
          <div className="text-4xl font-bold">Welcome</div>
          <div className="text-3xl mt-3">{checkedInName}</div>
          <div className="text-lg opacity-90 mt-2">{message}</div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-red-500 flex items-center justify-center p-10 text-white">
        <div className="text-center">
          <XCircle className="mx-auto h-28 w-28 mb-6" />
          <div className="text-4xl font-bold">Oops</div>
          <div className="text-2xl mt-3">{message}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `radial-gradient(1000px circle at 20% 0%, ${branding.accent}22, transparent 55%), radial-gradient(1000px circle at 80% 0%, ${branding.primary}22, transparent 55%)`,
      }}
    >
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl overflow-hidden text-white flex items-center justify-center"
              style={{ backgroundImage: `linear-gradient(135deg, ${branding.primary}, ${branding.accent})` }}
            >
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold flex items-center gap-2">
                {branding.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={branding.logoUrl} alt={orgName} className="h-7 w-7 rounded object-cover" />
                ) : null}
                <span>{orgName} Kiosk</span>
              </div>
              {selectedSession ? (
                <div className="text-sm text-muted-foreground">
                  {selectedSession.name} · {formatTime(selectedSession.start_at)} - {formatTime(selectedSession.end_at)}
                </div>
              ) : (
                <div className="text-sm text-amber-700">No session selected</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setAudioEnabled((v) => !v)}
              className="gap-2"
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {audioEnabled ? "Sound On" : "Sound Off"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[320px_1fr] mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No sessions today.</div>
              ) : (
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="input-field h-10"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant={mode === "scan" ? "default" : "outline"}
                  onClick={() => setMode("scan")}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Scan
                </Button>
                <Button
                  className="flex-1"
                  variant={mode === "search" ? "default" : "outline"}
                  onClick={() => {
                    setMode("search");
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              <Button variant="outline" onClick={load}>
                Refresh
              </Button>
            </CardContent>
          </Card>

          <Card className="min-h-[520px]">
            <CardContent className="p-6">
              {status === "loading" ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : mode === "scan" ? (
                <div className="flex flex-col items-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold">Ready to scan</div>
                    <div className="text-muted-foreground mt-1">Hold the QR code in front of the camera</div>
                    <div className="mt-3">
                      <Badge variant="outline">Sound: {audioEnabled ? "On" : "Off"}</Badge>
                    </div>
                  </div>
                  <div className="mt-6">
                    <QRScanner onScan={handleQRScan} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold">Search attendee</div>
                    <div className="text-muted-foreground mt-1">Type a name, email, phone, or external ID</div>
                  </div>

                  <Input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="h-12"
                  />

                  <div className="space-y-2">
                    {searchResults.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No results.</div>
                    ) : (
                      searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => performCheckin(p)}
                          className="w-full text-left p-4 rounded-xl border hover:bg-muted/30 transition-colors"
                        >
                          <div className="font-semibold">{p.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {p.email || p.phone || ""}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

type Session = {
  id: string;
  name: string;
  session_date: string;
  start_at: string;
  end_at: string;
  status: string;
};

type Person = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  checkin_code?: string;
};
