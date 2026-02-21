"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Plus, UsersRound, RefreshCw, Search, MoreHorizontal,
  Pencil, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { GroupDialog } from "@/components/dashboard/group-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Group {
  id: string;
  name: string;
  member_count?: number;
}

export default function OrgGroupsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    const supabase = createClient();
    await supabase.from("group_members").delete().eq("group_id", groupId);
    await supabase.from("groups").delete().eq("id", groupId);
    loadGroups();
  };

  const loadGroups = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (!org) return;

    const currentOrgId = (org as { id: string }).id;
    setOrgId(currentOrgId);

    const { data } = await supabase
      .from("groups")
      .select("*")
      .eq("org_id", currentOrgId)
      .order("name");

    // Get member counts
    const groupsWithCounts = await Promise.all(
      ((data as Group[]) || []).map(async (group) => {
        const { count } = await supabase
          .from("group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", group.id);
        return { ...group, member_count: count || 0 };
      })
    );

    setGroups(groupsWithCounts);
    setLoading(false);
  };

  useEffect(() => {
    loadGroups();
  }, [orgSlug]);

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-9 w-32 bg-muted animate-pulse rounded-lg mb-2" />
            <div className="h-5 w-64 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Groups</h1>
          <p className="text-muted-foreground mt-1">Organize people into groups for easier management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={loadGroups}
            size="icon"
            className="rounded-xl"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => { setSelectedGroup(null); setDialogOpen(true); }}
            className="rounded-xl bg-gradient-to-r from-primary to-cyan-500 shadow-lg shadow-primary/25"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-muted/50 border-transparent focus:border-primary/50"
        />
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 && groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-cyan-500/10 mb-4">
              <UsersRound className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Create groups to organize your people and track attendance by category.
            </p>
            <Button 
              onClick={() => { setSelectedGroup(null); setDialogOpen(true); }}
              className="rounded-xl bg-gradient-to-r from-primary to-cyan-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </CardContent>
        </Card>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-8 w-8 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground">No groups match &quot;{search}&quot;</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="overflow-hidden hover:shadow-lg transition-all group/card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-cyan-500/10">
                      <UsersRound className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover/card:text-primary transition-colors">
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{group.member_count || 0} members</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => { setSelectedGroup(group); setDialogOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedGroup(group);
                            setDialogOpen(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteGroup(group.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        group={selectedGroup}
        orgId={orgId || ""}
        onSuccess={loadGroups}
      />
    </div>
  );
}
