"use client";

import * as React from "react";
import { Loader2, MessageSquare, PieChart, Search, SendHorizontal, Sparkles } from "lucide-react";

import { askDocumentAction } from "@/app/(portal)/document-intelligence/dms-actions";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { MarkdownView } from "@/components/ui/markdown";
import { EXEC_RECORDS, type ExecRecord, type ExecStatus } from "@/lib/executive-sample";
import { apiPost, ApiRequestError } from "@/lib/api-client";
import { useLocale, useT } from "@/lib/i18n";
import { type MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

interface AnalyzeResult { analysis: Record<string, unknown>; meta: AnalysisMeta }
interface ChatMsg { role: "user" | "assistant"; text: string }

const STATUS_TONE: Record<ExecStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  "In Review": "bg-warning/10 text-warning",
  Final: "bg-success/10 text-success",
};
const prettify = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function ExecutiveManagement() {
  const t = useT();
  const { locale } = useLocale();
  const [selId, setSelId] = React.useState<string>(EXEC_RECORDS[0].id);
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState<"report" | "briefing">("report");
  const [resultById, setResultById] = React.useState<Record<string, AnalyzeResult>>({});
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [chats, setChats] = React.useState<Record<string, ChatMsg[]>>({});
  const [question, setQuestion] = React.useState("");
  const [chatBusy, setChatBusy] = React.useState(false);
  const [chatErr, setChatErr] = React.useState<string | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const sel = EXEC_RECORDS.find((r) => r.id === selId) ?? EXEC_RECORDS[0];
  const titleOf = (r: ExecRecord) => (locale === "ar" && r.titleAr ? r.titleAr : r.title);
  const statusLabel = (s: ExecStatus) => t(`ex.status.${s.replace(/\s/g, "")}` as MessageKey);
  const result = resultById[selId];
  const chat = chats[selId] ?? [];

  const filtered = EXEC_RECORDS.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return r.title.toLowerCase().includes(q) || r.titleAr.includes(query.trim()) ||
      r.period.toLowerCase().includes(q) || r.department.toLowerCase().includes(q);
  });

  React.useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.length, chatBusy]);

  function selectRecord(id: string) {
    setSelId(id); setTab("report"); setQuestion(""); setChatErr(null); setErr(null);
  }

  async function brief() {
    if (busy) return;
    setBusy(true); setErr(null); setTab("briefing");
    try {
      const r = await apiPost<AnalyzeResult>("/executive-intelligence/analyze", { text: sel.body });
      setResultById((m) => ({ ...m, [selId]: r }));
    } catch (e) {
      setErr(e instanceof ApiRequestError ? e.error.message : t("ex.error"));
    } finally {
      setBusy(false);
    }
  }

  async function ask(qText: string) {
    const text = qText.trim();
    if (!text || chatBusy) return;
    setChatErr(null); setQuestion("");
    setChats((m) => ({ ...m, [selId]: [...(m[selId] ?? []), { role: "user", text }] }));
    setChatBusy(true);
    const res = await askDocumentAction(titleOf(sel), sel.body, text, locale);
    if (res.ok) setChats((m) => ({ ...m, [selId]: [...(m[selId] ?? []), { role: "assistant", text: res.output }] }));
    else setChatErr(res.noCapability ? t("ex.chat.awaitingCap") : t("ex.chat.error"));
    setChatBusy(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,22rem)]">
      {/* ── Register ────────────────────────────────────────────────────────── */}
      <aside className="flex flex-col rounded-2xl border border-border bg-card">
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center justify-between">
            <p className="eyebrow">{t("ex.register")}</p>
            <span className="text-[11px] text-muted-foreground">{t("ex.count", { n: EXEC_RECORDS.length })}</span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ex.search")}
              className="h-8 w-full rounded-lg border border-border bg-surface-2 ps-8 pe-2 text-xs outline-none focus:border-primary/50" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {filtered.map((r) => {
            const on = r.id === selId;
            return (
              <button key={r.id} onClick={() => selectRecord(r.id)}
                className={cn("mb-1 flex w-full items-start gap-2 rounded-lg p-2 text-start transition-colors", on ? "bg-primary/10" : "hover:bg-surface-2")}>
                <PieChart className={cn("mt-0.5 h-4 w-4 shrink-0", on ? "text-primary" : "text-muted-foreground")} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{titleOf(r)}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{r.period} · {r.department}</span>
                  <span className="mt-1 inline-block">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", STATUS_TONE[r.status])}>{statusLabel(r.status)}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Report + Briefing ───────────────────────────────────────────────── */}
      <section className="flex min-h-[34rem] flex-col rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><PieChart className="h-5 w-5" /></span>
            <div className="space-y-1">
              <h2 className="font-display text-base font-semibold leading-tight">{titleOf(sel)}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span>{t("ex.meta.period")}: {sel.period}</span>
                <span>· {t("ex.meta.department")}: {sel.department}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[sel.status])}>{statusLabel(sel.status)}</span>
            <button onClick={brief} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {busy ? t("ex.briefing") : t("ex.brief")}
            </button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-border px-4">
          <Tab active={tab === "report"} onClick={() => setTab("report")}>{t("ex.tab.report")}</Tab>
          <Tab active={tab === "briefing"} onClick={() => setTab("briefing")}>{t("ex.tab.briefing")}</Tab>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {tab === "report" ? (
            <article className="mx-auto max-w-2xl rounded-lg border border-border bg-surface-2/40 p-6 shadow-sm">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{sel.body}</p>
            </article>
          ) : (
            <div className="space-y-3">
              {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("ex.briefing")}</p>}
              {err && !busy && <p className="text-sm text-danger">{err}</p>}
              {!busy && !result && !err && <p className="text-sm text-muted-foreground">{t("ex.briefEmpty")}</p>}
              {result && (
                <>
                  <AnalysisMetaBar meta={result.meta} />
                  <AnalysisView analysis={result.analysis} rawText={result.meta.raw_text} />
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Ask this report ─────────────────────────────────────────────────── */}
      <aside className="flex min-h-[34rem] flex-col rounded-2xl border border-border bg-card">
        <div className="flex items-start gap-2.5 border-b border-border p-4">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="h-4 w-4" /></span>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold leading-tight">{t("ex.chat.title")}</h3>
            <p className="text-[11px] text-muted-foreground">{t("ex.chat.subtitle")}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-auto p-3">
          {chat.length === 0 && !chatBusy && (
            <div className="space-y-2 pt-2">
              {[t("ex.chat.ex1"), t("ex.chat.ex2"), t("ex.chat.ex3")].map((ex) => (
                <button key={ex} onClick={() => ask(ex)}
                  className="block w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-start text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground">{ex}</button>
              ))}
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed", m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-surface-2 text-foreground")}>
                {m.role === "assistant" ? <MarkdownView content={m.text} /> : <p className="whitespace-pre-wrap">{m.text}</p>}
              </div>
            </div>
          ))}
          {chatBusy && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("ex.chat.thinking")}</p>}
          {chatErr && !chatBusy && <p className="text-xs text-danger">{chatErr}</p>}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="flex items-center gap-2 border-t border-border p-3">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} disabled={chatBusy} placeholder={t("ex.chat.placeholder")}
            className="h-10 flex-1 rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary/50 disabled:opacity-60" />
          <button type="submit" disabled={chatBusy || !question.trim()} aria-label={t("dms.chat.send")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
            {chatBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4 rtl:-scale-x-100" />}
          </button>
        </form>
      </aside>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("border-b-2 px-3 py-2 text-sm font-medium transition-colors", active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{children}</button>;
}
function AnalysisView({ analysis, rawText }: { analysis: Record<string, unknown>; rawText?: string | null }) {
  const entries = Object.entries(analysis).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0));
  if (entries.length === 0) return rawText ? <p className="whitespace-pre-wrap text-sm">{rawText}</p> : null;
  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-border/60 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{prettify(key)}</p>
          <FieldValue value={value} />
        </div>
      ))}
    </div>
  );
}
function FieldValue({ value }: { value: unknown }) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <p className="text-sm leading-relaxed text-foreground">{String(value)}</p>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>{typeof item === "object" && item ? Object.values(item as Record<string, unknown>).filter((v) => typeof v === "string" || typeof v === "number").join(" — ") : String(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (value && typeof value === "object") {
    return (
      <dl className="space-y-0.5">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[120px_1fr] gap-2 text-xs">
            <dt className="text-muted-foreground">{prettify(k)}</dt>
            <dd className="text-foreground">{String(v)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <p className="text-sm">{String(value)}</p>;
}
