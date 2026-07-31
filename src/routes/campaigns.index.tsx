import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, Calendar, MapPin, Monitor, Plus, Search, TrendingUp } from "lucide-react";
import { AppShell, StatusBadge } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useApp } from "@/lib/app-context";
import { PINCODES, type CampaignStatus } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/campaigns/")({
  head: () => ({
    meta: [
      { title: "Your Campaigns · Additv" },
      { name: "description", content: "Browse and manage all your DOOH ad campaigns." },
      { property: "og:title", content: "Your Campaigns · Additv" },
      { property: "og:description", content: "Browse and manage all your DOOH ad campaigns." },
    ],
  }),
  component: CampaignsList,
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

const SORT_OPTIONS = [
  { key: "created_desc", label: "Date created (new → old)" },
  { key: "created_asc", label: "Date created (old → new)" },
  { key: "modified_desc", label: "Date modified (new → old)" },
  { key: "modified_asc", label: "Date modified (old → new)" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["key"];

const time = (d?: string) => {
  const t = d ? new Date(d).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

/** Campaigns whose creative cleared review but still need payment get their own state. */
export function displayStatus(c: { status: string; awaitingPayment?: boolean; paymentUnlocked?: boolean }) {
  return c.awaitingPayment && c.paymentUnlocked && c.status === "pending_approval"
    ? "payment_pending"
    : c.status;
}

function CampaignsList() {
  const { campaigns } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<CampaignStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("created_desc");
  const [visible, setVisible] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = campaigns.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (s && !c.name.toLowerCase().includes(s)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      switch (sort) {
        case "created_asc":
          return time(a.createdAt) - time(b.createdAt);
        case "modified_desc":
          return time(b.updatedAt ?? b.createdAt) - time(a.updatedAt ?? a.createdAt);
        case "modified_asc":
          return time(a.updatedAt ?? a.createdAt) - time(b.updatedAt ?? b.createdAt);
        default:
          return time(b.createdAt) - time(a.createdAt);
      }
    });
  }, [campaigns, q, status, sort]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  useEffect(() => setVisible(PAGE), [q, status, sort]);


  useEffect(() => {
    if (!hasMore) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible((v) => v + PAGE);
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, shown.length]);

  return (
    <AppShell title="Your Campaigns">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-foreground">
          {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}
        </h2>
        <span className="text-sm text-muted-foreground">
          Search, filter and drill into any campaign.
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search campaigns by name"
              className="pl-9"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[230px]">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Link to="/campaigns/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Campaign
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.key;
          const count =
            f.key === "all" ? campaigns.length : campaigns.filter((c) => c.status === f.key).length;
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
        <Card className="flex flex-col items-center justify-center gap-4 p-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary">
            <Monitor className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {q || status !== "all" ? "No campaigns match your filters" : "No campaigns yet"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {q || status !== "all"
                ? "Try a different search or clear the filters."
                : "Launch your first hyperlocal DOOH campaign in minutes."}
            </p>
          </div>
          {!(q || status !== "all") && (
            <Link to="/campaigns/new">
              <Button>Create your first campaign</Button>
            </Link>
          )}
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {shown.map((c) => {
              const p = PINCODES[c.pincode];
              return (
                <Link key={c.id} to="/campaigns/$id" params={{ id: c.id }} className="group flex">
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
          {hasMore && <p className="mt-4 text-center text-xs text-muted-foreground">Loading more…</p>}
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

function Info({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}
