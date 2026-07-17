"use client";

import { AlertTriangle, CheckCircle2, Circle, Loader2, MinusCircle, Play, XCircle } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { execute } from "@/components/workspace/usecase-workbench";
import { USE_CASE_CATALOG, CATEGORY_ORDER, type UseCaseDef } from "@/lib/usecase-catalog";

type Verdict = "idle" | "running" | "pass" | "warn" | "fail" | "skip";
interface Row { verdict: Verdict; latencyMs?: number; note?: string }

function demoVals(uc: UseCaseDef): Record<string, string> {
  const v: Record<string, string> = {};
  uc.inputs.forEach((f) => (v[f.name] = f.demo ?? f.sample));
  return v;
}

function VerdictIcon({ v }: { v: Verdict }) {
  if (v === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (v === "pass") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (v === "warn") return <AlertTriangle className="h-4 w-4 text-warning" />;
  if (v === "fail") return <XCircle className="h-4 w-4 text-danger" />;
  if (v === "skip") return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
  return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function CoverageDashboard() {
  const [rows, setRows] = React.useState<Record<string, Row>>(() => {
    const init: Record<string, Row> = {};
    USE_CASE_CATALOG.forEach((u) => (init[u.key] = { verdict: "idle" }));
    return init;
  });
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  async function runAll() {
    setRunning(true);
    setProgress(0);
    let done = 0;
    for (const uc of USE_CASE_CATALOG) {
      setRows((r) => ({ ...r, [uc.key]: { verdict: "running" } }));
      try {
        const res = await execute(uc, demoVals(uc));
        const status = res.meta?.status;
        const verdict: Verdict = status === "failed" || status === "blocked" || status === "error" ? "fail"
          : status === "skipped" ? "skip"
          : status === "empty" ? "warn" : "pass";
        setRows((r) => ({ ...r, [uc.key]: { verdict, latencyMs: res.meta?.latencyMs ?? undefined, note: status ?? undefined } }));
      } catch (e) {
        setRows((r) => ({ ...r, [uc.key]: { verdict: "fail", note: (e as Error).message } }));
      }
      done += 1;
      setProgress(Math.round((done / USE_CASE_CATALOG.length) * 100));
    }
    setRunning(false);
  }

  const counts = React.useMemo(() => {
    const c = { pass: 0, warn: 0, fail: 0, skip: 0, tested: 0 };
    Object.values(rows).forEach((r) => {
      if (r.verdict === "pass") c.pass++;
      else if (r.verdict === "warn") c.warn++;
      else if (r.verdict === "fail") c.fail++;
      else if (r.verdict === "skip") c.skip++;
      if (["pass", "warn", "fail", "skip"].includes(r.verdict)) c.tested++;
    });
    return c;
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runAll} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? `Testing… ${progress}%` : "Run live tests (all use cases)"}
        </Button>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="success">{counts.pass} pass</Badge>
          {counts.warn > 0 && <Badge variant="warning">{counts.warn} no-data</Badge>}
          {counts.skip > 0 && <Badge variant="secondary">{counts.skip} skipped</Badge>}
          {counts.fail > 0 && <Badge variant="destructive">{counts.fail} fail</Badge>}
          <span className="text-muted-foreground">{counts.tested}/{USE_CASE_CATALOG.length} tested</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Each test runs the use case&apos;s demo input through its real AICP API and records the result.
        “No-data” means the endpoint worked but the tenant has nothing seeded yet (e.g. an empty review
        queue). Tests run sequentially against the on-prem model, so a full pass takes a minute or two.
      </p>

      {CATEGORY_ORDER.map((cat) => {
        const items = USE_CASE_CATALOG.filter((u) => u.category === cat);
        return (
          <Card key={cat}>
            <CardContent className="pt-4">
              <p className="mb-2 font-display text-sm font-semibold">{cat}</p>
              <Table>
                <THead>
                  <TR>
                    <TH className="w-8"></TH>
                    <TH>AICP Capability</TH>
                    <TH>Use Case</TH>
                    <TH>AICP API</TH>
                    <TH>Permission</TH>
                    <TH>Result</TH>
                  </TR>
                </THead>
                <TBody>
                  {items.map((u) => {
                    const row = rows[u.key];
                    return (
                      <TR key={u.key}>
                        <TD><VerdictIcon v={row.verdict} /></TD>
                        <TD className="font-medium">{u.capability}</TD>
                        <TD><Link href={`/use-cases/${u.key}`} className="text-primary hover:underline">{u.title}</Link></TD>
                        <TD><code className="text-[11px]">{u.config.apis[0]}</code></TD>
                        <TD className="text-xs text-muted-foreground">{u.config.permissions.join(", ")}</TD>
                        <TD className="text-xs">
                          {row.verdict === "idle" && <span className="text-muted-foreground">Ready</span>}
                          {row.verdict === "running" && <span className="text-primary">Running…</span>}
                          {row.verdict === "pass" && <span className="text-success">Working{row.latencyMs != null ? ` · ${Math.round(row.latencyMs)} ms` : ""}</span>}
                          {row.verdict === "warn" && <span className="text-warning">Working (no data)</span>}
                          {row.verdict === "skip" && <span className="text-muted-foreground">Skipped — run from page (needs a file)</span>}
                          {row.verdict === "fail" && <span className="text-danger">{row.note || "Failed"}</span>}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
