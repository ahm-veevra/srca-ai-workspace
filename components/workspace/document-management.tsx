"use client";

import * as React from "react";
import {
  FileText, FileSignature, FileBarChart, StickyNote, ClipboardList, Gavel, Map as MapIcon,
  Loader2, Lock, MessageSquare, Search, SendHorizontal, Sparkles, type LucideIcon,
} from "lucide-react";

import { askDocumentAction } from "@/app/(portal)/document-intelligence/dms-actions";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { LineageButton } from "@/components/ai-intelligence/lineage-button";
import { MarkdownView } from "@/components/ui/markdown";
import { UploadDocButton } from "@/components/workspace/upload-doc-button";
import { DMS_DOCUMENTS, type DmsDocument, type DocType } from "@/lib/dms-sample";
import { apiPost, ApiRequestError } from "@/lib/api-client";
import { useLocale, useT } from "@/lib/i18n";
import { type MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<DocType, LucideIcon> = {
  Policy: FileText, Contract: FileSignature, Report: FileBarChart, Memo: StickyNote,
  Protocol: ClipboardList, Tender: Gavel, Plan: MapIcon,
};
const CLASS_TONE: Record<string, string> = {
  Public: "bg-muted text-muted-foreground",
  Internal: "bg-info/10 text-info",
  Confidential: "bg-warning/10 text-warning",
  Restricted: "bg-danger/10 text-danger",
};

interface ChatMsg { role: "user" | "assistant"; text: string; model?: string }
interface AnalyzeResult { analysis: Record<string, unknown>; meta: AnalysisMeta }

const prettify = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function DocumentManagement() {
  const t = useT();
  const { locale } = useLocale();
  const [docs, setDocs] = React.useState<DmsDocument[]>(DMS_DOCUMENTS);
  const [selId, setSelId] = React.useState<string>(DMS_DOCUMENTS[0].id);
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<DocType | "">("");
  const [tab, setTab] = React.useState<"viewer" | "analysis">("viewer");
  const [analysisById, setAnalysisById] = React.useState<Record<string, AnalyzeResult>>({});
  const [analysing, setAnalysing] = React.useState(false);
  const [analyseErr, setAnalyseErr] = React.useState<string | null>(null);
  const [chats, setChats] = React.useState<Record<string, ChatMsg[]>>({});
  const [question, setQuestion] = React.useState("");
  const [chatBusy, setChatBusy] = React.useState(false);
  const [chatErr, setChatErr] = React.useState<string | null>(null);
  const uploadCount = React.useRef(0);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const sel = docs.find((d) => d.id === selId) ?? docs[0];
  const titleOf = (d: DmsDocument) => (locale === "ar" && d.titleAr ? d.titleAr : d.title);
  const typeLabel = (ty: DocType) => t(`dms.type.${ty}` as MessageKey);
  const classLabel = (c: string) => t(`dms.class.${c}` as MessageKey);

  const filtered = docs.filter((d) => {
    if (typeFilter && d.type !== typeFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return d.title.toLowerCase().includes(q) || d.titleAr.includes(query.trim()) ||
      d.owner.toLowerCase().includes(q) || d.department.toLowerCase().includes(q) || d.id.toLowerCase().includes(q);
  });

  const chat = chats[selId] ?? [];
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, chatBusy]);

  function selectDoc(id: string) {
    setSelId(id);
    setTab("viewer");
    setQuestion("");
    setChatErr(null);
    setAnalyseErr(null);
  }

  function onUploaded(text: string) {
    uploadCount.current += 1;
    const id = `UP-${Date.now()}`;
    const doc: DmsDocument = {
      id,
      title: `Uploaded document ${uploadCount.current}`,
      titleAr: `مستند مرفوع ${uploadCount.current}`,
      type: "Report",
      department: "—",
      owner: "You",
      date: new Date().toISOString().slice(0, 10),
      classification: "Internal",
      sizeKb: Math.max(1, Math.round(text.length / 1024)),
      pages: Math.max(1, Math.round(text.length / 2200)),
      body: text,
    };
    setDocs((d) => [doc, ...d]);
    selectDoc(id);
  }

  async function analyse() {
    if (!sel) return;
    setAnalysing(true);
    setAnalyseErr(null);
    setTab("analysis");
    try {
      const r = await apiPost<AnalyzeResult>("/document-intelligence/analyze", { text: sel.body, title: sel.title });
      setAnalysisById((m) => ({ ...m, [sel.id]: r }));
    } catch (e) {
      setAnalyseErr(e instanceof ApiRequestError ? e.error.message : t("dms.chat.error"));
    } finally {
      setAnalysing(false);
    }
  }

  async function ask(qText: string) {
    const text = qText.trim();
    if (!text || chatBusy || !sel) return;
    setChatErr(null);
    setQuestion("");
    setChats((m) => ({ ...m, [sel.id]: [...(m[sel.id] ?? []), { role: "user", text }] }));
    setChatBusy(true);
    const res = await askDocumentAction(titleOf(sel), sel.body, text, locale);
    if (res.ok) {
      setChats((m) => ({ ...m, [sel.id]: [...(m[sel.id] ?? []), { role: "assistant", text: res.output, model: res.model }] }));
    } else {
      setChatErr(res.noCapability ? t("dms.chat.awaitingCap") : t("dms.chat.error"));
    }
    setChatBusy(false);
  }

  const SelIcon = sel ? TYPE_ICON[sel.type] : FileText;
  const analysis = analysisById[sel?.id ?? ""];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_minmax(0,22rem)]">
      {/* ── Library ─────────────────────────────────────────────────────────── */}
      <aside className="flex flex-col rounded-2xl border border-border bg-card">
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center justify-between">
            <p className="eyebrow">{t("dms.library")}</p>
            <span className="text-[11px] text-muted-foreground">{t("dms.count", { n: docs.length })}</span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("dms.search")}
              className="h-8 w-full rounded-lg border border-border bg-surface-2 ps-8 pe-2 text-xs outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <FilterChip active={typeFilter === ""} onClick={() => setTypeFilter("")}>{t("dms.filterAll")}</FilterChip>
            {(["Contract", "Report", "Protocol", "Tender", "Policy", "Memo", "Plan"] as DocType[]).map((ty) => (
              <FilterChip key={ty} active={typeFilter === ty} onClick={() => setTypeFilter(ty)}>{typeLabel(ty)}</FilterChip>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {filtered.map((d) => {
            const Icon = TYPE_ICON[d.type];
            const on = d.id === selId;
            return (
              <button
                key={d.id}
                onClick={() => selectDoc(d.id)}
                className={cn(
                  "mb-1 flex w-full items-start gap-2 rounded-lg p-2 text-start transition-colors",
                  on ? "bg-primary/10" : "hover:bg-surface-2",
                )}
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", on ? "text-primary" : "text-muted-foreground")} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{titleOf(d)}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>{typeLabel(d.type)}</span>·<span className="tabular">{d.date}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-border p-2">
          <UploadDocButton onText={onUploaded} label={t("dms.upload")} />
        </div>
      </aside>

      {/* ── Viewer / Analysis ───────────────────────────────────────────────── */}
      <section className="flex min-h-[32rem] flex-col rounded-2xl border border-border bg-card">
        {!sel ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{t("dms.empty")}</div>
        ) : (
          <>
            {/* Record header */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <SelIcon className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <h2 className="font-display text-base font-semibold leading-tight">{titleOf(sel)}</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="tabular">{sel.id}</span>
                    <span>· {t("dms.meta.department")}: {sel.department}</span>
                    <span>· {t("dms.meta.owner")}: {sel.owner}</span>
                    <span>· {t("dms.meta.date")}: <span className="tabular">{sel.date}</span></span>
                    <span>· {t("dms.meta.pages")}: <span className="tabular">{sel.pages}</span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", CLASS_TONE[sel.classification])}>
                  <Lock className="h-3 w-3" /> {classLabel(sel.classification)}
                </span>
                <LineageButton
                  icon="sparkles"
                  sourceLabel={t("ai.lin.srcService")}
                  rows={[{ label: t("ai.lin.model"), value: t("ai.lin.modelAtRun") }]}
                  endpoints={["/document-intelligence/analyze", "/documents", "/ai-capabilities/{document-chat}/run"]}
                />
                <button
                  onClick={analyse}
                  disabled={analysing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {analysing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {analysing ? t("dms.analysing") : t("dms.analyse")}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border px-4">
              <TabBtn active={tab === "viewer"} onClick={() => setTab("viewer")}>{t("dms.viewerTab")}</TabBtn>
              <TabBtn active={tab === "analysis"} onClick={() => setTab("analysis")}>{t("dms.analysisTab")}</TabBtn>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {tab === "viewer" ? (
                // Paper-like document viewer
                <article className="mx-auto max-w-2xl rounded-lg border border-border bg-surface-2/40 p-6 shadow-sm">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{sel.body}</p>
                </article>
              ) : (
                <div className="space-y-3">
                  {analysing && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("dms.analysing")}</p>}
                  {analyseErr && !analysing && <p className="text-sm text-danger">{analyseErr}</p>}
                  {!analysing && !analysis && !analyseErr && (
                    <p className="text-sm text-muted-foreground">{t("dms.analysisEmpty")}</p>
                  )}
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

      {/* ── Talk to this document ───────────────────────────────────────────── */}
      <aside className="flex min-h-[32rem] flex-col rounded-2xl border border-border bg-card">
        <div className="flex items-start gap-2.5 border-b border-border p-4">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </span>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold leading-tight">{t("dms.chat.title")}</h3>
            <p className="text-[11px] text-muted-foreground">{t("dms.chat.subtitle")}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-auto p-3">
          {chat.length === 0 && !chatBusy && (
            <div className="space-y-2 pt-2">
              {[t("dms.chat.ex1"), t("dms.chat.ex2"), t("dms.chat.ex3")].map((ex) => (
                <button
                  key={ex}
                  onClick={() => ask(ex)}
                  className="block w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-start text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-surface-2 text-foreground",
                )}
              >
                {m.role === "assistant" ? <MarkdownView content={m.text} /> : <p className="whitespace-pre-wrap">{m.text}</p>}
              </div>
            </div>
          ))}
          {chatBusy && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("dms.chat.thinking")}</p>
          )}
          {chatErr && !chatBusy && <p className="text-xs text-danger">{chatErr}</p>}
          <div ref={chatEndRef} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); ask(question); }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={chatBusy}
            placeholder={t("dms.chat.placeholder")}
            className="h-10 flex-1 rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary/50 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={chatBusy || !question.trim()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            aria-label={t("dms.chat.send")}
          >
            {chatBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4 rtl:-scale-x-100" />}
          </button>
        </form>
      </aside>
    </div>
  );
}

/* ── little pieces ──────────────────────────────────────────────────────────── */

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Generic renderer for whatever `analysis` shape /document-intelligence/analyze returns. */
function AnalysisView({ analysis, rawText }: { analysis: Record<string, unknown>; rawText?: string | null }) {
  const entries = Object.entries(analysis).filter(([, v]) => v != null && v !== "");
  if (entries.length === 0) {
    return rawText ? <p className="whitespace-pre-wrap text-sm">{rawText}</p> : null;
  }
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
  if (typeof value === "string" || typeof value === "number") {
    return <p className="text-sm leading-relaxed text-foreground">{String(value)}</p>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>{typeof item === "object" && item ? Object.values(item as Record<string, unknown>).filter((v) => typeof v === "string").join(" — ") : String(item)}</span>
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
