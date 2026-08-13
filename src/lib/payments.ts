/**
 * Mock payment gateway helpers — prototype only.
 * No SDK, no keys, no network calls. Every id and outcome is generated locally.
 */

export const GST_RATE = 0.18;

export type PayMethod = "additv" | "upi" | "card" | "netbanking" | "wallet";

export type PaymentOutcome = "success" | "failure" | "timeout";

export interface PaymentTransaction {
  paymentId: string;
  orderId: string;
  /** Base amount before GST (after any coupon discount). */
  amount: number;
  gst: number;
  total: number;
  /** Coupon code applied at checkout, if any. */
  couponCode?: string;
  /** Discount taken off the base amount by the coupon. */
  discount?: number;
  /** Promotional credit consumed at checkout, if any. */
  promoCreditUsed?: number;
  method: PayMethod;
  /** Human-readable detail: "•••• 1111", "success@demo", "HDFC Bank", "Paytm". */
  methodDetail: string;
  status: "success";
  timestamp: string;
  /** What the money paid for. */
  purpose: string;
  purposeType: "campaign" | "topup";
  campaignId?: string;
}


const ALNUM = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomId(len = 14): string {
  let out = "";
  for (let i = 0; i < len; i++) out += ALNUM[Math.floor(Math.random() * ALNUM.length)];
  return out;
}

export const newOrderId = () => `order_${randomId(14)}`;
export const newPaymentId = () => `pay_${randomId(14)}`;
export const newRefundId = () => `rfnd_${randomId(14)}`;

/** Deterministic id for seed data so mock records stay stable within a session. */
export function seedPaymentId(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  let out = "";
  let x = h || 1;
  for (let i = 0; i < 14; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    out += ALNUM[x % ALNUM.length];
  }
  return `pay_${out}`;
}

export const gstOn = (base: number) => Math.round(base * GST_RATE);
export const totalWithGst = (base: number) => base + gstOn(base);

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// ---------- UPI ----------

export const UPI_RE = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z][a-zA-Z0-9]{1,}$/;
export const isValidUpi = (v: string) => UPI_RE.test(v.trim());

export const UPI_APPS = ["Google Pay", "PhonePe", "Paytm", "BHIM"] as const;

// ---------- Cards ----------

export type CardType = "Visa" | "Mastercard" | "Amex" | "RuPay" | "Unknown";

export function detectCardType(digits: string): CardType {
  const d = digits.replace(/\D/g, "");
  if (/^4/.test(d)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^(60|65|81|82|508)/.test(d)) return "RuPay";
  return "Unknown";
}

export function formatCardNumber(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 19);
  const groups = detectCardType(d) === "Amex" ? [4, 6, 5] : [4, 4, 4, 4, 3];
  const out: string[] = [];
  let i = 0;
  for (const g of groups) {
    if (i >= d.length) break;
    out.push(d.slice(i, i + g));
    i += g;
  }
  return out.join(" ");
}

export function luhnValid(digits: string): boolean {
  const d = digits.replace(/\D/g, "");
  if (d.length < 12) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export const cvvLength = (type: CardType) => (type === "Amex" ? 4 : 3);

export function formatExpiry(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** Returns null when valid, else an error message. */
export function expiryError(value: string): string | null {
  const d = value.replace(/\D/g, "");
  if (d.length !== 4) return "Enter expiry as MM/YY";
  const mm = Number(d.slice(0, 2));
  const yy = Number(d.slice(2));
  if (mm < 1 || mm > 12) return "Month must be between 01 and 12";
  const now = new Date();
  const expYear = 2000 + yy;
  const endOfMonth = new Date(expYear, mm, 0, 23, 59, 59);
  if (endOfMonth < now) return "This card has expired";
  return null;
}

// ---------- Netbanking & wallets ----------

export const BANKS = [
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Yes Bank",
  "IndusInd Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Other banks",
] as const;

export const PAY_WALLETS = ["Paytm", "PhonePe", "Amazon Pay", "Mobikwik"] as const;

// ---------- Deterministic demo inputs & outcomes ----------

export const DEMO_SUCCESS_UPI = "success@demo";
export const DEMO_FAILURE_UPI = "failure@demo";
export const DEMO_SUCCESS_CARD = "4111111111111111";
export const DEMO_FAILURE_CARD = "4000000000000002";

export const FAILURE_REASONS = [
  "Insufficient funds",
  "Card declined by issuer",
  "Incorrect UPI PIN",
  "Bank server not responding",
  "Transaction timed out",
] as const;

export type FailureReason = (typeof FAILURE_REASONS)[number];

export function resolveOutcome(input: {
  method: PayMethod;
  upiId?: string;
  cardNumber?: string;
  forced?: PaymentOutcome | null;
}): { outcome: Exclude<PaymentOutcome, "timeout">; reason?: FailureReason } {
  if (input.forced === "success") return { outcome: "success" };
  if (input.forced === "failure")
    return { outcome: "failure", reason: failureReasonFor(input.method) };
  if (input.forced === "timeout") return { outcome: "failure", reason: "Transaction timed out" };

  const upi = input.upiId?.trim().toLowerCase();
  const card = input.cardNumber?.replace(/\D/g, "");
  if (upi === DEMO_FAILURE_UPI || card === DEMO_FAILURE_CARD)
    return { outcome: "failure", reason: failureReasonFor(input.method) };
  return { outcome: "success" };
}

function failureReasonFor(method: PayMethod): FailureReason {
  if (method === "upi") return "Incorrect UPI PIN";
  if (method === "card") return "Card declined by issuer";
  if (method === "netbanking") return "Bank server not responding";
  return "Insufficient funds";
}

export const methodLabel: Record<PayMethod, string> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Netbanking",
  wallet: "Wallet",
};

/** Seed history so the transactions list isn't empty in the prototype. */
export const SEED_TRANSACTIONS: PaymentTransaction[] = [
  {
    paymentId: seedPaymentId("seed-topup-1"),
    orderId: `order_${seedPaymentId("seed-topup-1-o").slice(4)}`,
    amount: 10000,
    gst: 1800,
    total: 11800,
    method: "card",
    methodDetail: "Visa •••• 4242",
    status: "success",
    timestamp: "2026-07-24T10:12:00.000Z",
    purpose: "Wallet top-up",
    purposeType: "topup",
  },
  {
    paymentId: seedPaymentId("seed-topup-2"),
    orderId: `order_${seedPaymentId("seed-topup-2-o").slice(4)}`,
    amount: 15000,
    gst: 2700,
    total: 17700,
    method: "upi",
    methodDetail: "rameshkitchen@okhdfc",
    status: "success",
    timestamp: "2026-07-15T08:40:00.000Z",
    purpose: "Wallet top-up",
    purposeType: "topup",
  },
  {
    paymentId: seedPaymentId("cmp_1"),
    orderId: `order_${seedPaymentId("cmp_1-order").slice(4)}`,
    amount: 12400,
    gst: 2232,
    total: 14632,
    method: "netbanking",
    methodDetail: "HDFC Bank",
    status: "success",
    timestamp: "2026-07-22T12:05:00.000Z",
    purpose: "Campaign budget · Koramangala Weekend Push",
    purposeType: "campaign",
    campaignId: "cmp_1",
  },
];
