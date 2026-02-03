"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Download, QrCode, RefreshCw,
  Users, Mail, Phone, Hash, Filter,
  Eye, Pencil, Trash2, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { PersonDialog } from "@/components/dashboard/person-dialog";
import { QRCodeDialog } from "@/components/dashboard/qr-dialog";
import { Surface } from "@/components/attend/Surface";
import { cn } from "@/lib/utils";

interface Person {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  external_id: string | null;
  status: string;
  checkin_code: string;
  created_at: string;
  attributes?: Record<string, any> | null;
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const loadPeople = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) throw new Error("Authentication failed.");
      if (!user) throw new Error("No session found.");

      const { data: membership, error: membershipError } = await supabase
        .from("org_memberships")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (membershipError) throw new Error("Access denied.");
      if (!membership) throw new Error("No organization link.");

      setOrgId((membership as any).org_id);

      const { data, error: peopleError } = await supabase
        .from("people")
        .select("*")
        .eq("org_id", (membership as any).org_id)
        .order("full_name");

      if (peopleError) throw new Error("Failed to load people.");

      setPeople((data as Person[]) || []);
    } catch (err) {
      console.error("Error loading people:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const filteredPeople = people.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search) ||
      p.external_id?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const csv = [
      ["Name", "Email", "Phone", "External ID", "Status", "Check-in Code"],
      ...filteredPeople.map((p) => [
        p.full_name,
        p.email || "",
        p.phone || "",
        p.external_id || "",
        p.status,
        p.checkin_code,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "people.csv";
    a.click();
  };

  const openQrDialog = (person: Person) => {
    setSelectedPerson(person);
    setQrDialogOpen(true);
  };

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
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Surface variant="elevated" padding="lg" className="text-center">
        <div className="empty-state">
          <Users className="empty-state-icon text-destructive" />
          <h3 className="empty-state-title">Error Loading People</h3>
          <p className="empty-state-description">{error}</p>
          <Button onClick={() => loadPeople(true)} disabled={retrying}>
            <RefreshCw className={cn("h-4 w-4 mr-2", retrying && "animate-spin")} />
            Try Again
          </Button>
        </div>
      </Surface>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">People</h1>
          <p className="page-subtitle">
            Manage your organization's members and their check-in credentials.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => { setSelectedPerson(null); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Person
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Surface variant="default" padding="sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </Surface>

      {/* People List */}
      {filteredPeople.length === 0 ? (
        <Surface variant="elevated" padding="lg">
          <div className="empty-state">
            <Users className="empty-state-icon" />
            <h3 className="empty-state-title">
              {search ? "No people found" : "No people yet"}
            </h3>
            <p className="empty-state-description">
              {search
                ? "Try adjusting your search terms."
                : "Add your first person to start tracking attendance."}
            </p>
            {!search && (
              <Button onClick={() => { setSelectedPerson(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Person
              </Button>
            )}
          </div>
        </Surface>
      ) : (
        <Surface variant="elevated" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="table-cell table-header text-left">Person</th>
                  <th className="table-cell table-header text-left hidden md:table-cell">Contact</th>
                  <th className="table-cell table-header text-left hidden lg:table-cell">External ID</th>
                  <th className="table-cell table-header text-left">Status</th>
                  <th className="table-cell table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((person) => (
                  <tr key={person.id} className="table-row group">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-md bg-primary/10 shrink-0">
                          <span className="avatar-initials text-primary font-semibold">
                            {person.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{person.full_name}</div>
                          <div className="text-sm text-muted-foreground md:hidden truncate">
                            {person.email || person.phone || "No contact"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      <div className="space-y-1 text-sm">
                        {person.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[200px]">{person.email}</span>
                          </div>
                        )}
                        {person.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{person.phone}</span>
                          </div>
                        )}
                        {!person.email && !person.phone && (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell hidden lg:table-cell">
                      {person.external_id ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Hash className="h-3.5 w-3.5" />
                          <span>{person.external_id}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={cn(
                        "status-present",
                        person.status !== "active" && "!bg-muted !text-muted-foreground"
                      )}>
                        <span className={cn(
                          "status-dot",
                          person.status === "active" ? "status-dot-present" : "bg-muted-foreground/30"
                        )} />
                        {person.status || "Active"}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openQrDialog(person)}
                          title="View QR Code"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setSelectedPerson(person); setDialogOpen(true); }}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 border-t border-border bg-muted/20 text-sm text-muted-foreground">
            Showing {filteredPeople.length} of {people.length} people
          </div>
        </Surface>
      )}

      <PersonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        person={selectedPerson}
        orgId={orgId}
        onSuccess={loadPeople}
      />

      <QRCodeDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        person={selectedPerson}
      />
    </div>
  );
}
