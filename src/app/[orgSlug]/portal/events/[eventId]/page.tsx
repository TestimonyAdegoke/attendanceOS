"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import {
  BadgeCheck,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  QrCode,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { calculateDistanceClient } from "@/lib/checkin-eligibility";
import { loadOrgThemeBySlug, applyOrgThemeCssVars } from "@/lib/org-theme";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  name: string;
  session_date: string;
  start_at: string;
  end_at: string;
  status: string;
  public_code: string | null;
  event_qr_token: string | null;
  locations?: { id: string; name: string; lat: number | null; lng: number | null } | null;
};

type Person = {
  id: string;
  full_name: string;
  checkin_code: string;
};

type EligibilityUi = {
  checking: boolean;
  inRange: boolean;
  distanceMeters: number | null;
  error: string | null;
};

export default function PortalEventPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [orgId, setOrgId] = useState<string>("");
  const [orgName, setOrgName] = useState<string>("AttendOS");

  const [event, setEvent] = useState<Session | null>(null);
  const [person, setPerson] = useState<Person | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const [eligibility, setEligibility] = useState<EligibilityUi>({
    checking: false,
    inRange: false,
    distanceMeters: null,
    error: null,
  });

  const [geo, setGeo] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const theme = await loadOrgThemeBySlug(orgSlug);
    if (theme) applyOrgThemeCssVars(theme);

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

    const { data: session } = await supabase
      .from("sessions")
      .select("id, name, session_date, start_at, end_at, status, public_code, event_qr_token, locations(id, name, lat, lng)")
      .eq("org_id", typedOrg.id)
      .eq("id", eventId)
      .single();

    setEvent((session as any) || null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const { data: personRow } = await supabase
        .from("people")
        .select("id, full_name, checkin_code")
        .eq("org_id", typedOrg.id)
        .eq("email", user.email)
        .single();

      if (personRow) setPerson(personRow as any);
    }

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

  useEffect(() => {
    if (!event?.locations?.lat || !event?.locations?.lng) return;

    setEligibility((p) => ({ ...p, checking: true, error: null }));

    if (!navigator.geolocation) {
      setEligibility({ checking: false, inRange: false, distanceMeters: null, error: "Geolocation not supported" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        setGeo(next);

        const distance = calculateDistanceClient(next.lat, next.lng, event.locations!.lat!, event.locations!.lng!);
        const radius = 100;
        setEligibility({
          checking: false,
          inRange: distance <= radius,
          distanceMeters: Math.round(distance),
          error: null,
        });
      },
      (err) => {
        setEligibility({ checking: false, inRange: false, distanceMeters: null, error: err.message || "Unable to get location" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [event?.locations?.lat, event?.locations?.lng]);

  const hero = useMemo(() => {
    return {
      backgroundImage: `radial-gradient(900px circle at 15% 0%, var(--color-accent, #06b6d4)22, transparent 55%), radial-gradient(900px circle at 85% 0%, var(--color-primary, #4f46e5)22, transparent 55%)`,
    } as any;
  }, []);

  const canCheckIn = !!event && eligibility.inRange && !success;

  const doCheckin = async () => {
    if (!event) return;
    if (!geo) {
      setMessage("Location is required");
      return;
    }

    setSubmitting(true);
    setMessage("");

    if (!person) {
      setMessage("Your account is not linked to a member profile.");
      setSubmitting(false);
      return;
    }

    const res = await fetch(`/${orgSlug}/api/self-checkin/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: event.id,
        method: "geo",
        lat: geo.lat,
        lng: geo.lng,
        accuracy: geo.accuracy,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setMessage(json?.error || "Check-in denied");
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setMessage("You are checked in");
    setSubmitting(false);
  };

  const doCheckinByCode = async () => {
    if (!event) return;
    if (!geo) {
      setMessage("Location is required");
      return;
    }

    if (!code.trim()) {
      setMessage("Enter the event code");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const res = await fetch(`/${orgSlug}/api/self-checkin/public`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_code: code.trim(),
        identifier_type: "checkin_code",
        identifier: person?.checkin_code,
        lat: geo.lat,
        lng: geo.lng,
        accuracy: geo.accuracy,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setMessage(json?.error || "Check-in denied");
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setMessage("You are checked in");
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center" style={hero}>
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
    <div className="min-h-screen" style={hero}>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl text-white flex items-center justify-center"
              style={{ backgroundImage: `linear-gradient(135deg, var(--color-primary, #4f46e5), var(--color-accent, #06b6d4))` }}
            >
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">{orgName}</div>
              <div className="text-xs text-muted-foreground">Event</div>
            </div>
          </div>

          <Button asChild variant="ghost" size="sm">
            <Link href={`/${orgSlug}/portal`}>Portal</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-2xl">{event.name}</CardTitle>
            <div className="text-sm text-muted-foreground flex flex-wrap gap-3 mt-2">
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(event.session_date).toLocaleDateString()}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {formatTime(event.start_at)} - {formatTime(event.end_at)}
              </span>
              {event.locations?.name ? (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {event.locations.name}
                </span>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className={cn(
              "rounded-2xl border p-4",
              eligibility.inRange ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"
            )}>
              <div className="flex items-start gap-3">
                {eligibility.inRange ? (
                  <BadgeCheck className="h-5 w-5 text-emerald-600" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                )}
                <div className="flex-1">
                  <div className="font-semibold">
                    {eligibility.checking
                      ? "Checking your location..."
                      : eligibility.inRange
                      ? "You are inside the check-in zone"
                      : "You are outside the check-in zone"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {eligibility.error
                      ? eligibility.error
                      : eligibility.distanceMeters !== null
                      ? `Distance: ${eligibility.distanceMeters}m (required: 100m)`
                      : ""}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border p-5 bg-background/70 backdrop-blur">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Primary Action</div>
                <div className="text-2xl font-bold mt-1">Check In</div>
              </div>

              <div className="mt-4">
                <Button
                  disabled={!canCheckIn || submitting}
                  onClick={doCheckin}
                  className={cn(
                    "w-full h-14 text-lg font-semibold",
                    canCheckIn && "shadow-lg"
                  )}
                  style={{ backgroundImage: canCheckIn ? `linear-gradient(135deg, var(--color-primary, #4f46e5), var(--color-accent, #06b6d4))` : undefined }}
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : success ? "Checked In" : "CHECK IN"}
                </Button>
              </div>

              {message ? (
                <div className={cn("mt-3 text-sm", success ? "text-emerald-600" : "text-destructive")}>{message}</div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Card className="bg-muted/20">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Scan Event QR</div>
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrDataUrl} alt="Event QR" className="mt-3 w-full rounded-xl bg-white p-3" />
                    ) : (
                      <div className="text-sm text-muted-foreground mt-2">No QR</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-muted/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="text-xs text-muted-foreground">Enter Event Code</div>
                    <Input
                      ref={codeInputRef}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. ABC123"
                      className="h-11 font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={doCheckinByCode}
                      disabled={submitting || !eligibility.inRange}
                      className="w-full"
                    >
                      Use Code
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <div className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Premium check-in experience
                </div>
                {person ? <Badge variant="outline">Badge: {person.checkin_code}</Badge> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
