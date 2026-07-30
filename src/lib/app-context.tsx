import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  INITIAL_CAMPAIGNS,
  INITIAL_CREATIVES,
  REJECTION_REASONS,
  type Campaign,
  type CampaignStatus,
  type Creative,
} from "./mockData";

export type DemoMode = "returning" | "new";

interface AppState {
  wallet: number;
  campaigns: Campaign[];
  creatives: Creative[];
  advertiser: { name: string; email: string };
  demoMode: DemoMode;
  setDemoMode: (m: DemoMode) => void;
  addCampaign: (c: Campaign) => void;
  updateCampaign: (id: string, patch: Partial<Campaign>) => void;
  addCreative: (c: Creative) => Creative;
  markCreativeApproved: (id: string) => void;
  deleteCreative: (id: string) => void;
  simulateApproval: (
    id: string,
    creativeId?: string,
    forceOutcome?: "approve" | "reject",
  ) => void;
  cancelPendingCampaign: (id: string) => number; // full refund, no fee
  simulateCreativeReviewForCampaign: (
    campaignId: string,
    creativeId: string,
    forceOutcome?: "approve" | "reject",
  ) => void;

  simulateReplaceCreativeReview: (
    campaignId: string,
    newCreativeId: string,
    forceOutcome?: "approve" | "reject",
  ) => void;
  chargeWallet: (amount: number) => boolean;
  pauseCampaign: (id: string) => void;
  resumeCampaign: (id: string, mode: "keep_end" | "shift_end") => void;
  stopCampaign: (id: string) => number; // returns refund amount
}

const AppCtx = createContext<AppState | null>(null);

const NEW_ADVERTISER = { name: "Priya's Boutique", email: "priya@priyasboutique.in" };
const RETURNING_ADVERTISER = { name: "Ramesh's Kitchen", email: "ramesh@rameshkitchen.in" };

export function AppProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoModeState] = useState<DemoMode>("returning");
  const [wallet, setWallet] = useState(25000);
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [creatives, setCreatives] = useState<Creative[]>(INITIAL_CREATIVES);

  const setDemoMode = useCallback((m: DemoMode) => {
    setDemoModeState(m);
    if (m === "new") {
      setCampaigns([]);
      setCreatives([]);
      setWallet(25000);
    } else {
      setCampaigns(INITIAL_CAMPAIGNS);
      setCreatives(INITIAL_CREATIVES);
      setWallet(25000);
    }
  }, []);



  const addCampaign = useCallback((c: Campaign) => {
    setCampaigns((prev) => [c, ...prev]);
  }, []);

  const updateCampaign = useCallback((id: string, patch: Partial<Campaign>) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const addCreative = useCallback((c: Creative) => {
    setCreatives((prev) => [c, ...prev]);
    return c;
  }, []);

  const markCreativeApproved = useCallback((id: string) => {
    setCreatives((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "approved", previouslyApproved: true } : c)),
    );
  }, []);

  const deleteCreative = useCallback((id: string) => {
    setCreatives((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const chargeWallet = useCallback((amount: number) => {
    let ok = false;
    setWallet((w) => {
      if (w >= amount) {
        ok = true;
        return w - amount;
      }
      return w;
    });
    return ok;
  }, []);

  const simulateApproval = useCallback(
    (id: string, creativeIdArg?: string, forceOutcome?: "approve" | "reject") => {
      // Capture the creative now — reading it inside the delayed callback would
      // see a stale campaign list and silently skip the creative update.
      const creativeId = creativeIdArg ?? campaigns.find((c) => c.id === id)?.creativeId;
      const creative = creatives.find((c) => c.id === creativeId);
      const forcedTag =
        creative?.contentTag === "Alcohol"
          ? "Alcohol or tobacco promotion"
          : creative?.contentTag === "Adult"
            ? "Explicit or inappropriate content"
            : undefined;
      const outcome: "approve" | "reject" = forcedTag
        ? "reject"
        : (forceOutcome ?? (Math.random() < 0.8 ? "approve" : "reject"));
      const reason =
        forcedTag ??
        REJECTION_REASONS[Math.floor(Math.random() * (REJECTION_REASONS.length - 1))];

      setTimeout(() => {
        setCampaigns((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            if (outcome === "reject") {
              return { ...c, status: "rejected" as CampaignStatus, rejectionReason: reason };
            }
            const now = new Date();
            const start = new Date(c.startDate);
            const status: CampaignStatus = start <= now ? "live" : "approved_scheduled";
            return { ...c, status, rejectionReason: undefined };
          }),
        );
        if (creativeId) {
          setCreatives((prev) =>
            prev.map((cr) =>
              cr.id !== creativeId
                ? cr
                : outcome === "approve"
                  ? {
                      ...cr,
                      status: "approved" as const,
                      rejectionReason: undefined,
                      previouslyApproved: true,
                    }
                  : { ...cr, status: "rejected" as const, rejectionReason: reason },
            ),
          );
        }
      }, 3500);
    },
    [campaigns, creatives],
  );

  // New-creative flow: campaign is submitted before payment. The creative goes
  // to review; on approval we unlock payment, on rejection the campaign is
  // rejected with a reason so the user can upload a compliant creative.
  const simulateCreativeReviewForCampaign = useCallback(
    (campaignId: string, creativeId: string, forceOutcome?: "approve" | "reject") => {
      const creative = creatives.find((c) => c.id === creativeId);
      const forcedTag =
        creative?.contentTag === "Alcohol"
          ? "Alcohol or tobacco promotion"
          : creative?.contentTag === "Adult"
            ? "Explicit or inappropriate content"
            : undefined;
      const outcome: "approve" | "reject" = forcedTag
        ? "reject"
        : (forceOutcome ?? (Math.random() < 0.8 ? "approve" : "reject"));
      const reason =
        forcedTag ??
        REJECTION_REASONS[Math.floor(Math.random() * (REJECTION_REASONS.length - 1))];

      setTimeout(() => {
        if (outcome === "approve") {
          setCreatives((prev) =>
            prev.map((cr) =>
              cr.id === creativeId
                ? { ...cr, status: "approved" as const, rejectionReason: undefined, previouslyApproved: true }
                : cr,
            ),
          );
          setCampaigns((prev) =>
            prev.map((c) =>
              c.id === campaignId ? { ...c, paymentUnlocked: true, rejectionReason: undefined } : c,
            ),
          );
        } else {
          setCreatives((prev) =>
            prev.map((cr) =>
              cr.id === creativeId ? { ...cr, status: "rejected" as const, rejectionReason: reason } : cr,
            ),
          );
          setCampaigns((prev) =>
            prev.map((c) =>
              c.id === campaignId
                ? { ...c, status: "rejected" as CampaignStatus, rejectionReason: reason }
                : c,
            ),
          );
        }
      }, 4000);
    },
    [creatives],
  );

  const cancelPendingCampaign = useCallback(
    (id: string) => {
      const camp = campaigns.find((c) => c.id === id);
      const refund = camp ? Math.max(0, camp.totalBudget - camp.spendToDate) : 0;
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "completed" as CampaignStatus } : c)),
      );
      setWallet((w) => w + refund);
      return refund;
    },
    [campaigns],
  );



  const simulateReplaceCreativeReview = useCallback(
    (campaignId: string, newCreativeId: string, forceOutcome?: "approve" | "reject") => {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, pendingCreativeId: newCreativeId } : c)),
      );
      setCreatives((prev) =>
        prev.map((cr) => (cr.id === newCreativeId ? { ...cr, status: "pending" } : cr)),
      );
      const cr = creatives.find((c) => c.id === newCreativeId);
      const forcedTag =
        cr?.contentTag === "Alcohol"
          ? "Alcohol or tobacco promotion"
          : cr?.contentTag === "Adult"
            ? "Explicit or inappropriate content"
            : undefined;
      setTimeout(() => {
        const outcome = forcedTag
          ? "reject"
          : (forceOutcome ?? (Math.random() < 0.85 ? "approve" : "reject"));
        if (outcome === "approve") {
          setCreatives((prev) =>
            prev.map((cr) =>
              cr.id === newCreativeId
                ? { ...cr, status: "approved", previouslyApproved: true }
                : cr,
            ),
          );
          setCampaigns((prev) =>
            prev.map((c) =>
              c.id === campaignId
                ? { ...c, creativeId: newCreativeId, pendingCreativeId: undefined }
                : c,
            ),
          );
        } else {
          const reason =
            forcedTag ??
            REJECTION_REASONS[Math.floor(Math.random() * (REJECTION_REASONS.length - 1))];
          setCreatives((prev) =>
            prev.map((cr) =>
              cr.id === newCreativeId
                ? { ...cr, status: "rejected", rejectionReason: reason }
                : cr,
            ),
          );
          setCampaigns((prev) =>
            prev.map((c) => (c.id === campaignId ? { ...c, pendingCreativeId: undefined } : c)),
          );
        }
      }, 4000);
    },
    [creatives],
  );

  const pauseCampaign = useCallback((id: string) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: "paused", pausedAt: new Date().toISOString().slice(0, 10) } : c,
      ),
    );
  }, []);

  const resumeCampaign = useCallback((id: string, mode: "keep_end" | "shift_end") => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        let endDate = c.endDate;
        let totalPausedDays = c.totalPausedDays ?? 0;
        if (c.pausedAt) {
          const pausedDays = Math.max(
            0,
            Math.round((Date.now() - new Date(c.pausedAt).getTime()) / 86400000),
          );
          totalPausedDays += pausedDays;
          if (mode === "shift_end") {
            const d = new Date(c.endDate);
            d.setDate(d.getDate() + pausedDays);
            endDate = d.toISOString().slice(0, 10);
          }
        }
        return { ...c, status: "live", pausedAt: undefined, totalPausedDays, endDate };
      }),
    );
  }, []);

  const stopCampaign = useCallback(
    (id: string) => {
      let refund = 0;
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const remaining = Math.max(0, c.totalBudget - c.spendToDate);
          refund = Math.round(remaining * 0.9);
          return { ...c, status: "completed" };
        }),
      );
      setWallet((w) => w + refund);
      return refund;
    },
    [],
  );

  const value = useMemo<AppState>(
    () => ({
      wallet,
      campaigns,
      creatives,
      advertiser: demoMode === "new" ? NEW_ADVERTISER : RETURNING_ADVERTISER,
      demoMode,
      setDemoMode,
      cancelPendingCampaign,
      simulateCreativeReviewForCampaign,
      updateCampaign,
      addCreative,
      markCreativeApproved,
      deleteCreative,
      simulateApproval,
      cancelPendingCampaign,
      simulateReplaceCreativeReview,
      chargeWallet,
      pauseCampaign,
      resumeCampaign,
      stopCampaign,
    }),
    [
      wallet,
      campaigns,
      creatives,
      demoMode,
      setDemoMode,
      cancelPendingCampaign,
      simulateCreativeReviewForCampaign,
      updateCampaign,
      addCreative,
      markCreativeApproved,
      deleteCreative,
      simulateApproval,
      cancelPendingCampaign,
      simulateReplaceCreativeReview,
      chargeWallet,
      pauseCampaign,
      resumeCampaign,
      stopCampaign,
    ],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
