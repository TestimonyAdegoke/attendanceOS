"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Building2, Users, MapPin, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

interface Session {
  id: string;
  name: string;
  session_date: string;
  start_at: string;
  end_at: string;
  locations?: {
    name: string;
  } | null;
}

export default function OrgPortalPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.orgSlug as string;
  
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrganization();
  }, [slug]);

  const loadOrganization = async () => {
    const supabase = createClient();

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug, timezone")
      .eq("slug", slug)
      .single();

    if (orgError || !orgData) {
      setError("Organization not found");
      setLoading(false);
      return;
    }

    const typedOrg = orgData as Organization;
    setOrg(typedOrg);

    const now = new Date().toISOString();
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, name, session_date, start_at, end_at, locations(name)")
      .eq("org_id", typedOrg.id)
      .gte("end_at", now)
      .order("start_at")
      .limit(5);

    if (sessions) {
      setUpcomingSessions(sessions as Session[]);
    }

    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-violet-500/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-violet-500/5 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Organization Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The organization you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-violet-500/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold">
              {org.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-bold">{org.name}</h1>
              <p className="text-xs text-muted-foreground">Attendance Portal</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/${slug}/login`}>Sign In</Link>
            </Button>
            <Button asChild>
              <Link href={`/${slug}/signup`}>Join</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-6 shadow-lg shadow-primary/25">
              {org.name.charAt(0)}
            </div>
            <h1 className="text-4xl font-bold mb-4">
              Welcome to {org.name}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Track your attendance, view upcoming sessions, and stay connected with your organization.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href={`/${slug}/checkin`}>
                  <Users className="mr-2 h-5 w-5" />
                  Self Check-in
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href={`/${slug}/signup`}>
                  Join Organization
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Upcoming Sessions */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Upcoming Sessions
          </h2>
          
          {upcomingSessions.length > 0 ? (
            <div className="grid gap-4">
              {upcomingSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{session.name}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(session.session_date)}
                            </span>
                            <span>
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
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming sessions scheduled</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 mt-12">
        <div className="container mx-auto max-w-4xl text-center text-sm text-muted-foreground">
          <p>Powered by <Link href="/" className="text-primary hover:underline">Attend</Link></p>
        </div>
      </footer>
    </div>
  );
}
