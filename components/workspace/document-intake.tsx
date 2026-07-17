"use client";

import {
  AlertTriangle, CheckCircle2, FileText, Loader2, RefreshCw, ScanText, Send, ShieldCheck,
  Sparkles, Tags, Upload, UploadCloud, X, XCircle,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, apiPost, ApiRequestError } from "@/lib/api-client";

// ── AICP contracts (subset we consume) ───────────────────────────────────────
interface DocDetail {
  id: string; filename: string; mime: string; bytes: number; status: string;
  classification: string; engine: string | null; pages: number;
  text: string | null; extraction: Record<string, unknown> | null; error: string | null;
}
interface OcrWord { text: string; x: number; y: number; w: number; h: number; conf: number | null }
interface OcrExtract {
  provider: string; backend: string; text: string; confidence: number; confidence_threshold: number;
  low_confidence: boolean; page_count: number; language: string | null; doc_type: string | null;
  fields: Record<string, string>;
}

const MAX_BYTES = 25 * 1024 * 1024;
// Browser-accepted types that AICP's /documents endpoint can ingest (images, PDF, Office, text).
const ACCEPT = ".pdf,.docx,.xlsx,.doc,.xls,.png,.jpg,.jpeg,.tif,.tiff,.txt,.csv,.json,.xml,image/*,application/pdf,text/plain";
const IS_DEV = process.env.NODE_ENV !== "production";

function fmtBytes(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

/** Structured upload/processing error surfaced from AICP's error envelope. */
interface UploadErrorInfo {
  message: string; status: number; code?: string; step?: string; traceId?: string;
  endpoint?: string; raw?: unknown;
}
function parseErr(status: number, text: string, endpoint?: string): UploadErrorInfo {
  try {
    const j = JSON.parse(text); const e = j?.error ?? {};
    const d = e.details ?? {};
    return {
      message: e.message || j?.detail || `Request failed (HTTP ${status})`, status,
      code: e.code, step: d.step, traceId: e.trace_id, endpoint: d.endpoint ?? endpoint, raw: j,
    };
  } catch {
    return { message: text?.slice(0, 200) || `Request failed (HTTP ${status})`, status, endpoint };
  }
}

interface DebugRec {
  endpoint: string; payload: { filename: string; mime: string; bytes: number };
  status?: number; traceId?: string; step?: string; error?: UploadErrorInfo;
}

/** Multipart upload to AICP with progress, reusing the first-party cookie + tenant override. */
function uploadDocument(file: File, onProgress: (pct: number) => void): Promise<DocDetail> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    // OCR only here; the workbench runs the rich /ocr/extract separately for fields/confidence.
    xhr.open("POST", "/api/v1/documents?extract=false");
    xhr.withCredentials = true;
    const tenant = document.cookie.match(/(?:^|; )veevra_tenant=([^;]*)/);
    if (tenant) xhr.setRequestHeader("X-Tenant-Id", decodeURIComponent(tenant[1]));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject({ message: "AICP returned an unreadable response.", status: xhr.status, step: "upload", endpoint: "POST /api/v1/documents" } as UploadErrorInfo); }
      } else {
        reject(parseErr(xhr.status, xhr.responseText, "POST /api/v1/documents"));
      }
    };
    xhr.onerror = () => reject({ message: "Network error during upload — please check your connection.", status: 0, step: "upload", endpoint: "POST /api/v1/documents" } as UploadErrorInfo);
    xhr.send(form);
  });
}

type Phase = "idle" | "uploading" | "processing" | "review" | "error";

const TIMELINE = ["Upload to AICP", "OCR recognition", "Classify & extract", "Review & correct"];

export function DocumentIntake({
  fillField, publish, defaultCollection = "knowledge-base", large = false, onContinue, onText,
}: {
  /** When the corrected text should feed a use-case field, the workbench passes a handler. */
  fillField?: string;
  /** Show "Publish to knowledge base" (RAG / search use cases). */
  publish?: boolean;
  defaultCollection?: string;
  /** Full-screen mode — enlarge the document preview. */
  large?: boolean;
  onContinue?: () => void;
  onText?: (text: string) => void;
}) {
  const previewH = large ? "max-h-[78vh]" : "max-h-[28rem]";
  const frameH = large ? "h-[78vh]" : "h-[28rem]";
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [progress, setProgress] = React.useState(0);
  const [step, setStep] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [errInfo, setErrInfo] = React.useState<UploadErrorInfo | null>(null);
  const [debug, setDebug] = React.useState<DebugRec | null>(null);
  const [previewFailed, setPreviewFailed] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [doc, setDoc] = React.useState<DocDetail | null>(null);
  const [extract, setExtract] = React.useState<OcrExtract | null>(null);
  const [words, setWords] = React.useState<OcrWord[]>([]);
  const [dragOver, setDragOver] = React.useState(false);

  // editable correction state
  const [text, setText] = React.useState("");
  const [docType, setDocType] = React.useState("");
  const [language, setLanguage] = React.useState("");
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [reason, setReason] = React.useState("");
  const [submitState, setSubmitState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedCount, setSavedCount] = React.useState(0);
  const [pubState, setPubState] = React.useState<"idle" | "saving" | "done" | "error">("idle");
  const [pubMsg, setPubMsg] = React.useState("");

  // original values to diff corrections against
  const orig = React.useRef<{ text: string; docType: string; language: string; fields: Record<string, string> }>({ text: "", docType: "", language: "", fields: {} });

  function validate(f: File): string | null {
    if (f.size > MAX_BYTES) return `“${f.name}” is ${fmtBytes(f.size)} — over the 25 MB limit.`;
    if (f.size === 0) return `“${f.name}” is empty.`;
    return null;
  }

  async function handleFile(f: File) {
    const dbg: DebugRec = { endpoint: "POST /api/v1/documents", payload: { filename: f.name, mime: f.type || "application/octet-stream", bytes: f.size }, step: "file_validation" };
    setDebug(dbg); setErrInfo(null); setPreviewFailed(false);
    const v = validate(f);
    if (v) {
      const info: UploadErrorInfo = { message: v, status: 0, step: "file_validation", endpoint: dbg.endpoint };
      setError(v); setErrInfo(info); setDebug({ ...dbg, error: info }); setPhase("error"); setFile(f); return;
    }
    setFile(f); setError(null); setProgress(0); setStep(0); setPhase("uploading");
    setDebug({ ...dbg, step: "upload" });
    try {
      const d = await uploadDocument(f, setProgress);
      setDebug((p) => (p ? { ...p, status: 201, step: "ocr", traceId: undefined } : p));
      setDoc(d); setStep(1); setPhase("processing");
      // Second AICP call: rich OCR/doc-intelligence extraction (fields, language, confidence).
      let ex: OcrExtract | null = null;
      if (d.text) {
        try { ex = await apiPost<OcrExtract>("/ocr/extract", { text: d.text, mime: "text/plain" }); } catch { /* keep going */ }
      }
      setExtract(ex); setStep(2);
      // Positioned OCR boxes (images only) for the overlay + low-confidence highlights.
      try { const lay = await apiFetch<{ words: OcrWord[] }>(`/documents/${d.id}/layout`); setWords(lay.words ?? []); } catch { /* */ }
      const t = d.text ?? ex?.text ?? "";
      const dt = (ex?.doc_type ?? (d.extraction?.doc_type as string) ?? d.classification ?? "") || "";
      const lang = ex?.language ?? "";
      const fl = ex?.fields ?? {};
      setText(t); setDocType(dt); setLanguage(lang); setFields(fl);
      orig.current = { text: t, docType: dt, language: lang, fields: { ...fl } };
      setStep(3); setPhase("review");
    } catch (e) {
      const info = (e && typeof e === "object" && "message" in e)
        ? (e as UploadErrorInfo)
        : { message: "Upload failed.", status: 0 } as UploadErrorInfo;
      setError(info.message); setErrInfo(info);
      setDebug((p) => (p ? { ...p, status: info.status, traceId: info.traceId, step: info.step ?? p.step, error: info } : p));
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle"); setDoc(null); setExtract(null); setWords([]); setError(null);
    setErrInfo(null); setDebug(null); setPreviewFailed(false);
    setText(""); setDocType(""); setLanguage(""); setFields({}); setReason("");
    setSubmitState("idle"); setSavedCount(0); setPubState("idle"); setPubMsg("");
  }

  async function submitCorrections() {
    if (!doc) return;
    const corrections: { field_name: string; original_value: string; corrected_value: string }[] = [];
    if (text !== orig.current.text) corrections.push({ field_name: "full_text", original_value: orig.current.text.slice(0, 4000), corrected_value: text.slice(0, 4000) });
    if (docType !== orig.current.docType) corrections.push({ field_name: "doc_type", original_value: orig.current.docType, corrected_value: docType });
    if (language !== orig.current.language) corrections.push({ field_name: "language", original_value: orig.current.language, corrected_value: language });
    for (const [k, v] of Object.entries(fields)) {
      if (v !== (orig.current.fields[k] ?? "")) corrections.push({ field_name: k, original_value: orig.current.fields[k] ?? "", corrected_value: v });
    }
    if (!corrections.length) { setSubmitState("saved"); setSavedCount(0); return; }
    setSubmitState("saving");
    try {
      let ok = 0;
      for (const c of corrections) {
        if (!c.corrected_value) continue;
        await apiPost("/ocr/corrections", {
          field_name: c.field_name, corrected_value: c.corrected_value, original_value: c.original_value,
          document_id: doc.id, provider_key: extract?.provider ?? doc.engine ?? "built-in",
          doc_type: docType || null, confidence: extract?.confidence ?? null,
          reason: reason || "User correction in SRCA AI Workspace OCR review",
        });
        ok += 1;
      }
      orig.current = { text, docType, language, fields: { ...fields } };
      setSavedCount(ok); setSubmitState("saved");
    } catch {
      setSubmitState("error");
    }
  }

  async function publishToKb() {
    if (!doc) return;
    setPubState("saving"); setPubMsg("");
    try {
      const r = await apiPost<{ chunks: number; status: string }>(`/documents/${doc.id}/publish`, { collection_key: defaultCollection, redact: true });
      setPubState("done"); setPubMsg(`Published — ${r.chunks} chunk(s) indexed into “${defaultCollection}”.`);
    } catch (e) {
      setPubState("error"); setPubMsg(e instanceof ApiRequestError ? e.error.message : "Publish failed.");
    }
  }

  const avgConf = extract?.confidence ?? (words.length ? words.reduce((s, w) => s + (w.conf ?? 0), 0) / words.filter((w) => w.conf != null).length : null);
  const threshold = extract?.confidence_threshold ?? 0.6;
  const lowWords = words.filter((w) => w.conf != null && w.conf < threshold);
  const isImage = (doc?.mime ?? "").startsWith("image/");
  const isPdf = (doc?.mime ?? "") === "application/pdf";

  // ── Upload surface ──────────────────────────────────────────────────────────
  if (phase === "idle" || phase === "error") {
    return (
      <div className="space-y-2">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border bg-surface-2/30")}
        >
          <UploadCloud className="h-8 w-8 text-primary/60" />
          <p className="text-sm font-medium">Drag &amp; drop a document, or</p>
          <label className="cursor-pointer">
            <input type="file" className="hidden" accept={ACCEPT}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"><Upload className="h-4 w-4" /> Choose file</span>
          </label>
          <p className="text-xs text-muted-foreground">PDF, Word, Excel, image (PNG/JPG/TIFF), or text — up to 25 MB. Processed by AICP.</p>
        </div>
        {phase === "error" && errInfo && (
          <div className="space-y-1 rounded-md border border-danger/40 bg-danger/5 p-2.5 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-danger"><XCircle className="h-4 w-4 shrink-0" /> {friendlyMessage(errInfo)}</p>
            <p className="text-xs text-muted-foreground">
              {errInfo.step && <>Step: <span className="font-medium">{errInfo.step}</span> · </>}
              {errInfo.status > 0 && <>HTTP {errInfo.status} · </>}
              {errInfo.traceId && <>trace <code className="text-[10px]">{errInfo.traceId}</code></>}
            </p>
            {file && <button onClick={() => handleFile(file)} className="text-xs font-medium text-primary hover:underline">Retry</button>}
          </div>
        )}
        {IS_DEV && debug && <DebugPanel debug={debug} />}
      </div>
    );
  }

  // ── Progress / processing ─────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Processing timeline */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/60 bg-surface-2/30 p-2.5">
        {TIMELINE.map((t, i) => (
          <React.Fragment key={t}>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
              i < step ? "bg-success/10 text-success" : i === step ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
              {i < step ? <CheckCircle2 className="h-3 w-3" /> : i === step && phase !== "review" ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              {t}
            </span>
            {i < TIMELINE.length - 1 && <span className="text-muted-foreground">→</span>}
          </React.Fragment>
        ))}
        <button onClick={reset} className="ms-auto text-xs text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
      </div>

      {IS_DEV && debug && <DebugPanel debug={debug} />}

      {phase === "uploading" && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Uploading {file?.name} ({file ? fmtBytes(file.size) : ""}) to AICP…</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      {phase === "processing" && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> AICP is running OCR and extraction…</p>}

      {phase === "review" && doc && (
        <>
          {/* OCR Result Viewer header */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/60 bg-surface-2/40 p-2.5 text-xs">
            <Badge variant="secondary" className="gap-1 text-[10px]"><ScanText className="h-3 w-3" /> {extract?.provider ?? doc.engine ?? "OCR"}</Badge>
            {doc.engine && <span className="text-muted-foreground">engine: {doc.engine}</span>}
            <span className="text-muted-foreground">{doc.pages} page(s)</span>
            {language && <span className="text-muted-foreground">lang: {language}</span>}
            {avgConf != null && <Badge variant={avgConf < threshold ? "warning" : "success"} className="text-[10px]">confidence {Math.round(avgConf * 100)}%</Badge>}
            {extract?.low_confidence && <span className="flex items-center gap-1 text-warning"><AlertTriangle className="h-3 w-3" /> low confidence — review</span>}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {/* Document preview + overlay */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-primary" /> Original — {doc.filename}</CardTitle></CardHeader>
              <CardContent>
                {previewFailed ? (
                  <div className="flex h-[16rem] flex-col items-center justify-center gap-2 rounded border border-border bg-surface-2/30 text-center text-sm text-muted-foreground">
                    <AlertTriangle className="h-6 w-6 text-warning" />
                    Inline preview unavailable for this file.
                  </div>
                ) : isImage ? (
                  <div className="relative inline-block max-w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/v1/documents/${doc.id}/download?inline=true`} alt={doc.filename}
                      onError={() => setPreviewFailed(true)}
                      className={cn(previewH, "w-auto rounded border border-border")} />
                    {lowWords.map((w, i) => (
                      <span key={i} title={`${w.text} · ${Math.round((w.conf ?? 0) * 100)}%`}
                        className="absolute border border-warning bg-warning/20"
                        style={{ left: `${w.x * 100}%`, top: `${w.y * 100}%`, width: `${w.w * 100}%`, height: `${w.h * 100}%` }} />
                    ))}
                  </div>
                ) : isPdf ? (
                  <iframe src={`/api/v1/documents/${doc.id}/download?inline=true`} title={doc.filename}
                    onError={() => setPreviewFailed(true)}
                    className={cn(frameH, "w-full rounded border border-border")} />
                ) : (
                  <pre className={cn(previewH, "overflow-auto whitespace-pre-wrap rounded border border-border bg-surface-2/30 p-2 text-[11px]")}>{doc.text}</pre>
                )}
                {isImage && lowWords.length > 0 && <p className="mt-1 text-[11px] text-warning">{lowWords.length} low-confidence word(s) highlighted.</p>}
                <a href={`/api/v1/documents/${doc.id}/download?inline=true`} target="_blank" rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Open original in a new tab
                </a>
              </CardContent>
            </Card>

            {/* OCR text + corrections */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" /> OCR result — correct if needed</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-muted-foreground">Classification
                    <input value={docType} onChange={(e) => setDocType(e.target.value)} className="mt-0.5 w-full rounded border border-border bg-[hsl(var(--input))] px-2 py-1 text-sm" />
                  </label>
                  <label className="text-[11px] text-muted-foreground">Language
                    <input value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-0.5 w-full rounded border border-border bg-[hsl(var(--input))] px-2 py-1 text-sm" />
                  </label>
                </div>
                {Object.keys(fields).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Extracted fields</p>
                    {Object.entries(fields).map(([k, v]) => (
                      <label key={k} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="w-28 shrink-0 truncate">{k}</span>
                        <input value={v} onChange={(e) => setFields({ ...fields, [k]: e.target.value })} className="flex-1 rounded border border-border bg-[hsl(var(--input))] px-2 py-1 text-sm text-foreground" />
                      </label>
                    ))}
                  </div>
                )}
                <label className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Recognised text</label>
                <textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[10rem] w-full resize-y rounded border border-border bg-[hsl(var(--input))] p-2 text-sm" />
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for correction (optional)" className="w-full rounded border border-border bg-[hsl(var(--input))] px-2 py-1 text-xs" />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={submitCorrections} disabled={submitState === "saving"}>
                    {submitState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit corrections to AICP
                  </Button>
                  {submitState === "saved" && <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" /> {savedCount > 0 ? `${savedCount} correction(s) sent for OCR learning` : "No changes to send"}</span>}
                  {submitState === "error" && <span className="text-xs text-danger">Couldn’t save corrections.</span>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Continue / publish */}
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Continue the use case with the corrected text:</span>
            {fillField && onText && (
              <Button size="sm" onClick={() => { onText(text); onContinue?.(); }}><Sparkles className="h-4 w-4" /> Use this text &amp; run</Button>
            )}
            {publish && (
              <Button size="sm" variant="outline" onClick={publishToKb} disabled={pubState === "saving"}>
                {pubState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Publish to knowledge base
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={reset}><RefreshCw className="h-4 w-4" /> New document</Button>
            {pubMsg && <span className={cn("text-xs", pubState === "error" ? "text-danger" : "text-success")}>{pubMsg}</span>}
          </div>
          {doc.error && <p className="text-xs text-warning">Extraction note: {doc.error}</p>}
        </>
      )}
    </div>
  );
}

/** Turn a structured AICP error into one clear, business-friendly sentence. */
function friendlyMessage(e: UploadErrorInfo): string {
  switch (e.code) {
    case "unsupported_media_type":
      return e.message; // already lists the allowed types
    case "file_too_large":
      return e.message;
    case "empty_file":
      return "That file is empty — pick a different document.";
    case "storage_error":
      return "AICP couldn't store the file (object storage is unavailable). Please try again.";
    case "document_ingest_error":
      return "AICP couldn't process the document. Please try again or use a different file.";
    case "forbidden":
      return "You don't have permission to upload documents. Ask an administrator for the knowledge.write permission.";
    case "unauthenticated":
      return "Your session expired — please sign in again.";
    default:
      return e.message || "The upload failed. Please try again.";
  }
}

/** Development-only panel exposing exactly what was sent and what AICP returned. */
function DebugPanel({ debug }: { debug: DebugRec }) {
  return (
    <details className="rounded-md border border-amber-300/50 bg-amber-50/60 p-2 text-[11px] dark:bg-amber-500/5">
      <summary className="cursor-pointer font-semibold text-amber-700">Upload debug (dev)</summary>
      <dl className="mt-1.5 grid grid-cols-[110px_1fr] gap-x-2 gap-y-0.5">
        <dt className="text-muted-foreground">Endpoint</dt><dd><code>{debug.endpoint}</code></dd>
        <dt className="text-muted-foreground">File</dt><dd>{debug.payload.filename}</dd>
        <dt className="text-muted-foreground">MIME</dt><dd>{debug.payload.mime}</dd>
        <dt className="text-muted-foreground">Size</dt><dd>{fmtBytes(debug.payload.bytes)}</dd>
        <dt className="text-muted-foreground">Step</dt><dd>{debug.step ?? "—"}</dd>
        <dt className="text-muted-foreground">Status</dt><dd>{debug.status ?? "(pending)"}</dd>
        <dt className="text-muted-foreground">Trace ID</dt><dd>{debug.traceId ? <code>{debug.traceId}</code> : "—"}</dd>
      </dl>
      {debug.error && (
        <pre className="mt-1.5 max-h-40 overflow-auto rounded bg-surface-2/60 p-1.5">{JSON.stringify(debug.error.raw ?? debug.error, null, 2)}</pre>
      )}
    </details>
  );
}
