"use client";

import * as React from "react";
import {
  CalendarClock, CheckSquare, ListChecks, Loader2, MessageSquare, Mic, Search,
  SendHorizontal, Sparkles, Users,
} from "lucide-react";

import { askDocumentAction } from "@/app/(portal)/document-intelligence/dms-actions";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { LineageButton } from "@/components/ai-intelligence/lineage-button";
import { MarkdownView } from "@/components/ui/markdown";
import { UploadDocButton } from "@/components/workspace/upload-doc-button";
import { MEETINGS, type Meeting, type MeetingStatus } from "@/lib/meeting-sample";
import { apiPost, apiUpload, ApiRequestError } from "@/lib/api-client";
import { useLocale, useT } from "@/lib/i18n";
import { type MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

interface Analysis {
  title?: string; executive_summary?: string; decisions?: string[];
  action_items?: { owner: string; action: string; due: string }[]; follow_ups?: string[]; minutes?: string;
}
interface AnalyzeResult { analysis: Analysis; meta: AnalysisMeta }
interface ChatMsg { role: "user" | "assistant"; text: string }
interface TranscribeResult { text: string }

const STATUS_TONE: Record<MeetingStatus, string> = {
  Scheduled: "bg-info/10 text-info",
  Held: "bg-warning/10 text-warning",
  Minuted: "bg-success/10 text-success",
};

export function MeetingManagement() {
  const t = useT();
  const { locale } = useLocale();
  const [selId, setSelId] = React.useState<string>(MEETINGS[0].id);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<MeetingStatus | "">("");
  const [tab, setTab] = React.useState<"overview" | "transcript" | "minutes">("overview");

  const [transcripts, setTranscripts] = React.useState<Record<string, string>>({});
  const [transcribing, setTranscribing] = React.useState(false);
  const [transcribeErr, setTranscribeErr] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLInputElement>(null);

  const [minutesById, setMinutesById] = React.useState<Record<string, AnalyzeResult>>({});
  const [generating, setGenerating] = React.useState(false);
  const [minutesErr, setMinutesErr] = React.useState<string | null>(null);

  const [chats, setChats] = React.useState<Record<string, ChatMsg[]>>({});
  const [question, setQuestion] = React.useState("");
  const [chatBusy, setChatBusy] = React.useState(false);
  const [chatErr, setChatErr] = React.useState<string | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const sel = MEETINGS.find((m) => m.id === selId) ?? MEETINGS[0];
  const titleOf = (m: Meeting) => (locale === "ar" && m.titleAr ? m.titleAr : m.title);
  const statusLabel = (s: MeetingStatus) => t(`mtg.status.${s}` as MessageKey);
  const transcript = transcripts[selId] ?? sel.transcript;
  const minutes = minutesById[selId];
  const chat = chats[selId] ?? [];

  const filtered = MEETINGS.filter((m) => {
    if (statusFilter && m.status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return m.title.toLowerCase().includes(q) || m.titleAr.includes(query.trim()) || m.department.toLowerCase().includes(q) || m.organizer.toLowerCase().includes(q);
  });

  React.useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.length, chatBusy]);

  function selectMeeting(id: string) {
    setSelId(id); setTab("overview"); setQuestion(""); setChatErr(null); setMinutesErr(null); setTranscribeErr(null);
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
      else setTranscribeErr(t("mtg.transcribeErr"));
    } catch {
      setTranscribeErr(t("mtg.transcribeErr"));
    } finally {
      setTranscribing(false);
    }
  }

  async function generate() {
    if (generating) return;
    if (!transcript.trim()) { setTab("transcript"); setMinutesErr(t("mtg.minutes.needTranscript")); return; }
    setGenerating(true); setMinutesErr(null); setTab("minutes");
    try {
      const r = await apiPost<AnalyzeResult>("/meeting-intelligence/analyze", { text: transcript, title: sel.title });
      setMinutesById((m) => ({ ...m, [selId]: r }));
    } catch (e) {
      setMinutesErr(e instanceof ApiRequestError ? e.error.message : t("mtg.chat.error"));
    } finally {
      setGenerating(false);
    }
  }

  async function ask(qText: string) {
    const text = qText.trim();
    if (!text || chatBusy) return;
    setChatErr(null); setQuestion("");
    setChats((m) => ({ ...m, [selId]: [...(m[selId] ?? []), { role: "user", text }] }));
    setChatBusy(true);
    const res = await askDocumentAction(titleOf(sel), transcript, text, locale);
    if (res.ok) setChats((m) => ({ ...m, [selId]: [...(m[selId] ?? []), { role: "assistant", text: res.output }] }));
    else setChatErr(res.noCapability ? t("mtg.chat.awaitingCap") : t("mtg.chat.error"));
    setChatBusy(false);
  }

  const a = minutes?.analysis;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,22rem)]">
      {/* ── Meetings ────────────────────────────────────────────────────────── */}
      <aside className="flex flex-col rounded-2xl border border-border bg-card">
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center justify-between">
            <p className="eyebrow">{t("mtg.register")}</p>
            <span className="text-[11px] text-muted-foreground">{t("mtg.count", { n: MEETINGS.length })}</span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("mtg.search")}
              className="h-8 w-full rounded-lg border border-border bg-surface-2 ps-8 pe-2 text-xs outline-none focus:border-primary/50" />
          </div>
          <div className="flex flex-wrap gap-1">
            <Chip active={statusFilter === ""} onClick={() => setStatusFilter("")}>{t("mtg.filterAll")}</Chip>
            {(["Scheduled", "Held", "Minuted"] as MeetingStatus[]).map((s) => (
              <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{statusLabel(s)}</Chip>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {filtered.map((m) => {
            const on = m.id === selId;
            return (
              <button key={m.id} onClick={() => selectMeeting(m.id)}
                className={cn("mb-1 flex w-full flex-col gap-1 rounded-lg p-2 text-start transition-colors", on ? "bg-primary/10" : "hover:bg-surface-2")}>
                <span className="truncate text-xs font-medium text-foreground">{titleOf(m)}</span>
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <CalendarClock className="h-3 w-3" /><span className="tabular">{m.date} · {m.time}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", STATUS_TONE[m.status])}>{statusLabel(m.status)}</span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground"><Users className="h-2.5 w-2.5" />{m.attendees.length}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Overview / Transcript / Minutes ─────────────────────────────────── */}
      <section className="flex min-h-[34rem] flex-col rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users className="h-5 w-5" /></span>
            <div className="space-y-1">
              <h2 className="font-display text-base font-semibold leading-tight">{titleOf(sel)}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span>{t("mtg.meta.date")}: <span className="tabular">{sel.date} · {sel.time}</span></span>
                <span>· {t("mtg.meta.duration")}: <span className="tabular">{sel.durationMin} {t("mtg.minUnit")}</span></span>
                <span>· {t("mtg.meta.organizer")}: {sel.organizer}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[sel.status])}>{statusLabel(sel.status)}</span>
            <LineageButton
              icon="sparkles"
              sourceLabel={t("ai.lin.srcService")}
              rows={[{ label: t("ai.lin.model"), value: t("ai.lin.modelAtRun") }]}
              endpoints={["/meeting-intelligence/analyze", "/transcription/transcribe", "/documents (OCR extract)", "/ai-capabilities/{document-chat}/run"]}
            />
            <button onClick={generate} disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generating ? t("mtg.minutes.generating") : t("mtg.minutes.generate")}
            </button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-border px-4">
          <Tab active={tab === "overview"} onClick={() => setTab("overview")}>{t("mtg.tab.overview")}</Tab>
          <Tab active={tab === "transcript"} onClick={() => setTab("transcript")}>{t("mtg.tab.transcript")}</Tab>
          <Tab active={tab === "minutes"} onClick={() => setTab("minutes")}>{t("mtg.tab.minutes")}</Tab>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {tab === "overview" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Block title={t("mtg.overview.agenda")}>
                <ul className="space-y-1">{sel.agenda.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />{g}</li>
                ))}</ul>
              </Block>
              <Block title={t("mtg.overview.attendees")}>
                <ul className="space-y-1">{sel.attendees.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm"><Users className="h-3.5 w-3.5 text-muted-foreground" />{p}</li>
                ))}</ul>
              </Block>
            </div>
          )}

          {tab === "transcript" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => audioRef.current?.click()} disabled={transcribing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-50">
                  {transcribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mic className="h-3.5 w-3.5" />}
                  {transcribing ? t("mtg.transcribing") : t("mtg.transcribe")}
                </button>
                <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={onAudio} />
                {/* Upload an existing MoM / notes document — AICP OCR extracts the text, which becomes
                    the meeting record (source for Generate-Minutes and Ask-this-meeting). */}
                <UploadDocButton
                  key={selId}
                  label={t("mtg.uploadDoc")}
                  onText={(text) => setTranscripts((m) => ({ ...m, [selId]: text }))}
                />
                {transcribeErr && <span className="text-xs text-danger">{transcribeErr}</span>}
              </div>
              {transcript.trim() ? (
                <article className="rounded-lg border border-border bg-surface-2/40 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{transcript}</p>
                </article>
              ) : <p className="text-sm text-muted-foreground">{t("mtg.transcript.empty")}</p>}
            </div>
          )}

          {tab === "minutes" && (
            <div className="space-y-3">
              {generating && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("mtg.minutes.generating")}</p>}
              {minutesErr && !generating && <p className="text-sm text-danger">{minutesErr}</p>}
              {!generating && !minutes && !minutesErr && <p className="text-sm text-muted-foreground">{t("mtg.minutes.empty")}</p>}
              {a && (
                <>
                  <AnalysisMetaBar meta={minutes!.meta} />
                  {a.executive_summary && <Block title={t("mtg.min.summary")}><p className="text-sm">{a.executive_summary}</p></Block>}
                  {a.decisions && a.decisions.length > 0 && (
                    <Block title={t("mtg.min.decisions")}>
                      <ul className="space-y-1">{a.decisions.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm"><CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />{d}</li>
                      ))}</ul>
                    </Block>
                  )}
                  {a.action_items && a.action_items.length > 0 && (
                    <Block title={t("mtg.min.actions")}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-border text-start text-[10px] uppercase text-muted-foreground">
                            <th className="p-1.5 text-start font-medium">{t("mtg.min.owner")}</th>
                            <th className="p-1.5 text-start font-medium">{t("mtg.min.action")}</th>
                            <th className="p-1.5 text-start font-medium">{t("mtg.min.due")}</th>
                          </tr></thead>
                          <tbody>{a.action_items.map((it, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="p-1.5 font-medium">{it.owner || "—"}</td>
                              <td className="p-1.5">{it.action}</td>
                              <td className="p-1.5 tabular text-muted-foreground">{it.due || "—"}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </Block>
                  )}
                  {a.follow_ups && a.follow_ups.length > 0 && (
                    <Block title={t("mtg.min.followups")}>
                      <ul className="space-y-1">{a.follow_ups.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm"><ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{f}</li>
                      ))}</ul>
                    </Block>
                  )}
                  {a.minutes && <Block title={t("mtg.min.minutes")}><p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.minutes}</p></Block>}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Ask this meeting ────────────────────────────────────────────────── */}
      <aside className="flex min-h-[34rem] flex-col rounded-2xl border border-border bg-card">
        <div className="flex items-start gap-2.5 border-b border-border p-4">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="h-4 w-4" /></span>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold leading-tight">{t("mtg.chat.title")}</h3>
            <p className="text-[11px] text-muted-foreground">{t("mtg.chat.subtitle")}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-auto p-3">
          {chat.length === 0 && !chatBusy && (
            <div className="space-y-2 pt-2">
              {[t("mtg.chat.ex1"), t("mtg.chat.ex2"), t("mtg.chat.ex3")].map((ex) => (
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
          {chatBusy && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("mtg.chat.thinking")}</p>}
          {chatErr && !chatBusy && <p className="text-xs text-danger">{chatErr}</p>}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="flex items-center gap-2 border-t border-border p-3">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} disabled={chatBusy} placeholder={t("mtg.chat.placeholder")}
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
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-border/60 p-3"><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>{children}</div>;
}
