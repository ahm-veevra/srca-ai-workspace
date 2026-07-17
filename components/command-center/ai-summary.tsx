"use client";

import * as React from "react";
import { RefreshCw, Sparkles } from "lucide-react";

import { regenerateBriefing } from "@/lib/command-center-assist";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { type AiSummary } from "@/lib/command-center-types";

import { AwaitingData } from "./awaiting-data";
import { ProvenanceButton } from "./provenance-button";

/** Render **bold** spans inside an otherwise plain string. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </>
  );
}

export function AiSummary({
  summary = null,
  capabilityId,
}: {
  summary?: AiSummary | null;
  capabilityId?: string;
}) {
  const { locale } = useLocale();
  const t = useT();
  const [current, setCurrent] = React.useState<AiSummary | null>(summary);
  const [shown, setShown] = React.useState(0);
  const [generating, setGenerating] = React.useState(true);
  const [busy, setBusy] = React.useState(false); // async LLM regeneration in flight
  const [error, setError] = React.useState<string | null>(null);

  // Regenerate button → re-call the LLM with the live snapshot. The current briefing stays
  // fully visible while the call is in flight; we only re-animate once new content arrives,
  // so it never blanks out on a slow or failed regeneration.
  const run = React.useCallback(async () => {
    if (busy) return;
    setError(null);
    if (!capabilityId) {
      // No briefing capability configured — just replay the reveal of the current briefing.
      setShown(0);
      setGenerating(true);
      return;
    }
    setBusy(true);
    const fresh = await regenerateBriefing(capabilityId, locale);
    setBusy(false);
    if (fresh) {
      setCurrent({
        headline: fresh.headline,
        bullets: fresh.bullets,
        confidence: 0,
        sources: ["Live KPIs", "Risk scores", "Regional load", "Forecasts"],
        horizon: "Next 12 hours",
      });
      setShown(0);
      setGenerating(true);
    } else {
      setError(t("cc.summary.cantRegenerate"));
    }
  }, [busy, capabilityId, locale, t]);

  React.useEffect(() => {
    if (!generating) return;
    if (shown >= (current?.bullets.length ?? 0)) {
      const t = setTimeout(() => setGenerating(false), 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((s) => s + 1), 480);
    return () => clearTimeout(t);
  }, [generating, shown, current]);

  if (!current) {
    return (
      <section className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm sm:p-6">
        <AwaitingData label={t("cc.summary.awaiting")} hint={t("cc.summary.awaitingHint")} />
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-5 shadow-sm sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{ background: "radial-gradient(90% 120% at 100% 0%, hsl(var(--primary) / 0.10) 0%, transparent 55%)" }}
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary", (generating || busy) && "animate-pulse")}>
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold leading-tight">{current.headline}</h2>
              <p className={cn("text-[11px]", error ? "text-warning" : "text-muted-foreground")}>
                {generating || busy
                  ? t("cc.summary.generating")
                  : error
                    ? error
                    : t("cc.summary.generated")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ProvenanceButton surfaceKey="exec_summary" />
            <button
              onClick={run}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", (generating || busy) && "animate-spin")} />
              {t("cc.summary.regenerate")}
            </button>
          </div>
        </div>

        <ul className="mt-4 space-y-2.5">
          {current.bullets.map((b, i) => (
            <li
              key={i}
              className={cn(
                "flex gap-2.5 text-sm text-muted-foreground transition-all duration-500",
                i < shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
              )}
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span><RichText text={b} /></span>
            </li>
          ))}
          {generating && shown < current.bullets.length && (
            <li className="flex gap-2.5 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary" />
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.2s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.1s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" />
              </span>
            </li>
          )}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
            {current.confidence > 0 ? t("cc.summary.confidence", { n: current.confidence }) : t("cc.summary.liveGrounded")}
          </span>
          <span className="text-[11px] text-muted-foreground">{t("cc.summary.horizon", { h: current.horizon })}</span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <div className="flex flex-wrap gap-1">
            {current.sources.map((s) => (
              <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{s}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
