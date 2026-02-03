"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  name: string;
  session_date: string;
  start_at: string;
  end_at: string;
  status: string;
  location_id: string | null;
  series_id: string | null;
  locations?: {
    name: string;
  } | null;
  session_series?: {
    name: string;
  } | null;
}

type ViewMode = "month" | "week" | "day" | "agenda";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CalendarPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Load sessions
  const loadSessions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (!org) {
      setLoading(false);
      return;
    }

    // Get sessions for current month view (with buffer)
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

    const { data: sessionsData } = await supabase
      .from("sessions")
      .select(`
        id,
        name,
        session_date,
        start_at,
        end_at,
        status,
        location_id,
        series_id,
        locations (name),
        session_series (name)
      `)
      .eq("org_id", (org as any).id)
      .gte("session_date", startOfMonth.toISOString().split("T")[0])
      .lte("session_date", endOfMonth.toISOString().split("T")[0])
      .order("session_date")
      .order("start_at");

    setSessions((sessionsData as Session[]) || []);
    setLoading(false);
  }, [orgSlug, currentDate]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Calendar grid helpers
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Get sessions for a specific date
  const getSessionsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return sessions.filter(s => s.session_date === dateStr);
  };

  // Navigation
  const goToPrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === "week") {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
    }
  };

  const goToNext = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === "week") {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format time
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Week view days
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  }, [currentDate]);

  // Agenda view - upcoming sessions
  const upcomingSessions = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return sessions
      .filter(s => s.session_date >= today)
      .slice(0, 20);
  }, [sessions]);

  const hasSessions = sessions.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Manage sessions and events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-primary to-cyan-500"
          >
            <a href={`/${orgSlug}/dashboard/sessions`}>
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </a>
          </Button>
        </div>
      </div>

      {!hasSessions && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold mb-1">No sessions scheduled yet</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Use the New Session button above to create your first event and start populating your calendar.
            </p>
            <Button asChild variant="outline">
              <a href={`/${orgSlug}/dashboard/sessions`}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first session
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Calendar Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-[200px] text-center">
            {viewMode === "month" && `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            {viewMode === "week" && `Week of ${weekDays[0].toLocaleDateString()}`}
            {viewMode === "day" && currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {viewMode === "agenda" && "Upcoming Events"}
          </h2>
          <Button variant="outline" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-1">
            {(["month", "week", "day", "agenda"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                  viewMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Month View */}
      {viewMode === "month" && (
        <Card>
          <CardContent className="p-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="p-3 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map(({ date, isCurrentMonth }, index) => {
                const daySessions = getSessionsForDate(date);
                const isSelected = selectedDate?.toDateString() === date.toDateString();

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "min-h-[100px] p-2 border-b border-r cursor-pointer transition-colors",
                      !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                      isSelected && "bg-primary/5 ring-2 ring-primary ring-inset",
                      isToday(date) && "bg-primary/10"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      isToday(date) && "text-primary"
                    )}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {daySessions.slice(0, 3).map((session) => (
                        <div
                          key={session.id}
                          className={cn(
                            "text-xs p-1 rounded truncate",
                            session.status === "active"
                              ? "bg-primary/20 text-primary"
                              : session.status === "completed"
                              ? "bg-muted text-muted-foreground"
                              : "bg-amber-500/20 text-amber-700"
                          )}
                        >
                          {session.series_id && <Repeat className="inline h-3 w-3 mr-1" />}
                          {session.name}
                        </div>
                      ))}
                      {daySessions.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{daySessions.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week View */}
      {viewMode === "week" && (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {weekDays.map((date, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 text-center border-r",
                    isToday(date) && "bg-primary/10"
                  )}
                >
                  <div className="text-sm text-muted-foreground">{DAYS[date.getDay()]}</div>
                  <div className={cn(
                    "text-lg font-semibold",
                    isToday(date) && "text-primary"
                  )}>
                    {date.getDate()}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[400px]">
              {weekDays.map((date, i) => {
                const daySessions = getSessionsForDate(date);
                return (
                  <div key={i} className="p-2 border-r space-y-2">
                    {daySessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-2 rounded-lg bg-primary/10 border border-primary/20"
                      >
                        <div className="font-medium text-sm truncate">{session.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(session.start_at)}
                        </div>
                        {session.locations && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.locations.name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day View */}
      {viewMode === "day" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getSessionsForDate(currentDate).length > 0 ? (
              <div className="space-y-4">
                {getSessionsForDate(currentDate).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-start gap-4 p-4 rounded-xl border hover:bg-muted/30 transition-colors"
                  >
                    <div className="p-3 rounded-lg bg-primary/10">
                      <CalendarIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{session.name}</h3>
                        {session.series_id && (
                          <Badge variant="outline" className="text-xs">
                            <Repeat className="h-3 w-3 mr-1" />
                            Series
                          </Badge>
                        )}
                        <Badge variant={
                          session.status === "active" ? "default" :
                          session.status === "completed" ? "secondary" : "outline"
                        }>
                          {session.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTime(session.start_at)} - {formatTime(session.end_at)}
                        </span>
                        {session.locations && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {session.locations.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No sessions scheduled for this day</p>
                <Button variant="link" asChild className="mt-2">
                  <a href={`/${orgSlug}/dashboard/sessions`}>Create a session</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agenda View */}
      {viewMode === "agenda" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Upcoming Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length > 0 ? (
              <div className="divide-y">
                {upcomingSessions.map((session) => {
                  const sessionDate = new Date(session.session_date);
                  return (
                    <div
                      key={session.id}
                      className="flex items-center gap-4 py-4 hover:bg-muted/30 transition-colors -mx-4 px-4"
                    >
                      <div className="text-center min-w-[60px]">
                        <div className="text-xs text-muted-foreground uppercase">
                          {sessionDate.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                        <div className="text-2xl font-bold">
                          {sessionDate.getDate()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sessionDate.toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{session.name}</h3>
                          {session.series_id && (
                            <Repeat className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(session.start_at)}
                          </span>
                          {session.locations && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.locations.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={
                        session.status === "active" ? "default" :
                        session.status === "completed" ? "secondary" : "outline"
                      }>
                        {session.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No upcoming sessions</p>
                <Button variant="link" asChild className="mt-2">
                  <a href={`/${orgSlug}/dashboard/sessions`}>Create a session</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Date Details */}
      {selectedDate && viewMode === "month" && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getSessionsForDate(selectedDate).length > 0 ? (
              <div className="space-y-3">
                {getSessionsForDate(selectedDate).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{session.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(session.start_at)} - {formatTime(session.end_at)}
                      </div>
                    </div>
                    <Badge variant="outline">{session.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No sessions scheduled
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
