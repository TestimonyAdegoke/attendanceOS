import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/nav";
import { DashboardHeader } from "@/components/dashboard/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has completed onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  // Get user's organizations
  const { data: memberships } = await supabase
    .from("org_memberships")
    .select("*, organizations(*)")
    .eq("user_id", user.id);

  type MembershipWithOrg = {
    organizations?: { id: string; name: string; slug: string } | null;
  };
  const firstMembership = Array.isArray(memberships) && memberships.length > 0
    ? memberships[0] as MembershipWithOrg
    : undefined;

  // Get the actual organization data
  const currentOrg = firstMembership?.organizations
    ? {
      id: firstMembership.organizations.id,
      name: firstMembership.organizations.name,
      slug: firstMembership.organizations.slug,
    }
    : null;

  // Only redirect to onboarding if:
  // 1. Profile exists AND onboarding is not completed
  // 2. User has no organization membership yet
  // Skip redirect if user explicitly skipped (has membership but no onboarding_completed)
  const hasCompletedOnboarding = profile && (profile as any).onboarding_completed === true;
  const hasMembership = memberships && memberships.length > 0;

  // If no profile and no membership, redirect to onboarding
  // If profile exists but onboarding not completed AND no membership, redirect
  // Otherwise allow access (user skipped or completed onboarding)
  if (!hasCompletedOnboarding && !hasMembership) {
    redirect("/onboarding");
  }

  // Check if user is super admin
  const isSuperAdmin = profile && (profile as any).is_super_admin === true;

  // If the user already has an organization membership and is NOT a super admin,
  // redirect them into the org-scoped dashboard so they see org-aware pages
  // like /[orgSlug]/dashboard/people, /calendar, /reports, etc.
  if (currentOrg && !isSuperAdmin) {
    redirect(`/${currentOrg.slug}/dashboard`);
  }

  // Non-org routes are only accessible to super admins
  // Regular users without org membership should go to onboarding
  if (!isSuperAdmin && !currentOrg) {
    redirect("/onboarding");
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <DashboardHeader user={user} currentOrg={currentOrg} />
      <div className="flex flex-1 overflow-hidden">
        <DashboardNav />
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-surface-1">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
