"use client";

import {
  CheckCircle2, FileText, Loader2, Sparkles, ThumbsUp, TriangleAlert, UserCheck,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { AnalysisActions } from "@/components/workspace/analysis-actions";
import { UploadDocButton } from "@/components/workspace/upload-doc-button";
import { UseCaseViews } from "@/components/workspace/use-case-views";
import { USE_CASES } from "@/lib/use-cases";
import { apiPost, ApiRequestError } from "@/lib/api-client";

interface JobDescription {
  title: string; summary: string; responsibilities: string[]; requirements: string[];
  qualifications: string[]; nice_to_haves: string[];
}
interface CvReview {
  candidate_summary: string; years_experience: string; key_skills: string[];
  strengths: string[]; gaps: string[]; fit: string; recommendation: string;
  requirements_assessment: { requirement: string; status: string }[];
}
interface JdResult { analysis: JobDescription; meta: AnalysisMeta }
interface CvResult { analysis: CvReview; meta: AnalysisMeta }

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" /> {it}
        </li>
      ))}
    </ul>
  );
}

function fitVariant(f: string): "success" | "warning" | "destructive" | "secondary" {
  const v = f.toLowerCase();
  if (v === "strong") return "success";
  if (v === "moderate") return "warning";
  if (v === "weak") return "destructive";
  return "secondary";
}
function statusVariant(s: string): "success" | "warning" | "destructive" | "secondary" {
  const v = s.toLowerCase();
  if (v === "met") return "success";
  if (v === "partial") return "warning";
  if (v === "gap") return "destructive";
  return "secondary";
}

export function HrCenter() {
  const [task, setTask] = React.useState<"jd" | "cv">("jd");
  const tasks = [
    { key: "jd" as const, label: "Job Description", icon: FileText },
    { key: "cv" as const, label: "CV Review", icon: UserCheck },
  ];
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {tasks.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTask(t.key)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                task === t.key ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>
      {task === "jd" ? <JobDescriptionTask /> : <CvReviewTask />}
    </div>
  );
}

function JobDescriptionTask() {
  const [role, setRole] = React.useState("");
  const [seniority, setSeniority] = React.useState("");
  const [keyPoints, setKeyPoints] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<JdResult | null>(null);

  async function run() {
    if (role.trim().length < 2) return;
    setBusy(true); setError(null);
    try {
      setResult(await apiPost<JdResult>("/hr-intelligence/job-description", {
        role, seniority, key_points: keyPoints,
      }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Generation failed.");
    } finally { setBusy(false); }
  }

  const a = result?.analysis;
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-1.5" style={{ minWidth: 220 }}>
              <Label>Role</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Data Protection Officer" />
            </div>
            <div className="space-y-1.5">
              <Label>Seniority (optional)</Label>
              <Input value={seniority} onChange={(e) => setSeniority(e.target.value)}
                placeholder="e.g. Senior" className="w-40" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Key points to include (optional)</Label>
            <textarea value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)}
              placeholder="Anything specific — skills, context, reporting line…"
              className="min-h-20 w-full rounded-md border border-border bg-[hsl(var(--input))] p-2 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
          </div>
          <div className="flex justify-end">
            <Button onClick={run} disabled={busy || role.trim().length < 2}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
              <AnalysisMetaBar meta={result.meta} />
              <AnalysisActions center="hr" result={a} onLoad={(r) => setResult({ analysis: r.result, meta: r.meta } as unknown as Parameters<typeof setResult>[0])} />
            </div>
          <UseCaseViews useCase={USE_CASES.hr} meta={result.meta} />
          {result.meta.structured ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{a!.title}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {a!.summary && <p className="text-sm">{a!.summary}</p>}
                {a!.responsibilities.length > 0 && (
                  <div><p className="mb-1 text-sm font-medium">Responsibilities</p><BulletList items={a!.responsibilities} /></div>
                )}
                {a!.requirements.length > 0 && (
                  <div><p className="mb-1 text-sm font-medium">Requirements</p><BulletList items={a!.requirements} /></div>
                )}
                {a!.qualifications.length > 0 && (
                  <div><p className="mb-1 text-sm font-medium">Qualifications</p><BulletList items={a!.qualifications} /></div>
                )}
                {a!.nice_to_haves.length > 0 && (
                  <div><p className="mb-1 text-sm font-medium">Nice to have</p><BulletList items={a!.nice_to_haves} /></div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="whitespace-pre-wrap pt-6 text-sm">{result.meta.raw_text}</CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}

function CvReviewTask() {
  const [cv, setCv] = React.useState("");
  const [jd, setJd] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CvResult | null>(null);

  async function run() {
    if (cv.trim().length < 20) return;
    setBusy(true); setError(null);
    try {
      setResult(await apiPost<CvResult>("/hr-intelligence/cv-review", {
        cv_text: cv, job_description: jd.trim() || null,
      }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Review failed.");
    } finally { setBusy(false); }
  }

  const a = result?.analysis;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Card className="flex flex-col">
        <CardContent className="flex flex-1 flex-col gap-3 pt-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label>Candidate CV</Label>
              <UploadDocButton onText={setCv} />
            </div>
            <textarea value={cv} onChange={(e) => setCv(e.target.value)}
              placeholder="Paste the CV text here…"
              className="min-h-[12rem] w-full resize-y rounded-md border border-border bg-[hsl(var(--input))] p-2 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
          </div>
          <div className="space-y-1.5">
            <Label>Job description to match against (optional)</Label>
            <textarea value={jd} onChange={(e) => setJd(e.target.value)}
              placeholder="Paste a job description to assess fit and requirement matching…"
              className="min-h-[7rem] w-full resize-y rounded-md border border-border bg-[hsl(var(--input))] p-2 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
          </div>
          <div className="flex justify-end">
            <Button onClick={run} disabled={busy || cv.trim().length < 20}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Review
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!result ? (
          <Card>
            <CardContent className="flex h-full min-h-[12rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <UserCheck className="mb-2 h-8 w-8 text-primary/50" />
              Paste a CV (and optionally a job description) — AICP assesses strengths, gaps,
              fit and requirement matching.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AnalysisMetaBar meta={result.meta} />
              <AnalysisActions center="hr" result={a} onLoad={(r) => setResult({ analysis: r.result, meta: r.meta } as unknown as Parameters<typeof setResult>[0])} />
            </div>
            <UseCaseViews useCase={USE_CASES.hr} meta={result.meta} />
            {result.meta.structured ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span>Candidate</span>
                      <Badge variant={fitVariant(a!.fit)} className="capitalize">{a!.fit} fit</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm">{a!.candidate_summary}</p>
                    {a!.years_experience && (
                      <p className="text-sm text-muted-foreground">Experience: {a!.years_experience}</p>
                    )}
                    {a!.key_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {a!.key_skills.map((s) => (
                          <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs">{s}</span>
                        ))}
                      </div>
                    )}
                    {a!.recommendation && (
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <ThumbsUp className="h-4 w-4 text-primary" /> {a!.recommendation}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2">
                  {a!.strengths.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-success" /> Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent><BulletList items={a!.strengths} /></CardContent>
                    </Card>
                  )}
                  {a!.gaps.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <TriangleAlert className="h-4 w-4 text-warning" /> Gaps
                        </CardTitle>
                      </CardHeader>
                      <CardContent><BulletList items={a!.gaps} /></CardContent>
                    </Card>
                  )}
                </div>

                {a!.requirements_assessment.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Requirement matching</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <THead><TR><TH>Requirement</TH><TH>Status</TH></TR></THead>
                        <TBody>
                          {a!.requirements_assessment.map((r, i) => (
                            <TR key={i}>
                              <TD>{r.requirement}</TD>
                              <TD><Badge variant={statusVariant(r.status)} className="text-[10px] capitalize">{r.status}</Badge></TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card><CardContent className="whitespace-pre-wrap pt-6 text-sm">{result.meta.raw_text}</CardContent></Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
