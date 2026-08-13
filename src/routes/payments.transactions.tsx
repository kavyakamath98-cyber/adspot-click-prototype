import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Receipt, RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { receiptHtml } from "@/components/CheckoutModal";
import { useApp } from "@/lib/app-context";
import { methodLabel } from "@/lib/payments";
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

type Row = {
  id: string;
  date: string;
  kind: "topup" | "campaign" | "refund";
  label: string;
  sublabel: string;
  amount: number;
  status: "Success" | "Completed" | "Processing";
  receipt?: () => void;
};

const STATUS_STYLES: Record<Row["status"], string> = {
  Success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Processing: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

function openReceipt(html: string) {
  const w = window.open("", "_blank", "width=520,height=720");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
}

function TransactionHistory() {
  const { transactions, campaigns } = useApp();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | Row["kind"]>("all");

  const rows = useMemo<Row[]>(() => {
    const payments: Row[] = transactions.map((t) => ({
      id: t.paymentId,
      date: t.timestamp,
      kind: t.purposeType,
      label: t.purpose,
      sublabel: `${methodLabel[t.method]} · ${t.methodDetail} · ${t.paymentId}`,
      amount: t.purposeType === "topup" ? t.total : -t.total,
      status: "Success",
      receipt: () =>
        openReceipt(
          receiptHtml({
            paymentId: t.paymentId,
            orderId: t.orderId,
            amount: t.amount,
            gst: t.gst,
            total: t.total,
            method: t.method,
            methodDetail: t.methodDetail,
            timestamp: t.timestamp,
            description: t.purpose,
          }),
        ),
    }));

    const refunds: Row[] = campaigns
      .filter((c) => c.refund)
      .map((c) => {
        const r = c.refund!;
        const linked = r.originalPaymentId ? ` · against ${r.originalPaymentId}` : "";
        return {
          id: r.refundId ?? r.referenceId,
          date: r.date,
          kind: "refund" as const,
          label: `Refund · ${c.name}`,
          sublabel: `${r.destination === "wallet" ? "Credited to wallet" : "Bank transfer"} · ${
            r.refundId ?? r.referenceId
          }${linked}`,
          amount: r.amount,
          status: r.status,
        };
      });

    return [...payments, ...refunds].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [transactions, campaigns]);

  const filtered = rows.filter((r) => {
    if (kind !== "all" && r.kind !== kind) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${r.label} ${r.sublabel} ${r.id}`.toLowerCase().includes(q);
  });

  return (
    <AppShell title="Transaction History">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-foreground">Recent activity</h2>
        <span className="text-sm text-muted-foreground">
          Every wallet top-up, campaign payment and refund in one place.
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by campaign, payment ID or method"
          className="h-9 max-w-xs"
        />
        <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All activity</SelectItem>
            <SelectItem value="topup">Wallet top-ups</SelectItem>
            <SelectItem value="campaign">Campaign payments</SelectItem>
            <SelectItem value="refund">Refunds</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="divide-y divide-border">
        {filtered.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No transactions match your filters yet.
          </p>
        )}
        {filtered.map((t) => {
          const Icon =
            t.kind === "topup" ? ArrowDownLeft : t.kind === "refund" ? RefreshCcw : ArrowUpRight;
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
                <p className="truncate text-xs text-muted-foreground">{t.sublabel}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  STATUS_STYLES[t.status],
                )}
              >
                {t.status}
              </span>
              <p
                className={cn(
                  "w-28 shrink-0 text-right text-sm font-semibold tabular-nums",
                  positive ? "text-emerald-700 dark:text-emerald-300" : "text-foreground",
                )}
              >
                {positive ? "+" : "−"}₹{Math.abs(t.amount).toLocaleString("en-IN")}
              </p>
              <div className="w-24 shrink-0 text-right">
                {t.receipt && (
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={t.receipt}>
                    <Receipt className="h-3.5 w-3.5" /> Receipt
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </AppShell>
  );
}
