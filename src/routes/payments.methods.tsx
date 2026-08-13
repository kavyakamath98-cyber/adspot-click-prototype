import { createFileRoute } from "@tanstack/react-router";
import { Copy, CreditCard, Gift, Plus, Star, Trash2, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";
import { useState } from "react";
import { toast } from "sonner";
import { CheckoutModal } from "@/components/CheckoutModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUPONS, inr } from "@/lib/payments";

const TOPUP_PRESETS = [5000, 10000, 25000];

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

const SAVED_UPI = [{ id: "pm3", brand: "UPI", handle: "rameshkitchen@okhdfc" }];

function PaymentMethods() {
  const {
    wallet,
    creditWallet,
    recordTransaction,
    savedCards,
    removeSavedCard,
    makeCardDefault,
    promoCredits,
    promoCreditBalance,
    referralCode,
  } = useApp();
  const [amountOpen, setAmountOpen] = useState(false);
  const [amount, setAmount] = useState<number>(10000);
  const [custom, setCustom] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

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
        <Button className="gap-2" onClick={() => setAmountOpen(true)}>
          <Plus className="h-4 w-4" /> Top up wallet
        </Button>
      </Card>

      {/* Promotional credits */}
      <Card className="mb-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Promotional credits</h2>
          <span className="ml-auto text-sm font-semibold tabular-nums">
            {inr(promoCreditBalance)} available
          </span>
        </div>
        {promoCredits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have no promotional credits right now. Refer another business to earn credit.
          </p>
        ) : (
          <ul className="grid gap-2">
            {promoCredits.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(c.expiresOn).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <span className="font-semibold tabular-nums text-primary">{inr(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-secondary/50 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Your referral code
            </p>
            <p className="font-mono text-sm font-semibold">{referralCode}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-2"
            onClick={() => {
              void navigator.clipboard?.writeText(referralCode);
              toast.success("Referral code copied");
            }}
          >
            <Copy className="h-4 w-4" /> Copy
          </Button>
        </div>
      </Card>

      {/* Coupons */}
      <Card className="mb-6 p-5">
        <h2 className="mb-3 text-lg font-semibold">Available coupons</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {COUPONS.map((c) => (
            <li key={c.code} className="rounded-lg border border-dashed px-4 py-3">
              <p className="font-mono text-sm font-semibold">{c.code}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Apply a coupon on the checkout screen when paying for a campaign or topping up.
        </p>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Saved cards</h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() =>
            toast.info("Save a card by ticking 'Save this card' during checkout.")
          }
        >
          <Plus className="h-4 w-4" /> Add new
        </Button>
      </div>

      <div className="grid gap-3">
        {savedCards.length === 0 && (
          <Card className="p-4 text-sm text-muted-foreground">
            No saved cards yet. Tick “Save this card for faster checkout” while paying.
          </Card>
        )}
        {savedCards.map((m) => (
          <Card key={m.id} className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-muted-foreground">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">
                  {m.type} •••• {m.last4}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.holder} · Expires {m.expiry}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {m.isDefault ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Default
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    makeCardDefault(m.id);
                    toast.success("Default card updated");
                  }}
                >
                  <Star className="h-4 w-4" /> Make default
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  removeSavedCard(m.id);
                  toast.success("Card removed");
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {SAVED_UPI.map((m) => (
          <Card key={m.id} className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-muted-foreground">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">UPI</p>
                <p className="text-xs text-muted-foreground">{m.handle}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={amountOpen} onOpenChange={setAmountOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Top up your wallet</DialogTitle>
            <DialogDescription>
              Choose how much to add. You'll pay through the secure checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {TOPUP_PRESETS.map((p) => (
              <Button
                key={p}
                variant={amount === p && !custom ? "default" : "outline"}
                onClick={() => {
                  setAmount(p);
                  setCustom("");
                }}
              >
                ₹{p.toLocaleString("en-IN")}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom">Or enter an amount</Label>
            <Input
              id="custom"
              inputMode="numeric"
              value={custom}
              placeholder="e.g. 7500"
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 7);
                setCustom(v);
                if (v) setAmount(Number(v));
              }}
            />
          </div>
          <Button
            className="w-full"
            disabled={amount < 100}
            onClick={() => {
              setAmountOpen(false);
              setCheckoutOpen(true);
            }}
          >
            Continue to payment
          </Button>
        </DialogContent>
      </Dialog>

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        amount={amount}
        description="Wallet top-up"
        context="topup"
        onSuccess={(r) => {
          creditWallet(r.amount);
          recordTransaction({
            ...r,
            status: "success",
            purpose: "Wallet top-up",
            purposeType: "topup",
          });
          toast.success(`₹${r.amount.toLocaleString("en-IN")} added to your wallet`);
        }}
      />
    </AppShell>
  );
}
