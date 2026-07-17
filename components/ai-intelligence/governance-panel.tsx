import { ClipboardCheck, FileClock, ScrollText, ShieldCheck } from "lucide-react";

import { AwaitingData } from "@/components/command-center/awaiting-data";
import { Card } from "@/components/ui/card";
import { type GovernanceData } from "@/lib/ai-intelligence-source";
import { serverT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

import { LineageButton } from "./lineage-button";

const GOV_ENDPOINTS = [
  "/governance/score",
  "/governance/risk-models",
  "/governance/violations",
  "/validation/tasks",
  "/audit-logs",
  "/metrics/overview",
];

/* ── helpers ────────────────────────────────────────────────────────────────── */

/** Colour a governance grade / score band. */
function gradeTone(score: number | null, grade: string | null): string {
  const g = (grade ?? "").toUpperCase();
  if (g.startsWith("A") || (score ?? 0) >= 85) return "text-success";
  if (g.startsWith("B") || (score ?? 0) >= 70) return "text-warning";
  if (grade || score != null) return "text-danger";
  return "text-muted-foreground";
}

function sevTone(sev?: string): string {
  switch ((sev ?? "").toLowerCase()) {
    case "critical":
    case "high":
      return "bg-danger/10 text-danger";
    case "medium":
      return "bg-warning/10 text-warning";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-bold tabular", tone)}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  );
}

const fmt = (n: number | null, digits = 0): string =>
  n == null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: digits });

/* ── panel ──────────────────────────────────────────────────────────────────── */

export function GovernancePanel({ data }: { data: GovernanceData }) {
  const t = serverT();
  const { score, riskModels, violationsCount, pendingReview, audit, metrics, connected } = data;

  if (!connected) {
    return (
      <section className="space-y-4">
        <Header />
        <AwaitingData label={t("ai.gov.awaiting")} hint={t("ai.gov.awaitingHint")} />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <Header />

      {/* Score hero + headline stats */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
        <Card className="flex items-center gap-5 p-5">
          <div className="flex flex-col items-center">
            <span className={cn("font-display text-5xl font-bold tabular", gradeTone(score?.overall ?? null, score?.grade ?? null))}>
              {score?.overall != null ? Math.round(score.overall) : "—"}
            </span>
            <span className="eyebrow mt-1">{t("ai.gov.score")}</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <Row label={t("ai.gov.grade")} value={score?.grade ?? "—"} strong />
            {score?.posture && <Row label={t("ai.gov.posture")} value={score.posture} />}
            {score?.coverage != null && <Row label={t("ai.gov.coverage")} value={`${Math.round(score.coverage)}%`} />}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label={t("ai.gov.riskModels")} value={fmt(riskModels.length)} />
          <StatCard
            label={t("ai.gov.violations")}
            value={fmt(violationsCount)}
            tone={violationsCount ? "text-danger" : "text-success"}
          />
          <StatCard label={t("ai.gov.pendingReview")} value={fmt(pendingReview.length)} tone={pendingReview.length ? "text-warning" : undefined} />
          <StatCard
            label={t("ai.gov.requests24h")}
            value={fmt(metrics?.totalRequests ?? null)}
            sub={metrics?.successRate != null ? `${Math.round(metrics.successRate * (metrics.successRate <= 1 ? 100 : 1))}% ${t("ai.gov.successRate")}` : undefined}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Risk models */}
        <Card className="p-5">
          <SubHead icon={ShieldCheck} title={t("ai.gov.riskModelsTitle")} />
          {riskModels.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("ai.gov.noRiskModels")}</p>
          ) : (
            <ul className="space-y-2">
              {riskModels.slice(0, 6).map((m) => (
                <li key={m.key} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.name}</span>
                  {m.version != null && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">{t("ai.gov.version", { n: String(m.version) })}</span>
                  )}
                  {m.status && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      {m.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* HITL review queue */}
        <Card className="p-5">
          <SubHead icon={ClipboardCheck} title={t("ai.gov.hitlTitle")} />
          {pendingReview.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("ai.gov.noReviews")}</p>
          ) : (
            <ul className="space-y-2">
              {pendingReview.slice(0, 6).map((tk) => (
                <li key={tk.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{tk.title}</span>
                  {tk.priority && (
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", sevTone(tk.priority))}>
                      {tk.priority}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Audit ledger */}
      <Card className="p-5">
        <SubHead icon={ScrollText} title={t("ai.gov.auditTitle")} />
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("ai.gov.noAudit")}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {audit.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                <FileClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="font-medium">{a.actor}</span>
                <span className="text-muted-foreground">{a.action}</span>
                {a.resourceType && (
                  <span className="truncate text-[11px] text-muted-foreground">
                    {a.resourceType}
                    {a.resourceId ? ` · ${a.resourceId.slice(0, 8)}` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

/* ── little pieces ──────────────────────────────────────────────────────────── */

function Header() {
  const t = serverT();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold">{t("ai.gov.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("ai.gov.subtitle")}</p>
        </div>
      </div>
      <LineageButton
        icon="shield"
        sourceLabel={t("ai.lin.srcGovernance")}
        rows={[{ label: t("ai.lin.model"), value: t("ai.lin.noModel") }]}
        endpoints={GOV_ENDPOINTS}
      />
    </div>
  );
}

function SubHead({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(strong ? "font-semibold text-foreground" : "text-foreground")}>{value}</span>
    </div>
  );
}
