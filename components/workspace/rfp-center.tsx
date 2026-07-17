"use client";

import { FileSearch, ListChecks, Loader2, Package, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
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
import { useT } from "@/lib/i18n";

interface Analysis {
  executive_summary: string;
  requirements: { id: string; requirement: string; mandatory: boolean }[];
  compliance_matrix: { requirement: string; status: string; notes: string }[];
  boq_items: { item: string; quantity: string; unit: string }[];
  gaps: { area: string; description: string }[];
  vendor_considerations: string[];
}
interface Result { analysis: Analysis; meta: AnalysisMeta }

const SAMPLE = `REQUEST FOR PROPOSAL — Enterprise Document Management System.
1. The solution MUST support OCR for Arabic and English (mandatory).
2. The solution MUST provide role-based access control (mandatory).
3. The solution SHOULD integrate with existing ECM via REST APIs.
4. Vendors must provide on-premises deployment for air-gapped environments (mandatory).
5. Bill of Quantities: 200 named user licenses; 3 application servers; 5 days onboarding training.
6. Proposals must include implementation timeline and support SLA.
Submission deadline: 30 March 2026.`;

function statusVariant(s: string): "success" | "warning" | "destructive" | "secondary" {
  const v = s.toLowerCase();
  if (v === "met") return "success";
  if (v === "partial") return "warning";
  if (v === "gap") return "destructive";
  return "secondary";
}

export function RfpCenter() {
  const t = useT();
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);

  async function analyze() {
    if (text.trim().length < 20) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await apiPost<Result>("/rfp-intelligence/analyze", { text }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : t("ci.analysisFailed"));
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
            <FileSearch className="h-4 w-4 text-primary" /> {t("ci.r.cardTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("ci.r.placeholder")}
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
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!result ? (
          <Card>
            <CardContent className="flex h-full min-h-[18rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <ListChecks className="mb-2 h-8 w-8 text-primary/50" />
              {t("ci.r.emptyState")}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AnalysisMetaBar meta={result.meta} />
              <AnalysisActions center="rfp" result={a} onLoad={(r) => setResult({ analysis: r.result as unknown as Analysis, meta: r.meta as unknown as AnalysisMeta })} />
            </div>
            <UseCaseViews useCase={USE_CASES.rfp} meta={result.meta} />
            {result.meta.structured ? (
              <>
                {a!.executive_summary && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">{t("ci.executiveSummary")}</CardTitle></CardHeader>
                    <CardContent><p className="text-sm">{a!.executive_summary}</p></CardContent>
                  </Card>
                )}

                {a!.requirements.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{t("ci.r.requirements")}</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <THead><TR><TH>#</TH><TH>{t("ci.r.requirement")}</TH><TH>{t("ci.r.type")}</TH></TR></THead>
                        <TBody>
                          {a!.requirements.map((r, i) => (
                            <TR key={i}>
                              <TD className="font-medium">{r.id || i + 1}</TD>
                              <TD>{r.requirement}</TD>
                              <TD>{r.mandatory
                                ? <Badge variant="destructive" className="text-[10px]">{t("ci.r.mandatory")}</Badge>
                                : <Badge variant="secondary" className="text-[10px]">{t("ci.r.optional")}</Badge>}</TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {a!.compliance_matrix.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{t("ci.r.complianceMatrix")}</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <THead><TR><TH>{t("ci.r.requirement")}</TH><TH>{t("ci.r.status")}</TH><TH>{t("ci.r.notes")}</TH></TR></THead>
                        <TBody>
                          {a!.compliance_matrix.map((r, i) => (
                            <TR key={i}>
                              <TD>{r.requirement}</TD>
                              <TD><Badge variant={statusVariant(r.status)} className="text-[10px] capitalize">{r.status}</Badge></TD>
                              <TD>{r.notes}</TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {a!.boq_items.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-primary" /> {t("ci.r.boq")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1.5 text-sm">
                        {a!.boq_items.map((b, i) => (
                          <p key={i}>
                            <span className="font-medium">{b.item}</span>
                            {(b.quantity || b.unit) && (
                              <span className="text-muted-foreground"> — {b.quantity} {b.unit}</span>
                            )}
                          </p>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  {a!.gaps.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <TriangleAlert className="h-4 w-4 text-warning" /> {t("ci.r.gaps")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1.5 text-sm">
                        {a!.gaps.map((g, i) => (
                          <p key={i}><span className="font-medium">{g.area}: </span>{g.description}</p>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {a!.vendor_considerations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{t("ci.r.vendorConsiderations")}</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {a!.vendor_considerations.map((v, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" /> {v}
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
            <Button variant="outline" size="sm" onClick={analyze} disabled={busy}>
              <RefreshCw className="h-4 w-4" /> {t("ci.reanalyse")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
