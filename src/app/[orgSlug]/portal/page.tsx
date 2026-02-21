"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  User,
  QrCode,
  Calendar,
  History,
  Clock,
  MapPin,
  Download,
  CheckCircle2,
  Settings,
  LogOut,
  ChevronRight,
  Loader2,
  Fingerprint,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { applyBrandingCssVars, normalizeBranding, type OrgBranding } from "@/lib/org-branding";
import { DigitalBadge } from "@/components/badges/digital-badge";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface PersonRecord {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  checkin_code: string;
  status: string;
  created_at: string;
}

interface UpcomingSession {
  id: string;
  name: string;
  session_date: string;
  start_at: string;
  end_at: string;
  locations?: {
    name: string;
  } | null;
}

interface AttendanceRecord {
  id: string;
  checkin_at: string;
  status: string;
  sessions: {
    name: string;
    session_date: string;
    locations?: {
      name: string;
    } | null;
  } | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  brand_primary?: string | null;
  brand_accent?: string | null;
  brand_logo_url?: string | null;
}

export default function UserPortalPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [person, setPerson] = useState<PersonRecord | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [branding, setBranding] = useState<OrgBranding>(() =>
    normalizeBranding({ primary: "#4f46e5", accent: "#06b6d4", logoUrl: null })
  );
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState("badge");

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setLoading(false);
      return;
    }

    // Load profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .eq("id", authUser.id)
      .single();

    if (profile) {
      setUser(profile as UserProfile);
    }

    // Get organization
    const { data: orgData } = await supabase
      .from("organizations")
      .select("id, name, slug, brand_primary, brand_accent, brand_logo_url")
      .eq("slug", orgSlug)
      .single();

    if (!orgData) {
      setLoading(false);
      return;
    }

    const typedOrg = orgData as Organization;
    setOrg(typedOrg);
    const normalized = normalizeBranding({
      primary: typedOrg.brand_primary || undefined,
      accent: typedOrg.brand_accent || undefined,
      logoUrl: typedOrg.brand_logo_url || null,
      orgName: typedOrg.name,
    });
    setBranding(normalized);
    applyBrandingCssVars(normalized);

    const orgId = typedOrg.id;

    // Find person record linked to this user
    const { data: personData } = await supabase
      .from("people")
      .select("id, full_name, email, phone, checkin_code, status, created_at")
      .eq("org_id", orgId)
      .eq("email", authUser.email || "")
      .single();

    if (personData) {
      setPerson(personData as PersonRecord);
      const personId = (personData as PersonRecord).id;

      // Load upcoming sessions
      const now = new Date().toISOString();
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, name, session_date, start_at, end_at, locations(name)")
        .eq("org_id", orgId)
        .gte("start_at", now)
        .order("start_at")
        .limit(5);

      setUpcomingSessions((sessions as UpcomingSession[]) || []);

      // Load attendance history
      const { data: attendance } = await supabase
        .from("attendance_records")
        .select(`
          id,
          checkin_at,
          status,
          sessions (
            name,
            session_date,
            locations (name)
          )
        `)
        .eq("person_id", personId)
        .order("checkin_at", { ascending: false })
        .limit(10);

      setAttendanceHistory((attendance as AttendanceRecord[]) || []);
    }

    setLoading(false);
  }, [orgSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString("en-US", {
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
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to access your portal
            </p>
            <Button asChild>
              <Link href={`/${orgSlug}/login`}>Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-cyan-500/5"
      style={{
        backgroundImage: `radial-gradient(900px circle at 15% 0%, ${branding.accent}22, transparent 55%), radial-gradient(900px circle at 85% 0%, ${branding.primary}22, transparent 55%)`,
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-1.5 rounded-xl text-white overflow-hidden"
              style={{ backgroundImage: `linear-gradient(135deg, ${branding.primary}, ${branding.accent})` }}
            >
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold">AttendOS</span>
              {org && (
                <span className="text-muted-foreground text-sm ml-2 inline-flex items-center gap-2">
                  <span>• {org.name}</span>
                  {branding.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={branding.logoUrl} alt={org.name} className="h-5 w-5 rounded object-cover" />
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/${orgSlug}/checkin`}>
                <QrCode className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center text-2xl font-bold">
            {person?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || user.email[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{person?.full_name || user.full_name || "User"}</h1>
            <p className="text-muted-foreground">{user.email}</p>
            {person && (
              <Badge variant="outline" className={cn(
                "mt-1",
                person.status === "active" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              )}>
                {person.status === "active" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                {person.status}
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="badge" className="gap-2">
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">Badge</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          {/* Badge Tab */}
          <TabsContent value="badge" className="mt-6">
            <Card>
              <CardContent className="flex flex-col items-center py-8">
                <h2 className="text-xl font-bold mb-2">Your Digital Badge</h2>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  Show this QR code at check-in kiosks or to event staff for quick attendance
                </p>

                <div className="w-full max-w-xl">
                  {person ? (
                    <DigitalBadge personId={person.id} variant="standard" />
                  ) : (
                    <div className="text-sm text-muted-foreground text-center">
                      No person record linked to this account.
                    </div>
                  )}
                </div>

                <div className="mt-4 w-full max-w-sm">
                  <Button asChild variant="outline" className="w-full" disabled={!person}>
                    <Link href={`/${orgSlug}/portal/profile/badge`}>
                      <QrCode className="mr-2 h-4 w-4" />
                      View Full Badge
                    </Link>
                  </Button>
                </div>

                <div className="mt-8 w-full max-w-sm">
                  <Button asChild className="w-full bg-gradient-to-r from-primary to-cyan-500">
                    <Link href={`/${orgSlug}/checkin`}>
                      <QrCode className="mr-2 h-4 w-4" />
                      Go to Self Check-in
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Upcoming Events
                </CardTitle>
                <CardDescription>Sessions you can attend</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/30 transition-colors"
                      >
                        <div className="text-center min-w-[50px]">
                          <div className="text-xs text-muted-foreground uppercase">
                            {new Date(session.session_date).toLocaleDateString("en-US", { month: "short" })}
                          </div>
                          <div className="text-xl font-bold">
                            {new Date(session.session_date).getDate()}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{session.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(session.start_at)}
                            </span>
                            {session.locations && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {session.locations.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No upcoming events</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Attendance History
                </CardTitle>
                <CardDescription>Your recent check-ins</CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceHistory.length > 0 ? (
                  <div className="space-y-3">
                    {attendanceHistory.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center gap-4 p-4 rounded-xl border"
                      >
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{record.sessions?.name || "Session"}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span>{formatDate(record.checkin_at)}</span>
                            <span>{formatTime(record.checkin_at)}</span>
                            {record.sessions?.locations && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {record.sessions.locations.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          Present
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No attendance records yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p className="font-medium">{person?.full_name || user.full_name || "Not set"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  {person?.phone && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="font-medium">{person.phone}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                    <p className="font-medium">
                      {person ? new Date(person.created_at).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" asChild className="flex-1">
                    <Link href="/dashboard/profile">
                      <Settings className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="container max-w-4xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        <p>Powered by AttendOS</p>
      </footer>
    </div>
  );
}
