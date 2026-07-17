"use client";

import * as React from "react";
import { ArrowRight, FlaskConical, RotateCcw } from "lucide-react";

import { simulateWhatIf, type SimProjection } from "@/lib/command-center-assist";
import { useLocale, useT } from "@/lib/i18n";
import { dl } from "@/lib/command-center-labels";
import { cn } from "@/lib/utils";
import { type SimBaseline, type SimScenario } from "@/lib/command-center-types";

import { AwaitingData } from "./awaiting-data";
import { ProvenanceButton } from "./provenance-button";

interface Metric {
  key: string;
  label: string;
  base: number;
  sim: number;
  fmt: (v: number) => string;
  /** true if higher is better (green when sim > base). */
  goodWhenUp: boolean;
}

export function WhatIfSimulator({
  baseline = null,
  scenarios = [],
  capabilityId,
}: {
  baseline?: SimBaseline | null;
  scenarios?: SimScenario[];
  capabilityId?: string;
}) {
  const { locale } = useLocale();
  const t = useT();
  const [active, setActive] = React.useState<Set<string>>(new Set());
  const [running, setRunning] = React.useState(false);
  const [projected, setProjected] = React.useState<SimProjection | null>(null);
  const [simBusy, setSimBusy] = React.useState(false);

  // When a What-If capability is configured, ask AICP to estimate the impact of the selected
  // scenarios (debounced). Otherwise the deterministic delta calculation below is used.
  React.useEffect(() => {
    if (!capabilityId || active.size === 0) {
      setProjected(null);
      setSimBusy(false);
      return;
    }
    const labels = scenarios.filter((s) => active.has(s.key)).map((s) => s.label);
    let cancelled = false;
    setSimBusy(true);
    const t = window.setTimeout(() => {
      simulateWhatIf(capabilityId, labels, locale).then((p) => {
        if (!cancelled) {
          setProjected(p);
          setSimBusy(false);
        }
      });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [active, capabilityId, scenarios, locale]);

  const toggle = (k: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
    setRunning(true);
    window.setTimeout(() => setRunning(false), 550);
  };
  const reset = () => setActive(new Set());

  if (!baseline || scenarios.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <AwaitingData label={t("cc.whatif.awaiting")} hint={t("cc.whatif.awaitingHint")} />
      </section>
    );
  }

  const sel = scenarios.filter((s) => active.has(s.key));
  const sum = (f: (s: SimScenario) => number) => sel.reduce((a, s) => a + f(s), 0);
  const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

  const b = baseline;
  // Deterministic projection (fallback / used when no What-If capability is configured).
  const det: SimProjection = {
    response: Math.max(4, b.response + sum((s) => s.responseDelta)),
    coverage: clamp(b.coverage + sum((s) => s.coverageDelta)),
    hospitalLoad: clamp(b.hospitalLoad + sum((s) => s.hospitalLoadDelta)),
    fleetUtil: clamp(b.fleetUtil + sum((s) => s.fleetUtilDelta)),
    lives: Math.max(0, b.lives + sum((s) => s.livesDelta)),
    sla: clamp(b.sla + sum((s) => s.slaDelta)),
    cost: b.cost + sum((s) => s.costDelta),
  };
  // Prefer the AI capability's projection when available.
  const sim = projected ?? det;
  const metrics: Metric[] = [
    { key: "response", label: t("cc.whatif.response"), base: b.response, sim: sim.response, fmt: (v) => `${v.toFixed(1)} min`, goodWhenUp: false },
    { key: "coverage", label: t("cc.whatif.coverage"), base: b.coverage, sim: sim.coverage, fmt: (v) => `${Math.round(v)}%`, goodWhenUp: true },
    { key: "hospital", label: t("cc.whatif.hospital"), base: b.hospitalLoad, sim: sim.hospitalLoad, fmt: (v) => `${Math.round(v)}%`, goodWhenUp: false },
    { key: "fleet", label: t("cc.whatif.fleet"), base: b.fleetUtil, sim: sim.fleetUtil, fmt: (v) => `${Math.round(v)}%`, goodWhenUp: false },
    { key: "lives", label: t("cc.whatif.lives"), base: b.lives, sim: sim.lives, fmt: (v) => `${Math.round(v)}`, goodWhenUp: true },
    { key: "sla", label: t("cc.whatif.sla"), base: b.sla, sim: sim.sla, fmt: (v) => `${v.toFixed(1)}%`, goodWhenUp: true },
    { key: "cost", label: t("cc.whatif.cost"), base: b.cost, sim: sim.cost, fmt: (v) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toLocaleString()} ${t("cc.whatif.sar")}`, goodWhenUp: false },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FlaskConical className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold leading-tight">{t("cc.whatif.title")}</h2>
            <p className="text-[11px] text-muted-foreground">{t("cc.whatif.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ProvenanceButton surfaceKey="sim" />
          <button
            onClick={reset}
            disabled={active.size === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {t("cc.whatif.reset")}
          </button>
        </div>
      </div>

      {/* Scenario toggles */}
      <div className="mt-4 flex flex-wrap gap-2">
        {scenarios.map((s) => {
          const on = active.has(s.key);
          return (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                on ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-surface-2 text-foreground hover:border-border-strong",
              )}
            >
              {dl(t, s.label)}
            </button>
          );
        })}
      </div>

      {/* Comparison */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => {
          const changed = Math.abs(m.sim - m.base) > 0.05;
          const up = m.sim > m.base;
          const good = !changed ? null : up === m.goodWhenUp;
          return (
            <div key={m.key} className="rounded-xl border border-border bg-surface-2 p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{m.label}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm tabular text-muted-foreground">{m.fmt(m.base)}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span
                  className={cn(
                    "font-display text-lg font-bold tabular transition-colors",
                    good === null ? "text-foreground" : good ? "text-success" : "text-danger",
                    (running || simBusy) && "opacity-40",
                  )}
                >
                  {m.fmt(m.sim)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        {active.size === 0
          ? t("cc.whatif.selectPrompt")
          : simBusy
            ? t("cc.whatif.estimating")
            : capabilityId && projected
              ? t("cc.whatif.simulatingCap", { n: active.size })
              : t("cc.whatif.simulatingDet", { n: active.size })}
      </p>
    </section>
  );
}
