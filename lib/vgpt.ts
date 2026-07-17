/** V-GPT engine — every capability is an AICP API call. The UI never touches a model, OCR
 * engine, vector store, generator or agent directly; it calls AICP /api/v1 and renders the
 * governed result. */
import { apiFetch, apiGet, apiPost, apiUpload } from "@/lib/api-client";
import type { Provenance } from "@/components/workspace/analysis-meta";

// ── types ────────────────────────────────────────────────────────────────────
export interface Attachment {
  id: string;
  name: string;
  kind: "document" | "image" | "audio";
  status: "processing" | "ready" | "error";
  text?: string;       // extracted/transcribed text (the AICP result we feed as context)
  detail?: string;     // engine / model used
  error?: string;
}

export interface MsgMeta {
  model: string | null;
  status: string;
  latencyMs: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cost?: string | null;
  currency?: string | null;
  policyPre?: string | null;
  policyPost?: string | null;
  traceId?: string | null;
  routeRule?: string | null;
  routeReason?: string | null;
  fallbacks?: string[];
  knowledge?: { key: string; name: string; auto: boolean; hits?: number } | null;
  promptLabel?: string;
  provenance?: Provenance | null;
}

export interface GeneratedFile { name: string; format: string; href: string }
export interface CompareCol { model: string; text: string; latencyMs: number; status: string; cost?: string }

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  meta?: MsgMeta;
  file?: GeneratedFile;
  mermaid?: string;
  compare?: CompareCol[];
  agent?: { name: string; status: string; tools?: string[]; traceId?: string };
  feedback?: "up" | "down" | null;
  formatId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  pinned?: boolean;
  archived?: boolean;
  updated: number;
}

export interface Collection { key: string; name: string; description?: string; docs?: number }
export interface ModelInfo { key: string; display_name?: string; modality: string; status: string }
export interface AgentInfo { id: string; key?: string; name?: string; status: string; tool_keys?: string[] }

// ── output formats ────────────────────────────────────────────────────────────
export const TEXT_FORMATS = [
  { id: "text", label: "Text", sys: "" },
  { id: "exec", label: "Executive Summary", sys: "Answer as a crisp executive summary: a one-line headline, then 3–5 key bullets. No preamble." },
  { id: "report", label: "Detailed Report", sys: "Answer as a structured report using clear Markdown headings and short paragraphs." },
  { id: "email", label: "Email Draft", sys: "Answer as a professional email draft: Subject line, greeting, body, and a courteous sign-off." },
  { id: "proposal", label: "Proposal", sys: "Answer as a concise business proposal: Overview, Scope, Approach, Timeline, and Value." },
  { id: "table", label: "Table", sys: "Answer as a single Markdown table with a clear header row." },
  { id: "json", label: "JSON", sys: "Answer with ONLY valid, minified JSON. No prose, no code fences." },
  { id: "markdown", label: "Markdown", sys: "Answer in clean, well-structured Markdown." },
] as const;

export const FILE_FORMATS = [
  { id: "docx", label: "Word Document", format: "docx" },
  { id: "xlsx", label: "Excel Spreadsheet", format: "xlsx" },
  { id: "pptx", label: "PowerPoint", format: "pptx" },
  { id: "pdf", label: "PDF Report", format: "pdf" },
] as const;

export const DIAGRAM_FORMATS = [
  { id: "flowchart", label: "Flowchart", kind: "flowchart" },
  { id: "diagram", label: "Diagram", kind: "diagram" },
  { id: "architecture", label: "Architecture Diagram", kind: "architecture" },
] as const;

export function formatLabel(id: string): string {
  return [...TEXT_FORMATS, ...FILE_FORMATS, ...DIAGRAM_FORMATS].find((f) => f.id === id)?.label ?? "Text";
}

/** A UUID v4 — used as the client-generated primary key the AICP conversation store
 * accepts verbatim (so streaming can patch a message under the same id). Falls back to a
 * Math.random v4 when crypto.randomUUID is unavailable (non-secure LAN/HTTP origins). */
export const newId = (): string => {
  const c = typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

function tenantHeader(): Record<string, string> {
  const m = typeof document !== "undefined" ? document.cookie.match(/(?:^|; )veevra_tenant=([^;]*)/) : null;
  return m ? { "X-Tenant-Id": decodeURIComponent(m[1]) } : {};
}

// ── AICP capability calls ──────────────────────────────────────────────────────

/** Upload a document/image to AICP, OCR it, and return the recognised text.
 * Note: images are read with OCR (text inside the image); visual/vision understanding
 * of an image is on the roadmap, so a picture with no text returns a clear message. */
export async function ingestFile(file: File, pipelineId?: string): Promise<Attachment> {
  const isImage = file.type.startsWith("image/");
  const kind: Attachment["kind"] = isImage ? "image" : "document";
  const att: Attachment = { id: newId(), name: file.name, kind, status: "processing" };
  try {
    const form = new FormData();
    form.append("file", file);
    // A selected OCR pipeline (traditional / vision / hybrid) processes the file through AICP;
    // otherwise the built-in OCR runs. Vision pipelines read images directly (no text needed).
    if (pipelineId) {
      const r = await apiUpload<{ text: string | null; engine: string; mode: string }>(
        `/ocr/pipelines/${pipelineId}/run`, form);
      const text = (r.text || "").trim();
      if (!text) return { ...att, status: "error", error: "No text was recognised by the pipeline." };
      return { ...att, status: "ready", text, detail: `${r.engine} · ${r.mode}` };
    }
    const doc = await apiUpload<{ text: string | null; engine: string | null; error: string | null }>("/documents?extract=false", form);
    const text = (doc.text || "").trim();
    if (!text) {
      const fallback = isImage
        ? "No text found in this image. Images are read with OCR (text inside the image); for visual/scanned documents, select a Vision or Hybrid OCR pipeline."
        : "No text could be recognised in this file.";
      return { ...att, status: "error", error: doc.error || fallback };
    }
    return { ...att, status: "ready", text, detail: doc.engine || "ocr" };
  } catch (e: any) {
    return { ...att, status: "error", error: apiErrText(e) || "Upload failed. Please try a different file." };
  }
}

export interface OcrPipelineOption { id: string; name: string; mode: string }

/** The tenant's OCR pipelines (for the V-GPT attach selector). */
export async function listOcrPipelines(): Promise<OcrPipelineOption[]> {
  try {
    return await apiGet<OcrPipelineOption[]>("/ocr/pipelines");
  } catch {
    return [];
  }
}

/** Pull a clear message (with optional fix/trace) out of an AICP API error envelope. */
function apiErrText(e: any): string | null {
  const err = e?.error;
  if (!err) return e?.message ?? null;
  let msg: string = err.message ?? "Request failed.";
  const fix = err.details?.fix;
  if (fix) msg += ` ${fix}`;
  if (err.trace_id) msg += ` (ref: ${err.trace_id})`;
  return msg;
}

/** Transcribe an audio file through AICP (Whisper). */
export async function transcribe(file: File): Promise<Attachment> {
  const att: Attachment = { id: newId(), name: file.name, kind: "audio", status: "processing" };
  try {
    const form = new FormData();
    form.append("file", file);
    const r = await apiUpload<{ text: string; model: string }>("/transcription/transcribe", form);
    const text = (r.text || "").trim();
    if (!text) return { ...att, status: "error", error: "No speech detected in the audio." };
    return { ...att, status: "ready", text, detail: r.model || "whisper" };
  } catch (e: any) {
    return { ...att, status: "error", error: apiErrText(e) || "Transcription failed. Check the audio format and try again." };
  }
}

export async function listCollections(): Promise<Collection[]> {
  try {
    const cols = await apiGet<any[]>("/knowledge/collections");
    return cols.map((c) => ({ key: c.key, name: c.name, description: c.description }));
  } catch { return []; }
}

export async function collectionDocCount(col: Collection): Promise<number | undefined> {
  // collections list lacks ids in our minimal type; fetch fresh to get the id, then docs.
  try {
    const cols = await apiGet<any[]>("/knowledge/collections");
    const full = cols.find((c) => c.key === col.key);
    if (!full?.id) return undefined;
    const docs = await apiGet<any[]>(`/knowledge/collections/${full.id}/documents`);
    return docs.length;
  } catch { return undefined; }
}

/** Auto-select the most relevant knowledge source by searching each and ranking top hits. */
export async function autoPickCollection(query: string, cols: Collection[]): Promise<{ col: Collection; hits: number } | null> {
  if (!cols.length || query.trim().length < 3) return null;
  const results = await Promise.allSettled(
    cols.map((c) => apiPost<{ hits: { score: number }[] }>("/knowledge/search", { collection: c.key, query, top_k: 3 })),
  );
  let bestCol: Collection | null = null;
  let bestScore = 0.25;
  let bestHits = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      const hits = r.value.hits || [];
      const top = hits[0]?.score ?? 0;
      if (top > bestScore) { bestScore = top; bestCol = cols[i]; bestHits = hits.length; }
    }
  });
  return bestCol ? { col: bestCol, hits: bestHits } : null;
}

export async function helpMeChoose(query: string, cols: Collection[]): Promise<string> {
  const list = cols.map((c) => `- ${c.name}: ${c.description || "no description"}`).join("\n");
  const res = await apiPost<any>("/inference", {
    system: "You help a business user pick the right knowledge source. Given the question and the available sources, name the single best source and explain why in one or two plain sentences. If none fit, say to answer generally.",
    prompt: `Question: ${query || "(none yet)"}\n\nAvailable knowledge sources:\n${list || "(none)"}`,
    intent: "chat", max_tokens: 200,
  });
  return res.output?.text?.trim() || "I couldn't determine the best source.";
}

const policyAction = (d: any): string | null => (d && typeof d.action === "string" ? d.action : null);

function metaFrom(res: any, latencyMs: number): MsgMeta {
  return {
    model: res?.selected_model_key ?? null,
    status: res?.status ?? "completed",
    latencyMs: res?.latency_ms ?? latencyMs,
    inputTokens: res?.usage?.input_tokens,
    outputTokens: res?.usage?.output_tokens,
    cost: res?.usage?.cost ?? null,
    currency: res?.usage?.currency ?? null,
    policyPre: policyAction(res?.policy?.pre),
    policyPost: policyAction(res?.policy?.post),
    traceId: res?.trace_id ?? null,
    provenance: res?.provenance ?? null,
  };
}

/** Read a governed SSE inference stream from `url`. Calls onToken as tokens arrive; resolves with
 * the final meta from the terminal `done` event. Shared by chat and the capability workspace so
 * both consume the identical governed stream. */
async function streamSSE(
  url: string,
  body: Record<string, unknown>,
  onToken: (t: string) => void,
  signal: AbortSignal,
): Promise<MsgMeta> {
  const t0 = performance.now();
  const res = await fetch(url, {
    method: "POST", credentials: "include", signal,
    headers: { "Content-Type": "application/json", ...tenantHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(`stream failed (${res.status})`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = ""; let done: any = null;
  for (;;) {
    const { value, done: d } = await reader.read();
    if (d) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
    for (const p of parts) {
      const line = p.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const j = line.slice(5).trim(); if (!j) continue;
      try {
        const ev = JSON.parse(j);
        if (ev.type === "token") onToken(ev.text ?? "");
        else if (ev.type === "done") done = ev;
      } catch { /* partial */ }
    }
  }
  return metaFrom(done, performance.now() - t0);
}

/** Stream a chat answer (SSE). Calls onToken as tokens arrive; resolves with the final meta. */
export async function streamChat(
  body: Record<string, unknown>,
  onToken: (t: string) => void,
  signal: AbortSignal,
): Promise<MsgMeta> {
  return streamSSE("/api/v1/inference/stream", body, onToken, signal);
}

/** Stream a governed capability run (SSE). The capability resolves its own model, knowledge and
 * system prompt server-side; the client just sends the latest input + prior turns for memory, and
 * an optional `sources` scope (the 'Search in' selector) narrowing grounding to chosen sources. */
export async function streamCapability(
  id: string,
  body: {
    input: string;
    messages?: { role: "user" | "assistant"; content: string }[];
    sources?: string[];
  },
  onToken: (t: string) => void,
  signal: AbortSignal,
): Promise<MsgMeta> {
  return streamSSE(`/api/v1/ai-capabilities/${id}/run/stream`, body, onToken, signal);
}

export async function runInference(body: Record<string, unknown>): Promise<{ text: string; meta: MsgMeta }> {
  const t0 = performance.now();
  const res = await apiPost<any>("/inference", body);
  return { text: res.output?.text ?? "", meta: metaFrom(res, performance.now() - t0) };
}

/** Build a structured document spec for a file format via the gateway, then render it. */
const SPEC_SYS: Record<string, string> = {
  docx: 'Produce ONLY a JSON document spec, no prose, no code fences: {"title": string, "subtitle": string, "sections": [{"heading": string, "paragraphs": [string], "bullets": [string], "table": {"columns": [string], "rows": [[string]]}}]}. Omit empty fields.',
  pdf: 'Produce ONLY a JSON document spec, no prose, no code fences: {"title": string, "subtitle": string, "sections": [{"heading": string, "paragraphs": [string], "bullets": [string], "table": {"columns": [string], "rows": [[string]]}}]}. Omit empty fields.',
  xlsx: 'Produce ONLY a JSON spreadsheet spec, no prose, no code fences: {"title": string, "sheets": [{"name": string, "columns": [string], "rows": [[string]]}]}.',
  pptx: 'Produce ONLY a JSON slide-deck spec, no prose, no code fences: {"title": string, "subtitle": string, "slides": [{"title": string, "bullets": [string]}]}.',
};

function extractJson(raw: string): any {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

/** Generate a real file (DOCX/XLSX/PPTX/PDF) end to end via AICP. Returns a blob URL. */
export async function generateFile(
  format: string, request: string,
): Promise<{ file: GeneratedFile; meta: MsgMeta }> {
  const { text, meta } = await runInference({
    system: SPEC_SYS[format], prompt: request, intent: "document.generate", max_tokens: 1500, temperature: 0.2,
  });
  const spec = extractJson(text) || { title: "Document", sections: [{ paragraphs: [text || request] }] };
  // POST the spec to the AICP generation service and download the bytes.
  const res = await fetch("/api/v1/generation/document", {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", ...tenantHeader() },
    body: JSON.stringify({ ...spec, format }),
  });
  if (!res.ok) throw new Error(`generation failed (${res.status})`);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const title = (spec.title || "document").toString().replace(/[^\w -]+/g, "").trim() || "document";
  return { file: { name: `${title}.${format}`, format, href }, meta };
}

/** Ask the gateway for Mermaid diagram code. */
export async function generateMermaid(kind: string, request: string): Promise<{ code: string; meta: MsgMeta }> {
  const { text, meta } = await runInference({
    system: `Produce ONLY Mermaid diagram code for a ${kind}. No prose, no markdown fences. Use 'graph TD' for flow/architecture or 'flowchart LR' as appropriate. Keep node labels short.`,
    prompt: request, intent: "diagram", max_tokens: 700, temperature: 0.2,
  });
  let code = text.trim().replace(/^```(mermaid)?/i, "").replace(/```$/i, "").trim();
  if (!/^(graph|flowchart|sequenceDiagram|classDiagram)/.test(code)) code = "graph TD\n" + code;
  return { code, meta };
}

interface CapabilityProvider {
  kind: string; key: string; name: string; status: string; modality?: string | null;
}

export async function listModels(): Promise<ModelInfo[]> {
  try {
    // Single source of truth: every chat-capable model from the Model Registry, resolved by
    // CAPABILITY (not the single `modality` field) so multi-capability models (e.g. Qwen, a
    // vision model that also does chat) appear here automatically.
    const providers = await apiGet<CapabilityProvider[]>(
      "/capabilities/chat/providers?available_only=true",
    );
    return providers
      .filter((p) => p.kind === "model")
      .map((p) => ({ key: p.key, display_name: p.name, modality: p.modality ?? "", status: "enabled" }));
  } catch { return []; }
}

export async function compareModels(prompt: string, system: string): Promise<CompareCol[]> {
  const models = await listModels();
  const cols = await Promise.all(models.map(async (m) => {
    const t0 = performance.now();
    try {
      const r = await apiPost<any>("/inference", { prompt, system: system || undefined, model_key: m.key, intent: "chat", max_tokens: 600 });
      return { model: m.key, text: r.output?.text ?? "(no output)", latencyMs: Math.round(performance.now() - t0), status: r.status, cost: r.usage?.cost };
    } catch (e: any) {
      return { model: m.key, text: e?.error?.message || "failed", latencyMs: Math.round(performance.now() - t0), status: "error" };
    }
  }));
  return cols;
}

export async function listAgents(): Promise<AgentInfo[]> {
  try {
    const a = await apiGet<AgentInfo[]>("/agents");
    return a.filter((x) => ["active", "enabled"].includes(x.status));
  } catch { return []; }
}

export async function runAgent(agent: AgentInfo, input: string): Promise<Message> {
  const t0 = performance.now();
  const r = await apiPost<any>(`/agents/${agent.id}/run`, { input });
  const out = r.output?.answer ?? r.output?.text ?? (typeof r.output === "string" ? r.output : JSON.stringify(r.output ?? {}));
  return {
    id: newId(), role: "assistant",
    content: r.status === "completed" ? String(out) : `Agent run ${r.status}${r.error ? `: ${r.error}` : ""}.`,
    agent: { name: agent.name || agent.key || "agent", status: r.status, tools: agent.tool_keys, traceId: (r.trace_ids || [])[0] },
    meta: { model: null, status: r.status, latencyMs: Math.round(performance.now() - t0), traceId: (r.trace_ids || [])[0] ?? null },
  };
}

export async function getExplanation(traceId: string): Promise<any | null> {
  try { return await apiFetch<any>(`/explanations/${traceId}`); } catch { return null; }
}
