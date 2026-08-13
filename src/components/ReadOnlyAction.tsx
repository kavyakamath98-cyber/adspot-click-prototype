import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** A disabled write action with an explanation of why it's unavailable. */
export function ReadOnlyAction({
  label,
  reason = "You have read-only access to this campaign. Ask an admin for write access.",
}: {
  label: string;
  reason?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block">
            <Button className="gap-1.5" disabled>
              <Lock className="h-4 w-4" />
              {label}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
