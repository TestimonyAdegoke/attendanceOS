"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Copy, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { toPng } from "html-to-image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DigitalBadgeVariant = "standard" | "event" | "compact" | "kiosk";

type BadgeQrSize = "sm" | "md" | "lg";

type BadgeTemplateId =
  | "glass"
  | "minimal"
  | "solid"
  | "midnight"
  | "aurora"
  | "institutional"
  | "executive"
  | "compact"
  | "soft_modern"
  | "event_pass";

type BadgeConfig = {
  template: BadgeTemplateId;
  showSubtitle: boolean;
  showStatusChip: boolean;
  showCode: boolean;
  showWatermark: boolean;
  showDownload: boolean;
  qrSize: BadgeQrSize;
  backgroundMode?: "auto" | "custom";
  backgroundColor?: string;
};

const DEFAULT_BADGE_CONFIG: BadgeConfig = {
  template: "glass",
  showSubtitle: true,
  showStatusChip: true,
  showCode: true,
  showWatermark: true,
  showDownload: true,
  qrSize: "md",
  backgroundMode: "auto",
};

type Person = {
  id: string;
  org_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  checkin_code: string;
  created_at: string;
  attributes?: Record<string, any> | null;
};

type EventSession = {
  id: string;
  name: string;
  session_date: string;
  start_at: string;
  end_at: string;
  public_code: string | null;
  event_qr_token: string | null;
  locations?: { name: string } | null;
};

export function DigitalBadge(props: {
  personId: string;
  eventId?: string;
  variant: DigitalBadgeVariant;
  className?: string;
  configOverride?: Partial<BadgeConfig>;
}) {
  const { personId, eventId, variant, className, configOverride } = props;

  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState<Person | null>(null);
  const [event, setEvent] = useState<EventSession | null>(null);

  const [settingsConfig, setSettingsConfig] = useState<Partial<BadgeConfig> | null>(null);
  const [orgMark, setOrgMark] = useState<{ name: string; logoUrl: string | null } | null>(null);

  const [qrUrl, setQrUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const subtitle = useMemo(() => {
    const attrs = person?.attributes || {};
    const candidates = [
      attrs.role,
      attrs.title,
      attrs.cohort,
      attrs.grade,
      attrs.department,
      attrs.location,
    ].filter(Boolean);

    const line = candidates.slice(0, 2).join(" · ");
    return line || (person?.email || person?.phone || "Verified Member");
  }, [person]);

  const config = useMemo((): BadgeConfig => {
    return {
      ...DEFAULT_BADGE_CONFIG,
      ...(settingsConfig || {}),
      ...(configOverride || {}),
    };
  }, [configOverride, settingsConfig]);

  const statusChip = useMemo(() => {
    const base = {
      label: person?.status === "active" ? "Active Member" : "Inactive",
      tone: person?.status === "active" ? "ok" : "warn",
    };

    if (variant === "event") {
      return {
        label: "Event Credential",
        tone: "ok" as const,
      };
    }

    return base;
  }, [person?.status, variant]);

  const load = useCallback(async () => {
    setLoading(true);
    setQrReady(false);
    const supabase = createClient();

    const { data: p } = await supabase
      .from("people")
      .select("id, org_id, full_name, email, phone, status, checkin_code, created_at, attributes")
      .eq("id", personId)
      .single();

    const loadedPerson = (p as any) || null;
    setPerson(loadedPerson);

    if (loadedPerson?.org_id) {
      const { data: settings } = await supabase
        .from("organization_settings")
        .select("badge_config, logo_url")
        .eq("org_id", loadedPerson.org_id)
        .single();
      const s = settings as any;
      setSettingsConfig((s?.badge_config as any) || null);

      const { data: org } = await supabase
        .from("organizations")
        .select("name, brand_logo_url")
        .eq("id", loadedPerson.org_id)
        .single();
      const o = org as any;
      setOrgMark({ name: o?.name || "", logoUrl: s?.logo_url || o?.brand_logo_url || null });
    } else {
      setSettingsConfig(null);
      setOrgMark(null);
    }

    if (eventId) {
      const { data: s } = await supabase
        .from("sessions")
        .select("id, name, session_date, start_at, end_at, public_code, event_qr_token, locations(name)")
        .eq("id", eventId)
        .single();
      setEvent((s as any) || null);
    } else {
      setEvent(null);
    }

    setLoading(false);
  }, [eventId, personId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    try {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      const apply = () => setReduceMotion(Boolean(m.matches));
      apply();
      m.addEventListener("change", apply);
      return () => m.removeEventListener("change", apply);
    } catch {
      setReduceMotion(false);
    }
  }, []);

  const qrPayload = useMemo(() => {
    if (!person) return "";

    // Standard identity QR (kiosk scans this): attend://person/<checkin_code>
    if (variant !== "event") {
      return `attend://person/${person.checkin_code}`;
    }

    // Event-aware: prefer event QR token when present
    if (event?.event_qr_token) {
      return `attend://event/${event.event_qr_token}`;
    }

    return `attend://person/${person.checkin_code}`;
  }, [event?.event_qr_token, person, variant]);

  const qrSize = useMemo(() => {
    if (variant === "kiosk") return 420;
    if (variant === "compact") return 196;
    if (config.qrSize === "sm") return 240;
    if (config.qrSize === "lg") return 360;
    return 320;
  }, [config.qrSize, variant]);

  useEffect(() => {
    let cancelled = false;

    const draw = async () => {
      if (!qrPayload) return;

      // always generate a dataURL for download, and draw to canvas for ultra crisp scanning
      const url = await QRCode.toDataURL(qrPayload, { width: qrSize, margin: 2 });
      if (cancelled) return;
      setQrUrl(url);

      // defer to ensure DOM is painted
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (cancelled) return;

      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, qrPayload, {
          width: qrSize,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (!cancelled) setQrReady(true);
      }

      // simple offline cache (best-effort)
      try {
        if (person?.id) {
          localStorage.setItem(`attendos:badge:qr:${person.id}:${eventId || ""}:${variant}`, url);
        }
      } catch {
        // ignore
      }
    };

    draw();

    return () => {
      cancelled = true;
    };
  }, [eventId, person?.id, qrPayload, qrSize, variant]);

  useEffect(() => {
    if (qrUrl) return;
    // fallback to cached QR if offline
    try {
      if (!personId) return;
      const cached = localStorage.getItem(`attendos:badge:qr:${personId}:${eventId || ""}:${variant}`);
      if (cached) setQrUrl(cached);
    } catch {
      // ignore
    }
  }, [eventId, personId, qrUrl, variant]);

  const copyCode = async () => {
    if (!person?.checkin_code) return;
    try {
      await navigator.clipboard.writeText(person.checkin_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const downloadPng = () => {
    const run = async () => {
      if (!person) return;

      const node = rootRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const exportPixelRatio = 2;

      const bgColor =
        config.backgroundMode === "custom" && config.backgroundColor
          ? config.backgroundColor
          : config.template === "minimal" || config.template === "institutional" || config.template === "compact"
            ? "#ffffff"
            : undefined;

      const url = await toPng(node, {
        cacheBust: true,
        backgroundColor: bgColor,
        pixelRatio: exportPixelRatio,
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(person.full_name || "member").replace(/\s+/g, "_")}_${variant}_${config.template}_badge.png`;
      a.click();
    };
    run();
  };

  const cardBackground = useMemo(() => {
    if (config.backgroundMode === "custom" && config.backgroundColor) return config.backgroundColor;
    if (config.template === "minimal" || config.template === "institutional" || config.template === "compact") {
      return "#ffffff";
    }
    return undefined;
  }, [config.backgroundColor, config.backgroundMode, config.template]);

  const shell = useMemo(() => {
    const base = "relative overflow-hidden border shadow-sm";
    const pads =
      variant === "kiosk"
        ? "p-6"
        : config.template === "minimal"
          ? "p-8"
          : config.template === "compact"
            ? "p-4"
            : config.template === "institutional"
              ? "p-6"
              : config.template === "event_pass"
                ? "p-6"
                : "p-5";
    const radius =
      config.template === "minimal"
        ? "rounded-2xl"
        : config.template === "institutional" || config.template === "compact"
          ? "rounded-xl"
          : "rounded-3xl";
    const surface =
      config.template === "minimal" || config.template === "institutional" || config.template === "compact"
        ? ""
        : config.template === "midnight" || config.template === "executive"
          ? "bg-background/70 backdrop-blur-xl"
          : config.template === "aurora" || config.template === "soft_modern" || config.template === "event_pass"
            ? "bg-background/60 backdrop-blur-xl"
            : "bg-background/70 backdrop-blur-xl";
    return cn(base, radius, surface, pads, className);
  }, [className, config.template, variant]);

  const bg = useMemo(() => {
    const primary = "var(--color-primary, #4f46e5)";
    const accent = "var(--color-accent, #06b6d4)";

    if (config.template === "minimal" || config.template === "institutional" || config.template === "compact") {
      return {
        backgroundColor: cardBackground,
      } as any;
    }

    const eventTint = variant === "event" ? "22" : config.template === "midnight" ? "14" : "14";

    if (config.template === "midnight" || config.template === "executive") {
      return {
        backgroundColor: cardBackground,
        backgroundImage: `radial-gradient(900px circle at 50% 15%, ${accent}16, transparent 55%), radial-gradient(900px circle at 50% 85%, ${primary}10, transparent 60%)`,
      } as any;
    }

    if (config.template === "aurora" || config.template === "soft_modern" || config.template === "event_pass") {
      return {
        backgroundColor: cardBackground,
        backgroundImage: `radial-gradient(850px circle at 20% 0%, ${accent}${eventTint}, transparent 55%), radial-gradient(850px circle at 80% 0%, ${primary}${eventTint}, transparent 55%)`,
      } as any;
    }

    return {
      backgroundColor: cardBackground,
      backgroundImage: `radial-gradient(850px circle at 20% 0%, ${accent}${eventTint}, transparent 55%), radial-gradient(850px circle at 80% 0%, ${primary}${eventTint}, transparent 55%)`,
    } as any;
  }, [cardBackground, config.template, variant]);

  const headerTone = useMemo(() => {
    if (config.template === "minimal") {
      return {
        labelTone: "text-muted-foreground",
        titleTone: "text-foreground",
      };
    }

    if (config.template === "midnight" || config.template === "executive") {
      return {
        labelTone: "text-muted-foreground",
        titleTone: "text-foreground",
      };
    }

    if (config.template === "institutional" || config.template === "compact") {
      return {
        labelTone: "text-muted-foreground",
        titleTone: "text-foreground",
      };
    }

    return {
      labelTone: "text-muted-foreground",
      titleTone: "text-foreground",
    };
  }, [config.template]);

  const showHeaderRow = useMemo(() => {
    return config.template !== "minimal" && config.template !== "event_pass";
  }, [config.template]);

  const logoNode = useMemo(() => {
    if (!orgMark?.logoUrl) return null;
    return (
      <img
        src={orgMark.logoUrl}
        alt=""
        className={cn(
          "object-contain",
          config.template === "minimal" ? "h-7 w-auto" : "h-7 w-auto opacity-90"
        )}
      />
    );
  }, [config.template, orgMark?.logoUrl]);

  const statusTone = useMemo(() => {
    const active = person?.status === "active";
    if (config.template === "minimal") {
      return {
        cls: cn(
          "px-3 py-1 rounded-full border",
          active ? "bg-transparent text-foreground border-border/60" : "bg-transparent text-foreground border-red-500/40"
        ),
      };
    }

    if (config.template === "institutional") {
      return {
        cls: cn(
          "px-3 py-1 rounded-full border",
          active ? "bg-slate-900 text-white border-slate-900" : "bg-red-600 text-white border-red-600"
        ),
      };
    }

    if (config.template === "executive") {
      return {
        cls: cn(
          "px-3 py-1 rounded-full border",
          active
            ? "bg-white/10 text-foreground border-white/15"
            : "bg-red-500/10 text-foreground border-red-400/20"
        ),
      };
    }

    if (config.template === "midnight") {
      return {
        cls: cn(
          "px-3 py-1 rounded-full border",
          active
            ? "bg-emerald-500/5 text-emerald-200 border-emerald-400/20"
            : "bg-red-500/5 text-red-200 border-red-400/20"
        ),
      };
    }

    return {
      cls: cn(
        "px-3 py-1 rounded-full border",
        statusChip.tone === "ok"
          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
          : "bg-amber-500/10 text-amber-700 border-amber-500/20"
      ),
    };
  }, [config.template, person?.status, statusChip.tone]);

  const qrContainerClass = useMemo(() => {
    if (config.template === "minimal") {
      return "mt-6 border border-border/70 bg-white rounded-xl p-5 shadow-sm";
    }

    if (config.template === "institutional") {
      return "mt-5 border-2 border-slate-900 bg-white rounded-lg p-4 shadow-sm";
    }

    if (config.template === "compact") {
      return "mt-4 border border-border/70 bg-white rounded-xl p-4 shadow-sm";
    }

    if (config.template === "midnight") {
      return cn(
        "mt-6 rounded-3xl p-5 border",
        "bg-background/30 backdrop-blur-xl",
        "shadow-[0_18px_50px_rgba(0,0,0,0.35)]",
        "border-border/60"
      );
    }

    if (config.template === "executive") {
      return cn(
        "mt-5 rounded-3xl p-5 border",
        "bg-background/25 backdrop-blur-xl",
        "shadow-[0_18px_50px_rgba(0,0,0,0.30)]",
        "border-border/60"
      );
    }

    if (config.template === "event_pass") {
      return cn(
        "mt-5 rounded-2xl border bg-white p-4 flex items-center justify-center",
        "shadow-sm"
      );
    }

    return cn(
      "mt-5 rounded-3xl border bg-white p-4 flex items-center justify-center",
      "shadow-sm",
      variant === "kiosk" ? "p-6" : "p-4"
    );
  }, [config.template, variant]);

  const qrMotionClass = useMemo(() => {
    if (reduceMotion) return "";
    if (config.template === "minimal") {
      return cn("transition-opacity duration-300", qrReady ? "opacity-100" : "opacity-0");
    }
    if (config.template === "midnight") {
      return cn(
        "transition-all duration-500",
        qrReady ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]"
      );
    }
    if (config.template === "aurora" || config.template === "soft_modern") {
      return cn(
        "transition-all duration-500",
        qrReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      );
    }
    if (config.template === "institutional" || config.template === "compact" || config.template === "event_pass") {
      return cn("transition-opacity duration-200", qrReady ? "opacity-100" : "opacity-0");
    }
    return "";
  }, [config.template, qrReady, reduceMotion]);

  const identityTone = useMemo(() => {
    if (config.template === "institutional") {
      return {
        name: "text-2xl font-black tracking-tight",
        subtitle: "text-sm text-muted-foreground",
      };
    }
    if (config.template === "executive") {
      return {
        name: "text-2xl font-semibold tracking-tight",
        subtitle: "text-sm text-muted-foreground",
      };
    }
    if (config.template === "aurora" || config.template === "soft_modern") {
      return {
        name: "text-2xl font-bold tracking-tight",
        subtitle: "text-sm text-muted-foreground",
      };
    }
    if (config.template === "compact" || config.template === "event_pass") {
      return {
        name: "text-xl font-bold tracking-tight",
        subtitle: "text-sm text-muted-foreground",
      };
    }
    return {
      name: "text-xl font-bold",
      subtitle: "text-sm text-muted-foreground",
    };
  }, [config.template]);

  const dividerNode = useMemo(() => {
    if (config.template === "minimal") {
      return <div className="mt-6 h-px w-full bg-border/70" />;
    }
    if (config.template === "midnight" || config.template === "executive") {
      return (
        <div
          className="mt-6 h-px w-full"
          style={{
            backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
          }}
        />
      );
    }
    if (config.template === "institutional") {
      return <div className="mt-5 h-[2px] w-full bg-slate-900" />;
    }
    if (config.template === "compact") {
      return <div className="mt-4 h-px w-full bg-border/60" />;
    }
    if (config.template === "event_pass") {
      return <div className="mt-4 h-px w-full bg-border/60" />;
    }
    return null;
  }, [config.template]);

  if (loading) {
    return (
      <div className={cn("rounded-3xl border bg-muted/30 animate-pulse", className)}>
        <div className="p-6 space-y-4">
          <div className="h-6 w-40 bg-muted rounded" />
          <div className="h-10 w-64 bg-muted rounded" />
          <div className="h-72 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!person) {
    return <div className={cn("text-sm text-muted-foreground", className)}>Badge unavailable.</div>;
  }

  const initials = person.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={rootRef} className={shell} style={bg}>
      {/* watermark */}
      {config.showWatermark ? (
        config.template === "midnight" ? (
          <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
            <div className="absolute inset-0 grid grid-cols-6 gap-10 px-10 py-14 rotate-[-10deg]">
              {Array.from({ length: 36 }).map((_, i) => (
                <div
                  key={i}
                  className="text-3xl font-black tracking-[0.35em] text-foreground/40"
                  style={{
                    opacity: i % 3 === 0 ? 0.35 : i % 3 === 1 ? 0.22 : 0.14,
                  }}
                >
                  {initials}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
            <div className="absolute -right-12 -top-10 rotate-12 text-6xl font-black tracking-tight">
              ATTENDOS
            </div>
            <div className="absolute left-6 bottom-10 text-5xl font-black tracking-tight">
              {person.org_id.slice(0, 6).toUpperCase()}
            </div>
          </div>
        )
      ) : null}

      <div className="relative">
        {showHeaderRow ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn("text-white flex items-center justify-center", "h-9 w-9 rounded-2xl")}
                style={{
                  backgroundImage: `linear-gradient(135deg, var(--color-primary, #4f46e5), var(--color-accent, #06b6d4))`,
                }}
              >
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className={cn("text-[11px] uppercase tracking-wider", headerTone.labelTone)}>Verified Member</div>
                <div className={cn("font-semibold leading-tight", headerTone.titleTone)}>Digital Badge</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {variant !== "kiosk" && config.showDownload ? (
                <Button variant="outline" size="sm" onClick={downloadPng} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {config.template === "minimal" ? (
          <div className="mt-2 flex items-center justify-center">{logoNode}</div>
        ) : config.template === "midnight" ? (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground uppercase tracking-wider truncate">
              {orgMark?.name || ""}
            </div>
            <div className="flex items-center justify-end">{logoNode}</div>
          </div>
        ) : config.template === "institutional" ? (
          <div className="mt-1 flex items-center justify-between">
            <div className="text-xs text-muted-foreground uppercase tracking-wider truncate">{orgMark?.name || ""}</div>
            <div className="flex items-center justify-end">{logoNode}</div>
          </div>
        ) : config.template === "event_pass" ? (
          <div className="mt-1 flex items-center justify-between">
            <div className="text-xs text-muted-foreground uppercase tracking-wider truncate">{orgMark?.name || ""}</div>
            <div className="flex items-center justify-end">{logoNode}</div>
          </div>
        ) : null}

        {/* Identity */}
        {variant !== "kiosk" ? (
          <div
            className={cn(
              "flex items-center gap-4",
              config.template === "minimal"
                ? "mt-6 justify-center text-center flex-col"
                : config.template === "event_pass"
                  ? "mt-4"
                  : "mt-5"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center text-white font-bold shadow-sm",
                config.template === "minimal"
                  ? "h-16 w-16 rounded-2xl text-2xl"
                  : config.template === "compact" || config.template === "event_pass"
                    ? "h-12 w-12 rounded-2xl text-lg"
                    : "h-14 w-14 rounded-2xl text-xl"
              )}
              style={{
                backgroundImage: `linear-gradient(135deg, var(--color-primary, #4f46e5), var(--color-accent, #06b6d4))`,
                boxShadow:
                  !reduceMotion && config.template === "midnight"
                    ? "0 0 0 2px rgba(255,255,255,0.06), 0 0 28px rgba(6,182,212,0.12)"
                    : undefined,
              }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div
                className={cn(
                  "truncate",
                  config.template === "minimal" ? "font-bold text-2xl sm:text-3xl" : identityTone.name,
                  config.template === "midnight" ? "text-foreground" : ""
                )}
              >
                {person.full_name}
              </div>
              {config.showSubtitle ? (
                <div className={cn("truncate", identityTone.subtitle, config.template === "midnight" ? "text-muted-foreground" : "")}>
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {dividerNode}

        {/* Status chip */}
        {variant !== "kiosk" && (config.showStatusChip || config.showCode) ? (
          <div
            className={cn(
              "flex items-center justify-between gap-3",
              config.template === "minimal" ? "mt-4" : "mt-4"
            )}
          >
            {config.showStatusChip ? (
              <Badge
                variant="outline"
                className={statusTone.cls}
                style={
                  config.template === "midnight" && !reduceMotion
                    ? {
                        boxShadow:
                          person.status === "active"
                            ? "0 0 0 1px rgba(16,185,129,0.12), 0 0 18px rgba(16,185,129,0.14)"
                            : "0 0 0 1px rgba(248,113,113,0.12), 0 0 18px rgba(248,113,113,0.12)",
                      }
                    : undefined
                }
              >
                {statusChip.tone === "ok" ? (
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                )}
                {statusChip.label}
              </Badge>
            ) : (
              <div />
            )}

            {config.showCode && config.template !== "minimal" ? (
              <button
                onClick={copyCode}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
              >
                <span className="font-mono">{person.checkin_code}</span>
                {copied ? <span className="text-emerald-600">Copied</span> : <Copy className="h-3.5 w-3.5" />}
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Event strip + QR layouts */}
        {config.template === "compact" || config.template === "event_pass" ? (
          <div className={cn("mt-4 grid gap-4", variant === "event" && event ? "lg:grid-cols-[1fr_auto]" : "lg:grid-cols-[1fr_auto]")}>
            <div>
              {variant === "event" && event ? (
                <div
                  className={cn(
                    "border px-4 py-3",
                    config.template === "event_pass" ? "rounded-xl bg-white" : "rounded-xl bg-white"
                  )}
                >
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Event</div>
                  <div className="font-semibold mt-1 truncate">{event.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(event.session_date).toLocaleDateString()} · {formatTime(event.start_at)} - {formatTime(event.end_at)}
                    {event.locations?.name ? ` · ${event.locations.name}` : ""}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Scan this code to verify identity and check-in instantly.
                </div>
              )}
            </div>

            <div className={cn(qrContainerClass, "w-fit")}
              style={config.template === "event_pass" ? { boxShadow: "0 10px 30px rgba(0,0,0,0.08)" } : undefined}
            >
              <canvas
                ref={canvasRef}
                className={cn(
                  "bg-white",
                  qrMotionClass,
                  variant === "kiosk"
                    ? "w-[420px] h-[420px]"
                    : variant === "compact"
                      ? "w-[196px] h-[196px]"
                      : config.qrSize === "sm"
                        ? "w-[240px] h-[240px]"
                        : config.qrSize === "lg"
                          ? "w-[360px] h-[360px]"
                          : "w-[320px] h-[320px]"
                )}
              />
            </div>
          </div>
        ) : (
          <>
            {variant === "event" && event ? (
              <div
                className={cn(
                  "mt-4 border px-4 py-3",
                  config.template === "institutional"
                    ? "rounded-lg bg-white"
                    : config.template === "executive"
                      ? "rounded-2xl bg-background/40 backdrop-blur"
                      : "rounded-2xl bg-background/60 backdrop-blur"
                )}
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Event</div>
                <div className="font-semibold mt-1 truncate">{event.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(event.session_date).toLocaleDateString()} · {formatTime(event.start_at)} - {formatTime(event.end_at)}
                  {event.locations?.name ? ` · ${event.locations.name}` : ""}
                </div>
              </div>
            ) : null}

            <div className={cn(qrContainerClass, "flex items-center justify-center")}>
              <canvas
                ref={canvasRef}
                className={cn(
                  "bg-white",
                  qrMotionClass,
                  variant === "kiosk"
                    ? "w-[420px] h-[420px]"
                    : variant === "compact"
                      ? "w-[196px] h-[196px]"
                      : config.qrSize === "sm"
                        ? "w-[240px] h-[240px]"
                        : config.qrSize === "lg"
                          ? "w-[360px] h-[360px]"
                          : "w-[320px] h-[320px]"
                )}
              />
            </div>
          </>
        )}

        {variant !== "kiosk" && config.showCode && config.template === "minimal" ? (
          <div className="mt-5 text-center">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Member Code</div>
            <button
              onClick={copyCode}
              className="mt-1 text-sm text-foreground hover:opacity-80 transition-opacity inline-flex items-center gap-2"
            >
              <span className="font-mono tracking-wider">{person.checkin_code}</span>
              {copied ? <span className="text-muted-foreground">Copied</span> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : null}

        {/* Footer */}
        {variant !== "kiosk" ? (
          <div className="mt-4 text-xs text-muted-foreground">
            QR loads instantly and stays scannable at a distance.
          </div>
        ) : null}
      </div>
    </div>
  );
}
