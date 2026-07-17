"use client";

import * as React from "react";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface WizardStep {
  title: string;
  description?: string;
  /** Gate "Next"/"Finish" until the step is valid. Defaults to true. */
  valid?: boolean;
  render: React.ReactNode;
}

/** Horizontal numbered stepper. */
export function Stepper({ steps, current }: { steps: { title: string }[]; current: number }) {
  return (
    <ol className="flex items-center gap-1">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={s.title}>
            <li className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done && "border-accent bg-accent text-accent-foreground",
                  active && "border-accent bg-accent/15 text-accent",
                  !done && !active && "border-border bg-surface-2 text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.title}
              </span>
            </li>
            {i < steps.length - 1 && (
              <li className="mx-1 h-px min-w-[16px] flex-1 bg-border" aria-hidden />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

/** Multi-step wizard: stepper header, step body, sticky footer nav. */
export function Wizard({
  steps,
  onFinish,
  onCancel,
  finishing = false,
  error,
  finishLabel = "Create",
}: {
  steps: WizardStep[];
  onFinish: () => void;
  onCancel?: () => void;
  finishing?: boolean;
  error?: string | null;
  finishLabel?: string;
}) {
  const [i, setI] = React.useState(0);
  const step = steps[i];
  const isLast = i === steps.length - 1;
  const canAdvance = step.valid !== false;

  return (
    <div className="space-y-5">
      <Stepper steps={steps} current={i} />

      <div>
        <h3 className="font-display text-base font-semibold">{step.title}</h3>
        {step.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
        )}
      </div>

      <div className="min-h-[12rem]">{step.render}</div>

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => (i === 0 ? onCancel?.() : setI((n) => n - 1))}
        >
          {i === 0 ? "Cancel" : <><ChevronLeft className="h-4 w-4" /> Back</>}
        </Button>
        <span className="text-xs text-muted-foreground">
          Step {i + 1} of {steps.length}
        </span>
        {isLast ? (
          <Button type="button" variant="accent" onClick={onFinish} disabled={!canAdvance || finishing}>
            {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {finishLabel}
          </Button>
        ) : (
          <Button type="button" onClick={() => setI((n) => n + 1)} disabled={!canAdvance}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
