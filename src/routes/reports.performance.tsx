import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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
import { X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

/** Reporting day-parts (independent of the booking slots used at scheduling time). */
const SLOTS = [
  { id: "early", label: "Early Morning", range: "00:00–06:00", weight: 0.06 },
  { id: "morning", label: "Morning", range: "06:00–12:00", weight: 0.22 },
  { id: "afternoon", label: "Afternoon", range: "12:00–16:00", weight: 0.18 },
  { id: "evening", label: "Evening", range: "16:00–19:00", weight: 0.2 },
  { id: "prime", label: "Prime Time", range: "19:00–23:00", weight: 0.28 },
  { id: "late", label: "Late Night", range: "23:00–00:00", weight: 0.06 },
] as const;
type SlotId = (typeof SLOTS)[number]["id"];
const SLOT_IDS = SLOTS.map((s) => s.id) as SlotId[];
const SLOT_LABEL: Record<string, string> = Object.fromEntries(
  SLOTS.map((s) => [s.id, s.label]),
);

// Report weeks start Monday.
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DOW_SHORT: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};
const DOW_LONG: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

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
  dow: number;
  slot: SlotId;
  campaign: string;
  creative: string;
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
  spots: number;
  completedSpots: number;
  capacitySpots: number;
  reach: number;
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
        const date = day.toISOString().slice(0, 10);
        const dow = day.getDay();

        // Deterministically split the day's totals across the six day-parts so
        // the existing day-level numbers stay exactly the same.
        const srand = seeded(`${c.id}:${sid}:${date}`);
        const weights = SLOTS.map((sl) => sl.weight * (0.7 + srand() * 0.6));
        const wsum = weights.reduce((a, b) => a + b, 0);
        let usedImp = 0,
          usedConv = 0,
          usedFoot = 0,
          usedSpend = 0;
        SLOTS.forEach((sl, i) => {
          const last = i === SLOTS.length - 1;
          const share = weights[i] / wsum;
          const imp = last ? impressions - usedImp : Math.round(impressions * share);
          const conv = last ? conversions - usedConv : Math.round(conversions * share);
          const foot = last ? footfall - usedFoot : Math.round(footfall * share);
          const sp = last ? spend - usedSpend : Math.round(spend * share);
          usedImp += imp;
          usedConv += conv;
          usedFoot += foot;
          usedSpend += sp;
          const spots = Math.max(1, Math.round(imp / 8));
          const completion = 0.82 + srand() * 0.16;
          const fill = 0.55 + srand() * 0.4;
          const freq = 1.8 + srand() * 1.7;
          facts.push({
            date,
            dow,
            slot: sl.id,
            campaign: c.name,
            creative: creative.name,
            city: s.city,
            screenType: s.venueType,
            locationTag: s.locationTag,
            dimension: classifyDim(s.width, s.height),
            creativeTag: creative.industry ?? "Other",
            creativeType: creative.type === "video" ? "Video" : "Image",
            impressions: Math.max(0, imp),
            conversions: Math.max(0, conv),
            footfall: Math.max(0, foot),
            spend: Math.max(0, sp),
            spots,
            completedSpots: Math.round(spots * completion),
            capacitySpots: Math.max(spots, Math.round(spots / fill)),
            reach: Math.round(Math.max(0, imp) / freq),
          });
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

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const num = (n: number) => Math.round(n).toLocaleString("en-IN");

function totals(facts: Fact[]) {
  const t = {
    impressions: 0,
    spend: 0,
    reach: 0,
    spots: 0,
    completedSpots: 0,
    capacitySpots: 0,
  };
  for (const f of facts) {
    t.impressions += f.impressions;
    t.spend += f.spend;
    t.reach += f.reach;
    t.spots += f.spots;
    t.completedSpots += f.completedSpots;
    t.capacitySpots += f.capacitySpots;
  }
  return {
    ...t,
    cpm: t.impressions ? (t.spend / t.impressions) * 1000 : 0,
    frequency: t.reach ? t.impressions / t.reach : 0,
    completionRate: t.spots ? (t.completedSpots / t.spots) * 100 : 0,
    fillRate: t.capacitySpots ? (t.spots / t.capacitySpots) * 100 : 0,
  };
}

function listPhrase(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function PerformanceReport() {
  const { campaigns, creatives } = useApp();
  const [metric, setMetric] = useState<Metric>("impressions");
  const [dim, setDim] = useState<Dimension>("campaign");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [selDays, setSelDays] = useState<number[]>([]);
  const [selSlots, setSelSlots] = useState<SlotId[]>([]);

  const allFacts = useMemo(() => buildFacts(campaigns, creatives), [campaigns, creatives]);
  const dateFacts = useMemo(
    () =>
      campaignFilter === "all"
        ? allFacts
        : allFacts.filter((f) => f.campaign === campaignFilter),
    [allFacts, campaignFilter],
  );
  const facts = useMemo(
    () =>
      dateFacts.filter(
        (f) =>
          (selDays.length === 0 || selDays.includes(f.dow)) &&
          (selSlots.length === 0 || selSlots.includes(f.slot)),
      ),
    [dateFacts, selDays, selSlots],
  );

  const toggleDay = useCallback(
    (d: number) =>
      setSelDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d])),
    [],
  );
  const toggleSlot = useCallback(
    (s: SlotId) =>
      setSelSlots((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s])),
    [],
  );
  const clearAll = useCallback(() => {
    setSelDays([]);
    setSelSlots([]);
  }, []);

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

  // --- extended analytics -------------------------------------------------
  const byDow = useMemo(() => {
    const map = new Map<number, number>(DOW_ORDER.map((d) => [d, 0]));
    for (const f of facts) map.set(f.dow, (map.get(f.dow) ?? 0) + f.impressions);
    return DOW_ORDER.map((d) => ({
      dow: d,
      name: DOW_SHORT[d],
      value: map.get(d) ?? 0,
    }));
  }, [facts]);

  const bySlot = useMemo(() => {
    const map = new Map<string, number>(SLOT_IDS.map((s) => [s, 0]));
    for (const f of facts) map.set(f.slot, (map.get(f.slot) ?? 0) + f.impressions);
    return SLOTS.map((s) => ({ id: s.id, name: s.label, value: map.get(s.id) ?? 0 }));
  }, [facts]);

  // Heatmap always shows the full grid from the date-filtered set so users can
  // see (and re-select) cells outside the current day/slot selection.
  const heat = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of dateFacts) {
      const k = `${f.dow}|${f.slot}`;
      map.set(k, (map.get(k) ?? 0) + f.impressions);
    }
    let max = 0;
    for (const v of map.values()) max = Math.max(max, v);
    return { map, max };
  }, [dateFacts]);

  const period = useMemo(() => {
    const dates = Array.from(new Set(facts.map((f) => f.date))).sort();
    if (dates.length === 0) return null;
    const half = Math.ceil(dates.length / 2);
    const currentDates = new Set(dates.slice(-half));
    const prevDates = new Set(dates.slice(0, dates.length - half));
    return {
      current: totals(facts.filter((f) => currentDates.has(f.date))),
      previous: totals(facts.filter((f) => prevDates.has(f.date))),
      hasPrev: prevDates.size > 0,
    };
  }, [facts]);

  const agg = useMemo(() => totals(facts), [facts]);

  const trend = useMemo(() => {
    const map = new Map<string, { date: string; impressions: number; spend: number }>();
    for (const f of facts) {
      const row = map.get(f.date) ?? { date: f.date, impressions: 0, spend: 0 };
      row.impressions += f.impressions;
      row.spend += f.spend;
      map.set(f.date, row);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [facts]);

  const byCreative = useMemo(() => {
    const map = new Map<string, Fact[]>();
    for (const f of facts) {
      const arr = map.get(f.creative) ?? [];
      arr.push(f);
      map.set(f.creative, arr);
    }
    return Array.from(map, ([name, rows]) => ({ name, ...totals(rows) })).sort(
      (a, b) => b.impressions - a.impressions,
    );
  }, [facts]);

  const byScreenType = useMemo(() => {
    const map = new Map<string, Fact[]>();
    for (const f of facts) {
      const arr = map.get(f.screenType) ?? [];
      arr.push(f);
      map.set(f.screenType, arr);
    }
    return Array.from(map, ([name, rows]) => ({ name, ...totals(rows) })).sort(
      (a, b) => b.impressions - a.impressions,
    );
  }, [facts]);

  const insights = useMemo(() => {
    if (facts.length === 0) return [];
    const out: string[] = [];
    const cellMap = new Map<string, number>();
    for (const f of facts) {
      const k = `${f.dow}|${f.slot}`;
      cellMap.set(k, (cellMap.get(k) ?? 0) + f.impressions);
    }
    const bestCell = Array.from(cellMap).sort((a, b) => b[1] - a[1])[0];
    if (bestCell) {
      const [d, s] = bestCell[0].split("|");
      out.push(
        `Best performing combination: ${DOW_LONG[Number(d)]} ${SLOT_LABEL[s]} with ${num(
          bestCell[1],
        )} impressions.`,
      );
    }
    const eff = byCreative.filter((c) => c.impressions > 0).sort((a, b) => a.cpm - b.cpm)[0];
    if (eff)
      out.push(
        `Most efficient creative: "${eff.name}" at ${inr(eff.cpm)} CPM and ${eff.completionRate.toFixed(
          0,
        )}% completion.`,
      );
    const slotRank = bySlot.filter((s) => s.value > 0).sort((a, b) => a.value - b.value)[0];
    if (slotRank)
      out.push(
        `Weakest day-part: ${slotRank.name} contributes only ${num(slotRank.value)} impressions — consider shifting budget.`,
      );
    return out;
  }, [facts, byCreative, bySlot]);

  const exportCsv = useCallback(() => {
    const cols: (keyof Fact)[] = [
      "date",
      "campaign",
      "creative",
      "city",
      "screenType",
      "locationTag",
      "dimension",
      "creativeTag",
      "creativeType",
      "impressions",
      "conversions",
      "footfall",
      "spend",
      "spots",
      "completedSpots",
      "capacitySpots",
      "reach",
    ];
    const head = ["day", "slot", ...cols].join(",");
    const rows = facts.map((f) =>
      [
        DOW_LONG[f.dow],
        SLOT_LABEL[f.slot],
        ...cols.map((c) => {
          const v = String(f[c] ?? "");
          return v.includes(",") ? `"${v}"` : v;
        }),
      ].join(","),
    );
    const blob = new Blob([[head, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campaign-performance.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [facts]);

  // drag selection on the heatmap
  const dragRef = useRef<{ dow: number; slot: SlotId } | null>(null);
  const [dragTo, setDragTo] = useState<{ dow: number; slot: SlotId } | null>(null);
  const [dragging, setDragging] = useState(false);

  const rectFor = (
    a: { dow: number; slot: SlotId },
    b: { dow: number; slot: SlotId },
  ) => {
    const di = [DOW_ORDER.indexOf(a.dow), DOW_ORDER.indexOf(b.dow)].sort((x, y) => x - y);
    const si = [SLOT_IDS.indexOf(a.slot), SLOT_IDS.indexOf(b.slot)].sort((x, y) => x - y);
    return {
      days: DOW_ORDER.slice(di[0], di[1] + 1),
      slots: SLOT_IDS.slice(si[0], si[1] + 1),
    };
  };

  useEffect(() => {
    if (!dragging) return;
    const up = () => {
      const from = dragRef.current;
      if (from && dragTo && (from.dow !== dragTo.dow || from.slot !== dragTo.slot)) {
        const r = rectFor(from, dragTo);
        setSelDays(r.days);
        setSelSlots(r.slots);
      } else if (from) {
        toggleDay(from.dow);
        toggleSlot(from.slot);
      }
      dragRef.current = null;
      setDragTo(null);
      setDragging(false);
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [dragging, dragTo, toggleDay, toggleSlot]);

  const inDragRect = (d: number, s: SlotId) => {
    if (!dragging || !dragRef.current || !dragTo) return false;
    const r = rectFor(dragRef.current, dragTo);
    return r.days.includes(d) && r.slots.includes(s);
  };

  const hasSelection = selDays.length > 0 || selSlots.length > 0;
  const sentence = hasSelection
    ? `Showing ${listPhrase(
        selDays.length ? selDays.slice().sort((a, b) => DOW_ORDER.indexOf(a) - DOW_ORDER.indexOf(b)).map((d) => DOW_LONG[d]) : ["all days"],
      )}, ${listPhrase(
        selSlots.length
          ? SLOT_IDS.filter((s) => selSlots.includes(s)).map((s) => SLOT_LABEL[s])
          : ["all day-parts"],
      )}`
    : "Showing all days and all day-parts";

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

  const empty = facts.length === 0;

  return (
    <AppShell title="Campaign Performance">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-foreground">Analytics overview</h2>
        <span className="text-sm text-muted-foreground">
          Impressions, conversions, footfall and spend across your ads.
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={empty}>
            Export CSV
          </Button>
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

      {/* Sticky day / day-part filter bar */}
      <div className="sticky top-0 z-20 -mx-1 mb-6 rounded-lg border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Filters
          </span>
          {selDays.length > 0 && (
            <Chip
              label={selDays
                .slice()
                .sort((a, b) => DOW_ORDER.indexOf(a) - DOW_ORDER.indexOf(b))
                .map((d) => DOW_SHORT[d])
                .join(", ")}
              onRemove={() => setSelDays([])}
            />
          )}
          {selSlots.length > 0 && (
            <Chip
              label={SLOT_IDS.filter((s) => selSlots.includes(s))
                .map((s) => SLOT_LABEL[s])
                .join(", ")}
              onRemove={() => setSelSlots([])}
            />
          )}
          {!hasSelection && (
            <span className="text-sm text-muted-foreground">
              No day or day-part filter applied
            </span>
          )}
          {hasSelection && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear all
            </Button>
          )}
        </div>
        <p className="mt-1 text-sm text-foreground">{sentence}</p>
      </div>

      {empty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No data for this combination of days and day-parts.
            </p>
            <Button onClick={clearAll}>Clear filters</Button>
          </CardContent>
        </Card>
      ) : (
        <>
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
              <CardTitle className="text-base">{METRIC_LABEL[metric]} over time</CardTitle>
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
            <SplitPie
              title="Spend by city"
              data={spendByCity}
              format={(v) => `₹${v.toLocaleString("en-IN")}`}
            />
            <SplitPie
              title="Spend by screen type"
              data={spendByScreenType}
              format={(v) => `₹${v.toLocaleString("en-IN")}`}
            />
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

          {/* ---------- Added: delivery KPIs ---------- */}
          <h3 className="mb-3 mt-8 text-lg font-semibold">Delivery &amp; efficiency</h3>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <DeltaKpi
              label="Impressions"
              value={num(agg.impressions)}
              delta={pct(period?.current.impressions, period?.previous.impressions, period?.hasPrev)}
            />
            <DeltaKpi
              label="Spend"
              value={inr(agg.spend)}
              delta={pct(period?.current.spend, period?.previous.spend, period?.hasPrev)}
              invert
            />
            <DeltaKpi
              label="CPM"
              value={inr(agg.cpm)}
              delta={pct(period?.current.cpm, period?.previous.cpm, period?.hasPrev)}
              invert
            />
            <DeltaKpi
              label="Estimated reach"
              value={num(agg.reach)}
              delta={pct(period?.current.reach, period?.previous.reach, period?.hasPrev)}
            />
            <DeltaKpi
              label="Average frequency"
              value={agg.frequency.toFixed(2)}
              delta={pct(period?.current.frequency, period?.previous.frequency, period?.hasPrev)}
            />
            <DeltaKpi
              label="Spots aired"
              value={num(agg.spots)}
              delta={pct(period?.current.spots, period?.previous.spots, period?.hasPrev)}
            />
            <DeltaKpi
              label="Completion rate"
              value={`${agg.completionRate.toFixed(1)}%`}
              delta={pct(
                period?.current.completionRate,
                period?.previous.completionRate,
                period?.hasPrev,
              )}
            />
            <DeltaKpi
              label="Fill rate"
              value={`${agg.fillRate.toFixed(1)}%`}
              delta={pct(period?.current.fillRate, period?.previous.fillRate, period?.hasPrev)}
            />
          </div>

          {/* Impressions + spend trend */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Impressions and spend over time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis yAxisId="left" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" fontSize={11} />
                    <Tooltip
                      formatter={(v: number, n: string) =>
                        n === "Spend" ? inr(v) : num(v)
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="right" dataKey="spend" name="Spend" fill="#60a5fa" />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="impressions"
                      name="Impressions"
                      stroke="#3baa3b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Day of week / slot of day */}
          <div className="mb-6 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Impressions by day of week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={byDow}
                      onClick={(e) => {
                        const p = e?.activePayload?.[0]?.payload as
                          | { dow: number }
                          | undefined;
                        if (p) toggleDay(p.dow);
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip formatter={(v: number) => num(v)} />
                      <Bar dataKey="value" name="Impressions" cursor="pointer">
                        {byDow.map((d) => (
                          <Cell
                            key={d.dow}
                            fill={
                              selDays.length === 0 || selDays.includes(d.dow)
                                ? "#3baa3b"
                                : "#cbd5c0"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Click a bar to filter the whole dashboard by that day.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Impressions by slot of day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bySlot}
                      onClick={(e) => {
                        const p = e?.activePayload?.[0]?.payload as
                          | { id: SlotId }
                          | undefined;
                        if (p) toggleSlot(p.id);
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                      <XAxis dataKey="name" fontSize={10} interval={0} angle={-15} dy={8} height={45} />
                      <YAxis fontSize={11} />
                      <Tooltip formatter={(v: number) => num(v)} />
                      <Bar dataKey="value" name="Impressions" cursor="pointer">
                        {bySlot.map((s) => (
                          <Cell
                            key={s.id}
                            fill={
                              selSlots.length === 0 || selSlots.includes(s.id)
                                ? "#3baa3b"
                                : "#cbd5c0"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Day-parts: {SLOTS.map((s) => `${s.label} ${s.range}`).join(" · ")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Heatmap */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Day × slot heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[640px] select-none">
                  <div className="grid grid-cols-[70px_repeat(6,1fr)] gap-1 text-xs">
                    <div />
                    {SLOTS.map((s) => (
                      <div
                        key={s.id}
                        className="cursor-pointer px-1 pb-1 text-center font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => toggleSlot(s.id)}
                      >
                        {s.label}
                        <div className="text-[10px] opacity-70">{s.range}</div>
                      </div>
                    ))}
                    {DOW_ORDER.map((d) => (
                      <FragmentRow
                        key={d}
                        dow={d}
                        onDayClick={() => toggleDay(d)}
                        cells={SLOT_IDS.map((s) => {
                          const v = heat.map.get(`${d}|${s}`) ?? 0;
                          const active =
                            (selDays.length === 0 || selDays.includes(d)) &&
                            (selSlots.length === 0 || selSlots.includes(s));
                          const selected = selDays.includes(d) && selSlots.includes(s);
                          return {
                            slot: s,
                            value: v,
                            intensity: heat.max ? v / heat.max : 0,
                            active,
                            selected: selected || inDragRect(d, s),
                          };
                        })}
                        onCellDown={(s) => {
                          dragRef.current = { dow: d, slot: s };
                          setDragTo({ dow: d, slot: s });
                          setDragging(true);
                        }}
                        onCellEnter={(s) => {
                          if (dragging) setDragTo({ dow: d, slot: s });
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Click a cell to toggle that day + day-part, or drag across cells to
                select a block. Row and column headers toggle whole days and day-parts.
              </p>
            </CardContent>
          </Card>

          {/* Insights */}
          {insights.length > 0 && (
            <Card className="mb-6 border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {insights.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Creative + inventory breakdowns */}
          <div className="grid gap-6 lg:grid-cols-2">
            <BreakdownTable title="Performance by creative" rows={byCreative} />
            <BreakdownTable title="Performance by screen type" rows={byScreenType} />
          </div>
        </>
      )}
    </AppShell>
  );
}

function pct(cur?: number, prev?: number, hasPrev?: boolean) {
  if (!hasPrev || cur === undefined || prev === undefined || !prev) return null;
  return ((cur - prev) / prev) * 100;
}

function FragmentRow({
  dow,
  cells,
  onDayClick,
  onCellDown,
  onCellEnter,
}: {
  dow: number;
  cells: {
    slot: SlotId;
    value: number;
    intensity: number;
    active: boolean;
    selected: boolean;
  }[];
  onDayClick: () => void;
  onCellDown: (s: SlotId) => void;
  onCellEnter: (s: SlotId) => void;
}) {
  return (
    <>
      <div
        className="flex cursor-pointer items-center pr-2 text-right text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={onDayClick}
      >
        {DOW_SHORT[dow]}
      </div>
      {cells.map((c) => (
        <div
          key={c.slot}
          onMouseDown={(e) => {
            e.preventDefault();
            onCellDown(c.slot);
          }}
          onMouseEnter={() => onCellEnter(c.slot)}
          title={`${DOW_LONG[dow]} · ${SLOT_LABEL[c.slot]} — ${num(c.value)} impressions`}
          className={cn(
            "flex h-10 cursor-pointer items-center justify-center rounded-md border text-[11px] transition-colors",
            c.selected ? "border-primary ring-2 ring-primary" : "border-transparent",
            !c.active && "opacity-40",
          )}
          style={{
            backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round(
              12 + c.intensity * 88,
            )}%, transparent)`,
          }}
        >
          {c.value ? num(c.value) : "—"}
        </div>
      ))}
    </>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="rounded-full p-0.5 hover:bg-primary/25"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function DeltaKpi({
  label,
  value,
  delta,
  invert,
}: {
  label: string;
  value: string;
  delta: number | null;
  invert?: boolean;
}) {
  const good = delta === null ? true : invert ? delta <= 0 : delta >= 0;
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
        {delta !== null && (
          <span
            className={cn(
              "mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
              good ? "bg-primary/15 text-foreground" : "bg-destructive/10 text-destructive",
            )}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs prev period
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: {
    name: string;
    impressions: number;
    spend: number;
    cpm: number;
    completionRate: number;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-2 font-medium">Name</th>
              <th className="py-2 pr-2 text-right font-medium">Impr.</th>
              <th className="py-2 pr-2 text-right font-medium">Spend</th>
              <th className="py-2 pr-2 text-right font-medium">CPM</th>
              <th className="py-2 text-right font-medium">Completion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b last:border-0">
                <td className="py-2 pr-2">{r.name}</td>
                <td className="py-2 pr-2 text-right">{num(r.impressions)}</td>
                <td className="py-2 pr-2 text-right">{inr(r.spend)}</td>
                <td className="py-2 pr-2 text-right">{inr(r.cpm)}</td>
                <td className="py-2 text-right">{r.completionRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
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
