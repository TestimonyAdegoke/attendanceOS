import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/nav";
import { DashboardHeader } from "@/components/dashboard/header";

interface OrgDashboardLayoutProps {
  children: React.ReactNode;
  params: { orgSlug: string };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default async function OrgDashboardLayout({
  children,
  params,
}: OrgDashboardLayoutProps) {
  const { orgSlug } = params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${orgSlug}/login`);
  }

  // Validate organization exists and user has access
  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();

  if (orgError || !orgData) {
    notFound();
  }

  const org = orgData as Organization;

  // Check user membership in this org
  const { data: membership } = await supabase
    .from("org_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", org.id)
    .single();

  if (!membership) {
    // User is not a member of this organization
    redirect(`/${orgSlug}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} currentOrg={org} />
      <div className="flex">
        <DashboardNav orgSlug={orgSlug} className="hidden md:block" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
