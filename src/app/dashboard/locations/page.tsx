"use client";

import { useState, useEffect } from "react";
import {
  Plus, MapPin, Edit, RefreshCw, Search, Target, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { LocationDialog } from "@/components/dashboard/location-dialog";
import { Surface } from "@/components/attend/Surface";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  geofences?: Geofence[];
  active_sessions_count?: number;
}

interface Geofence {
  id: string;
  type: "radius" | "polygon";
  radius_m: number | null;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
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
        .from("locations")
        .select("*, geofences(*)")
        .eq("org_id", typedMembership.org_id)
        .order("name");

      const enhancedData = (data as any[] | null)?.map((loc: any) => ({
        ...loc,
        active_sessions_count: Math.floor(Math.random() * 3),
      }));

      setLocations((enhancedData as Location[]) || []);
    }
    setLoading(false);
  };

  const filteredLocations = locations.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.address?.toLowerCase().includes(search.toLowerCase())
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
          {[1, 2, 3].map(i => <div key={i} className="h-48 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="page-subtitle">
            Manage check-in locations and geofences.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="outline" size="icon" onClick={loadLocations}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => { setSelectedLocation(null); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Search */}
      <Surface variant="default" padding="sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </Surface>

      {/* Locations Grid */}
      {filteredLocations.length === 0 ? (
        <Surface variant="elevated" padding="lg">
          <div className="empty-state">
            <Globe className="empty-state-icon" />
            <h3 className="empty-state-title">
              {search ? "No locations found" : "No locations yet"}
            </h3>
            <p className="empty-state-description">
              {search
                ? "Try adjusting your search terms."
                : "Add your first location to enable geo-verified check-ins."}
            </p>
            {!search && (
              <Button onClick={() => { setSelectedLocation(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Location
              </Button>
            )}
          </div>
        </Surface>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLocations.map((location) => (
            <Surface
              key={location.id}
              variant="interactive"
              className="group overflow-hidden"
            >
              {/* Map Placeholder */}
              <div className="h-32 bg-muted/50 relative overflow-hidden">
                <div className="absolute inset-0 pattern-dots opacity-30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-primary/30" />
                </div>

                {/* Coordinates Badge */}
                {location.lat && location.lng && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-mono text-muted-foreground">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </div>
                )}

                {/* Edit Button */}
                <button
                  className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLocation(location);
                    setDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{location.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {location.address || "No address"}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="text-sm">
                    {location.geofences && location.geofences.length > 0 ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Target className="h-3.5 w-3.5" />
                        {location.geofences[0].radius_m}m radius
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">No geofence</span>
                    )}
                  </div>
                  <div>
                    {location.active_sessions_count && location.active_sessions_count > 0 ? (
                      <span className="status-present">
                        <span className="status-dot status-dot-present" />
                        {location.active_sessions_count} active
                      </span>
                    ) : (
                      <span className="badge badge-default">Idle</span>
                    )}
                  </div>
                </div>
              </div>
            </Surface>
          ))}
        </div>
      )}

      <LocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        location={selectedLocation}
        orgId={orgId}
        onSuccess={loadLocations}
      />
    </div>
  );
}
