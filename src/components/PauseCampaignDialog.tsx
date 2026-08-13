import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PauseDuration, PauseUnit } from "@/lib/mockData";

const MAXES: Record<Exclude<PauseUnit, "indefinite">, number> = {
  days: 365,
  weeks: 52,
  months: 24,
};

export function PauseCampaignDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (duration: PauseDuration, reason: string) => void;
}) {
  const [unit, setUnit] = useState<PauseUnit>("days");
  const [value, setValue] = useState("7");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setUnit("days");
      setValue("7");
      setReason("");
    }
  }, [open]);

  const indefinite = unit === "indefinite";
  const num = Number(value);
  const max = indefinite ? 0 : MAXES[unit as Exclude<PauseUnit, "indefinite">];
  const error = indefinite
    ? null
    : value.trim() === ""
      ? "Enter how long to pause for."
      : !Number.isInteger(num) || num < 1
        ? "Enter a whole number of 1 or more."
        : num > max
          ? `Maximum is ${max} ${unit}.`
          : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pause this campaign?</DialogTitle>
          <DialogDescription>
            Your ad stops showing on screens while paused. You can resume it any time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Pause duration</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                type="number"
                min={1}
                max={max || undefined}
                value={indefinite ? "" : value}
                disabled={indefinite}
                onChange={(e) => setValue(e.target.value)}
                placeholder={indefinite ? "—" : "e.g., 7"}
                className="w-28 disabled:bg-muted disabled:text-muted-foreground"
              />
              <Select value={unit} onValueChange={(v) => setUnit(v as PauseUnit)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                  <SelectItem value="indefinite">Indefinitely</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error ? (
              <p className="mt-1.5 text-xs text-destructive">{error}</p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {indefinite
                  ? "Paused until you resume it yourself."
                  : `We'll note a planned resume date — you still resume it manually.`}
              </p>
            )}
          </div>

          <div>
            <Label>Reason for pause (optional)</Label>
            <Textarea
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="e.g., Waiting for new festive artwork"
              className="mt-1.5"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{reason.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep it running
          </Button>
          <Button
            disabled={!!error}
            onClick={() =>
              onConfirm({ value: indefinite ? null : num, unit }, reason)
            }
          >
            Pause campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function pauseLabel(c: {
  status: string;
  resumeOn?: string | null;
  pauseDuration?: PauseDuration;
}) {
  if (c.status !== "paused") return null;
  if (c.resumeOn)
    return `Paused until ${new Date(c.resumeOn).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  return "Paused indefinitely";
}
