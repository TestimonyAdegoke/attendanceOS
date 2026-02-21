"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Plus, MapPin, Edit, MoreHorizontal, Navigation, Globe,
  RefreshCw, Search, Target, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { LocationDialog } from "@/components/dashboard/location-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Location {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  geofences?: { id: string; radius_m: number }[];
}

export default function OrgLocationsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;
    const supabase = createClient();
    await supabase.from("locations").delete().eq("id", locationId);
    loadLocations();
  };

  const loadLocations = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (!org) return;

    const currentOrgId = (org as { id: string }).id;
    setOrgId(currentOrgId);

    const { data } = await supabase
      .from("locations")
      .select("*, geofences(*)")
      .eq("org_id", currentOrgId)
      .order("name");

    setLocations((data as Location[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadLocations();
  }, [orgSlug]);

  const filteredLocations = locations.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.address?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-9 w-32 bg-muted animate-pulse rounded-lg mb-2" />
            <div className="h-5 w-64 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Locations</h1>
          <p className="text-muted-foreground mt-1">Manage your check-in locations and geofences</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={loadLocations}
            size="icon"
            className="rounded-xl"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => { setSelectedLocation(null); setDialogOpen(true); }}
            className="rounded-xl bg-gradient-to-r from-primary to-violet-600 shadow-lg shadow-primary/25"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search locations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-muted/50 border-transparent focus:border-primary/50"
        />
      </div>

      {/* Locations Grid */}
      {filteredLocations.length === 0 && locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 mb-4">
              <MapPin className="h-10 w-10 text-rose-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No locations yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Add your first location to start tracking attendance by place.
            </p>
            <Button 
              onClick={() => { setSelectedLocation(null); setDialogOpen(true); }}
              className="rounded-xl bg-gradient-to-r from-primary to-violet-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </CardContent>
        </Card>
      ) : filteredLocations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-8 w-8 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground">No locations match &quot;{search}&quot;</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLocations.map((location) => (
            <Card key={location.id} className="overflow-hidden hover:shadow-lg transition-all group">
              {/* Map Preview Placeholder */}
              <div className="h-32 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative">
                {location.lat && location.lng ? (
                  <>
                    <Globe className="h-12 w-12 text-muted-foreground/30" />
                    <div className="absolute bottom-2 left-2 text-xs bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md">
                      {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </div>
                  </>
                ) : (
                  <Building2 className="h-12 w-12 text-muted-foreground/30" />
                )}
              </div>
              
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                      {location.name}
                    </h3>
                    {location.address && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {location.address}
                      </p>
                    )}
                    
                    {/* Geofence Badge */}
                    {location.geofences && location.geofences.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Target className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          {location.geofences[0].radius_m}m geofence
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => { setSelectedLocation(location); setDialogOpen(true); }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedLocation(location);
                            setDialogOpen(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteLocation(location.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
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
