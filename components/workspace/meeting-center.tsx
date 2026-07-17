"use client";

import {
  CheckSquare, ClipboardList, Gavel, ListTodo, Loader2, Mic, Sparkles, Upload,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { AnalysisActions } from "@/components/workspace/analysis-actions";
import { UploadDocButton } from "@/components/workspace/upload-doc-button";
import { UseCaseViews } from "@/components/workspace/use-case-views";
import { USE_CASES } from "@/lib/use-cases";
import { apiPost, apiUpload, ApiRequestError } from "@/lib/api-client";

interface Analysis {
  title: string;
  executive_summary: string;
  decisions: string[];
  action_items: { owner: string; action: string; due: string }[];
  follow_ups: string[];
  minutes: string;
}
interface Result { analysis: Analysis; meta: AnalysisMeta }

const SAMPLE = `Project sync — 12 March.
Sara: We are two weeks behind on the OCR integration. I propose we move the pilot to April 15.
Omar: Agreed, let's push the pilot to April 15. I will inform the client by Friday.
Sara: I'll re-plan the sprint and share it Monday.
Omar: We also need to decide on the embedding model — let's revisit next week.
Sara: One open question — do we need Arabic OCR for phase 1? Lina to confirm with the client.`;

export function MeetingCenter() {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [transcribing, setTranscribing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function transcribe(file: File) {
    setTranscribing(true);
    setError(null);
    setNote(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiUpload<{ text: string; model: string }>(
        "/transcription/transcribe", form,
      );
      setText((prev) => (prev.trim() ? `${prev}\n${res.text}` : res.text));
      setNote(`Transcribed by AICP (${res.model}). Review, then write up the meeting.`);
    } catch (e) {
      setError(
        e instanceof ApiRequestError ? e.error.message
          : "Transcription failed. Connect a speech-to-text model in AICP to transcribe audio.",
      );
    } finally {
      setTranscribing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function analyze() {
    if (text.trim().length < 20) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await apiPost<Result>("/meeting-intelligence/analyze", { text }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  const a = result?.analysis;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" /> Transcript
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.mp4"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) transcribe(f); }}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}
              disabled={transcribing}>
              {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {transcribing ? "Transcribing…" : "Upload audio"}
            </Button>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mic className="h-3.5 w-3.5" /> transcribed by AICP, or paste a transcript below
            </span>
          </div>
          {note && <p className="text-xs text-success">{note}</p>}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the meeting transcript here…"
            className="min-h-[16rem] flex-1 resize-y rounded-md border border-border bg-[hsl(var(--input))] p-3 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setText(SAMPLE)} className="text-xs text-primary hover:underline">
                Load sample
              </button>
              <UploadDocButton onText={setText} />
            </div>
            <Button onClick={analyze} disabled={busy || text.trim().length < 20}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Write up meeting
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!result ? (
          <Card>
            <CardContent className="flex h-full min-h-[16rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <ListTodo className="mb-2 h-8 w-8 text-primary/50" />
              Paste a transcript and AICP produces a summary, the decisions made, action items
              with owners, follow-ups and formal minutes.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AnalysisMetaBar meta={result.meta} />
              <AnalysisActions center="meeting" result={a} onLoad={(r) => setResult({ analysis: r.result as unknown as Analysis, meta: r.meta as unknown as AnalysisMeta })} />
            </div>
            <UseCaseViews useCase={USE_CASES.meeting} meta={result.meta} />
            {result.meta.structured ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{a!.title || "Meeting summary"}</CardTitle>
                  </CardHeader>
                  {a!.executive_summary && (
                    <CardContent><p className="text-sm">{a!.executive_summary}</p></CardContent>
                  )}
                </Card>

                {a!.action_items.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <CheckSquare className="h-4 w-4 text-primary" /> Action items
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <THead><TR><TH>Owner</TH><TH>Action</TH><TH>Due</TH></TR></THead>
                        <TBody>
                          {a!.action_items.map((it, i) => (
                            <TR key={i}>
                              <TD className="font-medium">{it.owner || "—"}</TD>
                              <TD>{it.action}</TD>
                              <TD>{it.due || "—"}</TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {a!.decisions.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Gavel className="h-4 w-4 text-primary" /> Decisions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {a!.decisions.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" /> {d}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                  {a!.follow_ups.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <ListTodo className="h-4 w-4 text-warning" /> Follow-ups
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {a!.follow_ups.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" /> {f}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {a!.minutes && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Minutes</CardTitle></CardHeader>
                    <CardContent><p className="whitespace-pre-wrap text-sm">{a!.minutes}</p></CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="whitespace-pre-wrap pt-6 text-sm">{result.meta.raw_text}</CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
