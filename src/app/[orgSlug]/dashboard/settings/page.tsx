"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, Settings, ShieldAlert, Save, Globe, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Surface } from "@/components/attend/Surface";

export default function OrgSettingsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState({
    id: "",
    name: "",
    slug: "",
    timezone: "UTC",
    brand_primary: "#4f46e5",
    brand_accent: "#06b6d4",
    brand_logo_url: "",
  });

  useEffect(() => {
    loadOrg();
  }, [orgSlug]);

  const loadOrg = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: orgData, error } = await supabase
      .from("organizations")
      .select("id, name, slug, timezone, brand_primary, brand_accent, brand_logo_url")
      .eq("slug", orgSlug)
      .single();

    if (!error && orgData) {
      const o = orgData as any;
      setOrg({
        id: o.id,
        name: o.name,
        slug: o.slug,
        timezone: o.timezone || "UTC",
        brand_primary: o.brand_primary || "#4f46e5",
        brand_accent: o.brand_accent || "#06b6d4",
        brand_logo_url: o.brand_logo_url || "",
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
        brand_primary: org.brand_primary,
        brand_accent: org.brand_accent,
        brand_logo_url: org.brand_logo_url || null,
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
    "Africa/Lagos",
    "Africa/Accra",
    "Africa/Cairo",
    "Africa/Johannesburg",
    "Europe/London",
    "Europe/Dublin",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Madrid",
    "Europe/Rome",
    "Europe/Amsterdam",
    "Europe/Stockholm",
    "Europe/Zurich",
    "Europe/Warsaw",
    "Europe/Moscow",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "America/Vancouver",
    "America/Sao_Paulo",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Bangkok",
    "Asia/Singapore",
    "Asia/Shanghai",
    "Asia/Hong_Kong",
    "Asia/Seoul",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Australia/Perth",
    "Pacific/Auckland",
  ];

  const formatUtcOffset = (tz: string) => {
    try {
      const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "shortOffset",
      });
      const parts = dtf.formatToParts(new Date());
      const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value;
      // Usually looks like "GMT+1" / "UTC+1" / "GMT-5".
      const normalized = offsetPart?.replace("GMT", "UTC") ?? "UTC";
      // Convert UTC+1 -> UTC+01:00, UTC-5 -> UTC-05:00
      const match = normalized.match(/UTC([+-])(\d{1,2})(?::(\d{2}))?/);
      if (!match) return normalized;
      const sign = match[1];
      const hh = match[2].padStart(2, "0");
      const mm = (match[3] ?? "00").padStart(2, "0");
      return `UTC${sign}${hh}:${mm}`;
    } catch {
      return "UTC";
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
              <Input value={org.slug} disabled className="bg-muted/30" />
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
                <option key={tz} value={tz}>
                  {tz} ({formatUtcOffset(tz)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="label">Brand Primary Color</label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={org.brand_primary}
                  onChange={(e) => setOrg({ ...org, brand_primary: e.target.value })}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={org.brand_primary}
                  onChange={(e) => setOrg({ ...org, brand_primary: e.target.value })}
                  placeholder="#4f46e5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="label">Brand Accent Color</label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={org.brand_accent}
                  onChange={(e) => setOrg({ ...org, brand_accent: e.target.value })}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={org.brand_accent}
                  onChange={(e) => setOrg({ ...org, brand_accent: e.target.value })}
                  placeholder="#06b6d4"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">Brand Logo URL</label>
            <Input
              value={org.brand_logo_url}
              onChange={(e) => setOrg({ ...org, brand_logo_url: e.target.value })}
              placeholder="https://..."
            />
            {org.brand_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.brand_logo_url} alt={org.name} className="h-12 w-12 rounded object-cover border" />
            ) : null}
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
      <Surface
        variant="default"
        padding="lg"
        className="border-destructive/30 bg-destructive/5"
      >
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
