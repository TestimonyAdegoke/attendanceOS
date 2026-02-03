"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Plus, Search, Download, QrCode, RefreshCw, AlertCircle, Users,
  MoreHorizontal, Mail, Phone, Hash, Filter, SortAsc, UserPlus,
  CheckCircle2, XCircle, Pencil, FileUp
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { getPersonLabel } from "@/lib/org-schema";
import { PersonDialog } from "@/components/dashboard/person-dialog";
import { QRCodeDialog } from "@/components/dashboard/qr-dialog";

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

export default function OrgPeoplePage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgType, setOrgType] = useState<string | null>(null);

  const loadPeople = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    setError(null);
    
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw new Error("Failed to authenticate. Please try logging in again.");
      if (!user) throw new Error("No authenticated user found.");

      // Get org by slug
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, org_type")
        .eq("slug", orgSlug)
        .single();

      if (orgError || !org) throw new Error("Organization not found.");

      const currentOrgId = (org as any).id;
      setOrgId(currentOrgId);
      setOrgType((org as { org_type?: string }).org_type ?? null);
      
      const { data, error: peopleError } = await supabase
        .from("people")
        .select("*")
        .eq("org_id", currentOrgId)
        .order("full_name");
      
      if (peopleError) throw new Error("Failed to load people. Please try again.");
      
      setPeople((data as Person[]) || []);
    } catch (err) {
      console.error("Error loading people:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const handleRetry = () => {
    loadPeople(true);
  };

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

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-9 w-32 bg-muted animate-pulse rounded-lg mb-2" />
            <div className="h-5 w-64 bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-10 bg-muted animate-pulse rounded-xl" />
            <div className="h-10 w-24 bg-muted animate-pulse rounded-xl" />
            <div className="h-10 w-32 bg-muted animate-pulse rounded-xl" />
          </div>
        </div>
        <div className="h-11 w-full sm:w-80 bg-muted animate-pulse rounded-xl" />
        <Card>
          <CardContent className="p-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b">
                <div className="h-10 w-10 bg-muted animate-pulse rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  const pluralLabel = getPersonLabel(orgType, true);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{pluralLabel}</h1>
            <p className="text-muted-foreground">Manage your {pluralLabel.toLowerCase()}</p>
          </div>
        </div>
        <Card className="border-destructive/20">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-2xl bg-destructive/10 mb-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to load people</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">{error}</p>
            <Button onClick={handleRetry} disabled={retrying} className="rounded-xl">
              {retrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{pluralLabel}</h1>
          <p className="text-muted-foreground mt-1">Manage your {pluralLabel.toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRetry} 
            disabled={retrying} 
            size="icon"
            className="rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="outline" 
            asChild
            className="rounded-xl"
          >
            <Link href={`/${orgSlug}/dashboard/people/import`}>
              <FileUp className="mr-2 h-4 w-4" />
              Import CSV
            </Link>
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExport} 
            disabled={people.length === 0}
            className="rounded-xl"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            onClick={() => { setSelectedPerson(null); setDialogOpen(true); }}
            className="rounded-xl bg-gradient-to-r from-primary to-cyan-500 shadow-lg shadow-primary/25"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Person
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-muted/50 border-transparent focus:border-primary/50 focus:bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl h-10">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl h-10">
            <SortAsc className="mr-2 h-4 w-4" />
            Sort
          </Button>
        </div>
        <div className="text-sm text-muted-foreground ml-auto hidden sm:block">
          <span className="font-medium text-foreground">{filteredPeople.length}</span> of {people.length} people
        </div>
      </div>

      {/* People List */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {filteredPeople.length === 0 && people.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 mb-4">
                <Users className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No people yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Add your first person to start tracking attendance.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  asChild
                  className="rounded-xl"
                >
                  <Link href={`/${orgSlug}/dashboard/people/import`}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Import CSV
                  </Link>
                </Button>
                <Button 
                  onClick={() => { setSelectedPerson(null); setDialogOpen(true); }}
                  className="rounded-xl bg-gradient-to-r from-primary to-cyan-500"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Person
                </Button>
              </div>
            </div>
          ) : filteredPeople.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                No people match your search for &quot;{search}&quot;
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredPeople.map((person) => (
                <div 
                  key={person.id} 
                  className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                  onClick={() => router.push(`/${orgSlug}/dashboard/people/${person.id}`)}
                >
                  {/* Avatar */}
                  <Link 
                    href={`/${orgSlug}/dashboard/people/${person.id}`}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-semibold flex-shrink-0 hover:shadow-md transition-all"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {person.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </Link>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/${orgSlug}/dashboard/people/${person.id}`}
                      className="font-medium truncate block hover:text-primary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {person.full_name}
                    </Link>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {person.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{person.email}</span>
                        </span>
                      )}
                      {person.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {person.phone}
                        </span>
                      )}
                      {person.external_id && (
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {person.external_id}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      person.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {person.status === "active" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {person.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); openQrDialog(person); }}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setSelectedPerson(person); setDialogOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/${orgSlug}/dashboard/people/${person.id}`}>
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

      {/* Mobile count */}
      <div className="text-sm text-muted-foreground text-center sm:hidden">
        Showing <span className="font-medium text-foreground">{filteredPeople.length}</span> of {people.length} people
      </div>

      <PersonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        person={selectedPerson}
        orgId={orgId || ""}
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
