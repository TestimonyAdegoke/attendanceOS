"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigitalBadge } from "@/components/badges/digital-badge";
import { createClient } from "@/lib/supabase/client";
import { applyOrgThemeCssVars, loadOrgThemeBySlug } from "@/lib/org-theme";

export default function PortalBadgeViewerPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [personId, setPersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const theme = await loadOrgThemeBySlug(orgSlug);
      if (theme) applyOrgThemeCssVars(theme);
    };
    run();
  }, [orgSlug]);

  const loadPersonId = useCallback(async (): Promise<string | null> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return null;

    const { data: org } = await supabase.from("organizations").select("id").eq("slug", orgSlug).single();
    if (!org) return null;

    const { data: person } = await supabase
      .from("people")
      .select("id")
      .eq("org_id", (org as any).id)
      .eq("email", user.email)
      .single();

    return (person as any)?.id || null;
  }, [orgSlug]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadPersonId().then((id) => {
      if (!mounted) return;
      setPersonId(id);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [loadPersonId]);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage:
          "radial-gradient(1200px circle at 15% 0%, var(--color-accent, #06b6d4)18, transparent 55%), radial-gradient(1200px circle at 85% 0%, var(--color-primary, #4f46e5)18, transparent 55%)",
      }}
    >
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${orgSlug}/portal`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="text-sm text-muted-foreground">Digital Badge</div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="animate-fade-in">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading badge...</div>
          ) : !personId ? (
            <div className="text-sm text-muted-foreground">No person record linked to this account.</div>
          ) : (
            <DigitalBadge personId={personId} variant="standard" />
          )}
        </div>
      </main>
    </div>
  );
}
