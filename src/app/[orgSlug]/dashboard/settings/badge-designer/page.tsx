"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { DigitalBadge } from "@/components/badges/digital-badge";
import { applyOrgThemeCssVars, loadOrgThemeBySlug } from "@/lib/org-theme";

type BadgeTemplateId =
  | "glass"
  | "minimal"
  | "midnight"
  | "aurora"
  | "institutional"
  | "executive"
  | "compact"
  | "soft_modern"
  | "event_pass";

type BadgeQrSize = "sm" | "md" | "lg";

type BadgeConfig = {
  template: BadgeTemplateId;
  showSubtitle: boolean;
  showStatusChip: boolean;
  showCode: boolean;
  showWatermark: boolean;
  showDownload: boolean;
  qrSize: BadgeQrSize;
  backgroundMode?: "auto" | "custom";
  backgroundColor?: string;
};

const DEFAULT_CONFIG: BadgeConfig = {
  template: "glass",
  showSubtitle: true,
  showStatusChip: true,
  showCode: true,
  showWatermark: true,
  showDownload: true,
  qrSize: "md",
  backgroundMode: "auto",
};

const TEMPLATES: { id: BadgeTemplateId; name: string }[] = [
  { id: "glass", name: "Glass" },
  { id: "minimal", name: "Minimal" },
  { id: "midnight", name: "Midnight" },
  { id: "aurora", name: "Aurora" },
  { id: "institutional", name: "Institutional Classic" },
  { id: "executive", name: "Executive" },
  { id: "compact", name: "Compact Utility" },
  { id: "soft_modern", name: "Soft Modern" },
  { id: "event_pass", name: "Event Pass" },
];

function normalizeBadgeConfig(input: any): Partial<BadgeConfig> {
  if (!input || typeof input !== "object") return {};

  if (input.fields || input.qr) {
    return {
      template: input.template,
      showSubtitle: Boolean(input.fields?.subtitle),
      showStatusChip: Boolean(input.fields?.statusChip),
      showCode: Boolean(input.fields?.code),
      showWatermark: Boolean(input.fields?.watermark),
      showDownload: Boolean(input.fields?.download),
      qrSize: (input.qr?.size as BadgeQrSize) || undefined,
      backgroundMode: input.background?.mode === "custom" ? "custom" : "auto",
      backgroundColor: typeof input.background?.color === "string" ? input.background.color : undefined,
    };
  }

  return input as Partial<BadgeConfig>;
}

export default function BadgeDesignerPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string>("");

  const [config, setConfig] = useState<BadgeConfig>(DEFAULT_CONFIG);
  const [previewPersonId, setPreviewPersonId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const theme = await loadOrgThemeBySlug(orgSlug);
      if (theme) applyOrgThemeCssVars(theme);
    };
    run();
  }, [orgSlug]);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: org } = await supabase.from("organizations").select("id").eq("slug", orgSlug).single();
    if (!org) {
      setLoading(false);
      return;
    }

    const typedOrg = org as any;
    setOrgId(typedOrg.id);

    const { data: settings } = await supabase
      .from("organization_settings")
      .select("badge_config")
      .eq("org_id", typedOrg.id)
      .single();

    const s = settings as any;
    if (s?.badge_config) {
      setConfig({ ...DEFAULT_CONFIG, ...normalizeBadgeConfig(s.badge_config) });
    } else {
      setConfig(DEFAULT_CONFIG);
    }

    const { data: person } = await supabase.from("people").select("id").eq("org_id", typedOrg.id).limit(1).single();
    setPreviewPersonId((person as any)?.id || null);

    setLoading(false);
  }, [orgSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const badgeProps = useMemo(() => {
    return config;
  }, [config]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("organization_settings")
      .upsert({ org_id: orgId, badge_config: config } as any, { onConflict: "org_id" });

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Badge designer settings updated." });
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
    <div className="space-y-6 max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BadgeCheck className="h-6 w-6" />
            Badge Designer
          </h1>
          <p className="text-muted-foreground mt-1">Configure your organization’s digital badge layout.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_460px]">
        <Card>
          <CardHeader>
            <CardTitle>Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="label">Badge template</label>
              <Select value={config.template} onValueChange={(v) => setConfig((p) => ({ ...p, template: v as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="label">Background</label>
              <Select
                value={config.backgroundMode || "auto"}
                onValueChange={(v) =>
                  setConfig((p) => ({
                    ...p,
                    backgroundMode: v as any,
                    backgroundColor: v === "custom" ? p.backgroundColor || "#ffffff" : undefined,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {config.backgroundMode === "custom" ? (
                <div className="flex items-center gap-3 pt-1">
                  <Input
                    type="color"
                    value={config.backgroundColor || "#ffffff"}
                    onChange={(e) => setConfig((p) => ({ ...p, backgroundColor: e.target.value }))}
                    className="h-10 w-14 p-1"
                  />
                  <Input
                    value={config.backgroundColor || "#ffffff"}
                    onChange={(e) => setConfig((p) => ({ ...p, backgroundColor: e.target.value }))}
                    placeholder="#ffffff"
                  />
                </div>
              ) : null}
              <div className="text-sm text-muted-foreground">
                Auto uses a template-appropriate background; custom overrides the card background.
              </div>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Subtitle</div>
                  <div className="text-sm text-muted-foreground">Role, title, email, or phone line.</div>
                </div>
                <Switch
                  checked={config.showSubtitle}
                  onCheckedChange={(checked) =>
                    setConfig((p) => ({ ...p, showSubtitle: Boolean(checked) }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Status chip</div>
                  <div className="text-sm text-muted-foreground">Active/inactive or event credential indicator.</div>
                </div>
                <Switch
                  checked={config.showStatusChip}
                  onCheckedChange={(checked) =>
                    setConfig((p) => ({ ...p, showStatusChip: Boolean(checked) }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Member code</div>
                  <div className="text-sm text-muted-foreground">Show and copy the check-in code.</div>
                </div>
                <Switch
                  checked={config.showCode}
                  onCheckedChange={(checked) =>
                    setConfig((p) => ({ ...p, showCode: Boolean(checked) }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Watermark</div>
                  <div className="text-sm text-muted-foreground">Subtle background watermark.</div>
                </div>
                <Switch
                  checked={config.showWatermark}
                  onCheckedChange={(checked) =>
                    setConfig((p) => ({ ...p, showWatermark: Boolean(checked) }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Download button</div>
                  <div className="text-sm text-muted-foreground">Allow exporting the QR as PNG.</div>
                </div>
                <Switch
                  checked={config.showDownload}
                  onCheckedChange={(checked) =>
                    setConfig((p) => ({ ...p, showDownload: Boolean(checked) }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="label">QR size</label>
              <Select
                value={config.qrSize}
                onValueChange={(v) =>
                  setConfig((p) => ({ ...p, qrSize: v as BadgeQrSize }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {previewPersonId ? (
              <DigitalBadge personId={previewPersonId} variant="standard" configOverride={badgeProps as any} />
            ) : (
              <div className="text-sm text-muted-foreground">Add at least one person to preview your badge.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
