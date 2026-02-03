"use client";

import { motion } from "framer-motion";
import { CalendarDays, Edit, X, RotateCcw } from "lucide-react";

const sessions = [
  { day: "Mon", date: "Jan 6", status: "completed" },
  { day: "Mon", date: "Jan 13", status: "completed" },
  { day: "Mon", date: "Jan 20", status: "active" },
  { day: "Mon", date: "Jan 27", status: "scheduled" },
  { day: "Mon", date: "Feb 3", status: "scheduled" },
  { day: "Mon", date: "Feb 10", status: "scheduled" },
];

export function RecurringSection() {
  return (
    <section className="py-24 sm:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Attendance that repeats itself—flawlessly.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Define your recurrence pattern once. Sessions auto-generate for weeks, months, or years ahead.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Edit className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">Edit single instance</h4>
                  <p className="text-sm text-muted-foreground">
                    Reschedule or modify one session without affecting the series.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">Edit all future</h4>
                  <p className="text-sm text-muted-foreground">
                    Update the series and regenerate upcoming sessions automatically.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <X className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">Cancel exceptions</h4>
                  <p className="text-sm text-muted-foreground">
                    Mark individual sessions as cancelled while keeping the series intact.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border bg-card p-6 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-6">
              <CalendarDays className="h-5 w-5 text-primary" />
              <span className="font-semibold">Weekly Team Standup</span>
              <span className="ml-auto text-xs text-muted-foreground">Every Monday, 9:00 AM</span>
            </div>
            <div className="space-y-2">
              {sessions.map((session, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-4 rounded-lg p-3 ${
                    session.status === "active"
                      ? "bg-primary/10 border border-primary/20"
                      : session.status === "completed"
                      ? "bg-muted/50"
                      : "bg-background border"
                  }`}
                >
                  <div className="text-center w-12">
                    <div className="text-xs text-muted-foreground">{session.day}</div>
                    <div className="font-medium">{session.date}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {session.status === "active" ? "Today" : "Session"}
                    </div>
                    <div className="text-xs text-muted-foreground">9:00 AM - 9:30 AM</div>
                  </div>
                  <div
                    className={`text-xs px-2 py-1 rounded-full ${
                      session.status === "completed"
                        ? "bg-muted text-muted-foreground"
                        : session.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    {session.status === "completed"
                      ? "Completed"
                      : session.status === "active"
                      ? "In Progress"
                      : "Scheduled"}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
