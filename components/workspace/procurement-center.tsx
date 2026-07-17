"use client";

import {
  Building2, Coins, Lightbulb, Loader2, PiggyBank, Sparkles, Trophy,
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
import { apiPost, ApiRequestError } from "@/lib/api-client";

interface SpendAnalysis {
  total_summary: string;
  by_category: { category: string; amount: string; share: string }[];
  top_vendors: { vendor: string; amount: string; note: string }[];
  observations: string[];
  savings_opportunities: string[];
  recommendations: string[];
}
interface VendorComparison {
  summary: string;
  vendors: { name: string; strengths: string[]; weaknesses: string[]; rating: string }[];
  criteria: { criterion: string; best_vendor: string }[];
  recommendation: string;
  rationale: string;
}
interface SpendResult { analysis: SpendAnalysis; meta: AnalysisMeta }
interface VendorResult { analysis: VendorComparison; meta: AnalysisMeta }

const SPEND_SAMPLE = `Q1 purchases:
- CloudCo, hosting, 42000 USD
- CloudCo, support, 8000 USD
- PaperPlus, office supplies, 3500 USD
- DataVend, analytics license, 25000 USD
- PaperPlus, printing, 2000 USD
- SecureIT, security audit, 15000 USD`;

const VENDOR_SAMPLE = `Vendor A: lowest price, 24/7 support, but no on-prem option and limited Arabic support.
Vendor B: higher price, on-prem deployment, strong Arabic OCR, 9-5 support only.
Vendor C: mid price, on-prem, good support, but newer company with fewer references.`;

function BulletList({ items, tone = "bg-primary" }: { items: string[]; tone?: string }) {
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
function ratingVariant(r: string): "success" | "warning" | "destructive" | "secondary" {
  const v = r.toLowerCase();
  if (v === "strong") return "success";
  if (v === "moderate") return "warning";
  if (v === "weak") return "destructive";
  return "secondary";
}

export function ProcurementCenter() {
  const [task, setTask] = React.useState<"spend" | "vendor">("spend");
  const tasks = [
    { key: "spend" as const, label: "Spend Analysis", icon: Coins },
    { key: "vendor" as const, label: "Vendor Comparison", icon: Building2 },
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
      {task === "spend" ? <SpendTask /> : <VendorTask />}
    </div>
  );
}

function InputCard({
  value, onChange, onRun, onSample, onText, busy, label, placeholder,
}: {
  value: string; onChange: (v: string) => void; onRun: () => void; onSample: () => void;
  onText?: (t: string) => void;
  busy: boolean; label: string; placeholder: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2"><CardTitle className="text-base">{label}</CardTitle></CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="min-h-[16rem] flex-1 resize-y rounded-md border border-border bg-[hsl(var(--input))] p-3 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={onSample} className="text-xs text-primary hover:underline">Load sample</button>
            {onText && <UploadDocButton onText={onText} />}
          </div>
          <Button onClick={onRun} disabled={busy || value.trim().length < 20}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Analyse
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SpendTask() {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SpendResult | null>(null);

  async function run() {
    if (text.trim().length < 20) return;
    setBusy(true); setError(null);
    try {
      setResult(await apiPost<SpendResult>("/procurement-intelligence/spend-analysis", { text }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Analysis failed.");
    } finally { setBusy(false); }
  }
  const a = result?.analysis;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <InputCard value={text} onChange={setText} onRun={run} onSample={() => setText(SPEND_SAMPLE)} onText={setText}
        busy={busy} label="Spend data" placeholder="Paste purchase lines (vendor, category, amount)…" />
      <div className="space-y-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        {result && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AnalysisMetaBar meta={result.meta} />
              <AnalysisActions center="procurement" result={a} onLoad={(r) => setResult({ analysis: r.result, meta: r.meta } as unknown as Parameters<typeof setResult>[0])} />
            </div>
            <UseCaseViews useCase={USE_CASES.procurement} meta={result.meta} />
            {result.meta.structured ? (
              <>
                {a!.total_summary && (
                  <Card><CardContent className="pt-5 text-sm">{a!.total_summary}</CardContent></Card>
                )}
                {a!.by_category.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">By category</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <THead><TR><TH>Category</TH><TH>Amount</TH><TH>Share</TH></TR></THead>
                        <TBody>
                          {a!.by_category.map((c, i) => (
                            <TR key={i}><TD className="font-medium">{c.category}</TD><TD>{c.amount || "—"}</TD><TD>{c.share || "—"}</TD></TR>
                          ))}
                        </TBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
                {a!.top_vendors.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm"><Trophy className="h-4 w-4 text-primary" /> Top vendors</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      {a!.top_vendors.map((v, i) => (
                        <p key={i}><span className="font-medium">{v.vendor}</span>
                          {v.amount && <span className="text-muted-foreground"> — {v.amount}</span>}
                          {v.note && <span className="text-muted-foreground"> · {v.note}</span>}</p>
                      ))}
                    </CardContent>
                  </Card>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {a!.savings_opportunities.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><PiggyBank className="h-4 w-4 text-success" /> Savings opportunities</CardTitle></CardHeader>
                      <CardContent><BulletList items={a!.savings_opportunities} tone="bg-success" /></CardContent>
                    </Card>
                  )}
                  {a!.recommendations.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Lightbulb className="h-4 w-4 text-primary" /> Recommendations</CardTitle></CardHeader>
                      <CardContent><BulletList items={a!.recommendations} /></CardContent>
                    </Card>
                  )}
                </div>
                {a!.observations.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Observations</CardTitle></CardHeader>
                    <CardContent><BulletList items={a!.observations} /></CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card><CardContent className="whitespace-pre-wrap pt-6 text-sm">{result.meta.raw_text}</CardContent></Card>
            )}
          </>
        )}
        {!result && !error && (
          <Card><CardContent className="flex min-h-[16rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <Coins className="mb-2 h-8 w-8 text-primary/50" /> Paste spend data to see categories, top vendors and savings opportunities.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}

function VendorTask() {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<VendorResult | null>(null);

  async function run() {
    if (text.trim().length < 20) return;
    setBusy(true); setError(null);
    try {
      setResult(await apiPost<VendorResult>("/procurement-intelligence/vendor-comparison", { text }));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Comparison failed.");
    } finally { setBusy(false); }
  }
  const a = result?.analysis;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <InputCard value={text} onChange={setText} onRun={run} onSample={() => setText(VENDOR_SAMPLE)} onText={setText}
        busy={busy} label="Vendors / proposals" placeholder="Describe the vendors or paste their proposals…" />
      <div className="space-y-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        {result && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AnalysisMetaBar meta={result.meta} />
              <AnalysisActions center="procurement" result={a} onLoad={(r) => setResult({ analysis: r.result, meta: r.meta } as unknown as Parameters<typeof setResult>[0])} />
            </div>
            <UseCaseViews useCase={USE_CASES.procurement} meta={result.meta} />
            {result.meta.structured ? (
              <>
                {(a!.recommendation || a!.summary) && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Recommendation</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      {a!.recommendation && <p className="text-sm font-medium">{a!.recommendation}</p>}
                      {a!.rationale && <p className="text-sm text-muted-foreground">{a!.rationale}</p>}
                    </CardContent>
                  </Card>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {a!.vendors.map((v, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between gap-2 text-sm">
                          {v.name}
                          <Badge variant={ratingVariant(v.rating)} className="text-[10px] capitalize">{v.rating}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {v.strengths.length > 0 && (
                          <div><p className="text-xs font-medium text-success">Strengths</p><BulletList items={v.strengths} tone="bg-success" /></div>
                        )}
                        {v.weaknesses.length > 0 && (
                          <div><p className="text-xs font-medium text-warning">Weaknesses</p><BulletList items={v.weaknesses} tone="bg-warning" /></div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {a!.criteria.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Best by criterion</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <THead><TR><TH>Criterion</TH><TH>Best vendor</TH></TR></THead>
                        <TBody>
                          {a!.criteria.map((c, i) => (
                            <TR key={i}><TD>{c.criterion}</TD><TD className="font-medium">{c.best_vendor}</TD></TR>
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
        {!result && !error && (
          <Card><CardContent className="flex min-h-[16rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <Building2 className="mb-2 h-8 w-8 text-primary/50" /> Describe two or more vendors to get a structured comparison and a recommendation.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
