import * as React from "react";

import { cn } from "@/lib/utils";

export type StatusTone = "accent" | "success" | "warning" | "danger" | "info" | "muted";

const toneBg: Record<StatusTone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  muted: "bg-muted-foreground",
};

/** A small status dot, optionally pulsing for live/active states. */
export function StatusDot({
  tone = "muted",
  pulse = false,
  className,
}: {
  tone?: StatusTone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex h-2.5 w-2.5", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            toneBg[tone],
          )}
        />
      )}
      <span
        className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", toneBg[tone])}
      />
    </span>
  );
}

/** "Live" pill with a pulsing teal dot — used on streaming / WS-backed views. */
export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent",
        className,
      )}
    >
      <StatusDot tone="accent" pulse />
      Live
    </span>
  );
}
