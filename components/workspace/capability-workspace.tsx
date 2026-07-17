"use client";

import {
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  FileText,
  History,
  Loader2,
  type LucideIcon,
  MoreVertical,
  Plug,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/metric";
import { StatusDot } from "@/components/ui/status-dot";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { aicpHref } from "@/lib/aicp";
import { apiGet, apiPost } from "@/lib/api-client";
import {
  createConversation,
  deleteConversation,
  listConversations,
  saveMessage,
} from "@/lib/conversations";
import { cn } from "@/lib/utils";
import { newId, streamCapability, type Conversation, type Message, type MsgMeta } from "@/lib/vgpt";

export interface CapabilityTaskLabel {
  code: string;
  label: string;
  domain: string;
}
export interface CapabilityAction {
  key: string;
  label: string;
  prompt: string;
}
interface SourceConnector {
  key: string;
  name: string;
  kind: string;
  status: string;
  healthy?: boolean | null;
  last_sync_at?: string | null;
}
interface CapabilitySource {
  key: string;
  name: string;
  documents: number;
  connectors: SourceConnector[];
}
interface SourcesOut {
  collections: CapabilitySource[];
  total_documents: number;
}
interface Stat {
  key: string;
  label: string;
  value: number;
  hint?: string | null;
}
interface InsightsOut {
  stats: Stat[];
  last_sync_at?: string | null;
}
interface DigestOut {
  highlights: string[];
  meta: Record<string, unknown>;
  generated: boolean;
}

/** Map the streaming chat meta onto the shared AICP AnalysisMeta so a capability answer renders
 * the exact same "Secure AI execution" transparency bar + 8-dimension provenance as every other
 * surface (model, citations, latency, policy, grounding confidence). */
function toAnalysisMeta(m: MsgMeta): AnalysisMeta {
  return {
    model: m.model,
    trace_id: m.traceId ?? null,
    status: m.status,
    policy_pre: m.policyPre ?? null,
    policy_post: m.policyPost ?? null,
    latency_ms: m.latencyMs,
    input_tokens: m.inputTokens ?? null,
    output_tokens: m.outputTokens ?? null,
    structured: true,
    raw_text: null,
    error: null,
    provenance: m.provenance ?? null,
  };
}

const MD_CLASS = cn(
  "text-sm leading-relaxed",
  "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:ps-5 [&_li]:my-0.5",
  "[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:font-semibold",
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:font-semibold [&_strong]:font-semibold",
  "[&_code]:rounded [&_code]:bg-surface-2/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
  "[&_pre]:my-2 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:bg-surface-2/60 [&_pre]:p-3",
  "[&_a]:text-primary [&_a]:underline [&_table]:my-2 [&_table]:w-full [&_th]:text-start",
  "[&_th]:border-b [&_th]:border-border [&_th]:py-1 [&_th]:pe-3 [&_td]:py-1 [&_td]:pe-3",
);

function MarkdownView({ text }: { text: string }) {
  return (
    <div className={MD_CLASS}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-current"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

/** "Capabilities" — what this experience can actually do (resolved from the taxonomy). */
function CapabilitiesPanel({ capabilities }: { capabilities: CapabilityTaskLabel[] }) {
  if (!capabilities.length) return null;
  return (
    <section className="rounded-lg border border-border bg-background p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Capabilities
      </h2>
      <ul className="space-y-1.5">
        {capabilities.map((c) => (
          <li key={c.code} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * "Search in" — the collections the assistant reads (with the connectors that feed them) AND a
 * selector to scope which of them a run grounds on. Unchecking a source narrows the assistant's
 * search; unchecking all runs on the model alone.
 */
function SourcesPanel({
  data,
  loading,
  selected,
  onToggle,
}: {
  data: SourcesOut | null;
  loading: boolean;
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  const hasSources = !!data && data.collections.length > 0;
  return (
    <section className="rounded-lg border border-border bg-background p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {hasSources ? "Search in" : "Knowledge Sources"}
      </h2>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : !hasSources ? (
        <p className="text-sm text-muted-foreground">
          No knowledge sources are connected to this capability.
        </p>
      ) : (
        <div className="space-y-3">
          {data!.collections.map((col) => (
            <div key={col.key}>
              <label className="flex cursor-pointer items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={selected.has(col.key)}
                    onChange={() => onToggle(col.key)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {col.name}
                </span>
                <span className="text-xs text-muted-foreground">{col.documents} docs</span>
              </label>
              {col.connectors.length > 0 && (
                <ul className="mt-1 space-y-1 ps-6">
                  {col.connectors.map((c) => (
                    <li
                      key={c.key}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <StatusDot
                        tone={
                          c.healthy === false || c.status !== "active" ? "warning" : "success"
                        }
                      />
                      <Plug className="h-3 w-3" />
                      <span className="truncate">{c.name}</span>
                      <span className="uppercase opacity-60">{c.kind}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <p className="pt-1 text-xs text-muted-foreground">
            {selected.size === 0
              ? "No sources selected — answers use the model only."
              : `Searching ${selected.size} of ${data!.collections.length} source${
                  data!.collections.length === 1 ? "" : "s"
                }.`}
          </p>
        </div>
      )}
    </section>
  );
}

/** Capability actions (item #10). Administrative actions deep-link into the AICP console (where
 * a capability is configured/governed); History is the in-workspace list of past conversations. */
function CapabilityMenu({
  id,
  name,
  onLoad,
  history,
  onOpenHistory,
  onDelete,
}: {
  id: string;
  name: string;
  onLoad: (c: Conversation) => void;
  history: Conversation[];
  onOpenHistory: () => void;
  onDelete: (cid: string) => void;
}) {
  const links = [
    { label: "Configure", icon: Settings, href: aicpHref(`/ai-capabilities/${id}`) },
    { label: "Knowledge", icon: Database, href: aicpHref("/knowledge") },
    { label: "Permissions", icon: ShieldCheck, href: aicpHref("/roles") },
  ];
  return (
    <details
      className="group relative"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) onOpenHistory();
      }}
    >
      <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-surface-3 hover:text-foreground [&::-webkit-details-marker]:hidden">
        <MoreVertical className="h-4 w-4" />
      </summary>
      <div className="absolute end-0 z-20 mt-1 w-64 rounded-md border border-border bg-background p-1 shadow-lg">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-2"
          >
            <l.icon className="h-3.5 w-3.5 text-muted-foreground" />
            {l.label}
            <ExternalLink className="ms-auto h-3 w-3 text-muted-foreground" />
          </a>
        ))}
        <div className="my-1 border-t border-border" />
        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" /> History
          </span>
        </div>
        {history.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">No past conversations yet.</p>
        ) : (
          <ul className="max-h-56 overflow-y-auto">
            {history.map((c) => (
              <li key={c.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onLoad(c)}
                  className="flex-1 truncate rounded px-2 py-1.5 text-start text-sm hover:bg-surface-2"
                  title={c.title}
                >
                  {c.title.startsWith(`${name}: `) ? c.title.slice(name.length + 2) : c.title}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  aria-label="Delete conversation"
                  className="rounded p-1 text-muted-foreground hover:bg-surface-2 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

const STAT_ICONS: Record<string, LucideIcon> = {
  documents: FileText,
  recent: Sparkles,
  ready: Database,
  sources: Plug,
};

/**
 * Ambient "at a glance" panel shown on the empty state: exact quick-stats from the capability's
 * synced knowledge (DB counts, not estimates) + an AI-generated "Today's Highlights" digest (a
 * real governed run over recent content, with provenance). Makes the workspace feel alive without
 * fabricating any numbers.
 */
function AtAGlance({ id }: { id: string }) {
  const [insights, setInsights] = React.useState<InsightsOut | null>(null);
  const [digest, setDigest] = React.useState<DigestOut | null>(null);
  const [digesting, setDigesting] = React.useState(false);
  const ranDigest = React.useRef(false);

  const runDigest = React.useCallback(() => {
    setDigesting(true);
    apiPost<DigestOut>(`/ai-capabilities/${id}/digest`, {})
      .then(setDigest)
      .catch(() => setDigest({ highlights: [], meta: {}, generated: false }))
      .finally(() => setDigesting(false));
  }, [id]);

  React.useEffect(() => {
    let alive = true;
    apiGet<InsightsOut>(`/ai-capabilities/${id}/insights`)
      .then((d) => {
        if (!alive) return;
        setInsights(d);
        const docs = d.stats.find((s) => s.key === "documents")?.value ?? 0;
        // Auto-generate highlights once, only when there's content to summarize.
        if (docs > 0 && !ranDigest.current) {
          ranDigest.current = true;
          runDigest();
        }
      })
      .catch(() => alive && setInsights({ stats: [] }));
    return () => {
      alive = false;
    };
  }, [id, runDigest]);

  const stats = insights?.stats ?? [];
  const hasData = stats.some((s) => s.value > 0);
  if (!insights || !hasData) return null; // nothing synced yet → no ambient panel

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <KpiCard
            key={s.key}
            label={s.label}
            value={s.value.toLocaleString()}
            icon={STAT_ICONS[s.key]}
          />
        ))}
      </div>

      {(digesting || digest?.generated) && (
        <section className="rounded-lg border border-border bg-background p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Today&apos;s Highlights
            </h2>
            <button
              type="button"
              onClick={runDigest}
              disabled={digesting}
              aria-label="Refresh highlights"
              className="rounded p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
            >
              <RotateCcw className={cn("h-3.5 w-3.5", digesting && "animate-spin")} />
            </button>
          </div>
          {digesting && !digest ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing recent activity…
            </div>
          ) : (
            <ul className="space-y-1.5">
              {digest?.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}
          {digest?.meta?.model ? (
            <p className="mt-2 text-xs text-muted-foreground">
              AI-generated by {String(digest.meta.model)}
              {typeof digest.meta.considered === "number"
                ? ` · ${digest.meta.considered} recent items considered`
                : ""}
              {digest.meta.trace_id ? (
                <>
                  {" · "}
                  <a
                    href={aicpHref(`/requests/${String(digest.meta.trace_id)}`)}
                    className="text-primary hover:underline"
                  >
                    view trace
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}

/** Export the whole conversation as a Markdown file (client-side; the AICP result is the source). */
function exportConversation(name: string, messages: Message[]) {
  const lines = messages.map(
    (m) => `## ${m.role === "user" ? "You" : name}\n\n${m.content}`,
  );
  const blob = new Blob([`# ${name}\n\n${lines.join("\n\n")}\n`], {
    type: "text/markdown",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.toLowerCase().replace(/\s+/g, "-")}-conversation.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * A conversational, governed workspace for an exposed AI Capability. Multi-turn (the capability
 * remembers context within the conversation), streaming, with per-answer AICP provenance. All
 * intelligence — model, knowledge grounding, system prompt — is resolved server-side by AICP; this
 * component only sends the latest input plus prior turns.
 */
export function CapabilityWorkspace({
  id,
  name,
  objective,
  suggestedPrompts = [],
  placeholder,
  capabilities = [],
  actions = [],
}: {
  id: string;
  name: string;
  objective: string;
  suggestedPrompts?: string[];
  placeholder?: string | null;
  capabilities?: CapabilityTaskLabel[];
  actions?: CapabilityAction[];
}) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const convIdRef = React.useRef<string | null>(null);

  const [sourcesData, setSourcesData] = React.useState<SourcesOut | null>(null);
  const [sourcesLoading, setSourcesLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [history, setHistory] = React.useState<Conversation[]>([]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load the capability's knowledge sources once; default to searching all of them.
  React.useEffect(() => {
    let alive = true;
    apiGet<SourcesOut>(`/ai-capabilities/${id}/sources`)
      .then((d) => {
        if (!alive) return;
        setSourcesData(d);
        setSelected(new Set(d.collections.map((c) => c.key)));
      })
      .catch(() => alive && setSourcesData({ collections: [], total_documents: 0 }))
      .finally(() => alive && setSourcesLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const allKeys = sourcesData?.collections.map((c) => c.key) ?? [];

  function toggleSource(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function persistTurn(user: Message, assistant: Message) {
    try {
      if (!convIdRef.current) {
        const cid = newId();
        await createConversation(cid, `${name}: ${user.content.slice(0, 60)}`);
        convIdRef.current = cid;
      }
      await saveMessage(convIdRef.current, user);
      await saveMessage(convIdRef.current, assistant);
    } catch {
      /* persistence is best-effort — never break the conversation */
    }
  }

  async function loadHistory() {
    try {
      const all = await listConversations();
      setHistory(all.filter((c) => c.title.startsWith(`${name}: `)));
    } catch {
      /* ignore */
    }
  }

  function loadConversation(c: Conversation) {
    abortRef.current?.abort();
    setMessages(c.messages);
    convIdRef.current = c.id;
    setError(null);
  }

  async function removeConversation(cid: string) {
    try {
      await deleteConversation(cid);
    } catch {
      /* ignore */
    }
    setHistory((prev) => prev.filter((c) => c.id !== cid));
    if (convIdRef.current === cid) convIdRef.current = null;
  }

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setError(null);

    // Prior turns become the conversation memory sent to AICP (system prompt is server-set).
    const priorTurns = messages
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    const userMsg: Message = { id: newId(), role: "user", content: q };
    const assistantMsg: Message = { id: newId(), role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setBusy(true);

    // 'Search in' scope: undefined → all bound sources; a real subset → those; [] → model only.
    let sources: string[] | undefined;
    if (allKeys.length === 0 || selected.size === allKeys.length) sources = undefined;
    else sources = Array.from(selected);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      let acc = "";
      const meta = await streamCapability(
        id,
        { input: q, messages: priorTurns, ...(sources !== undefined ? { sources } : {}) },
        (tok) => {
          acc += tok;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: acc } : m)),
          );
        },
        ctrl.signal,
      );
      setMessages((prev) => prev.map((m) => (m.id === assistantMsg.id ? { ...m, meta } : m)));
      void persistTurn(userMsg, { ...assistantMsg, content: acc, meta });
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("The request couldn't be completed. Please try again.");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id && !m.content
              ? { ...m, meta: { model: null, status: "failed", latencyMs: null } }
              : m,
          ),
        );
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setBusy(false);
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setInput("");
    convIdRef.current = null;
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void ask(input);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{name}</h1>
          {objective && (
            <p className="max-w-3xl text-sm text-muted-foreground">{objective}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!empty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="gap-1.5 text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> New conversation
            </Button>
          )}
          <CapabilityMenu
            id={id}
            name={name}
            history={history}
            onOpenHistory={() => void loadHistory()}
            onLoad={loadConversation}
            onDelete={(cid) => void removeConversation(cid)}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Main column: conversation → actions → composer */}
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex-1 space-y-4 overflow-y-auto">
            {empty ? (
              <div className="space-y-4">
                <AtAGlance id={id} />
                <div className="rounded-lg border border-dashed border-border/70 bg-surface-2/30 p-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" /> Try asking…
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {suggestedPrompts.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => void ask(p)}
                        className="rounded-md border border-border bg-background px-3 py-2 text-start text-sm text-foreground transition hover:border-primary/50 hover:bg-surface-2/50"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] space-y-2 rounded-lg px-4 py-3 text-sm",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background",
                    )}
                  >
                    {m.role === "assistant" ? (
                      m.content ? (
                        <MarkdownView text={m.content} />
                      ) : busy && m.id === messages[messages.length - 1]?.id ? (
                        <TypingDots />
                      ) : null
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                    {m.role === "assistant" && m.meta && (
                      <AnalysisMetaBar meta={toAnalysisMeta(m.meta)} />
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          {/* AI actions — one-click predefined instructions + export */}
          {(actions.length > 0 || messages.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {actions.map((a) => (
                <Button
                  key={a.key}
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void ask(a.prompt)}
                  className="text-xs"
                >
                  {a.label}
                </Button>
              ))}
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportConversation(name, messages)}
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              )}
            </div>
          )}

          {/* Composer */}
          <div className="rounded-lg border border-border bg-background p-2">
            <textarea
              className="max-h-40 min-h-16 w-full resize-none bg-transparent p-2 text-sm outline-none"
              placeholder={placeholder ?? "Describe what you need…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
            />
            <div className="flex items-center justify-between px-1 pb-0.5">
              <span className="text-xs text-muted-foreground">
                Enter to send · Shift+Enter for a new line
              </span>
              {busy ? (
                <Button variant="outline" size="sm" onClick={stop} className="gap-1.5">
                  <Square className="h-3.5 w-3.5" /> Stop
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => void ask(input)}
                  disabled={input.trim().length < 2}
                  className="gap-1.5"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Trust rail: what it can do + what it reads */}
        <aside className="hidden w-72 shrink-0 space-y-4 overflow-y-auto lg:block">
          <CapabilitiesPanel capabilities={capabilities} />
          <SourcesPanel
            data={sourcesData}
            loading={sourcesLoading}
            selected={selected}
            onToggle={toggleSource}
          />
        </aside>
      </div>
    </div>
  );
}
