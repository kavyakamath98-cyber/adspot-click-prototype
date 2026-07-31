import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import {
  CONTENT_TAGS,
  INDUSTRIES,
  type ContentTag,
  type Creative,
  type Industry,
} from "@/lib/mockData";

export function AddCreativeDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called with the newly-created creative (status: "pending"). */
  onCreated?: (created: Creative) => void;
}) {
  const { addCreative } = useApp();
  const [industry, setIndustry] = useState<Industry>("Restaurant");
  const [contentTag, setContentTag] = useState<ContentTag>("General/Info");
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
    setContentTag("General/Info");
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
        v.onloadedmetadata = () =>
          resolve({ w: v.videoWidth, h: v.videoHeight, d: Math.round(v.duration) });
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
        contentTag,
        status: "pending",
        previouslyApproved: false,
      };
      addCreative(created);
      onCreated?.(created);
      toast.info(
        "Creative uploaded — it stays in review until a campaign using it is submitted and reviewed.",
      );
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
            <div className="flex items-center gap-1.5">
              <Label>Content tag</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="What do these content tags mean?"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="max-h-80 w-80 overflow-y-auto p-3">
                  <p className="text-xs font-semibold">What each tag means</p>
                  <div className="mt-2 space-y-3">
                    {CONTENT_TAGS.map((t) => {
                      const info = CONTENT_TAG_INFO[t];
                      return (
                        <div key={t}>
                          <p className="text-xs font-medium">{t}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{info.definition}</p>
                          <ul className="mt-1 list-disc pl-4 text-[11px] text-muted-foreground">
                            {info.examples.map((e) => (
                              <li key={e}>{e}</li>
                            ))}
                          </ul>
                          <p className="mt-1 text-[11px] font-medium text-foreground">
                            {info.outcome}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Select value={contentTag} onValueChange={(v) => setContentTag(v as ContentTag)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TAGS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {CONTENT_TAG_INFO[contentTag].outcome}
            </p>
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
                    <video
                      src={previewUrl}
                      className="h-full w-full object-cover"
                      muted
                      autoPlay
                      loop
                    />
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
