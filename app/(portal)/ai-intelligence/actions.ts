"use server";

import { getAicpConfig } from "@/lib/aicp-config";
import { serverApi, getSession } from "@/lib/server-api";

export type AskResult =
  | { ok: true; output: string; model?: string }
  | { ok: false; error: string; noCapability?: boolean };

/**
 * Ask-Your-Data: forward a natural-language question to the configured AICP analytics
 * capability and return its answer. The workspace builds no prompt — the capability owns the
 * prompt, model and grounding; we only pass the user's question as input. Falls back to the
 * Copilot capability when no dedicated Ask-Your-Data capability is set.
 */
export async function askDataAction(question: string, locale = "en"): Promise<AskResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const q = question.trim();
  if (!q) return { ok: false, error: "Ask a question first." };

  const cfg = await getAicpConfig();
  const capId = cfg.askDataCapabilityId || cfg.copilotCapabilityId;
  if (!capId) return { ok: false, error: "No analytics capability configured.", noCapability: true };

  const input = locale === "ar" ? `${q}\n\nRespond in Arabic.` : q;

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
    return { ok: false, error: "Couldn't reach the analytics capability." };
  }
}

/**
 * 997 Call Triage: assess a call transcript with the configured triage capability. The audio was
 * already transcribed client-side via AICP's transcription API; here we only pass the transcript
 * to the capability (which owns the triage prompt/model). Falls back to the Copilot capability.
 */
export async function triageTranscriptAction(transcript: string, locale = "en"): Promise<AskResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const text = transcript.trim();
  if (!text) return { ok: false, error: "No transcript to assess." };

  const cfg = await getAicpConfig();
  const capId = cfg.triageCapabilityId || cfg.copilotCapabilityId;
  if (!capId) return { ok: false, error: "No triage capability configured.", noCapability: true };

  const input = locale === "ar" ? `${text}\n\nRespond in Arabic.` : text;

  try {
    const res = await serverApi<{ output?: string; meta?: Record<string, unknown> }>(
      `/ai-capabilities/${capId}/run`,
      { method: "POST", body: JSON.stringify({ input }) },
    );
    if (typeof res.output !== "string" || !res.output.trim()) {
      return { ok: false, error: "AICP returned an empty assessment." };
    }
    const m = res.meta ?? {};
    const model = m.model ?? m.selected_model_key ?? m.model_key;
    return { ok: true, output: res.output, model: model ? String(model) : undefined };
  } catch {
    return { ok: false, error: "Couldn't reach the triage capability." };
  }
}
