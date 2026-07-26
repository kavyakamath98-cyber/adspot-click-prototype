import { Wallet, PlayCircle, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

type BackProp = { to: string; label?: string };

export function AppShell({
  children,
  title,
  back,
}: {
  children: ReactNode;
  title?: string;
  back?: BackProp;
}) {
  const { wallet, advertiser } = useApp();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
            <div className="flex items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
              <SidebarTrigger />
              {back && (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title={back.label ?? "Back"}
                  aria-label={back.label ?? "Back"}
                >
                  <Link to={back.to}>
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              {title && (
                <h1 className="min-w-0 truncate text-base font-semibold sm:text-lg">
                  {title}
                </h1>
              )}
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 rounded-md border border-border/60 bg-secondary/40 px-3 py-1.5 text-sm">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">₹{wallet.toLocaleString("en-IN")}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">wallet</span>
                </div>
                <div
                  className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-xs font-semibold"
                  title={`${advertiser.name} · ${advertiser.email}`}
                  aria-label={advertiser.name}
                >
                  RK
                </div>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
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

/** Colored variant (used in the campaign detail sidebar for a quick scan of a small list). */
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

/** Neutral text-only variant — scales to many categories (15+ types) without a color explosion. */
export function LocationTagPill({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {tag}
    </span>
  );
}
