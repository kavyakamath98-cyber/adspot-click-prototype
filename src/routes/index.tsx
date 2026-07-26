import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  Images,
  LayoutGrid,
  Plus,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home · Additv" },
      { name: "description", content: "Your Additv home — launch and manage local DOOH ad campaigns." },
      { property: "og:title", content: "Home · Additv" },
      { property: "og:description", content: "Your Additv home — launch and manage local DOOH ad campaigns." },
    ],
  }),
  component: Home,
});

function Home() {
  const { campaigns, advertiser, wallet } = useApp();
  const live = campaigns.filter((c) => c.status === "live").length;
  const pending = campaigns.filter((c) => c.status === "pending_approval").length;
  const totalSpend = campaigns.reduce((s, c) => s + c.spendToDate, 0);
  const isEmpty = campaigns.length === 0;

  if (isEmpty) {
    return (
      <AppShell>
        <WelcomeBanner
          name={advertiser.name}
          subtitle="You haven't launched any ads yet. Let's put your business on a screen near you — no tech skills needed."
        />
        <Card className="p-8 sm:p-10">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold">Launch your first campaign</h2>
            <p className="mt-2 text-sm text-muted-foreground">Three simple steps. We'll walk you through each one.</p>
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
      <WelcomeBanner
        name={advertiser.name}
        subtitle="Put your business on nearby digital screens in just a few taps. Pick up where you left off below."
        cta
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Live campaigns" value={live} />
        <StatCard label="Pending review" value={pending} />
        <StatCard label="Total campaigns" value={campaigns.length} />
        <StatCard label="Lifetime spend" value={`₹${totalSpend.toLocaleString("en-IN")}`} />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Jump back in</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickTile
          to="/campaigns/new"
          icon={Plus}
          title="Create a campaign"
          desc="Start a new ad in a few taps."
          accent
        />
        <QuickTile
          to="/campaigns"
          icon={LayoutGrid}
          title="View campaigns"
          desc={`${campaigns.length} campaigns · ${live} live now`}
        />
        <QuickTile
          to="/reports/performance"
          icon={BarChart3}
          title="Campaign performance"
          desc="Impressions, spend and reach analytics."
        />
        <QuickTile
          to="/library"
          icon={Images}
          title="Content Library"
          desc="Manage your creatives and assets."
        />
        <QuickTile
          to="/payments/methods"
          icon={CreditCard}
          title="Payment methods"
          desc={`Wallet balance ₹${wallet.toLocaleString("en-IN")}`}
        />
        <QuickTile
          to="/payments/transactions"
          icon={TrendingUp}
          title="Transaction history"
          desc="Top-ups, spends and refunds."
        />
      </div>
    </AppShell>
  );
}

function WelcomeBanner({ name, subtitle, cta }: { name: string; subtitle: string; cta?: boolean }) {
  return (
    <div className="mb-8 rounded-2xl border border-border bg-gradient-to-br from-accent/60 via-secondary to-background p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Welcome back 👋</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {cta && (
          <Link to="/campaigns/new">
            <Button size="lg" className="gap-2 px-6 py-6 text-base shadow-md">
              <Plus className="h-5 w-5" /> Start a New Ad
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

function QuickTile({
  to,
  icon: Icon,
  title,
  desc,
  accent,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <Link to={to} className="group block">
      <Card
        className={
          "flex h-full items-start gap-4 p-5 transition-all hover:border-primary/50 hover:shadow-md " +
          (accent ? "border-primary/40 bg-primary/5" : "")
        }
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold group-hover:text-primary">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </Card>
    </Link>
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
