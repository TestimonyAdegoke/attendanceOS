"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  MapPin,
  QrCode,
  Keyboard,
  Navigation,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  ChevronRight,
  Clock,
  Fingerprint,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { applyBrandingCssVars, normalizeBranding, type OrgBranding } from "@/lib/org-branding";

interface Session {
  id: string;
  name: string;
  session_date: string;
  start_at: string;
  end_at: string;
  public_code: string;
  status: string;
  locations?: {
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
  } | null;
}

interface GeofenceStatus {
  checking: boolean;
  inRange: boolean;
  distance: number | null;
  accuracy: number | null;
  error: string | null;
}

// Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function SelfCheckinPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [step, setStep] = useState<"select" | "identify" | "confirm" | "success" | "error">("select");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("Self Check-in");
  const [branding, setBranding] = useState<OrgBranding>(() =>
    normalizeBranding({ primary: "#4f46e5", accent: "#06b6d4", logoUrl: null })
  );
  
  // Identification
  const [identifierType, setIdentifierType] = useState<"phone" | "code">("phone");
  const [identifier, setIdentifier] = useState("");
  const [eventCode, setEventCode] = useState("");
  
  // Geofence
  const [geofence, setGeofence] = useState<GeofenceStatus>({
    checking: false,
    inRange: false,
    distance: null,
    accuracy: null,
    error: null,
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Result
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadSessions = useCallback(async () => {
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
    setOrgName(typedOrg.name || "Self Check-in");
    const normalized = normalizeBranding({
      primary: typedOrg.brand_primary,
      accent: typedOrg.brand_accent,
      logoUrl: typedOrg.brand_logo_url,
      orgName: typedOrg.name,
    });
    setBranding(normalized);
    applyBrandingCssVars(normalized);

    // Get today's active sessions
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const { data: sessionsData } = await supabase
      .from("sessions")
      .select(`
        id, name, session_date, start_at, end_at, public_code, status,
        locations (id, name, lat, lng)
      `)
      .eq("org_id", (typedOrg as { id: string }).id)
      .gte("start_at", todayStart)
      .lt("start_at", todayEnd)
      .in("status", ["scheduled", "active"])
      .order("start_at");

    setSessions((sessionsData as Session[]) || []);
    setLoading(false);
  }, [orgSlug]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Check geofence when session is selected
  useEffect(() => {
    if (!selectedSession?.locations?.lat || !selectedSession?.locations?.lng) return;

    setGeofence(prev => ({ ...prev, checking: true, error: null }));

    if (!navigator.geolocation) {
      setGeofence(prev => ({
        ...prev,
        checking: false,
        error: "Geolocation is not supported by your browser",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        const distance = calculateDistance(
          latitude,
          longitude,
          selectedSession.locations!.lat!,
          selectedSession.locations!.lng!
        );

        const geofenceRadius = 100; // Default 100m
        setGeofence({
          checking: false,
          inRange: distance <= geofenceRadius,
          distance: Math.round(distance),
          accuracy: Math.round(accuracy),
          error: null,
        });
      },
      (error) => {
        setGeofence({
          checking: false,
          inRange: false,
          distance: null,
          accuracy: null,
          error: error.message || "Unable to get your location",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [selectedSession]);

  const handleSelectSession = (session: Session) => {
    setSelectedSession(session);
    setStep("identify");
  };

  const handleSubmitCheckin = async () => {
    if (!selectedSession || !orgId) return;

    setSubmitting(true);

    try {
      const response = await fetch(`/${orgSlug}/api/self-checkin/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_code: selectedSession.public_code,
          identifier: identifier,
          identifier_type: identifierType === "phone" ? "phone" : "checkin_code",
          lat: userLocation?.lat,
          lng: userLocation?.lng,
          accuracy: geofence.accuracy,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: data.message });
        setStep("success");
      } else {
        setResult({ success: false, message: data.error });
        setStep("error");
      }
    } catch (error) {
      setResult({ success: false, message: "Network error. Please try again." });
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setStep("select");
    setSelectedSession(null);
    setIdentifier("");
    setEventCode("");
    setResult(null);
    setGeofence({
      checking: false,
      inRange: false,
      distance: null,
      accuracy: null,
      error: null,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-cyan-500/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-cyan-500/5"
      style={{
        // Used by a few UI accents without requiring Tailwind config changes
        backgroundImage: `radial-gradient(800px circle at 20% 0%, ${branding.accent}22, transparent 50%), radial-gradient(800px circle at 80% 0%, ${branding.primary}22, transparent 50%)`,
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-1.5 rounded-xl text-white overflow-hidden"
              style={{ backgroundImage: `linear-gradient(135deg, ${branding.primary}, ${branding.accent})` }}
            >
              <Fingerprint className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              {branding.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt={orgName} className="h-6 w-6 rounded object-cover" />
              )}
              <span className="font-bold">{orgName}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${orgSlug}/portal`}>Portal</Link>
          </Button>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 py-6">
        {/* Step: Select Session */}
        {step === "select" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Select Session</h1>
              <p className="text-muted-foreground">Choose the session you want to check in to</p>
            </div>

            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const startTime = new Date(session.start_at);
                  const endTime = new Date(session.end_at);
                  const now = new Date();
                  const isActive = now >= startTime && now <= endTime;
                  const isUpcoming = now < startTime;

                  return (
                    <Card
                      key={session.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        isActive && "ring-2 ring-primary"
                      )}
                      onClick={() => handleSelectSession(session)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[50px]">
                            <div className="text-2xl font-bold">
                              {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{session.name}</p>
                            {session.locations && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {session.locations.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isActive && (
                              <Badge className="bg-emerald-500">Live</Badge>
                            )}
                            {isUpcoming && (
                              <Badge variant="outline">
                                <Clock className="mr-1 h-3 w-3" />
                                Soon
                              </Badge>
                            )}
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No sessions available for check-in today</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step: Identify */}
        {step === "identify" && selectedSession && (
          <div className="space-y-6">
            <Button variant="ghost" onClick={() => setStep("select")} className="mb-2">
              ← Back to sessions
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>{selectedSession.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {selectedSession.locations?.name || "No location"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Geofence Status */}
                <div className={cn(
                  "p-4 rounded-xl",
                  geofence.checking && "bg-muted/50",
                  geofence.inRange && "bg-emerald-500/10",
                  !geofence.inRange && !geofence.checking && "bg-amber-500/10"
                )}>
                  {geofence.checking ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Checking your location...</span>
                    </div>
                  ) : geofence.error ? (
                    <div className="flex items-center gap-3 text-destructive">
                      <WifiOff className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Location Error</p>
                        <p className="text-sm">{geofence.error}</p>
                      </div>
                    </div>
                  ) : geofence.inRange ? (
                    <div className="flex items-center gap-3 text-emerald-600">
                      <Navigation className="h-5 w-5" />
                      <div>
                        <p className="font-medium">You&apos;re in the check-in zone!</p>
                        <p className="text-sm">{geofence.distance}m from location</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-amber-600">
                      <AlertCircle className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Move closer to check in</p>
                        <p className="text-sm">You&apos;re {geofence.distance}m away (need to be within 100m)</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Identification */}
                <div className="space-y-4">
                  <p className="font-medium">How would you like to identify yourself?</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={identifierType === "phone" ? "default" : "outline"}
                      onClick={() => setIdentifierType("phone")}
                      className="h-auto py-3"
                    >
                      <div className="text-center">
                        <Keyboard className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-sm">Phone Number</span>
                      </div>
                    </Button>
                    <Button
                      variant={identifierType === "code" ? "default" : "outline"}
                      onClick={() => setIdentifierType("code")}
                      className="h-auto py-3"
                    >
                      <div className="text-center">
                        <QrCode className="h-5 w-5 mx-auto mb-1" />
                        <span className="text-sm">Check-in Code</span>
                      </div>
                    </Button>
                  </div>

                  <Input
                    placeholder={identifierType === "phone" ? "Enter your phone number" : "Enter your check-in code"}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>

                {/* Submit */}
                <Button
                  onClick={handleSubmitCheckin}
                  disabled={!identifier || !geofence.inRange || submitting}
                  className={cn(
                    "w-full h-14 text-lg",
                    geofence.inRange && "bg-gradient-to-r from-primary to-cyan-500 animate-pulse"
                  )}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Checking in...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Check In Now
                    </>
                  )}
                </Button>

                {!geofence.inRange && !geofence.checking && !geofence.error && (
                  <p className="text-sm text-center text-muted-foreground">
                    You must be within the check-in zone to complete check-in
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Check-in Successful!</h2>
              <p className="text-muted-foreground mb-6">{result?.message}</p>
              <Button onClick={resetFlow}>Check in to Another Session</Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Check-in Failed</h2>
              <p className="text-muted-foreground mb-6">{result?.message}</p>
              <div className="space-y-2">
                <Button onClick={() => setStep("identify")} variant="outline" className="w-full">
                  Try Again
                </Button>
                <Button onClick={resetFlow} variant="ghost" className="w-full">
                  Select Different Session
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
