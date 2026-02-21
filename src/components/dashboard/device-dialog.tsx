"use client";

import { useState, useEffect } from "react";
import { Loader2, Monitor, MapPin, Trash2 } from "lucide-react";
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

interface Location {
  id: string;
  name: string;
}

interface DeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: {
    id: string;
    name: string;
    type: string;
    location_id: string | null;
    status: string;
  } | null;
  onSuccess: () => void;
  orgId: string;
}

export function DeviceDialog({
  open,
  onOpenChange,
  device,
  onSuccess,
  orgId,
}: DeviceDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState({
    name: "",
    type: "kiosk",
    location_id: "",
    status: "active",
  });

  const sha256Hex = async (value: string) => {
    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  useEffect(() => {
    if (open) {
      loadLocations();
      if (device) {
        setForm({
          name: device.name,
          type: device.type,
          location_id: device.location_id || "",
          status: device.status,
        });
      } else {
        setForm({
          name: "",
          type: "kiosk",
          location_id: "",
          status: "active",
        });
      }
    }
  }, [open, device]);

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
    if (!form.name) {
      toast({
        title: "Missing name",
        description: "Please enter a device name",
        variant: "destructive",
      });
      return;
    }

    if (!form.location_id) {
      toast({
        title: "Missing location",
        description: "Please assign this device to a location",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const deviceData: Record<string, any> = {
      name: form.name,
      type: form.type,
      location_id: form.location_id,
      status: form.status,
      org_id: orgId,
    };

    // devices.api_key_hash is required in the DB schema.
    // For now we generate a random token and store its SHA-256 hash.
    if (!device) {
      const rawToken = crypto.randomUUID();
      deviceData.api_key_hash = await sha256Hex(rawToken);
    }

    let error;
    if (device) {
      const { error: updateError } = await (supabase as any)
        .from("devices")
        .update(deviceData)
        .eq("id", device.id);
      error = updateError;
    } else {
      const { error: insertError } = await (supabase as any)
        .from("devices")
        .insert(deviceData);
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
        description: `Device ${device ? "updated" : "registered"} successfully`,
      });
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    if (!device) return;
    if (!confirm("Are you sure you want to delete this device?")) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("devices").delete().eq("id", device.id);
    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Device deleted",
        description: "The device has been removed.",
      });
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{device ? "Edit Device" : "Register Device"}</DialogTitle>
          <DialogDescription>
            {device ? "Update the device details." : "Add a new kiosk or check-in device."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <label className="label flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              Device Name
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Front Desk Kiosk"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="label">Device Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="input-field h-10"
              >
                <option value="kiosk">Kiosk (Tablet)</option>
                <option value="scanner">QR Scanner</option>
                <option value="mobile">Mobile Device</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="label">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input-field h-10"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="label flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Assigned Location
            </label>
            <select
              value={form.location_id}
              onChange={(e) => setForm({ ...form, location_id: e.target.value })}
              className="input-field h-10"
            >
              <option value="">Select location...</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center gap-3 pt-4 border-t border-border">
            {device && (
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
                {device ? "Save" : "Register"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
