import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  
  Calendar,
  Loader2,
  MapPin,
  Monitor,
  Pause,
  Play,
  RefreshCw,
  Square,
  AlertTriangle,
  Clock,
  Check,
  ChevronLeft,

} from "lucide-react";
import {
  AppShell,
  InUseBadge,
  LocationTagBadge,
  StatusBadge,
  VideoPlayOverlay,
} from "@/components/AppShell";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import {
  SCREENS,
  PINCODES,
  DAYPARTS,
  DOW_LABELS,
  displayStatus,
  dowsInRange,
} from "@/lib/mockData";
import { toast } from "sonner";

export const Route = createFileRoute("/campaigns/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Campaign · Additv` },
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
    chargeWallet,
    refundToWallet,
    simulateReplaceCreativeReview,
    pauseCampaign,
    resumeCampaign,
    stopCampaign,
  } = useApp();

  const campaign = campaigns.find((c) => c.id === id);
  const currentCreative = creatives.find((c) => c.id === campaign?.creativeId);
  const pendingCreative = campaign?.pendingCreativeId
    ? creatives.find((c) => c.id === campaign.pendingCreativeId)
    : undefined;
  const rejectedCreative = campaign?.rejectedCreativeId
    ? creatives.find((c) => c.id === campaign.rejectedCreativeId)
    : undefined;

  const [replaceOpen, setReplaceOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeMode, setResumeMode] = useState<"keep_end" | "shift_end">("shift_end");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editStart, setEditStart] = useState(campaign?.startDate ?? "");
  const [editEnd, setEditEnd] = useState(campaign?.endDate ?? "");
  const [editDays, setEditDays] = useState<number[]>(campaign?.daysOfWeek ?? []);
  const [editSlots, setEditSlots] = useState<string[]>(campaign?.dayparts ?? []);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);

  // Impression ticker for live campaigns
  useEffect(() => {
    if (!campaign || campaign.status !== "live") return;
    const t = setInterval(() => {
      updateCampaign(campaign.id, {
        estimatedImpressions:
          campaign.estimatedImpressions + Math.floor(30 + Math.random() * 60),
      });
    }, 3000);
    return () => clearInterval(t);
  }, [campaign?.id, campaign?.status, campaign?.estimatedImpressions]); // eslint-disable-line

  if (!campaign) {
    return (
      <AppShell title="Campaign not found" back={{ to: "/campaigns" }}>
        <div className="py-16 text-center">
          <p className="text-muted-foreground">Campaign not found.</p>
          <Link to="/campaigns" className="mt-4 inline-block text-sm text-primary underline">
            Back to campaigns
          </Link>
        </div>
      </AppShell>
    );
  }

  const screens = campaign.screenIds
    .map((sid) => SCREENS.find((s) => s.id === sid))
    .filter(Boolean) as typeof SCREENS;

  const p = PINCODES[campaign.pincode];

  const hasSchedule =
    !!campaign.startDate &&
    !!campaign.endDate &&
    !Number.isNaN(new Date(campaign.startDate).getTime()) &&
    !Number.isNaN(new Date(campaign.endDate).getTime());

  // Reporting only makes sense once the campaign has screens and has run/been scheduled.
  const hasReporting =
    hasSchedule &&
    screens.length > 0 &&
    ["live", "paused", "completed", "approved_scheduled"].includes(campaign.status);

  // Chart data — overall or per-screen
  const chartData = useMemo(() => {
    if (!hasSchedule) return [];
    const days = Math.max(
      1,
      Math.round(
        (new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / 86400000,
      ) + 1,
    );
    const seedBase =
      selectedScreenId
        ? selectedScreenId.length * 13 + campaign.id.length
        : campaign.id.length;
    const perScreenFactor = selectedScreenId ? 1 / Math.max(1, screens.length) : 1;
    return Array.from({ length: Math.min(days, 14) }, (_, i) => {
      const d = new Date(campaign.startDate);
      d.setDate(d.getDate() + i);
      const seed = (i + 1) * 137 + seedBase;
      const plays = Math.round((220 + (seed % 400)) * perScreenFactor);
      return {
        day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        plays,
      };
    });
  }, [
    hasSchedule,
    campaign.startDate,
    campaign.endDate,
    campaign.id,
    selectedScreenId,
    screens.length,
  ]);

  const totalPlays = chartData.reduce((s, d) => s + d.plays, 0);
  const estImpressions =
    campaign.status === "live" && !selectedScreenId
      ? campaign.estimatedImpressions || totalPlays * 25
      : totalPlays * 25;

  const selectedScreen = selectedScreenId ? screens.find((s) => s.id === selectedScreenId) : null;

  const totalDays = hasSchedule
    ? Math.max(
        1,
        Math.round(
          (new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) /
            86400000,
        ) + 1,
      )
    : undefined;
  const today = new Date();
  const elapsedDays =
    hasSchedule && totalDays !== undefined
      ? Math.max(
          0,
          Math.min(
            totalDays,
            Math.round((today.getTime() - new Date(campaign.startDate).getTime()) / 86400000) + 1,
          ),
        )
      : undefined;
  const remainingDays =
    totalDays !== undefined && elapsedDays !== undefined
      ? Math.max(0, totalDays - elapsedDays)
      : undefined;


  const pickFromLibrary = (cid: string) => {
    simulateReplaceCreativeReview(campaign.id, cid);
    setReplaceOpen(false);
    toast.info("New creative submitted for review.");
  };

  const doPause = () => {
    pauseCampaign(campaign.id);
    toast.success("Campaign paused");
  };

  const openResume = () => {
    setResumeMode("shift_end");
    setResumeOpen(true);
  };

  const doResume = () => {
    resumeCampaign(campaign.id, resumeMode);
    setResumeOpen(false);
    toast.success(
      resumeMode === "shift_end"
        ? "Campaign resumed. End date shifted to preserve full run."
        : "Campaign resumed. Original end date kept.",
    );
  };

  const doStop = () => {
    const refund = stopCampaign(campaign.id);
    setStopOpen(false);
    toast.success(
      `Campaign stopped. ₹${refund.toLocaleString("en-IN")} refunded to wallet (mock).`,
    );
  };

  // Price the campaign purely on run-length × the daily cost of its screens, so a
  // longer end date costs more and a shorter one gives money back. Derive the
  // day rate from what the advertiser actually paid so a shortened campaign
  // refunds against the original budget, not today's list prices.
  const daysBetween = (a: string, b: string) => {
    const t1 = new Date(a).getTime();
    const t2 = new Date(b).getTime();
    if (Number.isNaN(t1) || Number.isNaN(t2)) return 0;
    return Math.max(0, Math.round((t2 - t1) / 86400000) + 1);
  };
  const currentDays = daysBetween(campaign.startDate, campaign.endDate);
  const listRate = screens.reduce((sum, s) => sum + s.pricePerDay, 0);
  const dailyRate =
    currentDays > 0 ? Math.round(campaign.totalBudget / currentDays) : listRate;
  const newDays = editStart && editEnd ? daysBetween(editStart, editEnd) : 0;
  // Same run-length ⇒ exactly the same price. Re-deriving it from a rounded day
  // rate would otherwise ask for a few rupees on an unchanged schedule.
  const newBudget =
    newDays === currentDays
      ? campaign.totalBudget
      : newDays > 0 && dailyRate > 0
        ? newDays * dailyRate
        : campaign.totalBudget;

  // Never refund below what has already been delivered.
  const budgetDelta = Math.max(newBudget, campaign.spendToDate) - campaign.totalBudget;


  const doSaveSchedule = () => {
    if (budgetDelta > 0 && !chargeWallet(budgetDelta)) {
      toast.error(
        `Insufficient wallet balance. You need ₹${budgetDelta.toLocaleString("en-IN")} to extend this campaign.`,
      );
      return;
    }
    if (budgetDelta < 0) refundToWallet(-budgetDelta);

    updateCampaign(campaign.id, {
      startDate: editStart,
      endDate: editEnd,
      daysOfWeek: editDays,
      dayparts: editSlots,
      totalBudget: campaign.totalBudget + budgetDelta,
    });

    setScheduleOpen(false);
    if (budgetDelta > 0) {
      toast.success(
        `Campaign extended. ₹${budgetDelta.toLocaleString("en-IN")} charged from your wallet.`,
      );
    } else if (budgetDelta < 0) {
      toast.success(
        `Campaign shortened. ₹${(-budgetDelta).toLocaleString("en-IN")} refunded to your wallet.`,
      );
    } else {
      toast.success("Schedule updated");
    }
  };


  const doPayNow = () => {
    if (!chargeWallet(campaign.totalBudget)) {
      toast.error("Insufficient wallet balance. Please top up and try again.");
      return;
    }
    const status =
      new Date(campaign.startDate) <= new Date() ? "live" : "approved_scheduled";
    updateCampaign(campaign.id, { status, awaitingPayment: false, paymentUnlocked: false });
    toast.success("Payment successful — your campaign is confirmed.");
  };


  const contentUnderReviewBanner =
    campaign.status === "pending_approval" && new Date(campaign.startDate) < new Date();

  const canEditSchedule =
    campaign.status === "live" ||
    campaign.status === "paused" ||
    campaign.status === "approved_scheduled";

  return (
    <AppShell title={campaign.name} back={{ to: "/campaigns", label: "Back to campaigns" }}>
      {/* Top summary card with schedule controls inline */}
      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={displayStatus(campaign)} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {new Date(campaign.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {campaign.status === "rejected" && (

              <Link to="/campaigns/new" search={{ resubmitId: campaign.id }}>
                <Button className="gap-1.5">
                  <RefreshCw className="h-4 w-4" /> Fix & Resubmit
                </Button>
              </Link>
            )}
            {campaign.status === "draft" && (
              <Link to="/campaigns/new" search={{ draftId: campaign.id }}>
                <Button className="gap-1.5">Continue draft</Button>
              </Link>
            )}
            {(campaign.status === "pending_approval" ||
              campaign.status === "live" ||
              campaign.status === "paused" ||
              campaign.status === "approved_scheduled") && (
              <Link to="/campaigns/new" search={{ draftId: campaign.id }}>
                <Button className="gap-1.5">Edit campaign</Button>
              </Link>
            )}


          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="rounded-lg border bg-secondary/30 p-4">
            {hasSchedule ? (
              <>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-primary" />
                  {new Date(campaign.startDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  →{" "}
                  {new Date(campaign.endDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <MiniStat label="Total" value={`${totalDays} days`} />
                  <MiniStat label="Elapsed" value={`${elapsedDays} days`} />
                  <MiniStat label="Remaining" value={`${remainingDays} days`} />
                </div>
                <div className="mt-3 space-y-1.5 border-t pt-3 text-xs">
                  <p>
                    <span className="text-muted-foreground">Runs on: </span>
                    <span className="font-medium text-foreground">
                      {(campaign.daysOfWeek?.length
                        ? [...campaign.daysOfWeek].sort((a, b) => a - b)
                        : [0, 1, 2, 3, 4, 5, 6]
                      )
                        .map((d) => DOW_LABELS[d])
                        .join(", ")}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Time slots: </span>
                    <span className="font-medium text-foreground">
                      {DAYPARTS.filter(
                        (d) => !campaign.dayparts?.length || campaign.dayparts.includes(d.id),
                      )
                        .map((d) => d.label)
                        .join(" · ")}
                    </span>
                  </p>
                </div>

              </>

            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Dates not set yet — continue your draft to pick a schedule.
              </div>
            )}
            {campaign.recurrence && campaign.recurrence !== "none" && (
              <p className="mt-2 text-xs text-muted-foreground">
                Repeats:{" "}
                <span className="font-medium text-foreground">
                  {campaign.recurrence === "weekdays"
                    ? "Every weekday"
                    : campaign.recurrence === "weekends"
                      ? "Every weekend"
                      : campaign.recurrence.charAt(0).toUpperCase() + campaign.recurrence.slice(1)}
                </span>
              </p>
            )}
          </div>

          {canEditSchedule && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                setEditStart(campaign.startDate);
                setEditEnd(campaign.endDate);
                setEditDays(
                  campaign.daysOfWeek?.length
                    ? campaign.daysOfWeek
                    : dowsInRange(campaign.startDate, campaign.endDate),
                );
                setEditSlots(
                  campaign.dayparts?.length ? campaign.dayparts : DAYPARTS.map((d) => d.id),
                );
                setScheduleOpen(true);
              }}
            >
              <Calendar className="h-4 w-4" /> Adjust schedule
            </Button>
          )}
        </div>
      </Card>

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
            Your campaign's start date has arrived, but nothing will run on-screen until brand-safety review completes.
          </AlertDescription>
        </Alert>
      )}

      {pendingCreative && (
        <Alert className="mb-6 border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>New creative "{pendingCreative.name}" is under review</AlertTitle>
          <AlertDescription>
            The current creative stays live until the new one clears review.
          </AlertDescription>
        </Alert>
      )}

      {rejectedCreative && (
        <Alert className="mb-6 border-destructive/40 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            New creative "{rejectedCreative.name}" was rejected
          </AlertTitle>
          <AlertDescription>
            Reason: {campaign.rejectedCreativeReason ?? rejectedCreative.rejectionReason}. Your
            campaign keeps running as usual on the current creative
            {currentCreative ? ` "${currentCreative.name}"` : ""}. Upload a compliant creative and
            try the swap again whenever you're ready.
          </AlertDescription>
        </Alert>
      )}



      {campaign.awaitingPayment && !campaign.paymentUnlocked && campaign.status === "pending_approval" && (
        <Alert className="mb-6 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <Clock className="h-4 w-4" />
          <AlertTitle>Creative under review — payment on hold</AlertTitle>
          <AlertDescription>
            Your payment details will be available once the creative is approved. New creatives
            usually take 24–48 hours. Nothing has been charged.
          </AlertDescription>
        </Alert>
      )}

      {campaign.awaitingPayment && campaign.paymentUnlocked && campaign.status === "pending_approval" && (
        <Card className="mb-6 border-primary/40 bg-primary/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">Creative approved — complete your payment</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pay ₹{campaign.totalBudget.toLocaleString("en-IN")} to put this campaign live on your{" "}
                {campaign.screenIds.length} selected screens.
              </p>
            </div>
            <Button size="lg" onClick={doPayNow}>
              Pay ₹{campaign.totalBudget.toLocaleString("en-IN")}
            </Button>
          </div>
        </Card>
      )}


      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Creative preview */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">
                {currentCreative ? "Current creative" : "Creative"}
              </h2>
              {campaign.status === "live" && currentCreative && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Currently Live
                </span>
              )}
              {currentCreative && campaign.status !== "live" && (
                <StatusBadge
                  status={
                    campaign.status === "pending_approval" && currentCreative.status === "approved"
                      ? "pending"
                      : currentCreative.status
                  }
                />
              )}
            </div>
            {!currentCreative && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No creative chosen yet.
                {(campaign.status === "draft" || campaign.status === "pending_approval") && (
                  <>
                    {" "}
                    <Link
                      to="/campaigns/new"
                      search={{ draftId: campaign.id }}
                      className="text-primary underline"
                    >
                      {campaign.status === "pending_approval" ? "Edit this campaign" : "Continue your draft"}
                    </Link>{" "}
                    to pick one.
                  </>
                )}
              </div>
            )}
            {currentCreative && (

              <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
                <div className="relative aspect-video overflow-hidden rounded border-4 border-neutral-800 bg-black">
                  {currentCreative.type === "image" ? (
                    <img
                      src={currentCreative.url}
                      alt=""
                      className="h-full w-full"
                      style={{ objectFit: campaign.fitMode }}
                    />
                  ) : (
                    <>
                      <video
                        src={currentCreative.url}
                        className="h-full w-full"
                        style={{ objectFit: campaign.fitMode }}
                        muted
                        autoPlay
                        loop
                        playsInline
                      />
                      <VideoPlayOverlay />
                    </>
                  )}
                </div>
                <div className="text-sm">
                  <div className="font-medium">{currentCreative.name}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {currentCreative.type} · {currentCreative.width}×{currentCreative.height}
                    {campaign.playSec ? ` · ${campaign.playSec}s per loop` : ""}
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
                  <div className="relative aspect-video overflow-hidden rounded border-2 border-dashed border-border/70 bg-muted">
                    {pendingCreative.type === "image" ? (
                      <img src={pendingCreative.url} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <>
                        <video src={pendingCreative.url} className="h-full w-full object-contain" muted />
                        <VideoPlayOverlay />
                      </>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Will replace the live creative automatically once approved.
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Reporting (moved above screens) */}
          {hasReporting ? (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">
                    Reporting <span className="text-xs font-normal text-muted-foreground">(Estimated)</span>
                  </h2>
                  {selectedScreen ? (
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Showing:</span>
                      <span className="font-medium">{selectedScreen.venue}</span>
                      <button
                        className="inline-flex items-center gap-0.5 text-primary underline"
                        onClick={() => setSelectedScreenId(null)}
                      >
                        <ChevronLeft className="h-3 w-3" /> Back to overall
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Overall across all {screens.length} screens. Click a screen below to drill in.
                    </p>
                  )}
                </div>
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
          ) : (
            <Card className="p-5">
              <h2 className="font-semibold">Reporting</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {screens.length === 0
                  ? "No screens selected yet — reporting starts once your campaign is booked and running."
                  : "Reporting will appear here once this campaign starts running."}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Stat label="Est. plays" value="—" />
                <Stat label="Est. impressions" value="—" />
                <Stat label="Screen uptime" value="—" />
              </div>
            </Card>
          )}


          {/* Screens (now below reporting), with infinite scroll + click to drill */}
          <ScreensSection
            screens={screens}
            selectedScreenId={selectedScreenId}
            onSelect={(id) => setSelectedScreenId(id === selectedScreenId ? null : id)}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Targeting</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{campaign.locationLabel ?? p?.label ?? campaign.pincode}</span>
              </div>
              <div className="text-muted-foreground">
                Radius: <span className="text-foreground">{campaign.radiusKm} km</span>
              </div>
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
              Pick a new creative from your library. The current creative stays live until the new one clears review. To add a brand-new asset,{" "}
              <a href="/library" className="text-primary underline">
                upload it via the Content Library
              </a>{" "}
              first.
            </DialogDescription>
          </DialogHeader>

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
                    <div className="relative aspect-video bg-muted">
                      {c.type === "image" ? (
                        <img src={c.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <>
                          <video src={c.url} muted className="h-full w-full object-cover" />
                          <VideoPlayOverlay />
                        </>
                      )}
                    </div>
                    <div className="truncate p-1.5 text-xs">{c.name}</div>
                  </button>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stop campaign modal */}
      <Dialog open={stopOpen} onOpenChange={setStopOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop this campaign?</DialogTitle>
            <DialogDescription>
              This is permanent. Once stopped, the campaign cannot be resumed — different from Pause,
              which is temporary and resumable.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>This action can't be undone</AlertTitle>
            <AlertDescription>
              A pro-rata refund (minus 10% cancellation fee) will be returned to your wallet.
            </AlertDescription>
          </Alert>
          <div className="rounded-md bg-secondary/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unused budget</span>
              <span className="font-medium">
                ₹{Math.max(0, campaign.totalBudget - campaign.spendToDate).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Cancellation fee (10%)</span>
              <span className="font-medium">
                −₹
                {Math.round(
                  Math.max(0, campaign.totalBudget - campaign.spendToDate) * 0.1,
                ).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2">
              <span>Estimated refund</span>
              <span className="text-base font-semibold">
                ₹
                {Math.round(
                  Math.max(0, campaign.totalBudget - campaign.spendToDate) * 0.9,
                ).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopOpen(false)}>
              Keep running
            </Button>
            <Button variant="destructive" onClick={doStop}>
              Stop campaign permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume choice modal */}
      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume campaign</DialogTitle>
            <DialogDescription>
              Your campaign was paused. How should we handle the end date?
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={resumeMode} onValueChange={(v) => setResumeMode(v as "keep_end" | "shift_end")}>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-secondary/40">
              <RadioGroupItem value="shift_end" className="mt-1" />
              <div className="text-sm">
                <div className="font-medium">Shift end date forward (recommended)</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Preserves your full originally-purchased duration by extending the end date by the paused days.
                </div>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-secondary/40">
              <RadioGroupItem value="keep_end" className="mt-1" />
              <div className="text-sm">
                <div className="font-medium">Keep original end date</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Ends on the original date; the remaining active run is shorter by the paused duration.
                </div>
              </div>
            </label>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResumeOpen(false)}>Cancel</Button>
            <Button onClick={doResume}>Resume</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule adjust modal */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adjust schedule</DialogTitle>
            <DialogDescription>
              Change your dates, the days of the week and the time-slots your ad plays in.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const todayStr = new Date().toISOString().slice(0, 10);
            const startElapsed =
              campaign.status === "live" && campaign.startDate <= todayStr;
            const minEnd =
              startElapsed
                ? todayStr > editStart
                  ? todayStr
                  : editStart
                : editStart;
            const allowedDows = dowsInRange(editStart, editEnd);
            const datesValid = !!editStart && !!editEnd && editEnd >= editStart && editEnd >= minEnd;
            const staleDays = editDays.filter((d) => allowedDows.length && !allowedDows.includes(d));
            const noDays = datesValid && editDays.length === 0;
            const noSlots = editSlots.length === 0;
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Start date</Label>
                    <Input
                      type="date"
                      value={editStart}
                      disabled={startElapsed}
                      onChange={(e) => setEditStart(e.target.value)}
                      className="mt-1.5"
                    />
                    {startElapsed && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Campaign has already started — start date can no longer be changed.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>End date</Label>
                    <Input
                      type="date"
                      value={editEnd}
                      min={minEnd}
                      onChange={(e) => setEditEnd(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label>Days of the week</Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Your ad runs on the days you pick.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DOW_LABELS.map((label, idx) => (
                      <CheckChip
                        key={label}
                        label={label}
                        checked={editDays.includes(idx)}
                        disabled={allowedDows.length > 0 && !allowedDows.includes(idx)}
                        onClick={() =>
                          setEditDays((prev) =>
                            prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx],
                          )
                        }
                      />
                    ))}
                  </div>

                  {staleDays.length > 0 && (
                    <p className="mt-1.5 text-xs text-destructive">
                      {staleDays.map((d) => DOW_LABELS[d]).join(", ")}{" "}
                      {staleDays.length === 1 ? "does" : "do"} not fall between your chosen dates —
                      remove {staleDays.length === 1 ? "it" : "them"} or widen the date range.
                    </p>
                  )}
                  {noDays && (
                    <p className="mt-1.5 text-xs text-destructive">Pick at least one day.</p>
                  )}
                </div>

                <div>
                  <Label>Time slots</Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Your ad plays during the time-slots you pick.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DAYPARTS.map((dp) => (
                      <CheckChip
                        key={dp.id}
                        label={dp.label}
                        checked={editSlots.includes(dp.id)}
                        onClick={() =>
                          setEditSlots((prev) =>
                            prev.includes(dp.id)
                              ? prev.filter((s) => s !== dp.id)
                              : [...prev, dp.id],
                          )
                        }
                      />
                    ))}
                  </div>

                  {noSlots && (
                    <p className="mt-1.5 text-xs text-destructive">Pick at least one time slot.</p>
                  )}
                </div>

                {datesValid && dailyRate > 0 && (
                  <div className="rounded-md bg-secondary/50 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Current run · {currentDays} day{currentDays === 1 ? "" : "s"}
                      </span>
                      <span>₹{campaign.totalBudget.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span className="text-muted-foreground">
                        New run · {newDays} day{newDays === 1 ? "" : "s"}
                      </span>
                      <span>₹{newBudget.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="mt-2 flex justify-between border-t pt-2 font-medium">
                      <span>
                        {budgetDelta > 0
                          ? "To pay now"
                          : budgetDelta < 0
                            ? "Refund to wallet"
                            : "No change"}
                      </span>
                      <span
                        className={
                          budgetDelta > 0
                            ? "text-destructive"
                            : budgetDelta < 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : ""
                        }
                      >
                        ₹{Math.abs(budgetDelta).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {budgetDelta > 0
                        ? "Extra days are charged from your wallet when you save. The extension only takes effect once paid."
                        : budgetDelta < 0
                          ? "The unused days are refunded to your wallet when you save."
                          : "Your dates change with no cost impact."}
                    </p>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={doSaveSchedule}
                    disabled={
                      !datesValid || staleDays.length > 0 || editDays.length === 0 || noSlots
                    }
                  >
                    {budgetDelta > 0
                      ? `Pay ₹${budgetDelta.toLocaleString("en-IN")} & extend`
                      : budgetDelta < 0
                        ? `Save & refund ₹${(-budgetDelta).toLocaleString("en-IN")}`
                        : "Save schedule"}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}

        </DialogContent>
      </Dialog>

    </AppShell>
  );
}

const SCREEN_PAGE_SIZE = 6;

function ScreensSection({
  screens,
  selectedScreenId,
  onSelect,
}: {
  screens: typeof SCREENS;
  selectedScreenId: string | null;
  onSelect: (id: string) => void;
}) {
  const [visible, setVisible] = useState(SCREEN_PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (visible >= screens.length) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible((v) => v + SCREEN_PAGE_SIZE);
      },
      { rootMargin: "150px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, screens.length]);

  const shown = screens.slice(0, visible);

  return (
    <Card className="p-5">
      <h2 className="mb-3 font-semibold">Screens ({screens.length})</h2>
      <div className="divide-y divide-border rounded-lg border">
        {shown.map((s) => {
          const active = s.id === selectedScreenId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={cnLocal(
                "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
                active ? "bg-primary/10" : "hover:bg-secondary/40",
              )}
            >
              <div className="grid h-8 w-8 place-items-center rounded bg-secondary">
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.venue}</span>
                  <LocationTagBadge tag={s.locationTag} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.venueType} · {s.city} · {s.pincode}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {s.width}×{s.height}
              </div>
              <div className="w-16 text-right text-sm font-medium">₹{s.pricePerDay}/d</div>
            </button>
          );
        })}
        {screens.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">No screens selected.</div>
        )}
      </div>
      <div ref={sentinel} className="h-6" />
      {visible < screens.length && (
        <p className="mt-3 text-center text-xs text-muted-foreground">Loading more screens…</p>
      )}
    </Card>
  );
}

function cnLocal(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

/** Same day/slot checkbox chip used in the create-campaign wizard. */
function CheckChip({
  label,
  checked,
  disabled,
  onClick,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={cnLocal(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
        disabled
          ? "cursor-not-allowed border-dashed border-border bg-muted/30 text-muted-foreground/60"
          : checked
            ? "border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_var(--color-primary)]"
            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-secondary hover:text-foreground",
      )}
    >
      <span
        className={cnLocal(
          "grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors",
          disabled
            ? "border-muted-foreground/30 bg-transparent"
            : checked
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40 bg-background",
        )}
      >
        {checked && !disabled && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {

  return (
    <div className="rounded-md bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
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

// Suppress unused warning for InUseBadge/imports kept for optional future rendering
void InUseBadge;
