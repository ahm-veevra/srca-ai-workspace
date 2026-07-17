import { Gauge as GaugeIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { serverT } from "@/lib/i18n/server";
import { dl } from "@/lib/command-center-labels";
import { type MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { type Readiness } from "@/lib/command-center-types";

import { AwaitingData } from "./awaiting-data";
import { ProvenanceButton } from "./provenance-button";

interface Tone {
  color: string;
  text: string;
  bar: string;
  soft: string;
  label: MessageKey;
}

/** Colour-code a 0–100 readiness score: >=85 success, 70–84 warning, <70 danger. */
function tone(score: number): Tone {
  if (score >= 85)
    return {
      color: "hsl(var(--success))",
      text: "text-success",
      bar: "bg-success",
      soft: "bg-success/10 text-success",
      label: "cc.readiness.ready",
    };
  if (score >= 70)
    return {
      color: "hsl(var(--warning))",
      text: "text-warning",
      bar: "bg-warning",
      soft: "bg-warning/10 text-warning",
      label: "cc.readiness.monitor",
    };
  return {
    color: "hsl(var(--danger))",
    text: "text-danger",
    bar: "bg-danger",
    soft: "bg-danger/10 text-danger",
    label: "cc.readiness.atRisk",
  };
}

/** Large hero radial ring (0–100). */
function HeroRadial({ score }: { score: number }) {
  const tr = serverT();
  const size = 200;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const t = tone(score);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
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
          stroke={t.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * score) / 100} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-display text-5xl font-bold tabular", t.text)}>
          {score}
        </span>
        <span className="eyebrow mt-1">{tr("cc.readiness.outOf100")}</span>
      </div>
    </div>
  );
}

function SubScore({ item }: { item: Readiness }) {
  const tr = serverT();
  const t = tone(item.score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">
          {dl(tr, item.label)}
        </span>
        <span className={cn("tabular text-sm font-semibold", t.text)}>
          {item.score}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", t.bar)}
          style={{ width: `${item.score}%` }}
        />
      </div>
    </div>
  );
}

export function ReadinessScore({
  readiness = [],
  overall: overallScore = null,
}: {
  readiness?: Readiness[];
  overall?: number | null;
}) {
  const t = serverT();
  if (readiness.length === 0 || overallScore == null) {
    return (
      <Card className="p-5 shadow-sm">
        <AwaitingData label={t("cc.readiness.awaiting")} hint={t("cc.readiness.awaitingHint")} />
      </Card>
    );
  }
  const overall = tone(overallScore);

  return (
    <Card className="p-5 shadow-sm transition-all hover:border-border-strong">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GaugeIcon className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <p className="eyebrow">{t("cc.readiness.eyebrow")}</p>
            <h2 className="font-display text-lg font-semibold">
              {t("cc.readiness.title")}
            </h2>
          </div>
        </div>
        <ProvenanceButton surfaceKey="readiness" />
      </div>

      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[auto_1fr] lg:gap-10">
        {/* Hero radial */}
        <div className="flex flex-col items-center gap-3 lg:pr-8">
          <HeroRadial score={overallScore} />
          <div className="text-center">
            <p className="font-display text-sm font-semibold">
              {t("cc.readiness.overall")}
            </p>
            <span
              className={cn(
                "mt-1.5 inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold",
                overall.soft,
              )}
            >
              {t(overall.label)}
            </span>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {readiness.map((item) => (
            <SubScore key={item.label} item={item} />
          ))}
        </div>
      </div>
    </Card>
  );
}
