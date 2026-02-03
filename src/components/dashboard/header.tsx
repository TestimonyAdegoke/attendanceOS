"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { LogOut, Moon, Sun, Bell, Search, Settings, HelpCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  user: User;
  currentOrg: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function DashboardHeader({ user, currentOrg }: DashboardHeaderProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const userInitials = user.email?.slice(0, 2).toUpperCase() || "U";
  const userName = user.email?.split("@")[0] || "User";

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left Section - Logo & Org */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-primary">
              <span className="text-sm font-bold text-white">A</span>
            </div>
            <span className="text-lg font-semibold tracking-tight hidden sm:block">
              AttendOS
            </span>
          </Link>

          {currentOrg && (
            <>
              <span className="text-border hidden md:block">/</span>
              <span className="text-sm font-medium text-muted-foreground hidden md:block truncate max-w-[150px]">
                {currentOrg.name}
              </span>
            </>
          )}
        </div>

        {/* Center Section - Search (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search people, sessions, locations..."
              className="input-field pl-10 h-9 text-sm"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1">
          {/* Mobile Search */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Help */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hidden sm:inline-flex"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <div className="w-px h-6 bg-border mx-2 hidden sm:block" />

          {currentOrg && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="hidden md:inline-flex gap-2 mr-1"
            >
              <Link href={`/${currentOrg.slug}/portal`}>
                <QrCode className="h-4 w-4" />
                My Badge
              </Link>
            </Button>
          )}

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium leading-tight truncate max-w-[100px]">
                {userName}
              </div>
              <div className="text-xs text-muted-foreground">Admin</div>
            </div>
            <button className="avatar avatar-sm bg-primary/10 text-primary ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
              <span className="avatar-initials text-xs font-semibold">{userInitials}</span>
            </button>
          </div>

          {/* Logout */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-9 w-9 text-muted-foreground hover:text-destructive ml-1"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
