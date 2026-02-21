import { applyBrandingCssVars, normalizeBranding, type OrgBranding } from "@/lib/org-branding";
import { createClient } from "@/lib/supabase/client";

export type OrgTheme = {
  branding: OrgBranding;
  themeMode: "light" | "dark" | "auto";
  themePreset?: string | null;
  themeTokens?: Record<string, string> | null;
};

export async function loadOrgThemeBySlug(orgSlug: string): Promise<OrgTheme | null> {
  const supabase = createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, brand_primary, brand_accent, brand_logo_url")
    .eq("slug", orgSlug)
    .single();

  if (!org) return null;
  const orgId = (org as any).id as string;

  const { data: settings } = await supabase
    .from("organization_settings")
    .select("primary_color, secondary_color, accent_color, theme_mode, logo_url, theme_preset, theme_tokens")
    .eq("org_id", orgId)
    .single();

  const s = settings as any;
  const branding = normalizeBranding({
    primary: s?.primary_color || (org as any).brand_primary,
    accent: s?.accent_color || (org as any).brand_accent,
    logoUrl: s?.logo_url || (org as any).brand_logo_url,
    orgName: (org as any).name,
  });

  return {
    branding,
    themeMode: (s?.theme_mode as any) || "auto",
    themePreset: (s?.theme_preset as any) ?? null,
    themeTokens: (s?.theme_tokens as any) ?? null,
  };
}

export function applyOrgThemeCssVars(theme: OrgTheme) {
  applyBrandingCssVars(theme.branding);
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.branding.primary);
  root.style.setProperty("--color-accent", theme.branding.accent);

  try {
    const prev = root.getAttribute("data-attendos-theme-token-keys");
    if (prev) {
      const keys = JSON.parse(prev) as string[];
      if (Array.isArray(keys)) {
        for (const k of keys) {
          if (!k) continue;
          root.style.removeProperty(k);
        }
      }
    }
  } catch {
  }

  const tokens = theme.themeTokens;
  if (tokens && typeof tokens === "object") {
    const appliedKeys: string[] = [];
    for (const [key, value] of Object.entries(tokens)) {
      if (!key) continue;
      const cssKey = key.startsWith("--") ? key : `--${key}`;
      root.style.setProperty(cssKey, String(value));
      appliedKeys.push(cssKey);
    }

    root.setAttribute("data-attendos-theme-token-keys", JSON.stringify(appliedKeys));
  } else {
    root.removeAttribute("data-attendos-theme-token-keys");
  }
}
