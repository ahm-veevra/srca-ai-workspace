"use client";

import {
  Archive, Bot, Boxes, Check, ChevronDown, Copy, Database, Download, FileDown, FileSpreadsheet,
  FileText, GitCompare, HelpCircle, Info, Loader2, MessageSquarePlus, Mic, Network, Paperclip,
  Pencil, Pin, Presentation, RefreshCw, Search, Send, ShieldCheck, Sparkles, Square, ThumbsDown,
  ThumbsUp, Trash2, Wand2, X,
} from "lucide-react";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { aicpHref } from "@/lib/aicp";
import {
  createConversation, deleteConversation as deleteConversationRemote, deleteMessage,
  listConversations, patchConversation, saveMessage,
} from "@/lib/conversations";
import {
  DIAGRAM_FORMATS, FILE_FORMATS, TEXT_FORMATS, autoPickCollection, compareModels, formatLabel,
  generateFile, generateMermaid, getExplanation, helpMeChoose, ingestFile, listAgents,
  listCollections, listOcrPipelines, newId, runAgent, runInference, streamChat, transcribe,
  type AgentInfo, type Attachment, type Collection, type Conversation, type Message, type MsgMeta,
  type OcrPipelineOption,
} from "@/lib/vgpt";

const ATT_CAP = 6000;

export function VGpt() {
  const [convos, setConvos] = React.useState<Conversation[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);

  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState<Attachment[]>([]);
  const [formatId, setFormatId] = React.useState("text");
  const [mode, setMode] = React.useState<"chat" | "compare" | "agent">("chat");
  const [knowMode, setKnowMode] = React.useState<"auto" | "advanced">("auto");
  const [knowKey, setKnowKey] = React.useState("");
  const [collections, setCollections] = React.useState<Collection[]>([]);
  const [agents, setAgents] = React.useState<AgentInfo[]>([]);
  const [ocrPipelines, setOcrPipelines] = React.useState<OcrPipelineOption[]>([]);
  const [ocrPipeline, setOcrPipeline] = React.useState("");
  const [agentId, setAgentId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [streamId, setStreamId] = React.useState<string | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [helpMsg, setHelpMsg] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);
  const recRef = React.useRef<MediaRecorder | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const convosRef = React.useRef<Conversation[]>([]);  // always-current convos for async flows

  // ── persistence (server-side, scoped to tenant + user) ──
  // History lives in the AICP conversation store, not localStorage, so it survives a cache
  // clear and follows the user across devices. `persist()` updates local state only; the
  // server is synced at semantic points (new turn, final answer, feedback, rename/pin/archive,
  // delete) — never per streaming token — by the helpers below.
  const ensureRef = React.useRef<Map<string, Promise<unknown>>>(new Map());
  React.useEffect(() => {
    listConversations()
      .then((cs) => { convosRef.current = cs; setConvos(cs); setActiveId(cs[0]?.id ?? null); })
      .catch(() => { /* offline / unauthenticated — start empty */ });
    listCollections().then(setCollections);
    listAgents().then(setAgents);
    listOcrPipelines().then(setOcrPipelines);
  }, []);
  const persist = React.useCallback((next: Conversation[]) => {
    convosRef.current = next;
    setConvos(next);
  }, []);

  // Create the conversation on the server at most once (idempotent on the client id).
  const ensureConvo = React.useCallback((cid: string, title: string): Promise<unknown> => {
    let p = ensureRef.current.get(cid);
    if (!p) { p = createConversation(cid, title).catch(() => undefined); ensureRef.current.set(cid, p); }
    return p;
  }, []);
  const pushMessage = React.useCallback((cid: string, title: string, m: Message) => {
    ensureConvo(cid, title).then(() => saveMessage(cid, m)).catch(() => { /* best-effort */ });
  }, [ensureConvo]);
  // Persist a message already present in local state (terminal assistant turns, feedback).
  const syncMsg = React.useCallback((cid: string, mid: string) => {
    const c = convosRef.current.find((x) => x.id === cid);
    const m = c?.messages.find((x) => x.id === mid);
    if (c && m) pushMessage(cid, c.title, m);
  }, [pushMessage]);
  const pushConvoPatch = React.useCallback((cid: string, patch: { title?: string; pinned?: boolean; archived?: boolean }) => {
    patchConversation(cid, patch).catch(() => { /* best-effort */ });
  }, []);
  const removeConvoRemote = React.useCallback((cid: string) => {
    ensureRef.current.delete(cid);
    deleteConversationRemote(cid).catch(() => { /* best-effort */ });
  }, []);

  const active = convos.find((c) => c.id === activeId) ?? null;
  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages.length, busy, streamId]);

  // UI-side patch (current active conversation)
  function patchMsg(id: string, patch: Partial<Message>) {
    persist(convosRef.current.map((c) => c.id !== activeId ? c : { ...c, messages: c.messages.map((m) => m.id === id ? { ...m, ...patch } : m) }));
  }
  // async-flow helpers keyed on a captured conversation id (immune to stale state)
  function appendById(cid: string, msg: Message) {
    persist(convosRef.current.map((c) => c.id === cid ? { ...c, messages: [...c.messages, msg], updated: Date.now() } : c));
  }
  function patchById(cid: string, mid: string, patch: Partial<Message>) {
    persist(convosRef.current.map((c) => c.id === cid ? { ...c, messages: c.messages.map((m) => m.id === mid ? { ...m, ...patch } : m) } : c));
  }
  function hasMsg(cid: string, mid: string) {
    return convosRef.current.find((c) => c.id === cid)?.messages.some((m) => m.id === mid) ?? false;
  }

  function newConversation(): Conversation {
    const c: Conversation = { id: newId(), title: "New conversation", messages: [], updated: Date.now() };
    persist([c, ...convosRef.current]); setActiveId(c.id); return c;
  }

  // ── attachments ──
  async function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    for (const f of arr) {
      const placeholder: Attachment = { id: newId(), name: f.name, kind: f.type.startsWith("image/") ? "image" : f.type.startsWith("audio/") ? "audio" : "document", status: "processing" };
      setPending((p) => [...p, placeholder]);
      const done = f.type.startsWith("audio/") ? await transcribe(f) : await ingestFile(f, ocrPipeline || undefined);
      setPending((p) => p.map((a) => a.id === placeholder.id ? { ...done, id: placeholder.id } : a));
    }
  }

  async function toggleRecord() {
    if (recording) { recRef.current?.stop(); setRecording(false); return; }
    // Browsers only allow microphone access on secure origins (HTTPS) or localhost.
    if (typeof window === "undefined" || !window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setNotice("Voice recording needs a secure (HTTPS) connection or localhost. Over a LAN/HTTP address your browser blocks the microphone — attach an audio file (MP3/WAV/M4A) instead, it's transcribed by AICP.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
        await addFiles([file]);
      };
      recRef.current = rec; rec.start(); setRecording(true); setNotice(null);
    } catch {
      setNotice("Microphone access was blocked. Allow it in your browser, or attach an audio file instead.");
    }
  }

  // ── send ──
  async function send(reuse?: { text: string; atts: Attachment[] }) {
    const text = (reuse?.text ?? input).trim();
    const atts = reuse?.atts ?? pending.filter((a) => a.status === "ready" || a.status === "error");
    if ((!text && atts.length === 0) || busy) return;
    if (pending.some((a) => a.status === "processing")) { setNotice("Attachments are still processing…"); return; }

    // resolve or create the conversation, capturing its id for the whole async flow
    let cid = activeId;
    let priorMsgs: Message[] = [];
    if (!cid || !convosRef.current.some((c) => c.id === cid)) {
      const c: Conversation = { id: newId(), title: (text || atts[0]?.name || "New").slice(0, 48), messages: [], updated: Date.now() };
      persist([c, ...convosRef.current]); setActiveId(c.id); cid = c.id;
    } else {
      priorMsgs = convosRef.current.find((c) => c.id === cid)!.messages;
    }
    if (!reuse) { setInput(""); setPending([]); setHelpMsg(null); }

    const userMsg: Message = { id: newId(), role: "user", content: text || "(see attachments)", attachments: atts.length ? atts : undefined, formatId };
    persist(convosRef.current.map((c) => c.id === cid ? { ...c, title: c.messages.length === 0 ? (text || atts[0]?.name || "New").slice(0, 48) : c.title, messages: [...c.messages, userMsg], updated: Date.now() } : c));
    const convoTitle = convosRef.current.find((c) => c.id === cid)?.title ?? "New conversation";
    pushMessage(cid, convoTitle, userMsg);

    const attCtx = atts.filter((a) => a.text).map((a) => `[Attached ${a.kind}: ${a.name}]\n${a.text!.slice(0, ATT_CAP)}`).join("\n\n");
    const apiContent = [attCtx, text].filter(Boolean).join("\n\n");

    setBusy(true);
    const aId = newId();
    let acc = "";
    try {
      // AGENT mode
      if (mode === "agent" && agentId) {
        const agent = agents.find((a) => a.id === agentId)!;
        const m = await runAgent(agent, apiContent);
        appendById(cid, { ...m, id: aId });
        syncMsg(cid, aId);
        return;
      }
      const fmtSys = TEXT_FORMATS.find((f) => f.id === formatId)?.sys ?? "";

      // COMPARE mode
      if (mode === "compare") {
        appendById(cid, { id: aId, role: "assistant", content: "", compare: [], formatId });
        const cols = await compareModels(apiContent, fmtSys);
        patchById(cid, aId, { compare: cols });
        syncMsg(cid, aId);
        return;
      }

      // FILE generation (DOCX / XLSX / PPTX / PDF)
      if (FILE_FORMATS.some((f) => f.id === formatId)) {
        appendById(cid, { id: aId, role: "assistant", content: `Generating your ${formatLabel(formatId)}…`, formatId });
        const { file, meta } = await generateFile(formatId, apiContent);
        patchById(cid, aId, { content: `Your ${formatLabel(formatId)} is ready: ${file.name}`, file, meta });
        syncMsg(cid, aId);
        return;
      }

      // DIAGRAM (Mermaid)
      if (DIAGRAM_FORMATS.some((f) => f.id === formatId)) {
        appendById(cid, { id: aId, role: "assistant", content: `Generating your ${formatLabel(formatId)}…`, formatId });
        const kind = DIAGRAM_FORMATS.find((f) => f.id === formatId)!.kind;
        const { code, meta } = await generateMermaid(kind, apiContent);
        patchById(cid, aId, { content: "", mermaid: code, meta });
        syncMsg(cid, aId);
        return;
      }

      // CHAT (streamed) with optional knowledge grounding
      let knowledge: MsgMeta["knowledge"] = null;
      let knowBody: any = undefined;
      if (knowMode === "advanced" && knowKey) {
        const col = collections.find((c) => c.key === knowKey);
        knowledge = { key: knowKey, name: col?.name ?? knowKey, auto: false };
        knowBody = { collection: knowKey, top_k: 5 };
      } else if (knowMode === "auto" && collections.length) {
        const picked = await autoPickCollection(apiContent, collections);
        if (picked) { knowledge = { key: picked.col.key, name: picked.col.name, auto: true, hits: picked.hits }; knowBody = { collection: picked.col.key, top_k: 5 }; }
      }

      const history = [...priorMsgs, userMsg].filter((m) => m.role === "user" || m.role === "assistant" && m.content)
        .map((m) => ({ role: m.role, content: m.id === userMsg.id ? apiContent : m.content }));
      const promptLabel = formatId !== "text" ? formatLabel(formatId) : undefined;
      appendById(cid, { id: aId, role: "assistant", content: "", meta: { model: null, status: "streaming", latencyMs: null, knowledge, promptLabel }, formatId });

      setStreamId(aId);
      const ac = new AbortController(); abortRef.current = ac;
      const meta = await streamChat(
        { messages: history, system: fmtSys || undefined, intent: "chat", knowledge: knowBody, max_tokens: 1500 },
        (tok) => { acc += tok; patchById(cid!, aId, { content: acc }); },
        ac.signal,
      );
      patchById(cid, aId, { content: acc || "(no output)", meta: { ...meta, knowledge, promptLabel } });
      syncMsg(cid, aId);
    } catch (e: any) {
      const aborted = e?.name === "AbortError";
      const msg = aborted ? (acc || "(stopped)") : (e?.error?.message || e?.message || "Request failed.");
      const failMeta: MsgMeta = { model: null, status: aborted ? "stopped" : "failed", latencyMs: null };
      if (hasMsg(cid, aId)) patchById(cid, aId, { content: msg, meta: failMeta });
      else appendById(cid, { id: aId, role: "assistant", content: msg, meta: failMeta });
      syncMsg(cid, aId);
    } finally {
      setBusy(false); setStreamId(null); abortRef.current = null;
    }
  }

  function stop() { abortRef.current?.abort(); }

  function regenerate() {
    if (!active || busy) return;
    const cid = active.id;
    const msgs = active.messages;
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === "user") { lastUserIdx = i; break; }
    if (lastUserIdx < 0) return;
    const u = msgs[lastUserIdx];
    // Drop the superseded turn (this user message + everything after) on the server too,
    // so a reload doesn't resurrect the replaced answer.
    for (const m of msgs.slice(lastUserIdx)) deleteMessage(cid, m.id).catch(() => { /* best-effort */ });
    persist(convosRef.current.map((c) => c.id === cid ? { ...c, messages: c.messages.slice(0, lastUserIdx) } : c));
    setTimeout(() => send({ text: typeof u.content === "string" && u.content !== "(see attachments)" ? u.content : "", atts: u.attachments ?? [] }), 30);
  }

  async function doHelpChoose() {
    setHelpMsg("…"); setKnowMode("advanced");
    const ans = await helpMeChoose(input, collections);
    setHelpMsg(ans);
  }

  // ── conversation actions ──
  const shown = convos
    .filter((c) => showArchived ? c.archived : !c.archived)
    .filter((c) => !filter || c.title.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated);

  function exportConvo() {
    if (!active) return;
    const md = [`# ${active.title}`, ""].concat(active.messages.map((m) => m.role === "user" ? `**You:** ${m.content}` : `**V-GPT${m.meta?.model ? ` (${m.meta.model})` : ""}:** ${m.content}`)).join("\n\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    a.download = `${active.title.replace(/[^\w]+/g, "-").slice(0, 40) || "conversation"}.md`;
    a.click();
  }

  const fileInput = React.useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-3 lg:grid-cols-[270px_1fr]" style={{ height: "calc(100vh - 12rem)" }}>
      {/* Sidebar */}
      <div className="flex min-h-0 flex-col gap-2">
        <Button onClick={newConversation} className="w-full justify-start"><MessageSquarePlus className="h-4 w-4" /> New chat</Button>
        <div className="relative">
          <Search className="absolute start-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="ps-7" placeholder="Search conversations" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <button onClick={() => setShowArchived((v) => !v)} className="self-start text-[11px] text-muted-foreground hover:text-foreground">{showArchived ? "← Back to active" : "View archived"}</button>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {shown.map((c) => (
            <div key={c.id} className={cn("group flex items-center gap-0.5 rounded-md py-1 ps-2 pe-1 text-sm", c.id === activeId ? "bg-primary/10 text-primary" : "hover:bg-muted/50")}>
              {c.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
              <button onClick={() => setActiveId(c.id)} className="min-w-0 flex-1 truncate py-1 text-start">{c.title}</button>
              <div className="flex shrink-0 items-center opacity-60 transition-opacity group-hover:opacity-100">
                <button title={c.pinned ? "Unpin" : "Pin"} onClick={() => { persist(convos.map((x) => x.id === c.id ? { ...x, pinned: !x.pinned } : x)); pushConvoPatch(c.id, { pinned: !c.pinned }); }} className={cn("rounded p-1 hover:bg-surface-3", c.pinned ? "text-primary" : "text-muted-foreground hover:text-primary")}><Pin className="h-3.5 w-3.5" /></button>
                <button title="Rename" onClick={() => { const t = window.prompt("Rename conversation", c.title); if (t) { persist(convos.map((x) => x.id === c.id ? { ...x, title: t } : x)); pushConvoPatch(c.id, { title: t }); } }} className="rounded p-1 text-muted-foreground hover:bg-surface-3 hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                <button title={c.archived ? "Unarchive" : "Archive"} onClick={() => { persist(convos.map((x) => x.id === c.id ? { ...x, archived: !x.archived } : x)); pushConvoPatch(c.id, { archived: !c.archived }); }} className="rounded p-1 text-muted-foreground hover:bg-surface-3 hover:text-foreground"><Archive className="h-3.5 w-3.5" /></button>
                <button title="Delete" onClick={async () => { if (!(await confirmDialog("Delete this conversation?"))) return; const next = convos.filter((x) => x.id !== c.id); persist(next); removeConvoRemote(c.id); if (activeId === c.id) setActiveId(next[0]?.id ?? null); }} className="rounded p-1 text-muted-foreground hover:bg-surface-3 hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
          {shown.length === 0 && <p className="px-2 py-4 text-xs text-muted-foreground">No conversations.</p>}
        </div>
      </div>

      {/* Thread */}
      <div className={cn("flex min-h-0 flex-col rounded-lg border border-border bg-surface-1", dragOver && "ring-2 ring-accent")}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}>
        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-xs">
          <div className="inline-flex overflow-hidden rounded-md border border-border">
            {(["chat", "compare", "agent"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={cn("px-2.5 py-1 capitalize", mode === m ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}>{m === "compare" ? <GitCompare className="me-1 inline h-3 w-3" /> : m === "agent" ? <Bot className="me-1 inline h-3 w-3" /> : <Sparkles className="me-1 inline h-3 w-3" />}{m}</button>
            ))}
          </div>
          {mode === "agent" && (
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="rounded-md border border-border bg-[hsl(var(--input))] px-2 py-1">
              <option value="">Select an agent…</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name || a.key}</option>)}
            </select>
          )}
          {mode === "chat" && (
            <>
              <span className="text-muted-foreground">Format</span>
              <select value={formatId} onChange={(e) => setFormatId(e.target.value)} className="rounded-md border border-border bg-[hsl(var(--input))] px-2 py-1">
                <optgroup label="Text">{TEXT_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</optgroup>
                <optgroup label="Document">{FILE_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</optgroup>
                <optgroup label="Diagram">{DIAGRAM_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</optgroup>
              </select>
              <span className="ms-1 inline-flex items-center gap-1 text-muted-foreground"><Database className="h-3 w-3" /> Knowledge</span>
              <div className="inline-flex overflow-hidden rounded-md border border-border">
                <button onClick={() => setKnowMode("auto")} className={cn("px-2 py-1", knowMode === "auto" ? "bg-primary/15 text-primary" : "text-muted-foreground")}>Auto</button>
                <button onClick={() => setKnowMode("advanced")} className={cn("px-2 py-1", knowMode === "advanced" ? "bg-primary/15 text-primary" : "text-muted-foreground")}>Advanced</button>
              </div>
              {knowMode === "advanced" && (
                <>
                  <select value={knowKey} onChange={(e) => setKnowKey(e.target.value)} className="rounded-md border border-border bg-[hsl(var(--input))] px-2 py-1" title={collections.find((c) => c.key === knowKey)?.description}>
                    <option value="">No source (general)</option>
                    {collections.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                  </select>
                  <button onClick={doHelpChoose} className="inline-flex items-center gap-1 text-primary hover:underline"><HelpCircle className="h-3 w-3" /> Help me choose</button>
                </>
              )}
            </>
          )}
          <Button variant="outline" size="sm" className="ms-auto" onClick={exportConvo} disabled={!active || active.messages.length === 0}><Download className="h-3.5 w-3.5" /> Export</Button>
        </div>

        {helpMsg && knowMode === "advanced" && (
          <div className="mx-3 mt-2 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{helpMsg === "…" ? <Loader2 className="h-3 w-3 animate-spin" /> : helpMsg}</span>
            <button onClick={() => setHelpMsg(null)} className="ms-auto text-muted-foreground"><X className="h-3 w-3" /></button>
          </div>
        )}

        {/* messages */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {!active || active.messages.length === 0 ? (
            <Welcome onPick={(t) => setInput(t)} />
          ) : (
            active.messages.map((m) => <Bubble key={m.id} m={m} streaming={m.id === streamId} onCopy={() => navigator.clipboard.writeText(m.content)} onFeedback={(f) => { const nf = m.feedback === f ? null : f; patchMsg(m.id, { feedback: nf }); if (active) pushMessage(active.id, active.title, { ...m, feedback: nf }); }} onRegenerate={regenerate} />)
          )}
          {busy && !streamId && <div className="flex items-center gap-2 text-sm text-muted-foreground"><TypingDots /> AICP is preparing your answer…</div>}
          <div ref={endRef} />
        </div>

        {/* composer */}
        <div className="border-t border-border p-3">
          {notice && (
            <div className="mb-2 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-2 text-xs">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <span>{notice}</span>
              <button onClick={() => setNotice(null)} className="ms-auto shrink-0 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
            </div>
          )}
          {recording && (
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-danger">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" /> Recording… click the mic again to stop and transcribe.
            </div>
          )}
          {pending.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {pending.map((a) => (
                <span key={a.id} className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs", a.status === "error" ? "border-danger/40 text-danger" : "border-border")}>
                  {a.status === "processing" ? <Loader2 className="h-3 w-3 animate-spin" /> : a.kind === "audio" ? <Mic className="h-3 w-3" /> : a.kind === "image" ? <FileText className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                  {a.name}{a.status === "ready" && a.detail ? ` · ${a.detail}` : ""}{a.status === "error" ? ` · ${a.error}` : ""}
                  <button onClick={() => setPending((p) => p.filter((x) => x.id !== a.id))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2">
            <input ref={fileInput} type="file" multiple className="hidden" accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp,.mp3,.wav,.m4a,.webm,image/*,audio/*" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
            <button type="button" title="Attach document or image" onClick={() => fileInput.current?.click()} className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"><Paperclip className="h-4 w-4" /></button>
            {ocrPipelines.length > 0 && (
              <select value={ocrPipeline} onChange={(e) => setOcrPipeline(e.target.value)}
                title="OCR pipeline for attachments (traditional / vision / hybrid, governed)"
                className="h-9 max-w-[9rem] rounded-md border border-border bg-[hsl(var(--input))] px-2 text-xs text-muted-foreground">
                <option value="">Built-in OCR</option>
                {ocrPipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <button type="button" title={recording ? "Stop recording" : "Record voice"} onClick={toggleRecord} className={cn("flex h-9 w-9 items-center justify-center rounded-md border", recording ? "border-danger bg-danger/10 text-danger" : "border-border text-muted-foreground hover:text-foreground")}>{recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={mode === "agent" ? "Describe the task for the agent…" : "Message V-GPT…  attach files, pick an output format, Enter to send"}
              rows={1} className="max-h-40 min-h-[2.5rem] flex-1 resize-none rounded-md border border-border bg-[hsl(var(--input))] p-2 text-sm focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
            {streamId ? (
              <Button type="button" variant="outline" onClick={stop}><Square className="h-4 w-4" /> Stop</Button>
            ) : (
              <Button type="submit" disabled={busy || (mode === "agent" && !agentId)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
            )}
          </form>
          <p className="mt-1.5 text-[10px] text-muted-foreground">Governed & audited · {mode === "chat" ? formatLabel(formatId) : mode} mode</p>
        </div>
      </div>
    </div>
  );
}

/** Render assistant content as rich Markdown (GitHub-flavoured): headings, lists, tables,
 * code blocks, blockquotes, links — styled for the chat surface. Inline code keeps a subtle
 * chip; fenced blocks get a dark panel (code inside is neutralised via the child selectors). */
function MarkdownView({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed [word-break:break-word]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (p) => <p className="my-1.5 first:mt-0 last:mb-0" {...p} />,
          ul: (p) => <ul className="my-1.5 ms-5 list-disc space-y-0.5" {...p} />,
          ol: (p) => <ol className="my-1.5 ms-5 list-decimal space-y-0.5" {...p} />,
          li: (p) => <li className="ps-0.5 [&>p]:my-0" {...p} />,
          h1: (p) => <h1 className="mb-1.5 mt-3 text-base font-semibold first:mt-0" {...p} />,
          h2: (p) => <h2 className="mb-1.5 mt-3 text-[15px] font-semibold first:mt-0" {...p} />,
          h3: (p) => <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0" {...p} />,
          h4: (p) => <h4 className="mb-1 mt-2 text-sm font-semibold first:mt-0" {...p} />,
          a: (p) => <a className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />,
          strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
          blockquote: (p) => <blockquote className="my-1.5 border-s-2 border-border ps-3 text-muted-foreground" {...p} />,
          hr: () => <hr className="my-3 border-border" />,
          code: (p) => <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[12.5px]" {...p} />,
          pre: (p) => <pre className="my-2 overflow-x-auto rounded-md border border-border bg-[#0c1a2e] p-3 text-[12px] leading-relaxed text-slate-100 [&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit" {...p} />,
          table: (p) => <div className="my-2 overflow-x-auto"><table className="w-full border-collapse text-[13px]" {...p} /></div>,
          thead: (p) => <thead className="bg-surface-3/60" {...p} />,
          th: (p) => <th className="border border-border px-2 py-1 text-start font-semibold" {...p} />,
          td: (p) => <td className="border border-border px-2 py-1 align-top" {...p} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 align-middle text-primary" aria-label="preparing answer">
      {[0, 1, 2].map((i) => (
        <span key={i} className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.16}s`, animationDuration: "0.9s" }} />
      ))}
    </span>
  );
}

function Welcome({ onPick }: { onPick: (t: string) => void }) {
  const chips = [
    "Summarize the attached document as an executive summary",
    "Generate a project status report as a Word document",
    "Create a flowchart of an onboarding process",
    "Compare how different models answer: explain RAG in one line",
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
      <Boxes className="mb-2 h-9 w-9 text-primary/60" />
      <p className="text-base font-medium text-foreground">Your enterprise AI assistant</p>
      <p className="mb-4 text-sm">Chat, analyse files, generate documents, search knowledge — all in one secure workspace.</p>
      <div className="grid max-w-xl gap-2 sm:grid-cols-2">
        {chips.map((c) => <button key={c} onClick={() => onPick(c)} className="rounded-md border border-border bg-surface-2/40 px-3 py-2 text-start text-xs hover:border-accent/50">{c}</button>)}
      </div>
    </div>
  );
}

function Bubble({ m, streaming, onCopy, onFeedback, onRegenerate }: { m: Message; streaming: boolean; onCopy: () => void; onFeedback: (f: "up" | "down") => void; onRegenerate: () => void }) {
  const [cfg, setCfg] = React.useState(false);
  const [why, setWhy] = React.useState<any | null | "loading">(null);
  const [copied, setCopied] = React.useState(false);

  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] space-y-1">
          {m.attachments && m.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1">{m.attachments.map((a) => <span key={a.id} className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-[10px] text-accent">{a.kind === "audio" ? <Mic className="h-2.5 w-2.5" /> : <Paperclip className="h-2.5 w-2.5" />}{a.name}</span>)}</div>
          )}
          <div className="rounded-lg rounded-br-sm bg-primary/10 px-3 py-2 text-sm whitespace-pre-wrap">{m.content}</div>
        </div>
      </div>
    );
  }

  const meta = m.meta;
  async function loadWhy() {
    if (!meta?.traceId) return;
    setWhy("loading");
    setWhy((await getExplanation(meta.traceId)) ?? null);
  }
  return (
    <div className="flex gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent"><Boxes className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1 space-y-1.5">
        {m.compare ? (
          <CompareView cols={m.compare} loading={streaming || (m.compare.length === 0)} />
        ) : m.mermaid ? (
          <MermaidView code={m.mermaid} />
        ) : (
          <div className="rounded-lg rounded-tl-sm bg-muted/40 px-3 py-2 text-sm">
            {m.content
              ? <><MarkdownView content={m.content} />{streaming && <span className="ms-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-primary align-middle" />}</>
              : streaming ? <span className="inline-flex items-center gap-1.5 text-muted-foreground"><TypingDots /> preparing your answer…</span> : ""}
          </div>
        )}

        {m.file && (
          <a href={m.file.href} download={m.file.name} className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10">
            {m.file.format === "xlsx" ? <FileSpreadsheet className="h-3.5 w-3.5" /> : m.file.format === "pptx" ? <Presentation className="h-3.5 w-3.5" /> : <FileDown className="h-3.5 w-3.5" />} Download {m.file.name}
          </a>
        )}

        {m.agent && (
          <div className="rounded-md border border-border/60 bg-surface-2/40 p-2 text-[11px] text-muted-foreground">
            <Bot className="me-1 inline h-3 w-3 text-primary" /> Agent: <span className="font-medium text-foreground">{m.agent.name}</span> · {m.agent.status}
            {m.agent.tools?.length ? ` · tools: ${m.agent.tools.join(", ")}` : ""}
          </div>
        )}

        {/* meta + actions */}
        {!streaming && (meta || m.content) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {meta?.model && <Badge variant="secondary" className="gap-1 text-[10px]"><Boxes className="h-3 w-3" /> {meta.model}</Badge>}
            {meta?.status && meta.status !== "completed" && meta.status !== "streaming" && <Badge variant={meta.status === "failed" ? "destructive" : "outline"} className="text-[10px]">{meta.status}</Badge>}
            {meta?.knowledge && <Badge variant="outline" className="gap-1 text-[10px]"><Database className="h-3 w-3" /> {meta.knowledge.name}{meta.knowledge.auto ? " (auto)" : ""}</Badge>}
            {(meta?.policyPre || meta?.policyPost) && <Badge variant="outline" className="gap-1 text-[10px]"><ShieldCheck className="h-3 w-3" /> {meta.policyPre ?? "passed"}{meta.policyPost ? `/${meta.policyPost}` : ""}</Badge>}
            {meta?.latencyMs != null && <span className="text-[10px] text-muted-foreground">{Math.round(meta.latencyMs)} ms</span>}
            <div className="ms-auto flex items-center gap-0.5">
              <button title="Copy" onClick={() => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="rounded p-1 text-muted-foreground hover:text-foreground">{copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}</button>
              <button title="Regenerate" onClick={onRegenerate} className="rounded p-1 text-muted-foreground hover:text-foreground"><RefreshCw className="h-3.5 w-3.5" /></button>
              <button title="Good" onClick={() => onFeedback("up")} className={cn("rounded p-1 hover:text-foreground", m.feedback === "up" ? "text-success" : "text-muted-foreground")}><ThumbsUp className="h-3.5 w-3.5" /></button>
              <button title="Bad" onClick={() => onFeedback("down")} className={cn("rounded p-1 hover:text-foreground", m.feedback === "down" ? "text-danger" : "text-muted-foreground")}><ThumbsDown className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}

        {!streaming && meta && (meta.traceId || meta.model) && (
          <div className="flex flex-wrap gap-3 text-[11px]">
            <button onClick={() => setCfg((v) => !v)} className="inline-flex items-center gap-1 text-primary hover:underline"><Info className="h-3 w-3" /> View AICP Configuration</button>
            {meta.traceId && <button onClick={() => { setWhy((w: any) => (w ? null : "loading")); if (!why) loadWhy(); }} className="inline-flex items-center gap-1 text-primary hover:underline"><Network className="h-3 w-3" /> Why this answer?</button>}
          </div>
        )}

        {cfg && meta && <ConfigPanel m={m} />}
        {why && why !== "loading" && <WhyPanel exp={why} meta={meta!} />}
        {why === "loading" && <p className="text-[11px] text-muted-foreground"><Loader2 className="me-1 inline h-3 w-3 animate-spin" /> Loading reasoning…</p>}
      </div>
    </div>
  );
}

function row(label: string, value: React.ReactNode) {
  return <div className="grid grid-cols-[140px_1fr] gap-2 py-0.5"><dt className="text-muted-foreground">{label}</dt><dd>{value ?? "—"}</dd></div>;
}

function ConfigPanel({ m }: { m: Message }) {
  const meta = m.meta!;
  const prov = meta.provenance ?? null;
  const k = prov?.knowledge ?? null;
  // Honest confidence: grounding = top passage similarity when RAG was used. Open, ungrounded
  // generation is not scored (we never fabricate a confidence for a bare LLM answer).
  const confidence =
    meta.status !== "completed"
      ? "—"
      : k?.confidence != null
        ? `${Math.round(k.confidence * 100)}% grounding match (top passage)`
        : k
          ? "Grounded (passages retrieved)"
          : "Not scored — open generation";
  // The real provider behind the routed model (from AICP), not a name-based guess.
  const providerText = prov?.provider
    ? `${prov.provider.name} (${prov.provider.type})`
    : "resolved by AICP routing";
  return (
    <dl className="rounded-md border border-border/60 bg-surface-2/40 p-3 text-[11px]">
      <p className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">AICP Configuration</p>
      {row("Model", `${meta.model ?? "—"}`)}
      {row("Provider", providerText)}
      {row("Routing rule", meta.routeRule ?? "Automatic routing")}
      {row("Fallback", meta.fallbacks?.length ? meta.fallbacks.join(", ") : "none configured")}
      {row("Knowledge", meta.knowledge ? `${meta.knowledge.name}${meta.knowledge.auto ? " (auto-selected)" : ""}${meta.knowledge.hits != null ? ` · ${meta.knowledge.hits} passages` : ""}` : "none (general)")}
      {k?.sources && k.sources.length > 0 &&
        row(
          "Sources",
          <ul className="space-y-0.5">
            {k.sources.map((s, i) => (
              <li key={s.chunk_id ?? i} className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-muted-foreground">[{i + 1}]</span>
                <span className="truncate">{s.title ?? "Untitled source"}</span>
                <span className="ms-auto shrink-0 text-[10px] text-muted-foreground">{Math.round(s.score * 100)}% match</span>
              </li>
            ))}
          </ul>,
        )}
      {row("AI instruction", meta.promptLabel ? `${meta.promptLabel} format prompt` : "chat system prompt")}
      {row("Governance", `input ${meta.policyPre ?? "passed"} · output ${meta.policyPost ?? "passed"}`)}
      {row("Response time", meta.latencyMs != null ? `${Math.round(meta.latencyMs)} ms` : "—")}
      {row("Token usage", meta.inputTokens != null ? `${meta.inputTokens} in / ${meta.outputTokens} out` : "—")}
      {row("Cost", meta.cost ? `${meta.cost} ${meta.currency ?? ""}` : "—")}
      {row("Confidence", confidence)}
      {meta.traceId && row("Trace", <a href={aicpHref(`/requests/${meta.traceId}`)} className="text-primary hover:underline">{meta.traceId.slice(0, 8)}… (full trace)</a>)}
    </dl>
  );
}

function WhyPanel({ exp, meta }: { exp: any; meta: MsgMeta }) {
  const decisions = exp?.decisions ?? [];
  const sources = exp?.sources ?? [];
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-[11px]">
      <p className="mb-1 font-semibold text-primary">Why this answer</p>
      {exp?.headline && <p className="mb-1.5">{exp.headline}</p>}
      <ul className="space-y-1">
        {decisions.map((d: any, i: number) => (
          <li key={i} className="flex gap-2"><span className="font-medium text-foreground">{d.title}:</span><span className="text-muted-foreground">{d.summary || d.outcome}</span></li>
        ))}
        {decisions.length === 0 && <li className="text-muted-foreground">Routing, governance and grounding were applied; see the full trace for details.</li>}
      </ul>
      {sources.length > 0 && <p className="mt-1.5 text-muted-foreground"><span className="font-medium text-foreground">Sources searched:</span> {sources.map((s: any) => s.title || s).join(", ")}</p>}
      {meta.knowledge && <p className="mt-1 text-muted-foreground"><span className="font-medium text-foreground">Knowledge:</span> {meta.knowledge.name}{meta.knowledge.auto ? " (auto-selected as the best match)" : ""}</p>}
    </div>
  );
}

function CompareView({ cols, loading }: { cols: { model: string; text: string; latencyMs: number; status: string }[]; loading: boolean }) {
  if (loading) return <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Running across enabled models…</div>;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(cols.length || 1, 3)}, minmax(0,1fr))` }}>
      {cols.map((c, i) => (
        <div key={i} className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <div className="mb-1 flex items-center gap-1.5"><Badge variant="secondary" className="gap-1 text-[10px]"><Boxes className="h-3 w-3" /> {c.model}</Badge><span className="text-[10px] text-muted-foreground">{c.latencyMs} ms</span></div>
          <p className="whitespace-pre-wrap text-sm">{c.text}</p>
        </div>
      ))}
      {cols.length === 1 && <p className="col-span-full text-[11px] text-muted-foreground">Only one chat model is enabled. Enable another in AICP and it appears here automatically.</p>}
    </div>
  );
}

function loadMermaid(): Promise<any> {
  const w = window as any;
  if (w.mermaid) return Promise.resolve(w.mermaid);
  if (w.__mermaidLoading) return w.__mermaidLoading;
  w.__mermaidLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
    s.async = true;
    s.onload = () => resolve(w.mermaid);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return w.__mermaidLoading;
}

function MermaidView({ code }: { code: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [err, setErr] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
        const { svg } = await mermaid.render("vgpt-" + Math.random().toString(36).slice(2), code);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch { if (!cancelled) setErr(true); }
    })();
    return () => { cancelled = true; };
  }, [code]);
  function downloadSvg() {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([svg.outerHTML], { type: "image/svg+xml" }));
    a.download = "diagram.svg"; a.click();
  }
  if (err) return <pre className="overflow-auto rounded-lg bg-muted/40 p-3 text-[11px]">{code}</pre>;
  return (
    <div className="space-y-1.5">
      <div ref={ref} className="overflow-auto rounded-lg border border-border bg-[#0c1a2e] p-3" />
      <button onClick={downloadSvg} className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"><Download className="h-3 w-3" /> Download SVG</button>
    </div>
  );
}
