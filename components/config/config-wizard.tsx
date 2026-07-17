"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/wizard";
import { ModeToggle, useConfigMode } from "@/lib/use-config-mode";

import { CopilotPanel, type CopilotNote } from "./copilot";

/** Reactive Business/Advanced mode for one wizard subtree. Provided by ConfigWizard so the header
 * toggle re-renders every {@link AdvancedOnly} below it (useConfigMode alone doesn't broadcast). */
const ConfigModeCtx = React.createContext<{ advanced: boolean }>({ advanced: false });

/** Render children only in Advanced mode. Use to keep raw/technical fields (JSON, headers, mapping,
 * endpoints) out of the Business experience while leaving full power one toggle away. */
export function AdvancedOnly({ children }: { children: React.ReactNode }) {
  return React.useContext(ConfigModeCtx).advanced ? <>{children}</> : null;
}

/** True in Advanced mode — for conditional logic that isn't just show/hide. */
export function useAdvanced(): boolean {
  return React.useContext(ConfigModeCtx).advanced;
}

export interface ConfigStep {
  title: string;
  description?: string;
  /** Gate Next/Finish until valid. Defaults to true. */
  valid?: boolean;
  render: React.ReactNode;
  /** Deterministic Rules-Copilot guidance shown alongside this step. */
  note: CopilotNote;
}

/**
 * The standard AICP configuration experience: a guided wizard (Microsoft 365 / Power Platform feel)
 * with an embedded two-layer Copilot and a Business/Advanced toggle. Business mode hides technical
 * complexity; Advanced mode (via {@link AdvancedOnly}) reveals every low-level option.
 */
export function ConfigWizard({
  title,
  area,
  steps,
  context,
  onFinish,
  onCancel,
  finishing = false,
  error,
  finishLabel = "Create",
}: {
  /** Heading, e.g. "New connector". */
  title: string;
  /** What's being configured, e.g. "connector" — passed to Ask Copilot for grounding. */
  area: string;
  steps: ConfigStep[];
  /** Current selections (no secrets) — passed to Ask Copilot for grounding. */
  context?: Record<string, unknown>;
  onFinish: () => void;
  onCancel?: () => void;
  finishing?: boolean;
  error?: string | null;
  finishLabel?: string;
}) {
  const { mode, advanced, setMode } = useConfigMode();
  const [i, setI] = React.useState(0);
  const step = steps[i];
  const isLast = i === steps.length - 1;
  const canAdvance = step.valid !== false;

  return (
    <ConfigModeCtx.Provider value={{ advanced }}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {advanced ? "All options" : "Guided"}
            </span>
            <ModeToggle mode={mode} setMode={setMode} />
          </div>
        </div>

        <Stepper steps={steps} current={i} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-5">
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
          </div>

          <aside className="h-fit lg:sticky lg:top-4">
            <CopilotPanel note={step.note} area={area} context={context} />
          </aside>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => (i === 0 ? onCancel?.() : setI((n) => n - 1))}
          >
            {i === 0 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" /> Back
              </>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">
            Step {i + 1} of {steps.length}
          </span>
          {isLast ? (
            <Button
              type="button"
              variant="accent"
              onClick={onFinish}
              disabled={!canAdvance || finishing}
            >
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
    </ConfigModeCtx.Provider>
  );
}
