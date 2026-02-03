"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, MapPin, Navigation, Search, X, Target } from "lucide-react";
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
import { Surface } from "@/components/attend/Surface";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
  orgId: string | null;
  onSuccess: () => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationDialog({
  open,
  onOpenChange,
  location,
  orgId,
  onSuccess,
}: LocationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    lat: "",
    lng: "",
    radius_m: "100",
  });

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name,
        address: location.address || "",
        lat: location.lat?.toString() || "",
        lng: location.lng?.toString() || "",
        radius_m: "100",
      });
    } else {
      setFormData({
        name: "",
        address: "",
        lat: "",
        lng: "",
        radius_m: "100",
      });
    }
    setSearchQuery("");
    setSearchResults([]);
  }, [location, open]);

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchPlaces(value), 500);
  };

  const selectSearchResult = (result: SearchResult) => {
    setFormData({
      ...formData,
      address: result.display_name,
      lat: result.lat,
      lng: result.lon,
    });
    setSearchQuery("");
    setSearchResults([]);

    if (!formData.name) {
      const namePart = result.display_name.split(",")[0];
      setFormData(prev => ({ ...prev, name: namePart }));
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ description: "Geolocation not supported", variant: "destructive" });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          lat: latitude.toString(),
          lng: longitude.toString(),
        }));

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await response.json();
          if (data.display_name) {
            setFormData(prev => ({ ...prev, address: data.display_name }));
          }
        } catch (error) {
          console.error("Reverse geocode error:", error);
        }
        setGettingLocation(false);
      },
      (error) => {
        setGettingLocation(false);
        toast({ description: "Failed to get location", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    setLoading(true);
    const supabase = createClient();

    const locationData = {
      name: formData.name,
      address: formData.address || null,
      lat: formData.lat ? parseFloat(formData.lat) : null,
      lng: formData.lng ? parseFloat(formData.lng) : null,
    };

    try {
      if (location) {
        await supabase
          .from("locations")
          .update(locationData as never)
          .eq("id", location.id);
      } else {
        const { data: newLocation } = await supabase
          .from("locations")
          .insert({ ...locationData, org_id: orgId } as never)
          .select()
          .single();

        if (newLocation && formData.lat && formData.lng) {
          await supabase.from("geofences").insert({
            org_id: orgId,
            location_id: (newLocation as { id: string }).id,
            type: "radius",
            radius_m: parseInt(formData.radius_m),
          } as never);
        }
      }
      onSuccess();
      onOpenChange(false);
      toast({ title: "Success", description: `Location ${location ? "updated" : "created"} successfully` });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{location ? "Edit Location" : "Add Location"}</DialogTitle>
          <DialogDescription>
            {location ? "Update the location details." : "Add a new check-in location."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Location Name */}
          <div className="space-y-2">
            <label className="label flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Location Name
            </label>
            <Input
              placeholder="e.g. Main Office"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Address Search */}
          <div className="space-y-2 relative">
            <label className="label flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Address
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search address..."
                  className="pl-10"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                    {searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectSearchResult(result)}
                        className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-start gap-3 text-sm border-b border-border last:border-0"
                      >
                        <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{result.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                title="Use current location"
              >
                {gettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Selected Location Display */}
          {formData.lat && (
            <Surface variant="default" padding="sm" className="bg-success/5 border-success/20">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="status-dot status-dot-present" />
                    <span className="text-xs font-medium text-success">Location Set</span>
                  </div>
                  <div className="text-sm font-medium line-clamp-2">{formData.address || "No address"}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    {parseFloat(formData.lat).toFixed(6)}, {parseFloat(formData.lng).toFixed(6)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormData(prev => ({ ...prev, lat: "", lng: "", address: "" }))}
                  className="h-8 w-8 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Surface>
          )}

          {/* Geofence Radius (new locations only) */}
          {!location && formData.lat && (
            <div className="space-y-2">
              <label className="label">Geofence Radius</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={formData.radius_m}
                  onChange={(e) => setFormData({ ...formData, radius_m: e.target.value })}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-20 text-right">{formData.radius_m}m</span>
              </div>
              <p className="label-helper">People must be within this radius to check in</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {location ? "Save Changes" : "Add Location"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
