"use client";

import { CheckCircle2, FileUp, Loader2, Workflow, XCircle } from "lucide-react";
import * as React from "react";

import { apiGet, apiUpload, ApiRequestError } from "@/lib/api-client";
import { useT } from "@/lib/i18n";

const ACCEPT =
  ".pdf,.docx,.xlsx,.doc,.xls,.png,.jpg,.jpeg,.tif,.tiff,.txt,.csv,.json,.xml,image/*,application/pdf,text/plain";
const MAX_BYTES = 25 * 1024 * 1024;

interface UploadedDoc { text: string | null; engine: string | null; status: string; error: string | null }
interface Pipeline { id: string; name: string; mode: string }
interface PipelineRun { text: string; engine: string; mode: string; trace_ids: string[] }

/** Upload a real document through AICP (OCR) and hand the recognised text back via `onText`.
 * Used by the Intelligence Centers. An optional OCR pipeline (traditional / vision / hybrid)
 * can be chosen — the file is then processed through that governed pipeline; otherwise the
 * built-in OCR is used. AICP does the OCR — never the UI. */
export function UploadDocButton({
  onText, label,
}: {
  onText: (text: string) => void;
  label?: string;
}) {
  const t = useT();
  const lbl = label ?? t("ci.upload.label");
  const [state, setState] = React.useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pipelines, setPipelines] = React.useState<Pipeline[]>([]);
  const [pipeline, setPipeline] = React.useState("");

  React.useEffect(() => {
    apiGet<Pipeline[]>("/ocr/pipelines").then(setPipelines).catch(() => setPipelines([]));
  }, []);

  async function handle(f?: File) {
    if (!f) return;
    if (f.size > MAX_BYTES) { setState("error"); setMsg(t("ci.upload.overLimit", { name: f.name })); return; }
    setState("busy"); setMsg(f.name);
    try {
      const form = new FormData();
      form.append("file", f);
      let text = "";
      let engine = "ocr";
      if (pipeline) {
        const r = await apiUpload<PipelineRun>(`/ocr/pipelines/${pipeline}/run`, form);
        text = (r.text || "").trim();
        engine = `${r.engine} · ${r.mode}`;
      } else {
        // OCR only — Centers just need the recognised text, not the slower LLM extraction.
        const doc = await apiUpload<UploadedDoc>("/documents?extract=false", form);
        text = (doc.text || "").trim();
        engine = doc.engine ?? "ocr";
        if (!text && doc.error) { setState("error"); setMsg(t("ci.upload.noTextErr", { err: doc.error })); return; }
      }
      if (!text) { setState("error"); setMsg(t("ci.upload.noText")); return; }
      onText(text);
      setState("done"); setMsg(t("ci.upload.loaded", { name: f.name, engine }));
    } catch (e) {
      setState("error");
      setMsg(e instanceof ApiRequestError ? e.error.message : t("ci.upload.failed"));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pipelines.length > 0 && (
        <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Workflow className="h-3.5 w-3.5" />
          <select value={pipeline} onChange={(e) => setPipeline(e.target.value)}
            className="rounded-md border border-border bg-[hsl(var(--input))] px-2 py-1 text-xs">
            <option value="">{t("ci.upload.builtinOcr")}</option>
            {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.mode})</option>)}
          </select>
        </label>
      )}
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-surface-2">
        <input type="file" className="hidden" accept={ACCEPT} disabled={state === "busy"}
          onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
        {state === "busy" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />} {lbl}
      </label>
      {state === "busy" && <span className="text-xs text-muted-foreground">{t("ci.upload.processing")}</span>}
      {state === "done" && <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" /> {msg}</span>}
      {state === "error" && <span className="flex items-center gap-1 text-xs text-danger"><XCircle className="h-3.5 w-3.5" /> {msg}</span>}
    </div>
  );
}
