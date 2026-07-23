import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  MapPin,
  Monitor,
  Pause,
  Play,
  RefreshCw,
  Upload,
  X,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useApp } from "@/lib/app-context";
import { SCREENS, PINCODES, type Creative } from "@/lib/mockData";
import { toast } from "sonner";

export const Route = createFileRoute("/campaigns/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Campaign · AdSpot` },
      { name: "description", content: `Manage campaign ${params.id}.` },
    ],
  }),
  component: CampaignDetail,
});

function CampaignDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const {
    campaigns,
    creatives,
    updateCampaign,
    addCreative,
    simulateReplaceCreativeReview,
  } = useApp();

  const campaign = campaigns.find((c) => c.id === id);
  const currentCreative = creatives.find((c) => c.id === campaign?.creativeId);
  const pendingCreative = campaign?.pendingCreativeId
    ? creatives.find((c) => c.id === campaign.pendingCreativeId)
    : undefined;

  const [replaceOpen, setReplaceOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [newEnd, setNewEnd] = useState<string>(campaign?.endDate ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Simulate impression ticker for live campaigns
  useEffect(() => {
    if (!campaign || campaign.status !== "live") return;
    const t = setInterval(() => {
      updateCampaign(campaign.id, {
        estimatedImpressions: campaign.estimatedImpressions + Math.floor(30 + Math.random() * 60),
      });
    }, 3000);
    return () => clearInterval(t);
  }, [campaign?.id, campaign?.status, campaign?.estimatedImpressions]); // eslint-disable-line

  if (!campaign) {
    return (
      <AppShell>
        <div className="py-16 text-center">
          <p className="text-muted-foreground">Campaign not found.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
            Back to dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  const screens = campaign.screenIds
    .map((sid) => SCREENS.find((s) => s.id === sid))
    .filter(Boolean) as typeof SCREENS;

  const p = PINCODES[campaign.pincode];

  // Chart data
  const chartData = useMemo(() => {
    const days = Math.max(
      1,
      Math.round(
        (new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / 86400000,
      ) + 1,
    );
    return Array.from({ length: Math.min(days, 14) }, (_, i) => {
      const d = new Date(campaign.startDate);
      d.setDate(d.getDate() + i);
      const seed = (i + 1) * 137 + campaign.id.length;
      const plays = 220 + (seed % 400);
      return {
        day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        plays,
      };
    });
  }, [campaign.startDate, campaign.endDate, campaign.id]);

  const totalPlays = chartData.reduce((s, d) => s + d.plays, 0);
  const estImpressions = campaign.status === "live" ? campaign.estimatedImpressions || totalPlays * 25 : totalPlays * 25;

  const handleReplaceFile = (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const url = URL.createObjectURL(file);
    const newCreative: Creative = {
      id: `cre_${Date.now()}`,
      name: file.name.replace(/\.[^.]+$/, ""),
      type: isVideo ? "video" : "image",
      url,
      width: 1920,
      height: 1080,
      sizeKB: Math.round(file.size / 1024),
      uploadedAt: new Date().toISOString().slice(0, 10),
      tags: ["replacement"],
      status: "pending",
    };
    addCreative(newCreative);
    simulateReplaceCreativeReview(campaign.id, newCreative.id);
    setReplaceOpen(false);
    toast.info("New creative submitted for review. Current creative stays live until it clears.");
  };

  const pickFromLibrary = (cid: string) => {
    simulateReplaceCreativeReview(campaign.id, cid);
    setReplaceOpen(false);
    toast.info("New creative submitted for review.");
  };

  const pauseCampaign = () => {
    updateCampaign(campaign.id, { status: "paused" });
    toast.success("Campaign paused");
  };

  const resumeCampaign = () => {
    // Recompute end date: add pauseDays. For prototype: bump end date by 2 days.
    const newEndDate = new Date(campaign.endDate);
    newEndDate.setDate(newEndDate.getDate() + 2);
    updateCampaign(campaign.id, {
      status: "live",
      endDate: newEndDate.toISOString().slice(0, 10),
    });
    toast.success(`Campaign resumed. New end date: ${newEndDate.toLocaleDateString("en-IN")}`);
  };

  const remainingBudget = Math.max(0, campaign.totalBudget - campaign.spendToDate);
  const proRataRefund = Math.round(remainingBudget * 0.9); // 10% cancellation fee

  const doCancel = () => {
    updateCampaign(campaign.id, { status: "completed" });
    setCancelOpen(false);
    toast.success(`Campaign cancelled. ₹${proRataRefund.toLocaleString("en-IN")} refunded (mock).`);
  };

  const doExtend = () => {
    updateCampaign(campaign.id, { endDate: newEnd });
    setExtendOpen(false);
    toast.success("Campaign extended");
  };

  const contentUnderReviewBanner =
    campaign.status === "pending_approval" && new Date(campaign.startDate) < new Date();

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/" })}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {new Date(campaign.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(campaign.status === "live" || campaign.status === "paused") && (
            <Button variant="secondary" onClick={() => setReplaceOpen(true)} className="gap-1.5">
              <RefreshCw className="h-4 w-4" /> Replace Creative
            </Button>
          )}
          {campaign.status === "live" && (
            <Button variant="outline" onClick={pauseCampaign} className="gap-1.5">
              <Pause className="h-4 w-4" /> Pause
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button variant="outline" onClick={resumeCampaign} className="gap-1.5">
              <Play className="h-4 w-4" /> Resume
            </Button>
          )}
          {(campaign.status === "live" || campaign.status === "paused" || campaign.status === "approved_scheduled") && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setNewEnd(campaign.endDate);
                  setExtendOpen(true);
                }}
                className="gap-1.5"
              >
                <Calendar className="h-4 w-4" /> Extend
              </Button>
              <Button
                variant="outline"
                onClick={() => setCancelOpen(true)}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
            </>
          )}
          {campaign.status === "rejected" && (
            <Link to="/campaigns/new" search={{ resubmitId: campaign.id }}>
              <Button className="gap-1.5">
                <RefreshCw className="h-4 w-4" /> Fix & Resubmit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {campaign.status === "rejected" && campaign.rejectionReason && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Campaign rejected</AlertTitle>
          <AlertDescription>
            Reason: {campaign.rejectionReason}. Update your creative and resubmit — targeting, screens, and schedule are preserved.
          </AlertDescription>
        </Alert>
      )}

      {contentUnderReviewBanner && (
        <Alert className="mb-6 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <Clock className="h-4 w-4" />
          <AlertTitle>Start delayed — content is still under review</AlertTitle>
          <AlertDescription>
            Your campaign's start date has arrived, but nothing will run on-screen until brand-safety review completes. We never show unapproved content.
          </AlertDescription>
        </Alert>
      )}

      {pendingCreative && (
        <Alert className="mb-6 border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>New creative "{pendingCreative.name}" is under review</AlertTitle>
          <AlertDescription>
            The current creative stays live until the new one clears review. This can take a few seconds in this demo.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Creative preview */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Current creative</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Currently Live
              </span>
            </div>
            {currentCreative && (
              <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
                <div className="aspect-video overflow-hidden rounded border-4 border-neutral-800 bg-black">
                  {currentCreative.type === "image" ? (
                    <img src={currentCreative.url} alt="" className="h-full w-full" style={{ objectFit: campaign.fitMode }} />
                  ) : (
                    <video
                      src={currentCreative.url}
                      className="h-full w-full"
                      style={{ objectFit: campaign.fitMode }}
                      muted
                      autoPlay
                      loop
                      playsInline
                    />
                  )}
                </div>
                <div className="text-sm">
                  <div className="font-medium">{currentCreative.name}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {currentCreative.type} · {currentCreative.width}×{currentCreative.height}
                  </p>
                </div>
              </div>
            )}

            {pendingCreative && (
              <div className="mt-4 border-t pt-4">
                <div className="mb-2 flex items-center gap-2 text-sm">
                  <span className="font-medium">Queued creative</span>
                  <StatusBadge status="pending" />
                </div>
                <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                  <div className="aspect-video overflow-hidden rounded border-2 border-dashed border-border/70 bg-muted">
                    {pendingCreative.type === "image" ? (
                      <img src={pendingCreative.url} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <video src={pendingCreative.url} className="h-full w-full object-contain" muted />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Will replace the live creative automatically once approved.
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Screens */}
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Screens ({screens.length})</h2>
            <div className="divide-y divide-border rounded-lg border">
              {screens.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="grid h-8 w-8 place-items-center rounded bg-secondary">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{s.venue}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.venueType} · {s.city} · {s.pincode}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.width}×{s.height}
                  </div>
                  <div className="w-16 text-right text-sm font-medium">₹{s.pricePerDay}/d</div>
                </div>
              ))}
              {screens.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">No screens selected.</div>
              )}
            </div>
          </Card>

          {/* Reporting */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Reporting <span className="text-xs font-normal text-muted-foreground">(Estimated)</span></h2>
              <div className="text-xs text-muted-foreground">Daily plays across selected screens</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Est. plays" value={totalPlays.toLocaleString("en-IN")} />
              <Stat label="Est. impressions" value={estImpressions.toLocaleString("en-IN")} />
              <Stat label="Screen uptime" value="98%" />
            </div>
            <div className="mt-5 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="plays" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">All numbers are estimated for demo purposes.</p>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Targeting</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{p?.label ?? campaign.pincode}</span>
              </div>
              <div className="text-muted-foreground">Radius: <span className="text-foreground">{campaign.radiusKm} km</span></div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold">Schedule</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(campaign.startDate).toLocaleDateString("en-IN")} →{" "}
                  {new Date(campaign.endDate).toLocaleDateString("en-IN")}
                </span>
              </div>
              {campaign.daypartStart && (
                <div className="text-muted-foreground">
                  Daypart: <span className="text-foreground">{campaign.daypartStart} – {campaign.daypartEnd}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold">Budget</h3>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spend to date</span>
                <span className="font-medium">₹{campaign.spendToDate.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">₹{campaign.totalBudget.toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.min(100, campaign.totalBudget > 0 ? (campaign.spendToDate / campaign.totalBudget) * 100 : 0)}%`,
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Replace creative modal */}
      <Dialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Replace creative</DialogTitle>
            <DialogDescription>
              Upload a new creative or pick one from your library. The current creative stays live until the new one clears review.
            </DialogDescription>
          </DialogHeader>

          <div
            className="rounded-lg border-2 border-dashed border-border/70 bg-muted/30 p-6 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleReplaceFile(f);
            }}
          >
            <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm">Drop a file here, or</p>
            <Button className="mt-2" size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleReplaceFile(f);
              }}
            />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">From your library</h4>
            <div className="grid grid-cols-3 gap-2">
              {creatives
                .filter((c) => c.status === "approved" && c.id !== campaign.creativeId)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickFromLibrary(c.id)}
                    className="overflow-hidden rounded-md border text-left hover:border-primary"
                  >
                    <div className="aspect-video bg-muted">
                      {c.type === "image" ? (
                        <img src={c.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <video src={c.url} muted className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="truncate p-1.5 text-xs">{c.name}</div>
                  </button>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel modal */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel campaign?</DialogTitle>
            <DialogDescription>
              This ends the campaign immediately. A pro-rata refund will be issued for unused budget (mock).
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-secondary/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unused budget</span>
              <span className="font-medium">₹{remainingBudget.toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Cancellation fee (10%)</span>
              <span className="font-medium">−₹{Math.round(remainingBudget * 0.1).toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2">
              <span>Estimated refund</span>
              <span className="text-base font-semibold">₹{proRataRefund.toLocaleString("en-IN")}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep running</Button>
            <Button variant="destructive" onClick={doCancel}>Cancel campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend modal */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend campaign</DialogTitle>
            <DialogDescription>Pick a new end date. Additional cost will be charged (mock).</DialogDescription>
          </DialogHeader>
          <div>
            <Label>New end date</Label>
            <Input
              type="date"
              value={newEnd}
              min={campaign.endDate}
              onChange={(e) => setNewEnd(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>Cancel</Button>
            <Button onClick={doExtend} disabled={newEnd <= campaign.endDate}>Extend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-secondary/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
    </div>
  );
}
