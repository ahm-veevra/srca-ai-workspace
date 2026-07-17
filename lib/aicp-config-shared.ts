// Shared AICP-config types and constants — safe to import from both server and
// client code (no server-only dependencies). Server-side read/write logic lives in
// lib/aicp-config.ts.

/** An arbitrary extra parameter or key (e.g. an API key AICP surfaces require). */
export interface AicpExtra {
  key: string;
  value: string;
  /** Mask the value in the UI and API responses. */
  secret?: boolean;
}

export interface AicpConfig {
  /** AICP backend base URL — server-side proxy target (maps to API_INTERNAL_URL). */
  apiUrl: string;
  /** AICP console URL — used for cross-app deep links (maps to NEXT_PUBLIC_AICP_URL). */
  consoleUrl: string;
  /** AICP SQL-connector id the command center reads the 997 data lake through. */
  datalakeConnectorId: string;
  /** AICP capability ids — all AI (prompts, models, grounding) lives in these capabilities;
   *  the workspace only calls /ai-capabilities/{id}/run and renders the result. Blank = surface
   *  shows its empty state. */
  briefingCapabilityId: string;
  forecastCapabilityId: string;
  recommendationsCapabilityId: string;
  copilotCapabilityId: string;
  knowledgeCapabilityId: string;
  whatifCapabilityId: string;
  /** Natural-language analytics capability for the AICP Intelligence "Ask Your Data" surface.
   *  Blank falls back to the Copilot capability. */
  askDataCapabilityId: string;
  /** Triage capability for the 997 Call Triage surface — assesses a transcript into severity,
   *  protocol and recommended dispatch. Blank falls back to the Copilot capability. */
  triageCapabilityId: string;
  /** Document-chat capability — answers questions grounded in the open document (talk-to-document
   *  across the Intelligence Centers). Blank falls back to the Copilot capability. */
  documentChatCapabilityId: string;
  /** Reply-draft capability — drafts a reply letter for the Correspondence Tracking surface from the
   *  incoming letter + a chosen intent/tone. Blank falls back to the Copilot capability. */
  replyDraftCapabilityId: string;
  /** Free-form additional parameters / keys. */
  extra: AicpExtra[];
}

/** Placeholder shown for secret values in read paths that may reach the client. */
export const SECRET_MASK = "••••••••";
