"use client";

import { useState, useEffect } from "react";
import { Plus, Monitor, Copy, Check, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { DeviceDialog } from "@/components/dashboard/device-dialog";
import { Surface } from "@/components/attend/Surface";
import { cn } from "@/lib/utils";

interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
  location_id: string | null;
  last_seen_at: string | null;
  created_at: string;
  locations?: { name: string };
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
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
      const typedMembership = membership as { org_id: string };
      setOrgId(typedMembership.org_id);
      const { data } = await (supabase as any)
        .from("devices")
        .select("*, locations(name)")
        .eq("org_id", typedMembership.org_id)
        .order("name");

      setDevices((data as Device[]) || []);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingDevice(null);
    setDialogOpen(true);
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setDialogOpen(true);
  };

  const copyKioskUrl = (deviceId: string) => {
    const url = `${window.location.origin}/kiosk/${deviceId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(deviceId);
    setTimeout(() => setCopiedId(null), 2000);
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
          {[1, 2, 3].map(i => <div key={i} className="h-40 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Devices</h1>
          <p className="page-subtitle">
            Manage kiosk devices for self-service check-in.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="outline" size="icon" onClick={loadDevices}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Device
          </Button>
        </div>
      </div>

      {/* Devices Grid */}
      {devices.length === 0 ? (
        <Surface variant="elevated" padding="lg">
          <div className="empty-state">
            <Monitor className="empty-state-icon" />
            <h3 className="empty-state-title">No devices yet</h3>
            <p className="empty-state-description">
              Add a kiosk device to enable tablet-based check-in.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Device
            </Button>
          </div>
        </Surface>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <Surface
              key={device.id}
              variant="interactive"
              padding="md"
              className="group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Monitor className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{device.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {device.locations?.name || "No location"}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                  device.status === "active"
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                )}>
                  {device.status}
                </span>
              </div>

              {device.last_seen_at && (
                <p className="text-xs text-muted-foreground mb-4">
                  Last seen: {new Date(device.last_seen_at).toLocaleString()}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => copyKioskUrl(device.id)}
                >
                  {copiedId === device.id ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy URL
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEdit(device)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </Surface>
          ))}
        </div>
      )}

      <DeviceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        device={editingDevice}
        onSuccess={loadDevices}
        orgId={orgId}
      />
    </div>
  );
}
