"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Search,
  Mail,
  MoreHorizontal,
  UserPlus,
  Users,
  Crown,
  ShieldCheck,
  User,
  Eye,
  RefreshCw,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Surface } from "@/components/attend/Surface";
import { cn } from "@/lib/utils";

interface OrgMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

const roleConfig = {
  org_owner: { label: "Owner", icon: Crown, color: "text-warning bg-warning/10" },
  admin: { label: "Admin", icon: ShieldCheck, color: "text-primary bg-primary/10" },
  location_manager: { label: "Manager", icon: ShieldCheck, color: "text-accent bg-accent/10" },
  operator: { label: "Operator", icon: User, color: "text-success bg-success/10" },
  viewer: { label: "Viewer", icon: Eye, color: "text-muted-foreground bg-muted" },
  user: { label: "User", icon: User, color: "text-muted-foreground bg-muted" },
};

export default function UsersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [search, setSearch] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Invite dialog
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "user",
  });

  const loadData = useCallback(async () => {
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const { data: membership } = await supabase
        .from("org_memberships")
        .select("org_id, role")
        .eq("user_id", user.id)
        .single();

      if (!membership) throw new Error("No organization found");

      const typedMembership = membership as { org_id: string; role: string };
      setOrgId(typedMembership.org_id);
      setCurrentUserRole(typedMembership.role);

      const { data: membersData } = await supabase
        .from("org_memberships")
        .select("id, user_id, role, created_at, profiles(full_name, email, avatar_url)")
        .eq("org_id", typedMembership.org_id)
        .order("created_at");

      if (membersData) {
        setMembers(membersData as OrgMember[]);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInvite = async () => {
    if (!orgId || !inviteForm.email) return;

    setInviteLoading(true);

    toast({
      title: "Invitation sent",
      description: `An invitation has been sent to ${inviteForm.email}`,
    });

    setInviteLoading(false);
    setInviteDialogOpen(false);
    setInviteForm({ email: "", role: "user" });
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from("org_memberships")
      .update({ role: newRole } as never)
      .eq("id", memberId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Role updated",
        description: "User role has been changed",
      });
      loadData();
    }
  };

  const handleRemoveMember = async (memberId: string, memberRole: string) => {
    if (memberRole === "org_owner") {
      toast({
        title: "Cannot remove",
        description: "Organization owners cannot be removed",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to remove this user?")) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("org_memberships")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive",
      });
    } else {
      toast({
        title: "User removed",
        description: "User has been removed from the organization",
      });
      loadData();
    }
  };

  const filteredMembers = members.filter((m) =>
    m.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const canManageUsers = currentUserRole === "org_owner" || currentUserRole === "admin";

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-24 skeleton rounded-lg" />
            <div className="h-4 w-48 skeleton rounded" />
          </div>
          <div className="h-10 w-32 skeleton rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}
        </div>
        <div className="h-64 skeleton rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage team members and access</p>
        </div>
        <Surface variant="elevated" padding="lg" className="border-destructive/30">
          <div className="empty-state">
            <AlertCircle className="empty-state-icon text-destructive" />
            <h3 className="empty-state-title">Failed to load users</h3>
            <p className="empty-state-description">{error}</p>
            <Button onClick={() => loadData()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">
            Manage team members and their access levels.
          </p>
        </div>
        {canManageUsers && (
          <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite User
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Users", value: members.length, icon: Users, color: "text-primary" },
          { label: "Owners", value: members.filter((m) => m.role === "org_owner").length, icon: Crown, color: "text-warning" },
          { label: "Admins", value: members.filter((m) => m.role === "admin").length, icon: ShieldCheck, color: "text-primary" },
          { label: "Members", value: members.filter((m) => !["org_owner", "admin"].includes(m.role)).length, icon: User, color: "text-success" },
        ].map((stat, idx) => (
          <Surface key={idx} variant="elevated" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
              </div>
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </div>
          </Surface>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Members List */}
      {filteredMembers.length === 0 ? (
        <Surface variant="elevated" padding="lg">
          <div className="empty-state">
            <Users className="empty-state-icon" />
            <h3 className="empty-state-title">No users found</h3>
            <p className="empty-state-description">
              {search ? "Try a different search term" : "Invite users to get started"}
            </p>
          </div>
        </Surface>
      ) : (
        <Surface variant="elevated" className="divide-y divide-border overflow-hidden">
          {filteredMembers.map((member) => {
            const role = roleConfig[member.role as keyof typeof roleConfig] || roleConfig.user;
            const RoleIcon = role.icon;

            return (
              <div
                key={member.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
              >
                {/* Avatar */}
                <div className="avatar avatar-md bg-gradient-to-br from-primary to-accent text-white shrink-0">
                  <span className="avatar-initials">
                    {member.profiles?.full_name?.charAt(0) || member.profiles?.email?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {member.profiles?.full_name || "Unnamed User"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {member.profiles?.email}
                  </p>
                </div>

                {/* Role Badge */}
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                  role.color
                )}>
                  <RoleIcon className="h-3.5 w-3.5" />
                  <span>{role.label}</span>
                </div>

                {/* Actions */}
                {canManageUsers && member.role !== "org_owner" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRoleChange(member.id, "admin")}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Make Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(member.id, "operator")}>
                        <User className="mr-2 h-4 w-4" />
                        Make Operator
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(member.id, "viewer")}>
                        <Eye className="mr-2 h-4 w-4" />
                        Make Viewer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleRemoveMember(member.id, member.role)}
                        className="text-destructive"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </Surface>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to add a new team member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="label">Role</label>
              <div className="grid gap-2">
                {Object.entries(roleConfig)
                  .filter(([key]) => key !== "org_owner")
                  .map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setInviteForm({ ...inviteForm, role: key })}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                          inviteForm.role === key
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <Icon className={cn("h-5 w-5", config.color.split(' ')[0])} />
                        <span className="flex-1 font-medium">{config.label}</span>
                        {inviteForm.role === key && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteLoading || !inviteForm.email}>
              {inviteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
