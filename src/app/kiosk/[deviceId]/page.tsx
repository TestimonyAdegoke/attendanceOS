"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Search, QrCode, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { QRScanner } from "@/components/kiosk/qr-scanner";
import { applyBrandingCssVars, normalizeBranding, type OrgBranding } from "@/lib/org-branding";

interface Person {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  checkin_code: string;
}

interface Session {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
}

type CheckinStatus = "idle" | "success" | "error" | "loading";

export default function KioskPage() {
  const params = useParams();
  const deviceId = params.deviceId as string;
  
  const [mode, setMode] = useState<"scan" | "search">("scan");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [status, setStatus] = useState<CheckinStatus>("idle");
  const [message, setMessage] = useState("");
  const [checkedInPerson, setCheckedInPerson] = useState<string>("");
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("Attend Kiosk");
  const [branding, setBranding] = useState<OrgBranding>(() =>
    normalizeBranding({ primary: "#4f46e5", accent: "#06b6d4", logoUrl: null })
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDeviceInfo();
  }, [deviceId]);

  useEffect(() => {
    if (status === "success" || status === "error") {
      const timer = setTimeout(() => {
        setStatus("idle");
        setMessage("");
        setCheckedInPerson("");
        setSearch("");
        setSearchResults([]);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (search.length >= 2) {
      searchPeople();
    } else {
      setSearchResults([]);
    }
  }, [search]);

  const loadDeviceInfo = async () => {
    const supabase = createClient();
    const { data: device } = await (supabase as any)
      .from("devices")
      .select("*, locations(*)")
      .eq("id", deviceId)
      .single();

    if (device) {
      const typedDevice = device as { location_id: string; org_id: string };
      setLocationId(typedDevice.location_id);
      setOrgId(typedDevice.org_id);

      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, brand_primary, brand_accent, brand_logo_url")
        .eq("id", typedDevice.org_id)
        .single();

      if (org) {
        const typedOrg = org as any;
        setOrgName(typedOrg.name || "Attend Kiosk");
        const normalized = normalizeBranding({
          primary: typedOrg.brand_primary,
          accent: typedOrg.brand_accent,
          logoUrl: typedOrg.brand_logo_url,
          orgName: typedOrg.name,
        });
        setBranding(normalized);
        applyBrandingCssVars(normalized);
      }

      loadCurrentSession(typedDevice.org_id, typedDevice.location_id);
    }
  };

  const loadCurrentSession = async (orgId: string, locationId: string) => {
    const supabase = createClient();
    const now = new Date().toISOString();
    
    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("org_id", orgId)
      .eq("location_id", locationId)
      .eq("status", "scheduled")
      .lte("start_at", now)
      .gte("end_at", now)
      .order("start_at")
      .limit(1);

    if (sessions && sessions.length > 0) {
      setCurrentSession(sessions[0] as Session);
    }
  };

  const searchPeople = async () => {
    if (!orgId) return;
    const supabase = createClient();
    
    const { data } = await supabase
      .from("people")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "active")
      .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,external_id.ilike.%${search}%`)
      .limit(5);

    setSearchResults((data as Person[]) || []);
  };

  const handleQRScan = useCallback(async (scannedCode: string) => {
    if (status === "loading") return;
    
    // Parse the QR code - expected format: attend://person/{checkin_code}
    const match = scannedCode.match(/attend:\/\/person\/(.+)/);
    if (!match) {
      setStatus("error");
      setMessage("Invalid QR code format");
      return;
    }

    const checkinCode = match[1];
    if (!orgId) {
      setStatus("error");
      setMessage("Device not configured");
      return;
    }

    setStatus("loading");
    const supabase = createClient();

    // Find person by checkin code
    const { data: person } = await supabase
      .from("people")
      .select("*")
      .eq("org_id", orgId)
      .eq("checkin_code", checkinCode)
      .eq("status", "active")
      .single();

    if (!person) {
      setStatus("error");
      setMessage("Person not found");
      return;
    }

    await performCheckin(person as Person);
  }, [orgId, status]);

  const performCheckin = async (person: Person) => {
    if (!currentSession || !orgId) {
      setStatus("error");
      setMessage("No active session available");
      return;
    }

    const supabase = createClient();

    // Check for duplicate
    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("session_id", currentSession.id)
      .eq("person_id", person.id)
      .single();

    if (existing) {
      setStatus("error");
      setMessage(`${person.full_name} is already checked in`);
      return;
    }

    // Create attendance record (cast client to any to work around Supabase typing)
    const { error } = await (supabase as any)
      .from("attendance_records")
      .insert({
        org_id: orgId,
        session_id: currentSession.id,
        person_id: person.id,
        method: "kiosk",
        status: "present",
        device_id: deviceId,
      });

    if (error) {
      setStatus("error");
      setMessage("Check-in failed. Please try again.");
    } else {
      setStatus("success");
      setCheckedInPerson(person.full_name);
      setMessage("Check-in successful");
    }
  };

  const handleCheckin = async (person: Person) => {
    setStatus("loading");
    await performCheckin(person);
  };


  if (status === "success") {
    return (
      <div className="min-h-screen bg-emerald-500 flex items-center justify-center p-8">
        <div className="text-center text-white">
          <CheckCircle className="mx-auto h-32 w-32 mb-8" />
          <h1 className="text-4xl font-bold mb-4">Welcome</h1>
          <p className="text-3xl">{checkedInPerson}</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-red-500 flex items-center justify-center p-8">
        <div className="text-center text-white">
          <XCircle className="mx-auto h-32 w-32 mb-8" />
          <h1 className="text-4xl font-bold mb-4">Error</h1>
          <p className="text-2xl">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      style={{
        backgroundImage: `radial-gradient(1200px circle at 20% 0%, ${branding.accent}22, transparent 55%), radial-gradient(1200px circle at 80% 0%, ${branding.primary}22, transparent 55%)`,
      }}
    >
      <header className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{orgName}</h1>
          {currentSession ? (
            <p className="text-muted-foreground">{currentSession.name}</p>
          ) : (
            <p className="text-muted-foreground text-amber-600">No active session</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant={mode === "scan" ? "default" : "outline"}
            onClick={() => setMode("scan")}
          >
            <QrCode className="mr-2 h-4 w-4" />
            Scan
          </Button>
          <Button
            variant={mode === "search" ? "default" : "outline"}
            onClick={() => { setMode("search"); setTimeout(() => searchInputRef.current?.focus(), 100); }}
          >
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        {mode === "scan" ? (
          <div className="text-center">
            <div className="mb-8">
              <QRScanner onScan={handleQRScan} />
            </div>
            <p className="text-muted-foreground">
              Position QR code in front of camera, or switch to search mode
            </p>
          </div>
        ) : (
          <div className="w-full max-w-lg">
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="h-16 pl-14 text-xl"
                autoFocus
              />
            </div>

            {status === "loading" ? (
              <div className="text-center py-12">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => handleCheckin(person)}
                    className="w-full p-6 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="text-xl font-semibold">{person.full_name}</div>
                    {person.email && (
                      <div className="text-muted-foreground">{person.email}</div>
                    )}
                  </button>
                ))}
              </div>
            ) : search.length >= 2 ? (
              <div className="text-center py-12 text-muted-foreground">
                No results found
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
