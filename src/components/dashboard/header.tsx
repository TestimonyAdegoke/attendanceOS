"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { LogOut, Moon, Sun, Bell, Search, HelpCircle, QrCode, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardNav, getNavSections } from "@/components/dashboard/nav";

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

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const userInitials = user.email?.slice(0, 2).toUpperCase() || "U";
  const userName = user.email?.split("@")[0] || "User";

  const basePath = currentOrg?.slug ? `/${currentOrg.slug}/dashboard` : "/dashboard";
  const navSections = getNavSections(basePath);
  const allNavItems = navSections.flatMap((s) => s.items);
  const searchResults = searchQuery
    ? allNavItems.filter((i) => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : allNavItems;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left Section - Logo & Org */}
        <div className="flex items-center gap-4">
          {/* Mobile Nav */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

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
              onFocus={() => setSearchOpen(true)}
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
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Help */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hidden sm:inline-flex"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <div className="px-2 py-1.5 text-sm font-semibold">Notifications</div>
              <DropdownMenuItem className="text-muted-foreground">
                No notifications yet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

      {/* Mobile Nav Drawer */}
      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogContent
          className={cn(
            "left-0 top-0 translate-x-0 translate-y-0 h-screen w-[84vw] max-w-[320px] rounded-none p-0",
            "sm:rounded-none"
          )}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Navigation</DialogTitle>
            <DialogDescription>Dashboard navigation menu</DialogDescription>
          </DialogHeader>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="font-semibold">Menu</div>
              {currentOrg && <div className="text-sm text-muted-foreground truncate">{currentOrg.name}</div>}
            </div>
            <DashboardNav
              orgSlug={currentOrg?.slug}
              className="w-full border-r-0"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog
        open={searchOpen}
        onOpenChange={(open) => {
          setSearchOpen(open);
          if (!open) setSearchQuery("");
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>Type to filter navigation destinations (⌘K / Ctrl+K)</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Go to…"
              className="input-field h-10"
            />

            <div className="border border-border rounded-lg overflow-hidden">
              {searchResults.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No results</div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {searchResults.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm"
                      onClick={() => {
                        router.push(item.href);
                        setSearchOpen(false);
                      }}
                    >
                      {item.label}
                      <span className="ml-2 text-xs text-muted-foreground">{item.href}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Help</DialogTitle>
            <DialogDescription>Quick tips and shortcuts</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <div className="font-medium">Keyboard shortcuts</div>
              <div className="text-muted-foreground mt-1">Search: ⌘K / Ctrl+K</div>
            </div>
            {currentOrg && (
              <Button asChild variant="outline" className="w-full">
                <Link href={`/${currentOrg.slug}/portal`}>Open My Badge / Portal</Link>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
