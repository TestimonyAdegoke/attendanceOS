"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

type Person = { id: string; full_name: string; email: string | null; phone: string | null };
type Group = { id: string; name: string };

type Session = {
  id: string;
  org_id: string;
  name: string;
  session_date: string;
  start_at: string;
  end_at: string;
  status: string;
  location_id: string;
  locations?: { id: string; name: string } | null;
};

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [assignedPeople, setAssignedPeople] = useState<Set<string>>(new Set());
  const [assignedGroups, setAssignedGroups] = useState<Set<string>>(new Set());

  const [peopleQuery, setPeopleQuery] = useState("");

  const filteredPeople = useMemo(() => {
    const q = peopleQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => (p.full_name || "").toLowerCase().includes(q));
  }, [people, peopleQuery]);

  const hasAssignments = assignedPeople.size > 0 || assignedGroups.size > 0;

  const load = async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (!org) {
      setLoading(false);
      return;
    }

    const orgId = (org as any).id as string;

    const { data: sessionData } = await supabase
      .from("sessions")
      .select("*, locations(id, name)")
      .eq("id", sessionId)
      .eq("org_id", orgId)
      .single();

    if (!sessionData) {
      setLoading(false);
      return;
    }

    setSession(sessionData as Session);

    const [{ data: peopleData }, { data: groupsData }, { data: sp }, { data: sg }] = await Promise.all([
      supabase.from("people").select("id, full_name, email, phone").eq("org_id", orgId).eq("status", "active").order("full_name"),
      supabase.from("groups").select("id, name").eq("org_id", orgId).order("name"),
      supabase.from("session_people").select("person_id").eq("session_id", sessionId),
      supabase.from("session_groups").select("group_id").eq("session_id", sessionId),
    ]);

    setPeople((peopleData as Person[]) || []);
    setGroups((groupsData as Group[]) || []);

    setAssignedPeople(new Set(((sp as any[]) || []).map((r) => r.person_id)));
    setAssignedGroups(new Set(((sg as any[]) || []).map((r) => r.group_id)));

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug, sessionId]);

  const toggleSet = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const handleSaveAssignments = async () => {
    if (!session) return;
    setSaving(true);
    const supabase = createClient();

    await supabase.from("session_people").delete().eq("session_id", sessionId);
    await supabase.from("session_groups").delete().eq("session_id", sessionId);

    const peopleRows = Array.from(assignedPeople).map((personId) => ({ session_id: sessionId, person_id: personId }));
    const groupRows = Array.from(assignedGroups).map((groupId) => ({ session_id: sessionId, group_id: groupId }));

    if (peopleRows.length) await supabase.from("session_people").insert(peopleRows as any);
    if (groupRows.length) await supabase.from("session_groups").insert(groupRows as any);

    setSaving(false);
    await load();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    const supabase = createClient();
    await supabase.from("sessions").delete().eq("id", sessionId);
    router.push(`/${orgSlug}/dashboard/sessions`);
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <Button variant="outline" asChild>
          <Link href={`/${orgSlug}/dashboard/sessions`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Session not found.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link href={`/${orgSlug}/dashboard/sessions`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sessions
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button onClick={handleSaveAssignments} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{session.name}</span>
            <Badge variant={session.status === "active" ? "default" : session.status === "completed" ? "secondary" : "outline"}>
              {session.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(session.session_date).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {formatTime(session.start_at)} - {formatTime(session.end_at)}
            </span>
            {session.locations && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {session.locations.name}
              </span>
            )}
          </div>

          {hasAssignments ? (
            <div className="text-sm text-muted-foreground">
              This session uses an assigned roster.
              <span className="ml-2">People: {assignedPeople.size}</span>
              <span className="ml-2">Groups: {assignedGroups.size}</span>
              <span className="ml-2">(Union)</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assign Groups
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groups.length === 0 ? (
              <div className="text-sm text-muted-foreground">No groups yet.</div>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={assignedGroups.has(g.id)}
                      onChange={() => setAssignedGroups((prev) => toggleSet(prev, g.id))}
                    />
                    <span className="truncate">{g.name}</span>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign People</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={peopleQuery} onChange={(e) => setPeopleQuery(e.target.value)} placeholder="Search people..." />
            {filteredPeople.length === 0 ? (
              <div className="text-sm text-muted-foreground">No people found.</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
                {filteredPeople.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={assignedPeople.has(p.id)}
                      onChange={() => setAssignedPeople((prev) => toggleSet(prev, p.id))}
                    />
                    <span className="truncate">{p.full_name}</span>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
