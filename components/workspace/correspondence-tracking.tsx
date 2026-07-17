"use client";

import * as React from "react";
import {
  ArrowDownLeft, ArrowUpRight, Check, Copy, Loader2, Mail, MessageSquare, PenLine,
  Search, SendHorizontal, Sparkles,
} from "lucide-react";

import { askDocumentAction } from "@/app/(portal)/document-intelligence/dms-actions";
import { generateReplyAction } from "@/app/(portal)/correspondence-intelligence/corr-actions";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { LineageButton } from "@/components/ai-intelligence/lineage-button";
import { LetterView } from "@/components/workspace/letter-view";
import { MarkdownView } from "@/components/ui/markdown";
import { UploadDocButton } from "@/components/workspace/upload-doc-button";
import { CORRESPONDENCE, type Correspondence, type CorrStatus } from "@/lib/correspondence-sample";
import { apiPost, ApiRequestError } from "@/lib/api-client";
import { useLocale, useT } from "@/lib/i18n";
import { type MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

interface Analysis {
  letter_type?: string; department?: string; priority?: string;
  summary?: string; key_points?: string[]; suggested_response?: string;
}
interface AnalyzeResult { analysis: Analysis; meta: AnalysisMeta }
interface ChatMsg { role: "user" | "assistant"; text: string }

const STATUS_TONE: Record<CorrStatus, string> = {
  New: "bg-info/10 text-info",
  "In Review": "bg-warning/10 text-warning",
  Routed: "bg-primary/10 text-primary",
  Replied: "bg-success/10 text-success",
  Closed: "bg-muted text-muted-foreground",
};
const PRI_DOT: Record<string, string> = { High: "bg-danger", Medium: "bg-warning", Low: "bg-success" };

// Fixed reply intents — the user's chosen instruction (English; the capability answers in locale).
const INTENTS: { key: string; instruction: string }[] = [
  { key: "acknowledge", instruction: "Draft a formal reply acknowledging receipt and confirming the matter is being handled." },
  { key: "coordinate", instruction: "Draft a formal reply confirming SRCA will coordinate on this matter and proposing clear next steps." },
  { key: "info", instruction: "Draft a formal reply requesting the additional information SRCA needs to proceed." },
  { key: "approve", instruction: "Draft a formal reply approving the request and stating what happens next." },
  { key: "decline", instruction: "Draft a formal reply politely declining, with a brief and courteous reason." },
  { key: "thanks", instruction: "Draft a warm, formal reply thanking the sender." },
];

export function CorrespondenceTracking() {
  const t = useT();
  const { locale } = useLocale();
  const [items, setItems] = React.useState<Correspondence[]>(CORRESPONDENCE);
  const [selId, setSelId] = React.useState<string>(CORRESPONDENCE[0].id);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<CorrStatus | "">("");
  const [tab, setTab] = React.useState<"letter" | "analysis" | "reply">("letter");

  const [analysisById, setAnalysisById] = React.useState<Record<string, AnalyzeResult>>({});
  const [analysing, setAnalysing] = React.useState(false);
  const [analyseErr, setAnalyseErr] = React.useState<string | null>(null);

  const [intent, setIntent] = React.useState<string>("acknowledge");
  const [custom, setCustom] = React.useState("");
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [drafting, setDrafting] = React.useState(false);
  const [replyErr, setReplyErr] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [replyPreview, setReplyPreview] = React.useState(false);

  const [chats, setChats] = React.useState<Record<string, ChatMsg[]>>({});
  const [question, setQuestion] = React.useState("");
  const [chatBusy, setChatBusy] = React.useState(false);
  const [chatErr, setChatErr] = React.useState<string | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const uploadCount = React.useRef(0);

  const sel = items.find((c) => c.id === selId) ?? items[0];
  const subjectOf = (c: Correspondence) => (locale === "ar" && c.subjectAr ? c.subjectAr : c.subject);
  const statusLabel = (s: CorrStatus) => t(`corr.status.${s.replace(/\s/g, "")}` as MessageKey);
  const priLabel = (p: string) => t(`corr.pri.${p}` as MessageKey);
  const dirLabel = (d: string) => t(`corr.dir.${d}` as MessageKey);

  const filtered = items.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.subject.toLowerCase().includes(q) || c.subjectAr.includes(query.trim()) ||
      c.from.toLowerCase().includes(q) || c.ref.toLowerCase().includes(q);
  });

  const chat = chats[selId] ?? [];
  const draft = drafts[selId] ?? "";
  const analysis = analysisById[selId];

  React.useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.length, chatBusy]);

  function selectItem(id: string) {
    setSelId(id); setTab("letter"); setQuestion(""); setChatErr(null); setAnalyseErr(null); setReplyErr(null); setCopied(false); setReplyPreview(false);
  }

  function onUploaded(text: string) {
    uploadCount.current += 1;
    const id = `up-${Date.now()}`;
    setItems((cur) => [{
      id, ref: `CORR-NEW-${uploadCount.current}`, subject: `Uploaded letter ${uploadCount.current}`,
      subjectAr: `خطاب مرفوع ${uploadCount.current}`, from: "—", to: "SRCA", direction: "Incoming",
      status: "New", priority: "Medium", channel: "Letter", date: new Date().toISOString().slice(0, 10),
      lang: /[؀-ۿ]/.test(text) ? "ar" : "en", body: text,
    }, ...cur]);
    selectItem(id);
  }

  async function analyse() {
    if (!sel) return;
    setAnalysing(true); setAnalyseErr(null); setTab("analysis");
    try {
      // The analyze endpoint takes no language field and defaults to English; append an explicit
      // output-language instruction so the triage values come back in the user's locale.
      const langHint = locale === "ar"
        ? "\n\n(تعليمات للمخرجات: اكتب قيم جميع الحقول باللغة العربية.)"
        : "\n\n(Output instruction: write all field values in English.)";
      const r = await apiPost<AnalyzeResult>("/correspondence-intelligence/analyze", { text: sel.body + langHint, title: sel.subject });
      setAnalysisById((m) => ({ ...m, [sel.id]: r }));
    } catch (e) {
      setAnalyseErr(e instanceof ApiRequestError ? e.error.message : t("corr.reply.error"));
    } finally {
      setAnalysing(false);
    }
  }

  async function generate() {
    if (!sel || drafting) return;
    const instruction = intent === "custom" ? custom.trim() : INTENTS.find((i) => i.key === intent)?.instruction ?? "";
    if (!instruction) return;
    setDrafting(true); setReplyErr(null); setTab("reply"); setCopied(false);
    // Reply in the LETTER's language (an Arabic official letter gets an Arabic reply), not the UI locale.
    const res = await generateReplyAction(subjectOf(sel), sel.body, instruction, sel.lang);
    if (res.ok) setDrafts((m) => ({ ...m, [sel.id]: res.output }));
    else setReplyErr(res.noCapability ? t("corr.reply.awaitingCap") : t("corr.reply.error"));
    setDrafting(false);
  }

  function useAsDraft() {
    if (!sel || !analysis?.analysis.suggested_response) return;
    setDrafts((m) => ({ ...m, [sel.id]: analysis.analysis.suggested_response! }));
    setTab("reply");
  }

  function copyDraft() {
    if (!draft) return;
    navigator.clipboard?.writeText(draft).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); });
  }

  async function ask(qText: string) {
    const text = qText.trim();
    if (!text || chatBusy || !sel) return;
    setChatErr(null); setQuestion("");
    setChats((m) => ({ ...m, [sel.id]: [...(m[sel.id] ?? []), { role: "user", text }] }));
    setChatBusy(true);
    const res = await askDocumentAction(subjectOf(sel), sel.body, text, locale);
    if (res.ok) setChats((m) => ({ ...m, [sel.id]: [...(m[sel.id] ?? []), { role: "assistant", text: res.output }] }));
    else setChatErr(res.noCapability ? t("corr.chat.awaitingCap") : t("corr.chat.error"));
    setChatBusy(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,22rem)]">
      {/* ── Register ────────────────────────────────────────────────────────── */}
      <aside className="flex flex-col rounded-2xl border border-border bg-card">
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center justify-between">
            <p className="eyebrow">{t("corr.register")}</p>
            <span className="text-[11px] text-muted-foreground">{t("corr.count", { n: items.length })}</span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("corr.search")}
              className="h-8 w-full rounded-lg border border-border bg-surface-2 ps-8 pe-2 text-xs outline-none focus:border-primary/50" />
          </div>
          <div className="flex flex-wrap gap-1">
            <Chip active={statusFilter === ""} onClick={() => setStatusFilter("")}>{t("corr.filterAll")}</Chip>
            {(["New", "In Review", "Routed", "Replied", "Closed"] as CorrStatus[]).map((s) => (
              <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{statusLabel(s)}</Chip>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {filtered.map((c) => {
            const on = c.id === selId;
            const Dir = c.direction === "Incoming" ? ArrowDownLeft : ArrowUpRight;
            return (
              <button key={c.id} onClick={() => selectItem(c.id)}
                className={cn("mb-1 flex w-full items-start gap-2 rounded-lg p-2 text-start transition-colors", on ? "bg-primary/10" : "hover:bg-surface-2")}>
                <span className={cn("mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full", PRI_DOT[c.priority])} title={priLabel(c.priority)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{subjectOf(c)}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Dir className="h-3 w-3" /><span className="truncate">{c.from}</span>
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", STATUS_TONE[c.status])}>{statusLabel(c.status)}</span>
                    <span className="text-[9px] tabular text-muted-foreground">{c.ref}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-border p-2"><UploadDocButton onText={onUploaded} label={t("dms.upload")} /></div>
      </aside>

      {/* ── Letter / Triage / Reply ─────────────────────────────────────────── */}
      <section className="flex min-h-[34rem] flex-col rounded-2xl border border-border bg-card">
        {!sel ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{t("corr.empty")}</div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="h-5 w-5" /></span>
                <div className="space-y-1">
                  <h2 className="font-display text-base font-semibold leading-tight">{subjectOf(sel)}</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="tabular">{sel.ref}</span>
                    <span>· {t("corr.meta.from")}: {sel.from}</span>
                    <span>· {t("corr.meta.to")}: {sel.to}</span>
                    <span>· {t("corr.meta.date")}: <span className="tabular">{sel.date}</span></span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[sel.status])}>{statusLabel(sel.status)}</span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground">{dirLabel(sel.direction)}</span>
                <LineageButton
                  icon="sparkles"
                  sourceLabel={t("ai.lin.srcService")}
                  rows={[{ label: t("ai.lin.model"), value: t("ai.lin.modelAtRun") }]}
                  endpoints={["/correspondence-intelligence/analyze", "/ai-capabilities/{reply-draft}/run", "/ai-capabilities/{document-chat}/run"]}
                />
                <button onClick={analyse} disabled={analysing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-surface-2 disabled:opacity-50">
                  {analysing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{t("corr.analyse")}
                </button>
              </div>
            </div>

            <div className="flex gap-1 border-b border-border px-4">
              <Tab active={tab === "letter"} onClick={() => setTab("letter")}>{t("corr.tab.letter")}</Tab>
              <Tab active={tab === "analysis"} onClick={() => setTab("analysis")}>{t("corr.tab.analysis")}</Tab>
              <Tab active={tab === "reply"} onClick={() => setTab("reply")}>{t("corr.tab.reply")}</Tab>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {tab === "letter" && <LetterView item={sel} />}

              {tab === "analysis" && (
                <div className="space-y-3">
                  {analysing && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("corr.analysing")}</p>}
                  {analyseErr && !analysing && <p className="text-sm text-danger">{analyseErr}</p>}
                  {!analysing && !analysis && !analyseErr && <p className="text-sm text-muted-foreground">{t("corr.analysisEmpty")}</p>}
                  {analysis && (
                    <>
                      <AnalysisMetaBar meta={analysis.meta} />
                      <div className="grid gap-2 sm:grid-cols-3">
                        {analysis.analysis.letter_type && <Kv label={t("corr.an.letterType")} value={analysis.analysis.letter_type} />}
                        {analysis.analysis.department && <Kv label={t("corr.an.department")} value={analysis.analysis.department} />}
                        {analysis.analysis.priority && <Kv label={t("corr.an.priority")} value={analysis.analysis.priority} />}
                      </div>
                      {analysis.analysis.summary && <Block title={t("corr.an.summary")}><p className="text-sm">{analysis.analysis.summary}</p></Block>}
                      {analysis.analysis.key_points && analysis.analysis.key_points.length > 0 && (
                        <Block title={t("corr.an.keyPoints")}>
                          <ul className="space-y-1">{analysis.analysis.key_points.map((k, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />{k}</li>
                          ))}</ul>
                        </Block>
                      )}
                      {analysis.analysis.suggested_response && (
                        <Block title={t("corr.an.suggestedResponse")}>
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{analysis.analysis.suggested_response}</p>
                          <button onClick={useAsDraft} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-2">
                            <PenLine className="h-3.5 w-3.5" /> {t("corr.an.useAsDraft")}
                          </button>
                        </Block>
                      )}
                    </>
                  )}
                </div>
              )}

              {tab === "reply" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{t("corr.reply.intent")}:</span>
                    {INTENTS.map((it) => (
                      <Chip key={it.key} active={intent === it.key} onClick={() => setIntent(it.key)}>{t(`corr.intent.${it.key}` as MessageKey)}</Chip>
                    ))}
                    <Chip active={intent === "custom"} onClick={() => setIntent("custom")}>{t("corr.intent.custom")}</Chip>
                  </div>
                  {intent === "custom" && (
                    <textarea value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={t("corr.reply.customPlaceholder")}
                      className="h-16 w-full resize-y rounded-lg border border-border bg-surface-2 p-2 text-sm outline-none focus:border-primary/50" />
                  )}
                  <button onClick={generate} disabled={drafting || (intent === "custom" && !custom.trim())}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                    {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
                    {drafting ? t("corr.reply.generating") : t("corr.reply.generate")}
                  </button>
                  {replyErr && !drafting && <p className="text-sm text-danger">{replyErr}</p>}
                  {draft ? (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        <Chip active={!replyPreview} onClick={() => setReplyPreview(false)}>{t("corr.reply.edit")}</Chip>
                        <Chip active={replyPreview} onClick={() => setReplyPreview(true)}>{t("corr.reply.preview")}</Chip>
                      </div>
                      {replyPreview ? (
                        <LetterView item={srcaReplyItem(sel)} bodyOverride={draft} plainBody />
                      ) : (
                        <textarea value={draft} onChange={(e) => setDrafts((m) => ({ ...m, [sel.id]: e.target.value }))}
                          className="min-h-[16rem] w-full resize-y rounded-lg border border-border bg-surface-2/40 p-4 text-sm leading-relaxed outline-none focus:border-primary/50" />
                      )}
                      <div className="flex gap-2">
                        <button onClick={copyDraft} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2">
                          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />} {copied ? t("corr.reply.copied") : t("corr.reply.copy")}
                        </button>
                        <button onClick={generate} disabled={drafting} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-50">
                          <Sparkles className="h-3.5 w-3.5" /> {t("corr.reply.regenerate")}
                        </button>
                      </div>
                    </div>
                  ) : (!drafting && !replyErr && <p className="text-sm text-muted-foreground">{t("corr.reply.empty")}</p>)}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Ask this letter ─────────────────────────────────────────────────── */}
      <aside className="flex min-h-[34rem] flex-col rounded-2xl border border-border bg-card">
        <div className="flex items-start gap-2.5 border-b border-border p-4">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="h-4 w-4" /></span>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold leading-tight">{t("corr.chat.title")}</h3>
            <p className="text-[11px] text-muted-foreground">{t("corr.chat.subtitle")}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-auto p-3">
          {chat.length === 0 && !chatBusy && (
            <div className="space-y-2 pt-2">
              {[t("corr.chat.ex1"), t("corr.chat.ex2"), t("corr.chat.ex3")].map((ex) => (
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
          {chatBusy && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("corr.chat.thinking")}</p>}
          {chatErr && !chatBusy && <p className="text-xs text-danger">{chatErr}</p>}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="flex items-center gap-2 border-t border-border p-3">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} disabled={chatBusy} placeholder={t("corr.chat.placeholder")}
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

/** Build an SRCA outgoing-letter shell for previewing a reply draft on official letterhead.
 *  The AI draft already contains its own greeting/closing, so the viewer renders it with `plainBody`. */
function srcaReplyItem(sel: Correspondence): Correspondence {
  const ar = sel.lang === "ar";
  return {
    ...sel,
    ref: `${sel.ref}-R`,
    from: ar ? "هيئة الهلال الأحمر السعودي" : "Saudi Red Crescent Authority",
    to: sel.from,
    direction: "Outgoing",
    official: {
      entity: ar ? "هيئة الهلال الأحمر السعودي" : "Saudi Red Crescent Authority",
      department: ar ? "الإدارة العامة للاتصال المؤسسي" : "Office of the Secretary General",
      hijri: sel.official?.hijri,
      recipient: sel.from,
      signatory: ar ? "الإدارة المختصة" : "For the Saudi Red Crescent Authority",
      signatoryTitle: ar ? "هيئة الهلال الأحمر السعودي" : "Saudi Red Crescent Authority",
      seal: "crescent",
    },
  };
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors", active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{children}</button>
  );
}
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("border-b-2 px-3 py-2 text-sm font-medium transition-colors", active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{children}</button>
  );
}
function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium capitalize">{value}</p>
    </div>
  );
}
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
