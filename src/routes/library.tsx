import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Trash2, Plus, ImageIcon, Film, Info } from "lucide-react";
import { AppShell, StatusBadge, VideoPlayOverlay } from "@/components/AppShell";
import { AddCreativeDialog } from "@/components/AddCreativeDialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useApp } from "@/lib/app-context";
import { toast } from "sonner";


export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Content Library · Additv" },
      { name: "description", content: "Reusable creatives for your campaigns." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { creatives, campaigns, deleteCreative } = useApp();
  const [q, setQ] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return creatives;
    return creatives.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.tags.some((t) => t.toLowerCase().includes(s)) ||
        c.industry?.toLowerCase().includes(s),
    );
  }, [creatives, q]);

  const usageFor = (creativeId: string) =>
    campaigns.filter(
      (c) => c.creativeId === creativeId || c.pendingCreativeId === creativeId,
    );

  const inUseByLive = (creativeId: string) =>
    usageFor(creativeId).some((c) => c.status === "live");



  return (
    <AppShell title="Content Library">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-foreground">Your creatives</h2>
        <span className="text-sm text-muted-foreground">Reuse in new campaigns.</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, tag, industry"
              className="pl-9"
            />
          </div>
          <Button onClick={() => setUploadOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add New Creative
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="group flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/70 bg-muted/20 p-6 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">Add New Creative</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tag with an industry, then upload image or video
            </p>
          </div>
        </button>

        {results.map((c) => {
          const usage = usageFor(c.id);
          const locked = inUseByLive(c.id);
          return (
            <Card key={c.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                {c.type === "image" ? (
                  <img src={c.url} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <>
                    <video src={c.url} className="h-full w-full object-cover" muted playsInline />
                    <VideoPlayOverlay />
                  </>
                )}
                <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                  {c.type === "image" ? <ImageIcon className="h-3 w-3" /> : <Film className="h-3 w-3" />}
                  {c.type.toUpperCase()}
                </div>
                <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
                  <StatusBadge status={c.status} />
                  {usage.length > 0 && <UsagePopover usage={usage} live={locked} />}
                </div>
              </div>

              <div className="p-4">
                <h3 className="truncate font-medium">{c.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c.width}×{c.height} · {(c.sizeKB / 1024).toFixed(1)} MB
                  {c.durationSec ? ` · ${c.durationSec}s` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.industry && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {c.industry}
                    </span>
                  )}
                  {c.tags.map((t) => (
                    <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
                {c.status === "rejected" && c.rejectionReason && (
                  <p className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
                    {c.rejectionReason}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {usage.length === 0
                      ? "Not used in any campaign yet"
                      : locked
                        ? "In use by a live campaign"
                        : `Used in ${usage.length} campaign${usage.length > 1 ? "s" : ""}`}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={locked}
                    onClick={() => {
                      deleteCreative(c.id);
                      toast.success("Creative deleted");
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {results.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {q ? "No creatives match your search." : "Add your first creative to get started."}
        </p>
      )}

      <AddCreativeDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </AppShell>
  );
}

/** Compact "In use" chip that reveals exactly which campaigns use the creative. */
function UsagePopover({
  usage,
  live,
}: {
  usage: { id: string; name: string; status: string }[];
  live: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur transition-colors ${
            live
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300"
              : "bg-background/85 text-muted-foreground hover:bg-background"
          }`}
        >
          {live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
          In use · {usage.length}
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="text-xs font-medium">Used in these campaigns</p>
        <ul className="mt-2 space-y-1.5">
          {usage.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2">
              <Link
                to="/campaigns/$id"
                params={{ id: c.id }}
                className="truncate text-xs text-primary hover:underline"
              >
                {c.name}
              </Link>
              <StatusBadge status={c.status} />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

