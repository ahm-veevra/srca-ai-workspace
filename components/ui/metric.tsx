import * as React from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "./card";
import { Sparkline } from "./sparkline";

/** Up/down delta chip. `goodWhenUp` flips the color semantics (e.g. latency, cost). */
export function MetricDelta({
  value,
  goodWhenUp = true,
  className,
}: {
  value: number;
  goodWhenUp?: boolean;
  className?: string;
}) {
  const up = value >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular",
        good ? "text-success" : "text-danger",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value)}%
    </span>
  );
}

/** Executive KPI tile: label + big numeral + delta + optional sparkline. */
export function KpiCard({
  label,
  value,
  unit,
  delta,
  goodWhenUp = true,
  spark,
  icon: Icon,
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: number;
  goodWhenUp?: boolean;
  spark?: number[];
  icon?: LucideIcon;
  href?: string;
  className?: string;
}) {
  const inner = (
    <Card variant="kpi" className={cn("h-full p-4", className)}>
      <div className="flex items-start justify-between">
        <p className="eyebrow">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-display text-3xl font-bold leading-none tabular">
          {value}
        </span>
        {unit && (
          <span className="pb-0.5 text-sm text-muted-foreground">{unit}</span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        {typeof delta === "number" ? (
          <MetricDelta value={delta} goodWhenUp={goodWhenUp} />
        ) : (
          <span />
        )}
        {spark && spark.length > 1 && <Sparkline data={spark} />}
      </div>
    </Card>
  );

  if (href) {
    return (
      <a href={href} className="block focus-visible:outline-none">
        {inner}
      </a>
    );
  }
  return inner;
}
