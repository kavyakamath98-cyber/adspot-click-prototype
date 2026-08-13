import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { CampaignRefund } from "@/lib/mockData";

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Tiny mock IFSC → bank lookup so the field can auto-fill in the prototype. */
const BANK_BY_PREFIX: Record<string, string> = {
  HDFC: "HDFC Bank",
  ICIC: "ICICI Bank",
  SBIN: "State Bank of India",
  UTIB: "Axis Bank",
  KKBK: "Kotak Mahindra Bank",
  PUNB: "Punjab National Bank",
  YESB: "Yes Bank",
  IDFB: "IDFC First Bank",
};

export function RefundDialog({
  open,
  onOpenChange,
  amount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amount: number;
  onConfirm: (input: {
    amount: number;
    destination: "wallet" | "bank";
    bank?: CampaignRefund["bank"];
  }) => CampaignRefund;
}) {
  const [destination, setDestination] = useState<"wallet" | "bank">("wallet");
  const [holder, setHolder] = useState("");
  const [acc, setAcc] = useState("");
  const [accConfirm, setAccConfirm] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankTouched, setBankTouched] = useState(false);
  const [result, setResult] = useState<CampaignRefund | null>(null);

  useEffect(() => {
    if (open) {
      setDestination("wallet");
      setHolder("");
      setAcc("");
      setAccConfirm("");
      setIfsc("");
      setBankName("");
      setBankTouched(false);
      setResult(null);
    }
  }, [open]);

  const accValid = /^\d{9,18}$/.test(acc);
  const matchValid = acc.length > 0 && acc === accConfirm;
  const ifscValid = IFSC_RE.test(ifsc);
  const bankValid =
    holder.trim().length > 1 && accValid && matchValid && ifscValid && bankName.trim().length > 1;
  const canConfirm = destination === "wallet" || bankValid;

  const handleIfsc = (v: string) => {
    const up = v.toUpperCase();
    setIfsc(up);
    if (IFSC_RE.test(up) && !bankTouched) {
      setBankName(BANK_BY_PREFIX[up.slice(0, 4)] ?? "Bank (verified)");
    }
  };

  const submit = () => {
    const refund = onConfirm({
      amount,
      destination,
      bank:
        destination === "bank"
          ? {
              accountHolder: holder.trim(),
              accountNumberMasked: `••••${acc.slice(-4)}`,
              ifsc,
              bankName: bankName.trim(),
            }
          : undefined,
    });
    setResult(refund);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" /> Refund requested
              </DialogTitle>
              <DialogDescription>
                {result.destination === "wallet"
                  ? "The money is back in your wallet right away."
                  : "Your bank transfer is on its way — it usually takes 5-7 business days."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5 rounded-lg border bg-secondary/30 p-4 text-sm">
              <Row label="Amount" value={`₹${result.amount.toLocaleString("en-IN")}`} />
              <Row
                label="Destination"
                value={result.destination === "wallet" ? "Wallet" : `Bank ${result.bank?.accountNumberMasked}`}
              />
              <Row label="Status" value={result.status} />
              <Row label="Reference ID" value={result.referenceId} />
              {result.refundId && <Row label="Refund ID" value={result.refundId} />}
              {result.originalPaymentId && (
                <Row label="Original payment" value={result.originalPaymentId} />
              )}
              <Row label="Date" value={new Date(result.date).toLocaleDateString("en-IN")} />
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request refund</DialogTitle>
              <DialogDescription>
                You have ₹{amount.toLocaleString("en-IN")} of unspent budget on this stopped
                campaign. Where should we send it?
              </DialogDescription>
            </DialogHeader>

            <RadioGroup
              value={destination}
              onValueChange={(v) => setDestination(v as "wallet" | "bank")}
              className="gap-2"
            >
              {(
                [
                  ["wallet", "Credit to wallet", "Instant"],
                  ["bank", "Transfer to bank account", "5-7 business days"],
                ] as const
              ).map(([val, title, sub]) => (
                <label
                  key={val}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition",
                    destination === val ? "border-primary bg-primary/10" : "hover:bg-secondary/50",
                  )}
                >
                  <RadioGroupItem value={val} />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-muted-foreground">{sub}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>

            {destination === "bank" && (
              <div className="space-y-3 rounded-lg border bg-secondary/20 p-4">
                <Field label="Account holder name">
                  <Input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="As per bank records" />
                </Field>
                <Field
                  label="Account number"
                  error={acc && !accValid ? "Enter 9-18 digits." : null}
                >
                  <Input
                    value={acc}
                    inputMode="numeric"
                    onChange={(e) => setAcc(e.target.value.replace(/\D/g, "").slice(0, 18))}
                  />
                </Field>
                <Field
                  label="Confirm account number"
                  error={accConfirm && !matchValid ? "Account numbers do not match." : null}
                >
                  <Input
                    value={accConfirm}
                    inputMode="numeric"
                    onChange={(e) => setAccConfirm(e.target.value.replace(/\D/g, "").slice(0, 18))}
                  />
                </Field>
                <Field
                  label="IFSC code"
                  error={ifsc && !ifscValid ? "Enter a valid IFSC, e.g., HDFC0001234." : null}
                >
                  <Input
                    value={ifsc}
                    onChange={(e) => handleIfsc(e.target.value)}
                    placeholder="HDFC0001234"
                    maxLength={11}
                  />
                </Field>
                <Field label="Bank name">
                  <Input
                    value={bankName}
                    onChange={(e) => {
                      setBankTouched(true);
                      setBankName(e.target.value);
                    }}
                    placeholder="Auto-filled from IFSC"
                  />
                </Field>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={!canConfirm} onClick={submit}>
                Confirm refund
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
