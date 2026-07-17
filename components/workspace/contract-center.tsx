"use client";

import { CalendarClock, Download, FileText, Loader2, RefreshCw, ScrollText, ShieldAlert, Sparkles, Users } from "lucide-react";
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
import { apiDownload, apiPost, ApiRequestError } from "@/lib/api-client";
import { useT } from "@/lib/i18n";

interface Analysis {
  executive_summary: string;
  parties: { name: string; role: string }[];
  contract_value: string;
  governing_law: string;
  overall_risk: string;
  clauses: { type: string; summary: string }[];
  risks: { severity: string; description: string }[];
  obligations: { party: string; obligation: string; due: string }[];
  key_dates: { label: string; date: string }[];
  expiration: string;
  renewal: string;
  missing_clauses: string[];
  recommendation: string;
  compliance_notes: string;
}
interface Result { analysis: Analysis; meta: AnalysisMeta }

const SAMPLE = `SERVICE AGREEMENT between Acme Corp (Provider) and Globex Ltd (Client).
Term: 12 months from 1 January 2026, auto-renewing for successive 12-month periods unless either party gives 60 days written notice.
Provider shall deliver monthly reports by the 5th business day. Client shall pay invoices within 30 days; late payment incurs 1.5% monthly interest.
Either party may terminate for material breach with a 30-day cure period. Provider liability is capped at fees paid in the preceding 12 months.
Confidential information must be protected for 3 years post-termination.`;

function sevVariant(s: string): "destructive" | "warning" | "secondary" {
  const v = s.toLowerCase();
  return v === "high" ? "destructive" : v === "medium" ? "warning" : "secondary";
}

const IS_DEV = process.env.NODE_ENV !== "production";
interface ErrInfo { message: string; traceId?: string; step?: string; fix?: string }
interface DebugRec {
  endpoint: string; ocrLen: number; status?: number; traceId?: string;
  model?: string | null; route?: string | null; policy?: string; step?: string;
}

export function ContractCenter() {
  const t = useT();
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [errInfo, setErrInfo] = React.useState<ErrInfo | null>(null);
  const [debug, setDebug] = React.useState<DebugRec | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const [downloading, setDownloading] = React.useState<string | null>(null);

  async function downloadReport(format: "pdf" | "docx") {
    if (!result?.analysis) return;
    setDownloading(format);
    try {
      await apiDownload(
        "/contract-intelligence/report",
        { analysis: result.analysis, format },
        `contract-review.${format}`,
      );
    } catch {
      setErrInfo({ message: t("ci.c.reportError") });
    } finally {
      setDownloading(null);
    }
  }

  async function analyze() {
    if (text.trim().length < 20) return;
    setBusy(true);
    setErrInfo(null);
    const dbg: DebugRec = { endpoint: "POST /api/v1/contract-intelligence/analyze", ocrLen: text.length };
    setDebug(dbg);
    try {
      const r = await apiPost<Result>("/contract-intelligence/analyze", { text });
      setResult(r);
      setDebug({
        ...dbg, status: 200, traceId: r.meta.trace_id ?? undefined, model: r.meta.model,
        route: r.meta.route_rule ?? undefined,
        policy: r.meta.policy_pre ? `${r.meta.policy_pre} / ${r.meta.policy_post ?? "—"}` : undefined,
      });
    } catch (e) {
      if (e instanceof ApiRequestError) {
        const d = (e.error.details ?? {}) as { failing_step?: string; suggested_fix?: string };
        setErrInfo({ message: e.error.message, traceId: e.error.trace_id ?? undefined, step: d.failing_step, fix: d.suggested_fix });
        setDebug({ ...dbg, status: e.status, traceId: e.error.trace_id ?? undefined, step: d.failing_step });
      } else {
        setErrInfo({ message: t("ci.analysisFailed") });
      }
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
            <FileText className="h-4 w-4 text-primary" /> {t("ci.c.cardTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("ci.c.placeholder")}
            className="min-h-[18rem] flex-1 resize-y rounded-md border border-border bg-[hsl(var(--input))] p-3 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setText(SAMPLE)} className="text-xs text-primary hover:underline">
                {t("ci.loadSample")}
              </button>
              <UploadDocButton onText={setText} />
            </div>
            <Button onClick={analyze} disabled={busy || text.trim().length < 20}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t("ci.analyse")}
            </Button>
          </div>
          {busy && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("ci.c.analysingNote")}
            </p>
          )}
          {errInfo && (
            <div className="space-y-1 rounded-md border border-danger/40 bg-danger/5 p-2.5 text-sm">
              <p className="font-medium text-danger">{errInfo.message}</p>
              {errInfo.fix && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{t("ci.c.suggestedFix")}</span> {errInfo.fix}</p>}
              <p className="text-xs text-muted-foreground">
                {errInfo.step && <>{t("ci.c.step")} <span className="font-medium">{errInfo.step}</span> · </>}
                {errInfo.traceId && <>{t("ci.c.trace")} <code className="text-[10px]">{errInfo.traceId}</code></>}
              </p>
            </div>
          )}
          {IS_DEV && debug && (
            <details className="rounded-md border border-amber-300/50 bg-amber-50/60 p-2 text-[11px] dark:bg-amber-500/5">
              <summary className="cursor-pointer font-semibold text-amber-700">Contract analysis debug (dev)</summary>
              <dl className="mt-1.5 grid grid-cols-[130px_1fr] gap-x-2 gap-y-0.5">
                <dt className="text-muted-foreground">Endpoint</dt><dd><code>{debug.endpoint}</code></dd>
                <dt className="text-muted-foreground">OCR text length</dt><dd>{debug.ocrLen} chars</dd>
                <dt className="text-muted-foreground">Response status</dt><dd>{debug.status ?? "(pending)"}</dd>
                <dt className="text-muted-foreground">Model</dt><dd>{debug.model ?? "—"}</dd>
                <dt className="text-muted-foreground">Route rule</dt><dd>{debug.route ?? "—"}</dd>
                <dt className="text-muted-foreground">Policies</dt><dd>{debug.policy ?? "—"}</dd>
                <dt className="text-muted-foreground">Failing step</dt><dd>{debug.step ?? "—"}</dd>
                <dt className="text-muted-foreground">Trace ID</dt><dd>{debug.traceId ? <code>{debug.traceId}</code> : "—"}</dd>
              </dl>
            </details>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!result ? (
          <Card>
            <CardContent className="flex h-full min-h-[18rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <ScrollText className="mb-2 h-8 w-8 text-primary/50" />
              {t("ci.c.emptyState")}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AnalysisMetaBar meta={result.meta} />
              <AnalysisActions center="contract" result={a} onLoad={(r) => setResult({ analysis: r.result, meta: r.meta } as unknown as Parameters<typeof setResult>[0])} />
            </div>
            <UseCaseViews useCase={USE_CASES.contract} meta={result.meta} />
            {result.meta.structured ? (
              <>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      {a!.overall_risk && (
                        <Badge variant={sevVariant(a!.overall_risk)} className="capitalize">
                          {t("ci.c.overallRisk")}: {a!.overall_risk}
                        </Badge>
                      )}
                      {a!.contract_value && (
                        <span><span className="text-muted-foreground">{t("ci.c.value")}: </span>{a!.contract_value}</span>
                      )}
                      {a!.governing_law && (
                        <span><span className="text-muted-foreground">{t("ci.c.governingLaw")}: </span>{a!.governing_law}</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="outline" size="sm" disabled={!!downloading} onClick={() => void downloadReport("pdf")}>
                        {downloading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {t("ci.c.pdfReport")}
                      </Button>
                      <Button variant="outline" size="sm" disabled={!!downloading} onClick={() => void downloadReport("docx")}>
                        {downloading === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {t("ci.c.wordReport")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {a!.executive_summary && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">{t("ci.executiveSummary")}</CardTitle></CardHeader>
                    <CardContent><p className="text-sm">{a!.executive_summary}</p></CardContent>
                  </Card>
                )}

                {a!.parties.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-primary" /> {t("ci.c.parties")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <THead><TR><TH>{t("ci.c.party")}</TH><TH>{t("ci.c.role")}</TH></TR></THead>
                        <TBody>
                          {a!.parties.map((p, i) => (
                            <TR key={i}><TD className="font-medium">{p.name}</TD><TD>{p.role || "—"}</TD></TR>
                          ))}
                        </TBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <CalendarClock className="h-4 w-4 text-primary" /> {t("ci.c.termRenewal")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-sm">
                      <p><span className="text-muted-foreground">{t("ci.c.expiration")}: </span>{a!.expiration || "—"}</p>
                      <p><span className="text-muted-foreground">{t("ci.c.renewal")}: </span>{a!.renewal || "—"}</p>
                      {a!.key_dates.map((k, i) => (
                        <p key={i}><span className="text-muted-foreground">{k.label}: </span>{k.date}</p>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <ShieldAlert className="h-4 w-4 text-primary" /> {t("ci.c.risks")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {a!.risks.length ? a!.risks.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <Badge variant={sevVariant(r.severity)} className="shrink-0 text-[10px] capitalize">{r.severity}</Badge>
                          <span>{r.description}</span>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">{t("ci.c.noneIdentified")}</p>}
                    </CardContent>
                  </Card>
                </div>

                {a!.clauses.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{t("ci.c.keyClauses")}</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <THead><TR><TH>{t("ci.c.type")}</TH><TH>{t("ci.c.summaryCol")}</TH></TR></THead>
                        <TBody>
                          {a!.clauses.map((c, i) => (
                            <TR key={i}><TD className="font-medium">{c.type}</TD><TD>{c.summary}</TD></TR>
                          ))}
                        </TBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {a!.obligations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{t("ci.c.obligations")}</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <THead><TR><TH>{t("ci.c.party")}</TH><TH>{t("ci.c.obligation")}</TH><TH>{t("ci.c.due")}</TH></TR></THead>
                        <TBody>
                          {a!.obligations.map((o, i) => (
                            <TR key={i}><TD className="font-medium">{o.party}</TD><TD>{o.obligation}</TD><TD>{o.due || "—"}</TD></TR>
                          ))}
                        </TBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {a!.missing_clauses.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <ShieldAlert className="h-4 w-4 text-warning" /> {t("ci.c.missingClauses")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {a!.missing_clauses.map((m, i) => (
                          <Badge key={i} variant="warning" className="text-xs">{m}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {a!.compliance_notes && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{t("ci.c.complianceNotes")}</CardTitle></CardHeader>
                    <CardContent><p className="text-sm">{a!.compliance_notes}</p></CardContent>
                  </Card>
                )}

                {a!.recommendation && (
                  <Card className="border-primary/40">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{t("ci.c.recommendation")}</CardTitle></CardHeader>
                    <CardContent><p className="text-sm">{a!.recommendation}</p></CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="whitespace-pre-wrap pt-6 text-sm">{result.meta.raw_text}</CardContent>
              </Card>
            )}
            <Button variant="outline" size="sm" onClick={analyze} disabled={busy}>
              <RefreshCw className="h-4 w-4" /> {t("ci.reanalyse")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
