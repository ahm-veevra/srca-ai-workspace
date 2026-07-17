"use client";

import {
  AlertTriangle, Download, GraduationCap, Loader2, Play, RefreshCw, TrendingUp,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { apiFetch, apiPost, ApiRequestError } from "@/lib/api-client";

interface Stats {
  total: number; by_field: Record<string, number>; by_provider: Record<string, number>;
  by_language: Record<string, number>; avg_confidence: number | null;
  repeated_errors: { field_name: string; original_value: string; corrected_value: string; count: number }[];
}
interface Correction {
  id: string; field_name: string; original_value: string; corrected_value: string;
  provider_key: string | null; doc_type: string | null; confidence: number | null; created_at: string;
}
interface Job {
  id: string; key: string; name: string; status: string; base_model_key: string;
  result_model_key: string | null; metrics: Record<string, unknown>; error: string | null; created_at: string;
}

export function OcrLearning() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [history, setHistory] = React.useState<Correction[]>([]);
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  // Base model is resolved from the Capability Registry (chat-capable models), never hardcoded —
  // a model registered once is selectable here automatically.
  const [models, setModels] = React.useState<{ key: string; name: string }[]>([]);
  const [baseModel, setBaseModel] = React.useState("");

  React.useEffect(() => {
    apiFetch<{ kind: string; key: string; name: string }[]>(
      "/capabilities/chat/providers?available_only=true",
    )
      .then((ps) => {
        const ms = ps.filter((p) => p.kind === "model").map((p) => ({ key: p.key, name: p.name }));
        setModels(ms);
        setBaseModel((b) => b || ms[0]?.key || "");
      })
      .catch(() => setModels([]));
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [s, h, j] = await Promise.all([
        apiFetch<Stats>("/ocr/corrections/stats"),
        apiFetch<Correction[]>("/ocr/corrections?limit=50"),
        apiFetch<Job[]>("/finetune-jobs"),
      ]);
      setStats(s); setHistory(h); setJobs(j);
    } catch (e) {
      setErr(e instanceof ApiRequestError ? e.error.message : "Couldn't load OCR learning data.");
    } finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  async function improve() {
    setBusy(true); setMsg(null); setErr(null);
    try {
      const created = await apiPost<{ job_id: string; dataset_key: string; item_count: number }>("/ocr/improve", { base_model_key: baseModel });
      setMsg(`Created improvement job from ${created.item_count} correction(s) (dataset ${created.dataset_key}). Running…`);
      const ran = await apiPost<Job>(`/finetune-jobs/${created.job_id}/run`, {});
      setMsg(`Improvement job “${ran.key}” finished: ${ran.status}${ran.result_model_key ? ` → tuned model ${ran.result_model_key}` : ""}.`);
      await load();
    } catch (e) {
      setErr(e instanceof ApiRequestError ? e.error.message : "Improvement run failed.");
    } finally { setBusy(false); }
  }

  const ocrJobs = jobs.filter((j) => j.key.startsWith("ocr-improve") || j.name.toLowerCase().includes("ocr"));

  if (loading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading OCR learning data…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Base model
          <select
            value={baseModel}
            onChange={(e) => setBaseModel(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          >
            {models.length === 0 && <option value="">No models available</option>}
            {models.map((m) => (
              <option key={m.key} value={m.key}>{m.name}</option>
            ))}
          </select>
        </label>
        <Button onClick={improve} disabled={busy || !baseModel || (stats?.total ?? 0) === 0}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />} Create &amp; run OCR improvement job
        </Button>
        <a href="/api/v1/ocr/corrections/dataset" download className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2"><Download className="h-4 w-4" /> Export training dataset (JSONL)</a>
        <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
        {(stats?.total ?? 0) === 0 && <span className="text-xs text-muted-foreground">No corrections yet — correct some OCR output in a document use case first.</span>}
      </div>
      {msg && <p className="text-sm text-success">{msg}</p>}
      {err && <p className="text-sm text-danger">{err}</p>}

      {/* Accuracy signal */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Corrections captured</p><p className="font-display text-2xl font-bold">{stats?.total ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Avg confidence at correction</p><p className="font-display text-2xl font-bold">{stats?.avg_confidence != null ? `${Math.round(stats.avg_confidence * 100)}%` : "—"}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Improvement jobs</p><p className="font-display text-2xl font-bold">{ocrJobs.length}</p></CardContent></Card>
      </div>

      {/* Repeated errors */}
      {stats && stats.repeated_errors.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-warning" /> Repeated OCR errors</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Field</TH><TH>OCR said</TH><TH>Corrected to</TH><TH>Count</TH></TR></THead>
              <TBody>
                {stats.repeated_errors.map((r, i) => (
                  <TR key={i}><TD className="font-medium">{r.field_name}</TD><TD className="text-danger line-through">{r.original_value}</TD><TD className="text-success">{r.corrected_value}</TD><TD>{r.count}×</TD></TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Improvement jobs */}
      {ocrJobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4 text-primary" /> OCR improvement jobs (before / after)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Job</TH><TH>Base model</TH><TH>Status</TH><TH>Result</TH><TH>Metrics</TH></TR></THead>
              <TBody>
                {ocrJobs.map((j) => (
                  <TR key={j.id}>
                    <TD className="font-medium">{j.key}</TD>
                    <TD>{j.base_model_key}</TD>
                    <TD><Badge variant={j.status === "succeeded" || j.status === "completed" ? "success" : j.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{j.status}</Badge></TD>
                    <TD className="text-xs">{j.result_model_key ?? (j.error ? <span className="text-danger">{j.error}</span> : "—")}</TD>
                    <TD className="text-xs text-muted-foreground">{Object.keys(j.metrics || {}).length ? Object.entries(j.metrics).map(([k, v]) => `${k}: ${v}`).join(", ") : "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Correction history */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Correction history</CardTitle></CardHeader>
        <CardContent>
          {history.length ? (
            <Table>
              <THead><TR><TH>Field</TH><TH>Original</TH><TH>Corrected</TH><TH>Provider</TH><TH>Conf.</TH></TR></THead>
              <TBody>
                {history.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.field_name}</TD>
                    <TD className="max-w-[14rem] truncate text-danger">{c.original_value || "—"}</TD>
                    <TD className="max-w-[14rem] truncate text-success">{c.corrected_value}</TD>
                    <TD className="text-xs">{c.provider_key ?? "—"}</TD>
                    <TD className="text-xs">{c.confidence != null ? `${Math.round(c.confidence * 100)}%` : "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : <p className="text-sm text-muted-foreground">No corrections recorded yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
