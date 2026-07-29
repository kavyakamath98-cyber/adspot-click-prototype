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
  simulateApproval: (id: string, forceOutcome?: "approve" | "reject") => void;
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
    (id: string, forceOutcome?: "approve" | "reject") => {
      setTimeout(() => {
        setCampaigns((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            const outcome = forceOutcome ?? (Math.random() < 0.8 ? "approve" : "reject");
            if (outcome === "reject") {
              const reason =
                REJECTION_REASONS[Math.floor(Math.random() * (REJECTION_REASONS.length - 1))];
              return { ...c, status: "rejected" as CampaignStatus, rejectionReason: reason };
            }
            const now = new Date();
            const start = new Date(c.startDate);
            const status: CampaignStatus = start <= now ? "live" : "approved_scheduled";
            return { ...c, status, rejectionReason: undefined };
          }),
        );
        // Mark associated creative as previously-approved too
        setCreatives((prev) => {
          const camp = campaigns.find((cx) => cx.id === id);
          if (!camp) return prev;
          return prev.map((cr) =>
            cr.id === camp.creativeId ? { ...cr, previouslyApproved: true } : cr,
          );
        });
      }, 3500);
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
      setTimeout(() => {
        const outcome = forceOutcome ?? (Math.random() < 0.85 ? "approve" : "reject");
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
    [],
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
      addCampaign,
      updateCampaign,
      addCreative,
      markCreativeApproved,
      deleteCreative,
      simulateApproval,
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
      addCampaign,
      updateCampaign,
      addCreative,
      markCreativeApproved,
      deleteCreative,
      simulateApproval,
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
