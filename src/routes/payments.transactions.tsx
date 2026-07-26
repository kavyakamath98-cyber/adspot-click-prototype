import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/payments/transactions")({
  head: () => ({
    meta: [
      { title: "Transaction History · Additv" },
      { name: "description", content: "Review wallet top-ups, campaign spends and refunds." },
      { property: "og:title", content: "Transaction History · Additv" },
      { property: "og:description", content: "Review wallet top-ups, campaign spends and refunds." },
    ],
  }),
  component: TransactionHistory,
});

type Txn = {
  id: string;
  date: string;
  type: "topup" | "spend" | "refund";
  label: string;
  amount: number;
};

const MOCK: Txn[] = [
  { id: "t1", date: "2026-07-24", type: "topup", label: "Wallet top-up · Visa •••• 4242", amount: 10000 },
  { id: "t2", date: "2026-07-22", type: "spend", label: "Campaign spend · Weekend Dinner Combo", amount: -3200 },
  { id: "t3", date: "2026-07-20", type: "spend", label: "Campaign spend · Lunch Thali Promo", amount: -1800 },
  { id: "t4", date: "2026-07-18", type: "refund", label: "Refund · Stopped campaign — Diwali Sweets", amount: 2400 },
  { id: "t5", date: "2026-07-15", type: "topup", label: "Wallet top-up · UPI", amount: 15000 },
  { id: "t6", date: "2026-07-10", type: "spend", label: "Campaign spend · Biryani Weekend", amount: -2600 },
];

function TransactionHistory() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Transaction history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every wallet top-up, campaign spend and refund in one place.
        </p>
      </div>

      <Card className="divide-y divide-border">
        {MOCK.map((t) => {
          const Icon = t.type === "topup" ? ArrowDownLeft : t.type === "refund" ? RefreshCcw : ArrowUpRight;
          const positive = t.amount > 0;
          return (
            <div key={t.id} className="flex items-center gap-4 p-4">
              <div
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                  positive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <p
                className={cn(
                  "shrink-0 text-sm font-semibold tabular-nums",
                  positive ? "text-emerald-700 dark:text-emerald-300" : "text-foreground",
                )}
              >
                {positive ? "+" : "−"}₹{Math.abs(t.amount).toLocaleString("en-IN")}
              </p>
            </div>
          );
        })}
      </Card>
    </AppShell>
  );
}
