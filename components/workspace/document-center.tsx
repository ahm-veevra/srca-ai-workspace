"use client";

import {
  AlertTriangle, CheckCircle2, FileDown, FileText, GitCompare, Languages, ListChecks, Loader2,
  MinusCircle, PlusCircle, ScanText, ShieldAlert, Sparkles, Tags, UserSquare,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { AnalysisActions } from "@/components/workspace/analysis-actions";
import { UploadDocButton } from "@/components/workspace/upload-doc-button";
import { UseCaseViews } from "@/components/workspace/use-case-views";
import { USE_CASES } from "@/lib/use-cases";
import { apiPost, apiPostBlob, ApiRequestError } from "@/lib/api-client";

interface DocEntity { text: string; type: string }
interface Analysis {
  provider: string; backend: string; text: string; language: string;
  doc_type: string | null; confidence: number; low_confidence: boolean;
  page_count: number; fields: Record<string, string>;
  summary: string; entities: DocEntity[]; key_points: string[];
  redactions: number; redaction_action: string; detection_types: string[]; masked_text: string;
}
interface Result { analysis: Analysis; meta: AnalysisMeta }

const SAMPLE = `INVOICE #INV-2026-0042
From: Globex Ltd, 12 King Fahd Road, Riyadh
To: Acme Corp. Contact ali@acme.example, +966 50 123 4567
Date: 15 March 2026. Due: 14 April 2026.
Line items: Consulting services 40000 SAR; Support 8000 SAR. Total due: 48000 SAR.`;

const STAGES = [
  { key: "recognition", label: "Recognition", icon: ScanText },
  { key: "classification", label: "Classification", icon: Tags },
  { key: "extraction", label: "Extraction", icon: ListChecks },
  { key: "redaction", label: "Redaction", icon: ShieldAlert },
  { key: "enrichment", label: "Summary & Entities", icon: Sparkles },
  { key: "validation", label: "Validation", icon: CheckCircle2 },
];

export function DocumentCenter() {
  const [tab, setTab] = React.useState<"process" | "compare" | "translate">("process");
  const tabs = [
    { key: "process" as const, label: "Process document", icon: ScanText },
    { key: "compare" as const, label: "Compare documents", icon: GitCompare },
    { key: "translate" as const, label: "Translate", icon: Languages },
  ];
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === t.key ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>
      {tab === "process" ? <ProcessTab /> : tab === "compare" ? <CompareTab /> : <TranslateTab />}
    </div>
  );
}

function ProcessTab() {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const [showMasked, setShowMasked] = React.useState(false);

  async function analyze() {
    if (text.trim().length < 20) return;
    setBusy(true); setError(null);
    try {
      setResult(await apiPost<Result>("/document-intelligence/analyze", { text }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Analysis failed.");
    } finally { setBusy(false); }
  }

  const a = result?.analysis;
  const stageStatus = (key: string): "pass" | "warn" => {
    if (!a) return "pass";
    if (key === "validation") return a.low_confidence ? "warn" : "pass";
    if (key === "redaction") return a.redactions > 0 ? "warn" : "pass";
    return "pass";
  };

  async function downloadPdf() {
    if (!a) return;
    try {
      const blob = await apiPostBlob("/document-intelligence/searchable-pdf", {
        text: a.text || text, title: a.doc_type ? `${a.doc_type} document` : "Document",
      });
      const url = URL.createObjectURL(blob);
      const el = document.createElement("a");
      el.href = url;
      el.download = "searchable-document.pdf";
      el.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" /> Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste document text here…  (image/PDF upload runs through a configured OCR provider)"
            className="min-h-[10rem] w-full resize-y rounded-md border border-border bg-[hsl(var(--input))] p-3 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setText(SAMPLE)} className="text-xs text-primary hover:underline">Load sample</button>
              <UploadDocButton onText={setText} />
            </div>
            <Button onClick={analyze} disabled={busy || text.trim().length < 20}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
              Process document
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      {!result ? (
        <Card>
          <CardContent className="flex min-h-[10rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <ScanText className="mb-2 h-8 w-8 text-primary/50" />
            AICP recognises the document, classifies it, extracts fields, redacts sensitive
            data and summarises it — shown as a live processing pipeline.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Visual processing pipeline */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Processing pipeline</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-y-3">
                {STAGES.map((st, i) => {
                  const Icon = st.icon;
                  const status = stageStatus(st.key);
                  return (
                    <div key={st.key} className="flex items-center">
                      <div className="flex w-24 flex-col items-center gap-1.5 text-center">
                        <span className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl border",
                          status === "warn" ? "border-warning/50 bg-warning/[0.06]" : "border-success/40 bg-success/[0.05]",
                        )}>
                          <Icon className={cn("h-5 w-5", status === "warn" ? "text-warning" : "text-success")} />
                        </span>
                        <span className="text-[11px] font-medium leading-tight">{st.label}</span>
                      </div>
                      {i < STAGES.length - 1 && <div className="mx-0.5 mt-[-1.25rem] h-0.5 w-5 bg-gradient-to-r from-primary/40 to-primary/70" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
              <AnalysisMetaBar meta={result.meta} />
              <AnalysisActions center="document" result={a} onLoad={(r) => setResult({ analysis: r.result, meta: r.meta } as unknown as Parameters<typeof setResult>[0])} />
            </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={downloadPdf}>
              <FileDown className="h-4 w-4" /> Download searchable PDF
            </Button>
          </div>

          {/* Recognition + classification + validation */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Tags className="h-4 w-4 text-primary" /> Classification</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Type: </span><span className="font-medium capitalize">{a!.doc_type ?? "—"}</span></p>
                <p className="flex items-center gap-1"><Languages className="h-3.5 w-3.5 text-muted-foreground" /> {a!.language || "—"} · {a!.page_count} page(s)</p>
                <p className="text-xs text-muted-foreground">via {a!.provider} ({a!.backend})</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Confidence</CardTitle></CardHeader>
              <CardContent>
                <p className="font-display text-2xl font-bold tabular-nums">{Math.round(a!.confidence * 100)}%</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={a!.low_confidence ? "h-full bg-warning" : "h-full bg-success"} style={{ width: `${Math.round(a!.confidence * 100)}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary" /> Validation</CardTitle></CardHeader>
              <CardContent className="text-sm">
                {a!.low_confidence ? (
                  <p className="flex items-center gap-2 text-warning"><AlertTriangle className="h-4 w-4" /> Low confidence — route to human review.</p>
                ) : (
                  <p className="flex items-center gap-2 text-success"><CheckCircle2 className="h-4 w-4" /> Passed — no review needed.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {Object.keys(a!.fields).length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Extracted fields</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <THead><TR><TH>Field</TH><TH>Value</TH></TR></THead>
                  <TBody>
                    {Object.entries(a!.fields).map(([k, v]) => (
                      <TR key={k}><TD className="font-medium">{k}</TD><TD>{String(v)}</TD></TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {a!.summary && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{a!.summary}</p></CardContent>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {a!.entities.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><UserSquare className="h-4 w-4 text-primary" /> Entities</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {a!.entities.map((e, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-xs">
                      {e.text} <span className="text-[10px] text-muted-foreground">{e.type}</span>
                    </span>
                  ))}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ShieldAlert className="h-4 w-4 text-primary" /> Redaction</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold">{a!.redactions}</span> item(s) redacted
                  {a!.detection_types.length > 0 && (
                    <span className="text-muted-foreground"> — {a!.detection_types.join(", ")}</span>
                  )}
                </p>
                {a!.redactions > 0 && (
                  <button onClick={() => setShowMasked((v) => !v)} className="text-xs text-primary hover:underline">
                    {showMasked ? "Hide" : "View"} redacted document
                  </button>
                )}
                {showMasked && (
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border bg-surface-2/40 p-2 text-[11px]">{a!.masked_text}</pre>
                )}
              </CardContent>
            </Card>
          </div>

          {a!.key_points.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Key points</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {a!.key_points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" /> {p}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <UseCaseViews useCase={USE_CASES.document} meta={result.meta} />
        </>
      )}
    </div>
  );
}

interface DocChange { type: string; section: string; detail: string }
interface Comparison {
  summary: string; risk_level: string; changes: DocChange[]; key_differences: string[];
}
interface CompareResult { analysis: Comparison; meta: AnalysisMeta }

const CMP_A = `Service agreement. Term 12 months. Payment within 30 days.
Liability capped at 100,000 SAR. Either party may terminate with 30 days notice.`;
const CMP_B = `Service agreement. Term 24 months. Payment within 15 days.
Liability capped at 250,000 SAR. Either party may terminate with 60 days notice.
Late payment incurs 2% monthly interest.`;

function riskVariant(r: string): "success" | "warning" | "destructive" | "secondary" {
  const v = r.toLowerCase();
  if (v === "low") return "success";
  if (v === "medium") return "warning";
  if (v === "high") return "destructive";
  return "secondary";
}
function ChangeIcon({ type }: { type: string }) {
  const v = type.toLowerCase();
  if (v === "added") return <PlusCircle className="h-3.5 w-3.5 text-success" />;
  if (v === "removed") return <MinusCircle className="h-3.5 w-3.5 text-danger" />;
  return <GitCompare className="h-3.5 w-3.5 text-warning" />;
}

function CompareTab() {
  const [a, setA] = React.useState("");
  const [b, setB] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CompareResult | null>(null);

  async function compare() {
    if (a.trim().length < 20 || b.trim().length < 20) return;
    setBusy(true); setError(null);
    try {
      setResult(await apiPost<CompareResult>("/document-intelligence/compare", { text_a: a, text_b: b }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Comparison failed.");
    } finally { setBusy(false); }
  }

  const an = result?.analysis;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Document A (original)</CardTitle></CardHeader>
          <CardContent>
            <textarea value={a} onChange={(e) => setA(e.target.value)} placeholder="Paste the original version…"
              className="min-h-[12rem] w-full resize-y rounded-md border border-border bg-[hsl(var(--input))] p-3 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Document B (revised)</CardTitle></CardHeader>
          <CardContent>
            <textarea value={b} onChange={(e) => setB(e.target.value)} placeholder="Paste the revised version…"
              className="min-h-[12rem] w-full resize-y rounded-md border border-border bg-[hsl(var(--input))] p-3 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
          </CardContent>
        </Card>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => { setA(CMP_A); setB(CMP_B); }} className="text-xs text-primary hover:underline">Load sample</button>
        <Button onClick={compare} disabled={busy || a.trim().length < 20 || b.trim().length < 20}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />} Compare
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      {result && (
        <div className="space-y-4">
          <AnalysisMetaBar meta={result.meta} />
          {result.meta.structured ? (
            <>
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-base">What changed</CardTitle>
                  <Badge variant={riskVariant(an!.risk_level)} className="uppercase">{an!.risk_level} risk</Badge>
                </CardHeader>
                {an!.summary && <CardContent><p className="text-sm">{an!.summary}</p></CardContent>}
              </Card>

              {an!.changes.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Changes</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <THead><TR><TH>Type</TH><TH>Section</TH><TH>Detail</TH></TR></THead>
                      <TBody>
                        {an!.changes.map((c, i) => (
                          <TR key={i}>
                            <TD><span className="inline-flex items-center gap-1 capitalize"><ChangeIcon type={c.type} /> {c.type}</span></TD>
                            <TD className="font-medium">{c.section || "—"}</TD>
                            <TD>{c.detail}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {an!.key_differences.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Key differences</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {an!.key_differences.map((k, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" /> {k}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <UseCaseViews useCase={USE_CASES.document_compare} meta={result.meta} />
            </>
          ) : (
            <Card><CardContent className="whitespace-pre-wrap pt-6 text-sm">{result.meta.raw_text}</CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}

interface TranslationResult { target_language: string; translation: string; meta: AnalysisMeta }

const LANGUAGES = ["Arabic", "English", "French", "German", "Spanish", "Chinese", "Urdu", "Hindi"];

function TranslateTab() {
  const [text, setText] = React.useState("");
  const [lang, setLang] = React.useState("Arabic");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<TranslationResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function translate() {
    if (text.trim().length < 1) return;
    setBusy(true); setError(null); setCopied(false);
    try {
      setResult(await apiPost<TranslationResult>("/document-intelligence/translate", {
        text, target_language: lang,
      }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Translation failed.");
    } finally { setBusy(false); }
  }

  async function copy() {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.translation); setCopied(true); } catch { /* ignore */ }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="flex flex-col">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Source</CardTitle></CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste text to translate…"
            className="min-h-[14rem] flex-1 resize-y rounded-md border border-border bg-[hsl(var(--input))] p-3 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
          <div className="flex items-center justify-between gap-2">
            <select value={lang} onChange={(e) => setLang(e.target.value)}
              className="h-9 rounded-md border border-border bg-[hsl(var(--input))] px-2 text-sm">
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <Button onClick={translate} disabled={busy || text.trim().length < 1}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />} Translate
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm">{result ? result.target_language : "Translation"}</CardTitle>
          {result && (
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <FileText className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2">
          {!result ? (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
              The translation appears here, produced securely.
            </div>
          ) : (
            <>
              <div className="min-h-[12rem] flex-1 whitespace-pre-wrap rounded-md border border-border bg-surface-2/30 p-3 text-sm" dir="auto">
                {result.translation}
              </div>
              <AnalysisMetaBar meta={result.meta} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
