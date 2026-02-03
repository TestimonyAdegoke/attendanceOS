"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Mail, Phone, Hash, Calendar, QrCode, 
  Download, RefreshCw, Pencil, Trash2, CheckCircle2, 
  XCircle, Clock, MapPin, History, Shield, ShieldAlert,
  Users, UserPlus, X, Activity, FileText, Settings
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { QRCodeDialog } from "@/components/dashboard/qr-dialog";
import { PersonDialog } from "@/components/dashboard/person-dialog";
import { cn } from "@/lib/utils";
import { getPersonFields } from "@/lib/org-schema";

interface Person {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  external_id: string | null;
  status: string;
  checkin_code: string;
  created_at: string;
  qr_token: string;
   attributes?: Record<string, any> | null;
}

interface AttendanceRecord {
  id: string;
  session_id: string;
  checkin_at: string;
  sessions: {
    name: string;
    session_date: string;
    locations: {
      name: string;
    } | null;
  } | null;
}

interface PersonGroup {
  id: string;
  group_id: string;
  groups: {
    id: string;
    name: string;
  } | null;
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  created_at: string;
}

export default function PersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const orgSlug = params.orgSlug as string;
  const personId = params.personId as string;

  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState<Person | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [groups, setGroups] = useState<PersonGroup[]>([]);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [orgType, setOrgType] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const loadPersonData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Get org by slug
      const { data: org } = await supabase
        .from("organizations")
        .select("id, org_type")
        .eq("slug", orgSlug)
        .single();

      if (!org) throw new Error("Organization not found");
      setOrgId((org as any).id);
      setOrgType((org as { org_type?: string }).org_type ?? null);

      // Get person
      const { data: personData, error: personError } = await supabase
        .from("people")
        .select("*")
        .eq("id", personId)
        .eq("org_id", (org as any).id)
        .single();

      if (personError || !personData) {
        throw new Error("Person not found");
      }
      setPerson(personData as Person);

      // Get attendance history
      const { data: attendanceData } = await supabase
        .from("attendance_records")
        .select(`
          id,
          session_id,
          checkin_at,
          sessions (
            name,
            session_date,
            locations (name)
          )
        `)
        .eq("person_id", personId)
        .order("checkin_at", { ascending: false })
        .limit(10);

      setAttendance((attendanceData as any) || []);

      // Get groups
      const { data: groupsData } = await supabase
        .from("group_members")
        .select(`
          id,
          group_id,
          groups (id, name)
        `)
        .eq("person_id", personId);

      setGroups((groupsData as any) || []);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to load person details";
      if (message.includes("Person not found")) {
        setNotFound(true);
      } else {
        toast({
          title: "Error",
          description: "Failed to load person details",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [orgSlug, personId, toast]);

  useEffect(() => {
    loadPersonData();
  }, [loadPersonData]);

  // Generate QR code for badge preview
  useEffect(() => {
    if (person && qrCanvasRef.current && !loading) {
      const qrData = `attendos://checkin/${person.checkin_code}`;
      QRCode.toCanvas(qrCanvasRef.current, qrData, {
        width: 128,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    }
  }, [person, loading]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!person && notFound) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Person not found</h1>
            <p className="text-muted-foreground mt-1">This person may have been deleted or the link is invalid.</p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardContent className="py-10 flex flex-col items-center justify-center text-center">
            <History className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-4 max-w-md">
              Please return to the People list and try selecting a different person.
            </p>
            <Button onClick={() => router.push(`/${orgSlug}/dashboard/people`)}>
              Back to People
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!person) return null;

  const allFields = getPersonFields(orgType);
  const coreKeys = new Set(["full_name", "email", "phone"]);
  const extraFields = allFields.filter((field) => !coreKeys.has(field.key));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center text-2xl font-bold">
              {person.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{person.full_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={person.status === "active" ? "default" : "secondary"} className={cn(
                  person.status === "active" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                )}>
                  {person.status === "active" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                  {person.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Joined {new Date(person.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setQrDialogOpen(true)}>
            <QrCode className="mr-2 h-4 w-4" />
            Badge / QR
          </Button>
          <Button onClick={() => setEditDialogOpen(true)} className="bg-gradient-to-r from-primary to-cyan-500">
            <Pencil className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Groups</span>
            {groups.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">{groups.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Profile Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Contact details and identity information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </p>
                    <p>{person.email || "Not provided"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" /> Phone
                    </p>
                    <p>{person.phone || "Not provided"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5" /> Check-in Code
                    </p>
                    <p className="font-mono font-bold tracking-wider">{person.checkin_code}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" /> Member Since
                    </p>
                    <p>{new Date(person.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {extraFields.length > 0 && person.attributes && (
                  <div className="pt-4 border-t">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {extraFields.map((field) => {
                        const value = (person.attributes as Record<string, any>)[field.key];
                        if (value == null || value === "") {
                          return null;
                        }
                        return (
                          <div key={field.key} className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              {field.label}
                            </p>
                            <p>{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Advanced/Admin Section - External ID */}
                <div className="pt-4 border-t">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    {showAdvanced ? "Hide" : "Show"} Advanced Details
                  </button>
                  {showAdvanced && (
                    <div className="mt-4 p-4 rounded-lg bg-muted/30 space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Hash className="h-3.5 w-3.5" /> External ID (System)
                        </p>
                        <p className="font-mono text-sm">{person.external_id || "Not assigned"}</p>
                        <p className="text-xs text-muted-foreground">Used for imports and integrations</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats / QR Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Digital Badge</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-6">
                <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center mb-4 border shadow-sm overflow-hidden">
                  <canvas ref={qrCanvasRef} className="rounded-lg" />
                </div>
                <p className="text-sm text-center text-muted-foreground mb-4">
                  Unique QR token for secure check-ins
                </p>
                <Button variant="outline" className="w-full" onClick={() => setQrDialogOpen(true)}>
                  <QrCode className="mr-2 h-4 w-4" />
                  View & Download Badge
                </Button>
              </CardContent>
            </Card>

            {/* Groups Summary */}
            <Card className="md:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Groups & Cohorts
                  </CardTitle>
                  <CardDescription>Member of {groups.length} group{groups.length !== 1 ? "s" : ""}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("groups")}>
                  Manage Groups
                </Button>
              </CardHeader>
              <CardContent>
                {groups.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g) => (
                      <Link
                        key={g.id}
                        href={`/${orgSlug}/dashboard/groups`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-colors"
                      >
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">{g.groups?.name}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Users className="h-10 w-10 mb-3 opacity-20" />
                    <p>Not assigned to any groups yet</p>
                    <Button variant="link" size="sm" className="mt-2" onClick={() => setActiveTab("groups")}>
                      Add to a group
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Group Memberships</CardTitle>
              <CardDescription>Manage which groups this person belongs to</CardDescription>
            </CardHeader>
            <CardContent>
              {groups.length > 0 ? (
                <div className="space-y-3">
                  {groups.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{g.groups?.name}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-muted/50 mb-4">
                    <Users className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-1">No Group Memberships</h3>
                  <p className="text-muted-foreground text-sm mb-4">Add this person to groups to organize attendance</p>
                  <Button asChild>
                    <Link href={`/${orgSlug}/dashboard/groups`}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Browse Groups
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Attendance History
                </CardTitle>
                <CardDescription>Complete attendance record</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {attendance.length > 0 ? (
                <div className="divide-y border rounded-xl overflow-hidden">
                  {attendance.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{record.sessions?.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(record.checkin_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {record.sessions?.locations && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {record.sessions.locations.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Present
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mb-4 opacity-20" />
                  <p>No attendance records found yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Audit & Activity Log
              </CardTitle>
              <CardDescription>Track changes and actions for this profile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium">Profile Created</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(person.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center py-4">
                  Detailed audit logging coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <QRCodeDialog 
        open={qrDialogOpen} 
        onOpenChange={setQrDialogOpen} 
        person={person} 
      />
      
      <PersonDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        person={person}
        orgId={orgId}
        onSuccess={loadPersonData}
      />
    </div>
  );
}
