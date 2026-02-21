"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Paintbrush, Save, Palette, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { applyOrgThemeCssVars, loadOrgThemeBySlug } from "@/lib/org-theme";
import { useToast } from "@/components/ui/use-toast";

type ThemeMode = "light" | "dark" | "auto";

type ThemePresetId = "custom" | "ember" | "ocean" | "forest" | "midnight";

type ThemePreset = {
  id: ThemePresetId;
  name: string;
  primary: string;
  accent: string;
  tokens: Record<string, string>;
};

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "custom",
    name: "Custom",
    primary: "#4f46e5",
    accent: "#06b6d4",
    tokens: {},
  },
  {
    id: "ember",
    name: "Ember",
    primary: "#f97316",
    accent: "#ec4899",
    tokens: {
      "--primary": "24 95% 53%",
      "--accent": "340 82% 52%",
      "--ring": "24 95% 53%",
      "--surface-0": "40 20% 100%",
      "--surface-1": "40 18% 98%",
      "--surface-2": "40 15% 96%",
      "--surface-3": "40 12% 93%",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    primary: "#0ea5e9",
    accent: "#22c55e",
    tokens: {
      "--primary": "199 89% 48%",
      "--accent": "142 71% 45%",
      "--ring": "199 89% 48%",
      "--surface-0": "205 50% 99%",
      "--surface-1": "205 40% 97%",
      "--surface-2": "205 35% 95%",
      "--surface-3": "205 30% 92%",
    },
  },
  {
    id: "forest",
    name: "Forest",
    primary: "#16a34a",
    accent: "#84cc16",
    tokens: {
      "--primary": "142 71% 36%",
      "--accent": "84 81% 44%",
      "--ring": "142 71% 36%",
      "--surface-0": "90 40% 99%",
      "--surface-1": "90 35% 97%",
      "--surface-2": "90 30% 95%",
      "--surface-3": "90 25% 92%",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    primary: "#6366f1",
    accent: "#06b6d4",
    tokens: {
      "--background": "225 20% 6%",
      "--foreground": "210 20% 94%",
      "--card": "225 18% 8%",
      "--card-foreground": "210 20% 94%",
      "--popover": "225 18% 8%",
      "--popover-foreground": "210 20% 94%",
      "--border": "225 14% 14%",
      "--input": "225 14% 14%",
      "--muted": "225 14% 14%",
      "--muted-foreground": "210 10% 60%",
      "--primary": "239 84% 67%",
      "--primary-foreground": "225 20% 6%",
      "--accent": "189 94% 43%",
      "--accent-foreground": "225 20% 6%",
      "--ring": "239 84% 67%",
      "--surface-0": "225 20% 4%",
      "--surface-1": "225 20% 6%",
      "--surface-2": "225 18% 9%",
      "--surface-3": "225 16% 12%",
    },
  },
];

export default function AppearanceSettingsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [orgId, setOrgId] = useState<string>("");
  const [orgName, setOrgName] = useState<string>("");

  const [form, setForm] = useState({
    theme_preset: "custom" as ThemePresetId,
    primary_color: "#4f46e5",
    accent_color: "#06b6d4",
    theme_mode: "auto" as ThemeMode,
    logo_url: "",
    kiosk_background_style: "",
    background_style: "",
    theme_tokens: {} as Record<string, string>,
  });

  const previewVars = useMemo(() => {
    return {
      primary: form.primary_color,
      accent: form.accent_color,
    };
  }, [form.primary_color, form.accent_color]);

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

    const { data: settings } = await supabase
      .from("organization_settings")
      .select(
        "primary_color, accent_color, theme_mode, logo_url, kiosk_background_style, background_style, theme_preset, theme_tokens"
      )
      .eq("org_id", typedOrg.id)
      .single();

    const s = settings as any;
    if (s) {
      setForm({
        theme_preset: (s.theme_preset as ThemePresetId) || "custom",
        primary_color: s.primary_color || "#4f46e5",
        accent_color: s.accent_color || "#06b6d4",
        theme_mode: (s.theme_mode as ThemeMode) || "auto",
        logo_url: s.logo_url || "",
        kiosk_background_style: s.kiosk_background_style || "",
        background_style: s.background_style || "",
        theme_tokens: (s.theme_tokens as any) || {},
      });
    } else {
      setForm((p) => ({ ...p }));
    }

    const theme = await loadOrgThemeBySlug(orgSlug);
    if (theme) applyOrgThemeCssVars(theme);

    setLoading(false);
  }, [orgSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    const supabase = createClient();

    const payload = {
      org_id: orgId,
      theme_preset: form.theme_preset === "custom" ? null : form.theme_preset,
      theme_tokens:
        form.theme_preset === "custom" ? null : Object.keys(form.theme_tokens || {}).length ? form.theme_tokens : null,
      primary_color: form.primary_color,
      accent_color: form.accent_color,
      secondary_color: form.accent_color,
      theme_mode: form.theme_mode,
      logo_url: form.logo_url || null,
      kiosk_background_style: form.kiosk_background_style || null,
      background_style: form.background_style || null,
    } as any;

    const { error } = await supabase
      .from("organization_settings")
      .upsert(payload, { onConflict: "org_id" });

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Appearance settings updated." });

      const theme = await loadOrgThemeBySlug(orgSlug);
      if (theme) applyOrgThemeCssVars(theme);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Paintbrush className="h-6 w-6" />
            Appearance
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize the look and feel for {orgName}.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme Tokens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="label">Theme preset</label>
              <Select
                value={form.theme_preset}
                onValueChange={(v) => {
                  const next = v as ThemePresetId;
                  const preset = THEME_PRESETS.find((p) => p.id === next);
                  if (!preset) return;
                  setForm((prev) => ({
                    ...prev,
                    theme_preset: preset.id,
                    primary_color: preset.id === "custom" ? prev.primary_color : preset.primary,
                    accent_color: preset.id === "custom" ? prev.accent_color : preset.accent,
                    theme_tokens: preset.id === "custom" ? {} : preset.tokens,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a preset" />
                </SelectTrigger>
                <SelectContent>
                  {THEME_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="label">Primary</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="h-10 w-14 p-1"
                  />
                  <Input
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label">Accent</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={form.accent_color}
                    onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                    className="h-10 w-14 p-1"
                  />
                  <Input
                    value={form.accent_color}
                    onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="label">Theme mode</label>
              <select
                value={form.theme_mode}
                onChange={(e) => setForm({ ...form, theme_mode: e.target.value as ThemeMode })}
                className="input-field h-10"
              >
                <option value="auto">Auto</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                Logo URL
              </label>
              <Input
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="label">Portal background style</label>
                <Input
                  value={form.background_style}
                  onChange={(e) => setForm({ ...form, background_style: e.target.value })}
                  placeholder="e.g. radial"
                />
              </div>
              <div className="space-y-2">
                <label className="label">Kiosk background style</label>
                <Input
                  value={form.kiosk_background_style}
                  onChange={(e) => setForm({ ...form, kiosk_background_style: e.target.value })}
                  placeholder="e.g. glass"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                backgroundImage: `radial-gradient(700px circle at 20% 0%, ${previewVars.accent}22, transparent 55%), radial-gradient(700px circle at 80% 0%, ${previewVars.primary}22, transparent 55%)`,
              }}
            >
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl text-white flex items-center justify-center"
                    style={{ backgroundImage: `linear-gradient(135deg, ${previewVars.primary}, ${previewVars.accent})` }}
                  >
                    <span className="font-bold">A</span>
                  </div>
                  <div>
                    <div className="font-semibold">AttendOS</div>
                    <div className="text-sm text-muted-foreground">Premium event surfaces</div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: "Expected", value: "180" },
                    { label: "Checked in", value: "46" },
                    { label: "Denied", value: "3" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl bg-background/70 backdrop-blur p-3 border">
                      <div className="text-xs text-muted-foreground">{m.label}</div>
                      <div className="text-xl font-bold" style={{ color: m.label === "Denied" ? "#ef4444" : undefined }}>
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <div
                    className="w-full rounded-xl py-3 text-center text-white font-semibold"
                    style={{ backgroundImage: `linear-gradient(135deg, ${previewVars.primary}, ${previewVars.accent})` }}
                  >
                    Primary Action
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
