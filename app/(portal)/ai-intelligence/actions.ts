"use server";

import { getAicpConfig } from "@/lib/aicp-config";
import { serverApi, getSession } from "@/lib/server-api";

export type AskResult =
  | { ok: true; output: string; model?: string }
  | { ok: false; error: string; noCapability?: boolean };

/** An AICP agent run returns `output` as either a string or an object — pull the answer text out. */
function agentText(output: unknown): string {
  if (typeof output === "string") return output.trim();
  if (output && typeof output === "object") {
    const o = output as Record<string, unknown>;
    for (const k of ["text", "answer", "message", "content", "result"]) {
      if (typeof o[k] === "string" && (o[k] as string).trim()) return (o[k] as string).trim();
    }
  }
  return "";
}
const OK_STATUS = new Set(["completed", "succeeded", "success", "ok", "done"]);

/**
 * Ask-Your-Data: answer a natural-language question about SRCA operations.
 *
 * Prefers the configured AICP **agent** (`askDataAgentId`) — an agent that can use a SQL/connector
 * tool to query the data lake live and reason. If no agent is set, falls back to a **capability**
 * (`askDataCapabilityId`, else Copilot). Either way the workspace builds no prompt — AICP owns the
 * prompt/model/tools/grounding; we only pass the user's question.
 */
export async function askDataAction(question: string, locale = "en"): Promise<AskResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const q = question.trim();
  if (!q) return { ok: false, error: "Ask a question first." };

  const cfg = await getAicpConfig();
  const input = locale === "ar" ? `${q}\n\nRespond in Arabic.` : q;

  // 1) Agent path (preferred when configured) — uses tools (e.g. live SQL over the data lake).
  if (cfg.askDataAgentId) {
    try {
      const res = await serverApi<{ status?: string; output?: unknown; error?: unknown }>(
        `/agents/${cfg.askDataAgentId}/run`,
        { method: "POST", body: JSON.stringify({ input }) },
      );
      const text = agentText(res.output);
      const okStatus = !res.status || OK_STATUS.has(res.status.toLowerCase());
      if (!okStatus || !text) {
        return { ok: false, error: "The agent didn't return an answer." };
      }
      return { ok: true, output: text };
    } catch {
      return { ok: false, error: "Couldn't reach the analytics agent." };
    }
  }

  // 2) Capability path (fallback).
  const capId = cfg.askDataCapabilityId || cfg.copilotCapabilityId;
  if (!capId) return { ok: false, error: "No analytics agent or capability configured.", noCapability: true };
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
