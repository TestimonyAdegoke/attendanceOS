"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { QrCode, MapPin, Monitor, CalendarDays, Shield, FileText, Building2, Users, ArrowRight, X, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const painPoints = [
  {
    title: "Manual processes fail",
    description: "Paper sign-ins are slow, error-prone, and impossible to audit.",
    icon: X,
  },
  {
    title: "Fragmented tools",
    description: "Spreadsheets, forms, and apps that don't talk to each other.",
    icon: X,
  },
  {
    title: "No proof of presence",
    description: "When disputes arise, there's no verifiable record.",
    icon: X,
  },
];

const features = [
  {
    icon: QrCode,
    title: "QR/Barcode Check-in",
    description: "Personal badges or session codes. Scan and verify in under a second.",
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
  },
  {
    icon: MapPin,
    title: "Geo Self Check-in",
    description: "Geofence validation ensures physical presence. No proxies.",
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Monitor,
    title: "Kiosk Mode",
    description: "Tablet-optimized interface for high-volume venues.",
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: CalendarDays,
    title: "Recurring Events",
    description: "Weekly, monthly, or custom patterns. Sessions auto-generate.",
    color: "from-orange-500 to-amber-600",
    bgColor: "bg-orange-500/10",
  },
];

const benefits = [
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC 2 compliant with end-to-end encryption and audit trails.",
  },
  {
    icon: FileText,
    title: "Detailed Reports",
    description: "Export attendance data, generate insights, and track trends.",
  },
  {
    icon: Building2,
    title: "Multi-Location",
    description: "Manage multiple venues, departments, or branches from one dashboard.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Role-based access control for admins, managers, and operators.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Pain points section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-1.5 text-sm font-medium text-destructive mb-6 border border-destructive/20">
            <span>The Problem</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Attendance breaks when{" "}
            <span className="text-destructive">trust breaks</span>.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Manual processes, fragmented tools, and lack of proof create gaps that cost time and credibility.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-12 grid gap-6 sm:grid-cols-3"
        >
          {painPoints.map((point, i) => (
            <motion.div
              key={i}
              variants={item}
              className="relative rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10 p-6 overflow-hidden group"
            >
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <point.icon className="w-4 h-4 text-destructive" />
              </div>
              <h3 className="font-semibold text-lg text-destructive">{point.title}</h3>
              <p className="mt-2 text-muted-foreground">{point.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Arrow transition */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="flex justify-center my-16"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/25">
            <ArrowRight className="w-6 h-6 text-white rotate-90" />
          </div>
        </motion.div>

        {/* Solution section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6 border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span>The Solution</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            One system.{" "}
            <span className="bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent">
              Every check-in method.
            </span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            A unified platform that adapts to your workflow, not the other way around.
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          variants={container}
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={item}
              className="group relative rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden"
            >
              {/* Gradient glow on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              <div className={`relative flex h-14 w-14 items-center justify-center rounded-xl ${feature.bgColor}`}>
                <feature.icon className={`h-7 w-7 bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`} style={{ color: feature.color.includes('violet') ? '#8b5cf6' : feature.color.includes('emerald') ? '#10b981' : feature.color.includes('blue') ? '#3b82f6' : '#f97316' }} />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-muted-foreground">{feature.description}</p>
              
              {/* Learn more link */}
              <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Learn more</span>
                <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24"
        >
          <div className="rounded-3xl border bg-gradient-to-br from-muted/50 to-muted/30 p-8 sm:p-12">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold sm:text-3xl">Everything you need to succeed</h3>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Built for organizations that take attendance seriously.
              </p>
            </div>
            
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold">{benefit.title}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
