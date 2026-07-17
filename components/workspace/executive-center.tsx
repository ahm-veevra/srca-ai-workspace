"use client";

import {
  Database, Download, Lightbulb, Loader2, Minus, Presentation, ShieldAlert, Sparkles,
  Target, TrendingDown, TrendingUp,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { AnalysisActions } from "@/components/workspace/analysis-actions";
import { UploadDocButton } from "@/components/workspace/upload-doc-button";
import { UseCaseViews } from "@/components/workspace/use-case-views";
import { USE_CASES } from "@/lib/use-cases";
import { apiPost, ApiRequestError } from "@/lib/api-client";

export interface KnowledgeSource { key: string; name: string }

interface Metric { label: string; value: string; trend: string }
interface Analysis {
  title: string; executive_summary: string; highlights: string[];
  metrics: Metric[]; risks: string[]; recommendations: string[]; outlook: string;
}
interface Result { analysis: Analysis; meta: AnalysisMeta }

const SAMPLE = `Q1 board update. Revenue 12.4M SAR, up 18% YoY. Customer churn fell to 3.2%.
The Atlas platform launch slipped 2 weeks to April 15 due to OCR integration delays.
Cash runway 14 months. Two senior engineers resigned; hiring underway. Regulatory
approval for the gov product expected Q2. NPS improved from 41 to 52.`;

function TrendIcon({ trend }: { trend: string }) {
  const t = trend.toLowerCase();
  if (t === "up") return <TrendingUp className="h-4 w-4 text-success" />;
  if (t === "down") return <TrendingDown className="h-4 w-4 text-danger" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function Bullets({ items, tone }: { items: string[]; tone: string }) {
  return (
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${tone}`} /> {it}
        </li>
      ))}
    </ul>
  );
}

export function ExecutiveCenter({ sources }: { sources: KnowledgeSource[] }) {
  const [text, setText] = React.useState("");
  const [collection, setCollection] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);

  async function run() {
    if (text.trim().length < 20) return;
    setBusy(true); setError(null);
    try {
      setResult(await apiPost<Result>("/executive-intelligence/analyze", {
        text, collection: collection || null,
      }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Briefing failed.");
    } finally { setBusy(false); }
  }

  function exportBriefing() {
    if (!result) return;
    const a = result.analysis;
    const md = [
      `# ${a.title || "Executive Briefing"}`, "",
      a.executive_summary, "",
      a.highlights.length ? "## Highlights\n" + a.highlights.map((h) => `- ${h}`).join("\n") : "",
      a.metrics.length ? "## Metrics\n" + a.metrics.map((m) => `- ${m.label}: ${m.value} (${m.trend})`).join("\n") : "",
      a.risks.length ? "## Risks\n" + a.risks.map((r) => `- ${r}`).join("\n") : "",
      a.recommendations.length ? "## Recommendations\n" + a.recommendations.map((r) => `- ${r}`).join("\n") : "",
      a.outlook ? `## Outlook\n${a.outlook}` : "",
    ].filter(Boolean).join("\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = "executive-briefing.md";
    el.click();
    URL.revokeObjectURL(url);
  }

  const a = result?.analysis;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="space-y-1.5">
            <Label>Material (reports, notes, numbers)</Label>
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Paste updates, metrics or notes to synthesise into a board briefing…"
              className="min-h-[12rem] w-full resize-y rounded-md border border-border bg-[hsl(var(--input))] p-3 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Database className="h-3.5 w-3.5" /> Ground in knowledge</Label>
              <Select value={collection} onChange={(e) => setCollection(e.target.value)} className="w-56">
                <option value="">None (material only)</option>
                {sources.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3 pb-2">
              <button onClick={() => setText(SAMPLE)} className="text-xs text-primary hover:underline">Load sample</button>
              <UploadDocButton onText={setText} />
            </div>
            <Button className="ms-auto" onClick={run} disabled={busy || text.trim().length < 20}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate briefing
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      {!result ? (
        <Card>
          <CardContent className="flex min-h-[12rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <Presentation className="mb-2 h-8 w-8 text-primary/50" />
            AICP synthesises your material into a board-ready briefing — summary, highlights,
            metrics, risks, recommendations and outlook.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
              <AnalysisMetaBar meta={result.meta} />
              <AnalysisActions center="executive" result={a} onLoad={(r) => setResult({ analysis: r.result, meta: r.meta } as unknown as Parameters<typeof setResult>[0])} />
            </div>
          {result.meta.structured ? (
            <>
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-base">{a!.title || "Executive briefing"}</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportBriefing}>
                    <Download className="h-4 w-4" /> Export briefing
                  </Button>
                </CardHeader>
                {a!.executive_summary && <CardContent><p className="text-sm">{a!.executive_summary}</p></CardContent>}
              </Card>

              {a!.metrics.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {a!.metrics.map((m, i) => (
                    <Card key={i}>
                      <CardContent className="pt-5">
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                        <p className="mt-1 flex items-center gap-2 font-display text-xl font-bold tabular-nums">
                          {m.value} <TrendIcon trend={m.trend} />
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="grid gap-3 lg:grid-cols-3">
                {a!.highlights.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4 text-success" /> Highlights</CardTitle></CardHeader>
                    <CardContent><Bullets items={a!.highlights} tone="bg-success" /></CardContent>
                  </Card>
                )}
                {a!.risks.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ShieldAlert className="h-4 w-4 text-warning" /> Risks</CardTitle></CardHeader>
                    <CardContent><Bullets items={a!.risks} tone="bg-warning" /></CardContent>
                  </Card>
                )}
                {a!.recommendations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Target className="h-4 w-4 text-primary" /> Recommendations</CardTitle></CardHeader>
                    <CardContent><Bullets items={a!.recommendations} tone="bg-primary" /></CardContent>
                  </Card>
                )}
              </div>

              {a!.outlook && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Lightbulb className="h-4 w-4 text-primary" /> Outlook</CardTitle></CardHeader>
                  <CardContent><p className="text-sm">{a!.outlook}</p></CardContent>
                </Card>
              )}

              <UseCaseViews useCase={USE_CASES.executive} meta={result.meta} />
            </>
          ) : (
            <Card><CardContent className="whitespace-pre-wrap pt-6 text-sm">{result.meta.raw_text}</CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}
