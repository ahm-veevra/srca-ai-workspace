"use client";

import {
  AlertTriangle, CheckCircle2, CircleSlash, Loader2, MinusCircle, PlayCircle, XCircle,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiPost, ApiRequestError } from "@/lib/api-client";

interface Check {
  key: string; label: string; category: string; status: string;
  detail: string; latency_ms: number | null;
}
interface Report {
  checks: Check[]; passed: number; warnings: number; failed: number;
  skipped: number; healthy: boolean;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-warning" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-danger" />;
  return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
}

export function ValidationCenter() {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<Report | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setReport(await apiPost<Report>("/aicp-validation/run", {}));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : "Validation failed to run.");
    } finally {
      setBusy(false);
    }
  }

  const categories = report
    ? Array.from(new Set(report.checks.map((c) => c.category)))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {report && (
            <Badge variant={report.healthy ? "success" : report.failed > 0 ? "destructive" : "warning"}>
              {report.healthy ? "All systems healthy" : `${report.failed} failing`}
            </Badge>
          )}
          {report && (
            <span className="text-sm text-muted-foreground">
              {report.passed} passed · {report.warnings} warnings · {report.failed} failed
              {report.skipped ? ` · ${report.skipped} skipped` : ""}
            </span>
          )}
        </div>
        <Button onClick={run} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          {report ? "Re-run validation" : "Run validation"}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!report && !busy && !error && (
        <Card>
          <CardContent className="flex min-h-[14rem] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <CircleSlash className="mb-2 h-8 w-8 text-primary/50" />
            Run a live validation to check AICP end to end — the AI gateway, routing, embeddings,
            knowledge, document intelligence and governance. Every check exercises the real
            platform; nothing is mocked.
          </CardContent>
        </Card>
      )}

      {busy && !report && (
        <Card>
          <CardContent className="flex min-h-[14rem] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Running live checks against AICP…
          </CardContent>
        </Card>
      )}

      {report && categories.map((cat) => (
        <Card key={cat}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{cat}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {report.checks.filter((c) => c.category === cat).map((c) => (
              <div key={c.key} className="flex items-start gap-2.5 rounded-md border border-border/60 p-2.5">
                <span className="mt-0.5"><StatusIcon status={c.status} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{c.label}</span>
                    {c.latency_ms != null && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">{Math.round(c.latency_ms)} ms</span>
                    )}
                  </div>
                  {c.detail && <p className="text-xs text-muted-foreground">{c.detail}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
