import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/lib/app-context";
import { SCREENS, type Campaign, type Creative, type Screen } from "@/lib/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/reports/performance")({
  head: () => ({
    meta: [
      { title: "Campaign Performance — Additv" },
      {
        name: "description",
        content:
          "Analytics for your DOOH campaigns: impressions, conversions, footfall, and spend across cities, screen types, and creatives.",
      },
      { property: "og:title", content: "Campaign Performance — Additv" },
      {
        property: "og:description",
        content: "Drill into impressions, conversions, footfall, and spend for your ads.",
      },
    ],
  }),
  component: PerformanceReport,
});

type Metric = "impressions" | "conversions" | "footfall" | "spend";
type Dimension =
  | "campaign"
  | "city"
  | "screenType"
  | "locationTag"
  | "dimension"
  | "creativeTag"
  | "creativeType";

const METRIC_LABEL: Record<Metric, string> = {
  impressions: "Impressions",
  conversions: "Conversions",
  footfall: "Footfall",
  spend: "Spend (₹)",
};

const DIM_LABEL: Record<Dimension, string> = {
  campaign: "Campaign",
  city: "City",
  screenType: "Screen type",
  locationTag: "Location type",
  dimension: "Screen dimension",
  creativeTag: "Creative tag",
  creativeType: "Creative type",
};

const COLORS = [
  "hsl(var(--primary))",
  "#3baa3b",
  "#60a5fa",
  "#f59e0b",
  "#ef4444",
  "#a78bfa",
  "#14b8a6",
  "#ec4899",
  "#84cc16",
  "#0ea5e9",
];

// Deterministic seeded PRNG so numbers are stable across renders.
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

function classifyDim(w: number, h: number) {
  if (w === h) return "Square";
  return w > h ? "Landscape (16:9)" : "Portrait (9:16)";
}

interface Fact {
  date: string;
  campaign: string;
  city: string;
  screenType: string;
  locationTag: string;
  dimension: string;
  creativeTag: string;
  creativeType: string;
  impressions: number;
  conversions: number;
  footfall: number;
  spend: number;
}

function buildFacts(campaigns: Campaign[], creatives: Creative[]): Fact[] {
  const facts: Fact[] = [];
  const screenById: Record<string, Screen> = Object.fromEntries(
    SCREENS.map((s) => [s.id, s]),
  );
  const creativeById: Record<string, Creative> = Object.fromEntries(
    creatives.map((c) => [c.id, c]),
  );
  const live = campaigns.filter(
    (c) => c.status === "live" || c.status === "paused" || c.status === "completed",
  );
  for (const c of live) {
    const creative = creativeById[c.creativeId];
    if (!creative) continue;
    const start = new Date(c.startDate);
    const today = new Date("2026-07-26");
    const days = Math.max(
      1,
      Math.min(30, Math.round((today.getTime() - start.getTime()) / 86400000) + 1),
    );
    for (const sid of c.screenIds) {
      const s = screenById[sid];
      if (!s) continue;
      const rand = seeded(`${c.id}:${sid}`);
      for (let d = 0; d < days; d++) {
        const day = new Date(start);
        day.setDate(day.getDate() + d);
        if (day > today) break;
        const base = 400 + Math.floor(rand() * 900);
        const impressions = base;
        const conversions = Math.floor(base * (0.008 + rand() * 0.02));
        const footfall = Math.floor(base * (0.05 + rand() * 0.12));
        const spend = Math.round(s.pricePerDay * (0.7 + rand() * 0.5));
        facts.push({
          date: day.toISOString().slice(0, 10),
          campaign: c.name,
          city: s.city,
          screenType: s.venueType,
          locationTag: s.locationTag,
          dimension: classifyDim(s.width, s.height),
          creativeTag: creative.industry ?? "Other",
          creativeType: creative.type === "video" ? "Video" : "Image",
          impressions,
          conversions,
          footfall,
          spend,
        });
      }
    }
  }
  return facts;
}

function aggregate(facts: Fact[], dim: Dimension, metric: Metric) {
  const map = new Map<string, number>();
  for (const f of facts) {
    const key = f[dim];
    map.set(key, (map.get(key) ?? 0) + f[metric]);
  }
  return Array.from(map, ([name, value]) => ({ name, value })).sort(
    (a, b) => b.value - a.value,
  );
}

function timeSeries(facts: Fact[], metric: Metric) {
  const map = new Map<string, number>();
  for (const f of facts) map.set(f.date, (map.get(f.date) ?? 0) + f[metric]);
  return Array.from(map, ([date, value]) => ({ date, value })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function fmt(n: number, metric: Metric) {
  if (metric === "spend") return `₹${n.toLocaleString("en-IN")}`;
  return n.toLocaleString("en-IN");
}

function PerformanceReport() {
  const { campaigns, creatives } = useApp();
  const [metric, setMetric] = useState<Metric>("impressions");
  const [dim, setDim] = useState<Dimension>("campaign");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");

  const allFacts = useMemo(() => buildFacts(campaigns, creatives), [campaigns, creatives]);
  const facts = useMemo(
    () => (campaignFilter === "all" ? allFacts : allFacts.filter((f) => f.campaign === campaignFilter)),
    [allFacts, campaignFilter],
  );

  const kpis = useMemo(() => {
    const sum = (k: Metric) => facts.reduce((a, f) => a + f[k], 0);
    return {
      impressions: sum("impressions"),
      conversions: sum("conversions"),
      footfall: sum("footfall"),
      spend: sum("spend"),
    };
  }, [facts]);

  const series = useMemo(() => timeSeries(facts, metric), [facts, metric]);
  const grouped = useMemo(() => aggregate(facts, dim, metric), [facts, dim, metric]);
  const spendByCity = useMemo(() => aggregate(facts, "city", "spend"), [facts]);
  const spendByScreenType = useMemo(
    () => aggregate(facts, "screenType", "spend"),
    [facts],
  );
  const impByCreativeType = useMemo(
    () => aggregate(facts, "creativeType", "impressions"),
    [facts],
  );
  const impByLocationTag = useMemo(
    () => aggregate(facts, "locationTag", "impressions"),
    [facts],
  );

  const liveCampaigns = campaigns.filter((c) =>
    ["live", "paused", "completed"].includes(c.status),
  );

  if (allFacts.length === 0) {
    return (
      <AppShell title="Campaign Performance">
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No performance data yet. Launch a campaign to start seeing analytics here.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Campaign Performance">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-foreground">Analytics overview</h2>
        <span className="text-sm text-muted-foreground">
          Impressions, conversions, footfall and spend across your ads.
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {liveCampaigns.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Impressions" value={kpis.impressions.toLocaleString("en-IN")} />
        <KpiCard label="Conversions" value={kpis.conversions.toLocaleString("en-IN")} />
        <KpiCard label="Footfall" value={kpis.footfall.toLocaleString("en-IN")} />
        <KpiCard label="Spend" value={`₹${kpis.spend.toLocaleString("en-IN")}`} />
      </div>

      {/* Main chart */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">
            {METRIC_LABEL[metric]} over time
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {METRIC_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => fmt(v, metric)} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3baa3b"
                  strokeWidth={2}
                  dot={false}
                  name={METRIC_LABEL[metric]}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Group-by breakdown */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">
            {METRIC_LABEL[metric]} by {DIM_LABEL[dim].toLowerCase()}
          </CardTitle>
          <Select value={dim} onValueChange={(v) => setDim(v as Dimension)}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DIM_LABEL) as Dimension[]).map((d) => (
                <SelectItem key={d} value={d}>
                  {DIM_LABEL[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grouped} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis type="number" fontSize={11} />
                <YAxis dataKey="name" type="category" width={150} fontSize={11} />
                <Tooltip formatter={(v: number) => fmt(v, metric)} />
                <Bar dataKey="value" name={METRIC_LABEL[metric]}>
                  {grouped.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Split cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <SplitPie title="Spend by city" data={spendByCity} format={(v) => `₹${v.toLocaleString("en-IN")}`} />
        <SplitPie title="Spend by screen type" data={spendByScreenType} format={(v) => `₹${v.toLocaleString("en-IN")}`} />
        <SplitPie
          title="Impressions by creative type"
          data={impByCreativeType}
          format={(v) => v.toLocaleString("en-IN")}
        />
        <SplitPie
          title="Impressions by location type"
          data={impByLocationTag}
          format={(v) => v.toLocaleString("en-IN")}
        />
      </div>
    </AppShell>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function SplitPie({
  title,
  data,
  format,
}: {
  title: string;
  data: { name: string; value: number }[];
  format: (v: number) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                innerRadius={45}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => format(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
