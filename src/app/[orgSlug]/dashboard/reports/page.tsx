"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Download, BarChart3, TrendingUp, Users, Calendar, PieChart, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Surface } from "@/components/attend/Surface";
import { cn } from "@/lib/utils";

export default function OrgReportsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [stats, setStats] = useState({
    totalPeople: 0,
    totalSessions: 0,
    totalCheckins: 0,
    avgAttendance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [orgSlug]);

  const loadStats = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Resolve org by slug
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (orgError || !org) {
      setLoading(false);
      return;
    }

    const orgId = (org as { id: string }).id;

    const [people, sessions, checkins] = await Promise.all([
      supabase.from("people").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    ]);

    const totalPeople = people.count || 0;
    const totalSessions = sessions.count || 0;
    const totalCheckins = checkins.count || 0;
    const avgAttendance = totalSessions > 0 ? Math.round(totalCheckins / totalSessions) : 0;

    setStats({ totalPeople, totalSessions, totalCheckins, avgAttendance });
    setLoading(false);
  };

  const reports = [
    {
      title: "Attendance Overview",
      description: "Summary of attendance across all sessions with trends and patterns.",
      icon: BarChart3,
    },
    {
      title: "People Report",
      description: "Individual attendance history and statistics for each person.",
      icon: Users,
    },
    {
      title: "Session Report",
      description: "Detailed breakdown of attendance for each session.",
      icon: Calendar,
    },
    {
      title: "Trend Analysis",
      description: "Attendance trends and predictions over time.",
      icon: TrendingUp,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-32 skeleton rounded-lg" />
            <div className="h-4 w-48 skeleton rounded" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">View and export attendance analytics and reports for this organization.</p>
        </div>
        <div className="page-actions">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Summary
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total People", value: stats.totalPeople, icon: Users, color: "text-primary" },
          { label: "Total Sessions", value: stats.totalSessions, icon: Calendar, color: "text-accent" },
          { label: "Total Check-ins", value: stats.totalCheckins, icon: PieChart, color: "text-success" },
          { label: "Avg. per Session", value: stats.avgAttendance, icon: TrendingUp, color: "text-warning" },
        ].map((stat, idx) => (
          <Surface key={idx} variant="elevated" padding="md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <div className="text-3xl font-bold tabular-nums">{stat.value}</div>
          </Surface>
        ))}
      </div>

      {/* Report Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Surface key={report.title} variant="interactive" padding="lg" className="group">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <report.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{report.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileText className="h-4 w-4" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
