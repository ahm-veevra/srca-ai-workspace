"use client";

import { Clock, FileDown, FileText, Loader2, Search, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AnalysisMetaBar, type AnalysisMeta } from "@/components/workspace/analysis-meta";
import { apiDelete, apiDownload, apiGet } from "@/lib/api-client";

interface HistoryItem {
  id: string;
  center: string;
  title: string;
  input_preview: string;
  created_at: string;
}
interface Detail extends HistoryItem {
  result: Record<string, unknown>;
  meta: AnalysisMeta;
}

/** Human label per center key (mirrors the backend CENTER_LABELS). */
const CENTER_LABELS: Record<string, string> = {
  document: "Documents",
  correspondence: "Correspondence",
  contract: "Contract",
  rfp: "RFP & Tender",
  research: "Research",
  meeting: "Meeting",
  hr: "HR",
  procurement: "Procurement",
  project: "Project",
  executive: "Executive",
  compliance: "Compliance",
};

function centerLabel(c: string): string {
  return CENTER_LABELS[c] ?? c;
}

/** Compact, read-only renderer for a saved structured result of any shape. */
function ResultView({ value }: { value: unknown }): React.ReactElement {
  if (value == null || value === "") return <span className="text-muted-foreground">—</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>;
    if (value.every((v) => typeof v !== "object" || v === null)) {
      return (
        <ul className="list-disc space-y-0.5 ps-5">
          {value.map((v, i) => <li key={i}>{String(v)}</li>)}
        </ul>
      );
    }
    return (
      <div className="space-y-2">
        {value.map((v, i) => (
          <div key={i} className="rounded border border-border/60 p-2">
            <ResultView value={v} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([k]) => !k.startsWith("_"),
    );
    return (
      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[10rem_1fr] gap-2 text-sm">
            <span className="font-medium capitalize text-muted-foreground">
              {k.replace(/_/g, " ")}
            </span>
            <div><ResultView value={v} /></div>
          </div>
        ))}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

/** Unified audit trail of every saved Intelligence Center analysis for the tenant.
 * Reads the same generic /intelligence/history endpoints used by each center; lets
 * users filter by center, search, re-open, export (PDF/Word) and delete. */
export function IntelligenceHistory() {
  const [items, setItems] = React.useState<HistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [center, setCenter] = React.useState<string>("");
  const [query, setQuery] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<HistoryItem[]>("/intelligence/history?limit=200")
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);
  React.useEffect(load, [load]);

  const centers = React.useMemo(
    () => Array.from(new Set(items.map((i) => i.center))).sort(),
    [items],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!center || i.center === center) &&
        (!q || i.title.toLowerCase().includes(q) || i.input_preview.toLowerCase().includes(q)),
    );
  }, [items, center, query]);

  async function toggle(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    try {
      setDetail(await apiGet<Detail>(`/intelligence/history/${id}`));
    } catch {
      setOpenId(null);
    }
  }

  async function exportRecord(id: string, format: "pdf" | "docx") {
    setBusy(`${id}:${format}`);
    try {
      await apiDownload(`/intelligence/history/${id}/export?format=${format}`, {}, `analysis.${format}`);
    } catch {
      /* surfaced by the download helper */
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await apiDelete(`/intelligence/history/${id}`).catch(() => {});
    if (openId === id) { setOpenId(null); setDetail(null); }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1" style={{ minWidth: 240 }}>
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search saved analyses…"
            className="ps-8"
          />
        </div>
        <select
          value={center}
          onChange={(e) => setCenter(e.target.value)}
          className="h-9 rounded-md border border-border bg-[hsl(var(--input))] px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <option value="">All centers</option>
          {centers.map((c) => <option key={c} value={c}>{centerLabel(c)}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />} Refresh
        </Button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No saved analyses{center ? ` for ${centerLabel(center)}` : ""} yet. Run an analysis in any
            Intelligence Center and it will be saved here automatically.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filtered.length} saved {filtered.length === 1 ? "analysis" : "analyses"}</p>
          {filtered.map((it) => (
            <Card key={it.id} className="overflow-hidden">
              <div
                role="button" tabIndex={0}
                onClick={() => toggle(it.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(it.id); } }}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-start hover:bg-surface-2/40"
              >
                <span className="shrink-0 rounded-full border border-border bg-surface-2/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {centerLabel(it.center)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{it.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{it.input_preview}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground" suppressHydrationWarning>
                  {new Date(it.created_at).toLocaleString()}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm" variant="ghost" title="Export PDF"
                    disabled={busy === `${it.id}:pdf`}
                    onClick={(e) => { e.stopPropagation(); exportRecord(it.id, "pdf"); }}
                  >
                    {busy === `${it.id}:pdf` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="sm" variant="ghost" title="Export Word"
                    disabled={busy === `${it.id}:docx`}
                    onClick={(e) => { e.stopPropagation(); exportRecord(it.id, "docx"); }}
                  >
                    {busy === `${it.id}:docx` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="sm" variant="ghost" title="Delete"
                    className="text-muted-foreground hover:text-danger"
                    onClick={(e) => remove(it.id, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </div>
              {openId === it.id && (
                <div className="border-t border-border bg-surface-1/40 px-4 py-3">
                  {detail == null ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
                  ) : (
                    <div className="space-y-3">
                      <AnalysisMetaBar meta={detail.meta} />
                      <ResultView value={detail.result} />
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
