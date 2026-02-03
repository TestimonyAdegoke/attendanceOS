"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, User, Mail, Phone, Camera, Save, QrCode, Calendar,
  CheckCircle2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Surface } from "@/components/attend/Surface";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

interface AttendanceRecord {
  id: string;
  checked_in_at: string;
  status: string;
  method: string;
  sessions: { name: string; session_date: string; } | null;
}

export default function ProfilePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({ full_name: "", phone: "" });
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [checkinCode, setCheckinCode] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData as Profile);
      setFormData({
        full_name: (profileData as any).full_name || "",
        phone: (profileData as any).phone || "",
      });
    }

    const { data: membership } = await supabase
      .from("org_memberships")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (membership) {
      const { data: personData } = await supabase
        .from("people")
        .select("id, checkin_code")
        .eq("org_id", (membership as any).org_id)
        .eq("email", user.email || "")
        .single();

      if (personData) {
        setCheckinCode((personData as any).checkin_code);
        const { data: attendanceData } = await supabase
          .from("attendance_records")
          .select("id, checked_in_at, status, method, sessions(name, session_date)")
          .eq("person_id", (personData as any).id)
          .order("checked_in_at", { ascending: false })
          .limit(10);
        if (attendanceData) setRecentAttendance(attendanceData as AttendanceRecord[]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
        phone: formData.phone || null,
      } as never)
      .eq("id", profile.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } else {
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      setProfile({ ...profile, ...formData });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-32 skeleton rounded-lg" />
            <div className="h-4 w-48 skeleton rounded" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 skeleton rounded-xl" />
          <div className="h-80 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">
          Manage your personal information and view your attendance history.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <Surface variant="elevated" padding="lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative group cursor-pointer">
              <div className="avatar avatar-lg bg-gradient-to-br from-primary to-accent text-white">
                <span className="avatar-initials text-2xl">
                  {formData.full_name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Personal Information</h2>
              <p className="text-sm text-muted-foreground">Update your profile details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Full Name
              </label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </label>
              <Input
                value={profile?.email || ""}
                disabled
                className="bg-muted/30"
              />
              <p className="label-helper">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Phone
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div className="flex justify-end pt-6 mt-6 border-t border-border">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Surface>

        <div className="space-y-6">
          {/* QR Code Card */}
          <Surface variant="elevated" padding="md">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-white rounded-xl shadow-sm mb-4">
                <QrCode className="h-24 w-24 text-foreground" />
              </div>
              <div className="font-mono text-xl font-bold tracking-wider">
                {checkinCode || "NO-CODE"}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Your personal check-in code
              </p>
            </div>
          </Surface>

          {/* Recent Attendance */}
          <Surface variant="elevated" padding="md">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Recent Attendance</h3>
            </div>

            <div className="space-y-2">
              {recentAttendance.length > 0 ? recentAttendance.slice(0, 5).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      record.status === 'present' ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    )}>
                      {record.status === 'present' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium truncate max-w-[150px]">
                        {record.sessions?.name || "Unknown Session"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(record.checked_in_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">
                      {new Date(record.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">{record.method}</div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No attendance records yet
                </div>
              )}
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
