"use client";

import { useState, useEffect } from "react";
import { Loader2, Repeat, Calendar, Clock, MapPin, Trash2 } from "lucide-react";
import { RRule } from "rrule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
}

interface SeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series?: {
    id: string;
    name: string;
    description: string | null;
    recurrence_rule: string;
    start_date: string;
    end_date: string | null;
    start_time: string;
    end_time: string;
    location_id: string | null;
  } | null;
  onSuccess: () => void;
  orgId: string;
}

type FrequencyType = "daily" | "weekly" | "monthly";

export function SeriesDialog({
  open,
  onOpenChange,
  series,
  onSuccess,
  orgId,
}: SeriesDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    frequency: "weekly" as FrequencyType,
    interval: 1,
    weekdays: [1] as number[],
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    start_time: "09:00",
    end_time: "10:00",
    location_id: "",
  });

  const weekdayOptions = [
    { value: 0, label: "Mon" },
    { value: 1, label: "Tue" },
    { value: 2, label: "Wed" },
    { value: 3, label: "Thu" },
    { value: 4, label: "Fri" },
    { value: 5, label: "Sat" },
    { value: 6, label: "Sun" },
  ];

  useEffect(() => {
    if (open) {
      loadLocations();
      if (series) {
        const parsed = parseRRule(series.recurrence_rule);
        setForm({
          name: series.name,
          description: series.description || "",
          frequency: parsed.frequency,
          interval: parsed.interval,
          weekdays: parsed.weekdays,
          start_date: series.start_date,
          end_date: series.end_date || "",
          start_time: series.start_time,
          end_time: series.end_time,
          location_id: series.location_id || "",
        });
      } else {
        setForm({
          name: "",
          description: "",
          frequency: "weekly",
          interval: 1,
          weekdays: [1],
          start_date: new Date().toISOString().split("T")[0],
          end_date: "",
          start_time: "09:00",
          end_time: "10:00",
          location_id: "",
        });
      }
    }
  }, [open, series]);

  const loadLocations = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("locations")
      .select("id, name")
      .eq("org_id", orgId)
      .order("name");
    setLocations((data as Location[]) || []);
  };

  const parseRRule = (rruleStr: string): { frequency: FrequencyType; interval: number; weekdays: number[] } => {
    try {
      const rule = RRule.fromString(rruleStr);
      let frequency: FrequencyType = "weekly";
      if (rule.options.freq === RRule.DAILY) frequency = "daily";
      else if (rule.options.freq === RRule.MONTHLY) frequency = "monthly";

      const byweekday = rule.options.byweekday as any[] | null | undefined;
      const weekdays = byweekday?.map((d: any) => (typeof d === "number" ? d : d.weekday)) || [1];

      return {
        frequency,
        interval: rule.options.interval || 1,
        weekdays,
      };
    } catch {
      return { frequency: "weekly", interval: 1, weekdays: [1] };
    }
  };

  const buildRRule = (): string => {
    const freqMap: Record<FrequencyType, number> = {
      daily: RRule.DAILY,
      weekly: RRule.WEEKLY,
      monthly: RRule.MONTHLY,
    };

    const options: Partial<ConstructorParameters<typeof RRule>[0]> = {
      freq: freqMap[form.frequency],
      interval: form.interval,
      dtstart: new Date(form.start_date),
    };

    if (form.frequency === "weekly" && form.weekdays.length > 0) {
      options.byweekday = form.weekdays;
    }

    if (form.end_date) {
      options.until = new Date(form.end_date);
    }

    const rule = new RRule(options as ConstructorParameters<typeof RRule>[0]);
    return rule.toString();
  };

  const toggleWeekday = (day: number) => {
    setForm((prev) => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter((d) => d !== day)
        : [...prev.weekdays, day].sort(),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.start_date || !form.start_time || !form.end_time) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (form.frequency === "weekly" && form.weekdays.length === 0) {
      toast({
        title: "No days selected",
        description: "Please select at least one day of the week",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const seriesData = {
      name: form.name,
      description: form.description || null,
      recurrence_rule: buildRRule(),
      start_date: form.start_date,
      end_date: form.end_date || null,
      start_time: form.start_time,
      end_time: form.end_time,
      location_id: form.location_id || null,
      org_id: orgId,
      status: "active" as const,
    };

    let error;
    if (series) {
      const { error: updateError } = await (supabase as any)
        .from("event_series")
        .update(seriesData)
        .eq("id", series.id);
      error = updateError;
    } else {
      const { error: insertError } = await (supabase as any)
        .from("event_series")
        .insert(seriesData);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Series ${series ? "updated" : "created"} successfully`,
      });
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    if (!series) return;
    if (!confirm("Are you sure you want to delete this series? All associated sessions will also be deleted.")) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("event_series").delete().eq("id", series.id);
    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Series deleted",
        description: "The series has been removed.",
      });
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{series ? "Edit Event Series" : "Create Event Series"}</DialogTitle>
          <DialogDescription>
            {series ? "Update the recurring event details." : "Set up a recurring event that auto-generates sessions."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Name & Description */}
          <div className="space-y-2">
            <label className="label">Series Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Weekly Team Standup"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="label">Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                Frequency
              </label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as FrequencyType })}
                className="input-field h-10"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="label">Interval</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={form.interval}
                  onChange={(e) => setForm({ ...form, interval: parseInt(e.target.value) || 1 })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {form.frequency === "daily" ? "day(s)" : form.frequency === "weekly" ? "week(s)" : "month(s)"}
                </span>
              </div>
            </div>
          </div>

          {/* Weekdays (for weekly) */}
          {form.frequency === "weekly" && (
            <div className="space-y-2">
              <label className="label">Days of Week</label>
              <div className="flex flex-wrap gap-2">
                {weekdayOptions.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                      form.weekdays.includes(day.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:bg-muted"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Start Date
              </label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="label">End Date (optional)</label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Start Time
              </label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="label">End Time</label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="label flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Location
            </label>
            <select
              value={form.location_id}
              onChange={(e) => setForm({ ...form, location_id: e.target.value })}
              className="input-field h-10"
            >
              <option value="">No location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center gap-3 pt-4 border-t border-border">
            {series && (
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
                {series ? "Save Changes" : "Create Series"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
