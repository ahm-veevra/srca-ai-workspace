"use client";

// Client-side helpers for the command center's interactive AI surfaces (Copilot, Knowledge,
// Regenerate). ALL AI logic — prompt, model, grounding — lives in AICP capabilities; the
// workspace only invokes /ai-capabilities/{id}/run and renders the result. No prompts here.
import { apiPost } from "@/lib/api-client";
import { type Forecast, type Recommendation } from "@/lib/command-center-types";

interface CapabilityRunResult {
  output?: string;
  meta?: Record<string, unknown>;
}

/** Pull the first {...} JSON object out of a capability's text output (handles fences/preamble). */
function extractJson(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start === -1 || end <= start ? null : body.slice(start, end + 1);
}

/** Append a language directive so the capability answers in the intended language. Both
 *  directions are forced: without an explicit "Respond in English." the multilingual model
 *  sometimes replies in Arabic to an English question (SRCA's grounding data is Arabic-leaning). */
function withLocale(trigger: string, locale?: string): string {
  if (locale === "ar") return `${trigger} Respond in Arabic.`;
  if (locale === "en") return `${trigger} Respond in English.`;
  return trigger;
}

/** Detect the language of a user question (Arabic script → "ar", otherwise "en") so the
 *  answer comes back in the same language it was asked in. */
function detectLocale(text: string): string {
  return /[؀-ۿ]/.test(text) ? "ar" : "en";
}

/** Run an AICP capability by id and return its text output (or null). */
export async function runCapability(
  capId: string,
  input: string,
  messages?: { role: "user" | "assistant"; content: string }[],
): Promise<CapabilityRunResult> {
  return apiPost<CapabilityRunResult>(`/ai-capabilities/${capId}/run`, { input, messages });
}

/** AI Copilot — runs the configured copilot capability with the user's question. */
export async function askCopilot(opts: {
  capabilityId: string;
  question: string;
  messages?: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  if (!opts.capabilityId) throw new Error("no copilot capability configured");
  // Answer in the same language the question was asked in.
  const input = withLocale(opts.question, detectLocale(opts.question));
  const res = await runCapability(opts.capabilityId, input, opts.messages);
  const text = typeof res.output === "string" ? res.output.trim() : "";
  if (!text) throw new Error("empty copilot response");
  return text;
}

export interface KnowledgeAnswer {
  answer: string;
  citations: { title: string; source: string }[];
}

/** Extract citations from a capability's run meta (best-effort; several shapes tolerated). */
function citationsFromMeta(meta: Record<string, unknown> | undefined): { title: string; source: string }[] {
  const raw = (meta?.citations ?? meta?.sources) as unknown;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => {
      if (typeof c === "string") return { title: c, source: "SRCA Knowledge Base" };
      const o = c as Record<string, unknown>;
      const title = String(o.title ?? o.document_title ?? o.name ?? "");
      return { title, source: String(o.source ?? o.collection ?? "SRCA Knowledge Base") };
    })
    .filter((c) => c.title);
}

/** Knowledge Assistant — runs the configured knowledge capability; citations come from meta. */
export async function askKnowledge(opts: {
  capabilityId: string;
  question: string;
}): Promise<KnowledgeAnswer> {
  if (!opts.capabilityId) throw new Error("no knowledge capability configured");
  // Answer in the same language the question was asked in.
  const input = withLocale(opts.question, detectLocale(opts.question));
  const res = await runCapability(opts.capabilityId, input);
  const answer = typeof res.output === "string" ? res.output.trim() : "";
  if (!answer) throw new Error("empty knowledge answer");
  return { answer, citations: citationsFromMeta(res.meta) };
}

export interface SimProjection {
  response: number;
  coverage: number;
  hospitalLoad: number;
  fleetUtil: number;
  lives: number;
  sla: number;
  cost: number;
}

/** What-If Simulator — runs the configured capability for the selected scenarios and parses the
 *  projected metrics ({projected:{response,coverage,...}}). Null when unconfigured or on failure. */
export async function simulateWhatIf(
  capabilityId: string,
  scenarioLabels: string[],
  locale?: string,
): Promise<SimProjection | null> {
  if (!capabilityId || !scenarioLabels.length) return null;
  try {
    const res = await runCapability(
      capabilityId,
      withLocale(`Estimate the operational impact of these scenarios: ${scenarioLabels.join("; ")}.`, locale),
    );
    const out = typeof res.output === "string" ? res.output : null;
    const json = out ? extractJson(out) : null;
    if (!json) return null;
    const p = (JSON.parse(json) as { projected?: Record<string, unknown> }).projected;
    if (!p || typeof p !== "object") return null;
    const n = (v: unknown) => Number(v);
    return {
      response: n(p.response),
      coverage: n(p.coverage),
      hospitalLoad: n(p.hospitalLoad),
      fleetUtil: n(p.fleetUtil),
      lives: n(p.lives),
      sla: n(p.sla),
      cost: n(p.cost),
    };
  } catch {
    return null;
  }
}

/** Regenerate the executive briefing — runs the briefing capability and parses {headline, bullets}. */
export async function regenerateBriefing(
  capabilityId: string,
  locale?: string,
): Promise<{ headline: string; bullets: string[] } | null> {
  if (!capabilityId) return null;
  try {
    const res = await runCapability(capabilityId, withLocale("Generate today's operational executive briefing.", locale));
    const out = typeof res.output === "string" ? res.output : null;
    const json = out ? extractJson(out) : null;
    if (!json) return null;
    const parsed = JSON.parse(json) as { headline?: unknown; bullets?: unknown };
    const bullets = Array.isArray(parsed.bullets) ? parsed.bullets.map(String).filter(Boolean) : [];
    if (!parsed.headline || !bullets.length) return null;
    return { headline: String(parsed.headline), bullets };
  } catch {
    return null;
  }
}

/** Regenerate the call-demand forecast — runs the forecast capability, parses {forecast:[{label,value,confidence}]}. */
export async function regenerateForecast(capabilityId: string, locale?: string): Promise<Forecast[] | null> {
  if (!capabilityId) return null;
  try {
    const res = await runCapability(capabilityId, withLocale("Forecast today's emergency-call demand.", locale));
    const out = typeof res.output === "string" ? res.output : null;
    const json = out ? extractJson(out) : null;
    if (!json) return null;
    const parsed = JSON.parse(json) as { forecast?: unknown };
    if (!Array.isArray(parsed.forecast)) return null;
    const list: Forecast[] = parsed.forecast
      .map((f) => {
        const o = f as Record<string, unknown>;
        return { label: String(o.label ?? "").trim(), value: String(o.value ?? "").trim(), confidence: Number(o.confidence) || 0 };
      })
      .filter((f) => f.label && f.value);
    return list.length ? list : null;
  } catch {
    return null;
  }
}

const REC_IMPACTS = ["High", "Medium", "Low"];
const REC_PRIORITIES = ["Critical", "High", "Medium"];

/** Regenerate operational recommendations — parses {recommendations:[{id,title,reason,benefit,confidence,impact,priority}]}. */
export async function regenerateRecommendations(capabilityId: string, locale?: string): Promise<Recommendation[] | null> {
  if (!capabilityId) return null;
  try {
    const res = await runCapability(capabilityId, withLocale("Recommend prioritized operational actions.", locale));
    const out = typeof res.output === "string" ? res.output : null;
    const json = out ? extractJson(out) : null;
    if (!json) return null;
    const parsed = JSON.parse(json) as { recommendations?: unknown };
    if (!Array.isArray(parsed.recommendations)) return null;
    const list: Recommendation[] = parsed.recommendations
      .map((r, i) => {
        const o = r as Record<string, unknown>;
        const impact = String(o.impact ?? "").trim();
        const priority = String(o.priority ?? "").trim();
        return {
          id: String(o.id ?? "").trim() || `R${i + 1}`,
          title: String(o.title ?? "").trim(),
          reason: String(o.reason ?? "").trim(),
          benefit: String(o.benefit ?? "").trim(),
          confidence: Number(o.confidence) || 0,
          impact: (REC_IMPACTS.includes(impact) ? impact : "Medium") as Recommendation["impact"],
          priority: (REC_PRIORITIES.includes(priority) ? priority : "Medium") as Recommendation["priority"],
        };
      })
      .filter((r) => r.title);
    return list.length ? list : null;
  } catch {
    return null;
  }
}
