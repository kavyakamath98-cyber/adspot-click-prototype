import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Plus, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";

export const Route = createFileRoute("/payments/methods")({
  head: () => ({
    meta: [
      { title: "Payment Methods · Additv" },
      { name: "description", content: "Manage your wallet and saved payment methods." },
      { property: "og:title", content: "Payment Methods · Additv" },
      { property: "og:description", content: "Manage your wallet and saved payment methods." },
    ],
  }),
  component: PaymentMethods,
});

const SAVED_METHODS = [
  { id: "pm1", brand: "Visa", last4: "4242", exp: "08/28", default: true },
  { id: "pm2", brand: "Mastercard", last4: "1881", exp: "02/27", default: false },
  { id: "pm3", brand: "UPI", last4: "rameshkitchen@okhdfc", exp: "", default: false },
];

function PaymentMethods() {
  const { wallet } = useApp();

  return (
    <AppShell title="Payment Methods">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-foreground">Wallet & saved methods</h2>
        <span className="text-sm text-muted-foreground">
          Your Additv wallet funds your campaigns. Top up any time using a saved method.
        </span>
      </div>

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Wallet balance</p>
            <p className="text-3xl font-semibold">₹{wallet.toLocaleString("en-IN")}</p>
          </div>
        </div>
        <Button
          className="gap-2"
          onClick={() => toast.info("Top-up is disabled in this prototype.")}
        >
          <Plus className="h-4 w-4" /> Top up wallet
        </Button>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Saved methods</h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => toast.info("Adding new payment methods is disabled in this prototype.")}
        >
          <Plus className="h-4 w-4" /> Add new
        </Button>
      </div>

      <div className="grid gap-3">
        {SAVED_METHODS.map((m) => (
          <Card key={m.id} className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-muted-foreground">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">
                  {m.brand} {m.brand === "UPI" ? "" : `•••• ${m.last4}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.brand === "UPI" ? m.last4 : `Expires ${m.exp}`}
                </p>
              </div>
            </div>
            {m.default && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Default
              </span>
            )}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
