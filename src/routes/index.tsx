import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Images, MapPin, Monitor, Plus, Rocket, Search, Sparkles, Target, TrendingUp } from "lucide-react";
import { AppShell, StatusBadge } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/app-context";
import { PINCODES, type CampaignStatus } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Additv" },
      { name: "description", content: "Manage your local DOOH ad campaigns." },
    ],
  }),
  component: Dashboard,
});

const STATUS_FILTERS: { key: CampaignStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "pending_approval", label: "Pending" },
  { key: "approved_scheduled", label: "Scheduled" },
  { key: "paused", label: "Paused" },
  { key: "draft", label: "Draft" },
  { key: "rejected", label: "Rejected" },
  { key: "completed", label: "Completed" },
];

const PAGE = 8;

function Dashboard() {
  const { campaigns, advertiser } = useApp();
  const live = campaigns.filter((c) => c.status === "live").length;
  const pending = campaigns.filter((c) => c.status === "pending_approval").length;
  const totalSpend = campaigns.reduce((s, c) => s + c.spendToDate, 0);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<CampaignStatus | "all">("all");
  const [visible, setVisible] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (s && !c.name.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [campaigns, q, status]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  useEffect(() => setVisible(PAGE), [q, status]);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((v) => v + PAGE);
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, shown.length]);

  const isEmpty = campaigns.length === 0;

  if (isEmpty) {
    return (
      <AppShell>
        <div className="mb-8 rounded-2xl border border-border bg-gradient-to-br from-accent/60 via-secondary to-background p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium text-primary">Welcome 👋</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{advertiser.name}</h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            You haven't launched any ads yet. Let's put your business on a screen near you — no tech skills needed.
          </p>
        </div>

        <Card className="p-8 sm:p-10">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold">Launch your first campaign</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Three simple steps. We'll walk you through each one.
            </p>

            <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
              <HowStep n={1} icon={Target} title="Choose a location" desc="Pick your neighbourhood and radius." />
              <HowStep n={2} icon={Images} title="Add creative & screens" desc="Upload your ad and select nearby screens." />
              <HowStep n={3} icon={Rocket} title="Launch" desc="Set schedule and budget — you're live." />
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/campaigns/new">
                <Button size="lg" className="gap-2 px-6 py-6 text-base shadow-md">
                  <Plus className="h-5 w-5" /> Create your first campaign
                </Button>
              </Link>
              <Link to="/library" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Browse your content library
              </Link>
            </div>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8 rounded-2xl border border-border bg-gradient-to-br from-accent/60 via-secondary to-background p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Welcome back 👋</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{advertiser.name}</h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Put your business on nearby digital screens in just a few taps. No tech skills needed — we'll guide you step by step.
            </p>
          </div>
          <Link to="/campaigns/new">
            <Button size="lg" className="gap-2 px-6 py-6 text-base shadow-md">
              <Plus className="h-5 w-5" /> Start a New Ad
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Live campaigns" value={live} />
        <StatCard label="Pending review" value={pending} />
        <StatCard label="Total campaigns" value={campaigns.length} />
        <StatCard label="Lifetime spend" value={`₹${totalSpend.toLocaleString("en-IN")}`} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Your campaigns</h2>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search campaigns by name"
            className="pl-9"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.key;
          const count =
            f.key === "all"
              ? campaigns.length
              : campaigns.filter((c) => c.status === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-secondary/60",
              )}
            >
              {f.label} <span className="opacity-70">· {count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasQuery={q.length > 0 || status !== "all"} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {shown.map((c) => {
              const p = PINCODES[c.pincode];
              return (
                <Link
                  key={c.id}
                  to="/campaigns/$id"
                  params={{ id: c.id }}
                  className="group flex"
                >
                  <Card className="flex h-full w-full flex-col p-5 transition-all hover:border-primary/50 hover:shadow-md">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold group-hover:text-primary">{c.name}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Created {new Date(c.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Info icon={MapPin} label={`${c.locationLabel ?? p?.label ?? c.pincode} · ${c.radiusKm} km`} />
                      <Info icon={Monitor} label={`${c.screenIds.length} screens`} />
                      <Info icon={Calendar} label={`${fmt(c.startDate)} → ${fmt(c.endDate)}`} />
                      <Info
                        icon={TrendingUp}
                        label={`₹${c.spendToDate.toLocaleString("en-IN")} / ₹${c.totalBudget.toLocaleString("en-IN")}`}
                      />
                    </div>
                    {c.status === "rejected" && c.rejectionReason && (
                      <p className="mt-auto pt-3 text-xs text-red-700 dark:text-red-300">
                        <span className="rounded-md bg-red-50 px-3 py-2 dark:bg-red-500/10">
                          Reason: {c.rejectionReason}
                        </span>
                      </p>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>

          <div ref={sentinel} className="h-10" />
          {hasMore && (
            <p className="mt-4 text-center text-xs text-muted-foreground">Loading more…</p>
          )}
          {!hasMore && filtered.length > PAGE && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Showing all {filtered.length} campaigns
            </p>
          )}
        </>
      )}
    </AppShell>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

function Info({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary">
        <Monitor className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">
          {hasQuery ? "No campaigns match your filters" : "No campaigns yet"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasQuery ? "Try a different search or clear the filters." : "Launch your first hyperlocal DOOH campaign in minutes."}
        </p>
      </div>
      {!hasQuery && (
        <Link to="/campaigns/new">
          <Button>Create your first campaign</Button>
        </Link>
      )}
    </Card>
  );
}

function HowStep({ n, icon: Icon, title, desc }: { n: number; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-secondary/30 p-4 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-background text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step {n}</p>
      <p className="mt-1 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
