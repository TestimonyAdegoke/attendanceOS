"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigitalBadge } from "@/components/badges/digital-badge";
import { loadOrgThemeBySlug, applyOrgThemeCssVars } from "@/lib/org-theme";
import { useEffect } from "react";

export default function PersonBadgeViewerPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const personId = params.personId as string;

  useEffect(() => {
    const run = async () => {
      const theme = await loadOrgThemeBySlug(orgSlug);
      if (theme) applyOrgThemeCssVars(theme);
    };
    run();
  }, [orgSlug]);

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
            <Link href={`/${orgSlug}/dashboard/people/${personId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="text-sm text-muted-foreground">Digital Badge</div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="animate-fade-in">
          <DigitalBadge personId={personId} variant="standard" />
        </div>
      </main>
    </div>
  );
}
