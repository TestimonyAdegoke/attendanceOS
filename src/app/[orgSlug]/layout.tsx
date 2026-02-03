import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: { orgSlug: string };
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgSlug } = params;
  const supabase = await createClient();

  // Validate organization exists
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();

  if (error || !org) {
    notFound();
  }

  return <>{children}</>;
}
