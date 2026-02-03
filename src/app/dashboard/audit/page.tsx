"use client";

import { useState, useEffect } from "react";
import { Search, History, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Surface } from "@/components/attend/Surface";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
  profiles?: { full_name: string; email: string };
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from("org_memberships")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (membership) {
      const { data } = await supabase
        .from("audit_logs")
        .select("*, profiles:actor_user_id(full_name, email)")
        .eq("org_id", membership.org_id)
        .order("created_at", { ascending: false })
        .limit(100);

      setLogs((data as AuditLog[]) || []);
    }
    setLoading(false);
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      log.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getActionStyle = (action: string) => {
    if (action.includes("create") || action.includes("insert")) {
      return "text-success bg-success/10";
    }
    if (action.includes("update") || action.includes("modify")) {
      return "text-primary bg-primary/10";
    }
    if (action.includes("delete") || action.includes("remove")) {
      return "text-destructive bg-destructive/10";
    }
    return "text-muted-foreground bg-muted";
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-32 skeleton rounded-lg" />
            <div className="h-4 w-48 skeleton rounded" />
          </div>
        </div>
        <div className="h-12 skeleton rounded-lg" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 skeleton rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-subtitle">
          Complete history of all actions in your organization.
        </p>
      </div>

      {/* Search */}
      <Surface variant="default" padding="sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by action, entity, or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filteredLogs.length} entries
          </span>
        </div>
      </Surface>

      {/* Logs */}
      {filteredLogs.length === 0 ? (
        <Surface variant="elevated" padding="lg">
          <div className="empty-state">
            <History className="empty-state-icon" />
            <h3 className="empty-state-title">No audit logs found</h3>
            <p className="empty-state-description">
              {search ? "Try adjusting your search." : "Activity will appear here as actions are performed."}
            </p>
          </div>
        </Surface>
      ) : (
        <Surface variant="elevated" className="divide-y divide-border overflow-hidden">
          {filteredLogs.map((log) => (
            <details key={log.id} className="group">
              <summary className="flex items-start justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors list-none">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      getActionStyle(log.action)
                    )}>
                      {log.action}
                    </span>
                    <span className="text-muted-foreground text-sm">on</span>
                    <span className="font-medium text-sm">{log.entity_type}</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                      {log.entity_id.slice(0, 8)}...
                    </code>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    by {log.profiles?.full_name || log.profiles?.email || "System"}
                    {log.ip && <span className="ml-2">• IP: {log.ip}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </div>
              </summary>

              {(log.before || log.after) && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {log.before && (
                      <div>
                        <div className="font-medium text-muted-foreground mb-1">Before</div>
                        <pre className="bg-muted p-3 rounded-lg overflow-x-auto max-h-32 overflow-y-auto">
                          {JSON.stringify(log.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.after && (
                      <div>
                        <div className="font-medium text-muted-foreground mb-1">After</div>
                        <pre className="bg-muted p-3 rounded-lg overflow-x-auto max-h-32 overflow-y-auto">
                          {JSON.stringify(log.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </details>
          ))}
        </Surface>
      )}
    </div>
  );
}
