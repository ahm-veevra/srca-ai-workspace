// Runtime AICP connection configuration for the workspace.
//
// Values are edited from the in-app Configuration page (/settings/aicp) and persisted
// to a JSON file on the server, read at request time with environment-variable defaults.
// This lets an operator set the AICP connection (backend URL, console URL, data-lake
// connector id, and arbitrary parameters/keys) without editing .env or redeploying.
//
// Server-only: never import from a Client Component.
import "server-only";

import { promises as fs } from "fs";
import path from "path";

import { SECRET_MASK, type AicpConfig, type AicpExtra } from "./aicp-config-shared";

export { SECRET_MASK };
export type { AicpConfig, AicpExtra };

const CONFIG_PATH =
  process.env.AICP_CONFIG_PATH || path.join(process.cwd(), "data", "aicp-config.json");

function envDefaults(): AicpConfig {
  return {
    apiUrl: process.env.API_INTERNAL_URL || "http://localhost:8000",
    consoleUrl: process.env.NEXT_PUBLIC_AICP_URL || "http://localhost:3000",
    datalakeConnectorId: process.env.SRCA_DATALAKE_CONNECTOR_ID || "",
    briefingCapabilityId: process.env.SRCA_BRIEFING_CAPABILITY_ID || "",
    forecastCapabilityId: process.env.SRCA_FORECAST_CAPABILITY_ID || "",
    recommendationsCapabilityId: process.env.SRCA_RECOMMENDATIONS_CAPABILITY_ID || "",
    copilotCapabilityId: process.env.SRCA_COPILOT_CAPABILITY_ID || "",
    knowledgeCapabilityId: process.env.SRCA_KNOWLEDGE_CAPABILITY_ID || "",
    whatifCapabilityId: process.env.SRCA_WHATIF_CAPABILITY_ID || "",
    askDataCapabilityId: process.env.SRCA_ASKDATA_CAPABILITY_ID || "",
    askDataAgentId: process.env.SRCA_ASKDATA_AGENT_ID || "",
    triageCapabilityId: process.env.SRCA_TRIAGE_CAPABILITY_ID || "",
    documentChatCapabilityId: process.env.SRCA_DOCCHAT_CAPABILITY_ID || "",
    replyDraftCapabilityId: process.env.SRCA_REPLY_CAPABILITY_ID || "",
    extra: [],
  };
}

// Cache the resolved config in-process, keyed by the file's mtime so EXTERNAL edits to the
// config file (e.g. written by another tool) are picked up without a restart.
let cache: { config: AicpConfig; mtimeMs: number } | null = null;

/** Resolve the effective config: saved file merged over environment defaults. */
export async function getAicpConfig(): Promise<AicpConfig> {
  const defaults = envDefaults();
  let mtimeMs = -1;
  try {
    mtimeMs = (await fs.stat(CONFIG_PATH)).mtimeMs;
  } catch {
    // No saved config file → environment defaults.
    return defaults;
  }
  if (cache && cache.mtimeMs === mtimeMs) return cache.config;
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const saved = JSON.parse(raw) as Partial<AicpConfig>;
    const config: AicpConfig = {
      apiUrl: saved.apiUrl || defaults.apiUrl,
      consoleUrl: saved.consoleUrl || defaults.consoleUrl,
      datalakeConnectorId: saved.datalakeConnectorId ?? defaults.datalakeConnectorId,
      briefingCapabilityId: saved.briefingCapabilityId ?? defaults.briefingCapabilityId,
      forecastCapabilityId: saved.forecastCapabilityId ?? defaults.forecastCapabilityId,
      recommendationsCapabilityId: saved.recommendationsCapabilityId ?? defaults.recommendationsCapabilityId,
      copilotCapabilityId: saved.copilotCapabilityId ?? defaults.copilotCapabilityId,
      knowledgeCapabilityId: saved.knowledgeCapabilityId ?? defaults.knowledgeCapabilityId,
      whatifCapabilityId: saved.whatifCapabilityId ?? defaults.whatifCapabilityId,
      askDataCapabilityId: saved.askDataCapabilityId ?? defaults.askDataCapabilityId,
      askDataAgentId: saved.askDataAgentId ?? defaults.askDataAgentId,
      triageCapabilityId: saved.triageCapabilityId ?? defaults.triageCapabilityId,
      documentChatCapabilityId: saved.documentChatCapabilityId ?? defaults.documentChatCapabilityId,
      replyDraftCapabilityId: saved.replyDraftCapabilityId ?? defaults.replyDraftCapabilityId,
      extra: Array.isArray(saved.extra) ? saved.extra : [],
    };
    cache = { config, mtimeMs };
    return config;
  } catch {
    return defaults;
  }
}

/** Persist the config and refresh the in-process cache. */
export async function saveAicpConfig(next: AicpConfig): Promise<void> {
  const clean: AicpConfig = {
    apiUrl: next.apiUrl.trim(),
    consoleUrl: next.consoleUrl.trim(),
    datalakeConnectorId: next.datalakeConnectorId.trim(),
    briefingCapabilityId: next.briefingCapabilityId.trim(),
    forecastCapabilityId: next.forecastCapabilityId.trim(),
    recommendationsCapabilityId: next.recommendationsCapabilityId.trim(),
    copilotCapabilityId: next.copilotCapabilityId.trim(),
    knowledgeCapabilityId: next.knowledgeCapabilityId.trim(),
    whatifCapabilityId: next.whatifCapabilityId.trim(),
    askDataCapabilityId: next.askDataCapabilityId.trim(),
    askDataAgentId: next.askDataAgentId.trim(),
    triageCapabilityId: next.triageCapabilityId.trim(),
    documentChatCapabilityId: next.documentChatCapabilityId.trim(),
    replyDraftCapabilityId: next.replyDraftCapabilityId.trim(),
    extra: (next.extra ?? [])
      .map((e) => ({ key: e.key.trim(), value: e.value, secret: !!e.secret }))
      .filter((e) => e.key.length > 0),
  };
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(clean, null, 2), "utf8");
  // Invalidate — next read re-loads with the fresh file mtime.
  cache = null;
}

/** Config for display: secret extra values are masked. Safe to pass to the client. */
export async function getAicpConfigForDisplay(): Promise<AicpConfig> {
  const cfg = await getAicpConfig();
  return {
    ...cfg,
    extra: cfg.extra.map((e) => (e.secret ? { ...e, value: e.value ? SECRET_MASK : "" } : e)),
  };
}

/** Look up an extra parameter's real value by key (server-side use). */
export async function getAicpExtra(key: string): Promise<string | undefined> {
  const cfg = await getAicpConfig();
  return cfg.extra.find((e) => e.key === key)?.value;
}
