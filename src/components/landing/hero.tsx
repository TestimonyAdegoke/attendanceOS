"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, MapPin, Monitor, CalendarDays, Check, ArrowRight, Play, Shield, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const methods = [
  { id: "qr", label: "QR Code", icon: QrCode, description: "Scan personal badges or session codes" },
  { id: "geo", label: "Location", icon: MapPin, description: "Geofence-verified presence" },
  { id: "kiosk", label: "Kiosk", icon: Monitor, description: "Self-service check-in stations" },
  { id: "recurring", label: "Recurring", icon: CalendarDays, description: "Automated session scheduling" },
];

const stats = [
  { value: "50K+", label: "People tracked" },
  { value: "2,000+", label: "Organizations" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.9★", label: "User rating" },
];

function LiveDemo() {
  const [activeMethod, setActiveMethod] = useState("qr");
  const [recentCheckins, setRecentCheckins] = useState([
    { name: "Sarah Johnson", time: "Just now", status: "present" },
    { name: "Michael Chen", time: "2 min ago", status: "present" },
    { name: "Emily Davis", time: "5 min ago", status: "present" },
  ]);

  return (
    <div className="relative">
      {/* Glow Effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl rounded-3xl opacity-50" />

      <div className="relative rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Window Chrome */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Live Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-dot status-dot-present animate-pulse" />
            <span className="text-xs font-medium text-success">Live</span>
          </div>
        </div>

        <div className="p-5">
          {/* Method Tabs */}
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1 mb-5">
            {methods.map((method) => (
              <button
                key={method.id}
                onClick={() => setActiveMethod(method.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all flex-1 justify-center",
                  activeMethod === method.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <method.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{method.label}</span>
              </button>
            ))}
          </div>

          {/* Method Description */}
          <div className="mb-5">
            <h4 className="text-lg font-semibold mb-1">
              {methods.find((m) => m.id === activeMethod)?.label} Check-in
            </h4>
            <p className="text-sm text-muted-foreground">
              {methods.find((m) => m.id === activeMethod)?.description}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 mb-5">
            <div className="text-center">
              <div className="text-2xl font-bold text-success tabular-nums">847</div>
              <div className="text-xs text-muted-foreground">Present</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning tabular-nums">23</div>
              <div className="text-xs text-muted-foreground">Late</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive tabular-nums">12</div>
              <div className="text-xs text-muted-foreground">Absent</div>
            </div>
          </div>

          {/* Recent Check-ins */}
          <div className="space-y-2">
            {recentCheckins.map((person, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-success to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                  {person.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{person.name}</div>
                  <div className="text-xs text-muted-foreground">{person.time}</div>
                </div>
                <div className="flex items-center gap-1 text-success">
                  <Check className="h-4 w-4" />
                  <span className="text-xs font-medium">Present</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6 border border-primary/20"
            >
              <Users className="h-4 w-4" />
              <span>Trusted by 2,000+ organizations</span>
            </motion.div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block">Attendance,</span>
              <span className="block text-gradient">without ambiguity.</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              One platform for QR check-ins, geo-verified presence, kiosk mode, and recurring events—
              <span className="text-foreground font-medium">real time, auditable, effortless</span>.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" asChild className="h-12 px-8 text-base shadow-primary">
                <Link href="/signup">
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
                <Link href="/demo">
                  <Play className="h-4 w-4" />
                  Watch demo
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-success" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-warning" />
                <span>99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>No credit card required</span>
              </div>
            </div>
          </motion.div>

          {/* Right - Live Demo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <LiveDemo />
          </motion.div>
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-20"
        >
          <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-8 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl sm:text-4xl font-bold">{stat.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
