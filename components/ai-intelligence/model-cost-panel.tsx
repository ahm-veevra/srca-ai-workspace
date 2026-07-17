import { Coins, Cpu, Wallet } from "lucide-react";

import { AwaitingData } from "@/components/command-center/awaiting-data";
import { Card } from "@/components/ui/card";
import { type ModelCostData } from "@/lib/ai-intelligence-source";
import { serverT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

import { LineageButton } from "./lineage-button";

const COST_ENDPOINTS = ["/metrics/overview", "/metrics/by-model", "/cost/budgets/status"];

/* ── formatters ─────────────────────────────────────────────────────────────── */

/** Compact number: 1_234 → "1.2k", 2_400_000 → "2.4M". */
function compact(n: number | null): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

function money(n: number | null, currency: string | null): string {
  if (n == null) return "—";
  const v = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${v}` : v;
}

function latency(ms: number | null): string {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

function pctOf(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate <= 1 ? rate * 100 : rate)}%`;
}

function budgetTone(pct: number): { bar: string; text: string } {
  if (pct >= 90) return { bar: "bg-danger", text: "text-danger" };
  if (pct >= 75) return { bar: "bg-warning", text: "text-warning" };
  return { bar: "bg-success", text: "text-success" };
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  );
}

/* ── panel ──────────────────────────────────────────────────────────────────── */

export function ModelCostPanel({ data }: { data: ModelCostData }) {
  const t = serverT();
  const { totals, byModel, budgets, connected } = data;
  const maxCost = byModel.reduce((m, r) => Math.max(m, r.cost), 0);
  const currency = totals?.currency ?? null;

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Coins className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-semibold">{t("ai.mc.title")}</h2>
              <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {t("ai.mc.window24h")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t("ai.mc.subtitle")}</p>
          </div>
        </div>
        <LineageButton
          icon="coins"
          sourceLabel={t("ai.lin.srcObservability")}
          rows={[{ label: t("ai.lin.model"), value: t("ai.lin.noModel") }]}
          endpoints={COST_ENDPOINTS}
        />
      </div>

      {!connected ? (
        <AwaitingData label={t("ai.mc.awaiting")} hint={t("ai.mc.awaitingHint")} />
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label={t("ai.mc.requests")} value={compact(totals?.requests ?? null)} sub={pctOf(totals?.successRate ?? null) + " " + t("ai.mc.successRate")} />
            <Stat label={t("ai.mc.cost")} value={money(totals?.cost ?? null, currency)} />
            <Stat label={t("ai.mc.tokens")} value={`${compact(totals?.inputTokens ?? null)} / ${compact(totals?.outputTokens ?? null)}`} />
            <Stat label={t("ai.mc.latency")} value={latency(totals?.avgLatencyMs ?? null)} />
            <Stat label={t("ai.mc.p95")} value={latency(totals?.p95LatencyMs ?? null)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Spend by model */}
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{t("ai.mc.byModel")}</h3>
              </div>
              {byModel.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("ai.mc.noModels")}</p>
              ) : (
                <ul className="space-y-3">
                  {byModel.slice(0, 8).map((m) => (
                    <li key={m.modelKey} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={m.modelKey}>
                          {m.modelKey}
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular">{money(m.cost, currency)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${maxCost ? (m.cost / maxCost) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="tabular">{compact(m.requests)} · {t("ai.mc.requests").toLowerCase()}</span>
                        <span className="tabular">{compact(m.inputTokens)} / {compact(m.outputTokens)} · {latency(m.avgLatencyMs)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Budgets */}
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{t("ai.mc.budgets")}</h3>
              </div>
              {budgets.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("ai.mc.noBudgets")}</p>
              ) : (
                <ul className="space-y-3.5">
                  {budgets.map((b) => {
                    const tone = budgetTone(b.pct);
                    return (
                      <li key={b.id} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{b.name}</span>
                          <span className={cn("shrink-0 text-sm font-semibold tabular", tone.text)}>{Math.round(b.pct)}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width: `${Math.min(100, b.pct)}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          <span className="tabular">{money(b.spent, currency)}</span> {t("ai.mc.spent")} ·{" "}
                          {t("ai.mc.ofLimit", { limit: money(b.limit, currency) })}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
