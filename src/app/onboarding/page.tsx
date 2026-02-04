"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Church,
  GraduationCap,
  Building2,
  Calendar,
  Heart,
  MoreHorizontal,
  MapPin,
  Users,
  QrCode,
  Smartphone,
  Check,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const orgTypes = [
  {
    id: "church",
    name: "Church / Ministry",
    icon: Church,
    description: "Weekly services, small groups, events",
    color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    suggestions: {
      sessionName: "Sunday Service",
      frequency: "weekly",
      methods: ["kiosk", "qr"],
    },
  },
  {
    id: "school",
    name: "School / Training",
    icon: GraduationCap,
    description: "Classes, lectures, training sessions",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    suggestions: {
      sessionName: "Morning Class",
      frequency: "daily",
      methods: ["qr", "manual"],
    },
  },
  {
    id: "workplace",
    name: "Workplace / Office",
    icon: Building2,
    description: "Daily attendance, shifts, meetings",
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    suggestions: {
      sessionName: "Daily Check-in",
      frequency: "daily",
      methods: ["geo", "kiosk"],
    },
  },
  {
    id: "event",
    name: "Event / Conference",
    icon: Calendar,
    description: "One-time or recurring events",
    color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    suggestions: {
      sessionName: "Event Registration",
      frequency: "once",
      methods: ["qr", "kiosk"],
    },
  },
  {
    id: "ngo",
    name: "NGO / Volunteer",
    icon: Heart,
    description: "Volunteer tracking, community programs",
    color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
    suggestions: {
      sessionName: "Volunteer Session",
      frequency: "weekly",
      methods: ["manual", "qr"],
    },
  },
  {
    id: "other",
    name: "Other",
    icon: MoreHorizontal,
    description: "Custom setup for your needs",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    suggestions: {
      sessionName: "Session",
      frequency: "weekly",
      methods: ["qr", "manual"],
    },
  },
];

const checkInMethods = [
  {
    id: "qr",
    name: "QR Code Badges",
    description: "Print badges with unique QR codes for each person",
    icon: QrCode,
  },
  {
    id: "kiosk",
    name: "Tablet Kiosk",
    description: "Set up a tablet at your entrance for self check-in",
    icon: Smartphone,
  },
  {
    id: "geo",
    name: "Location-Based",
    description: "Auto check-in when people arrive at your location",
    icon: MapPin,
  },
  {
    id: "manual",
    name: "Manual Entry",
    description: "Staff manually marks attendance from a list",
    icon: Users,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  
  const [formData, setFormData] = useState({
    orgType: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locationName: "",
    selectedMethods: [] as string[],
  });

  useEffect(() => {
    loadOrgData();
  }, []);

  const loadOrgData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: membership, error } = await supabase
      .from("org_memberships")
      .select("org_id, organizations(name)")
      .eq("user_id", user.id)
      .maybeSingle();

    // If there is simply no membership row yet, that's OK during onboarding
    if (error) {
      console.warn("Failed to load org membership during onboarding", error);
      return;
    }

    if (membership) {
      setOrgId((membership as { org_id: string }).org_id);
      const org = (membership as { organizations: { name: string } | null }).organizations;
      if (org) setOrgName(org.name);
    }
  };

  const handleOrgTypeSelect = (typeId: string) => {
    const selected = orgTypes.find((t) => t.id === typeId);
    setFormData({
      ...formData,
      orgType: typeId,
      selectedMethods: selected?.suggestions.methods || [],
    });
  };

  const toggleMethod = (methodId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedMethods: prev.selectedMethods.includes(methodId)
        ? prev.selectedMethods.filter((m) => m !== methodId)
        : [...prev.selectedMethods, methodId],
    }));
  };

  const handleComplete = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      let currentOrgId = orgId;

      if (!currentOrgId) {
        // Try to find an existing membership first
        const { data: membership, error: membershipError } = await supabase
          .from("org_memberships")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membershipError) {
          throw membershipError;
        }

        currentOrgId = membership ? (membership as { org_id: string }).org_id : null;

        // Legacy users may not have an org yet – create a minimal one on the fly
        if (!currentOrgId) {
          const fallbackName = orgName || "My Organization";
          const baseSlug = fallbackName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

          const { data: org, error: orgCreateError } = await supabase
            .from("organizations")
            .insert({
              name: fallbackName,
              // Temporary slug; will be replaced with id+name format
              slug: `${baseSlug || "org"}-${Date.now().toString(36)}`,
              org_type: formData.orgType || "other",
            } as never)
            .select()
            .maybeSingle();

          if (orgCreateError || !org) {
            throw orgCreateError || new Error("Failed to create organization for your account.");
          }

          const orgId = (org as { id: string }).id;
          const finalSlug = `${orgId}-${baseSlug || "org"}`;

          // Update slug to stable id+name format
          await supabase
            .from("organizations")
            .update({ slug: finalSlug } as never)
            .eq("id", orgId);

          // Create membership as owner
          const { error: membershipInsertError } = await supabase
            .from("org_memberships")
            .insert({
              org_id: orgId,
              user_id: user.id,
              role: "org_owner",
            } as never);

          if (membershipInsertError) {
            throw membershipInsertError;
          }

          currentOrgId = orgId;
        }

        if (currentOrgId) {
          setOrgId(currentOrgId);
        }
      }

      if (!currentOrgId) {
        throw new Error("We couldn't link your account to an organization. Please refresh the page or contact support.");
      }

      // Update organization with type and timezone (cast client to any to work around Supabase typing)
      const { error: orgError } = await (supabase as any)
        .from("organizations")
        .update({
          org_type: formData.orgType || "other",
          timezone: formData.timezone,
        })
        .eq("id", currentOrgId);

      if (orgError) throw orgError;

      // Create location if provided
      if (formData.locationName) {
        const { error: locationError } = await supabase.from("locations").insert({
          org_id: currentOrgId,
          name: formData.locationName,
        } as never);

        if (locationError) throw locationError;
      }

      // Mark onboarding as complete in the database
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as never)
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Also save to localStorage as backup
      localStorage.setItem("onboarding_complete", "true");
      localStorage.removeItem("onboarding_started");

      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding completion failed", error);
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Skip button */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="text-muted-foreground"
        >
          Skip for now
        </Button>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-16">
        <AnimatePresence mode="wait">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              
              <h1 className="text-3xl font-bold mb-4">
                Welcome to Attend{orgName ? `, ${orgName}` : ""}!
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                Let&apos;s get you set up in just a few minutes. We&apos;ll customize 
                everything based on how you plan to use Attend.
              </p>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
                <Clock className="w-4 h-4" />
                <span>This takes about 3 minutes</span>
              </div>

              <Button size="lg" onClick={() => setStep(2)} className="px-8">
                Let&apos;s get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Organization Type */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">What type of organization are you?</h1>
                <p className="text-muted-foreground">
                  This helps us customize Attend for your specific needs
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 mb-8">
                {orgTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.orgType === type.id;
                  
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleOrgTypeSelect(type.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${type.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{type.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {type.description}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={!formData.orgType}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Location Setup */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Where do people check in?</h1>
                <p className="text-muted-foreground">
                  Add your first location — you can add more later
                </p>
              </div>

              <div className="space-y-6 mb-8">
                <div className="space-y-2">
                  <Label htmlFor="locationName">Location name</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="locationName"
                      value={formData.locationName}
                      onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                      placeholder={
                        formData.orgType === "church" ? "Main Sanctuary" :
                        formData.orgType === "school" ? "Main Campus" :
                        formData.orgType === "workplace" ? "Head Office" :
                        "Main Location"
                      }
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This could be a building, room, or area where attendance is tracked
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(4)}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Check-in Methods */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">How will people check in?</h1>
                <p className="text-muted-foreground">
                  Select the methods you&apos;d like to use — you can change this anytime
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {checkInMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = formData.selectedMethods.includes(method.id);
                  
                  return (
                    <button
                      key={method.id}
                      onClick={() => toggleMethod(method.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${
                          isSelected 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {method.description}
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground/30"
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleComplete}
                  disabled={loading || formData.selectedMethods.length === 0}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Complete setup
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
