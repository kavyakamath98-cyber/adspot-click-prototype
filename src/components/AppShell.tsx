import { Link, useRouterState } from "@tanstack/react-router";
import { Wallet, LayoutDashboard, Images, Plus, Menu, LogOut, User, PlayCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const { wallet, advertiser } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/library", label: "Content Library", icon: Images, exact: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <span className="text-sm font-bold">A</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">AdSpot</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {nav.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-md border border-border/60 bg-secondary/40 px-3 py-1.5 text-sm sm:flex">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">₹{wallet.toLocaleString("en-IN")}</span>
              <span className="text-xs text-muted-foreground">wallet</span>
            </div>
            <Link to="/campaigns/new" className="hidden sm:block">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Create Campaign
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-semibold">
                      RK
                    </div>
                    <div className="text-xs leading-tight">
                      <div className="font-semibold">{advertiser.name}</div>
                      <div className="text-muted-foreground">{advertiser.email}</div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/library" className="flex items-center gap-2">
                    <Images className="h-4 w-4" /> Content Library
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/campaigns/new" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Create Campaign
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    toast.info("Sign out is disabled in this prototype. You are always signed in as Ramesh's Kitchen.")
                  }
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    pending_approval: { label: "Pending Approval", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
    live: { label: "Live", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
    approved_scheduled: { label: "Approved — Scheduled", cls: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300" },
    paused: { label: "Paused", cls: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300" },
    rejected: { label: "Rejected", cls: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300" },
    completed: { label: "Completed", cls: "bg-muted text-muted-foreground" },
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
    pending: { label: "In Review", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  };
  const info = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", info.cls)}>
      {info.label}
    </span>
  );
}

/** Overlay a play icon on video thumbnails to distinguish from static images at a glance. */
export function VideoPlayOverlay({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 grid place-items-center", className)}>
      <div className="grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm">
        <PlayCircle className="h-7 w-7" />
      </div>
    </div>
  );
}

export function InUseBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> In Use
    </span>
  );
}

export function LocationTagBadge({ tag }: { tag: string }) {
  const map: Record<string, string> = {
    Residential: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    Clinic: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    Mall: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
    Cafeteria: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    Township: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    Other: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        map[tag] ?? map.Other,
      )}
    >
      {tag}
    </span>
  );
}
