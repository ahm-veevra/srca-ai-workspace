"use client";

import * as React from "react";
import {
  AlertTriangle, FileSignature, Gavel, Loader2, MessageSquare, Search, SendHorizontal, Sparkles,
} from "lucide-react";

import { askDocumentAction } from "@/app/(portal)/document-intelligence/dms-actions";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { LineageButton } from "@/components/ai-intelligence/lineage-button";
import { MarkdownView } from "@/components/ui/markdown";
import { UploadDocButton } from "@/components/workspace/upload-doc-button";
import { CONTRACT_RECORDS, type ContractRecord, type RecordKind, type RecordStatus } from "@/lib/contracts-sample";
import { apiPost, ApiRequestError } from "@/lib/api-client";
import { useLocale, useT } from "@/lib/i18n";
import { type MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

interface AnalyzeResult { analysis: Record<string, unknown>; meta: AnalysisMeta }
interface ChatMsg { role: "user" | "assistant"; text: string }

const STATUS_TONE: Record<RecordStatus, string> = {
  Active: "bg-success/10 text-success",
  "Under Review": "bg-warning/10 text-warning",
  Awarded: "bg-primary/10 text-primary",
  Expiring: "bg-danger/10 text-danger",
  Draft: "bg-muted text-muted-foreground",
};
const prettify = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function ContractTenderManagement({ defaultType = "all" }: { defaultType?: "all" | RecordKind }) {
  const t = useT();
  const { locale } = useLocale();
  const [records, setRecords] = React.useState<ContractRecord[]>(CONTRACT_RECORDS);
  const first = CONTRACT_RECORDS.find((r) => defaultType === "all" || r.kind === defaultType) ?? CONTRACT_RECORDS[0];
  const [selId, setSelId] = React.useState<string>(first.id);
  const [query, setQuery] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState<RecordKind | "">(defaultType === "all" ? "" : defaultType);
  const [tab, setTab] = React.useState<"document" | "analysis">("document");
  const [analysisById, setAnalysisById] = React.useState<Record<string, AnalyzeResult>>({});
  const [analysing, setAnalysing] = React.useState(false);
  const [analyseErr, setAnalyseErr] = React.useState<string | null>(null);
  const [chats, setChats] = React.useState<Record<string, ChatMsg[]>>({});
  const [question, setQuestion] = React.useState("");
  const [chatBusy, setChatBusy] = React.useState(false);
  const [chatErr, setChatErr] = React.useState<string | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const uploadCount = React.useRef(0);

  const sel = records.find((r) => r.id === selId) ?? records[0];
  const titleOf = (r: ContractRecord) => (locale === "ar" && r.titleAr ? r.titleAr : r.title);
  const statusLabel = (s: RecordStatus) => t(`ctm.status.${s.replace(/\s/g, "")}` as MessageKey);
  const kindLabel = (k: RecordKind) => t(`ctm.kind.${k}` as MessageKey);
  const analysis = analysisById[selId];
  const chat = chats[selId] ?? [];

  const filtered = records.filter((r) => {
    if (kindFilter && r.kind !== kindFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return r.title.toLowerCase().includes(q) || r.titleAr.includes(query.trim()) ||
      r.counterparty.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q);
  });

  React.useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.length, chatBusy]);

  function selectRecord(id: string) {
    setSelId(id); setTab("document"); setQuestion(""); setChatErr(null); setAnalyseErr(null);
  }

  function onUploaded(text: string) {
    uploadCount.current += 1;
    const id = `up-${Date.now()}`;
    setRecords((cur) => [{
      id, ref: `CT-NEW-${uploadCount.current}`, title: `Uploaded record ${uploadCount.current}`,
      titleAr: `سجل مرفوع ${uploadCount.current}`, kind: "Contract", counterparty: "—", department: "—",
      owner: "You", value: "—", status: "Under Review", date: new Date().toISOString().slice(0, 10), body: text,
    }, ...cur]);
    selectRecord(id);
  }

  async function analyse() {
    if (!sel) return;
    setAnalysing(true); setAnalyseErr(null); setTab("analysis");
    const endpoint = sel.kind === "Contract" ? "/contract-intelligence/analyze" : "/rfp-intelligence/analyze";
    try {
      const r = await apiPost<AnalyzeResult>(endpoint, { text: sel.body, title: sel.title });
      setAnalysisById((m) => ({ ...m, [sel.id]: r }));
    } catch (e) {
      setAnalyseErr(e instanceof ApiRequestError ? e.error.message : t("ctm.chat.error"));
    } finally {
      setAnalysing(false);
    }
  }

  async function ask(qText: string) {
    const text = qText.trim();
    if (!text || chatBusy || !sel) return;
    setChatErr(null); setQuestion("");
    setChats((m) => ({ ...m, [sel.id]: [...(m[sel.id] ?? []), { role: "user", text }] }));
    setChatBusy(true);
    const res = await askDocumentAction(titleOf(sel), sel.body, text, locale);
    if (res.ok) setChats((m) => ({ ...m, [sel.id]: [...(m[sel.id] ?? []), { role: "assistant", text: res.output }] }));
    else setChatErr(res.noCapability ? t("ctm.chat.awaitingCap") : t("ctm.chat.error"));
    setChatBusy(false);
  }

  const SelIcon = sel?.kind === "Tender" ? Gavel : FileSignature;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,22rem)]">
      {/* ── Register ────────────────────────────────────────────────────────── */}
      <aside className="flex flex-col rounded-2xl border border-border bg-card">
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center justify-between">
            <p className="eyebrow">{t("ctm.register")}</p>
            <span className="text-[11px] text-muted-foreground">{t("ctm.count", { n: records.length })}</span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ctm.search")}
              className="h-8 w-full rounded-lg border border-border bg-surface-2 ps-8 pe-2 text-xs outline-none focus:border-primary/50" />
          </div>
          <div className="flex flex-wrap gap-1">
            <Chip active={kindFilter === ""} onClick={() => setKindFilter("")}>{t("ctm.filterAll")}</Chip>
            {(["Contract", "Tender"] as RecordKind[]).map((k) => (
              <Chip key={k} active={kindFilter === k} onClick={() => setKindFilter(k)}>{kindLabel(k)}</Chip>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {filtered.map((r) => {
            const on = r.id === selId;
            const Icon = r.kind === "Tender" ? Gavel : FileSignature;
            return (
              <button key={r.id} onClick={() => selectRecord(r.id)}
                className={cn("mb-1 flex w-full items-start gap-2 rounded-lg p-2 text-start transition-colors", on ? "bg-primary/10" : "hover:bg-surface-2")}>
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", on ? "text-primary" : "text-muted-foreground")} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{titleOf(r)}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{r.counterparty}</span>
                  <span className="mt-1 inline-flex items-center gap-1">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", STATUS_TONE[r.status])}>{statusLabel(r.status)}</span>
                    <span className="text-[9px] tabular text-muted-foreground">{r.ref}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-border p-2"><UploadDocButton onText={onUploaded} label={t("dms.upload")} /></div>
      </aside>

      {/* ── Document / Analysis ─────────────────────────────────────────────── */}
      <section className="flex min-h-[34rem] flex-col rounded-2xl border border-border bg-card">
        {!sel ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{t("ctm.empty")}</div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><SelIcon className="h-5 w-5" /></span>
                <div className="space-y-1">
                  <h2 className="font-display text-base font-semibold leading-tight">{titleOf(sel)}</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="tabular">{sel.ref}</span>
                    <span>· {t("ctm.meta.counterparty")}: {sel.counterparty}</span>
                    <span>· {t("ctm.meta.value")}: {sel.value}</span>
                    {sel.expiry && <span>· {t("ctm.meta.expiry")}: <span className="tabular">{sel.expiry}</span></span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground">{kindLabel(sel.kind)}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[sel.status])}>{statusLabel(sel.status)}</span>
                {sel.status === "Expiring" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger"><AlertTriangle className="h-3 w-3" />{t("ctm.expiringSoon")}</span>
                )}
                <LineageButton
                  icon="sparkles"
                  sourceLabel={t("ai.lin.srcService")}
                  rows={[{ label: t("ai.lin.model"), value: t("ai.lin.modelAtRun") }]}
                  endpoints={["/contract-intelligence/analyze", "/rfp-intelligence/analyze", "/ai-capabilities/{document-chat}/run"]}
                />
                <button onClick={analyse} disabled={analysing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                  {analysing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {analysing ? t("ctm.analysing") : t("ctm.analyse")}
                </button>
              </div>
            </div>

            <div className="flex gap-1 border-b border-border px-4">
              <Tab active={tab === "document"} onClick={() => setTab("document")}>{t("ctm.tab.document")}</Tab>
              <Tab active={tab === "analysis"} onClick={() => setTab("analysis")}>{t("ctm.tab.analysis")}</Tab>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {tab === "document" ? (
                <article className="mx-auto max-w-2xl rounded-lg border border-border bg-surface-2/40 p-6 shadow-sm">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{sel.body}</p>
                </article>
              ) : (
                <div className="space-y-3">
                  {analysing && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("ctm.analysing")}</p>}
                  {analyseErr && !analysing && <p className="text-sm text-danger">{analyseErr}</p>}
                  {!analysing && !analysis && !analyseErr && <p className="text-sm text-muted-foreground">{t("ctm.analysisEmpty")}</p>}
                  {analysis && (
                    <>
                      <AnalysisMetaBar meta={analysis.meta} />
                      <AnalysisView analysis={analysis.analysis} rawText={analysis.meta.raw_text} />
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Ask this record ─────────────────────────────────────────────────── */}
      <aside className="flex min-h-[34rem] flex-col rounded-2xl border border-border bg-card">
        <div className="flex items-start gap-2.5 border-b border-border p-4">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="h-4 w-4" /></span>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold leading-tight">{t("ctm.chat.title")}</h3>
            <p className="text-[11px] text-muted-foreground">{t("ctm.chat.subtitle")}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-auto p-3">
          {chat.length === 0 && !chatBusy && (
            <div className="space-y-2 pt-2">
              {[t("ctm.chat.ex1"), t("ctm.chat.ex2"), t("ctm.chat.ex3")].map((ex) => (
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
          {chatBusy && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("ctm.chat.thinking")}</p>}
          {chatErr && !chatBusy && <p className="text-xs text-danger">{chatErr}</p>}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="flex items-center gap-2 border-t border-border p-3">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} disabled={chatBusy} placeholder={t("ctm.chat.placeholder")}
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

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors", active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{children}</button>;
}
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("border-b-2 px-3 py-2 text-sm font-medium transition-colors", active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{children}</button>;
}

/** Generic renderer for whatever contract/rfp analysis shape the endpoint returns. */
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
