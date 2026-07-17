"use client";

import * as React from "react";
import { ChevronDown, ShieldCheck, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * AiConfidence — compact, reusable confidence chip.
 *
 * Renders "{value}% confidence" behind a shield/sparkle glyph. Clicking expands a
 * small panel that reveals the data sources the prediction draws from, its horizon,
 * and a one-line reasoning summary. Designed to sit inline beneath any AI answer.
 */
export function AiConfidence({
  value,
  sources,
  horizon,
  reasoning,
  className,
}: {
  value: number;
  sources: string[];
  horizon: string;
  /** Optional override for the one-line reasoning summary. */
  reasoning?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const tone =
    value >= 90 ? "text-success" : value >= 75 ? "text-primary" : "text-muted-foreground";

  const summary =
    reasoning ??
    `Grounded in ${sources.length} live data source${
      sources.length === 1 ? "" : "s"
    }, weighted over ${horizon.toLowerCase()}.`;

  return (
    <div className={cn("inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium transition-colors hover:border-border-strong hover:bg-muted",
        )}
      >
        <Sparkles className={cn("h-3.5 w-3.5", tone)} />
        <span className="text-muted-foreground">
          <span className={cn("tabular font-semibold", tone)}>{value}%</span> confidence
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="mt-2 w-full max-w-sm rounded-xl border border-border bg-surface-2 p-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <span className="eyebrow">Why this prediction</span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{summary}</p>

          <div className="mt-3">
            <span className="eyebrow">Data sources</span>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {sources.map((s) => (
                <span
                  key={s}
                  className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
            <span className="eyebrow">Horizon</span>
            <span className="tabular text-xs font-medium text-foreground">{horizon}</span>
          </div>
        </div>
      )}
    </div>
  );
}
