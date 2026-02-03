"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, Users, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Person {
  id: string;
  full_name: string;
  email: string | null;
}

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  onSuccess: () => void;
  orgId: string;
}

export function GroupDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
  orgId,
}: GroupDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [members, setMembers] = useState<Person[]>([]);
  const [originalMemberIds, setOriginalMemberIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadPeople();
      if (group) {
        setName(group.name);
        setDescription(group.description || "");
        loadMembers(group.id);
      } else {
        setName("");
        setDescription("");
        setMembers([]);
        setOriginalMemberIds([]);
        setSelectedIds(new Set());
      }
    }
  }, [open, group]);

  useEffect(() => {
    setSelectedIds(new Set(members.map(m => m.id)));
  }, [members]);

  const loadPeople = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("people")
      .select("id, full_name, email")
      .eq("org_id", orgId)
      .eq("status", "active")
      .order("full_name");
    setAllPeople((data as Person[]) || []);
  };

  const loadMembers = async (groupId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("group_members")
      .select("people(id, full_name, email)")
      .eq("group_id", groupId);

    if (data) {
      const memberList = data
        .map((m: { people: Person | null }) => m.people)
        .filter((p): p is Person => p !== null);
      setMembers(memberList);
      setOriginalMemberIds(memberList.map((m) => m.id));
    }
  };

  const filteredPeople = allPeople.filter(p =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMember = (person: Person) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(person.id)) {
      newSelectedIds.delete(person.id);
      setMembers(members.filter((m) => m.id !== person.id));
    } else {
      newSelectedIds.add(person.id);
      setMembers([...members, person]);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Missing name", description: "Please enter a group name", variant: "destructive" });
      return;
    }

    setLoading(true);
    const supabase = createClient();
    let groupId = group?.id;
    let error;

    if (group) {
      const { error: updateError } = await supabase
        .from("groups")
        .update({ name, description: description || null } as never)
        .eq("id", group.id);
      error = updateError;
    } else {
      const { data: newGroup, error: insertError } = await supabase
        .from("groups")
        .insert({ name, description: description || null, org_id: orgId } as never)
        .select("id")
        .single();
      error = insertError;
      if (newGroup) groupId = (newGroup as any).id;
    }

    if (error) {
      setLoading(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    if (groupId) {
      const currentMemberIds = members.map((m) => m.id);
      const toAdd = currentMemberIds.filter((id) => !originalMemberIds.includes(id));
      const toRemove = originalMemberIds.filter((id) => !currentMemberIds.includes(id));

      if (toRemove.length > 0) {
        await supabase
          .from("group_members")
          .delete()
          .eq("group_id", groupId)
          .in("person_id", toRemove);
      }

      if (toAdd.length > 0) {
        await supabase.from("group_members").insert(
          toAdd.map((personId) => ({
            group_id: groupId,
            person_id: personId,
          })) as never
        );
      }
    }

    setLoading(false);
    toast({ title: "Success", description: `Group ${group ? "updated" : "created"} successfully` });
    onSuccess();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!group || !confirm("Are you sure you want to delete this group?")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("group_members").delete().eq("group_id", group.id);
    await supabase.from("groups").delete().eq("id", group.id);
    setLoading(false);
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{group ? "Edit Group" : "New Group"}</DialogTitle>
          <DialogDescription>
            {group ? "Update the group details and members." : "Create a new group and add members."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Group Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="label">Group Name</label>
                <Input
                  placeholder="e.g. Marketing Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="label">Description</label>
                <textarea
                  placeholder="Optional description..."
                  className="input-field min-h-[80px] resize-none py-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Selected Members */}
              <div className="space-y-2">
                <label className="label">Selected Members ({selectedIds.size})</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {members.map(m => (
                    <span key={m.id} className="badge badge-primary text-xs">
                      {m.full_name}
                    </span>
                  ))}
                  {members.length === 0 && (
                    <span className="text-sm text-muted-foreground">No members selected</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Member Selection */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search people..."
                  className="pl-10"
                />
              </div>

              <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                {filteredPeople.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No people found
                  </div>
                ) : (
                  filteredPeople.map((person) => {
                    const isSelected = selectedIds.has(person.id);
                    return (
                      <div
                        key={person.id}
                        onClick={() => toggleMember(person)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-border last:border-0",
                          isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "avatar avatar-sm shrink-0",
                          isSelected ? "bg-primary text-white" : "bg-muted"
                        )}>
                          <span className="avatar-initials text-xs">
                            {person.full_name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{person.full_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{person.email}</div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center gap-3 pt-4 mt-4 border-t border-border">
            {group && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}

            <div className="flex gap-3 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {group ? "Save Changes" : "Create Group"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
