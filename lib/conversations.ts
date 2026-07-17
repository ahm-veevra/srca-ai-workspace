/** Server-side conversation persistence client — AICP conversation store (/api/v1/conversations).
 *
 * V-GPT chat history lives on the server (per tenant + user), not just in localStorage, so it
 * survives a cache clear and follows the user across devices. The rich client-only fields of a
 * Message (generated file, mermaid, compare grid, agent run, output format, governance meta) are
 * folded into the server `meta` JSON so a conversation round-trips losslessly through the API. */
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { Conversation, Message, MsgMeta } from "@/lib/vgpt";

interface ServerMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta: Record<string, unknown>;
  attachments: unknown[];
  feedback: string | null;
  created_at: string;
}

interface ServerConversation {
  id: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
  messages: ServerMessage[];
}

/** Fold a Message's rich client fields into the server `meta` blob. */
function foldMeta(m: Message): Record<string, unknown> {
  return {
    meta: m.meta ?? null,
    file: m.file ?? null,
    mermaid: m.mermaid ?? null,
    compare: m.compare ?? null,
    agent: m.agent ?? null,
    formatId: m.formatId ?? null,
  };
}

function toServerMessage(m: Message) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    feedback: m.feedback ?? null,
    attachments: m.attachments ?? [],
    meta: foldMeta(m),
  };
}

function fromServerMessage(r: ServerMessage): Message {
  const x = (r.meta ?? {}) as Record<string, unknown>;
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    attachments: (r.attachments as Message["attachments"]) ?? undefined,
    feedback: (r.feedback as Message["feedback"]) ?? null,
    meta: (x.meta as MsgMeta | null) ?? undefined,
    file: (x.file as Message["file"]) ?? undefined,
    mermaid: (x.mermaid as string | null) ?? undefined,
    compare: (x.compare as Message["compare"]) ?? undefined,
    agent: (x.agent as Message["agent"]) ?? undefined,
    formatId: (x.formatId as string | null) ?? undefined,
  };
}

function fromServerConversation(c: ServerConversation): Conversation {
  return {
    id: c.id,
    title: c.title,
    pinned: c.pinned,
    archived: c.archived,
    updated: Date.parse(c.updated_at) || 0,
    messages: (c.messages ?? []).map(fromServerMessage),
  };
}

export async function listConversations(): Promise<Conversation[]> {
  const rows = await apiGet<ServerConversation[]>("/conversations");
  return rows.map(fromServerConversation);
}

export async function createConversation(id: string, title: string): Promise<Conversation> {
  const c = await apiPost<ServerConversation>("/conversations", { id, title });
  return fromServerConversation(c);
}

export async function patchConversation(
  id: string,
  patch: { title?: string; pinned?: boolean; archived?: boolean },
): Promise<void> {
  await apiPatch<ServerConversation>(`/conversations/${id}`, patch);
}

export async function deleteConversation(id: string): Promise<void> {
  await apiDelete(`/conversations/${id}`);
}

/** Append or idempotently upsert a message (same id → update). */
export async function saveMessage(cid: string, m: Message): Promise<void> {
  await apiPost<ServerMessage>(`/conversations/${cid}/messages`, toServerMessage(m));
}

/** Remove a persisted message (used on regenerate to drop the superseded turn). */
export async function deleteMessage(cid: string, mid: string): Promise<void> {
  await apiDelete(`/conversations/${cid}/messages/${mid}`);
}

/** Patch a persisted message — final streamed content, governance meta, or thumbs feedback. */
export async function patchMessage(
  cid: string,
  m: Message,
  fields: { content?: boolean; meta?: boolean; feedback?: boolean },
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (fields.content) body.content = m.content;
  if (fields.meta) body.meta = foldMeta(m);
  if (fields.feedback) body.feedback = m.feedback ?? "";
  await apiPatch<ServerMessage>(`/conversations/${cid}/messages/${m.id}`, body);
}
