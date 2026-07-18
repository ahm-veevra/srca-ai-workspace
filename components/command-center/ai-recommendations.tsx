"use client";

import * as React from "react";
import { Check, Loader2, Sparkles, TrendingUp, X, Zap } from "lucide-react";

import { Card } from "@/components/ui/card";
import { regenerateRecommendations } from "@/lib/command-center-assist";
import { useLocale, useT } from "@/lib/i18n";
import { type MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { type Recommendation } from "@/lib/command-center-types";

import { AwaitingData } from "./awaiting-data";
import { ProvenanceButton } from "./provenance-button";

/** Visual treatment per priority tier. */
const PRIORITY: Record<
  Recommendation["priority"],
  { accent: string; pill: string; label: string }
> = {
  Critical: {
    accent: "border-l-[3px] border-l-danger",
    pill: "bg-danger/10 text-danger",
    label: "Critical",
  },
  High: {
    accent: "border-l-[3px] border-l-warning",
    pill: "bg-warning/10 text-warning",
    label: "High",
  },
  Medium: {
    accent: "",
    pill: "bg-muted text-muted-foreground",
    label: "Medium",
  },
};

const IMPACT: Record<Recommendation["impact"], string> = {
  High: "bg-primary/10 text-primary",
  Medium: "bg-info/10 text-info",
  Low: "bg-muted text-muted-foreground",
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const t = useT();
  const lvl = (v: string) => t(("cc.level." + v.toLowerCase()) as MessageKey);
  const priority = PRIORITY[rec.priority];

  return (
    <Card
      className={cn(
        "flex flex-col gap-4 p-5 shadow-sm transition-all hover:border-border-strong",
        priority.accent,
      )}
    >
      {/* Header: priority ribbon + confidence */}
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold",
            priority.pill,
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          {lvl(rec.priority)}
        </span>
        <span className="eyebrow shrink-0 pt-0.5">{rec.id}</span>
      </div>

      {/* Title + reason */}
      <div className="space-y-1.5">
        <h3 className="font-display text-base font-semibold leading-snug">
          {rec.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {rec.reason}
        </p>
      </div>

      {/* Expected benefit — the hero metric */}
      <div className="rounded-xl bg-success/10 px-4 py-3">
        <p className="eyebrow text-success/80">{t("cc.recs.expectedBenefit")}</p>
        <p className="mt-0.5 flex items-center gap-1.5 font-display text-xl font-bold text-success">
          <TrendingUp className="h-5 w-5 shrink-0" />
          <span className="tabular leading-tight">{rec.benefit}</span>
        </p>
      </div>

      {/* Confidence bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="eyebrow">{t("cc.recs.aiConfidence")}</span>
          <span className="tabular font-semibold text-foreground">
            {rec.confidence}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${rec.confidence}%` }}
          />
        </div>
      </div>

      {/* Meta chips */}
      <div className="flex flex-wrap gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
            IMPACT[rec.impact],
          )}
        >
          {t("cc.recs.impact", { level: lvl(rec.impact) })}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
            priority.pill,
          )}
        >
          {t("cc.recs.priority", { level: lvl(rec.priority) })}
        </span>
      </div>

      {/* Actions (styled, non-functional) */}
      <div className="mt-auto flex items-center gap-2 pt-1">
        <button
          type="button"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Check className="h-4 w-4" />
          {t("cc.recs.apply")}
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
          {t("cc.recs.dismiss")}
        </button>
      </div>
    </Card>
  );
}

export function AiRecommendations({
  recommendations = [],
  capabilityId,
}: {
  recommendations?: Recommendation[];
  capabilityId?: string;
}) {
  const { locale } = useLocale();
  const t = useT();
  const [recs, setRecs] = React.useState<Recommendation[]>(recommendations);
  const [busy, setBusy] = React.useState(false);

  // Recommendations are generated CLIENT-SIDE (SSR no longer waits on the model) — load them on
  // mount with a spinner, so a slow/failing model never blocks or empties the panel.
  const run = React.useCallback(async () => {
    if (!capabilityId) return;
    setBusy(true);
    const result = await regenerateRecommendations(capabilityId, locale);
    setBusy(false);
    if (result) setRecs(result);
  }, [capabilityId, locale]);

  React.useEffect(() => {
    if (recs.length === 0 && capabilityId) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold">
              {t("cc.recs.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("cc.recs.desc")}
            </p>
          </div>
        </div>
        <ProvenanceButton surfaceKey="recommendations" />
      </div>

      {recs.length === 0 ? (
        busy ? (
          <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> {t("cc.summary.generating")}
          </div>
        ) : (
          <AwaitingData label={t("cc.recs.awaiting")} hint={t("cc.recs.awaitingHint")} />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recs.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}
    </section>
  );
}
