"use client";

import * as React from "react";
import {
  Activity,
  Ambulance,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Gauge,
  HeartPulse,
  Hospital,
  type LucideIcon,
  PhoneCall,
  ShieldCheck,
  Timer,
} from "lucide-react";

import { Sparkline } from "@/components/ui/sparkline";
import { useT } from "@/lib/i18n";
import { dl } from "@/lib/command-center-labels";
import { cn } from "@/lib/utils";
import { fmtKpi, type Kpi, type Status } from "@/lib/command-center-types";

import { AwaitingData } from "./awaiting-data";
import { ProvenanceButton } from "./provenance-button";

/** Map a KPI key → its Lucide icon (kept client-side; icons can't cross the RSC boundary). */
const KPI_ICONS: Record<string, LucideIcon> = {
  calls: PhoneCall,
  active: AlertTriangle,
  inservice: Ambulance,
  available: Ambulance,
  response: Timer,
  sla: ShieldCheck,
  patients: HeartPulse,
  transfers: Hospital,
  critical: Activity,
  readiness: Gauge,
};

const RING: Record<Status, string> = {
  good: "hsl(var(--success))",
  warn: "hsl(var(--warning))",
  critical: "hsl(var(--danger))",
};
const DOT: Record<Status, string> = { good: "bg-success", warn: "bg-warning", critical: "bg-danger" };

/** Animated count-up from 0 → target on mount. */
function useCountUp(target: number, decimals: number, ms = 1100) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    let start = 0;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else setV(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  const factor = Math.pow(10, decimals);
  return Math.round(v * factor) / factor;
}

function KpiTile({ k, i, t }: { k: Kpi; i: number; t: ReturnType<typeof useT> }) {
  const label = dl(t, k.label);
  const decimals = k.format === "min" ? 1 : k.format === "pct" ? 1 : 0;
  const n = useCountUp(k.value, decimals);
  const up = k.delta >= 0;
  const good = up === k.goodWhenUp;
  const Delta = up ? ArrowUpRight : ArrowDownRight;
  const Icon = KPI_ICONS[k.key] ?? Activity;
  return (
    <div
      className="group animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
      style={{ animationDelay: `${i * 45}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className={cn("h-2 w-2 rounded-full", DOT[k.status])} title={k.status} />
      </div>
      <p className="mt-3 truncate text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground" title={label}>
        {label}
      </p>
      <div className="mt-1 flex items-end gap-1.5">
        <span className="font-display text-2xl font-bold leading-none tabular">
          {fmtKpi(n, k.format)}
        </span>
        {k.format === "min" && <span className="pb-0.5 text-xs text-muted-foreground">min</span>}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular", good ? "text-success" : "text-danger")}>
          <Delta className="h-3.5 w-3.5" />
          {Math.abs(k.delta)}%
        </span>
        <Sparkline data={k.spark} stroke={RING[k.status]} width={72} height={22} />
      </div>
    </div>
  );
}

export function KpiOverview({ kpis = [] }: { kpis?: Kpi[] }) {
  const t = useT();
  if (kpis.length === 0) return <AwaitingData label={t("cc.kpi.awaiting")} />;
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{t("cc.kpi.title")}</p>
        <ProvenanceButton surfaceKey="exec_kpis" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k, i) => (
          <KpiTile key={k.key} k={k} i={i} t={t} />
        ))}
      </div>
    </section>
  );
}
