"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Mail, Building2, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface InviteData {
  id: string;
  email: string;
  expires_at: string;
  used_at: string | null;
  org_id: string;
  person_id: string;
  group_id: string | null;
  organizations?: {
    name: string;
    slug: string;
  };
  people?: {
    full_name: string;
  };
  groups?: {
    name: string;
  } | null;
}

export default function AcceptInvitePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    if (!token) {
      setError("No invite token provided");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Check if user is logged in
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      setUser({ id: authUser.id, email: authUser.email || "" });
    }

    // Fetch invite details
    const { data: inviteData, error: inviteError } = await supabase
      .from("invites")
      .select(`
        id, email, expires_at, used_at, org_id, person_id, group_id,
        organizations (name, slug),
        people (full_name),
        groups (name)
      `)
      .eq("token", token)
      .single();

    if (inviteError || !inviteData) {
      setError("Invalid or expired invite link");
      setLoading(false);
      return;
    }

    const typedInvite = inviteData as unknown as InviteData;

    // Check if already used
    if (typedInvite.used_at) {
      setError("This invite has already been used");
      setLoading(false);
      return;
    }

    // Check if expired
    if (new Date(typedInvite.expires_at) < new Date()) {
      setError("This invite has expired. Please request a new one.");
      setLoading(false);
      return;
    }

    setInvite(typedInvite);
    setLoading(false);
  };

  const handleAcceptInvite = async () => {
    if (!invite || !user) return;
    if (!token) {
      setError("Missing invite token. Please reopen your invite link.");
      return;
    }

    setProcessing(true);
    const supabase = createClient();

    // Call the accept_invite function (cast to any to work around typing issue)
    const { data, error: acceptError } = await (supabase as any)
      .rpc("accept_invite", { p_token: token });

    if (acceptError) {
      setError("Failed to accept invite. Please try again.");
      setProcessing(false);
      return;
    }

    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      setError(result.error || "Failed to accept invite");
      setProcessing(false);
      return;
    }

    setSuccess(true);
    setProcessing(false);

    // Redirect to portal after 2 seconds
    setTimeout(() => {
      router.push(`/${orgSlug}/portal`);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading invite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <div className="p-4 rounded-full bg-destructive/10 mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Invite Error</h2>
            <p className="text-muted-foreground text-center mb-6">{error}</p>
            <Button asChild>
              <Link href={`/${orgSlug}`}>Go to Organization</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome!</h2>
            <p className="text-muted-foreground text-center mb-6">
              Your account has been linked successfully. Redirecting to your portal...
            </p>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>You&apos;re Invited!</CardTitle>
          <CardDescription>
            Accept this invite to access your member portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite Details */}
          <div className="space-y-4 p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Organization</p>
                <p className="font-medium">{invite?.organizations?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Invited as</p>
                <p className="font-medium">{invite?.people?.full_name}</p>
                <p className="text-sm text-muted-foreground">{invite?.email}</p>
              </div>
            </div>
            {invite?.groups && (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Group</p>
                  <p className="font-medium">{invite.groups.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action */}
          {user ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm">
                Signed in as <strong>{user.email}</strong>
              </div>
              <Button 
                onClick={handleAcceptInvite} 
                className="w-full" 
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept Invite & Access Portal"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Sign in or create an account to accept this invite
              </p>
              <div className="grid gap-2">
                <Button asChild>
                  <Link href={`/${orgSlug}/login?redirect=/accept-invite?token=${token}`}>
                    Sign In
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/${orgSlug}/signup?redirect=/accept-invite?token=${token}&email=${invite?.email}`}>
                    Create Account
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
