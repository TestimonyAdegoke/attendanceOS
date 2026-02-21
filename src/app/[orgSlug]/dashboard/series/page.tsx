"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, CalendarDays, Repeat, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { SeriesDialog } from "@/components/dashboard/series-dialog";
import { Surface } from "@/components/attend/Surface";
import { cn } from "@/lib/utils";

interface EventSeries {
  id: string;
  name: string;
  description: string | null;
  recurrence_rule: string;
  start_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string;
  status: string;
  location_ids: string[];
  created_at: string;
}

export default function OrgSeriesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [series, setSeries] = useState<EventSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<EventSeries | null>(null);

  useEffect(() => {
    loadSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug]);

  const loadSeries = async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

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

    const { data } = await (supabase as any)
      .from("event_series")
      .select("*")
      .eq("org_id", currentOrgId)
      .order("name");

    setSeries((data as EventSeries[]) || []);
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingSeries(null);
    setDialogOpen(true);
  };

  const handleEdit = (s: EventSeries) => {
    setEditingSeries(s);
    setDialogOpen(true);
  };

  const parseRRule = (rrule: string) => {
    if (rrule.includes("DAILY")) return "Daily";
    if (rrule.includes("WEEKLY")) return "Weekly";
    if (rrule.includes("MONTHLY")) return "Monthly";
    if (rrule.includes("YEARLY")) return "Yearly";
    return "Custom";
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Event Series</h1>
          <p className="page-subtitle">Manage recurring events that auto-generate sessions.</p>
        </div>
        <div className="page-actions">
          <Button variant="outline" size="icon" onClick={loadSeries}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Series
          </Button>
        </div>
      </div>

      {series.length === 0 ? (
        <Surface variant="elevated" padding="lg">
          <div className="empty-state">
            <CalendarDays className="empty-state-icon" />
            <h3 className="empty-state-title">No event series yet</h3>
            <p className="empty-state-description">
              Create a recurring event series to automatically generate sessions.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Series
            </Button>
          </div>
        </Surface>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <Surface
              key={s.id}
              variant="interactive"
              padding="md"
              onClick={() => handleEdit(s)}
              className="group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold">{s.name}</h3>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                    s.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  )}
                >
                  {s.status}
                </span>
              </div>

              {s.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{s.description}</p>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Repeat className="h-4 w-4" />
                <span>{parseRRule(s.recurrence_rule)}</span>
                <span className="text-border">•</span>
                <span>
                  {s.start_time} - {s.end_time}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                Starts: {new Date(s.start_date).toLocaleDateString()}
                {s.end_date && ` • Ends: ${new Date(s.end_date).toLocaleDateString()}`}
              </div>
            </Surface>
          ))}
        </div>
      )}

      <SeriesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        series={editingSeries}
        onSuccess={loadSeries}
        orgId={orgId}
      />
    </div>
  );
}
