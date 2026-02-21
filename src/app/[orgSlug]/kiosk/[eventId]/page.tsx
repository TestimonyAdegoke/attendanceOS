"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  QrCode,
  Search,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRScanner } from "@/components/kiosk/qr-scanner";
import { createClient } from "@/lib/supabase/client";
import { applyOrgThemeCssVars, loadOrgThemeBySlug } from "@/lib/org-theme";

type Session = {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  status: string;
  event_qr_token: string | null;
  public_code: string | null;
  locations?: { name: string; lat: number | null; lng: number | null } | null;
};

type Person = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  checkin_code: string;
};

export default function EventKioskPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");
  const [orgName, setOrgName] = useState<string>("AttendOS");

  const [event, setEvent] = useState<Session | null>(null);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [mode, setMode] = useState<"scan" | "search" | "code">("scan");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "denied">("idle");
  const [statusText, setStatusText] = useState("");
  const [name, setName] = useState("");

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [latLng, setLatLng] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  const say = useCallback(
    (text: string) => {
      if (!audioEnabled) return;
      if (typeof window === "undefined") return;
      if (!("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore
      }
    },
    [audioEnabled]
  );

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("slug", orgSlug)
      .single();

    if (!org) {
      setLoading(false);
      return;
    }

    const typedOrg = org as any;
    setOrgId(typedOrg.id);
    setOrgName(typedOrg.name);

    const theme = await loadOrgThemeBySlug(orgSlug);
    if (theme) applyOrgThemeCssVars(theme);

    const { data: session } = await supabase
      .from("sessions")
      .select("id, name, start_at, end_at, status, event_qr_token, public_code, locations(name, lat, lng)")
      .eq("org_id", typedOrg.id)
      .eq("id", eventId)
      .single();

    setEvent((session as any) || null);
    setLoading(false);
  }, [eventId, orgSlug]);

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

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        setLatLng({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
      },
      () => {
        setLatLng(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (status === "success" || status === "denied") {
      const t = setTimeout(() => {
        setStatus("idle");
        setStatusText("");
        setName("");
        setSearch("");
        setSearchResults([]);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [status]);

  const bg = useMemo(() => {
    return {
      backgroundImage: `radial-gradient(1200px circle at 20% 0%, var(--color-accent, #06b6d4)22, transparent 55%), radial-gradient(1200px circle at 80% 0%, var(--color-primary, #4f46e5)22, transparent 55%)`,
    } as any;
  }, []);

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
    const t = setTimeout(searchPeople, 200);
    return () => clearTimeout(t);
  }, [mode, searchPeople]);

  const performCheckin = async (personCheckinCode: string) => {
    setStatus("loading");

    const res = await fetch(`/${orgSlug}/api/events/${eventId}/kiosk-checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_checkin_code: personCheckinCode,
        lat: latLng?.lat,
        lng: latLng?.lng,
        accuracy: latLng?.accuracy,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setStatus("denied");
      setStatusText(json?.error || "Denied");
      say(json?.error || "Denied");
      return;
    }

    setStatus("success");
    setName(json?.person?.full_name || "");
    setStatusText("Check-in successful");
    say(`Welcome ${json?.person?.full_name || ""}`);
  };

  const handleQRScan = useCallback(
    async (scannedCode: string) => {
      if (status === "loading") return;
      const match = scannedCode.match(/attend:\/\/person\/(.+)/);
      if (!match) {
        setStatus("denied");
        setStatusText("Invalid QR code");
        say("Invalid QR code");
        return;
      }

      await performCheckin(match[1]);
    },
    [say, status]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bg}>
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bg}>
        <div className="text-muted-foreground">Event not found.</div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ backgroundImage: `linear-gradient(135deg, var(--color-primary, #4f46e5), var(--color-accent, #06b6d4))` }}>
        <div className="text-center">
          <CheckCircle className="mx-auto h-32 w-32 mb-6" />
          <div className="text-5xl font-bold">Welcome</div>
          <div className="text-4xl mt-3">{name}</div>
          <div className="text-xl opacity-90 mt-2">{statusText}</div>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-500 text-white">
        <div className="text-center">
          <XCircle className="mx-auto h-32 w-32 mb-6" />
          <div className="text-5xl font-bold">Denied</div>
          <div className="text-2xl mt-3 max-w-2xl">{statusText}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={bg}>
      <div className="h-screen flex flex-col">
        <div className="border-b bg-background/70 backdrop-blur-xl">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="h-11 w-11 rounded-2xl text-white flex items-center justify-center"
                style={{ backgroundImage: `linear-gradient(135deg, var(--color-primary, #4f46e5), var(--color-accent, #06b6d4))` }}
              >
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-bold">{orgName}</div>
                <div className="text-sm text-muted-foreground">{event.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(event.start_at)} - {formatTime(event.end_at)}
                  </span>
                  {event.locations?.name ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.locations.name}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant={mode === "scan" ? "default" : "outline"} onClick={() => setMode("scan")}>
                <QrCode className="h-4 w-4 mr-2" />
                Scan
              </Button>
              <Button
                variant={mode === "search" ? "default" : "outline"}
                onClick={() => {
                  setMode("search");
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>

              <Button variant="outline" onClick={() => setAudioEnabled((v) => !v)} className="gap-2">
                {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {audioEnabled ? "Sound" : "Muted"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          {status === "loading" ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : mode === "scan" ? (
            <div className="flex flex-col items-center">
              <div className="text-center">
                <div className="text-5xl font-bold">Scan badge</div>
                <div className="text-muted-foreground mt-2 text-xl">Hold the attendee QR badge in view</div>
              </div>
              <div className="mt-8">
                <div className="rounded-3xl border bg-background/70 backdrop-blur p-4">
                  <QRScanner onScan={handleQRScan} />
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-3xl">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold">Search attendee</div>
                <div className="text-muted-foreground mt-2">Type a name, email, phone, or external ID</div>
              </div>

              <Input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-14 text-lg"
              />

              <div className="mt-4 space-y-2">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => performCheckin(p.checkin_code)}
                    className="w-full text-left p-4 rounded-2xl border bg-background/70 backdrop-blur hover:bg-muted/30 transition-colors"
                  >
                    <div className="text-xl font-semibold">{p.full_name}</div>
                    <div className="text-sm text-muted-foreground">{p.email || p.phone || ""}</div>
                  </button>
                ))}
                {search.length >= 2 && searchResults.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No results</div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
