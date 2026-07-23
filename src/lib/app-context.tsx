import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  INITIAL_CAMPAIGNS,
  INITIAL_CREATIVES,
  REJECTION_REASONS,
  type Campaign,
  type CampaignStatus,
  type Creative,
} from "./mockData";

interface AppState {
  wallet: number;
  campaigns: Campaign[];
  creatives: Creative[];
  advertiser: { name: string; email: string };
  addCampaign: (c: Campaign) => void;
  updateCampaign: (id: string, patch: Partial<Campaign>) => void;
  addCreative: (c: Creative) => Creative;
  deleteCreative: (id: string) => void;
  simulateApproval: (id: string, forceOutcome?: "approve" | "reject") => void;
  simulateReplaceCreativeReview: (
    campaignId: string,
    newCreativeId: string,
    forceOutcome?: "approve" | "reject",
  ) => void;
  chargeWallet: (amount: number) => boolean;
}

const AppCtx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState(25000);
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [creatives, setCreatives] = useState<Creative[]>(INITIAL_CREATIVES);

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
            const outcome =
              forceOutcome ??
              (Math.random() < 0.8 ? "approve" : "reject");
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
      }, 3500);
    },
    [],
  );

  const simulateReplaceCreativeReview = useCallback(
    (campaignId: string, newCreativeId: string, forceOutcome?: "approve" | "reject") => {
      // Mark new creative pending on the campaign, old stays live
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
            prev.map((cr) => (cr.id === newCreativeId ? { ...cr, status: "approved" } : cr)),
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

  const value = useMemo<AppState>(
    () => ({
      wallet,
      campaigns,
      creatives,
      advertiser: { name: "Ramesh's Kitchen", email: "ramesh@rameshkitchen.in" },
      addCampaign,
      updateCampaign,
      addCreative,
      deleteCreative,
      simulateApproval,
      simulateReplaceCreativeReview,
      chargeWallet,
    }),
    [
      wallet,
      campaigns,
      creatives,
      addCampaign,
      updateCampaign,
      addCreative,
      deleteCreative,
      simulateApproval,
      simulateReplaceCreativeReview,
      chargeWallet,
    ],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
