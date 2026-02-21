export type OrgBranding = {
  primary: string;
  accent: string;
  logoUrl: string | null;
  orgName?: string;
};

const DEFAULT_PRIMARY = "#4f46e5";
const DEFAULT_ACCENT = "#06b6d4";

export function normalizeBranding(input: Partial<OrgBranding> | null | undefined): OrgBranding {
  return {
    primary: input?.primary || DEFAULT_PRIMARY,
    accent: input?.accent || DEFAULT_ACCENT,
    logoUrl: input?.logoUrl ?? null,
    orgName: input?.orgName,
  };
}

export function applyBrandingCssVars(branding: OrgBranding) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--org-primary", branding.primary);
  root.style.setProperty("--org-accent", branding.accent);
}
