"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar, Clock, MapPin, Trash2 } from "lucide-react";
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

interface Location {
  id: string;
  name: string;
}

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: {
    id: string;
    name: string;
    session_date: string;
    start_at: string;
    end_at: string;
    location_id: string | null;
  } | null;
  onSuccess: () => void;
  orgId: string;
}

export function SessionDialog({
  open,
  onOpenChange,
  session,
  onSuccess,
  orgId,
}: SessionDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState({
    name: "",
    session_date: new Date().toISOString().split("T")[0],
    start_time: "09:00",
    end_time: "10:00",
    location_id: "",
  });

  useEffect(() => {
    if (open) {
      loadLocations();
      if (session) {
        setForm({
          name: session.name,
          session_date: session.session_date,
          start_time: new Date(session.start_at).toLocaleTimeString("en-US", {
            hour12: false, hour: "2-digit", minute: "2-digit",
          }),
          end_time: new Date(session.end_at).toLocaleTimeString("en-US", {
            hour12: false, hour: "2-digit", minute: "2-digit",
          }),
          location_id: session.location_id || "",
        });
      } else {
        setForm({
          name: "",
          session_date: new Date().toISOString().split("T")[0],
          start_time: "09:00",
          end_time: "10:00",
          location_id: "",
        });
      }
    }
  }, [open, session]);

  const loadLocations = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("locations")
      .select("id, name")
      .eq("org_id", orgId)
      .order("name");
    setLocations((data as Location[]) || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.session_date || !form.start_time || !form.end_time) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const startAt = new Date(`${form.session_date}T${form.start_time}:00`);
    const endAt = new Date(`${form.session_date}T${form.end_time}:00`);

    const sessionData = {
      name: form.name,
      session_date: form.session_date,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      location_id: form.location_id || null,
      org_id: orgId,
      status: "scheduled" as const,
    };

    try {
      if (session) {
        await (supabase as any)
          .from("sessions")
          .update(sessionData)
          .eq("id", session.id);
      } else {
        await (supabase as any)
          .from("sessions")
          .insert(sessionData);
      }
      onSuccess();
      onOpenChange(false);
      toast({ title: "Success", description: `Session ${session ? "updated" : "created"} successfully` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!session || !confirm("Are you sure you want to delete this session?")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("sessions").delete().eq("id", session.id);
    setLoading(false);
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{session ? "Edit Session" : "New Session"}</DialogTitle>
          <DialogDescription>
            {session ? "Update the session details." : "Create a new attendance session."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Session Name */}
          <div className="space-y-2">
            <label className="label">Session Name</label>
            <Input
              placeholder="e.g. Weekly Team Meeting"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {/* Date & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date
              </label>
              <Input
                type="date"
                value={form.session_date}
                onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                required
              />
            </div>

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
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Range */}
          <div className="space-y-2">
            <label className="label flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Time
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
                className="flex-1"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                required
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex justify-between items-center gap-3 pt-4 border-t border-border">
            {session && (
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
                {session ? "Save Changes" : "Create Session"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
