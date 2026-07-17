"use client";

import {
  Building2, CheckCircle2, Flag, Loader2, Mail, PenLine, ScanText, Send,
  ShieldAlert, Sparkles, Tags,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { AnalysisActions } from "@/components/workspace/analysis-actions";
import { UploadDocButton } from "@/components/workspace/upload-doc-button";
import { UseCaseViews } from "@/components/workspace/use-case-views";
import { USE_CASES } from "@/lib/use-cases";
import { apiPost, ApiRequestError } from "@/lib/api-client";

interface Analysis {
  provider: string; backend: string; language: string; doc_type: string | null;
  confidence: number; low_confidence: boolean;
  letter_type: string; department: string; priority: string;
  summary: string; key_points: string[]; suggested_response: string;
  redactions: number; detection_types: string[];
}
interface Result { analysis: Analysis; meta: AnalysisMeta }

const SAMPLE = `To the Ministry of Municipal Affairs.
Dear Sir/Madam, I am writing to formally complain about the prolonged water outage in the
Al-Nakheel district affecting over 200 households for the past 6 days. This is urgent as
families have no running water. We request immediate restoration and compensation.
Contact: resident committee, ahmed@example.com, +966 55 111 2222. Sincerely, Ahmed Al-Otaibi.`;

const STAGES = [
  { label: "Letter", icon: Mail },
  { label: "OCR", icon: ScanText },
  { label: "Classify", icon: Tags },
  { label: "Route", icon: Building2 },
  { label: "Prioritise", icon: Flag },
  { label: "Draft", icon: PenLine },
  { label: "Approval", icon: CheckCircle2 },
];

function priorityVariant(p: string): "destructive" | "warning" | "secondary" {
  const v = p.toLowerCase();
  return v === "high" ? "destructive" : v === "medium" ? "warning" : "secondary";
}

export function CorrespondenceCenter() {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const [draft, setDraft] = React.useState("");
  const [approved, setApproved] = React.useState(false);

  async function analyze() {
    if (text.trim().length < 20) return;
    setBusy(true); setError(null); setApproved(false);
    try {
      const res = await apiPost<Result>("/correspondence-intelligence/analyze", { text });
      setResult(res);
      setDraft(res.analysis.suggested_response);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Triage failed.");
    } finally { setBusy(false); }
  }

  const a = result?.analysis;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" /> Incoming letter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the incoming letter…"
            className="min-h-[10rem] w-full resize-y rounded-md border border-border bg-[hsl(var(--input))] p-3 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setText(SAMPLE)} className="text-xs text-primary hover:underline">Load sample</button>
              <UploadDocButton onText={setText} />
            </div>
            <Button onClick={analyze} disabled={busy || text.trim().length < 20}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Triage letter
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      {!result ? (
        <Card>
          <CardContent className="flex min-h-[10rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <Mail className="mb-2 h-8 w-8 text-primary/50" />
            AICP recognises the letter, classifies it, routes it to the right department,
            prioritises it, summarises it and drafts a reply for your approval.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Processing pipeline</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-y-3">
                {STAGES.map((st, i) => {
                  const Icon = st.icon;
                  const done = !(st.label === "Approval" && !approved);
                  return (
                    <div key={st.label} className="flex items-center">
                      <div className="flex w-20 flex-col items-center gap-1.5 text-center">
                        <span className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border",
                          done ? "border-success/40 bg-success/[0.05]" : "border-border bg-surface-2/40",
                        )}>
                          <Icon className={cn("h-4 w-4", done ? "text-success" : "text-muted-foreground")} />
                        </span>
                        <span className="text-[10px] font-medium leading-tight">{st.label}</span>
                      </div>
                      {i < STAGES.length - 1 && <div className="mx-0.5 mt-[-1.1rem] h-0.5 w-4 bg-gradient-to-r from-primary/40 to-primary/70" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
              <AnalysisMetaBar meta={result.meta} />
              <AnalysisActions center="correspondence" result={a} onLoad={(r) => setResult({ analysis: r.result as unknown as Analysis, meta: r.meta as unknown as AnalysisMeta })} />
            </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Tags className="h-4 w-4 text-primary" /> Classification</CardTitle></CardHeader>
              <CardContent className="text-sm"><span className="font-medium">{a!.letter_type || "—"}</span>
                <p className="text-xs text-muted-foreground">{a!.language || "—"} · {Math.round(a!.confidence * 100)}% OCR confidence</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-primary" /> Routed to</CardTitle></CardHeader>
              <CardContent className="text-sm font-medium">{a!.department || "—"}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Flag className="h-4 w-4 text-primary" /> Priority</CardTitle></CardHeader>
              <CardContent><Badge variant={priorityVariant(a!.priority)} className="capitalize">{a!.priority}</Badge></CardContent>
            </Card>
          </div>

          {a!.summary && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{a!.summary}</p>
                {a!.key_points.length > 0 && (
                  <ul className="space-y-1">
                    {a!.key_points.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" /> {p}
                      </li>
                    ))}
                  </ul>
                )}
                {a!.redactions > 0 && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ShieldAlert className="h-3.5 w-3.5 text-warning" /> {a!.redactions} sensitive item(s) redacted before drafting
                    {a!.detection_types.length > 0 && ` — ${a!.detection_types.join(", ")}`}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Draft reply + approval workflow */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm"><PenLine className="h-4 w-4 text-primary" /> Draft reply</CardTitle>
              {approved && <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>}
            </CardHeader>
            <CardContent className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setApproved(false); }}
                className="min-h-[10rem] w-full resize-y rounded-md border border-border bg-[hsl(var(--input))] p-3 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <div className="flex items-center justify-end gap-2">
                <span className="me-auto text-xs text-muted-foreground">Officer review — edit then approve.</span>
                <Button variant="outline" size="sm" onClick={() => setDraft(a!.suggested_response)}>Reset</Button>
                <Button size="sm" onClick={() => setApproved(true)} disabled={approved || !draft.trim()}>
                  {approved ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />} {approved ? "Approved" : "Approve"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <UseCaseViews useCase={USE_CASES.correspondence} meta={result.meta} />
        </>
      )}
    </div>
  );
}
