import { DatabaseZap } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Placeholder shown when a command-center surface has no live data yet (the AICP
 * data-lake connector isn't returning rows). Replaces the previous static demo data.
 */
export function AwaitingData({
  label = "Awaiting live data from AICP",
  hint = "Connect the data-lake connector to populate this panel.",
  className,
  compact = false,
}: {
  label?: string;
  hint?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-center",
        compact ? "min-h-[120px] gap-1.5 p-4" : "min-h-[168px] gap-2 p-6",
        className,
      )}
    >
      <DatabaseZap className={cn("text-muted-foreground/60", compact ? "h-5 w-5" : "h-6 w-6")} />
      <p className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>{label}</p>
      {hint && <p className="max-w-xs text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
