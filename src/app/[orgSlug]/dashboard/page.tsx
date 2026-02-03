"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Activity,
  Sparkles,
  Plus,
  QrCode,
  UserPlus,
  CalendarPlus,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface DashboardStats {
  totalPeople: number;
  totalSessions: number;
  totalLocations: number;
  recentCheckIns: number;
}

export default function OrgDashboardPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalPeople: 0,
    totalSessions: 0,
    totalLocations: 0,
    recentCheckIns: 0,
  });
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    loadDashboardData();
  }, [orgSlug]);

  const loadDashboardData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName((profile as { full_name: string }).full_name?.split(" ")[0] || "");
      }

      // Get org by slug
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", orgSlug)
        .single();

      if (org) {
        const orgId = (org as { id: string }).id;

        // Fetch stats
        const [peopleRes, sessionsRes, locationsRes] = await Promise.all([
          supabase.from("people").select("id", { count: "exact", head: true }).eq("org_id", orgId),
          supabase.from("sessions").select("id", { count: "exact", head: true }).eq("org_id", orgId),
          supabase.from("locations").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        ]);

        setStats({
          totalPeople: peopleRes.count || 0,
          totalSessions: sessionsRes.count || 0,
          totalLocations: locationsRes.count || 0,
          recentCheckIns: 0,
        });
      }
    }

    setLoading(false);
  };

  const basePath = `/${orgSlug}/dashboard`;

  const statCards = [
    {
      title: "Total People",
      value: stats.totalPeople,
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      href: `${basePath}/people`,
    },
    {
      title: "Sessions",
      value: stats.totalSessions,
      icon: Calendar,
      color: "from-cyan-500 to-teal-500",
      href: `${basePath}/sessions`,
    },
    {
      title: "Locations",
      value: stats.totalLocations,
      icon: MapPin,
      color: "from-rose-500 to-pink-500",
      href: `${basePath}/locations`,
    },
    {
      title: "Check-ins Today",
      value: stats.recentCheckIns,
      icon: CheckCircle2,
      color: "from-emerald-500 to-green-500",
      href: `${basePath}/attendance`,
    },
  ];

  const quickActions = [
    { label: "Add Person", icon: UserPlus, href: `${basePath}/people`, color: "bg-blue-500" },
    { label: "New Session", icon: CalendarPlus, href: `${basePath}/sessions`, color: "bg-cyan-500" },
    { label: "Quick Check-in", icon: QrCode, href: `/${orgSlug}/checkin`, color: "bg-emerald-500" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold"
          >
            {greeting}{userName ? `, ${userName}` : ""}! 👋
          </motion.h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your organization today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`${basePath}/reports`}>
              <TrendingUp className="mr-2 h-4 w-4" />
              View Reports
            </Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-primary to-cyan-500">
            <Link href={`${basePath}/sessions`}>
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={stat.href}>
              <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
                    <span>View details</span>
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <div className="flex items-center gap-3 p-4 rounded-xl border hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className={`p-2 rounded-lg ${action.color} text-white`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{action.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-sm text-muted-foreground mt-1">
              Activity will appear here as people check in
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
