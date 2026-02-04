"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, Eye, EyeOff, User, Building2, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const passwordRequirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains a number", test: (p: string) => /\d/.test(p) },
  { label: "Contains a letter", test: (p: string) => /[a-zA-Z]/.test(p) },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    orgName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const isPasswordValid = passwordRequirements.every((req) => req.test(formData.password));

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    if (!isPasswordValid) {
      setError("Please ensure your password meets all requirements");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          org_name: formData.orgName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?onboarding=true`,
      },
    });

    if (authError) {
      const normalizedMessage = authError.message.toLowerCase();
      const errorCode = (authError as { code?: string })?.code;

      if (normalizedMessage.includes("already registered")) {
        setError("This email is already registered. Try signing in instead.");
      } else if (errorCode === "over_email_send_rate_limit" || normalizedMessage.includes("rate limit")) {
        setError("We2ve sent quite a few verification emails. Please wait a minute before trying again.");
        if (cooldown === 0) {
          setCooldown(60);
        }
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    if (authData.user) {
      // Create profile
      await (supabase.from("profiles") as any).insert({
        id: authData.user.id,
        full_name: formData.fullName,
        email: formData.email,
      });

      // Create organization with temporary slug, then update to id+name pattern
      const baseSlug = formData.orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const { data: org, error: orgError } = await (supabase
        .from("organizations") as any)
        .insert({
          name: formData.orgName,
          // Temporary slug to satisfy NOT NULL/unique constraints
          slug: baseSlug + "-" + Date.now().toString(36),
        })
        .select()
        .single();

      if (!orgError && org) {
        const orgId = (org as { id: string }).id;
        const finalSlug = `${orgId}-${baseSlug || "org"}`;

        // Update slug to stable id+name format
        await (supabase.from("organizations") as any)
          .update({ slug: finalSlug } as never)
          .eq("id", orgId);

        // Create membership as owner
        await (supabase.from("org_memberships") as any).insert({
          org_id: orgId,
          user_id: authData.user.id,
          role: "org_owner",
        });

        // Create org plan
        await (supabase.from("org_plans") as any).insert({
          org_id: orgId,
          plan: "starter",
        });

        // Store onboarding state
        localStorage.setItem("onboarding_org_id", orgId);
        localStorage.setItem("onboarding_started", "true");
      }
    }

    setLoading(false);
    
    // Check if email confirmation is required
    if (authData.user && !authData.session) {
      setEmailSent(true);
      setCooldown(60);
    } else {
      router.push("/onboarding");
    }
  };

  const handleResendVerification = async () => {
    if (cooldown > 0 || !formData.email) return;

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: formData.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?onboarding=true`,
      },
    });

    if (resendError) {
      const normalizedMessage = resendError.message.toLowerCase();
      const errorCode = (resendError as { code?: string })?.code;

      if (errorCode === "over_email_send_rate_limit" || normalizedMessage.includes("rate limit")) {
        setError("You2re requesting verification emails too frequently. Please wait a bit before trying again.");
        setCooldown((prev) => (prev > 0 ? prev : 60));
      } else {
        setError(resendError.message);
      }
    } else {
      setCooldown(60);
    }

    setLoading(false);
  };

  if (emailSent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
        <p className="text-muted-foreground mb-6">
          We&apos;ve sent a verification link to <strong>{formData.email}</strong>. 
          Please check your inbox and click the link to activate your account.
        </p>
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground mb-6">
          <p className="font-medium text-foreground mb-1">What happens next?</p>
          <p>After verifying your email, you&apos;ll be guided through a quick setup to customize Attend for your organization.</p>
        </div>
        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={() => setEmailSent(false)}>
            Use a different email
          </Button>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Didn&apos;t receive the email? Check your spam folder or resend it below.
            </p>
            <Button
              variant="link"
              className="h-auto p-0 text-primary"
              onClick={handleResendVerification}
              disabled={loading || cooldown > 0}
            >
              {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-2 text-muted-foreground">
          Start your 14-day free trial — no credit card required
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all ${
              s === step ? "w-8 bg-primary" : s < step ? "w-8 bg-primary" : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSignup} className="space-y-5">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="fullName">Your name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="John Smith"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@organization.com"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We&apos;ll send a verification link to this address
                </p>
              </div>

              <Button
                type="button"
                className="w-full h-11"
                onClick={() => {
                  if (formData.fullName && formData.email) {
                    setStep(2);
                    setError("");
                  }
                }}
                disabled={!formData.fullName || !formData.email}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="orgName"
                    value={formData.orgName}
                    onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                    placeholder="Acme Church, Springfield School..."
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This is how your organization will appear in Attend
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Create a password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Password requirements */}
                <div className="space-y-1.5 pt-2">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {req.test(formData.password) ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className={req.test(formData.password) ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 h-11" 
                  disabled={loading || !formData.orgName || !isPasswordValid}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Create account
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-sm text-muted-foreground pt-2">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
        </p>
      </form>
    </motion.div>
  );
}
