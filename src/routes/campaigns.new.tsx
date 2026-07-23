import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  MapPin,
  Monitor,
  Upload,
  AlertTriangle,
  Image as ImageIcon,
  Film,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import {
  PINCODES,
  SCREENS,
  distanceKm,
  type Creative,
  type Campaign,
} from "@/lib/mockData";

const searchSchema = z.object({
  creativeId: z.string().optional(),
  resubmitId: z.string().optional(),
});

export const Route = createFileRoute("/campaigns/new")({
  head: () => ({
    meta: [
      { title: "Create Campaign · AdSpot" },
      { name: "description", content: "Launch a new hyperlocal DOOH campaign." },
    ],
  }),
  validateSearch: searchSchema,
  component: NewCampaign,
});

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type FitMode = "contain" | "cover" | "fill";

function NewCampaign() {
  const { creativeId, resubmitId } = Route.useSearch();
  const navigate = useNavigate();
  const { creatives, addCreative, addCampaign, chargeWallet, simulateApproval, campaigns, updateCampaign } = useApp();

  const resubmit = resubmitId ? campaigns.find((c) => c.id === resubmitId) : undefined;

  const [step, setStep] = useState<Step>(resubmit ? 2 : 1);
  const [name, setName] = useState(resubmit?.name ?? "New Campaign");

  // Step 1 — targeting
  const [pincode, setPincode] = useState(resubmit?.pincode ?? "560034");
  const [radius, setRadius] = useState<number>(resubmit?.radiusKm ?? 3);
  const p = PINCODES[pincode];

  const inRangeScreens = useMemo(() => {
    if (!p) return [];
    return SCREENS.filter((s) => distanceKm(p.lat, p.lng, s.lat, s.lng) <= radius);
  }, [p, radius]);

  // Step 2 — creative
  const [selectedCreativeId, setSelectedCreativeId] = useState<string | undefined>(
    creativeId ?? resubmit?.creativeId,
  );
  const [uploadChecking, setUploadChecking] = useState(false);

  // Step 3 — preview fit
  const [fitMode, setFitMode] = useState<FitMode>(resubmit?.fitMode ?? "contain");

  // Step 4 — screen selection
  const [selectedScreens, setSelectedScreens] = useState<string[]>(resubmit?.screenIds ?? []);

  // Step 5 — schedule
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(resubmit?.startDate ?? today);
  const [endDate, setEndDate] = useState<string>(
    resubmit?.endDate ?? new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
  );
  const [dpStart, setDpStart] = useState<string>("");
  const [dpEnd, setDpEnd] = useState<string>("");

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
    new Date(startDate) >= new Date(today) && new Date(endDate) > new Date(startDate);
  const meetsMinimums = days >= 3 && totalCost >= 999;

  // Step 6 — payment
  const [payOpen, setPayOpen] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const selectedCreative = creatives.find((c) => c.id === selectedCreativeId);

  const canNext = (): boolean => {
    switch (step) {
      case 1:
        return /^\d{6}$/.test(pincode) && !!p && inRangeScreens.length > 0;
      case 2:
        return !!selectedCreative && !uploadChecking && selectedCreative.status !== "rejected";
      case 3:
        return true;
      case 4:
        return selectedScreens.length > 0;
      case 5:
        return scheduleValid && meetsMinimums;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (step < 6 && canNext()) setStep(((step as number) + 1) as Step);
  };
  const goBack = () => {
    if (step > 1) setStep(((step as number) - 1) as Step);
  };

  const handlePaySuccess = () => {
    if (!selectedCreative || !p) return;
    if (!chargeWallet(totalCost)) {
      setPayError("Insufficient wallet balance. Please top up and try again.");
      return;
    }
    const newCampaign: Campaign = {
      id: `cmp_${Date.now()}`,
      name,
      status: "pending_approval",
      pincode,
      radiusKm: radius,
      centerLat: p.lat,
      centerLng: p.lng,
      screenIds: selectedScreens,
      creativeId: selectedCreative.id,
      startDate,
      endDate,
      daypartStart: dpStart || undefined,
      daypartEnd: dpEnd || undefined,
      totalBudget: totalCost,
      spendToDate: 0,
      estimatedImpressions: 0,
      createdAt: new Date().toISOString(),
      fitMode,
    };
    addCampaign(newCampaign);
    simulateApproval(newCampaign.id);
    if (resubmit) {
      updateCampaign(resubmit.id, { status: "completed" });
    }
    setPayOpen(false);
    toast.success("Payment successful — campaign submitted for review");
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
              {resubmit ? "Fix & Resubmit" : "Create Campaign"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Step {step} of 6</p>
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
            placeholder="Campaign name"
          />
        </div>
        <Stepper current={step} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {step === 1 && (
            <Step1
              pincode={pincode}
              setPincode={setPincode}
              radius={radius}
              setRadius={setRadius}
              inRangeCount={inRangeScreens.length}
            />
          )}
          {step === 2 && (
            <Step2
              selectedCreative={selectedCreative}
              setSelectedCreativeId={setSelectedCreativeId}
              uploadChecking={uploadChecking}
              setUploadChecking={setUploadChecking}
              creatives={creatives}
              addCreative={addCreative}
            />
          )}
          {step === 3 && (
            <Step3
              creative={selectedCreative!}
              screens={inRangeScreens}
              fitMode={fitMode}
              setFitMode={setFitMode}
            />
          )}
          {step === 4 && (
            <Step4
              screens={inRangeScreens}
              creative={selectedCreative!}
              selected={selectedScreens}
              setSelected={setSelectedScreens}
            />
          )}
          {step === 5 && (
            <Step5
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              dpStart={dpStart}
              setDpStart={setDpStart}
              dpEnd={dpEnd}
              setDpEnd={setDpEnd}
              days={days}
              totalCost={totalCost}
              minToday={today}
              scheduleValid={scheduleValid}
              meetsMinimums={meetsMinimums}
            />
          )}
          {step === 6 && (
            <Step6
              name={name}
              pincode={pincode}
              radius={radius}
              screens={selectedScreens.length}
              days={days}
              totalCost={totalCost}
              creative={selectedCreative!}
              onPay={() => {
                setPayError(null);
                setPayOpen(true);
              }}
            />
          )}

          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={goBack} disabled={step === 1}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < 6 ? (
              <Button onClick={goNext} disabled={!canNext()}>
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        <SummaryCard
          name={name}
          pincode={pincode}
          radius={radius}
          inRange={inRangeScreens.length}
          creative={selectedCreative}
          selectedScreens={selectedScreens.length}
          days={days}
          totalCost={totalCost}
        />
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simulate Payment</DialogTitle>
            <DialogDescription>
              This is a mock payment. Choose an outcome to demo the flow.
            </DialogDescription>
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
            <Button
              variant="outline"
              onClick={() => setPayError("Card declined by issuing bank. Please try a different method.")}
            >
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

const STEP_LABELS = [
  "Targeting",
  "Creative",
  "Preview",
  "Screens",
  "Schedule",
  "Payment",
];

function Stepper({ current }: { current: Step }) {
  return (
    <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1">
      {STEP_LABELS.map((label, i) => {
        const idx = (i + 1) as Step;
        const active = idx === current;
        const done = idx < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 min-w-7 items-center justify-center rounded-full border text-xs font-medium",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary text-primary",
                !done && !active && "border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : idx}
            </div>
            <span
              className={cn(
                "text-sm",
                active ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && <div className="mx-1 h-px w-6 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Step 1 ---------- */

function Step1({
  pincode,
  setPincode,
  radius,
  setRadius,
  inRangeCount,
}: {
  pincode: string;
  setPincode: (v: string) => void;
  radius: number;
  setRadius: (v: number) => void;
  inRangeCount: number;
}) {
  const valid = /^\d{6}$/.test(pincode);
  const p = PINCODES[pincode];
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Where should this ad run?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Reach people in a specific neighborhood by targeting a pincode.
      </p>

      <Tabs defaultValue="pincode" className="mt-6">
        <TabsList>
          <TabsTrigger value="pincode">Target by Pincode</TabsTrigger>
          <TabsTrigger value="map">Target by Map Location</TabsTrigger>
        </TabsList>
        <TabsContent value="pincode" className="mt-4 space-y-6">
          <div>
            <Label htmlFor="pin">Pincode</Label>
            <Input
              id="pin"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit pincode"
              className="mt-1.5 max-w-xs"
            />
            {!valid && pincode.length > 0 && (
              <p className="mt-1 text-xs text-destructive">Enter a valid 6-digit pincode.</p>
            )}
            {p && (
              <p className="mt-1 text-xs text-muted-foreground">Detected: {p.label}</p>
            )}
          </div>

          <div>
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

          <div className="rounded-lg border border-border/60 bg-muted/40 p-6">
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
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Cosmetic radius preview
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-border/60 bg-secondary/40 p-4">
            <Monitor className="h-5 w-5 text-primary" />
            {inRangeCount > 0 ? (
              <div className="text-sm">
                <span className="font-semibold">{inRangeCount} screens</span> available in this area
              </div>
            ) : valid ? (
              <div className="text-sm text-muted-foreground">
                No screens found. Try widening the radius or a different pincode.
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Enter a pincode to see available screens.</div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="map" className="mt-4">
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            Map targeting is available in the full product. Use pincode targeting for now.
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

/* ---------- Step 2 ---------- */

function Step2({
  selectedCreative,
  setSelectedCreativeId,
  uploadChecking,
  setUploadChecking,
  creatives,
  addCreative,
}: {
  selectedCreative?: Creative;
  setSelectedCreativeId: (id: string) => void;
  uploadChecking: boolean;
  setUploadChecking: (v: boolean) => void;
  creatives: Creative[];
  addCreative: (c: Creative) => Creative;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const url = URL.createObjectURL(file);
    setUploadChecking(true);

    const loadMeta = new Promise<{ w: number; h: number; d?: number }>((resolve) => {
      if (isVideo) {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => resolve({ w: v.videoWidth, h: v.videoHeight, d: Math.round(v.duration) });
        v.src = url;
      } else {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = url;
      }
    });

    loadMeta.then((meta) => {
      const created: Creative = {
        id: `cre_${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, ""),
        type: isVideo ? "video" : "image",
        url,
        width: meta.w || 1920,
        height: meta.h || 1080,
        sizeKB: Math.round(file.size / 1024),
        durationSec: meta.d,
        uploadedAt: new Date().toISOString().slice(0, 10),
        tags: ["uploaded"],
        status: "pending",
      };
      addCreative(created);
      setSelectedCreativeId(created.id);
      setTimeout(() => {
        created.status = "approved";
        setUploadChecking(false);
        toast.success("Content passed brand-safety check");
      }, 1600);
    });
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Upload creative or pick from library</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Images and videos supported. We'll auto-check for brand safety.
      </p>

      <div
        className="mt-6 rounded-lg border-2 border-dashed border-border/70 bg-muted/30 p-8 text-center transition-colors hover:bg-muted/50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
      >
        <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Drag and drop an image or video</p>
        <p className="mt-1 text-xs text-muted-foreground">or</p>
        <Button
          className="mt-3"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={uploadChecking}
        >
          Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {uploadChecking && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking your content for brand safety...
        </div>
      )}

      {selectedCreative && !uploadChecking && (
        <div className="mt-4 flex items-start gap-4 rounded-lg border p-4">
          <div className="h-24 w-32 shrink-0 overflow-hidden rounded bg-muted">
            {selectedCreative.type === "image" ? (
              <img src={selectedCreative.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <video src={selectedCreative.url} className="h-full w-full object-cover" muted />
            )}
          </div>
          <div className="flex-1 text-sm">
            <div className="flex items-center gap-2">
              {selectedCreative.type === "image" ? <ImageIcon className="h-4 w-4" /> : <Film className="h-4 w-4" />}
              <span className="font-medium">{selectedCreative.name}</span>
              {selectedCreative.status === "approved" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                  <Check className="h-3 w-3" /> Approved
                </span>
              )}
              {selectedCreative.status === "rejected" && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                  Rejected
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedCreative.width}×{selectedCreative.height} · {(selectedCreative.sizeKB / 1024).toFixed(1)} MB
              {selectedCreative.durationSec ? ` · ${selectedCreative.durationSec}s` : ""}
            </p>
            {selectedCreative.status === "rejected" && selectedCreative.rejectionReason && (
              <p className="mt-1 text-xs text-red-600">Reason: {selectedCreative.rejectionReason}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-medium">Or pick from your library</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {creatives
            .filter((c) => c.status !== "rejected")
            .map((c) => {
              const active = c.id === selectedCreative?.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCreativeId(c.id)}
                  className={cn(
                    "group overflow-hidden rounded-lg border text-left transition-all",
                    active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="aspect-video bg-muted">
                    {c.type === "image" ? (
                      <img src={c.url} className="h-full w-full object-cover" alt="" />
                    ) : (
                      <video src={c.url} className="h-full w-full object-cover" muted />
                    )}
                  </div>
                  <div className="p-2 text-xs">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="text-muted-foreground">{c.width}×{c.height}</div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </Card>
  );
}

/* ---------- Step 3 ---------- */

function Step3({
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
      <h2 className="text-lg font-semibold">Preview across screen sizes</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        See how your creative renders on each screen shape.
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
          <AlertDescription>
            Stretch mode may visibly distort your creative. Fit or Fill are recommended.
          </AlertDescription>
        </Alert>
      )}

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
                  <img
                    src={creative.url}
                    alt=""
                    className="h-full w-full"
                    style={{ objectFit: fitMode }}
                  />
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
    </Card>
  );
}

/* ---------- Step 4 ---------- */

function Step4({
  screens,
  creative,
  selected,
  setSelected,
}: {
  screens: typeof SCREENS;
  creative: Creative;
  selected: string[];
  setSelected: (v: string[]) => void;
}) {
  const availableDims = new Set(
    screens.map((s) => `${s.width}x${s.height}`),
  );
  // A screen has a "matching preview" if its dim was among in-range dims. Always true here — mark
  // "unmatched" any screen whose orientation doesn't match the creative's aspect ratio strongly.
  const creativeLandscape = creative.width > creative.height;
  const isMatched = (s: (typeof SCREENS)[number]) => {
    const scrLandscape = s.width > s.height;
    return scrLandscape === creativeLandscape;
  };

  const toggle = (id: string) => {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const selectAllAvailable = () => {
    const ids = screens.filter((s) => s.availability !== "booked" && isMatched(s)).map((s) => s.id);
    setSelected(ids);
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

      <div className="mt-5 divide-y divide-border rounded-lg border">
        {screens.map((s) => {
          const matched = isMatched(s);
          const booked = s.availability === "booked";
          const disabled = booked || !matched;
          const checked = selected.includes(s.id);
          return (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-4 px-4 py-3",
                disabled && "opacity-60",
              )}
              title={!matched ? "This screen's orientation doesn't match your creative's preview." : ""}
            >
              <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => toggle(s.id)} />
              <div className="grid h-10 w-10 place-items-center rounded bg-secondary">
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.venue}</span>
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
      </div>

      {selected.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">Select at least one screen to continue.</p>
      )}
    </Card>
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

/* ---------- Step 5 ---------- */

function Step5({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  dpStart,
  setDpStart,
  dpEnd,
  setDpEnd,
  days,
  totalCost,
  minToday,
  scheduleValid,
  meetsMinimums,
}: {
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  dpStart: string;
  setDpStart: (v: string) => void;
  dpEnd: string;
  setDpEnd: (v: string) => void;
  days: number;
  totalCost: number;
  minToday: string;
  scheduleValid: boolean;
  meetsMinimums: boolean;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Schedule & budget</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Minimum 3 days and ₹999 total.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Start date</Label>
          <Input
            type="date"
            value={startDate}
            min={minToday}
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
        <div>
          <Label>Daypart start (optional)</Label>
          <Input
            type="time"
            value={dpStart}
            onChange={(e) => setDpStart(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Daypart end (optional)</Label>
          <Input
            type="time"
            value={dpEnd}
            onChange={(e) => setDpEnd(e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>

      {!scheduleValid && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>End date must be after start date, and start date can't be in the past.</AlertDescription>
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
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Duration</span>
          <span className="font-medium">{days} days</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-muted-foreground">Total budget</span>
          <span className="text-lg font-semibold">₹{totalCost.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Step 6 ---------- */

function Step6({
  name,
  pincode,
  radius,
  screens,
  days,
  totalCost,
  creative,
  onPay,
}: {
  name: string;
  pincode: string;
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
        <div className="overflow-hidden rounded-lg border bg-muted">
          {creative.type === "image" ? (
            <img src={creative.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <video src={creative.url} className="h-full w-full object-cover" muted autoPlay loop />
          )}
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <SummaryRow label="Campaign" value={name} />
          <SummaryRow label="Creative" value={creative.name} />
          <SummaryRow label="Targeting" value={`${PINCODES[pincode]?.label ?? pincode} · ${radius} km`} />
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

/* ---------- Sidebar summary ---------- */

function SummaryCard({
  name,
  pincode,
  radius,
  inRange,
  creative,
  selectedScreens,
  days,
  totalCost,
}: {
  name: string;
  pincode: string;
  radius: number;
  inRange: number;
  creative?: Creative;
  selectedScreens: number;
  days: number;
  totalCost: number;
}) {
  return (
    <Card className="sticky top-24 h-fit p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
      <h3 className="mt-1 text-base font-semibold">{name}</h3>
      <dl className="mt-4 space-y-2 text-sm">
        <Row k="Pincode" v={`${pincode} · ${radius} km`} />
        <Row k="Screens in range" v={`${inRange}`} />
        <Row k="Creative" v={creative?.name ?? "—"} />
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
