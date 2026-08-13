import type { PaymentTransaction } from "./payments";
import { SEED_TRANSACTIONS, newRefundId } from "./payments";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  INITIAL_CAMPAIGNS,
  INITIAL_CREATIVES,
  PLATFORM_CREATIVES,
  REJECTION_REASONS,
  type Campaign,
  type CampaignStatus,
  type CampaignRefund,
  type Creative,
  type PauseDuration,
  type ReviewLogEntry,
} from "./mockData";

export interface PauseDetail {
  duration: PauseDuration;
  reason?: string;
}

export interface RefundInput {
  amount: number;
  destination: "wallet" | "bank";
  bank?: CampaignRefund["bank"];
}
import { migrateTag, restrictionFor } from "@/data/industryTaxonomy";

/** Ensure every seeded creative carries a valid Industry / Sub-Industry pair. */
const MIGRATED_CREATIVES: Creative[] = INITIAL_CREATIVES.map((c) => ({
  ...c,
  ...migrateTag(c.industry, c.subIndustry),
}));

export interface ModerationDecision {
  decision: "approve" | "reject";
  reason?: string;
  note?: string | null;
  reviewer: string;
}

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
  refundToWallet: (amount: number) => void;
  pauseCampaign: (id: string, detail?: PauseDetail) => void;
  resumeCampaign: (id: string, mode: "keep_end" | "shift_end") => void;
  stopCampaign: (id: string) => number; // returns refundable amount (claim via requestRefund)
  requestRefund: (id: string, input: RefundInput) => CampaignRefund;
  /** Every creative on the platform, across all advertiser accounts. */
  allCreatives: Creative[];
  /** Moderator decision from the system-admin approval console. */
  reviewCreative: (id: string, input: ModerationDecision) => void;
  /** Successful mock-gateway payments, newest first. */
  transactions: PaymentTransaction[];
  recordTransaction: (t: PaymentTransaction) => void;
  /** Credit money into the wallet (successful top-up). */
  creditWallet: (amount: number) => void;
}

const AppCtx = createContext<AppState | null>(null);

const NEW_ADVERTISER = { name: "Priya's Boutique", email: "priya@priyasboutique.in" };
const RETURNING_ADVERTISER = { name: "Ramesh's Kitchen", email: "ramesh@rameshkitchen.in" };

export function AppProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoModeState] = useState<DemoMode>("returning");
  const [wallet, setWallet] = useState(25000);
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [creatives, setCreatives] = useState<Creative[]>(MIGRATED_CREATIVES);
  const [otherCreatives, setOtherCreatives] = useState<Creative[]>(PLATFORM_CREATIVES);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(SEED_TRANSACTIONS);

  const recordTransaction = useCallback((t: PaymentTransaction) => {
    setTransactions((prev) => [t, ...prev]);
  }, []);

  const creditWallet = useCallback((amount: number) => {
    setWallet((w) => w + amount);
  }, []);

  const setDemoMode = useCallback((m: DemoMode) => {
    setDemoModeState(m);
    if (m === "new") {
      setCampaigns([]);
      setCreatives([]);
      setTransactions([]);
      setWallet(25000);
    } else {
      setCampaigns(INITIAL_CAMPAIGNS);
      setCreatives(MIGRATED_CREATIVES);
      setTransactions(SEED_TRANSACTIONS);
      setWallet(25000);
    }
  }, []);



  const addCampaign = useCallback((c: Campaign) => {
    const stamped = { ...c, updatedAt: c.updatedAt ?? new Date().toISOString() };
    setCampaigns((prev) => [stamped, ...prev]);
  }, []);

  const updateCampaign = useCallback((id: string, patch: Partial<Campaign>) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: patch.updatedAt ?? new Date().toISOString() } : c,
      ),
    );
  }, []);

  const refundToWallet = useCallback((amount: number) => {
    setWallet((w) => w + Math.max(0, amount));
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

  const reviewCreative = useCallback(
    (id: string, input: ModerationDecision) => {
      const at = new Date().toISOString();
      const entry: ReviewLogEntry = {
        action: input.decision === "approve" ? "approved" : "rejected",
        reason: input.decision === "reject" ? input.reason : undefined,
        note: input.decision === "reject" ? (input.note ?? null) : undefined,
        by: input.reviewer,
        at,
      };
      const apply = (cr: Creative): Creative =>
        cr.id !== id
          ? cr
          : input.decision === "approve"
            ? {
                ...cr,
                status: "approved",
                previouslyApproved: true,
                rejectionReason: undefined,
                rejectionNote: null,
                reviewedBy: input.reviewer,
                reviewedAt: at,
                reviewLog: [...(cr.reviewLog ?? []), entry],
              }
            : {
                ...cr,
                status: "rejected",
                rejectionReason: input.reason,
                rejectionNote: input.reason === "Other" ? (input.note ?? "") : null,
                reviewedBy: input.reviewer,
                reviewedAt: at,
                reviewLog: [...(cr.reviewLog ?? []), entry],
              };

      setCreatives((prev) => prev.map(apply));
      setOtherCreatives((prev) => prev.map(apply));

      // Keep linked campaigns of the signed-in advertiser in sync.
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.creativeId !== id && c.pendingCreativeId !== id) return c;
          if (input.decision === "reject") {
            if (c.pendingCreativeId === id) {
              return {
                ...c,
                pendingCreativeId: undefined,
                rejectedCreativeId: id,
                rejectedCreativeReason: input.reason,
              };
            }
            return c.status === "live" || c.status === "paused" || c.status === "completed"
              ? c
              : { ...c, status: "rejected" as CampaignStatus, rejectionReason: input.reason };
          }
          if (c.pendingCreativeId === id) {
            return { ...c, creativeId: id, pendingCreativeId: undefined };
          }
          if (c.status === "pending_approval") {
            return { ...c, paymentUnlocked: true, awaitingPayment: true, rejectionReason: undefined };
          }
          return c;
        }),
      );
    },
    [],
  );

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
      const forcedTag = restrictionFor(creative?.subIndustry);
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
      const forcedTag = restrictionFor(creative?.subIndustry);
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
              c.id === campaignId && c.creativeId === creativeId
                ? { ...c, paymentUnlocked: true, awaitingPayment: true, rejectionReason: undefined }
                : c,
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
              c.id === campaignId && c.creativeId === creativeId
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
        prev.map((c) =>
          c.id === campaignId
            ? {
                ...c,
                pendingCreativeId: newCreativeId,
                rejectedCreativeId: undefined,
                rejectedCreativeReason: undefined,
              }
            : c,
        ),
      );
      setCreatives((prev) =>
        prev.map((cr) => (cr.id === newCreativeId ? { ...cr, status: "pending" } : cr)),
      );
      const cr = creatives.find((c) => c.id === newCreativeId);
      const forcedTag = restrictionFor(cr?.subIndustry);
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
            prev.map((c) =>
              c.id === campaignId
                ? {
                    ...c,
                    pendingCreativeId: undefined,
                    rejectedCreativeId: newCreativeId,
                    rejectedCreativeReason: reason,
                  }
                : c,
            ),
          );
        }
      }, 4000);
    },
    [creatives],
  );

  const pauseCampaign = useCallback((id: string, detail?: PauseDetail) => {
    const pausedAt = new Date().toISOString().slice(0, 10);
    const duration: PauseDuration = detail?.duration ?? { value: null, unit: "indefinite" };
    let resumeOn: string | null = null;
    if (duration.unit !== "indefinite" && duration.value) {
      const d = new Date();
      if (duration.unit === "days") d.setDate(d.getDate() + duration.value);
      if (duration.unit === "weeks") d.setDate(d.getDate() + duration.value * 7);
      if (duration.unit === "months") d.setMonth(d.getMonth() + duration.value);
      resumeOn = d.toISOString().slice(0, 10);
    }
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "paused" as CampaignStatus,
              pausedAt,
              pauseDuration: duration,
              resumeOn,
              pauseReason: detail?.reason?.trim() ? detail.reason.trim() : undefined,
            }
          : c,
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
        return {
          ...c,
          status: "live" as CampaignStatus,
          pausedAt: undefined,
          pauseDuration: undefined,
          resumeOn: undefined,
          pauseReason: undefined,
          totalPausedDays,
          endDate,
        };
      }),
    );
  }, []);

  const stopCampaign = useCallback(
    (id: string) => {
      let refundable = 0;
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const remaining = Math.max(0, c.totalBudget - c.spendToDate);
          refundable = Math.round(remaining * 0.9);
          return {
            ...c,
            status: "completed" as CampaignStatus,
            stoppedAt: new Date().toISOString().slice(0, 10),
            refundableAmount: refundable,
          };
        }),
      );
      return refundable;
    },
    [],
  );

  const requestRefund = useCallback(
    (id: string, input: RefundInput) => {
      const referenceId = `RFD-${Date.now().toString(36).toUpperCase()}`;
      const original = campaigns.find((c) => c.id === id);
      const refund: CampaignRefund = {
        amount: input.amount,
        destination: input.destination,
        status: input.destination === "wallet" ? "Completed" : "Processing",
        referenceId,
        refundId: newRefundId(),
        originalPaymentId: original?.paymentId,
        date: new Date().toISOString().slice(0, 10),
        bank: input.bank,
      };
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, refund, refundableAmount: 0 } : c)),
      );
      if (input.destination === "wallet") setWallet((w) => w + input.amount);
      return refund;
    },
    [campaigns],
  );


  const value = useMemo<AppState>(
    () => ({
      wallet,
      campaigns,
      creatives,
      advertiser: demoMode === "new" ? NEW_ADVERTISER : RETURNING_ADVERTISER,
      demoMode,
      setDemoMode,
      addCampaign,
      simulateCreativeReviewForCampaign,
      updateCampaign,
      addCreative,
      markCreativeApproved,
      deleteCreative,
      simulateApproval,
      cancelPendingCampaign,
      simulateReplaceCreativeReview,
      chargeWallet,
      refundToWallet,
      pauseCampaign,
      resumeCampaign,
      stopCampaign,
      requestRefund,
      transactions,
      recordTransaction,
      creditWallet,
      allCreatives: [...creatives, ...otherCreatives],
      reviewCreative,
    }),
    [
      wallet,
      campaigns,
      creatives,
      demoMode,
      setDemoMode,
      addCampaign,

      simulateCreativeReviewForCampaign,
      updateCampaign,
      addCreative,
      markCreativeApproved,
      deleteCreative,
      simulateApproval,
      cancelPendingCampaign,
      simulateReplaceCreativeReview,
      chargeWallet,
      refundToWallet,
      pauseCampaign,
      resumeCampaign,
      stopCampaign,
      requestRefund,
      transactions,
      recordTransaction,
      creditWallet,
      otherCreatives,
      reviewCreative,
    ],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
