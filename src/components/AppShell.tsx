import { Link, useRouterState } from "@tanstack/react-router";
import { Wallet, LayoutDashboard, Images, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
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
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-md border border-border/60 bg-secondary/40 px-3 py-1.5 text-sm sm:flex">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">₹{wallet.toLocaleString("en-IN")}</span>
              <span className="text-xs text-muted-foreground">wallet</span>
            </div>
            <Link to="/campaigns/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Create Campaign
              </Button>
            </Link>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-semibold">
                RK
              </div>
              <div className="hidden text-xs leading-tight lg:block">
                <div className="font-medium">{advertiser.name}</div>
                <div className="text-muted-foreground">Advertiser</div>
              </div>
            </div>
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
