import { ShieldAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { serverT } from "@/lib/i18n/server";
import { dl } from "@/lib/command-center-labels";
import { type MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import {
  STATUS_SOFT,
  STATUS_TEXT,
  type Risk,
  type Status,
} from "@/lib/command-center-types";

import { AwaitingData } from "./awaiting-data";
import { ProvenanceButton } from "./provenance-button";

/** Gauge stroke colour per risk level (tokens only). */
const LEVEL_COLOR: Record<Status, string> = {
  good: "hsl(var(--success))",
  warn: "hsl(var(--warning))",
  critical: "hsl(var(--danger))",
};

const LEVEL_LABEL: Record<Status, MessageKey> = {
  good: "cc.risk.low",
  warn: "cc.risk.elevated",
  critical: "cc.risk.critical",
};

/** Semicircular score gauge (0–100), coloured by risk level. */
function SemiGauge({ score, level }: { score: number; level: Status }) {
  const size = 132;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const d = `M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`;
  const height = cy + stroke / 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${height}`}
      className="w-full max-w-[9rem]"
      role="img"
      aria-label={`Risk score ${score} of 100`}
    >
      <path
        d={d}
        fill="none"
        stroke="hsl(var(--surface-3))"
        strokeWidth={stroke}
        strokeLinecap="round"
        pathLength={100}
      />
      <path
        d={d}
        fill="none"
        stroke={LEVEL_COLOR[level]}
        strokeWidth={stroke}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${score} 100`}
      />
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        className="font-display"
        fontSize="30"
        fontWeight="700"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {score}
      </text>
      <text
        x={cx}
        y={cy - 10}
        dy="18"
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize="11"
      >
        / 100
      </text>
    </svg>
  );
}

function RiskCard({ risk }: { risk: Risk }) {
  const t = serverT();
  return (
    <Card className="flex flex-col items-center gap-3 p-5 text-center shadow-sm transition-all hover:border-border-strong">
      <SemiGauge score={risk.score} level={risk.level} />
      <div className="space-y-2">
        <p
          className={cn(
            "text-sm font-semibold leading-tight",
            STATUS_TEXT[risk.level],
          )}
        >
          {dl(t, risk.label)}
        </p>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
            STATUS_SOFT[risk.level],
          )}
        >
          {t(LEVEL_LABEL[risk.level])}
        </span>
      </div>
    </Card>
  );
}

export function RiskIntelligence({ risks = [] }: { risks?: Risk[] }) {
  const t = serverT();
  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold">
              {t("cc.risk.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("cc.risk.desc")}
            </p>
          </div>
        </div>
        <ProvenanceButton surfaceKey="risks" />
      </div>

      {risks.length === 0 ? (
        <AwaitingData label={t("cc.risk.awaiting")} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {risks.map((risk) => (
            <RiskCard key={risk.label} risk={risk} />
          ))}
        </div>
      )}
    </section>
  );
}
