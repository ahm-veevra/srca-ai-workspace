"use client";

import {
  Activity, CheckSquare, Flag, GraduationCap, Loader2, ShieldAlert, Sparkles,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { AnalysisActions } from "@/components/workspace/analysis-actions";
import { UploadDocButton } from "@/components/workspace/upload-doc-button";
import { UseCaseViews } from "@/components/workspace/use-case-views";
import { USE_CASES } from "@/lib/use-cases";
import { apiPost, ApiRequestError } from "@/lib/api-client";

interface Analysis {
  project_name: string;
  health: string;
  health_reason: string;
  executive_summary: string;
  risks: { severity: string; description: string; mitigation: string }[];
  action_items: { owner: string; action: string; due: string }[];
  milestones: { milestone: string; status: string; date: string }[];
  lessons_learned: string[];
}
interface Result { analysis: Analysis; meta: AnalysisMeta }

const SAMPLE = `Project Atlas — weekly status, week 14.
We completed the OCR integration but are 2 weeks behind on the knowledge base migration.
Budget is on track. The lead backend engineer is on leave next week which puts the API work at risk.
Milestone: Pilot launch originally 1 April, now likely 15 April. UAT sign-off still pending from the client.
Action: Sara to finalise the migration plan by Friday. Omar to confirm the client UAT date.
We learned that under-scoping the data migration cost us time — we should size migrations earlier.`;

function healthVariant(h: string): "success" | "warning" | "destructive" | "secondary" {
  const v = h.toLowerCase();
  if (v === "green") return "success";
  if (v === "amber") return "warning";
  if (v === "red") return "destructive";
  return "secondary";
}
function sevVariant(s: string): "destructive" | "warning" | "secondary" {
  const v = s.toLowerCase();
  return v === "high" ? "destructive" : v === "medium" ? "warning" : "secondary";
}
function milestoneVariant(s: string): "success" | "warning" | "destructive" | "secondary" {
  const v = s.toLowerCase();
  if (v === "done") return "success";
  if (v === "on track") return "secondary";
  if (v === "at risk") return "warning";
  if (v === "delayed") return "destructive";
  return "secondary";
}

export function ProjectCenter() {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);

  async function analyze() {
    if (text.trim().length < 20) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await apiPost<Result>("/project-intelligence/analyze", { text }));
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
            <Activity className="h-4 w-4 text-primary" /> Status update
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a project status update or report here…"
            className="min-h-[18rem] flex-1 resize-y rounded-md border border-border bg-[hsl(var(--input))] p-3 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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
              Assess project
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!result ? (
          <Card>
            <CardContent className="flex h-full min-h-[18rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <Activity className="mb-2 h-8 w-8 text-primary/50" />
              Paste a status update and AICP returns a health rating, executive briefing, risks,
              milestones, action items and lessons learned.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AnalysisMetaBar meta={result.meta} />
              <AnalysisActions center="project" result={a} onLoad={(r) => setResult({ analysis: r.result as unknown as Analysis, meta: r.meta as unknown as AnalysisMeta })} />
            </div>
            <UseCaseViews useCase={USE_CASES.project} meta={result.meta} />
            {result.meta.structured ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span>{a!.project_name || "Project"}</span>
                      <Badge variant={healthVariant(a!.health)} className="uppercase">{a!.health}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {a!.health_reason && <p className="text-sm text-muted-foreground">{a!.health_reason}</p>}
                    {a!.executive_summary && <p className="text-sm">{a!.executive_summary}</p>}
                  </CardContent>
                </Card>

                {a!.risks.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <ShieldAlert className="h-4 w-4 text-primary" /> Risks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <THead><TR><TH>Severity</TH><TH>Risk</TH><TH>Mitigation</TH></TR></THead>
                        <TBody>
                          {a!.risks.map((r, i) => (
                            <TR key={i}>
                              <TD><Badge variant={sevVariant(r.severity)} className="text-[10px] capitalize">{r.severity}</Badge></TD>
                              <TD>{r.description}</TD>
                              <TD>{r.mitigation || "—"}</TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {a!.milestones.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Flag className="h-4 w-4 text-primary" /> Milestones
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <THead><TR><TH>Milestone</TH><TH>Status</TH><TH>Date</TH></TR></THead>
                        <TBody>
                          {a!.milestones.map((m, i) => (
                            <TR key={i}>
                              <TD className="font-medium">{m.milestone}</TD>
                              <TD><Badge variant={milestoneVariant(m.status)} className="text-[10px] capitalize">{m.status}</Badge></TD>
                              <TD>{m.date || "—"}</TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

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
                            <TR key={i}><TD className="font-medium">{it.owner || "—"}</TD><TD>{it.action}</TD><TD>{it.due || "—"}</TD></TR>
                          ))}
                        </TBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {a!.lessons_learned.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <GraduationCap className="h-4 w-4 text-primary" /> Lessons learned
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {a!.lessons_learned.map((l, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" /> {l}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
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
