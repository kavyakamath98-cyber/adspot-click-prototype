import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, MapPin, Monitor, Plus, TrendingUp } from "lucide-react";
import { AppShell, StatusBadge } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";
import { PINCODES } from "@/lib/mockData";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · AdSpot" },
      { name: "description", content: "Manage your local DOOH ad campaigns." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { campaigns, advertiser } = useApp();
  const live = campaigns.filter((c) => c.status === "live").length;
  const pending = campaigns.filter((c) => c.status === "pending_approval").length;
  const totalSpend = campaigns.reduce((s, c) => s + c.spendToDate, 0);

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

      <h2 className="mb-4 text-lg font-semibold">Your campaigns</h2>

      {campaigns.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {campaigns.map((c) => {
            const p = PINCODES[c.pincode];
            return (
              <Link key={c.id} to="/campaigns/$id" params={{ id: c.id }} className="group">
                <Card className="p-5 transition-all hover:border-primary/50 hover:shadow-md">
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
                    <Info icon={MapPin} label={`${p?.label ?? c.pincode} · ${c.radiusKm} km`} />
                    <Info icon={Monitor} label={`${c.screenIds.length} screens`} />
                    <Info icon={Calendar} label={`${fmt(c.startDate)} → ${fmt(c.endDate)}`} />
                    <Info
                      icon={TrendingUp}
                      label={`₹${c.spendToDate.toLocaleString("en-IN")} / ₹${c.totalBudget.toLocaleString("en-IN")}`}
                    />
                  </div>
                  {c.status === "rejected" && c.rejectionReason && (
                    <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
                      Reason: {c.rejectionReason}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
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

function EmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary">
        <Monitor className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">No campaigns yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Launch your first hyperlocal DOOH campaign in minutes.
        </p>
      </div>
      <Link to="/campaigns/new">
        <Button>Create your first campaign</Button>
      </Link>
    </Card>
  );
}
