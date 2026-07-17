"use client";

import { Clock, FileDown, FileText, Loader2, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { apiDelete, apiDownload, apiGet, ApiRequestError } from "@/lib/api-client";
import { useT } from "@/lib/i18n";

interface HistoryItem { id: string; center: string; title: string; created_at: string }
interface Detail extends HistoryItem { result: Record<string, unknown>; meta: Record<string, unknown> }

/** Reusable Export (PDF/Word) + Saved-history actions for every Intelligence Center.
 * Export renders the current structured result via AICP's generic report builder; the
 * history dropdown lists this center's saved analyses (persisted automatically on analyse)
 * and re-opens one via `onLoad`. */
export function AnalysisActions({
  center, result, onLoad,
}: {
  center: string;
  result: unknown;
  onLoad?: (r: { result: Record<string, unknown>; meta: Record<string, unknown> }) => void;
}) {
  const t = useT();
  const [items, setItems] = React.useState<HistoryItem[]>([]);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadList = React.useCallback(() => {
    apiGet<HistoryItem[]>(`/intelligence/history?center=${center}`).then(setItems).catch(() => setItems([]));
  }, [center]);
  React.useEffect(loadList, [loadList]);

  async function exportDoc(format: "pdf" | "docx") {
    if (!result) return;
    setBusy(format);
    setError(null);
    try {
      await apiDownload("/intelligence/export", { center, result, format }, `${center}-analysis.${format}`);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.error.message : t("sf.act.exportFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function openRecord(id: string) {
    try {
      const d = await apiGet<Detail>(`/intelligence/history/${id}`);
      onLoad?.({ result: d.result, meta: d.meta });
      setOpen(false);
    } catch { /* ignore */ }
  }

  async function removeRecord(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await apiDelete(`/intelligence/history/${id}`).catch(() => {});
    loadList();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {result != null && (
        <>
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => exportDoc("pdf")}>
            {busy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} PDF
          </Button>
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => exportDoc("docx")}>
            {busy === "docx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} Word
          </Button>
        </>
      )}
      <div className="relative">
        <Button size="sm" variant="outline" onClick={() => { setOpen((o) => !o); loadList(); }}>
          <Clock className="h-3.5 w-3.5" /> {t("sf.act.saved")} {items.length > 0 ? `(${items.length})` : ""}
        </Button>
        {open && (
          <div className="absolute end-0 z-20 mt-1 max-h-80 w-72 overflow-auto rounded-md border border-border bg-surface-1 p-1 shadow-lg">
            {items.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">{t("sf.act.noSaved")}</p>
            ) : (
              items.map((it) => (
                <div key={it.id} className="group flex items-center gap-1 rounded px-2 py-1.5 text-xs hover:bg-surface-2/60">
                  <button onClick={() => openRecord(it.id)} className="min-w-0 flex-1 text-start">
                    <span className="block truncate font-medium text-foreground">{it.title}</span>
                    <span className="text-muted-foreground" suppressHydrationWarning>{new Date(it.created_at).toLocaleString()}</span>
                  </button>
                  <button onClick={(e) => removeRecord(it.id, e)} className="rounded p-1 text-muted-foreground opacity-0 hover:text-danger group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
