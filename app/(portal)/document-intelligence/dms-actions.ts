"use server";

import { getAicpConfig } from "@/lib/aicp-config";
import { serverApi, getSession } from "@/lib/server-api";

export type DocChatResult =
  | { ok: true; output: string; model?: string }
  | { ok: false; error: string; noCapability?: boolean };

/**
 * Talk-to-document: answer a question grounded in the open document. The document text is passed as
 * reference material; the AICP capability owns the prompt/model/grounding — the workspace authors no
 * prompt. Uses the configured Document-Chat capability, falling back to the Copilot capability.
 *
 * (Production path: ingest the document into a knowledge collection and let a RAG capability retrieve.
 * For the demo the full text is passed inline as context, which the same capability can use directly.)
 */
export async function askDocumentAction(
  docTitle: string,
  docText: string,
  question: string,
  locale = "en",
): Promise<DocChatResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const q = question.trim();
  if (!q) return { ok: false, error: "Ask a question first." };

  const cfg = await getAicpConfig();
  const capId = cfg.documentChatCapabilityId || cfg.copilotCapabilityId;
  if (!capId) return { ok: false, error: "No document-chat capability configured.", noCapability: true };

  // The question is the instruction; the document is attached as reference context (not a prompt).
  const ref = docText.length > 12000 ? `${docText.slice(0, 12000)}\n…[truncated]` : docText;
  // Answer in the QUESTION's language (both directions forced — without an explicit "Respond in
  // English." the multilingual model can drift to Arabic on English questions).
  const lang = /[؀-ۿ]/.test(q) ? "ar" : /[A-Za-z]/.test(q) ? "en" : locale;
  const langLine = lang === "ar" ? "\n\nRespond in Arabic." : "\n\nRespond in English.";
  const input = `${q}\n\n[Reference document: "${docTitle}"]\n${ref}${langLine}`;

  try {
    const res = await serverApi<{ output?: string; meta?: Record<string, unknown> }>(
      `/ai-capabilities/${capId}/run`,
      { method: "POST", body: JSON.stringify({ input }) },
    );
    if (typeof res.output !== "string" || !res.output.trim()) {
      return { ok: false, error: "AICP returned an empty answer." };
    }
    const m = res.meta ?? {};
    const model = m.model ?? m.selected_model_key ?? m.model_key;
    return { ok: true, output: res.output, model: model ? String(model) : undefined };
  } catch {
    return { ok: false, error: "Couldn't reach the document-chat capability." };
  }
}
