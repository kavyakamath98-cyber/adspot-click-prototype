import { useRef, useState } from "react";
import { Link2, Loader2, Upload } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TagChip, TagSelect } from "@/components/TagSelect";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import { type Creative } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import {
  INDUSTRIES,
  subIndustriesFor,
  type Industry,
} from "@/data/industryTaxonomy";

/** Formats the existing file picker accepts (image/*, video/*) and the size cap. */
const MAX_MB = 50;
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif", "avif"];
const VIDEO_EXT = ["mp4", "webm", "mov", "m4v"];

type UrlError =
  | "invalid"
  | "unreachable"
  | "unsupported"
  | "too_large"
  | "multiple"
  | "timeout"
  | null;

const URL_ERROR_COPY: Record<Exclude<UrlError, null>, { title: string; body: string }> = {
  invalid: {
    title: "That doesn't look like a valid link",
    body: "Paste a full web address starting with http:// or https://.",
  },
  unreachable: {
    title: "Could not access this link",
    body: "The link is blocked, private or no longer exists (403 / 404). Check it opens in a new tab without logging in.",
  },
  unsupported: {
    title: "Unsupported format",
    body: `We accept images (${IMAGE_EXT.join(", ")}) and videos (${VIDEO_EXT.join(", ")}).`,
  },
  too_large: {
    title: "File too large",
    body: `Creatives must be under ${MAX_MB} MB.`,
  },
  multiple: {
    title: "This link contains multiple creatives",
    body: "Please provide a link to the single creative you want to upload.",
  },
  timeout: {
    title: "The link took too long to respond",
    body: "We waited 10 seconds and got nothing back. Try again or use a different link.",
  },
};

interface ImportedAsset {
  url: string;
  name: string;
  type: "image" | "video";
  format: string;
  sizeKB: number;
  width: number;
  height: number;
  durationSec?: number;
}

const extOf = (pathname: string) => pathname.split(".").pop()?.toLowerCase() ?? "";

const looksLikeFolder = (u: URL) => {
  const path = u.pathname.toLowerCase();
  if (u.hostname.includes("drive.google.com") && path.includes("/drive/folders")) return true;
  if (u.hostname.includes("dropbox.com") && (path.includes("/scl/fo/") || path.includes("/sh/")))
    return true;
  if (path.endsWith("/")) return true;
  return false;
};

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
  const [mode, setMode] = useState<"file" | "url">("file");
  const [industry, setIndustry] = useState<Industry | "">("");
  const [subIndustry, setSubIndustry] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // URL import
  const [url, setUrl] = useState("");
  const [validating, setValidating] = useState(false);
  const [urlError, setUrlError] = useState<UrlError>(null);
  const [imported, setImported] = useState<ImportedAsset | null>(null);

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setName("");
    setIndustry("");
    setSubIndustry("");
    setChecking(false);
    setMode("file");
    setUrl("");
    setUrlError(null);
    setImported(null);
    setValidating(false);
  };

  const handleFileChosen = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  };

  /** Load an image/video element to read real dimensions (works cross-origin). */
  const probeMedia = (src: string, isVideo: boolean) =>
    new Promise<{ w: number; h: number; d?: number } | null>((resolve) => {
      const t = setTimeout(() => resolve(null), 10000);
      if (isVideo) {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => {
          clearTimeout(t);
          resolve({ w: v.videoWidth, h: v.videoHeight, d: Math.round(v.duration) });
        };
        v.onerror = () => {
          clearTimeout(t);
          resolve(null);
        };
        v.src = src;
      } else {
        const img = new Image();
        img.onload = () => {
          clearTimeout(t);
          resolve({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.onerror = () => {
          clearTimeout(t);
          resolve(null);
        };
        img.src = src;
      }
    });

  const validateUrl = async () => {
    setUrlError(null);
    setImported(null);

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
    } catch {
      setUrlError("invalid");
      return;
    }

    if (looksLikeFolder(parsed)) {
      setUrlError("multiple");
      return;
    }

    const ext = extOf(parsed.pathname);
    if (["html", "htm", "php", "aspx"].includes(ext)) {
      setUrlError("multiple");
      return;
    }

    const isImageExt = IMAGE_EXT.includes(ext);
    const isVideoExt = VIDEO_EXT.includes(ext);
    if (ext && !isImageExt && !isVideoExt) {
      setUrlError("unsupported");
      return;
    }

    setValidating(true);
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10000);

    let contentType = "";
    let sizeBytes = 0;
    let fetched = false;
    try {
      const res = await fetch(parsed.toString(), { signal: controller.signal });
      if (res.status === 403 || res.status === 404 || !res.ok) {
        clearTimeout(timer);
        setValidating(false);
        setUrlError("unreachable");
        return;
      }
      contentType = res.headers.get("content-type") ?? "";
      sizeBytes = Number(res.headers.get("content-length") ?? 0);
      fetched = true;
    } catch {
      // CORS or network failure — fall back to a media-element probe below.
      if (timedOut) {
        clearTimeout(timer);
        setValidating(false);
        setUrlError("timeout");
        return;
      }
    }
    clearTimeout(timer);

    if (fetched) {
      if (contentType.startsWith("text/html")) {
        setValidating(false);
        setUrlError("multiple");
        return;
      }
      const okType = contentType.startsWith("image/") || contentType.startsWith("video/");
      if (contentType && !okType) {
        setValidating(false);
        setUrlError("unsupported");
        return;
      }
      if (sizeBytes > MAX_MB * 1024 * 1024) {
        setValidating(false);
        setUrlError("too_large");
        return;
      }
    }

    const isVideo = contentType.startsWith("video/") || isVideoExt;
    if (!fetched && !isImageExt && !isVideoExt) {
      setValidating(false);
      setUrlError("unreachable");
      return;
    }

    const meta = await probeMedia(parsed.toString(), isVideo);
    setValidating(false);
    if (!meta) {
      setUrlError("unreachable");
      return;
    }

    const fileName = decodeURIComponent(parsed.pathname.split("/").pop() || "creative");
    const asset: ImportedAsset = {
      url: parsed.toString(),
      name: fileName.replace(/\.[^.]+$/, ""),
      type: isVideo ? "video" : "image",
      format: (ext || contentType.split("/")[1] || "").toUpperCase(),
      sizeKB: sizeBytes ? Math.round(sizeBytes / 1024) : Math.round((meta.w * meta.h) / 900),
      width: meta.w,
      height: meta.h,
      durationSec: meta.d,
    };
    setImported(asset);
    if (!name) setName(asset.name);
  };

  const finish = (created: Creative) => {
    addCreative(created);
    onCreated?.(created);
    toast.info(
      "Creative added — it stays in review until a campaign using it is submitted and reviewed.",
    );
    onOpenChange(false);
    reset();
  };

  const submit = () => {
    if (!industry || !subIndustry) {
      toast.error("Please pick an Industry and a Sub-Industry.");
      return;
    }

    if (mode === "url") {
      if (!imported) {
        toast.error("Validate the link first.");
        return;
      }
      finish({
        id: `cre_${Date.now()}`,
        name: name.trim() || imported.name,
        type: imported.type,
        url: imported.url,
        width: imported.width || 1920,
        height: imported.height || 1080,
        sizeKB: imported.sizeKB,
        durationSec: imported.durationSec,
        uploadedAt: new Date().toISOString().slice(0, 10),
        tags: [],
        industry: industry as Industry,
        subIndustry,
        status: "pending",
        previouslyApproved: false,
      });
      return;
    }

    if (!file) {
      toast.error("Please choose a file to upload.");
      return;
    }
    const isVideo = file.type.startsWith("video/");
    const objectUrl = previewUrl!;
    setChecking(true);
    probeMedia(objectUrl, isVideo).then((meta) => {
      finish({
        id: `cre_${Date.now()}`,
        name: name.trim() || file.name,
        type: isVideo ? "video" : "image",
        url: objectUrl,
        width: meta?.w || 1920,
        height: meta?.h || 1080,
        sizeKB: Math.round(file.size / 1024),
        durationSec: meta?.d,
        uploadedAt: new Date().toISOString().slice(0, 10),
        tags: [],
        industry: industry as Industry,
        subIndustry,
        status: "pending",
        previouslyApproved: false,
      });
    });
  };

  const canSubmit =
    !!industry && !!subIndustry && !checking && (mode === "file" ? !!file : !!imported);

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
            Tag with an Industry and Sub-Industry so we route it to the right screens, then add your
            file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Industry</Label>
            <div className="mt-1.5">
              <TagSelect
                value={industry}
                onChange={(v) => {
                  setIndustry(v as Industry);
                  setSubIndustry("");
                }}
                options={INDUSTRIES}
                placeholder="Select industry"
                searchPlaceholder="Search industries…"
              />
            </div>
          </div>

          <div>
            <Label>Sub-Industry</Label>
            <div className="mt-1.5">
              <TagSelect
                value={subIndustry}
                onChange={setSubIndustry}
                options={subIndustriesFor(industry)}
                disabled={!industry}
                placeholder={industry ? "Select sub-industry" : "Pick an industry first"}
                searchPlaceholder="Search sub-industries…"
              />
            </div>
            {(industry || subIndustry) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {industry && <TagChip>{industry}</TagChip>}
                {subIndustry && <TagChip tone="muted">{subIndustry}</TagChip>}
              </div>
            )}
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

          {/* Source picker */}
          <div className="inline-flex w-full rounded-lg border bg-muted/40 p-1">
            {(
              [
                ["file", "Upload file", Upload],
                ["url", "Import from URL", Link2],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
                  mode === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {mode === "file" ? (
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
          ) : (
            <div>
              <Label>Creative link</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setUrlError(null);
                    setImported(null);
                  }}
                  placeholder="https://example.com/my-poster.jpg"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={validateUrl}
                  disabled={!url.trim() || validating}
                  className="shrink-0"
                >
                  {validating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Validate &amp; import
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Direct link to one image or video, under {MAX_MB} MB.
              </p>

              {urlError && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTitle>{URL_ERROR_COPY[urlError].title}</AlertTitle>
                  <AlertDescription>{URL_ERROR_COPY[urlError].body}</AlertDescription>
                </Alert>
              )}

              {imported && (
                <div className="mt-3 rounded-lg border bg-secondary/30 p-3">
                  <div className="mx-auto aspect-video w-56 overflow-hidden rounded bg-black">
                    {imported.type === "video" ? (
                      <video src={imported.url} className="h-full w-full object-cover" muted autoPlay loop />
                    ) : (
                      <img src={imported.url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">{imported.name}</span> ·{" "}
                      {imported.format || imported.type.toUpperCase()}
                    </p>
                    <p>
                      {imported.width}×{imported.height}
                      {imported.durationSec ? ` · ${imported.durationSec}s` : ""} ·{" "}
                      {imported.sizeKB >= 1024
                        ? `${(imported.sizeKB / 1024).toFixed(1)} MB`
                        : `${imported.sizeKB} KB`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {checking && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {mode === "url" ? "Add to library" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
