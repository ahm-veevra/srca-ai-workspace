"use client";

import {
  Database, FlaskConical, Lightbulb, Loader2, ShieldAlert, Sparkles, Target, TrendingUp,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { AnalysisActions } from "@/components/workspace/analysis-actions";
import { UseCaseViews } from "@/components/workspace/use-case-views";
import { USE_CASES } from "@/lib/use-cases";
import { apiPost, ApiRequestError } from "@/lib/api-client";

export interface KnowledgeSource { key: string; name: string }

interface Analysis {
  title: string;
  executive_summary: string;
  key_findings: { title: string; detail: string }[];
  opportunities: string[];
  risks: string[];
  recommendations: string[];
  sections: { heading: string; body: string }[];
}
interface Result { analysis: Analysis; meta: AnalysisMeta }

const TYPES = [
  { key: "market", label: "Market research" },
  { key: "competitor", label: "Competitor analysis" },
  { key: "technology", label: "Technology analysis" },
  { key: "regulatory", label: "Regulatory research" },
  { key: "strategic", label: "Strategic research" },
];

function BulletCard({
  title, icon: Icon, items, tone,
}: {
  title: string; icon: typeof Target; items: string[]; tone: string;
}) {
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className={`h-4 w-4 ${tone}`} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${tone.replace("text-", "bg-")}`} /> {it}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function ResearchCenter({ sources }: { sources: KnowledgeSource[] }) {
  const [topic, setTopic] = React.useState("");
  const [type, setType] = React.useState("strategic");
  const [collection, setCollection] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);

  async function run() {
    if (topic.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await apiPost<Result>("/research-intelligence/analyze", {
        topic, research_type: type, collection: collection || null,
      }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Research failed.");
    } finally {
      setBusy(false);
    }
  }

  const a = result?.analysis;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="space-y-1.5">
            <Label>Research topic or question</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. On-premises AI platforms for government document processing"
              onKeyDown={(e) => { if (e.key === "Enter") run(); }} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onChange={(e) => setType(e.target.value)} className="w-52">
                {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Database className="h-3.5 w-3.5" /> Ground in knowledge</Label>
              <Select value={collection} onChange={(e) => setCollection(e.target.value)} className="w-56">
                <option value="">None (general knowledge)</option>
                {sources.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
              </Select>
            </div>
            <Button onClick={run} disabled={busy || topic.trim().length < 3}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Research
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      {!result ? (
        <Card>
          <CardContent className="flex min-h-[12rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <FlaskConical className="mb-2 h-8 w-8 text-primary/50" />
            Enter a topic and AICP produces a structured research briefing — findings,
            opportunities, risks and recommendations. Ground it in a knowledge base to keep it
            specific to your organisation.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
              <AnalysisMetaBar meta={result.meta} />
              <AnalysisActions center="research" result={a} onLoad={(r) => setResult({ analysis: r.result as unknown as Analysis, meta: r.meta as unknown as AnalysisMeta })} />
            </div>
          <UseCaseViews useCase={USE_CASES.research} meta={result.meta} />
          {result.meta.structured ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{a!.title || "Research briefing"}</CardTitle>
                </CardHeader>
                {a!.executive_summary && (
                  <CardContent><p className="text-sm">{a!.executive_summary}</p></CardContent>
                )}
              </Card>

              {a!.key_findings.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-primary" /> Key findings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {a!.key_findings.map((f, i) => (
                      <div key={i}>
                        <p className="text-sm font-medium">{f.title}</p>
                        <p className="text-sm text-muted-foreground">{f.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-3 lg:grid-cols-3">
                <BulletCard title="Opportunities" icon={TrendingUp} items={a!.opportunities} tone="text-success" />
                <BulletCard title="Risks" icon={ShieldAlert} items={a!.risks} tone="text-warning" />
                <BulletCard title="Recommendations" icon={Target} items={a!.recommendations} tone="text-primary" />
              </div>

              {a!.sections.map((s, i) => (
                s.body ? (
                  <Card key={i}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{s.heading}</CardTitle></CardHeader>
                    <CardContent><p className="text-sm">{s.body}</p></CardContent>
                  </Card>
                ) : null
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="whitespace-pre-wrap pt-6 text-sm">{result.meta.raw_text}</CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
