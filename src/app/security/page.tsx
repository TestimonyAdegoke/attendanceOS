"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Eye, Users, FileText, Server } from "lucide-react";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const principles = [
  {
    icon: Lock,
    title: "Tenant Isolation",
    description: "Every organization's data is completely isolated using row-level security policies. Cross-tenant access is architecturally impossible.",
  },
  {
    icon: Shield,
    title: "Encryption at Rest & Transit",
    description: "All data is encrypted using AES-256 at rest and TLS 1.3 in transit. API keys are hashed before storage.",
  },
  {
    icon: Eye,
    title: "Immutable Audit Logs",
    description: "Every action is logged with actor, timestamp, before/after state, IP, and device. Logs cannot be modified or deleted.",
  },
  {
    icon: Users,
    title: "Role-Based Access Control",
    description: "Fine-grained permissions from Owner to Viewer. Location-scoped access for managers. Enforced at database level.",
  },
  {
    icon: FileText,
    title: "Data Minimization",
    description: "We collect only what's needed for attendance verification. Location data is used solely for geofence validation.",
  },
  {
    icon: Server,
    title: "Infrastructure Security",
    description: "Hosted on SOC 2 compliant infrastructure with automated backups, DDoS protection, and 99.9% uptime SLA.",
  },
];

const auditActions = [
  "Person created, updated, or archived",
  "Location and geofence changes",
  "Session created, modified, or cancelled",
  "Check-in recorded or manually adjusted",
  "Device registered or revoked",
  "User role or permission changes",
  "Data exports initiated",
  "Login attempts and sessions",
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen">
      <Header />
      
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Security you can verify
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Attend is built for organizations that need proof, not promises. 
              Every architectural decision prioritizes data isolation, auditability, and trust.
            </p>
          </motion.div>

          <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((principle, i) => (
              <motion.div
                key={principle.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border bg-card p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <principle.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold">{principle.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{principle.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold tracking-tight">
                Complete audit trail
              </h2>
              <p className="mt-4 text-muted-foreground">
                Every action in Attend creates an immutable audit record. 
                When questions arise, you have verifiable answers.
              </p>
              <ul className="mt-8 space-y-3">
                {auditActions.map((action) => (
                  <li key={action} className="flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {action}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-xl border bg-card p-6 shadow-lg"
            >
              <div className="text-sm font-medium text-muted-foreground mb-4">
                Sample Audit Log Entry
              </div>
              <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto">
{`{
  "id": "aud_8x7k2m",
  "timestamp": "2024-01-20T09:15:32Z",
  "actor": "user_abc123",
  "action": "attendance.manual_checkin",
  "entity_type": "attendance_record",
  "entity_id": "att_xyz789",
  "before": null,
  "after": {
    "person_id": "per_456",
    "session_id": "ses_789",
    "status": "present",
    "method": "manual"
  },
  "meta": {
    "reason": "Arrived without badge",
    "ip": "192.168.1.100",
    "user_agent": "Mozilla/5.0..."
  }
}`}
              </pre>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold tracking-tight">
              Need more details?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Request our security brief for detailed information about our infrastructure, 
              compliance posture, and data handling practices.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link href="/demo">Request security brief</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
