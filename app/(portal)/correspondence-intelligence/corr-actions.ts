"use server";

import { getAicpConfig } from "@/lib/aicp-config";
import { serverApi, getSession } from "@/lib/server-api";

export type ReplyResult =
  | { ok: true; output: string; model?: string }
  | { ok: false; error: string; noCapability?: boolean };

/**
 * Generate a reply letter for an incoming correspondence item. The incoming letter is passed as
 * reference material and the user's chosen intent is the instruction; the AICP capability owns the
 * prompt/model. Uses the configured Reply-Draft capability, falling back to the Copilot capability.
 */
export async function generateReplyAction(
  subject: string,
  body: string,
  intent: string,
  locale = "en",
): Promise<ReplyResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const wish = intent.trim();
  if (!wish) return { ok: false, error: "Choose a reply intent first." };

  const cfg = await getAicpConfig();
  const capId = cfg.replyDraftCapabilityId || cfg.copilotCapabilityId;
  if (!capId) return { ok: false, error: "No reply-draft capability configured.", noCapability: true };

  const ref = body.length > 10000 ? `${body.slice(0, 10000)}\n…[truncated]` : body;
  const langLine = locale === "ar" ? "\n\nWrite the reply in Arabic." : "\n\nWrite the reply in English.";
  const input = `${wish}\n\n[Incoming letter — subject: "${subject}"]\n${ref}${langLine}`;

  try {
    const res = await serverApi<{ output?: string; meta?: Record<string, unknown> }>(
      `/ai-capabilities/${capId}/run`,
      { method: "POST", body: JSON.stringify({ input }) },
    );
    if (typeof res.output !== "string" || !res.output.trim()) {
      return { ok: false, error: "AICP returned an empty draft." };
    }
    const m = res.meta ?? {};
    const model = m.model ?? m.selected_model_key ?? m.model_key;
    return { ok: true, output: res.output, model: model ? String(model) : undefined };
  } catch {
    return { ok: false, error: "Couldn't reach the reply-draft capability." };
  }
}
