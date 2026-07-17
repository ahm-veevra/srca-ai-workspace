"use client";

import {
  CheckCircle2, Database, Loader2, ShieldCheck, Sparkles, Target, TriangleAlert, XCircle,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { AnalysisActions } from "@/components/workspace/analysis-actions";
import { UploadDocButton } from "@/components/workspace/upload-doc-button";
import { UseCaseViews } from "@/components/workspace/use-case-views";
import { USE_CASES } from "@/lib/use-cases";
import { apiPost, ApiRequestError } from "@/lib/api-client";

export interface KnowledgeSource { key: string; name: string }

interface Control { control: string; requirement: string; status: string; finding: string }
interface Analysis {
  framework: string; overall_status: string; summary: string;
  controls: Control[]; gaps: string[]; recommendations: string[];
}
interface Result { analysis: Analysis; meta: AnalysisMeta }

const FRAMEWORKS = [
  { key: "dga", label: "DGA (Digital Government)" },
  { key: "ndmo", label: "NDMO (Data Management)" },
  { key: "iso27001", label: "ISO/IEC 27001" },
  { key: "general", label: "General best practice" },
];

const SAMPLE = `Data handling policy: Customer data is stored in our cloud database. Access is granted
to all staff. We keep data indefinitely. Backups are taken weekly. We do not currently encrypt
data at rest. There is no formal incident response plan. Personal data is sometimes shared with
third-party vendors without a data processing agreement.`;

function overallVariant(s: string): "success" | "warning" | "destructive" | "secondary" {
  const v = s.toLowerCase();
  if (v === "compliant") return "success";
  if (v === "partial") return "warning";
  if (v === "non_compliant") return "destructive";
  return "secondary";
}
function statusVariant(s: string): "success" | "warning" | "destructive" | "secondary" {
  const v = s.toLowerCase();
  if (v === "met") return "success";
  if (v === "partial") return "warning";
  if (v === "gap") return "destructive";
  return "secondary";
}
function StatusIcon({ status }: { status: string }) {
  const v = status.toLowerCase();
  if (v === "met") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  if (v === "partial") return <TriangleAlert className="h-3.5 w-3.5 text-warning" />;
  return <XCircle className="h-3.5 w-3.5 text-danger" />;
}

export function ComplianceCenter({ sources }: { sources: KnowledgeSource[] }) {
  const [text, setText] = React.useState("");
  const [framework, setFramework] = React.useState("ndmo");
  const [collection, setCollection] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);

  async function run() {
    if (text.trim().length < 20) return;
    setBusy(true); setError(null);
    try {
      setResult(await apiPost<Result>("/compliance-intelligence/analyze", {
        text, framework, collection: collection || null,
      }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Review failed.");
    } finally { setBusy(false); }
  }

  const a = result?.analysis;
  const summary = a
    ? { met: a.controls.filter((c) => c.status.toLowerCase() === "met").length,
        partial: a.controls.filter((c) => c.status.toLowerCase() === "partial").length,
        gap: a.controls.filter((c) => c.status.toLowerCase() === "gap").length }
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="space-y-1.5">
            <Label>Policy, process or document</Label>
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Paste a policy or process description to assess for compliance…"
              className="min-h-[11rem] w-full resize-y rounded-md border border-border bg-[hsl(var(--input))] p-3 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Framework</Label>
              <Select value={framework} onChange={(e) => setFramework(e.target.value)} className="w-56">
                {FRAMEWORKS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Database className="h-3.5 w-3.5" /> Ground in policy library</Label>
              <Select value={collection} onChange={(e) => setCollection(e.target.value)} className="w-52">
                <option value="">None</option>
                {sources.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3 pb-2">
              <button onClick={() => setText(SAMPLE)} className="text-xs text-primary hover:underline">Load sample</button>
              <UploadDocButton onText={setText} />
            </div>
            <Button className="ms-auto" onClick={run} disabled={busy || text.trim().length < 20}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Run review
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      {!result ? (
        <Card>
          <CardContent className="flex min-h-[11rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <ShieldCheck className="mb-2 h-8 w-8 text-primary/50" />
            AICP assesses your policy against the chosen framework and returns an overall status,
            a control-by-control matrix, the material gaps and remediation steps.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
              <AnalysisMetaBar meta={result.meta} />
              <AnalysisActions center="compliance" result={a} onLoad={(r) => setResult({ analysis: r.result as unknown as Analysis, meta: r.meta as unknown as AnalysisMeta })} />
            </div>
          {result.meta.structured ? (
            <>
              <Card>
                <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-base">Assessment</CardTitle>
                  <Badge variant={overallVariant(a!.overall_status)} className="uppercase">
                    {a!.overall_status.replace(/_/g, "-")}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {a!.summary && <p className="text-sm">{a!.summary}</p>}
                  {summary && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="success">{summary.met} met</Badge>
                      <Badge variant="warning">{summary.partial} partial</Badge>
                      <Badge variant="destructive">{summary.gap} gap</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {a!.controls.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance matrix</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <THead><TR><TH>Control</TH><TH>Requirement</TH><TH>Status</TH><TH>Finding</TH></TR></THead>
                      <TBody>
                        {a!.controls.map((c, i) => (
                          <TR key={i}>
                            <TD className="font-medium">{c.control}</TD>
                            <TD>{c.requirement}</TD>
                            <TD><span className="inline-flex items-center gap-1"><StatusIcon status={c.status} /><Badge variant={statusVariant(c.status)} className="text-[10px] capitalize">{c.status}</Badge></span></TD>
                            <TD>{c.finding}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {a!.gaps.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><TriangleAlert className="h-4 w-4 text-warning" /> Material gaps</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {a!.gaps.map((g, i) => <li key={i} className="flex items-start gap-2 text-sm"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" /> {g}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                {a!.recommendations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Target className="h-4 w-4 text-primary" /> Remediation</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {a!.recommendations.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" /> {r}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              <UseCaseViews useCase={USE_CASES.compliance} meta={result.meta} />
            </>
          ) : (
            <Card><CardContent className="whitespace-pre-wrap pt-6 text-sm">{result.meta.raw_text}</CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}
