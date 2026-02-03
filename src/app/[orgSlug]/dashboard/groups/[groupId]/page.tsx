"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Users, UserPlus, Settings, Mail, Send,
  CheckCircle2, XCircle, Shield, ShieldOff, Loader2,
  MoreHorizontal, Trash2, RefreshCw, Search, QrCode,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Group {
  id: string;
  name: string;
  description: string | null;
  self_checkin_enabled: boolean;
  self_checkin_mode: string;
  self_checkin_require_invite: boolean;
}

interface GroupMember {
  id: string;
  person_id: string;
  people: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    status: string;
  };
  has_portal_access?: boolean;
  has_pending_invite?: boolean;
  is_denied?: boolean;
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const orgSlug = params.orgSlug as string;
  const groupId = params.groupId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("members");
  const [invitingAll, setInvitingAll] = useState(false);

  // Self check-in settings state
  const [selfCheckinEnabled, setSelfCheckinEnabled] = useState(false);
  const [selfCheckinMode, setSelfCheckinMode] = useState("public_with_code");
  const [requireInvite, setRequireInvite] = useState(false);

  const loadGroupData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Get org
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (!org) {
      setLoading(false);
      return;
    }

    const currentOrgId = (org as { id: string }).id;
    setOrgId(currentOrgId);

    // Get group
    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .eq("org_id", currentOrgId)
      .single();

    if (groupError || !groupData) {
      toast({ title: "Error", description: "Group not found", variant: "destructive" });
      router.push(`/${orgSlug}/dashboard/groups`);
      return;
    }

    const typedGroup = groupData as Group;
    setGroup(typedGroup);
    setSelfCheckinEnabled(typedGroup.self_checkin_enabled || false);
    setSelfCheckinMode(typedGroup.self_checkin_mode || "public_with_code");
    setRequireInvite(typedGroup.self_checkin_require_invite || false);

    // Get members with portal access status
    const { data: membersData } = await supabase
      .from("group_members")
      .select(`
        id,
        person_id,
        people (id, full_name, email, phone, status)
      `)
      .eq("group_id", groupId);

    const typedMembers = (membersData || []) as unknown as GroupMember[];

    // Check portal access and invite status for each member
    const membersWithStatus = await Promise.all(
      typedMembers.map(async (member) => {
        // Check if has portal access (person_user_links)
        const { data: link } = await supabase
          .from("person_user_links")
          .select("id")
          .eq("org_id", currentOrgId)
          .eq("person_id", member.person_id)
          .single();

        // Check if has pending invite
        const { data: invite } = await supabase
          .from("invites")
          .select("id")
          .eq("org_id", currentOrgId)
          .eq("person_id", member.person_id)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .single();

        // Check if denied
        const { data: override } = await supabase
          .from("self_checkin_access_overrides")
          .select("access")
          .eq("org_id", currentOrgId)
          .eq("scope_type", "group")
          .eq("scope_id", groupId)
          .eq("person_id", member.person_id)
          .eq("access", "deny")
          .single();

        return {
          ...member,
          has_portal_access: !!link,
          has_pending_invite: !!invite,
          is_denied: !!override,
        };
      })
    );

    setMembers(membersWithStatus);
    setLoading(false);
  }, [orgSlug, groupId, router, toast]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  const handleSaveSettings = async () => {
    if (!group || !orgId) return;

    setSaving(true);
    const supabase = createClient();

    const { error } = await (supabase as any)
      .from("groups")
      .update({
        self_checkin_enabled: selfCheckinEnabled,
        self_checkin_mode: selfCheckinMode,
        self_checkin_require_invite: requireInvite,
      })
      .eq("id", groupId);

    if (error) {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Self check-in settings saved" });
      setGroup({
        ...group,
        self_checkin_enabled: selfCheckinEnabled,
        self_checkin_mode: selfCheckinMode,
        self_checkin_require_invite: requireInvite,
      });
    }

    setSaving(false);
  };

  const handleInviteAll = async () => {
    if (!orgId) return;

    const membersToInvite = members.filter(
      (m) => m.people.email && !m.has_portal_access && !m.has_pending_invite
    );

    if (membersToInvite.length === 0) {
      toast({ title: "Info", description: "No members to invite" });
      return;
    }

    setInvitingAll(true);

    try {
      const response = await fetch(`/${orgSlug}/api/invites/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: groupId,
          person_ids: membersToInvite.map((m) => m.person_id),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Invites Sent",
          description: `Created ${data.created} invites, skipped ${data.skipped}`,
        });
        loadGroupData();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send invites", variant: "destructive" });
    }

    setInvitingAll(false);
  };

  const handleInviteMember = async (personId: string) => {
    if (!orgId) return;

    try {
      const response = await fetch(`/${orgSlug}/api/invites/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: groupId,
          person_ids: [personId],
        }),
      });

      const data = await response.json();

      if (data.success && data.created > 0) {
        toast({ title: "Success", description: "Invite sent" });
        loadGroupData();
      } else {
        toast({ title: "Info", description: data.errors?.[0] || "Could not send invite" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send invite", variant: "destructive" });
    }
  };

  const handleToggleDeny = async (personId: string, currentlyDenied: boolean) => {
    if (!orgId) return;

    const supabase = createClient();

    if (currentlyDenied) {
      // Remove deny override
      await supabase
        .from("self_checkin_access_overrides")
        .delete()
        .eq("org_id", orgId)
        .eq("scope_type", "group")
        .eq("scope_id", groupId)
        .eq("person_id", personId);
    } else {
      // Add deny override
      await supabase
        .from("self_checkin_access_overrides")
        .insert({
          org_id: orgId,
          scope_type: "group",
          scope_id: groupId,
          person_id: personId,
          access: "deny",
          reason: "Manually denied by admin",
        } as any);
    }

    loadGroupData();
  };

  const filteredMembers = members.filter(
    (m) =>
      m.people.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.people.email?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: members.length,
    withAccess: members.filter((m) => m.has_portal_access).length,
    pendingInvite: members.filter((m) => m.has_pending_invite).length,
    denied: members.filter((m) => m.is_denied).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{group.name}</h1>
            <p className="text-muted-foreground">{members.length} members</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadGroupData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button asChild>
            <Link href={`/${orgSlug}/dashboard/groups`}>
              <Users className="mr-2 h-4 w-4" />
              All Groups
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">{stats.withAccess}</div>
            <p className="text-sm text-muted-foreground">With Portal Access</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{stats.pendingInvite}</div>
            <p className="text-sm text-muted-foreground">Pending Invites</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats.denied}</div>
            <p className="text-sm text-muted-foreground">Denied Access</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Self Check-in Settings
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleInviteAll} disabled={invitingAll}>
              {invitingAll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Invite All Members
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {filteredMembers.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No members found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center font-semibold">
                        {member.people.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.people.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.people.email || member.people.phone || "No contact"}
                        </p>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        {member.is_denied && (
                          <Badge variant="destructive" className="gap-1">
                            <ShieldOff className="h-3 w-3" />
                            Denied
                          </Badge>
                        )}
                        {member.has_portal_access && !member.is_denied && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Portal Access
                          </Badge>
                        )}
                        {member.has_pending_invite && !member.has_portal_access && (
                          <Badge variant="outline" className="gap-1">
                            <Mail className="h-3 w-3" />
                            Invite Sent
                          </Badge>
                        )}
                        {!member.has_portal_access && !member.has_pending_invite && !member.is_denied && (
                          <Badge variant="secondary" className="gap-1">
                            <Shield className="h-3 w-3" />
                            No Access
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!member.has_portal_access && !member.has_pending_invite && member.people.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleInviteMember(member.person_id)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleDeny(member.person_id, member.is_denied || false)}
                          className={member.is_denied ? "text-emerald-600" : "text-destructive"}
                        >
                          {member.is_denied ? (
                            <Shield className="h-4 w-4" />
                          ) : (
                            <ShieldOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/${orgSlug}/dashboard/people/${member.person_id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Self Check-in Access</CardTitle>
              <CardDescription>
                Configure how members of this group can check themselves in to sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Self Check-in</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow members to check in without staff assistance
                  </p>
                </div>
                <Switch
                  checked={selfCheckinEnabled}
                  onCheckedChange={setSelfCheckinEnabled}
                />
              </div>

              {selfCheckinEnabled && (
                <>
                  {/* Mode Selection */}
                  <div className="space-y-2">
                    <Label>Check-in Mode</Label>
                    <Select value={selfCheckinMode} onValueChange={setSelfCheckinMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public_with_code">
                          <div className="flex items-center gap-2">
                            <QrCode className="h-4 w-4" />
                            <span>Public with Event Code</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="authenticated">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span>Login Required</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {selfCheckinMode === "public_with_code"
                        ? "Members identify with phone/code and enter the session event code"
                        : "Members must sign in to their portal account to check in"}
                    </p>
                  </div>

                  {/* Require Invite */}
                  {selfCheckinMode === "authenticated" && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Require Invite</Label>
                        <p className="text-sm text-muted-foreground">
                          Members must accept an invite before they can check in
                        </p>
                      </div>
                      <Switch
                        checked={requireInvite}
                        onCheckedChange={setRequireInvite}
                      />
                    </div>
                  )}

                  {/* Geofence Note */}
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm">
                      <strong>Note:</strong> Geofence proximity is always required for self check-in.
                      Members must be within the session location&apos;s check-in zone.
                    </p>
                  </div>
                </>
              )}

              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
