"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Download, Search, ClipboardCheck, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Surface } from "@/components/attend/Surface";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  checked_in_at: string;
  method: string;
  status: string;
  people?: { full_name: string; email: string };
  sessions?: { name: string; session_date: string };
}

export default function OrgAttendancePage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadRecords();
  }, [dateFilter, orgSlug]);

  const loadRecords = async () => {
    setLoading(true);
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
      setRecords([]);
      setLoading(false);
      return;
    }

    const orgId = (org as { id: string }).id;

    const { data } = await (supabase as any)
      .from("attendance_records")
      .select("*, people(full_name, email), sessions(name, session_date)")
      .eq("org_id", orgId)
      .gte("checked_in_at", `${dateFilter}T00:00:00`)
      .lte("checked_in_at", `${dateFilter}T23:59:59`)
      .order("checked_in_at", { ascending: false });

    setRecords((data as AttendanceRecord[]) || []);
    setLoading(false);
  };

  const filteredRecords = records.filter(
    (r) =>
      r.people?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.people?.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.sessions?.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const csv = [
      ["Name", "Email", "Session", "Check-in Time", "Method", "Status"],
      ...filteredRecords.map((r) => [
        r.people?.full_name || "",
        r.people?.email || "",
        r.sessions?.name || "",
        new Date(r.checked_in_at).toLocaleString(),
        r.method,
        r.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${dateFilter}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-32 skeleton rounded-lg" />
            <div className="h-4 w-48 skeleton rounded" />
          </div>
          <div className="h-10 w-32 skeleton rounded-lg" />
        </div>
        <div className="h-12 skeleton rounded-lg" />
        <div className="h-64 skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Attendance Records</h1>
          <p className="page-subtitle">View and export check-in records for this organization.</p>
        </div>
        <div className="page-actions">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Surface variant="default" padding="sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or session..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
            </div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-auto"
            />
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filteredRecords.length} records
          </span>
        </div>
      </Surface>

      {/* Records Table */}
      {filteredRecords.length === 0 ? (
        <Surface variant="elevated" padding="lg">
          <div className="empty-state">
            <ClipboardCheck className="empty-state-icon" />
            <h3 className="empty-state-title">No records found</h3>
            <p className="empty-state-description">
              {search ? "Try adjusting your search or date filter." : "No attendance records for this date."}
            </p>
          </div>
        </Surface>
      ) : (
        <Surface variant="elevated" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="table-cell table-header text-left">Person</th>
                  <th className="table-cell table-header text-left">Session</th>
                  <th className="table-cell table-header text-left">Time</th>
                  <th className="table-cell table-header text-left">Method</th>
                  <th className="table-cell table-header text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm bg-primary/10">
                          <span className="avatar-initials text-primary">
                            {record.people?.full_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2) || "?"}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{record.people?.full_name}</div>
                          <div className="text-sm text-muted-foreground">{record.people?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-muted-foreground">{record.sessions?.name || "—"}</td>
                    <td className="table-cell tabular-nums">
                      {new Date(record.checked_in_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="table-cell">
                      <span
                        className={cn(
                          "proof-chip",
                          record.method === "qr" && "proof-qr",
                          record.method === "geo" && "proof-geo",
                          record.method === "kiosk" && "proof-kiosk",
                          (!record.method || record.method === "manual") && "proof-manual"
                        )}
                      >
                        {record.method || "Manual"}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span
                        className={cn(
                          record.status === "present" && "status-present",
                          record.status === "late" && "status-late",
                          record.status === "absent" && "status-absent",
                          !["present", "late", "absent"].includes(record.status) && "badge badge-default"
                        )}
                      >
                        {record.status === "present" && <span className="status-dot status-dot-present" />}
                        {record.status === "late" && <span className="status-dot status-dot-late" />}
                        {record.status === "absent" && <span className="status-dot status-dot-absent" />}
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20 text-sm text-muted-foreground">
            Showing {filteredRecords.length} records for
            {" "}
            {new Date(dateFilter).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </Surface>
      )}
    </div>
  );
}
