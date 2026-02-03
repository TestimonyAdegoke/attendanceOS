"use client";

import { useState, useEffect } from "react";
import { Loader2, Settings, ShieldAlert, Save, Globe, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Surface } from "@/components/attend/Surface";

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState({
    id: "",
    name: "",
    slug: "",
    timezone: "UTC",
  });

  useEffect(() => {
    loadOrg();
  }, []);

  const loadOrg = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from("org_memberships")
      .select("organizations(*)")
      .eq("user_id", user.id)
      .single();

    if ((membership as any)?.organizations) {
      const orgData = (membership as any).organizations as any;
      setOrg({
        id: orgData.id,
        name: orgData.name,
        slug: orgData.slug,
        timezone: orgData.timezone || "UTC",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("organizations")
      .update({
        name: org.name,
        timezone: org.timezone,
      } as never)
      .eq("id", org.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Settings saved",
        description: "Organization settings have been updated.",
      });
    }
    setSaving(false);
  };

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-32 skeleton rounded-lg" />
            <div className="h-4 w-48 skeleton rounded" />
          </div>
        </div>
        <div className="h-64 skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Manage your organization settings and preferences.
        </p>
      </div>

      {/* Organization Settings */}
      <Surface variant="elevated" padding="lg">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Organization</h2>
            <p className="text-sm text-muted-foreground">
              Basic organization information and settings.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="label">Organization Name</label>
              <Input
                value={org.name}
                onChange={(e) => setOrg({ ...org, name: e.target.value })}
                placeholder="Enter organization name"
              />
            </div>

            <div className="space-y-2">
              <label className="label">Organization Slug</label>
              <Input
                value={org.slug}
                disabled
                className="bg-muted/30"
              />
              <p className="label-helper">This cannot be changed</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="label flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Timezone
            </label>
            <select
              value={org.timezone}
              onChange={(e) => setOrg({ ...org, timezone: e.target.value })}
              className="input-field"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-6 mt-6 border-t border-border">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Surface>

      {/* Danger Zone */}
      <Surface variant="default" padding="lg" className="border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
            <p className="text-sm text-destructive/80">
              Irreversible actions that affect your entire organization.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <div>
            <h4 className="font-medium text-destructive">Delete Organization</h4>
            <p className="text-sm text-destructive/70">
              Permanently delete all data associated with this organization.
            </p>
          </div>
          <Button variant="destructive" disabled>
            Delete
          </Button>
        </div>
      </Surface>
    </div>
  );
}
