"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  MapPin,
  CheckCircle2,
  XCircle,
  QrCode,
  User,
  Clock,
  Navigation,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface Session {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  location_id: string | null;
  locations?: {
    name: string;
    lat: number | null;
    lng: number | null;
  } | null;
}

interface Geofence {
  radius_m: number;
  locations: {
    lat: number;
    lng: number;
  };
}

interface UserProfile {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface PersonRecord {
  id: string;
  checkin_code: string;
}

type CheckinStatus = "idle" | "checking" | "success" | "error" | "outside_geofence";

export default function SelfCheckinPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [person, setPerson] = useState<PersonRecord | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [geofence, setGeofence] = useState<Geofence | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus>("idle");
  const [showQR, setShowQR] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      setLoading(false);
      return;
    }

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("id", authUser.id)
      .single();

    if (profile) {
      setUser(profile as UserProfile);
    }

    // Get org membership
    const { data: membership } = await supabase
      .from("org_memberships")
      .select("org_id")
      .eq("user_id", authUser.id)
      .single();

    if (!membership) {
      setLoading(false);
      return;
    }

    const orgId = (membership as { org_id: string }).org_id;

    // Find person record
    const { data: personData } = await supabase
      .from("people")
      .select("id, checkin_code")
      .eq("org_id", orgId)
      .eq("email", authUser.email || "")
      .single();

    if (personData) {
      setPerson(personData as PersonRecord);
    }

    // Find active session
    const now = new Date().toISOString();
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, name, start_at, end_at, location_id, locations(name, lat, lng)")
      .eq("org_id", orgId)
      .eq("status", "active")
      .lte("start_at", now)
      .gte("end_at", now)
      .limit(1);

    if (sessions && sessions.length > 0) {
      const session = sessions[0] as Session;
      setActiveSession(session);

      // Load geofence if location exists
      if (session.location_id) {
        const { data: geofenceData } = await supabase
          .from("geofences")
          .select("radius_m, locations(lat, lng)")
          .eq("location_id", session.location_id)
          .single();

        if (geofenceData) {
          setGeofence(geofenceData as unknown as Geofence);
        }
      }
    }

    setLoading(false);
  }, []);

  // Generate QR for personal badge when QR view is active
  useEffect(() => {
    if (!showQR || !person || !qrCanvasRef.current) return;

    const qrData = `attend://person/${person.checkin_code}`;
    QRCode.toCanvas(qrCanvasRef.current, qrData, {
      width: 192,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    }).catch((err) => {
      console.error("Failed to render QR code", err);
    });
  }, [showQR, person]);

  // Watch user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
      },
      (error) => {
        setLocationError(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Check if within geofence
  useEffect(() => {
    if (!userLocation || !geofence?.locations) {
      setIsWithinGeofence(null);
      return;
    }

    const dist = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      geofence.locations.lat,
      geofence.locations.lng
    );

    setDistance(Math.round(dist));
    setIsWithinGeofence(dist <= geofence.radius_m);
  }, [userLocation, geofence]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckin = async () => {
    if (!activeSession || !person) return;

    // Check geofence if required
    if (geofence && !isWithinGeofence) {
      setCheckinStatus("outside_geofence");
      return;
    }

    setCheckinStatus("checking");

    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      setCheckinStatus("error");
      return;
    }

    const { data: membership } = await supabase
      .from("org_memberships")
      .select("org_id")
      .eq("user_id", authUser.id)
      .single();

    if (!membership) {
      setCheckinStatus("error");
      return;
    }

    const { error } = await supabase.from("attendance_records").insert({
      org_id: (membership as { org_id: string }).org_id,
      session_id: activeSession.id,
      person_id: person.id,
      method: "geo",
      status: "present",
      lat: userLocation?.lat || null,
      lng: userLocation?.lng || null,
    } as never);

    if (error) {
      setCheckinStatus("error");
    } else {
      setCheckinStatus("success");
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-cyan-500/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-cyan-500/5 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Not Signed In</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to access self check-in
            </p>
            <Button asChild>
              <a href="/login">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-cyan-500/5">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-white font-bold">
            {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{user.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowQR(!showQR)}
          className="rounded-full"
        >
          <QrCode className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="p-4 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <AnimatePresence mode="wait">
          {showQR ? (
            <motion.div
              key="qr"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <h2 className="text-xl font-bold mb-4">Your QR Badge</h2>
              <div className="bg-white p-6 rounded-2xl shadow-lg inline-block mb-4">
                {person ? (
                  <div className="flex flex-col items-center gap-3">
                    <canvas ref={qrCanvasRef} className="rounded-lg" />
                    <p className="text-xs text-muted-foreground font-mono tracking-wider">
                      {person.checkin_code}
                    </p>
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-muted flex items-center justify-center rounded-lg">
                    <QrCode className="h-20 w-20 mx-auto text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Show this at a kiosk for quick check-in
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowQR(false)}
              >
                Back to Check-in
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              {/* Session Info */}
              {activeSession ? (
                <Card className="mb-6">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{activeSession.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(activeSession.start_at)} - {formatTime(activeSession.end_at)}
                        </p>
                      </div>
                    </div>
                    {activeSession.locations && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{activeSession.locations.name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="mb-6">
                  <CardContent className="pt-6 text-center">
                    <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No active session</p>
                  </CardContent>
                </Card>
              )}

              {/* Location Status */}
              <div className="mb-6 text-center">
                {locationError ? (
                  <div className="flex items-center justify-center gap-2 text-amber-600">
                    <WifiOff className="h-4 w-4" />
                    <span className="text-sm">Location unavailable</span>
                  </div>
                ) : userLocation ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600">
                    <Wifi className="h-4 w-4" />
                    <span className="text-sm">Location active</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Navigation className="h-4 w-4 animate-pulse" />
                    <span className="text-sm">Getting location...</span>
                  </div>
                )}

                {geofence && distance !== null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {isWithinGeofence
                      ? "You are within the check-in area"
                      : `Move ${distance}m closer to check in`}
                  </p>
                )}
              </div>

              {/* Check-in Button */}
              <div className="flex justify-center">
                <motion.button
                  onClick={handleCheckin}
                  disabled={
                    !activeSession ||
                    !person ||
                    checkinStatus === "checking" ||
                    checkinStatus === "success"
                  }
                  className={`relative w-48 h-48 rounded-full font-bold text-xl transition-all ${
                    checkinStatus === "success"
                      ? "bg-emerald-500 text-white"
                      : checkinStatus === "error" || checkinStatus === "outside_geofence"
                      ? "bg-red-500 text-white"
                      : isWithinGeofence === false
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-gradient-to-br from-primary to-cyan-500 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
                  }`}
                  whileTap={
                    activeSession && person && isWithinGeofence !== false
                      ? { scale: 0.95 }
                      : {}
                  }
                  animate={
                    isWithinGeofence && checkinStatus === "idle"
                      ? {
                          boxShadow: [
                            "0 0 0 0 rgba(var(--primary), 0.4)",
                            "0 0 0 20px rgba(var(--primary), 0)",
                          ],
                        }
                      : {}
                  }
                  transition={{
                    repeat: isWithinGeofence && checkinStatus === "idle" ? Infinity : 0,
                    duration: 1.5,
                  }}
                >
                  {checkinStatus === "checking" ? (
                    <Loader2 className="h-12 w-12 mx-auto animate-spin" />
                  ) : checkinStatus === "success" ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="h-12 w-12 mb-2" />
                      <span>Checked In!</span>
                    </div>
                  ) : checkinStatus === "error" ? (
                    <div className="flex flex-col items-center">
                      <XCircle className="h-12 w-12 mb-2" />
                      <span>Error</span>
                    </div>
                  ) : checkinStatus === "outside_geofence" ? (
                    <div className="flex flex-col items-center">
                      <MapPin className="h-12 w-12 mb-2" />
                      <span className="text-base">Move Closer</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <User className="h-12 w-12 mb-2" />
                      <span>Check In</span>
                    </div>
                  )}
                </motion.button>
              </div>

              {/* Reset button after success/error */}
              {(checkinStatus === "success" || checkinStatus === "error" || checkinStatus === "outside_geofence") && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center mt-6"
                >
                  <Button
                    variant="outline"
                    onClick={() => setCheckinStatus("idle")}
                  >
                    {checkinStatus === "success" ? "Done" : "Try Again"}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p>Powered by AttendOS</p>
      </footer>
    </div>
  );
}
