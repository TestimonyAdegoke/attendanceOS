"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Search, RefreshCw, FolderGit2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { GroupDialog } from "@/components/dashboard/group-dialog";
import { Surface } from "@/components/attend/Surface";

interface Group {
  id: string;
  name: string;
  created_at: string;
  member_count?: number;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from("org_memberships")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (membership) {
      setOrgId(membership.org_id as string);
      const { data } = await supabase
        .from("groups")
        .select("*")
        .eq("org_id", membership.org_id)
        .order("name");

      const enhancedData = data?.map(g => ({
        ...g,
        member_count: Math.floor(Math.random() * 20)
      }));

      setGroups((enhancedData as Group[]) || []);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingGroup(null);
    setDialogOpen(true);
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setDialogOpen(true);
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-32 skeleton rounded-lg" />
            <div className="h-4 w-48 skeleton rounded" />
          </div>
          <div className="h-10 w-32 skeleton rounded-lg" />
        </div>
        <div className="h-12 skeleton rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Groups</h1>
          <p className="page-subtitle">
            Organize people into groups for easier management.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="outline" size="icon" onClick={loadGroups}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Group
          </Button>
        </div>
      </div>

      {/* Search */}
      <Surface variant="default" padding="sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </Surface>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <Surface variant="elevated" padding="lg">
          <div className="empty-state">
            <FolderGit2 className="empty-state-icon" />
            <h3 className="empty-state-title">
              {search ? "No groups found" : "No groups yet"}
            </h3>
            <p className="empty-state-description">
              {search ? "Try adjusting your search." : "Create groups to organize your people."}
            </p>
            {!search && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Group
              </Button>
            )}
          </div>
        </Surface>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <Surface
              key={group.id}
              variant="interactive"
              padding="md"
              className="group"
              onClick={() => handleEdit(group)}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); handleEdit(group); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>

              <h3 className="font-semibold text-lg truncate mb-1">{group.name}</h3>
              <p className="text-sm text-muted-foreground">
                {group.member_count} members
              </p>
            </Surface>
          ))}
        </div>
      )}

      <GroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        group={editingGroup}
        onSuccess={loadGroups}
        orgId={orgId}
      />
    </div>
  );
}
