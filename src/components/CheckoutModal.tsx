import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Download,
  Gift,
  Loader2,
  QrCode,
  ShieldCheck,
  Smartphone,
  Tag,
  Wallet as WalletIcon,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import {
  BANKS,
  COUPONS,
  DEMO_FAILURE_CARD,
  DEMO_FAILURE_UPI,
  DEMO_SUCCESS_CARD,
  DEMO_SUCCESS_UPI,
  PAY_WALLETS,
  UPI_APPS,
  applyCoupon,

  cvvLength,
  detectCardType,
  expiryError,
  formatCardNumber,
  formatExpiry,
  gstOn,
  inr,
  isValidUpi,
  luhnValid,
  methodLabel,
  newCardId,
  newOrderId,
  newPaymentId,
  resolveOutcome,
  type CouponContext,
  type FailureReason,
  type PayMethod,
  type PaymentOutcome,
  type SavedCard,
} from "@/lib/payments";

export interface CheckoutSuccess {
  paymentId: string;
  orderId: string;
  /** Base amount after any coupon discount. */
  amount: number;
  gst: number;
  total: number;
  couponCode?: string;
  discount?: number;
  promoCreditUsed?: number;
  method: PayMethod;
  methodDetail: string;
  timestamp: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Base amount before GST. */
  amount: number;
  /** Order description shown in the summary panel. */
  description: string;
  /** Called only after a simulated successful payment. */
  onSuccess: (result: CheckoutSuccess) => void;
  /** What the payment is for — drives coupon eligibility and wallet availability. */
  context?: CouponContext;
}

const MERCHANT = "AdSpot Click";
const SESSION_SECONDS = 598; // 09:58

type Phase = "form" | "processing" | "success" | "failure" | "expired";

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;


export function CheckoutModal({
  open,
  onOpenChange,
  amount,
  description,
  onSuccess,
  context = "campaign",
}: Props) {
  const {
    wallet,
    chargeWallet,
    savedCards,
    addSavedCard,
    promoCreditBalance,
    consumePromoCredit,
  } = useApp();

  const [orderId, setOrderId] = useState(newOrderId);
  const [phase, setPhase] = useState<Phase>("form");
  const [method, setMethod] = useState<PayMethod>(context === "topup" ? "upi" : "additv");
  const [seconds, setSeconds] = useState(SESSION_SECONDS);
  const [confirmClose, setConfirmClose] = useState(false);

  // Coupons & promotional credits
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponListOpen, setCouponListOpen] = useState(false);
  const [usePromoCredit, setUsePromoCredit] = useState(false);

  // Method fields
  const [upiId, setUpiId] = useState("");
  const [upiTouched, setUpiTouched] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [savedCvv, setSavedCvv] = useState("");
  const [bankQuery, setBankQuery] = useState("");
  const [bank, setBank] = useState<string | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [payWallet, setPayWallet] = useState<string | null>(null);

  // Demo controls
  const [demoOpen, setDemoOpen] = useState(false);
  const [forced, setForced] = useState<PaymentOutcome | null>(null);

  const [result, setResult] = useState<CheckoutSuccess | null>(null);
  const [failReason, setFailReason] = useState<FailureReason | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const walletAllowed = context !== "topup";

  // Money math: coupon discounts the base, GST applies on the discounted base,
  // promotional credit then comes off the payable total.
  const netBase = Math.max(0, amount - discount);
  const gst = gstOn(netBase);
  const grossTotal = netBase + gst;
  const creditApplied = usePromoCredit ? Math.min(promoCreditBalance, grossTotal) : 0;
  const total = Math.max(0, grossTotal - creditApplied);

  const selectedCard: SavedCard | null =
    savedCards.find((c) => c.id === savedCardId) ?? null;

  // A fresh order id per checkout session; retries reuse it (never double-charge).
  useEffect(() => {
    if (!open) return;
    setOrderId(newOrderId());
    setPhase("form");
    setSeconds(SESSION_SECONDS);
    setResult(null);
    setFailReason(null);
    setConfirmClose(false);
    setForced(null);
    setUpiTouched(false);
    setCouponInput("");
    setCouponCode(null);
    setDiscount(0);
    setCouponError(null);
    setUsePromoCredit(false);
    setSavedCvv("");
    setSavedCardId(savedCards.find((c) => c.isDefault)?.id ?? savedCards[0]?.id ?? null);
    setMethod(context === "topup" ? "upi" : "additv");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || phase === "success" || phase === "expired") return;
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setPhase("expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [open, phase]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const cardType = detectCardType(cardNumber);
  const cardDigits = cardNumber.replace(/\D/g, "");
  const cardExpiryErr = expiry ? expiryError(expiry) : null;

  const walletShort = walletAllowed && wallet < total;

  const valid = useMemo(() => {
    if (method === "additv") return walletAllowed && wallet >= total;
    if (method === "upi") return isValidUpi(upiId);
    if (method === "card") {
      if (selectedCard) return savedCvv.length === cvvLength(selectedCard.type);
      return (
        luhnValid(cardDigits) &&
        !expiryError(expiry) &&
        cvv.length === cvvLength(cardType) &&
        cardName.trim().length >= 3
      );
    }
    if (method === "netbanking") return !!bank;
    return !!payWallet;
  }, [
    method,
    walletAllowed,
    wallet,
    total,
    upiId,
    selectedCard,
    savedCvv,
    cardDigits,
    expiry,
    cvv,
    cardType,
    cardName,
    bank,
    payWallet,
  ]);

  const methodDetail = () => {
    if (method === "additv") return "Additv wallet";
    if (method === "upi") return upiId.trim();
    if (method === "card")
      return selectedCard
        ? `${selectedCard.type} •••• ${selectedCard.last4}`
        : `${cardType} •••• ${cardDigits.slice(-4)}`;
    if (method === "netbanking") return bank ?? "Bank";
    return payWallet ?? "Wallet";
  };

  const onApplyCoupon = () => {
    const res = applyCoupon(couponInput, amount, context);
    if (!res.ok) {
      setCouponError(res.error);
      setCouponCode(null);
      setDiscount(0);
      return;
    }
    setCouponError(null);
    setCouponCode(res.coupon.code);
    setDiscount(res.discount);
  };

  const clearCoupon = () => {
    setCouponCode(null);
    setDiscount(0);
    setCouponInput("");
    setCouponError(null);
  };

  const pay = () => {
    if (!valid || phase === "processing") return;
    setPhase("processing");
    const delay = 1500 + Math.random() * 1500;
    timer.current = setTimeout(() => {
      const { outcome, reason } = resolveOutcome({
        method,
        upiId,
        cardNumber: selectedCard ? "" : cardDigits,
        forced,
      });
      setForced(null);
      if (outcome === "failure") {
        setFailReason(reason ?? "Card declined by issuer");
        setPhase("failure");
        return;
      }
      if (method === "additv" && !chargeWallet(total)) {
        setFailReason("Insufficient funds");
        setPhase("failure");
        return;
      }
      if (creditApplied > 0) consumePromoCredit(creditApplied);
      if (method === "card" && !selectedCard && saveCard) {
        addSavedCard({
          id: newCardId(),
          last4: cardDigits.slice(-4),
          type: cardType,
          holder: cardName.trim(),
          expiry,
        });
      }
      const res: CheckoutSuccess = {
        paymentId: newPaymentId(),
        orderId,
        amount: netBase,
        gst,
        total,
        couponCode: couponCode ?? undefined,
        discount: discount || undefined,
        promoCreditUsed: creditApplied || undefined,
        method,
        methodDetail: methodDetail(),
        timestamp: new Date().toISOString(),
      };
      setResult(res);
      setPhase("success");
      onSuccess(res);
    }, delay);
  };


  const requestClose = () => {
    if (phase === "processing") return;
    if (phase === "form" || phase === "failure") {
      setConfirmClose(true);
      return;
    }
    onOpenChange(false);
  };

  const printReceipt = () => {
    if (!result) return;
    const w = window.open("", "_blank", "width=520,height=680");
    if (!w) return;
    w.document.write(receiptHtml({ ...result, description }));
    w.document.close();
    w.focus();
    w.print();
  };

  const banks = BANKS.filter((b) => b.toLowerCase().includes(bankQuery.trim().toLowerCase()));

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (!o ? requestClose() : onOpenChange(true))}>
        <DialogContent
          className="max-h-[92vh] max-w-3xl overflow-y-auto p-0"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            requestClose();
          }}
        >
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Secure Checkout — Razorpay (Demo)
            </DialogTitle>
            <DialogDescription>
              Simulated gateway for this prototype. No real card, bank or UPI transaction happens.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-0 md:grid-cols-[minmax(0,300px)_1fr]">
            {/* Summary */}
            <aside className="space-y-4 border-b bg-secondary/40 p-5 md:border-b-0 md:border-r">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Merchant</p>
                <p className="font-semibold">{MERCHANT}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Paying for</p>
                <p className="text-sm">{description}</p>
              </div>
              <dl className="space-y-1.5 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Base amount</dt>
                  <dd className="tabular-nums">{inr(amount)}</dd>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-primary">
                    <dt>Coupon {couponCode}</dt>
                    <dd className="tabular-nums">−{inr(discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">GST @ 18%</dt>
                  <dd className="tabular-nums">{inr(gst)}</dd>
                </div>
                {creditApplied > 0 && (
                  <div className="flex justify-between text-primary">
                    <dt>Promotional credit</dt>
                    <dd className="tabular-nums">−{inr(creditApplied)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
                  <dt>Total payable</dt>
                  <dd className="tabular-nums">{inr(total)}</dd>
                </div>

              </dl>
              <div className="rounded-md bg-background/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Order ID</p>
                <p className="break-all font-mono text-xs">{orderId}</p>
              </div>
              {phase !== "success" && (
                <p
                  className={cn(
                    "text-xs",
                    seconds < 60 ? "font-medium text-destructive" : "text-muted-foreground",
                  )}
                >
                  This session expires in {mmss(seconds)}
                </p>
              )}
            </aside>

            {/* Right pane */}
            <section className="p-5">
              {phase === "expired" && (
                <CenterState
                  icon={<AlertTriangle className="h-8 w-8 text-amber-600" />}
                  title="Checkout session expired"
                  body="For your safety this payment window timed out. Nothing was charged."
                  actions={
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                  }
                />
              )}

              {phase === "processing" && (
                <CenterState
                  icon={<Loader2 className="h-8 w-8 animate-spin text-primary" />}
                  title="Processing your payment"
                  body="Do not press back or refresh. This usually takes a few seconds."
                />
              )}

              {phase === "success" && result && (
                <CenterState
                  icon={<CheckCircle2 className="h-9 w-9 text-primary" />}
                  title="Payment successful"
                  body={
                    <span className="block space-y-1 text-sm">
                      <span className="block font-mono text-xs">{result.paymentId}</span>
                      <span className="block">
                        {inr(result.total)} · {methodLabel[result.method]} · {result.methodDetail}
                      </span>
                      <span className="block text-muted-foreground">
                        {new Date(result.timestamp).toLocaleString("en-IN")}
                      </span>
                    </span>
                  }
                  actions={
                    <>
                      <Button variant="outline" onClick={printReceipt}>
                        <Download className="mr-1.5 h-4 w-4" /> Download receipt
                      </Button>
                      <Button onClick={() => onOpenChange(false)}>Continue</Button>
                    </>
                  }
                />
              )}

              {phase === "failure" && (
                <CenterState
                  icon={<XCircle className="h-9 w-9 text-destructive" />}
                  title="Payment failed"
                  body={
                    <span className="block space-y-1 text-sm">
                      <span className="block font-medium text-destructive">{failReason}</span>
                      <span className="block text-muted-foreground">
                        Nothing was charged. Order {orderId} stays open — retrying will not charge
                        you twice.
                      </span>
                    </span>
                  }
                  actions={
                    <>
                      <Button variant="outline" onClick={() => setPhase("form")}>
                        Try another method
                      </Button>
                      <Button onClick={pay}>Retry payment</Button>
                    </>
                  }
                />
              )}

              {phase === "form" && (
                <div className="space-y-4">
                  {/* Coupons & promotional credits */}
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">Coupons & offers</p>
                      <button
                        type="button"
                        className="ml-auto text-xs font-medium text-primary hover:underline"
                        onClick={() => setCouponListOpen((o) => !o)}
                      >
                        {couponListOpen ? "Hide offers" : "View offers"}
                      </button>
                    </div>
                    {couponCode ? (
                      <div className="mt-2 flex items-center justify-between rounded-md bg-primary/10 px-3 py-2 text-sm">
                        <span className="font-medium text-primary">
                          {couponCode} applied · you save {inr(discount)}
                        </span>
                        <button
                          type="button"
                          onClick={clearCoupon}
                          className="text-xs font-medium text-muted-foreground hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <Input
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            setCouponError(null);
                          }}
                          placeholder="Enter coupon code"
                          className="h-9"
                        />
                        <Button
                          variant="outline"
                          className="h-9"
                          disabled={!couponInput.trim()}
                          onClick={onApplyCoupon}
                        >
                          Apply
                        </Button>
                      </div>
                    )}
                    {couponError && (
                      <p className="mt-1.5 text-xs text-destructive">{couponError}</p>
                    )}
                    {couponListOpen && (
                      <ul className="mt-2 space-y-1.5">
                        {COUPONS.filter(
                          (c) => c.appliesTo === "all" || c.appliesTo === context,
                        ).map((c) => (
                          <li
                            key={c.code}
                            className="flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2 text-xs"
                          >
                            <span>
                              <span className="font-mono font-semibold">{c.code}</span> ·{" "}
                              <span className="text-muted-foreground">{c.label}</span>
                            </span>
                            <button
                              type="button"
                              className="font-medium text-primary hover:underline"
                              onClick={() => {
                                setCouponInput(c.code);
                                const res = applyCoupon(c.code, amount, context);
                                if (res.ok) {
                                  setCouponCode(res.coupon.code);
                                  setDiscount(res.discount);
                                  setCouponError(null);
                                } else {
                                  setCouponError(res.error);
                                }
                              }}
                            >
                              Apply
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {promoCreditBalance > 0 && (
                      <label className="mt-3 flex items-center gap-2 border-t pt-3 text-sm">
                        <Checkbox
                          checked={usePromoCredit}
                          onCheckedChange={(v) => setUsePromoCredit(v === true)}
                        />
                        <Gift className="h-4 w-4 text-primary" />
                        Use promotional credit ({inr(promoCreditBalance)} available)
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {(
                      [
                        ...(walletAllowed
                          ? ([["additv", "Additv Wallet", WalletIcon]] as [
                              PayMethod,
                              string,
                              typeof Smartphone,
                            ][])
                          : []),
                        ["upi", "UPI", Smartphone],
                        ["card", "Cards", CreditCard],
                        ["netbanking", "Netbanking", Banknote],
                        ["wallet", "Wallets", WalletIcon],
                      ] as [PayMethod, string, typeof Smartphone][]
                    ).map(([m, label, Icon]) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition",
                          method === m
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        <Icon className="h-4 w-4" /> {label}
                      </button>
                    ))}
                  </div>

                  {method === "additv" && (
                    <div className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                            <WalletIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Additv wallet</p>
                            <p className="text-xs text-muted-foreground">
                              Balance {inr(wallet)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          Paying {inr(total)}
                        </p>
                      </div>
                      {walletShort ? (
                        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                          Your wallet is short by {inr(total - wallet)}. Top up your wallet or pick
                          another payment method.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Balance after this payment: {inr(wallet - total)}
                        </p>
                      )}
                    </div>
                  )}



                  {method === "upi" && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="upi">UPI ID</Label>
                        <Input
                          id="upi"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          onBlur={() => setUpiTouched(true)}
                          placeholder="name@bank"
                          autoComplete="off"
                        />
                        {upiId && !isValidUpi(upiId) && upiTouched && (
                          <p className="text-xs text-destructive">
                            Enter a valid UPI ID, for example ramesh@okhdfc
                          </p>
                        )}
                        {upiId && isValidUpi(upiId) && (
                          <p className="text-xs text-primary">UPI ID looks valid</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 rounded-lg border p-3">
                        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-md border border-dashed bg-secondary/50 text-muted-foreground">
                          <QrCode className="h-10 w-10" />
                        </div>
                        <div className="min-w-[160px] flex-1">
                          <p className="text-sm font-medium">Scan & pay</p>
                          <p className="text-xs text-muted-foreground">
                            Static demo QR — scanning does nothing in this prototype.
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {UPI_APPS.map((a) => (
                              <button
                                key={a}
                                type="button"
                                onClick={() => setMethod("upi")}
                                className="rounded-full border px-2.5 py-1 text-xs hover:bg-secondary"
                              >
                                {a}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {method === "card" && (
                    <div className="space-y-3">
                      {savedCards.length > 0 && (
                        <div className="space-y-2">
                          <Label>Saved cards</Label>
                          {savedCards.map((c) => (
                            <div
                              key={c.id}
                              className={cn(
                                "rounded-lg border p-3 transition",
                                savedCardId === c.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border",
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSavedCardId(c.id);
                                  setSavedCvv("");
                                }}
                                className="flex w-full items-center gap-3 text-left"
                              >
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {c.type} •••• {c.last4}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Expires {c.expiry}
                                </span>
                                {c.isDefault && (
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                    Default
                                  </span>
                                )}
                              </button>
                              {savedCardId === c.id && (
                                <div className="mt-2 flex items-center gap-2">
                                  <Input
                                    type="password"
                                    inputMode="numeric"
                                    className="h-9 w-28"
                                    value={savedCvv}
                                    onChange={(e) =>
                                      setSavedCvv(
                                        e.target.value
                                          .replace(/\D/g, "")
                                          .slice(0, cvvLength(c.type)),
                                      )
                                    }
                                    placeholder={`CVV (${cvvLength(c.type)})`}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    Enter the CVV to authorise this payment
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setSavedCardId(null);
                              setSavedCvv("");
                            }}
                            className={cn(
                              "text-xs font-medium hover:underline",
                              savedCardId === null ? "text-primary" : "text-muted-foreground",
                            )}
                          >
                            + Use a new card
                          </button>
                        </div>
                      )}
                      {!selectedCard && (
                      <>
                      <div className="space-y-1.5">

                        <Label htmlFor="cardno">Card number</Label>
                        <div className="relative">
                          <Input
                            id="cardno"
                            value={cardNumber}
                            inputMode="numeric"
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            placeholder="1234 5678 9012 3456"
                            autoComplete="off"
                          />
                          {cardType !== "Unknown" && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                              {cardType}
                            </span>
                          )}
                        </div>
                        {cardDigits.length >= 12 && !luhnValid(cardDigits) && (
                          <p className="text-xs text-destructive">
                            This card number doesn't look right.
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="exp">Expiry (MM/YY)</Label>
                          <Input
                            id="exp"
                            value={expiry}
                            inputMode="numeric"
                            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                            placeholder="MM/YY"
                          />
                          {cardExpiryErr && (
                            <p className="text-xs text-destructive">{cardExpiryErr}</p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cvv">CVV ({cvvLength(cardType)} digits)</Label>
                          <Input
                            id="cvv"
                            type="password"
                            inputMode="numeric"
                            value={cvv}
                            onChange={(e) =>
                              setCvv(e.target.value.replace(/\D/g, "").slice(0, cvvLength(cardType)))
                            }
                            placeholder="•••"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cardname">Name on card</Label>
                        <Input
                          id="cardname"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="As printed on the card"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={saveCard}
                          onCheckedChange={(v) => setSaveCard(v === true)}
                        />
                        Save this card for faster checkout
                      </label>
                    </div>
                  )}

                  {method === "netbanking" && (
                    <div className="space-y-2">
                      <Label>Select your bank</Label>
                      <button
                        type="button"
                        onClick={() => setBankOpen((o) => !o)}
                        className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <span className={bank ? "" : "text-muted-foreground"}>
                          {bank ?? "Choose a bank"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {bankOpen && (
                        <div className="rounded-md border p-2">
                          <Input
                            value={bankQuery}
                            onChange={(e) => setBankQuery(e.target.value)}
                            placeholder="Search banks"
                            className="mb-2"
                          />
                          <div className="max-h-48 overflow-y-auto">
                            {banks.length === 0 && (
                              <p className="px-2 py-3 text-sm text-muted-foreground">
                                No bank matches "{bankQuery}"
                              </p>
                            )}
                            {banks.map((b) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => {
                                  setBank(b);
                                  setBankOpen(false);
                                }}
                                className={cn(
                                  "block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-secondary",
                                  bank === b && "bg-primary/10 text-primary",
                                )}
                              >
                                {b}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {method === "wallet" && (
                    <div className="grid grid-cols-2 gap-2">
                      {PAY_WALLETS.map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setPayWallet(w)}
                          className={cn(
                            "rounded-lg border px-3 py-3 text-sm font-medium transition",
                            payWallet === w
                              ? "border-primary bg-primary/10 text-primary"
                              : "hover:bg-secondary",
                          )}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  )}

                  <Button className="w-full" size="lg" disabled={!valid} onClick={pay}>
                    Pay {inr(total)}
                  </Button>

                  {/* Demo controls */}
                  <div className="rounded-lg border border-dashed border-amber-400/70 bg-amber-50/60 p-3 dark:bg-amber-500/10">
                    <button
                      type="button"
                      onClick={() => setDemoOpen((o) => !o)}
                      className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300"
                    >
                      Demo controls — not part of a real gateway
                      <ChevronDown
                        className={cn("h-4 w-4 transition", demoOpen && "rotate-180")}
                      />
                    </button>
                    {demoOpen && (
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {(["success", "failure", "timeout"] as PaymentOutcome[]).map((o) => (
                            <button
                              key={o}
                              type="button"
                              onClick={() => setForced(forced === o ? null : o)}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-medium capitalize",
                                forced === o
                                  ? "border-amber-600 bg-amber-200/70 text-amber-900 dark:bg-amber-500/30 dark:text-amber-100"
                                  : "border-amber-300 text-amber-800 dark:text-amber-200",
                              )}
                            >
                              Force {o}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
                          Always succeeds: UPI {DEMO_SUCCESS_UPI} · card {DEMO_SUCCESS_CARD}. Always
                          fails: UPI {DEMO_FAILURE_UPI} · card {DEMO_FAILURE_CARD}.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Nothing will be charged and you'll return to where you left off.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep paying</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmClose(false);
                onOpenChange(false);
              }}
            >
              Cancel payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CenterState({
  icon,
  title,
  body,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
      {icon}
      <h3 className="text-lg font-semibold">{title}</h3>
      {body && <div className="max-w-sm text-sm text-muted-foreground">{body}</div>}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

export function receiptHtml(r: CheckoutSuccess & { description: string }): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#5b6b5b">${k}</td><td style="padding:6px 0;text-align:right">${v}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${r.paymentId}</title>
  <style>body{font-family:ui-sans-serif,system-ui,sans-serif;padding:28px;color:#12201a}
  h1{font-size:18px;margin:0 0 2px}table{width:100%;border-collapse:collapse;font-size:13px}
  .tot{border-top:1px solid #cfe3cf;font-weight:600}</style></head><body>
  <h1>AdSpot Click — Payment receipt</h1>
  <p style="margin:0 0 16px;font-size:12px;color:#5b6b5b">Secure Checkout — Razorpay (Demo). Prototype receipt, not a tax invoice.</p>
  <table>
    ${row("Payment ID", r.paymentId)}
    ${row("Order ID", r.orderId)}
    ${row("Paid for", r.description)}
    ${row("Method", `${r.method.toUpperCase()} · ${r.methodDetail}`)}
    ${row("Date", new Date(r.timestamp).toLocaleString("en-IN"))}
    ${row("Base amount", `Rs. ${r.amount.toLocaleString("en-IN")}`)}
    ${row("GST @ 18%", `Rs. ${r.gst.toLocaleString("en-IN")}`)}
    <tr class="tot"><td style="padding:8px 0">Total paid</td><td style="padding:8px 0;text-align:right">Rs. ${r.total.toLocaleString("en-IN")}</td></tr>
  </table></body></html>`;
}
