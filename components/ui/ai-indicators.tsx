import * as React from "react";
import { Shield, ShieldAlert, ShieldX, Sparkles, Route } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import { StatusDot, type StatusTone } from "./status-dot";

/** Marks an AI-generated / AI-assisted surface. */
export function AiBadge({
  label = "AI",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Badge variant="ai" className={className}>
      <Sparkles className="h-3 w-3" />
      {label}
    </Badge>
  );
}

/** Model name + optional health dot. */
export function ModelIndicator({
  model,
  health,
  className,
}: {
  model: string;
  health?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface-3 px-2 py-0.5 font-mono text-xs",
        className,
      )}
    >
      {health && <StatusDot tone={health} />}
      {model}
    </span>
  );
}

/** Shows the routing path that was taken, e.g. rule ▸ cheapest ▸ fallback. */
export function RoutingIndicator({
  steps,
  className,
}: {
  steps: string[];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-info/40 bg-info/10 px-2 py-0.5 text-xs text-info",
        className,
      )}
    >
      <Route className="h-3 w-3" />
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="opacity-50">▸</span>}
          <span>{s}</span>
        </React.Fragment>
      ))}
    </span>
  );
}

export type GovernanceState = "governed" | "flagged" | "blocked";

const govMap: Record<
  GovernanceState,
  { icon: typeof Shield; label: string; variant: "governed" | "warning" | "blocked" }
> = {
  governed: { icon: Shield, label: "Governed", variant: "governed" },
  flagged: { icon: ShieldAlert, label: "Flagged", variant: "warning" },
  blocked: { icon: ShieldX, label: "Blocked", variant: "blocked" },
};

export function GovernanceIndicator({
  state,
  className,
}: {
  state: GovernanceState;
  className?: string;
}) {
  const { icon: Icon, label, variant } = govMap[state];
  return (
    <Badge variant={variant} className={className}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

/** 5-segment confidence meter (0–1). */
export function ConfidenceMeter({
  value,
  showLabel = true,
  className,
}: {
  value: number;
  showLabel?: boolean;
  className?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  const filled = Math.round(v * 5);
  const tone = v >= 0.75 ? "bg-success" : v >= 0.45 ? "bg-warning" : "bg-danger";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-flex gap-0.5" aria-label={`Confidence ${Math.round(v * 100)}%`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-3 w-1.5 rounded-sm",
              i < filled ? tone : "bg-surface-3",
            )}
          />
        ))}
      </span>
      {showLabel && (
        <span className="text-xs tabular text-muted-foreground">
          {Math.round(v * 100)}%
        </span>
      )}
    </span>
  );
}
