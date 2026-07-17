"use client";

import {
  ArrowDown, ArrowRight, Boxes, CheckCircle2, Cog, Compass, ExternalLink,
  FileCog, FileText, Layers, Loader2, Maximize2, Mic, Minimize2, Network, Play, ScrollText,
  ShieldCheck, Sparkles, Upload, Workflow, XCircle,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidePanel } from "@/components/ui/side-panel";
import { apiFetch, apiUpload, ApiRequestError } from "@/lib/api-client";
import { aicpHref } from "@/lib/aicp";
import { useCaseByKey, type UseCaseDef } from "@/lib/usecase-catalog";
import { DocumentIntake } from "@/components/workspace/document-intake";
import { OcrLearning } from "@/components/workspace/ocr-learning";

// ── normalized run metadata (works across every endpoint shape) ──────────────
interface RunMeta {
  model?: string | null;
  status?: string | null;
  latencyMs?: number | null;
  traceId?: string | null;
  policyPre?: string | null;
  policyPost?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cost?: string | null;
  route?: string | null;
}

export interface RunState {
  phase: "idle" | "running" | "done" | "error";
  endpoint?: string;
  method?: string;
  request?: unknown;
  response?: unknown;
  meta?: RunMeta;
  latencyMs?: number;
  error?: string;
}

function policyAction(d: unknown): string | null {
  if (d && typeof d === "object" && "action" in d) {
    const a = (d as Record<string, unknown>).action;
    return typeof a === "string" ? a : null;
  }
  return null;
}

/** Pull a normalized meta from whatever the endpoint returned. */
function deriveMeta(kind: string, resp: any, latencyMs: number): RunMeta {
  if (resp && resp.meta && typeof resp.meta === "object") {
    const m = resp.meta;
    return {
      model: m.model, status: m.status, latencyMs: m.latency_ms ?? latencyMs, traceId: m.trace_id,
      policyPre: m.policy_pre, policyPost: m.policy_post, inputTokens: m.input_tokens,
      outputTokens: m.output_tokens, route: m.route_rule,
    };
  }
  if (kind === "inference" || kind === "explain" || kind === "api-demo") {
    const r = resp?.inference ?? resp;
    return {
      model: r?.selected_model_key, status: r?.status, latencyMs: r?.latency_ms ?? latencyMs,
      traceId: r?.trace_id, policyPre: policyAction(r?.policy?.pre), policyPost: policyAction(r?.policy?.post),
      inputTokens: r?.usage?.input_tokens, outputTokens: r?.usage?.output_tokens,
      cost: r?.usage?.cost ? `${r.usage.cost} ${r.usage.currency ?? ""}`.trim() : null,
    };
  }
  return { status: "completed", latencyMs };
}

// ── run dispatch ─────────────────────────────────────────────────────────────
export async function execute(uc: UseCaseDef, vals: Record<string, string>): Promise<Partial<RunState>> {
  const { run } = uc;
  const t0 = performance.now();
  const lat = () => Math.round(performance.now() - t0);

  const post = (p: string, body: unknown) => apiFetch<any>(p, { method: "POST", body: JSON.stringify(body) });
  const get = (p: string) => apiFetch<any>(p);

  switch (run.kind) {
    case "inference": {
      const body = run.buildBody!(vals);
      const resp = await post("/inference", body);
      return { endpoint: "POST /api/v1/inference", method: "POST", request: body, response: resp, meta: deriveMeta("inference", resp, lat()) };
    }
    case "explain": {
      const body = run.buildBody!(vals);
      const inf = await post("/inference", body);
      let explanation = null;
      if (inf?.trace_id) {
        try { explanation = await get(`/explanations/${inf.trace_id}`); } catch { /* trace may still be writing */ }
      }
      const resp = { inference: inf, explanation };
      return { endpoint: "POST /api/v1/inference → GET /api/v1/explanations/{trace_id}", method: "POST", request: body, response: resp, meta: deriveMeta("explain", inf, lat()) };
    }
    case "analyze": {
      const body = run.buildBody!(vals);
      const resp = await post(run.endpoint, body);
      return { endpoint: `POST /api/v1${run.endpoint}`, method: "POST", request: body, response: resp, meta: deriveMeta("analyze", resp, lat()) };
    }
    case "search": {
      const body = run.buildBody!(vals);
      const resp = await post(run.endpoint, body);
      return { endpoint: `POST /api/v1${run.endpoint}`, method: "POST", request: body, response: resp, meta: deriveMeta("search", resp, lat()) };
    }
    case "post": {
      const body = run.buildBody!(vals);
      const resp = await post(run.endpoint, body);
      return { endpoint: `POST /api/v1${run.endpoint}`, method: "POST", request: body, response: resp, meta: deriveMeta("post", resp, lat()) };
    }
    case "get": {
      const ep = run.endpoint.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(vals[k] ?? ""));
      const q = run.buildQuery ? run.buildQuery(vals) : "";
      const path = q ? `${ep}?${q}` : ep;
      const resp = await get(path);
      return { endpoint: `GET /api/v1${path}`, method: "GET", request: q ? `?${q}` : "(no params)", response: resp, meta: deriveMeta("get", resp, lat()) };
    }
    case "routing-sim": {
      const body = run.buildBody!(vals);
      const resp = await post("/routing/simulate", body);
      return { endpoint: "POST /api/v1/routing/simulate", method: "POST", request: body, response: resp, meta: { status: resp?.error ? "failed" : "completed", model: resp?.resolved_model_key, latencyMs: lat() } };
    }
    case "multi-model": {
      // Capability-resolved chat models from the Model Registry (single source) — multi-capability
      // models (e.g. a vision model that also does chat) are included automatically.
      const providers: any[] = await get("/capabilities/chat/providers?available_only=true");
      const chat = providers.filter((p) => p.kind === "model");
      const base = run.buildBody!(vals);
      const runs = await Promise.all(chat.map(async (m) => {
        const r0 = performance.now();
        try {
          const r = await post("/inference", { ...base, model_key: m.key });
          return { model: m.key, status: r.status, output: r.output?.text ?? "", latency_ms: r.latency_ms ?? Math.round(performance.now() - r0), tokens: r.usage ? `${r.usage.input_tokens}/${r.usage.output_tokens}` : "—", cost: r.usage?.cost ? `${r.usage.cost} ${r.usage.currency ?? ""}` : "—" };
        } catch (e) {
          return { model: m.key, status: "error", output: e instanceof ApiRequestError ? e.error.message : "failed", latency_ms: Math.round(performance.now() - r0), tokens: "—", cost: "—" };
        }
      }));
      return { endpoint: "GET /api/v1/models → POST /api/v1/inference (per model)", method: "POST", request: { ...base, model_key: "<each enabled model>" }, response: { models: runs }, meta: { status: "completed", latencyMs: lat() } };
    }
    case "agent": {
      const agents: any[] = await get("/agents");
      // Pick a runnable agent — one that's active/enabled (others are bound to disabled models).
      const a = agents.find((x) => ["active", "enabled"].includes(x.status)) ?? agents[0];
      if (!a) return { endpoint: "GET /api/v1/agents", method: "GET", request: "(none)", response: { message: "No agents configured. Create one in the Agent Marketplace." }, meta: { status: "empty", latencyMs: lat() } };
      const body = run.buildBody!(vals);
      const resp = await post(`/agents/${a.id}/run`, body);
      return { endpoint: `POST /api/v1/agents/${a.id}/run`, method: "POST", request: { agent: a.name ?? a.key, ...body }, response: resp, meta: { status: resp?.status, latencyMs: lat() } };
    }
    case "workflow": {
      const wfs: any[] = await get("/agents/workflows");
      const w = wfs.find((x) => ["active", "enabled"].includes(x.status)) ?? wfs[0];
      if (!w) return { endpoint: "GET /api/v1/agents/workflows", method: "GET", request: "(none)", response: { message: "No workflows configured. Create one in the Workflow Marketplace." }, meta: { status: "empty", latencyMs: lat() } };
      const body = run.buildBody!(vals);
      const resp = await post(`/agents/workflows/${w.id}/run`, body);
      return { endpoint: `POST /api/v1/agents/workflows/${w.id}/run`, method: "POST", request: { workflow: w.name ?? w.key, ...body }, response: resp, meta: { status: resp?.status, latencyMs: lat() } };
    }
    case "stream": {
      const body = run.buildBody!(vals);
      const tenant = document.cookie.match(/(?:^|; )veevra_tenant=([^;]*)/);
      const res = await fetch("/api/v1/inference/stream", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...(tenant ? { "X-Tenant-Id": decodeURIComponent(tenant[1]) } : {}) },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) throw new Error(`stream failed (${res.status})`);
      const reader = res.body.getReader(); const td = new TextDecoder();
      let buf = ""; let acc = ""; let done: any = null;
      for (;;) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += td.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
        for (const p of parts) {
          const line = p.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const j = line.slice(5).trim(); if (!j) continue;
          try { const ev = JSON.parse(j); if (ev.type === "token") acc += ev.text ?? ""; else if (ev.type === "done") done = ev; } catch { /* partial */ }
        }
      }
      return { endpoint: "POST /api/v1/inference/stream (SSE)", method: "POST", request: body, response: { streamed_text: acc, done }, meta: { model: done?.selected_model_key ?? done?.model, status: done?.status ?? "completed", traceId: done?.trace_id, latencyMs: lat() } };
    }
    case "learning": {
      const resp = await get(run.endpoint);
      return { endpoint: `GET /api/v1${run.endpoint}`, method: "GET", request: "(none)", response: resp, meta: { status: "completed", latencyMs: lat() } };
    }
    case "transcribe": {
      // Needs an uploaded audio file — exercised from the use-case page, skipped in the sweep.
      return { endpoint: "POST /api/v1/transcription/transcribe", method: "POST", request: "(audio file required)", response: { note: "Audio Transcription needs an uploaded audio file — run it from the use-case page." }, meta: { status: "skipped", latencyMs: lat() } };
    }
    default:
      throw new Error(`Unsupported run kind: ${run.kind}`);
  }
}

// ── small renderers ──────────────────────────────────────────────────────────
function Pre({ obj }: { obj: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-md border border-border/60 bg-surface-2/40 p-3 text-[11px] leading-relaxed">
      {typeof obj === "string" ? obj : JSON.stringify(obj, null, 2)}
    </pre>
  );
}

function humanKey(k: string) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Recursive, readable rendering of an arbitrary result object. */
function Structured({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null || data === undefined || data === "") return <span className="text-muted-foreground">—</span>;
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return <span className="whitespace-pre-wrap break-words">{String(data)}</span>;
  }
  if (Array.isArray(data)) {
    if (!data.length) return <span className="text-muted-foreground">None</span>;
    return (
      <div className="space-y-1.5">
        {data.slice(0, 30).map((item, i) => (
          <div key={i} className="rounded-md border border-border/50 bg-surface-2/30 p-2 text-sm">
            <Structured data={item} depth={depth + 1} />
          </div>
        ))}
        {data.length > 30 && <p className="text-xs text-muted-foreground">+ {data.length - 30} more…</p>}
      </div>
    );
  }
  const entries = Object.entries(data as Record<string, unknown>).filter(([k]) => k !== "meta");
  return (
    <div className={cn("space-y-1.5", depth > 0 && "space-y-1")}>
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-1 gap-0.5 sm:grid-cols-[minmax(120px,180px)_1fr] sm:gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{humanKey(k)}</span>
          <div className="text-sm"><Structured data={v} depth={depth + 1} /></div>
        </div>
      ))}
    </div>
  );
}

function ResultView({ uc, run }: { uc: UseCaseDef; run: RunState }) {
  const resp: any = run.response;
  const kind = uc.run.kind;

  if (kind === "inference") {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Answer</CardTitle></CardHeader>
        <CardContent><p className="whitespace-pre-wrap text-sm">{resp?.output?.text || <span className="text-muted-foreground">No text returned.</span>}</p></CardContent>
      </Card>
    );
  }
  if (kind === "explain") {
    const inf = resp?.inference; const ex = resp?.explanation;
    return (
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Answer</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm">{inf?.output?.text || "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Compass className="h-4 w-4 text-primary" /> Why this happened — decision trace</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ex?.headline && <p className="text-sm font-medium">{ex.headline}</p>}
            {(ex?.decisions ?? []).map((d: any, i: number) => (
              <div key={i} className="rounded-md border border-border/50 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{d.title}</span>
                  <Badge variant="outline" className="text-[10px]">{d.outcome}</Badge>
                </div>
                {d.summary && <p className="mt-0.5 text-xs text-muted-foreground">{d.summary}</p>}
              </div>
            ))}
            {!ex && <p className="text-xs text-muted-foreground">Trace is still being written; open the full trace in AICP for the complete explanation.</p>}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (kind === "search") {
    const hits: any[] = resp?.hits ?? [];
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{hits.length} result{hits.length === 1 ? "" : "s"}{resp?.mode ? ` · ${resp.mode}` : ""}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {hits.length ? hits.map((h, i) => (
            <div key={i} className="rounded-md border border-border/50 p-2.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{h.document_title || "Document"}</span>
                <Badge variant="secondary" className="text-[10px]">score {typeof h.score === "number" ? h.score.toFixed(3) : h.score}</Badge>
              </div>
              <p className="line-clamp-4 text-sm text-muted-foreground">{h.content}</p>
            </div>
          )) : <p className="text-sm text-muted-foreground">No passages matched. Try a different query, or publish documents into the knowledge base first.</p>}
        </CardContent>
      </Card>
    );
  }
  if (kind === "routing-sim") {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Routing decision</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Resolved model: </span><span className="font-semibold">{resp?.resolved_model_key || "—"}</span></p>
          <p><span className="text-muted-foreground">Reason: </span>{resp?.reason || resp?.detail || "—"}</p>
          <p><span className="text-muted-foreground">Matched rule: </span>{resp?.matched ? "yes" : "default (no rule matched)"}</p>
          <div>
            <p className="mb-1 text-muted-foreground">Fallback chain:</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="success" className="text-[10px]">{resp?.resolved_model_key || "primary"}</Badge>
              {(resp?.fallbacks ?? []).length ? resp.fallbacks.map((f: string, i: number) => (
                <React.Fragment key={i}><ArrowRight className="h-3 w-3 text-muted-foreground" /><Badge variant="outline" className="text-[10px]">{f}</Badge></React.Fragment>
              )) : <span className="text-xs text-muted-foreground">— none configured (single enabled model)</span>}
            </div>
          </div>
          {resp?.error && <p className="text-danger">{resp.error}</p>}
        </CardContent>
      </Card>
    );
  }
  if (kind === "multi-model") {
    const rows: any[] = resp?.models ?? [];
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{rows.length} model{rows.length === 1 ? "" : "s"} compared</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.length ? rows.map((r, i) => (
            <div key={i} className="rounded-md border border-border/50 p-2.5">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1 text-[10px]"><Boxes className="h-3 w-3" />{r.model}</Badge>
                <span className="text-xs text-muted-foreground">{Math.round(r.latency_ms)} ms · {r.tokens} tok · {r.cost}</span>
                {r.status !== "completed" && <Badge variant="warning" className="text-[10px]">{r.status}</Badge>}
              </div>
              <p className="whitespace-pre-wrap text-sm">{r.output}</p>
            </div>
          )) : <p className="text-sm text-muted-foreground">Only one chat model is enabled. Enable another model in AICP to compare side by side.</p>}
          {rows.length === 1 && <p className="text-xs text-muted-foreground">Only one chat model is enabled in this build (llama32). Enable a second model in AICP and it appears here automatically — no SRCA AI Workspace change.</p>}
        </CardContent>
      </Card>
    );
  }
  // generic structured (post / get / analyze)
  const body = resp?.analysis ?? resp;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Result</CardTitle></CardHeader>
      <CardContent><Structured data={body} /></CardContent>
    </Card>
  );
}

// ── the workbench ─────────────────────────────────────────────────────────────
const STD_FLOW = ["User", "SRCA Workspace", "AICP API", "AICP Service", "Engine", "Governance", "Response", "Audit"];

export function UseCaseWorkbench({ ucKey }: { ucKey: string }) {
  const uc = useCaseByKey(ucKey) as UseCaseDef;
  const init: Record<string, string> = {};
  uc.inputs.forEach((f) => (init[f.name] = ""));
  const [vals, setVals] = React.useState<Record<string, string>>(init);
  const [run, setRun] = React.useState<RunState>({ phase: "idle" });
  const [showConfig, setShowConfig] = React.useState(false);
  const [tab, setTab] = React.useState<"result" | "technical" | "architecture">("result");
  const [streamText, setStreamText] = React.useState("");
  const [fullscreen, setFullscreen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [mode, setMode] = React.useState<"upload" | "manual">(uc.documents?.fillField || uc.documents?.publish ? "upload" : "manual");

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!fullscreen) return;
    // Lock background scroll so the page can't scroll behind the overlay.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const Icon = uc.icon;
  const requiredFilled = uc.inputs.every((f) => vals[f.name]?.trim().length > 0) || uc.inputs.length === 0;

  function loadSample() {
    const next: Record<string, string> = {};
    uc.inputs.forEach((f) => (next[f.name] = f.sample));
    setVals(next);
  }

  async function runStream(useVals: Record<string, string>) {
    setRun({ phase: "running" }); setTab("result"); setStreamText("");
    const body = uc.run.buildBody!(useVals);
    try {
      const tenant = document.cookie.match(/(?:^|; )veevra_tenant=([^;]*)/);
      const res = await fetch("/api/v1/inference/stream", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...(tenant ? { "X-Tenant-Id": decodeURIComponent(tenant[1]) } : {}) },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) throw new Error(`stream failed (${res.status})`);
      const reader = res.body.getReader(); const dec = new TextDecoder();
      let buf = ""; let acc = ""; let done: any = null;
      for (;;) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
        for (const p of parts) {
          const line = p.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const json = line.slice(5).trim(); if (!json) continue;
          try {
            const ev = JSON.parse(json);
            if (ev.type === "token") { acc += ev.text ?? ""; setStreamText(acc); }
            else if (ev.type === "done") done = ev;
          } catch { /* partial */ }
        }
      }
      setRun({
        phase: "done", endpoint: "POST /api/v1/inference/stream (SSE)", method: "POST", request: body,
        response: { streamed_text: acc, done },
        meta: { model: done?.selected_model_key ?? done?.model, status: done?.status ?? "completed", traceId: done?.trace_id, inputTokens: done?.usage?.input_tokens, outputTokens: done?.usage?.output_tokens },
      });
    } catch {
      setRun({ phase: "error", error: "Streaming failed." });
    }
  }

  async function doRun(demo = false) {
    let useVals = vals;
    if (demo) {
      useVals = {};
      uc.inputs.forEach((f) => (useVals[f.name] = f.demo ?? f.sample));
      setVals(useVals);
    }
    if (uc.run.kind === "stream") { await runStream(useVals); return; }
    setRun({ phase: "running" });
    setTab("result");
    try {
      const r = await execute(uc, useVals);
      setRun({ phase: "done", ...r });
    } catch (e) {
      setRun({ phase: "error", error: e instanceof ApiRequestError ? `${e.error.message}${e.error.trace_id ? ` (trace ${e.error.trace_id})` : ""}` : "The run failed. See the console for details." });
    }
  }

  async function runTranscribe(f: File) {
    setRun({ phase: "running" }); setTab("result");
    try {
      const form = new FormData(); form.append("file", f);
      const t0 = performance.now();
      const resp = await apiUpload<any>("/transcription/transcribe", form);
      setRun({ phase: "done", endpoint: "POST /api/v1/transcription/transcribe", method: "POST", request: { file: f.name }, response: resp, meta: { model: resp?.model, status: "completed", latencyMs: Math.round(performance.now() - t0) } });
    } catch (e) {
      setRun({ phase: "error", error: e instanceof ApiRequestError ? e.error.message : "Transcription failed." });
    }
  }

  async function continueWithText(text: string) {
    const field = uc.documents?.fillField;
    if (!field) return;
    const useVals = { ...vals, [field]: text };
    setVals(useVals);
    if (uc.run.kind === "stream") { await runStream(useVals); return; }
    setRun({ phase: "running" }); setTab("result");
    try {
      const r = await execute(uc, useVals);
      setRun({ phase: "done", ...r });
    } catch (e) {
      setRun({ phase: "error", error: e instanceof ApiRequestError ? e.error.message : "The run failed." });
    }
  }

  const meta = run.meta;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{uc.category}</p>
            <h1 className="font-display text-2xl font-bold tracking-tight">{uc.title}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{uc.business.what}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowConfig(true)}><Cog className="h-4 w-4" /> View AICP Configuration</Button>
      </div>

      {/* Business View */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Layers className="h-4 w-4 text-primary" /> Business View</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Who uses it">{uc.business.who}</Field>
          <Field label="Capability shown">{uc.capability}</Field>
          <Field label="Input">{uc.business.input}</Field>
          <Field label="Output">{uc.business.output}</Field>
          <div className="sm:col-span-2">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Business value</p>
            <div className="flex flex-wrap gap-1.5">{uc.business.value.map((v) => <Badge key={v} variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3 text-success" />{v}</Badge>)}</div>
          </div>
          <Field label="Example scenario" full><span className="italic">{uc.business.example}</span></Field>
        </CardContent>
      </Card>

      {/* Run + Result */}
      {uc.run.kind === "learning" && <OcrLearning />}

      {uc.run.kind !== "learning" && (() => {
      const content = (
      <div className={cn(fullscreen && "flex h-full flex-col")}>
        {/* Toolbar (normal) / internal fullscreen header */}
        <div className={cn("flex items-center gap-2", fullscreen ? "shrink-0 border-b border-border px-4 py-3" : "mb-2 justify-end")}>
          {fullscreen && (
            <span className="flex min-w-0 items-center gap-2 font-display text-base font-semibold">
              <Icon className="h-4 w-4 shrink-0 text-primary" /> <span className="truncate">{uc.title}</span>
              {meta?.status && <Badge variant={meta.status === "completed" ? "success" : meta.status === "failed" || meta.status === "blocked" ? "destructive" : "outline"} className="text-[10px]">{meta.status}</Badge>}
              {run.phase === "running" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />}
            </span>
          )}
          <Button variant="outline" size="sm" className={cn(fullscreen ? "ms-auto shrink-0" : "ms-auto")} onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? <><Minimize2 className="h-4 w-4" /> Exit full screen</> : <><Maximize2 className="h-4 w-4" /> Full screen</>}
          </Button>
        </div>
        {/* Body (scrolls within the overlay in fullscreen) */}
        <div className={cn(fullscreen && "min-h-0 flex-1 overflow-auto p-4")}>
      <div className={cn("grid gap-4", fullscreen ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]")}>
        {/* Run panel */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Play className="h-4 w-4 text-primary" /> Run Use Case</CardTitle></CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {/* Audio upload (transcription) */}
            {uc.run.kind === "transcribe" ? (
              <AudioUpload busy={run.phase === "running"} onFile={runTranscribe} />
            ) : uc.documents ? (
              <>
                {/* Upload Your Document (primary) vs Try Sample */}
                <div className="inline-flex w-full overflow-hidden rounded-md border border-border text-sm">
                  <button onClick={() => setMode("upload")} className={cn("flex-1 px-3 py-1.5 font-medium transition-colors", mode === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                    <Upload className="me-1 inline h-3.5 w-3.5" /> Upload Your Document
                  </button>
                  <button onClick={() => { setMode("manual"); if (uc.inputs.length) loadSample(); }} className={cn("flex-1 px-3 py-1.5 font-medium transition-colors", mode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                    <FileText className="me-1 inline h-3.5 w-3.5" /> {uc.documents.fillField ? "Try Sample Document" : "Browse / run"}
                  </button>
                </div>
                {mode === "upload" ? (
                  <DocumentIntake fillField={uc.documents.fillField} publish={uc.documents.publish} large={fullscreen} onText={(t) => continueWithText(t)} />
                ) : (
                  <ManualInputs uc={uc} vals={vals} setVals={setVals} run={run} doRun={doRun} loadSample={loadSample} requiredFilled={requiredFilled} />
                )}
              </>
            ) : (
              <ManualInputs uc={uc} vals={vals} setVals={setVals} run={run} doRun={doRun} loadSample={loadSample} requiredFilled={requiredFilled} />
            )}
          </CardContent>
        </Card>

        {/* Output area with tabs */}
        <div className="space-y-3">
          {/* meta bar */}
          {run.phase === "done" && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/60 bg-surface-2/40 p-2.5 text-xs">
              <span className="font-medium">Secure AI execution</span>
              {meta?.model && <Badge variant="secondary" className="gap-1 text-[10px]"><Boxes className="h-3 w-3" />{meta.model}</Badge>}
              {meta?.status && <Badge variant={meta.status === "completed" ? "success" : meta.status === "blocked" || meta.status === "failed" ? "destructive" : "outline"} className="text-[10px]">{meta.status}</Badge>}
              {(meta?.policyPre || meta?.policyPost) && <Badge variant="outline" className="gap-1 text-[10px]"><ShieldCheck className="h-3 w-3" />policy: {meta.policyPre ?? "passed"}{meta.policyPost ? ` / ${meta.policyPost}` : ""}</Badge>}
              {meta?.latencyMs != null && <span className="text-muted-foreground">{Math.round(meta.latencyMs)} ms</span>}
              {meta?.inputTokens != null && <span className="text-muted-foreground">{meta.inputTokens} in / {meta.outputTokens} out</span>}
              {meta?.traceId && <a href={aicpHref(`/requests/${meta.traceId}`)} className="text-primary hover:underline">view full trace</a>}
            </div>
          )}

          {/* tabs */}
          <div className="flex flex-wrap gap-1 border-b border-border">
            {([["result", "Result", Sparkles], ["technical", "Technical", Workflow], ["architecture", "Architecture", Network]] as const).map(([k, label, I]) => (
              <button key={k} onClick={() => setTab(k)} className={cn("flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-sm font-medium transition-colors", tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <I className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {tab === "result" && uc.run.kind === "stream" ? (
            <>
              {run.phase === "idle" && <Card><CardContent className="flex min-h-[12rem] flex-col items-center justify-center text-center text-sm text-muted-foreground"><ScrollText className="mb-2 h-7 w-7 text-primary/40" />Run to stream a live answer from AICP.</CardContent></Card>}
              {run.phase === "error" && <Card><CardContent className="flex min-h-[8rem] items-center gap-2 text-sm text-danger"><XCircle className="h-5 w-5 shrink-0" />{run.error}</CardContent></Card>}
              {(run.phase === "running" || run.phase === "done") && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm">Answer {run.phase === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}</CardTitle></CardHeader>
                  <CardContent><p className="whitespace-pre-wrap text-sm">{streamText || (run.response as any)?.streamed_text || (run.phase === "running" ? "…" : "")}{run.phase === "running" && <span className="ms-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-primary align-middle" />}</p></CardContent>
                </Card>
              )}
            </>
          ) : tab === "result" && (
            <>
              {run.phase === "idle" && <Card><CardContent className="flex min-h-[12rem] flex-col items-center justify-center text-center text-sm text-muted-foreground"><ScrollText className="mb-2 h-7 w-7 text-primary/40" />Run the use case to see a live result.</CardContent></Card>}
              {run.phase === "running" && <Card><CardContent className="flex min-h-[12rem] items-center justify-center text-sm text-muted-foreground"><Loader2 className="me-2 h-4 w-4 animate-spin" /> Calling AICP…</CardContent></Card>}
              {run.phase === "error" && <Card><CardContent className="flex min-h-[8rem] items-center gap-2 text-sm text-danger"><XCircle className="h-5 w-5 shrink-0" />{run.error}</CardContent></Card>}
              {run.phase === "done" && <ResultView uc={uc} run={run} />}
            </>
          )}

          {tab === "technical" && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Workflow className="h-4 w-4 text-primary" /> Technical View</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="API endpoint"><code className="text-xs">{run.endpoint ?? `${uc.run.method} /api/v1${uc.run.endpoint}`}</code></Field>
                  <Field label="Status">{meta?.status ?? (run.phase === "done" ? "completed" : "—")}</Field>
                  <Field label="Latency">{meta?.latencyMs != null ? `${Math.round(meta.latencyMs)} ms` : run.latencyMs != null ? `${run.latencyMs} ms` : "—"}</Field>
                  <Field label="Trace ID">{meta?.traceId ? <code className="text-xs">{meta.traceId}</code> : "—"}</Field>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Request payload</p>
                  <Pre obj={run.request ?? uc.run.buildBody?.({}) ?? "(run to see)"} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Response payload</p>
                  {run.phase === "done" ? <Pre obj={run.response} /> : <p className="text-xs text-muted-foreground">Run the use case to capture the live response.</p>}
                </div>
                {run.phase === "error" && <div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-danger">Error</p><Pre obj={run.error} /></div>}
              </CardContent>
            </Card>
          )}

          {tab === "architecture" && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Network className="h-4 w-4 text-primary" /> Architecture View</CardTitle></CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">How the request flows — the SRCA AI Workspace never touches a model, OCR engine, vector DB or agent directly.</p>
                <div className="flex flex-col items-start gap-1.5">
                  {STD_FLOW.map((node, i) => {
                    const detail = node === "AICP API" ? (run.endpoint ?? `${uc.run.method} /api/v1${uc.run.endpoint}`)
                      : node === "AICP Service" ? uc.service
                      : node === "Engine" ? uc.engine
                      : node === "Governance" ? "Input & output policy enforcement"
                      : node === "Audit" ? "inference_requests + trace + cost event"
                      : node === "SRCA Workspace" ? "Server-side proxy (forwards your session)"
                      : null;
                    return (
                      <React.Fragment key={node}>
                        <div className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm", ["AICP Service", "Engine"].includes(node) ? "border-primary/40 bg-primary/5" : "border-border bg-surface-2/50")}>
                          <span className="font-medium">{node}</span>
                          {detail && <span className="text-xs text-muted-foreground">· {detail}</span>}
                        </div>
                        {i < STD_FLOW.length - 1 && <ArrowDown className="ms-4 h-3.5 w-3.5 text-muted-foreground" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {uc.fullCenter && (
            <Link href={uc.fullCenter.href} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              {uc.fullCenter.label} — the full experience <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
        </div>
      </div>
      );
      return fullscreen && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex h-screen w-screen flex-col overflow-hidden bg-background">{content}</div>,
            document.body,
          )
        : content;
      })()}

      {/* Configuration side panel */}
      <SidePanel open={showConfig} onClose={() => setShowConfig(false)} eyebrow="AICP Configuration" title={uc.title} className="max-w-lg">
        <div className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">Exactly how AICP is configured to run this use case. Values marked <span className="font-medium text-foreground">this run</span> are live from your last execution.</p>
          <ConfigRow label="AICP API(s)" values={uc.config.apis} live={run.endpoint} />
          <ConfigRow label="Provider" value={uc.config.provider} />
          <ConfigRow label="Model" value={uc.config.model} live={meta?.model ?? undefined} />
          <ConfigRow label="Routing rule" value={uc.config.route} live={meta?.route ?? undefined} />
          <ConfigRow label="Prompt / AI instruction" value={uc.config.prompt} />
          <ConfigRow label="Policies applied" values={uc.config.policies} live={meta ? `input: ${meta.policyPre ?? "passed"} · output: ${meta.policyPost ?? "passed"}` : undefined} />
          <ConfigRow label="Governance rules" values={uc.config.governance} />
          <ConfigRow label="OCR provider" value={uc.config.ocr} />
          <ConfigRow label="Knowledge base" value={uc.config.knowledge} />
          <ConfigRow label="RAG settings" value={uc.config.rag} />
          <ConfigRow label="Agent" value={uc.config.agent} />
          <ConfigRow label="Workflow" value={uc.config.workflow} />
          <ConfigRow label="Tools" values={uc.config.tools} />
          <ConfigRow label="Validation rules" value={uc.config.validation} />
          <ConfigRow label="Audit logging" value={uc.config.audit} live={meta?.traceId ? `trace ${meta.traceId}` : undefined} />
          <ConfigRow label="Permissions required" values={uc.config.permissions} />

          {/* Why */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary"><FileCog className="h-3.5 w-3.5" /> Why this configuration</p>
            <div className="space-y-2">
              {uc.why.model && <Why label="Why this model">{uc.why.model}</Why>}
              {uc.why.route && <Why label="Why this route">{uc.why.route}</Why>}
              {uc.why.policy && <Why label="Why this policy">{uc.why.policy}</Why>}
              {uc.why.ocr && <Why label="Why this OCR provider">{uc.why.ocr}</Why>}
              {uc.why.knowledge && <Why label="Why this knowledge source">{uc.why.knowledge}</Why>}
              {uc.why.agentWorkflow && <Why label="Why this agent / workflow">{uc.why.agentWorkflow}</Why>}
            </div>
          </div>
          <a href={aicpHref("/configmap")} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Manage this configuration in AICP <ExternalLink className="h-3 w-3" /></a>
        </div>
      </SidePanel>
    </div>
  );
}

function ManualInputs({ uc, vals, setVals, run, doRun, loadSample, requiredFilled }: {
  uc: UseCaseDef; vals: Record<string, string>; setVals: (v: Record<string, string>) => void;
  run: RunState; doRun: (demo?: boolean) => void; loadSample: () => void; requiredFilled: boolean;
}) {
  return (
    <>
      {uc.inputs.length === 0 && <p className="text-sm text-muted-foreground">No input needed — run it to call the AICP API and see live data.</p>}
      {uc.inputs.map((f) => (
        <div key={f.name} className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
          {f.kind === "textarea" ? (
            <textarea value={vals[f.name] ?? ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} placeholder={f.placeholder}
              className="min-h-[8rem] w-full resize-y rounded-md border border-border bg-[hsl(var(--input))] p-2.5 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
          ) : f.kind === "select" ? (
            <select value={vals[f.name] ?? ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })}
              className="w-full rounded-md border border-border bg-[hsl(var(--input))] p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              <option value="">Select…</option>
              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input value={vals[f.name] ?? ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} placeholder={f.placeholder}
              className="w-full rounded-md border border-border bg-[hsl(var(--input))] p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
          )}
        </div>
      ))}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <Button onClick={() => doRun(false)} disabled={run.phase === "running" || !requiredFilled}>
          {run.phase === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Run
        </Button>
        {uc.inputs.length > 0 && <Button variant="outline" size="sm" onClick={loadSample} disabled={run.phase === "running"}>Load sample</Button>}
      </div>
      <div className="rounded-md border border-dashed border-border/70 bg-surface-2/30 p-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary"><Play className="h-3 w-3" /> Demo Mode</p>
        <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Expected output:</span> {uc.run.expected}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => doRun(true)} disabled={run.phase === "running"}>
          {run.phase === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run demo
        </Button>
      </div>
    </>
  );
}

function AudioUpload({ busy, onFile }: { busy: boolean; onFile: (f: File) => void }) {
  const [drag, setDrag] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  function pick(f?: File) {
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { setErr(`“${f.name}” is over the 25 MB limit.`); return; }
    setErr(null); onFile(f);
  }
  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors", drag ? "border-primary bg-primary/5" : "border-border bg-surface-2/30")}
      >
        <Mic className="h-8 w-8 text-primary/60" />
        <p className="text-sm font-medium">Drag &amp; drop an audio file, or</p>
        <label className="cursor-pointer">
          <input type="file" className="hidden" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Choose audio</span>
        </label>
        <p className="text-xs text-muted-foreground">WAV / MP3 / M4A — up to 25 MB. Transcribed by AICP (on-prem Whisper).</p>
      </div>
      {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Transcribing securely…</p>}
      {err && <p className="text-sm text-danger">{err}</p>}
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn(full && "sm:col-span-2")}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Why({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-xs font-semibold">{label}</p><p className="text-xs text-muted-foreground">{children}</p></div>;
}

function ConfigRow({ label, value, values, live }: { label: string; value?: string; values?: string[]; live?: string }) {
  return (
    <div className="border-b border-border/50 pb-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      {values ? (
        <ul className="mt-0.5 list-inside list-disc text-sm">{values.map((v) => <li key={v}>{v}</li>)}</ul>
      ) : (
        <p className="mt-0.5 text-sm">{value}</p>
      )}
      {live && <p className="mt-0.5 text-xs text-primary">This run → {live}</p>}
    </div>
  );
}
