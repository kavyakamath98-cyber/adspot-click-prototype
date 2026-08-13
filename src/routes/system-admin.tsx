import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Film,
  Image as ImageIcon,
  LogOut,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import {
  MODERATION_REJECTION_REASONS,
  type Creative,
} from "@/lib/mockData";

export const Route = createFileRoute("/system-admin")({
  head: () => ({
    meta: [
      { title: "Approval console — Additv Moderation" },
      {
        name: "description",
        content:
          "Platform moderation console for reviewing advertiser creatives submitted to the Additv DOOH network.",
      },
      { property: "og:title", content: "Approval console — Additv Moderation" },
      {
        property: "og:description",
        content: "Review, approve and reject advertiser creatives across the Additv network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SystemAdminPage,
});

type Filter = "pending" | "approved" | "rejected" | "all";

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

function StatusPill({ status }: { status: Creative["status"] }) {
  if (status === "approved")
    return (
      <Badge className="gap-1 border-transparent bg-primary/15 text-primary hover:bg-primary/15">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> Rejected
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}

function Thumb({ c, className = "" }: { c: Creative; className?: string }) {
  const src = c.type === "image" ? c.url : (c.thumbnail ?? c.url);
  return (
    <div className={`relative overflow-hidden rounded-md bg-muted ${className}`}>
      <img src={src} alt={c.name} className="h-full w-full object-cover" />
      <span className="absolute left-1 top-1 rounded bg-background/85 px-1 py-0.5 text-[9px] font-medium backdrop-blur">
        {c.type === "image" ? <ImageIcon className="h-3 w-3" /> : <Film className="h-3 w-3" />}
      </span>
    </div>
  );
}

function SystemAdminPage() {
  const { allCreatives, reviewCreative, campaigns } = useApp();
  const { member, logout } = useAuth();
  const reviewer = member?.email ?? "admin@adittv.com";

  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("all");
  const [sort, setSort] = useState<"oldest" | "newest">("oldest");
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Creative | null>(null);

  // Reject modal state — targets either one creative or the current bulk selection.
  const [rejectTargets, setRejectTargets] = useState<string[] | null>(null);
  const [reason, setReason] = useState<string>(MODERATION_REJECTION_REASONS[0]);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  const industries = useMemo(
    () => Array.from(new Set(allCreatives.map((c) => c.industry ?? "Other"))).sort(),
    [allCreatives],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCreatives
      .filter((c) => (filter === "all" ? true : c.status === filter))
      .filter((c) => (industry === "all" ? true : (c.industry ?? "Other") === industry))
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.advertiser ?? "Ramesh's Kitchen").toLowerCase().includes(q) ||
          (c.subIndustry ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) =>
        sort === "oldest"
          ? a.uploadedAt.localeCompare(b.uploadedAt)
          : b.uploadedAt.localeCompare(a.uploadedAt),
      );
  }, [allCreatives, filter, industry, query, sort]);

  const pendingCount = allCreatives.filter((c) => c.status === "pending").length;
  const selectable = rows.filter((c) => c.status === "pending").map((c) => c.id);
  const selectedHere = selected.filter((id) => selectable.includes(id));
  const allSelected = selectable.length > 0 && selectedHere.length === selectable.length;

  const toggleAll = () => setSelected(allSelected ? [] : selectable);
  const toggleOne = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const approve = (ids: string[]) => {
    ids.forEach((id) => reviewCreative(id, { decision: "approve", reviewer }));
    setSelected((p) => p.filter((id) => !ids.includes(id)));
    setDetail(null);
    toast.success(
      ids.length === 1 ? "Creative approved" : `${ids.length} creatives approved`,
    );
  };

  const openReject = (ids: string[]) => {
    setReason(MODERATION_REJECTION_REASONS[0]);
    setNote("");
    setNoteError(null);
    setRejectTargets(ids);
  };

  const confirmReject = () => {
    if (!rejectTargets) return;
    if (reason === "Other" && note.trim().length < 10) {
      setNoteError("Please describe the reason in at least 10 characters.");
      return;
    }
    rejectTargets.forEach((id) =>
      reviewCreative(id, { decision: "reject", reason, note: note.trim() || null, reviewer }),
    );
    setSelected((p) => p.filter((id) => !rejectTargets.includes(id)));
    setDetail(null);
    toast.success(
      rejectTargets.length === 1
        ? "Creative rejected — the advertiser has been notified"
        : `${rejectTargets.length} creatives rejected`,
    );
    setRejectTargets(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-tight">Additv Moderation</h1>
            <p className="truncate text-xs text-muted-foreground">Platform approval console</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">{reviewer}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="mr-1.5 h-4 w-4" /> Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold">Creative approvals</h2>
            <p className="text-sm text-muted-foreground">
              {pendingCount === 0
                ? "Nothing is waiting for review right now."
                : `${pendingCount} creative${pendingCount > 1 ? "s" : ""} waiting for your review.`}
            </p>
          </div>
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search creative or advertiser"
              className="pl-9"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border bg-muted/40 p-1">
            {(["pending", "approved", "rejected", "all"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                  filter === f
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="w-[210px]">
              <SelectValue placeholder="All industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {industries.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as "oldest" | "newest")}>
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oldest">Oldest submitted first</SelectItem>
              <SelectItem value="newest">Newest submitted first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedHere.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border bg-secondary/50 px-4 py-3">
            <span className="text-sm font-medium">{selectedHere.length} selected</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" onClick={() => approve(selectedHere)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve all
              </Button>
              <Button size="sm" variant="destructive" onClick={() => openReject(selectedHere)}>
                <XCircle className="mr-1.5 h-4 w-4" /> Reject all
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="hidden items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground md:flex">
            <div className="w-6">
              {selectable.length > 0 && (
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              )}
            </div>
            <div className="w-14">Preview</div>
            <div className="flex-1">Creative</div>
            <div className="w-44">Advertiser</div>
            <div className="w-52">Industry</div>
            <div className="w-28">Submitted</div>
            <div className="w-28">Status</div>
            <div className="w-40 text-right">Action</div>
          </div>

          {rows.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No creatives match these filters.
            </p>
          )}

          {rows.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/30"
            >
              <div className="w-6">
                {c.status === "pending" && (
                  <Checkbox
                    checked={selected.includes(c.id)}
                    onCheckedChange={() => toggleOne(c.id)}
                    aria-label={`Select ${c.name}`}
                  />
                )}
              </div>
              <button type="button" onClick={() => setDetail(c)} className="w-14">
                <Thumb c={c} className="h-10 w-14" />
              </button>
              <button
                type="button"
                onClick={() => setDetail(c)}
                className="flex-1 min-w-[160px] text-left"
              >
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {c.width}×{c.height} · {(c.sizeKB / 1024).toFixed(1)} MB
                  {c.durationSec ? ` · ${c.durationSec}s` : ""}
                </span>
              </button>
              <div className="w-44 truncate text-sm">{c.advertiser ?? "Ramesh's Kitchen"}</div>
              <div className="w-52 truncate text-xs text-muted-foreground">
                {c.industry ?? "Other"} · {c.subIndustry ?? "Other"}
              </div>
              <div className="w-28 text-xs text-muted-foreground">{fmtDate(c.uploadedAt)}</div>
              <div className="w-28">
                <StatusPill status={c.status} />
              </div>
              <div className="flex w-40 justify-end gap-2">
                {c.status === "pending" ? (
                  <>
                    <Button size="sm" onClick={() => approve([c.id])}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openReject([c.id])}>
                      Reject
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setDetail(c)}>
                    View
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Review detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>
                  Submitted by {detail.uploadedBy ?? "owner@rameshskitchen.in"} ·{" "}
                  {detail.advertiser ?? "Ramesh's Kitchen"}
                </DialogDescription>
              </DialogHeader>

              <div className="overflow-hidden rounded-lg bg-muted">
                {detail.type === "image" ? (
                  <img src={detail.url} alt={detail.name} className="max-h-72 w-full object-contain" />
                ) : (
                  <video src={detail.url} controls className="max-h-72 w-full object-contain" />
                )}
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Industry</dt>
                  <dd>{detail.industry ?? "Other"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Sub-Industry</dt>
                  <dd>{detail.subIndustry ?? "Other"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Dimensions</dt>
                  <dd>
                    {detail.width}×{detail.height}
                    {detail.durationSec ? ` · ${detail.durationSec}s` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Submitted</dt>
                  <dd>{fmtDate(detail.uploadedAt)}</dd>
                </div>
              </dl>

              {detail.status === "rejected" && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium text-destructive">
                    Rejected — {detail.rejectionReason ?? "Brand Safety"}
                  </p>
                  {detail.rejectionNote && (
                    <p className="mt-1 text-muted-foreground">{detail.rejectionNote}</p>
                  )}
                </div>
              )}

              {(detail.reviewLog?.length ?? 0) > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Review history</p>
                  <ul className="space-y-1 text-xs">
                    {detail.reviewLog!.map((l, i) => (
                      <li key={i} className="flex flex-wrap gap-1">
                        <span className="font-medium capitalize">{l.action}</span>
                        {l.reason && <span>· {l.reason}</span>}
                        <span className="text-muted-foreground">
                          · {l.by} · {fmtDateTime(l.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.status === "pending" && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => openReject([detail.id])}>
                    Reject
                  </Button>
                  <Button onClick={() => approve([detail.id])}>Approve</Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={!!rejectTargets} onOpenChange={(o) => !o && setRejectTargets(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Reject {rejectTargets && rejectTargets.length > 1 ? `${rejectTargets.length} creatives` : "creative"}
            </DialogTitle>
            <DialogDescription>
              The advertiser sees this reason on their creative and on any linked campaign.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Reason for rejection</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODERATION_REJECTION_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Notes {reason === "Other" ? "(required)" : "(optional)"}
              </Label>
              <Textarea
                value={note}
                maxLength={500}
                rows={4}
                onChange={(e) => {
                  setNote(e.target.value);
                  setNoteError(null);
                }}
                placeholder="Explain what the advertiser needs to change."
              />
              <div className="flex justify-between text-xs">
                <span className="text-destructive">{noteError ?? ""}</span>
                <span className="text-muted-foreground">{note.length}/500</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTargets(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Confirm rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
