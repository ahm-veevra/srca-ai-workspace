"use client";

import * as React from "react";
import {
  Languages, Loader2, MessageSquare, Mic, Phone, PhoneCall, Play, Search,
  SendHorizontal, ShieldAlert, Sparkles,
} from "lucide-react";

import { askDocumentAction } from "@/app/(portal)/document-intelligence/dms-actions";
import { triageTranscriptAction } from "@/app/(portal)/ai-intelligence/actions";
import { LineageButton } from "@/components/ai-intelligence/lineage-button";
import { MarkdownView } from "@/components/ui/markdown";
import { CALLS, type CallRecord, type CallPriority, type CallStatus } from "@/lib/call-sample";
import { apiPost, apiUpload, ApiRequestError } from "@/lib/api-client";
import { useLocale, useT } from "@/lib/i18n";
import { type MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

interface ChatMsg { role: "user" | "assistant"; text: string }
interface TranscribeResult { text: string }
interface TranslateResult { translation: string; target_language: string }

const STATUS_TONE: Record<CallStatus, string> = {
  Dispatched: "bg-primary/10 text-primary",
  Resolved: "bg-success/10 text-success",
  Transferred: "bg-info/10 text-info",
  Dropped: "bg-muted text-muted-foreground",
};
const PRI_DOT: Record<CallPriority, string> = { Critical: "bg-danger", Urgent: "bg-warning", Routine: "bg-success" };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function CallCenter() {
  const t = useT();
  const { locale } = useLocale();
  const [selId, setSelId] = React.useState<string>(CALLS[0].id);
  const [query, setQuery] = React.useState("");
  const [priFilter, setPriFilter] = React.useState<CallPriority | "">("");
  const [tab, setTab] = React.useState<"transcript" | "translation" | "assessment">("transcript");

  const [transcripts, setTranscripts] = React.useState<Record<string, string>>({});
  const [transcribing, setTranscribing] = React.useState(false);
  const [transcribeErr, setTranscribeErr] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLInputElement>(null);

  const [target, setTarget] = React.useState("English");
  const [translations, setTranslations] = React.useState<Record<string, string>>({});
  const [translating, setTranslating] = React.useState(false);
  const [translateErr, setTranslateErr] = React.useState<string | null>(null);

  const [assessments, setAssessments] = React.useState<Record<string, string>>({});
  const [assessing, setAssessing] = React.useState(false);
  const [assessErr, setAssessErr] = React.useState<string | null>(null);

  const [chats, setChats] = React.useState<Record<string, ChatMsg[]>>({});
  const [question, setQuestion] = React.useState("");
  const [chatBusy, setChatBusy] = React.useState(false);
  const [chatErr, setChatErr] = React.useState<string | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const sel = CALLS.find((c) => c.id === selId) ?? CALLS[0];
  const transcript = transcripts[selId] ?? sel.transcript;
  const translation = translations[selId];
  const assessment = assessments[selId];
  const chat = chats[selId] ?? [];
  const catOf = (c: CallRecord) => (locale === "ar" ? c.categoryAr : c.category);
  const regionOf = (c: CallRecord) => (locale === "ar" ? c.regionAr : c.region);
  const priLabel = (p: CallPriority) => t(`call.pri.${p}` as MessageKey);
  const statusLabel = (s: CallStatus) => t(`call.status.${s}` as MessageKey);

  const filtered = CALLS.filter((c) => {
    if (priFilter && c.priority !== priFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.category.toLowerCase().includes(q) || c.categoryAr.includes(query.trim()) ||
      c.region.toLowerCase().includes(q) || c.number.includes(query.trim()) || c.agent.toLowerCase().includes(q);
  });

  React.useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.length, chatBusy]);

  function selectCall(id: string) {
    setSelId(id); setTab("transcript"); setQuestion("");
    setChatErr(null); setTranscribeErr(null); setTranslateErr(null); setAssessErr(null);
    const c = CALLS.find((x) => x.id === id);
    setTarget(c?.lang === "ar" ? "English" : "Arabic");
  }

  async function onAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setTranscribing(true); setTranscribeErr(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await apiUpload<TranscribeResult>("/transcription/transcribe", form);
      const text = (r.text ?? "").trim();
      if (text) setTranscripts((m) => ({ ...m, [selId]: text }));
      else setTranscribeErr(t("call.transcribeErr"));
    } catch {
      setTranscribeErr(t("call.transcribeErr"));
    } finally {
      setTranscribing(false);
    }
  }

  async function translate() {
    if (translating || !transcript.trim()) return;
    setTranslating(true); setTranslateErr(null); setTab("translation");
    try {
      const r = await apiPost<TranslateResult>("/document-intelligence/translate", { text: transcript, target_language: target });
      const out = (r.translation ?? "").trim();
      if (out) setTranslations((m) => ({ ...m, [selId]: out }));
      else setTranslateErr(t("call.translate.err"));
    } catch (e) {
      setTranslateErr(e instanceof ApiRequestError ? e.error.message : t("call.translate.err"));
    } finally {
      setTranslating(false);
    }
  }

  async function assess() {
    if (assessing || !transcript.trim()) return;
    setAssessing(true); setAssessErr(null); setTab("assessment");
    const res = await triageTranscriptAction(transcript, locale);
    if (res.ok) setAssessments((m) => ({ ...m, [selId]: res.output }));
    else setAssessErr(res.noCapability ? t("call.assess.awaitingCap") : t("call.assess.err"));
    setAssessing(false);
  }

  async function ask(qText: string) {
    const text = qText.trim();
    if (!text || chatBusy) return;
    setChatErr(null); setQuestion("");
    setChats((m) => ({ ...m, [selId]: [...(m[selId] ?? []), { role: "user", text }] }));
    setChatBusy(true);
    const res = await askDocumentAction(catOf(sel), transcript, text, locale);
    if (res.ok) setChats((m) => ({ ...m, [selId]: [...(m[selId] ?? []), { role: "assistant", text: res.output }] }));
    else setChatErr(res.noCapability ? t("call.chat.awaitingCap") : t("call.chat.error"));
    setChatBusy(false);
  }

  return (
    <div className="space-y-4">
      {/* ── Live metrics strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<PhoneCall className="h-4 w-4" />} label={t("call.metrics.today")} value="1,284" tone="text-primary" />
        <Stat icon={<Loader2 className="h-4 w-4" />} label={t("call.metrics.aht")} value="3:12" tone="text-info" />
        <Stat icon={<ShieldAlert className="h-4 w-4" />} label={t("call.metrics.sla")} value="94.2%" tone="text-success" />
        <Stat icon={<Languages className="h-4 w-4" />} label={t("call.metrics.langs")} value="AR · EN" tone="text-warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,22rem)]">
        {/* ── Recorded calls ────────────────────────────────────────────────── */}
        <aside className="flex flex-col rounded-2xl border border-border bg-card">
          <div className="space-y-2 border-b border-border p-3">
            <div className="flex items-center justify-between">
              <p className="eyebrow">{t("call.register")}</p>
              <span className="text-[11px] text-muted-foreground">{t("call.count", { n: CALLS.length })}</span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("call.search")}
                className="h-8 w-full rounded-lg border border-border bg-surface-2 ps-8 pe-2 text-xs outline-none focus:border-primary/50" />
            </div>
            <div className="flex flex-wrap gap-1">
              <Chip active={priFilter === ""} onClick={() => setPriFilter("")}>{t("call.filterAll")}</Chip>
              {(["Critical", "Urgent", "Routine"] as CallPriority[]).map((p) => (
                <Chip key={p} active={priFilter === p} onClick={() => setPriFilter(p)}>{priLabel(p)}</Chip>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {filtered.map((c) => {
              const on = c.id === selId;
              return (
                <button key={c.id} onClick={() => selectCall(c.id)}
                  className={cn("mb-1 flex w-full items-start gap-2 rounded-lg p-2 text-start transition-colors", on ? "bg-primary/10" : "hover:bg-surface-2")}>
                  <span className={cn("mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full", PRI_DOT[c.priority])} title={priLabel(c.priority)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">{catOf(c)}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Phone className="h-3 w-3" /><span className="tabular" dir="ltr">{c.number}</span>
                      <span>· {regionOf(c)}</span>
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1">
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", STATUS_TONE[c.status])}>{statusLabel(c.status)}</span>
                      <span className="text-[9px] tabular text-muted-foreground">{c.time} · {fmt(c.durationSec)}</span>
                      <span className="rounded bg-surface-3 px-1 text-[8px] font-semibold uppercase text-muted-foreground">{c.lang}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Recording + transcript / translation / assessment ─────────────── */}
        <section className="flex min-h-[34rem] flex-col rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><PhoneCall className="h-5 w-5" /></span>
              <div className="space-y-1">
                <h2 className="font-display text-base font-semibold leading-tight">{catOf(sel)}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="tabular" dir="ltr">{sel.number}</span>
                  <span>· {t("call.meta.region")}: {regionOf(sel)}</span>
                  <span>· {t("call.meta.agent")}: {sel.agent}</span>
                  <span>· {t("call.meta.time")}: <span className="tabular">{sel.date} {sel.time}</span></span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[sel.status])}>{statusLabel(sel.status)}</span>
              <LineageButton
                icon="phone"
                sourceLabel={t("ai.lin.srcService")}
                rows={[{ label: t("ai.lin.model"), value: t("ai.lin.modelAtRun") }]}
                endpoints={["/transcription/transcribe", "/document-intelligence/translate", "/ai-capabilities/{triage}/run", "/ai-capabilities/{document-chat}/run"]}
              />
            </div>
          </div>

          {/* Recording player (visual) */}
          <div className="flex items-center gap-3 border-b border-border bg-surface-2/40 px-4 py-3">
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label={t("call.rec.play")}>
              <Play className="h-4 w-4 rtl:-scale-x-100" />
            </button>
            <div className="flex flex-1 items-center gap-0.5" aria-hidden>
              {Array.from({ length: 44 }).map((_, i) => (
                <span key={i} className="w-full rounded-full bg-primary/30"
                  style={{ height: `${6 + Math.abs(Math.sin(i * 1.7)) * 20}px` }} />
              ))}
            </div>
            <span className="tabular text-xs text-muted-foreground">{fmt(sel.durationSec)}</span>
          </div>

          <div className="flex gap-1 border-b border-border px-4">
            <Tab active={tab === "transcript"} onClick={() => setTab("transcript")}>{t("call.tab.transcript")}</Tab>
            <Tab active={tab === "translation"} onClick={() => setTab("translation")}>{t("call.tab.translation")}</Tab>
            <Tab active={tab === "assessment"} onClick={() => setTab("assessment")}>{t("call.tab.assessment")}</Tab>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {tab === "transcript" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => audioRef.current?.click()} disabled={transcribing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-50">
                    {transcribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mic className="h-3.5 w-3.5" />}
                    {transcribing ? t("call.transcribing") : t("call.transcribe")}
                  </button>
                  <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={onAudio} />
                  {transcribeErr && <span className="text-xs text-danger">{transcribeErr}</span>}
                </div>
                {transcript.trim() ? (
                  <article className="rounded-lg border border-border bg-surface-2/40 p-4" dir={sel.lang === "ar" ? "rtl" : "ltr"}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{transcript}</p>
                  </article>
                ) : <p className="text-sm text-muted-foreground">{t("call.transcript.empty")}</p>}
              </div>
            )}

            {tab === "translation" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-muted-foreground">{t("call.translate.to")}:</label>
                  <select value={target} onChange={(e) => setTarget(e.target.value)}
                    className="rounded-md border border-border bg-[hsl(var(--input))] px-2 py-1 text-xs">
                    <option value="Arabic">{t("call.translate.arabic")}</option>
                    <option value="English">{t("call.translate.english")}</option>
                  </select>
                  <button onClick={translate} disabled={translating || !transcript.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                    {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
                    {translating ? t("call.translate.translating") : t("call.translate.btn")}
                  </button>
                </div>
                {translateErr && !translating && <p className="text-sm text-danger">{translateErr}</p>}
                {translation ? (
                  <article className="rounded-lg border border-border bg-surface-2/40 p-4" dir={target === "Arabic" ? "rtl" : "ltr"}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{translation}</p>
                  </article>
                ) : (!translating && !translateErr && <p className="text-sm text-muted-foreground">{t("call.translate.empty")}</p>)}
              </div>
            )}

            {tab === "assessment" && (
              <div className="space-y-3">
                <button onClick={assess} disabled={assessing || !transcript.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                  {assessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {assessing ? t("call.assessing") : t("call.assess.btn")}
                </button>
                {assessErr && !assessing && <p className="text-sm text-danger">{assessErr}</p>}
                {assessment ? (
                  <div className="rounded-lg border border-border bg-surface-2/40 p-4"><MarkdownView content={assessment} /></div>
                ) : (!assessing && !assessErr && <p className="text-sm text-muted-foreground">{t("call.assess.empty")}</p>)}
              </div>
            )}
          </div>
        </section>

        {/* ── Ask this call ─────────────────────────────────────────────────── */}
        <aside className="flex min-h-[34rem] flex-col rounded-2xl border border-border bg-card">
          <div className="flex items-start gap-2.5 border-b border-border p-4">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="h-4 w-4" /></span>
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold leading-tight">{t("call.chat.title")}</h3>
              <p className="text-[11px] text-muted-foreground">{t("call.chat.subtitle")}</p>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2.5 overflow-auto p-3">
            {chat.length === 0 && !chatBusy && (
              <div className="space-y-2 pt-2">
                {[t("call.chat.ex1"), t("call.chat.ex2"), t("call.chat.ex3")].map((ex) => (
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
            {chatBusy && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("call.chat.thinking")}</p>}
            {chatErr && !chatBusy && <p className="text-xs text-danger">{chatErr}</p>}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="flex items-center gap-2 border-t border-border p-3">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} disabled={chatBusy} placeholder={t("call.chat.placeholder")}
              className="h-10 flex-1 rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary/50 disabled:opacity-60" />
            <button type="submit" disabled={chatBusy || !question.trim()} aria-label={t("dms.chat.send")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
              {chatBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4 rtl:-scale-x-100" />}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2", tone)}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("text-lg font-bold leading-none", tone)}>{value}</p>
      </div>
    </div>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors", active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{children}</button>;
}
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("border-b-2 px-3 py-2 text-sm font-medium transition-colors", active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{children}</button>;
}
