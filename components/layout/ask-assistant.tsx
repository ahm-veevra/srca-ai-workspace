"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowUp, Boxes, Loader2, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { apiGet, apiPost, ApiRequestError } from "@/lib/api-client";

/**
 * Hilal — the SRCA AI Assistant in the header. It answers questions about platform
 * health, governance, routing, cost and what needs attention by calling the governed AICP
 * inference API, grounded in a live platform snapshot (metrics, cost, governance, health).
 * Everything runs through AICP — the assistant never calls a model directly.
 */

interface Msg { role: "user" | "assistant"; text: string; model?: string | null }

interface InferenceResult {
  status: string;
  output: { text?: string } | null;
  selected_model_key: string | null;
  error: { message?: string } | null;
}

const SUGGESTED = [
  "What needs my attention right now?",
  "Summarize today's AI request volume and cost.",
  "Which models are degraded or unhealthy?",
  "Are there any open governance violations?",
];

const SYSTEM = (snapshot: string) =>
  "You are Hilal, the Saudi Red Crescent Authority (SRCA) AI Assistant inside the SRCA AI Workspace, " +
  "powered by the AICP AI platform. " +
  "Answer concisely (2–5 sentences) and practically about the platform: health, governance, " +
  "model routing, cost, and what needs attention. Prefer the live platform snapshot below for " +
  "facts and numbers; if the snapshot doesn't contain the answer, say so plainly rather than " +
  "guessing.\n\n=== Live platform snapshot ===\n" + (snapshot || "(snapshot unavailable)");

/** Best-effort live snapshot from AICP read endpoints; failures are skipped silently. */
async function loadSnapshot(): Promise<string> {
  const lines: string[] = [];
  const tasks: Promise<void>[] = [
    apiGet<any>("/metrics/overview?hours=24").then((m) => {
      lines.push(
        `Metrics (24h): ${m.total_requests} requests, ${m.completed} completed, ${m.failed} failed, ` +
        `${m.blocked} blocked, success ${Math.round((m.success_rate ?? 0) * 100)}%, ` +
        `avg latency ${Math.round(m.avg_latency_ms ?? 0)}ms, p95 ${Math.round(m.p95_latency_ms ?? 0)}ms, ` +
        `cost ${m.total_cost ?? 0} ${m.currency ?? ""}.`,
      );
    }).catch(() => {}),
    apiGet<any>("/cost/summary?hours=24").then((c) => {
      const top = (c.by_model ?? []).slice(0, 3).map((b: any) => `${b.model_key} (${b.request_count} req)`).join(", ");
      lines.push(`Cost (24h): ${c.request_count} requests, ${((c.total_cost_micros ?? 0) / 1_000_000).toFixed(4)} total. Top models: ${top || "none"}.`);
    }).catch(() => {}),
    apiGet<any>("/governance/report?days=7").then((g) => {
      const sev = Object.entries(g.by_severity ?? {}).map(([k, v]) => `${k}:${v}`).join(", ");
      lines.push(`Governance (7d): ${g.total_violations ?? 0} violations (${sev || "none"}), ${g.open_alerts ?? 0} open alerts.`);
    }).catch(() => {}),
    apiGet<any>("/system/health").then((h) => {
      const deps = ["database", "redis", "vector_store", "search"].map((k) => `${k}:${h[k] ?? "?"}`).join(", ");
      const models = h.models ? Object.entries(h.models).map(([k, v]) => `${k}:${v}`).join(", ") : "";
      lines.push(`Health: overall ${h.status ?? "?"}; ${deps}.${models ? " Models: " + models + "." : ""}`);
    }).catch(() => {}),
  ];
  await Promise.allSettled(tasks);
  return lines.join("\n");
}

export function AskAssistant() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const snapshotRef = React.useRef<string | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  // Lock background scroll while the panel is open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Warm the platform snapshot the first time the panel opens.
  React.useEffect(() => {
    if (open && snapshotRef.current === null) {
      snapshotRef.current = "";
      loadSnapshot().then((s) => { snapshotRef.current = s; }).catch(() => { snapshotRef.current = ""; });
    }
  }, [open]);

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      // Make sure the snapshot is ready (it loads fast; wait briefly if still warming).
      if (!snapshotRef.current) snapshotRef.current = await loadSnapshot();
      const res = await apiPost<InferenceResult>("/inference", {
        prompt: q,
        system: SYSTEM(snapshotRef.current || ""),
        intent: "chat",
        max_tokens: 600,
      });
      const text = res.output?.text?.trim();
      if (res.status !== "completed" || !text) {
        throw new Error(res.error?.message || `Assistant returned ${res.status}.`);
      }
      setMessages((m) => [...m, { role: "assistant", text, model: res.selected_model_key }]);
    } catch (e) {
      const msg = e instanceof ApiRequestError ? e.error.message : e instanceof Error ? e.message : "The assistant is unavailable right now.";
      setError(msg);
      setMessages((m) => [...m, { role: "assistant", text: `I couldn't answer that — ${msg}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent transition-all hover:shadow-glow-sm"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Ask Hilal</span>
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[120] flex h-screen w-screen justify-end">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className={cn("relative flex h-full w-full max-w-md flex-col border-s border-border-strong bg-surface-2 shadow-elevated")}>
            <header className="surface-vignette flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10">
                  <Sparkles className="h-4 w-4 text-accent" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Ask Hilal</p>
                  <p className="text-[11px] text-muted-foreground">SRCA AI Assistant · powered by AICP</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.length === 0 ? (
                <>
                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                    <p className="text-sm">Ask about platform health, governance, routing, cost, or what needs your attention.</p>
                  </div>
                  <p className="eyebrow">Suggested</p>
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      disabled={busy}
                      className="block w-full rounded-md border border-border bg-surface-3/40 px-3 py-2 text-start text-sm transition-colors hover:border-accent/50 hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {q}
                    </button>
                  ))}
                </>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-sm", m.role === "user" ? "bg-accent/15 text-foreground" : "border border-border bg-surface-3/40")}>
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      {m.role === "assistant" && m.model && (
                        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Boxes className="h-3 w-3" /> {m.model}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
              {busy && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-3/40 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t border-border p-4">
              {error && messages.length === 0 && <p className="mb-2 text-xs text-danger">{error}</p>}
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="flex items-center gap-2 rounded-lg border border-border bg-[hsl(var(--input))] px-3 py-2 focus-within:border-accent/60"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={busy}
                  placeholder="Ask about your AI platform…"
                  className="h-6 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  aria-label="Send"
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-muted-foreground"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
}
