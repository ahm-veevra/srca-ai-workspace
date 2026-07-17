"use client";

import {
  ArrowLeft, Boxes, Bot, CheckCircle2, Loader2, Play, ShieldCheck, Sparkles, Wrench, XCircle,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aicpHref } from "@/lib/aicp";
import { apiPost, ApiRequestError } from "@/lib/api-client";

export interface Agent {
  id: string; key: string; name: string; description: string; system_prompt: string;
  model_key: string | null; status: string; memory_enabled: boolean; max_steps: number;
  tool_keys: string[];
}
export interface Tool { key: string; name: string; description: string; type: string }

interface AgentRun {
  id: string; status: string; output: Record<string, unknown> | null;
  steps: unknown[]; trace_ids: string[]; error: string | null;
}

function renderOutput(output: Record<string, unknown> | null): string {
  if (!output) return "";
  const o = output as Record<string, unknown>;
  if (typeof o.text === "string") return o.text;
  if (typeof o.answer === "string") return o.answer;
  return JSON.stringify(output, null, 2);
}

export function AgentMarketplace({ agents, tools }: { agents: Agent[]; tools: Tool[] }) {
  const [selected, setSelected] = React.useState<Agent | null>(null);
  const toolName = (k: string) => tools.find((t) => t.key === k)?.name ?? k;

  if (selected) {
    return <AgentDetail agent={selected} toolName={toolName} onBack={() => setSelected(null)} />;
  }

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[12rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
          <Bot className="mb-2 h-8 w-8 text-primary/50" />
          No agents are configured yet. Create governed AI agents in the AICP console, then run
          them here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {agents.map((a) => (
        <Card key={a.id} className="flex h-full cursor-pointer flex-col transition-colors hover:border-border-strong"
          onClick={() => setSelected(a)}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base"><Bot className="h-4 w-4 text-primary" /> {a.name}</CardTitle>
              <Badge variant={a.status === "active" ? "success" : "secondary"} className="text-[10px] capitalize">{a.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-2">
            <p className="text-sm text-muted-foreground">{a.description || "—"}</p>
            <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
              <Badge variant="secondary" className="gap-1 text-[10px]"><Boxes className="h-3 w-3" /> {a.model_key ?? "auto-routed"}</Badge>
              {a.tool_keys.length > 0 && <Badge variant="outline" className="gap-1 text-[10px]"><Wrench className="h-3 w-3" /> {a.tool_keys.length} tool(s)</Badge>}
              <span>{a.max_steps} steps max</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AgentDetail({
  agent, toolName, onBack,
}: {
  agent: Agent; toolName: (k: string) => string; onBack: () => void;
}) {
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [run, setRun] = React.useState<AgentRun | null>(null);

  async function launch() {
    if (!input.trim()) return;
    setBusy(true); setError(null); setRun(null);
    try {
      setRun(await apiPost<AgentRun>(`/agents/${agent.id}/run`, { input }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Agent run failed.");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary">
        <ArrowLeft className="h-4 w-4" /> All agents
      </button>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        {/* Agent profile */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Bot className="h-4 w-4 text-primary" /> {agent.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{agent.description}</p>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Purpose</p>
                <p className="text-sm">{agent.system_prompt || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Model: </span>{agent.model_key ?? "Auto-routed by AICP"}</div>
                <div><span className="text-muted-foreground">Max steps: </span>{agent.max_steps}</div>
                <div><span className="text-muted-foreground">Memory: </span>{agent.memory_enabled ? "on" : "off"}</div>
                <div><span className="text-muted-foreground">Status: </span><span className="capitalize">{agent.status}</span></div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tools</p>
                {agent.tool_keys.length === 0
                  ? <p className="text-sm text-muted-foreground">None</p>
                  : <div className="mt-1 flex flex-wrap gap-1">{agent.tool_keys.map((k) => (
                      <span key={k} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-xs"><Wrench className="h-3 w-3" /> {toolName(k)}</span>
                    ))}</div>}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Every run is governed by your AICP policies and fully audited.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Launch + execution */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Play className="h-4 w-4 text-primary" /> Launch agent</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <textarea value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Give the agent a task…"
                className="min-h-[6rem] w-full resize-y rounded-md border border-border bg-[hsl(var(--input))] p-2 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
              <div className="flex justify-end">
                <Button onClick={launch} disabled={busy || !input.trim()}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Run agent
                </Button>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
            </CardContent>
          </Card>

          {run && (
            <>
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm">Result</CardTitle>
                  <Badge variant={run.status === "completed" ? "success" : run.status === "failed" ? "destructive" : "secondary"} className="capitalize">{run.status}</Badge>
                </CardHeader>
                <CardContent>
                  {run.error
                    ? <p className="text-sm text-danger">{run.error}</p>
                    : <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-sm">{renderOutput(run.output)}</pre>}
                </CardContent>
              </Card>

              {run.steps.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Execution steps ({run.steps.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-1.5">
                    {run.steps.map((st, i) => {
                      const s = st as Record<string, unknown>;
                      const kind = (s.type || s.kind || s.action || "step") as string;
                      return (
                        <div key={i} className="flex items-start gap-2 rounded-md border border-border/60 p-2 text-xs">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium capitalize">{String(kind).replace(/_/g, " ")}</span>
                            <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap text-[11px] text-muted-foreground">{JSON.stringify(s, null, 0).slice(0, 400)}</pre>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {run.trace_ids.length > 0 && (
                <p className="text-xs">
                  {run.trace_ids.map((t, i) => (
                    <a key={t} href={aicpHref(`/requests/${t}`)} className="me-3 text-primary hover:underline">
                      {run.status === "completed" ? <CheckCircle2 className="me-1 inline h-3 w-3" /> : <XCircle className="me-1 inline h-3 w-3" />}
                      trace {i + 1}
                    </a>
                  ))}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
