"use client";

import {
  ArrowLeft, ArrowRight, CheckCircle2, Clock, Loader2, Play, Sparkles, Workflow as WorkflowIcon,
  XCircle,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiPost, ApiRequestError } from "@/lib/api-client";

interface Step { key: string; type: string; depends_on?: string[] }
export interface Workflow {
  id: string; key: string; name: string; description: string;
  definition: { steps?: Step[] }; trigger: string; enabled: boolean;
}

interface StepRun {
  step_key: string; type: string; status: string;
  output: Record<string, unknown> | null; error: string | null;
}
interface WorkflowRun {
  id: string; status: string; output: Record<string, unknown> | null;
  error: string | null; steps: StepRun[];
}

function renderOutput(output: Record<string, unknown> | null): string {
  if (!output) return "";
  const o = output as Record<string, unknown>;
  if (typeof o.text === "string") return o.text;
  if (typeof o.answer === "string") return o.answer;
  return JSON.stringify(output, null, 2);
}
function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-danger" />;
  if (status === "waiting_approval") return <Clock className="h-3.5 w-3.5 text-warning" />;
  return <Loader2 className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function WorkflowMarketplace({ workflows }: { workflows: Workflow[] }) {
  const [selected, setSelected] = React.useState<Workflow | null>(null);
  if (selected) return <WorkflowDetail wf={selected} onBack={() => setSelected(null)} />;

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[12rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
          <WorkflowIcon className="mb-2 h-8 w-8 text-primary/50" />
          No workflows are configured yet. Define workflows in the AICP console, then run them here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workflows.map((w) => {
        const steps = w.definition?.steps ?? [];
        return (
          <Card key={w.id} className="flex h-full cursor-pointer flex-col transition-colors hover:border-border-strong"
            onClick={() => setSelected(w)}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base"><WorkflowIcon className="h-4 w-4 text-primary" /> {w.name}</CardTitle>
                <Badge variant={w.enabled ? "success" : "secondary"} className="text-[10px]">{w.enabled ? "enabled" : "disabled"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2">
              <p className="text-sm text-muted-foreground">{w.description || "—"}</p>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">{steps.length} step(s)</Badge>
                <span className="capitalize">{w.trigger} trigger</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function WorkflowDetail({ wf, onBack }: { wf: Workflow; onBack: () => void }) {
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [run, setRun] = React.useState<WorkflowRun | null>(null);
  const steps = wf.definition?.steps ?? [];

  async function launch() {
    if (!input.trim()) return;
    setBusy(true); setError(null); setRun(null);
    try {
      setRun(await apiPost<WorkflowRun>(`/agents/workflows/${wf.id}/run`, { input: { text: input } }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Workflow run failed.");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary">
        <ArrowLeft className="h-4 w-4" /> All workflows
      </button>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><WorkflowIcon className="h-4 w-4 text-primary" /> {wf.name}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{wf.description}</p>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Steps</p>
                <div className="mt-1 flex flex-wrap items-center gap-y-2">
                  {steps.map((st, i) => (
                    <div key={st.key} className="flex items-center">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2/50 px-2.5 py-1 text-xs">
                        {st.key} <span className="text-[10px] text-muted-foreground">{st.type}</span>
                      </span>
                      {i < steps.length - 1 && <ArrowRight className="mx-1 h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  ))}
                  {steps.length === 0 && <span className="text-sm text-muted-foreground">No steps defined.</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Play className="h-4 w-4 text-primary" /> Run workflow</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <textarea value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Input for the workflow…"
                className="min-h-[6rem] w-full resize-y rounded-md border border-border bg-[hsl(var(--input))] p-2 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Passed to the workflow as <code>input.text</code>.</span>
                <Button onClick={launch} disabled={busy || !input.trim()}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Run
                </Button>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
            </CardContent>
          </Card>

          {run && (
            <>
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm">Execution</CardTitle>
                  <Badge variant={run.status === "completed" ? "success" : run.status === "failed" ? "destructive" : "secondary"} className="capitalize">{run.status.replace(/_/g, " ")}</Badge>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {run.steps.map((sr, i) => (
                    <div key={i} className="rounded-md border border-border/60 p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={sr.status} />
                        <span className="font-medium">{sr.step_key}</span>
                        <span className="text-[10px] text-muted-foreground">{sr.type}</span>
                        <Badge variant="secondary" className="ms-auto text-[10px] capitalize">{sr.status.replace(/_/g, " ")}</Badge>
                      </div>
                      {sr.error
                        ? <p className="mt-1 text-danger">{sr.error}</p>
                        : sr.output && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{renderOutput(sr.output).slice(0, 600)}</p>}
                    </div>
                  ))}
                  {run.steps.length === 0 && run.error && <p className="text-sm text-danger">{run.error}</p>}
                </CardContent>
              </Card>

              {run.output && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Result</CardTitle></CardHeader>
                  <CardContent><pre className="max-h-60 overflow-auto whitespace-pre-wrap text-sm">{renderOutput(run.output)}</pre></CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
