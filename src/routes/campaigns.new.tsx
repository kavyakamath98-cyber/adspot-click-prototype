import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Monitor,
  AlertTriangle,
  Save,
  Search,
  Info as InfoIcon,
  Clock,
  Plus,
  Filter,
  X,
} from "lucide-react";
import {
  AppShell,
  InUseBadge,
  LocationTagBadge,
  LocationTagPill,
  VideoPlayOverlay,
} from "@/components/AppShell";
import { AddCreativeDialog } from "@/components/AddCreativeDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import {
  INDUSTRIES,
  LOCATION_SUGGESTIONS,
  LOCATION_TAGS,
  PINCODES,
  SCREENS,
  distanceKm,
  type Campaign,
  type Creative,
  type Industry,
  type LocationTag,
  type Recurrence,
} from "@/lib/mockData";


const searchSchema = z.object({
  creativeId: z.string().optional(),
  resubmitId: z.string().optional(),
  draftId: z.string().optional(),
});

export const Route = createFileRoute("/campaigns/new")({
  head: () => ({
    meta: [
      { title: "Create Campaign · Additv" },
      { name: "description", content: "Launch a new hyperlocal DOOH campaign." },
    ],
  }),
  validateSearch: searchSchema,
  component: NewCampaign,
});

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type FitMode = "contain" | "cover" | "fill";

const STEP_LABELS = ["Details & Targeting", "Creative", "Screens", "Preview", "Schedule", "Payment"];

function NewCampaign() {
  const { creativeId, resubmitId, draftId } = Route.useSearch();
  const navigate = useNavigate();
  const {
    creatives,
    addCampaign,
    updateCampaign,
    chargeWallet,
    simulateApproval,
    campaigns,
  } = useApp();

  const resubmit = resubmitId ? campaigns.find((c) => c.id === resubmitId) : undefined;
  const draft = draftId ? campaigns.find((c) => c.id === draftId) : undefined;
  const source = resubmit ?? draft;

  const [step, setStep] = useState<Step>(1);
  const [visited, setVisited] = useState<Set<Step>>(new Set([1]));

  const [name, setName] = useState(source?.name ?? "New Campaign");

  // Step 1 — targeting
  const [pincode, setPincode] = useState(source?.pincode ?? "560034");
  const [radius, setRadius] = useState<number>(source?.radiusKm ?? 3);
  const [locationLabel, setLocationLabel] = useState<string>(
    source?.locationLabel ?? PINCODES[source?.pincode ?? "560034"]?.label ?? "",
  );
  const [centerLat, setCenterLat] = useState<number>(source?.centerLat ?? PINCODES["560034"].lat);
  const [centerLng, setCenterLng] = useState<number>(source?.centerLng ?? PINCODES["560034"].lng);

  const inRangeScreens = useMemo(
    () => SCREENS.filter((s) => distanceKm(centerLat, centerLng, s.lat, s.lng) <= radius),
    [centerLat, centerLng, radius],
  );

  const tagCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of LOCATION_TAGS) map[t] = 0;
    for (const s of inRangeScreens) map[s.locationTag] = (map[s.locationTag] ?? 0) + 1;
    return map;
  }, [inRangeScreens]);

  // Step 2 — creative
  const [selectedCreativeId, setSelectedCreativeId] = useState<string | undefined>(
    creativeId ?? source?.creativeId,
  );
  const selectedCreative = creatives.find((c) => c.id === selectedCreativeId);
  const [playSec, setPlaySec] = useState<number>(source?.playSec ?? 5);
  useEffect(() => {
    if (!selectedCreative) return;
    const cap = selectedCreative.type === "video" ? 30 : 10;
    const dflt = selectedCreative.type === "video" ? 10 : 5;
    setPlaySec((prev) => (prev > cap ? cap : prev || dflt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCreativeId]);

  // Step 3 — screens
  const [selectedScreens, setSelectedScreens] = useState<string[]>(source?.screenIds ?? []);

  // Step 4 — preview
  const [fitMode, setFitMode] = useState<FitMode>(source?.fitMode ?? "contain");

  // Step 5 — schedule
  const today = new Date().toISOString().split("T")[0];
  const isNewCreative = !!selectedCreative && !selectedCreative.previouslyApproved;
  const minStartDate = useMemo(() => {
    if (isNewCreative) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      return d.toISOString().slice(0, 10);
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, [isNewCreative]);

  const [startDate, setStartDate] = useState<string>(source?.startDate ?? minStartDate);
  const [endDate, setEndDate] = useState<string>(
    source?.endDate ?? new Date(Date.now() + 8 * 86400000).toISOString().split("T")[0],
  );
  useEffect(() => {
    if (new Date(startDate) < new Date(minStartDate)) setStartDate(minStartDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minStartDate]);

  const [recurrence, setRecurrence] = useState<Recurrence>(source?.recurrence ?? "none");

  const days = useMemo(() => {
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
  }, [startDate, endDate]);

  const totalCost = useMemo(() => {
    const priced = selectedScreens.reduce((sum, id) => {
      const s = SCREENS.find((x) => x.id === id);
      return sum + (s?.pricePerDay ?? 0);
    }, 0);
    return priced * days;
  }, [selectedScreens, days]);

  const scheduleValid =
    new Date(startDate) >= new Date(minStartDate) && new Date(endDate) > new Date(startDate);
  const meetsMinimums = days >= 3 && totalCost >= 999;

  const [payOpen, setPayOpen] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const canReachStep = (target: Step): boolean => {
    // A step is reachable if visited (jump back), or if all prior steps' minimum validity is met.
    if (visited.has(target)) return true;
    for (let s = 1; s < target; s++) {
      if (!stepValid(s as Step)) return false;
    }
    return true;
  };

  function stepValid(s: Step): boolean {
    switch (s) {
      case 1:
        return !!locationLabel && !!pincode && inRangeScreens.length > 0 && name.trim().length > 0;
      case 2:
        return !!selectedCreative && selectedCreative.status !== "rejected";
      case 3:
        return selectedScreens.length > 0;
      case 4:
        return true;
      case 5:
        return scheduleValid && meetsMinimums;
      default:
        return true;
    }
  }

  const goStep = (s: Step) => {
    if (!canReachStep(s)) return;
    setStep(s);
    setVisited((v) => new Set(v).add(s));
  };

  const goNext = () => {
    if (step < 6 && stepValid(step)) goStep(((step as number) + 1) as Step);
  };
  const goBack = () => {
    if (step > 1) goStep(((step as number) - 1) as Step);
  };

  const buildCampaign = (status: Campaign["status"]): Campaign => ({
    id: source?.id && status === "draft" ? source.id : `cmp_${Date.now()}`,
    name: name.trim() || "Untitled campaign",
    status,
    pincode,
    radiusKm: radius,
    centerLat,
    centerLng,
    locationLabel,
    screenIds: selectedScreens,
    creativeId: selectedCreative?.id ?? source?.creativeId ?? "",
    startDate,
    endDate,
    totalBudget: totalCost,
    spendToDate: 0,
    estimatedImpressions: 0,
    createdAt: source?.createdAt ?? new Date().toISOString(),
    fitMode,
    playSec,
    recurrence,
  });

  const handleSaveDraft = () => {
    const c = buildCampaign("draft");
    if (draft) {
      updateCampaign(draft.id, c);
    } else {
      addCampaign(c);
    }
    toast.success("Saved as draft", {
      description: "You can keep editing, or leave and come back later.",
    });
  };

  const handlePaySuccess = () => {
    if (!selectedCreative) return;
    if (!chargeWallet(totalCost)) {
      setPayError("Insufficient wallet balance. Please top up and try again.");
      return;
    }
    const creativePending = selectedCreative.status === "pending";
    const initialStatus: Campaign["status"] = creativePending ? "draft" : "pending_approval";
    const newCampaign = buildCampaign(initialStatus);
    addCampaign(newCampaign);
    if (!creativePending) simulateApproval(newCampaign.id);
    if (resubmit) updateCampaign(resubmit.id, { status: "completed" });
    if (draft) updateCampaign(draft.id, { status: "completed" });
    setPayOpen(false);
    if (creativePending) {
      toast.success("Saved as draft — we'll submit for review once your new creative clears brand-safety.");
    } else {
      toast.success("Payment successful — campaign submitted for review");
    }
    navigate({ to: "/campaigns/$id", params: { id: newCampaign.id } });
  };


  return (
    <AppShell>
      <div className="mb-6">
        <button
          onClick={() => navigate({ to: "/" })}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {resubmit ? "Fix & Resubmit" : draft ? "Continue Draft" : "Create Campaign"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Step {step} of 6 · {STEP_LABELS[step - 1]}
            </p>
          </div>
          <Button variant="outline" onClick={handleSaveDraft} className="gap-1.5">
            <Save className="h-4 w-4" /> Save as Draft
          </Button>
        </div>
        <Stepper current={step} canReach={canReachStep} onJump={goStep} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {step === 1 && (
            <Step1
              name={name}
              setName={setName}
              locationLabel={locationLabel}
              setLocation={(loc) => {
                setLocationLabel(loc.label);
                setPincode(loc.pincode);
                setCenterLat(loc.lat);
                setCenterLng(loc.lng);
              }}
              radius={radius}
              setRadius={setRadius}
              inRangeCount={inRangeScreens.length}
              tagCounts={tagCounts}
            />
          )}
          {step === 2 && (
            <Step2
              creatives={creatives}
              campaigns={campaigns}
              selectedId={selectedCreativeId}
              setSelectedId={setSelectedCreativeId}
              playSec={playSec}
              setPlaySec={setPlaySec}
            />
          )}
          {step === 3 && (
            <Step3
              screens={inRangeScreens}
              creative={selectedCreative}
              selected={selectedScreens}
              setSelected={setSelectedScreens}
            />
          )}
          {step === 4 && selectedCreative && (
            <Step4
              creative={selectedCreative}
              screens={inRangeScreens.filter((s) => selectedScreens.includes(s.id))}
              fitMode={fitMode}
              setFitMode={setFitMode}
            />
          )}
          {step === 5 && (
            <Step5
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              days={days}
              totalCost={totalCost}
              minStart={minStartDate}
              scheduleValid={scheduleValid}
              meetsMinimums={meetsMinimums}
              recurrence={recurrence}
              setRecurrence={setRecurrence}
              isNewCreative={isNewCreative}
            />
          )}
          {step === 6 && selectedCreative && (
            <Step6
              name={name}
              locationLabel={locationLabel}
              radius={radius}
              screens={selectedScreens.length}
              days={days}
              totalCost={totalCost}
              creative={selectedCreative}
              onPay={() => {
                setPayError(null);
                setPayOpen(true);
              }}
            />
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={goBack} disabled={step === 1}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSaveDraft} className="gap-1.5">
                <Save className="h-4 w-4" /> Save as Draft
              </Button>
              {step < 6 && (
                <Button onClick={goNext} disabled={!stepValid(step)}>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <SummaryCard
          name={name}
          locationLabel={locationLabel}
          radius={radius}
          inRange={inRangeScreens.length}
          creative={selectedCreative}
          selectedScreens={selectedScreens.length}
          days={days}
          totalCost={totalCost}
          playSec={playSec}
        />
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simulate Payment</DialogTitle>
            <DialogDescription>This is a mock payment. Choose an outcome to demo the flow.</DialogDescription>
          </DialogHeader>
          <div className="my-2 rounded-md bg-secondary/50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount to charge</span>
              <span className="font-semibold">₹{totalCost.toLocaleString("en-IN")}</span>
            </div>
          </div>
          {payError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Payment failed</AlertTitle>
              <AlertDescription>{payError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPayError("Card declined by issuing bank. Please try a different method.")}>
              Simulate Failure
            </Button>
            <Button onClick={handlePaySuccess}>Simulate Success</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

/* ---------- Stepper ---------- */

function Stepper({
  current,
  canReach,
  onJump,
}: {
  current: Step;
  canReach: (s: Step) => boolean;
  onJump: (s: Step) => void;
}) {
  return (
    <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1">
      {STEP_LABELS.map((label, i) => {
        const idx = (i + 1) as Step;
        const active = idx === current;
        const done = idx < current;
        const reachable = canReach(idx);
        return (
          <div key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => reachable && onJump(idx)}
              disabled={!reachable}
              className={cn(
                "flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium transition-colors",
                done && "border-primary bg-primary/10 text-primary",
                active && "border-primary text-primary",
                !done && !active && reachable && "border-border text-muted-foreground hover:bg-secondary",
                !reachable && "border-border text-muted-foreground opacity-50 cursor-not-allowed",
              )}
              title={reachable ? "Jump to this step" : "Complete earlier steps first"}
            >
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full text-[10px]",
                  done ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/70",
                  active && "bg-primary text-primary-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : idx}
              </span>
              <span className="whitespace-nowrap">{label}</span>
            </button>
            {i < STEP_LABELS.length - 1 && <div className="mx-1 h-px w-4 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Step 1 ---------- */

function Step1({
  name,
  setName,
  locationLabel,
  setLocation,
  radius,
  setRadius,
  inRangeCount,
  tagCounts,
}: {
  name: string;
  setName: (v: string) => void;
  locationLabel: string;
  setLocation: (loc: (typeof LOCATION_SUGGESTIONS)[number]) => void;
  radius: number;
  setRadius: (v: number) => void;
  inRangeCount: number;
  tagCounts: Record<string, number>;
}) {
  const [query, setQuery] = useState(locationLabel);
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LOCATION_SUGGESTIONS;
    return LOCATION_SUGGESTIONS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.pincode.includes(q),
    );
  }, [query]);

  return (
    <Card className="p-6">
      <div>
        <Label htmlFor="cname" className="text-base">Campaign name</Label>
        <Input
          id="cname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Diwali Weekend Push"
          className="mt-1.5 text-base"
        />
        <p className="mt-1 text-xs text-muted-foreground">Give your ad a clear, memorable name.</p>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Where should this ad run?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search a neighborhood, area, or pincode — we'll pin the center on the map.
        </p>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search for a place, e.g. Indiranagar, Bangalore"
            className="pl-9"
          />
          {open && suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-lg">
              {suggestions.map((s) => (
                <button
                  key={s.pincode}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setLocation(s);
                    setQuery(s.label);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  <MapPin className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium">{s.label}</div>
                    <div className="text-xs text-muted-foreground">Pincode {s.pincode}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <Label>Radius</Label>
          <span className="text-sm font-medium">{radius.toFixed(1)} km</span>
        </div>
        <Slider
          value={[radius]}
          min={0.5}
          max={15}
          step={0.5}
          onValueChange={(v) => setRadius(v[0])}
          className="max-w-md"
        />
      </div>

      <div className="mt-6 rounded-lg border border-border/60 bg-muted/40 p-6">
        <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/10" />
          <div
            className="absolute rounded-full border-2 border-dashed border-primary/60 bg-primary/5"
            style={{
              width: `${Math.min(100, (radius / 15) * 100)}%`,
              height: `${Math.min(100, (radius / 15) * 100)}%`,
            }}
          />
          <div className="relative grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground shadow-md">
            <MapPin className="h-3 w-3" />
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">Cosmetic radius preview</p>
      </div>

      <div className="mt-6 rounded-lg border border-border/60 bg-secondary/40 p-4">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5 text-primary" />
          {inRangeCount > 0 ? (
            <div className="text-sm">
              <span className="font-semibold">{inRangeCount} screens</span> available in this area
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No screens found. Try widening the radius or a different area.
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {LOCATION_TAGS.map((t) => {
            const n = tagCounts[t] ?? 0;
            if (n === 0) return null;
            return (
              <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs">
                <LocationTagBadge tag={t} />
                <span className="font-semibold">{n}</span>
              </span>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/* ---------- Step 2 ---------- */

function Step2({
  creatives,
  campaigns,
  selectedId,
  setSelectedId,
  playSec,
  setPlaySec,
}: {
  creatives: Creative[];
  campaigns: Campaign[];
  selectedId?: string;
  setSelectedId: (id: string) => void;
  playSec: number;
  setPlaySec: (v: number) => void;
}) {
  const selected = creatives.find((c) => c.id === selectedId);
  const inUseByLive = (creativeId: string) =>
    campaigns.some(
      (c) => (c.creativeId === creativeId || c.pendingCreativeId === creativeId) && c.status === "live",
    );

  const [industryFilter, setIndustryFilter] = useState<Set<Industry>>(new Set());
  const [usageFilter, setUsageFilter] = useState<"all" | "in_use" | "unused">("all");
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(12);
  const [addOpen, setAddOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const available = useMemo(() => {
    const s = q.trim().toLowerCase();
    return creatives.filter((c) => {
      if (c.status === "rejected") return false;
      if (industryFilter.size > 0 && (!c.industry || !industryFilter.has(c.industry as Industry))) {
        return false;
      }
      if (usageFilter !== "all") {
        const used = inUseByLive(c.id);
        if (usageFilter === "in_use" && !used) return false;
        if (usageFilter === "unused" && used) return false;
      }
      if (s) {
        const hay = `${c.name} ${c.industry ?? ""} ${c.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatives, campaigns, industryFilter, usageFilter, q]);

  useEffect(() => setVisible(12), [q, usageFilter, industryFilter]);

  useEffect(() => {
    if (visible >= available.length) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible((v) => v + 12);
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, available.length]);

  const shown = available.slice(0, visible);
  const cap = selected?.type === "video" ? 30 : 10;
  const imageOptions = [3, 5, 7, 10];
  const videoOptions = [10, 15, 20, 25, 30];
  const playOptions = selected?.type === "video" ? videoOptions : imageOptions;

  const toggleIndustry = (i: Industry) => {
    setIndustryFilter((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Pick a creative</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose from your library, or add a new one — it syncs automatically.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, tag, industry"
              className="pl-9"
            />
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-end gap-3">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Industry</Label>
            <MultiSelectPopover
              label="Any industry"
              options={INDUSTRIES as readonly string[]}
              selected={industryFilter as Set<string>}
              onToggle={(v) => toggleIndustry(v as Industry)}
              onClear={() => setIndustryFilter(new Set())}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Creative status</Label>
            <Select value={usageFilter} onValueChange={(v) => setUsageFilter(v as typeof usageFilter)}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div>
                    <div className="font-medium">All creatives</div>
                    <div className="text-xs text-muted-foreground">Show every creative in your library</div>
                  </div>
                </SelectItem>
                <SelectItem value="in_use">
                  <div>
                    <div className="font-medium">In use in a live campaign</div>
                    <div className="text-xs text-muted-foreground">Currently running somewhere</div>
                  </div>
                </SelectItem>
                <SelectItem value="unused">
                  <div>
                    <div className="font-medium">Not currently used</div>
                    <div className="text-xs text-muted-foreground">Free to pick without conflicts</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <p className="mt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Your creatives</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="group flex aspect-video flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/70 bg-muted/20 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
        >
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium">Add creative</span>
        </button>

        {shown.map((c) => {
          const active = c.id === selectedId;
          const locked = inUseByLive(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "group overflow-hidden rounded-lg border text-left transition-all",
                active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50",
              )}
            >
              <div className="relative aspect-video bg-muted">
                {c.type === "image" ? (
                  <img src={c.url} className="h-full w-full object-cover" alt="" />
                ) : (
                  <>
                    <video src={c.url} className="h-full w-full object-cover" muted />
                    <VideoPlayOverlay />
                  </>
                )}
                {locked && (
                  <div className="absolute right-2 top-2">
                    <InUseBadge />
                  </div>
                )}
                {c.status === "pending" && (
                  <div className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
                    In review
                  </div>
                )}
              </div>
              <div className="p-2 text-xs">
                <div className="truncate font-medium">{c.name}</div>
                <div className="text-muted-foreground">
                  {c.type.toUpperCase()} · {c.width}×{c.height}
                  {c.industry ? ` · ${c.industry}` : ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div ref={sentinel} className="h-4" />
      {visible < available.length && (
        <p className="mt-2 text-center text-xs text-muted-foreground">Loading more…</p>
      )}
      {available.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No creatives match. Add one to get started.
        </p>
      )}

      {selected && (
        <div className="mt-6 rounded-lg border bg-secondary/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">Playtime per loop</p>
              <p className="text-xs text-muted-foreground">
                {selected.type === "video"
                  ? "Videos can play up to 30 seconds per loop."
                  : "Images can display up to 10 seconds per loop."}
              </p>
            </div>
            <Select
              value={String(Math.min(playSec, cap))}
              onValueChange={(v) => setPlaySec(Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {playOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} seconds
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selected.status === "pending" && (
            <Alert className="mt-3 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                This creative is still under brand-safety review. Your campaign will be saved as a
                draft on submit and auto-queued once the creative is approved.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <AddCreativeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(cr) => setSelectedId(cr.id)}
      />
    </Card>
  );
}

function MultiSelectPopover({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const count = selected.size;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          {label}
          {count > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const active = selected.has(o);
                return (
                  <CommandItem key={o} onSelect={() => onToggle(o)}>
                    <div
                      className={cn(
                        "mr-2 grid h-4 w-4 place-items-center rounded border",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </div>
                    <span>{o}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {count > 0 && (
            <div className="border-t p-2">
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Clear all
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}


/* ---------- Step 3 (Screens) ---------- */

const SCREEN_PAGE = 8;

function Step3({
  screens,
  creative,
  selected,
  setSelected,
}: {
  screens: typeof SCREENS;
  creative?: Creative;
  selected: string[];
  setSelected: (v: string[]) => void;
}) {
  const [tagFilter, setTagFilter] = useState<Set<LocationTag>>(new Set());
  const [visible, setVisible] = useState(SCREEN_PAGE);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(
    () => (tagFilter.size === 0 ? screens : screens.filter((s) => tagFilter.has(s.locationTag))),
    [screens, tagFilter],
  );


  useEffect(() => setVisible(SCREEN_PAGE), [tagFilter, screens.length]);

  useEffect(() => {
    if (visible >= filtered.length) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((v) => v + SCREEN_PAGE);
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, filtered.length]);

  const shown = filtered.slice(0, visible);

  const creativeLandscape = creative ? creative.width > creative.height : true;
  const isMatched = (s: (typeof SCREENS)[number]) => (s.width > s.height) === creativeLandscape;

  const toggle = (id: string) => {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const selectAllAvailable = () => {
    const ids = filtered.filter((s) => s.availability !== "booked" && isMatched(s)).map((s) => s.id);
    setSelected(Array.from(new Set([...selected, ...ids])));
  };

  const total = selected.reduce((sum, id) => {
    const s = SCREENS.find((x) => x.id === id);
    return sum + (s?.pricePerDay ?? 0);
  }, 0);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Select screens</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {screens.length} screens in your radius. Prices are per day, per screen.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={selectAllAvailable}>
            Select All Available
          </Button>
          <div className="text-sm">
            <span className="text-muted-foreground">Per day:</span>{" "}
            <span className="font-semibold">₹{total.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <MultiSelectPopover
          label="Location type"
          options={LOCATION_TAGS as readonly string[]}
          selected={tagFilter as Set<string>}
          onToggle={(v) =>
            setTagFilter((prev) => {
              const next = new Set(prev);
              const t = v as LocationTag;
              if (next.has(t)) next.delete(t);
              else next.add(t);
              return next;
            })
          }
          onClear={() => setTagFilter(new Set())}
        />
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {screens.length} screens
        </span>
      </div>


      <div className="mt-5 divide-y divide-border rounded-lg border">
        {shown.map((s) => {
          const matched = isMatched(s);
          const booked = s.availability === "booked";
          const disabled = booked || !matched;
          const checked = selected.includes(s.id);
          return (
            <div
              key={s.id}
              className={cn("flex items-center gap-4 px-4 py-3", disabled && "opacity-60")}
              title={!matched ? "This screen's orientation doesn't match your creative." : ""}
            >
              <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => toggle(s.id)} />
              <div className="grid h-10 w-10 place-items-center rounded bg-secondary">
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.venue}</span>
                  <LocationTagPill tag={s.locationTag} />
                  <AvailabilityBadge a={s.availability} />
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {s.venueType} · {s.city} · {s.pincode} · {s.width}×{s.height}
                </p>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">₹{s.pricePerDay}</div>
                <div className="text-xs text-muted-foreground">/day</div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No screens match this filter.
          </div>
        )}
      </div>
      <div ref={sentinel} className="h-6" />
      {visible < filtered.length && (
        <p className="mt-3 text-center text-xs text-muted-foreground">Loading more screens…</p>
      )}

      {selected.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">Select at least one screen to continue.</p>
      )}
    </Card>
  );
}

function TagChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-secondary",
      )}
    >
      {label}
    </button>
  );
}

function AvailabilityBadge({ a }: { a: string }) {
  const map: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    partial: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    booked: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  };
  const label = a === "available" ? "Available" : a === "partial" ? "Partially booked" : "Fully booked";
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", map[a])}>{label}</span>;
}

/* ---------- Step 4 (Preview) ---------- */

function Step4({
  creative,
  screens,
  fitMode,
  setFitMode,
}: {
  creative: Creative;
  screens: { width: number; height: number }[];
  fitMode: FitMode;
  setFitMode: (v: FitMode) => void;
}) {
  const dims = Array.from(new Set(screens.map((s) => `${s.width}x${s.height}`))).map((d) => {
    const [w, h] = d.split("x").map(Number);
    return { w, h };
  });

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Preview on your selected screens</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We only show previews for the dimensions actually in use — {screens.length} selected screen{screens.length === 1 ? "" : "s"}, {dims.length} unique size{dims.length === 1 ? "" : "s"}.
      </p>

      <div className="mt-4 flex items-center gap-2">
        {(["contain", "cover", "fill"] as FitMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setFitMode(m)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm capitalize transition-colors",
              fitMode === m
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-secondary",
            )}
          >
            {m === "contain" ? "Fit" : m === "cover" ? "Fill" : "Stretch"}
          </button>
        ))}
      </div>

      {fitMode === "fill" && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Distortion warning</AlertTitle>
          <AlertDescription>Stretch mode may visibly distort your creative. Fit or Fill are recommended.</AlertDescription>
        </Alert>
      )}

      {dims.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Select screens in the previous step to see previews here.
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-6">
          {dims.map(({ w, h }) => {
            const isLandscape = w > h;
            const displayW = isLandscape ? 320 : 180;
            const displayH = (displayW * h) / w;
            return (
              <div key={`${w}x${h}`} className="text-center">
                <div
                  className="overflow-hidden rounded-md border-4 border-neutral-800 bg-black shadow-lg"
                  style={{ width: displayW, height: displayH }}
                >
                  {creative.type === "image" ? (
                    <img src={creative.url} alt="" className="h-full w-full" style={{ objectFit: fitMode }} />
                  ) : (
                    <video
                      src={creative.url}
                      className="h-full w-full"
                      style={{ objectFit: fitMode }}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {w}×{h} · {isLandscape ? "Landscape" : "Portrait"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ---------- Step 5 (Schedule) ---------- */

function Step5({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  days,
  totalCost,
  minStart,
  scheduleValid,
  meetsMinimums,
  recurrence,
  setRecurrence,
  isNewCreative,
}: {
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  days: number;
  totalCost: number;
  minStart: string;
  scheduleValid: boolean;
  meetsMinimums: boolean;
  recurrence: Recurrence;
  setRecurrence: (v: Recurrence) => void;
  isNewCreative: boolean;
}) {
  const dateRangeText = useMemo(() => {
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    return `${days} day${days === 1 ? "" : "s"} · ${fmt(startDate)} – ${fmt(endDate)}`;
  }, [startDate, endDate, days]);

  const recurrenceLabel: Record<Recurrence, string> = {
    none: "Does not repeat",
    weekdays: "Every weekday",
    weekends: "Every weekend",
    weekly: "Weekly",
    monthly: "Monthly",
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Schedule & budget</h2>
      <p className="mt-1 text-sm text-muted-foreground">Minimum 3 days and ₹999 total.</p>

      {isNewCreative && (
        <Alert className="mt-4 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <Clock className="h-4 w-4" />
          <AlertTitle>New creatives need 48 hours for review</AlertTitle>
          <AlertDescription>
            Because this creative hasn't cleared review before, the earliest start date is 2 days from today.
            Reusing a previously-approved creative removes this wait.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Start date</Label>
          <Input
            type="date"
            value={startDate}
            min={minStart}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>End date</Label>
          <Input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="mt-4">
        <Label>Repeat</Label>
        <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Does not repeat</SelectItem>
            <SelectItem value="weekdays">Every weekday (Mon–Fri)</SelectItem>
            <SelectItem value="weekends">Every weekend (Sat–Sun)</SelectItem>
            <SelectItem value="weekly">Weekly on selected day(s)</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Runs {recurrenceLabel[recurrence].toLowerCase()} between the start and end dates above.
        </p>
      </div>

      {!scheduleValid && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            End date must be after start date, and start date must be on or after {new Date(minStart).toLocaleDateString("en-IN")}.
          </AlertDescription>
        </Alert>
      )}
      {scheduleValid && !meetsMinimums && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Minimum duration is 3 days and minimum spend is ₹999. Current: {days} days · ₹{totalCost.toLocaleString("en-IN")}.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 rounded-lg border bg-secondary/40 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <InfoIcon className="h-4 w-4 text-primary" />
          {dateRangeText}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Repeats: {recurrenceLabel[recurrence]}
        </div>
        <div className="mt-3 flex justify-between text-sm">
          <span className="text-muted-foreground">Total budget</span>
          <span className="text-lg font-semibold">₹{totalCost.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Step 6 (Payment) ---------- */

function Step6({
  name,
  locationLabel,
  radius,
  screens,
  days,
  totalCost,
  creative,
  onPay,
}: {
  name: string;
  locationLabel: string;
  radius: number;
  screens: number;
  days: number;
  totalCost: number;
  creative: Creative;
  onPay: () => void;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Review & pay</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Confirm the details below and complete payment to submit your campaign for review.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="relative overflow-hidden rounded-lg border bg-muted">
          {creative.type === "image" ? (
            <img src={creative.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <>
              <video src={creative.url} className="h-full w-full object-cover" muted autoPlay loop />
              <VideoPlayOverlay />
            </>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <SummaryRow label="Campaign" value={name} />
          <SummaryRow label="Creative" value={creative.name} />
          <SummaryRow label="Location" value={`${locationLabel} · ${radius} km`} />
          <SummaryRow label="Screens" value={`${screens}`} />
          <SummaryRow label="Duration" value={`${days} days`} />
          <SummaryRow label="Total" value={`₹${totalCost.toLocaleString("en-IN")}`} highlight />
        </dl>
      </div>

      <Button onClick={onPay} className="mt-6 w-full" size="lg">
        Pay ₹{totalCost.toLocaleString("en-IN")}
      </Button>
    </Card>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5", highlight ? "text-lg font-semibold" : "font-medium")}>{value}</dd>
    </div>
  );
}

/* ---------- Sidebar ---------- */

function SummaryCard({
  name,
  locationLabel,
  radius,
  inRange,
  creative,
  selectedScreens,
  days,
  totalCost,
  playSec,
}: {
  name: string;
  locationLabel: string;
  radius: number;
  inRange: number;
  creative?: Creative;
  selectedScreens: number;
  days: number;
  totalCost: number;
  playSec: number;
}) {
  return (
    <Card className="sticky top-24 h-fit p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
      <h3 className="mt-1 text-base font-semibold">{name}</h3>
      <dl className="mt-4 space-y-2 text-sm">
        <Row k="Location" v={`${locationLabel || "—"} · ${radius} km`} />
        <Row k="Screens in range" v={`${inRange}`} />
        <Row k="Creative" v={creative?.name ?? "—"} />
        <Row k="Playtime" v={creative ? `${playSec}s/loop` : "—"} />
        <Row k="Selected screens" v={`${selectedScreens}`} />
        <Row k="Duration" v={`${days} days`} />
      </dl>
      <div className="mt-4 border-t pt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-semibold">₹{totalCost.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="max-w-[60%] truncate text-right font-medium">{v}</span>
    </div>
  );
}
