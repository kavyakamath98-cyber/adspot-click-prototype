import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Search, Trash2, Plus, ImageIcon, Film, Upload, Loader2 } from "lucide-react";
import { AppShell, InUseBadge, StatusBadge, VideoPlayOverlay } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { INDUSTRIES, type Creative, type Industry } from "@/lib/mockData";
import { toast } from "sonner";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Content Library · Additiv" },
      { name: "description", content: "Reusable creatives for your campaigns." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { creatives, campaigns, deleteCreative, addCreative, markCreativeApproved } = useApp();
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

  const inUseByLive = (creativeId: string) =>
    campaigns.some(
      (c) =>
        (c.creativeId === creativeId || c.pendingCreativeId === creativeId) &&
        c.status === "live",
    );

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Content Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All your uploaded creatives. Reuse in new campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
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
        {/* Add-new tile */}
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
                  {locked && <InUseBadge />}
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
                  <Link to="/campaigns/new" search={{ creativeId: c.id }}>
                    <Button size="sm" variant="secondary" className="gap-1">
                      <Plus className="h-3.5 w-3.5" /> Use in campaign
                    </Button>
                  </Link>
                  <div className="flex flex-col items-end">
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
                    {locked && (
                      <span className="text-[10px] text-muted-foreground">In use by live campaign</span>
                    )}
                  </div>
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

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        addCreative={addCreative}
        markCreativeApproved={markCreativeApproved}
      />
    </AppShell>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  addCreative,
  markCreativeApproved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  addCreative: (c: Creative) => Creative;
  markCreativeApproved: (id: string) => void;
}) {
  const [industry, setIndustry] = useState<Industry>("Restaurant");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setName("");
    setIndustry("Restaurant");
    setChecking(false);
  };

  const handleFileChosen = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  };

  const submit = () => {
    if (!file) {
      toast.error("Please choose a file to upload.");
      return;
    }
    const isVideo = file.type.startsWith("video/");
    const url = previewUrl!;
    setChecking(true);
    const loadMeta = new Promise<{ w: number; h: number; d?: number }>((resolve) => {
      if (isVideo) {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => resolve({ w: v.videoWidth, h: v.videoHeight, d: Math.round(v.duration) });
        v.src = url;
      } else {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = url;
      }
    });
    loadMeta.then((meta) => {
      const created: Creative = {
        id: `cre_${Date.now()}`,
        name: name.trim() || file.name,
        type: isVideo ? "video" : "image",
        url,
        width: meta.w || 1920,
        height: meta.h || 1080,
        sizeKB: Math.round(file.size / 1024),
        durationSec: meta.d,
        uploadedAt: new Date().toISOString().slice(0, 10),
        tags: [industry.toLowerCase().split("/")[0]],
        industry,
        status: "pending",
        previouslyApproved: false,
      };
      addCreative(created);
      setTimeout(() => {
        markCreativeApproved(created.id);
        toast.success("Content passed brand-safety check");
      }, 1600);
      toast.info("Creative uploaded — running brand-safety check…");
      onOpenChange(false);
      reset();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Creative</DialogTitle>
          <DialogDescription>
            Tag with an industry so we route it to the right screens, then upload your file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Industry category</Label>
            <Select value={industry} onValueChange={(v) => setIndustry(v as Industry)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Creative name (optional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Diwali Thali Special"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>File</Label>
            <div
              className="mt-1.5 rounded-lg border-2 border-dashed border-border/70 bg-muted/30 p-6 text-center transition-colors hover:bg-muted/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFileChosen(f);
              }}
            >
              {previewUrl ? (
                <div className="mx-auto aspect-video w-56 overflow-hidden rounded bg-black">
                  {file?.type.startsWith("video/") ? (
                    <video src={previewUrl} className="h-full w-full object-cover" muted autoPlay loop />
                  ) : (
                    <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm">Drag & drop or click to choose</p>
                </>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => inputRef.current?.click()}
              >
                {previewUrl ? "Choose different file" : "Choose file"}
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileChosen(f);
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!file || checking}>
            {checking && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
