import * as React from "react";

import { cn } from "@/lib/utils";
import type { StatusTone } from "./status-dot";

const toneColor: Record<StatusTone, string> = {
  accent: "hsl(var(--accent))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  danger: "hsl(var(--danger))",
  info: "hsl(var(--info))",
  muted: "hsl(var(--muted-foreground))",
};

/** Circular score gauge (0–100). Renders a value with an optional sub-label. */
export function Gauge({
  value,
  max = 100,
  size = 88,
  tone = "accent",
  label,
  suffix,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  tone?: StatusTone;
  label?: string;
  suffix?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  return (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="hsl(var(--surface-3))"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={toneColor[tone]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-xl font-bold tabular">
            {Math.round(value)}
            {suffix}
          </span>
        </div>
      </div>
      {label && (
        <span className="mt-1 text-xs text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
