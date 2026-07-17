/**
 * Data lineage / provenance for each command-center surface — what powers it and
 * where its data comes from. Static per-surface facts (source type, saved query,
 * DB object, whether a model/agent/collection is involved) live here; the runtime
 * values (connector id, knowledge collection, capability id) are merged in at render
 * from ProvenanceContext.
 */
export type ProvSourceType = "database" | "knowledge" | "agent";

export interface ProvenanceInfo {
  /** Headline — how the surface is powered (matches the architecture map). */
  poweredBy: string;
  sourceType: ProvSourceType;
  /** AICP saved-query key(s) for database surfaces. */
  statementKey?: string;
  /** Underlying table/view(s) in the data lake. */
  dbObject?: string;
  /** True if the surface retrieves from the configured knowledge collection. */
  usesCollection?: boolean;
  /** True if an AI model is involved (inference / RAG synthesis). */
  usesModel?: boolean;
  /** True if a configurable AICP capability/agent runs the surface. */
  usesAgent?: boolean;
  note?: string;
}

/** Keyed by a stable surface id (the AICP saved-query key, or a surface name). */
export const PROVENANCE: Record<string, ProvenanceInfo> = {
  exec_kpis: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "exec_kpis", dbObject: "v_exec_kpis (view)" },
  exec_summary: { poweredBy: "LLM (governed inference)", sourceType: "agent", usesModel: true, note: "Generated live by an LLM via AICP inference, grounded on the current KPIs, risks, regional load and forecast." },
  readiness: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "readiness", dbObject: "readiness" },
  map: { poweredBy: "SQL Data Lake (GIS)", sourceType: "database", statementKey: "map_regions · map_stations · map_hospitals · map_incidents", dbObject: "v_map_regions · stations · hospitals · incidents" },
  incident_feed: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "incident_feed", dbObject: "incidents" },
  risks: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "risks", dbObject: "risks" },
  recommendations: { poweredBy: "Decision-intelligence agent (LLM)", sourceType: "agent", usesModel: true, note: "Generated live by an LLM via AICP inference, grounded on current KPIs, risks, hotspots, hospital capacity and fleet status." },
  call_forecast: { poweredBy: "Predictive AI (LLM)", sourceType: "agent", usesModel: true, note: "Forecast generated live by an LLM via AICP inference from today's call volume, hourly distribution and response trend." },
  response_prediction: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "response_prediction", dbObject: "response_prediction" },
  hotspots: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "hotspots", dbObject: "hotspots" },
  ambulance_demand: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "ambulance_demand", dbObject: "ambulance_demand" },
  hospital_capacity: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "hospital_capacity", dbObject: "hospital_capacity" },
  fleet_maintenance: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "fleet_maintenance", dbObject: "fleet_maintenance" },
  crew_fatigue: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "crew_fatigue", dbObject: "crew_fatigue" },
  emergency_type_mix: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "emergency_type_mix", dbObject: "emergency_type_mix" },
  response_trend: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "response_trend", dbObject: "response_trend" },
  calls_by_hour: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "calls_by_hour", dbObject: "calls_hourly" },
  calls_by_region: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "calls_by_region", dbObject: "v_calls_by_region (view)" },
  incidents_by_category: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "incidents_by_category", dbObject: "incidents_by_category" },
  ops_metrics: { poweredBy: "SQL Data Lake", sourceType: "database", statementKey: "ops_metrics", dbObject: "ops_metrics" },
  sim: { poweredBy: "What-If capability (LLM)", sourceType: "agent", usesModel: true, note: "Scenario list + baseline come from the srca_datalake connector; the projected impact is estimated live by the configured AICP What-If capability. Without one, a deterministic delta calculation is used." },
  copilot: { poweredBy: "AI Agent (governed inference)", sourceType: "agent", usesModel: true, usesAgent: true, note: "Answers via AICP inference, grounded on the live KPI snapshot." },
  knowledge: { poweredBy: "Knowledge Base + RAG", sourceType: "knowledge", usesCollection: true, usesModel: true, note: "Retrieval-augmented answers with citations." },
};

/** Runtime values injected from the workspace config + resolved AICP names (via ProvenanceContext). */
export interface ProvenanceRuntime {
  connectorId: string;
  connectorName?: string | null;
  /** The model AICP resolved for the capability-backed surfaces this render. */
  model?: string | null;
  /** surfaceKey → the AICP capability id that powers it (from config). */
  capabilityIds?: Record<string, string>;
  /** capability id → display name. */
  capabilityNames?: Record<string, string>;
}

export interface ProvenanceRow {
  label: string;
  value: string;
}

/** A displayable row set for a surface, merging static facts with runtime config. */
export function resolveProvenance(
  key: string,
  rt: ProvenanceRuntime,
): { info: ProvenanceInfo; rows: ProvenanceRow[] } | null {
  const info = PROVENANCE[key];
  if (!info) return null;
  const rows: ProvenanceRow[] = [];
  const sourceLabel =
    info.sourceType === "database" ? "Database (SQL data lake)" :
    info.sourceType === "knowledge" ? "AICP AI Capability (knowledge / RAG)" :
    "AICP AI Capability";
  rows.push({ label: "Source", value: sourceLabel });

  const modelLabel = rt.model || "resolved by AICP governance per request";
  if (info.sourceType === "database") {
    rows.push({
      label: "Connector",
      value: rt.connectorName
        ? `${rt.connectorName} · SQL Database`
        : rt.connectorId
          ? `${rt.connectorId} · SQL Database`
          : "not configured",
    });
    if (rt.connectorName && rt.connectorId) rows.push({ label: "Connector id", value: rt.connectorId });
    if (info.statementKey) rows.push({ label: "Saved query", value: info.statementKey });
    if (info.dbObject) rows.push({ label: "Data object", value: info.dbObject });
    rows.push({ label: "Model", value: "— (direct SQL query, no model)" });
    rows.push({ label: "Agent", value: "—" });
  } else {
    // AI surfaces are powered entirely by an AICP AI Capability (prompt/model/grounding live there).
    const capId = rt.capabilityIds?.[key];
    const capName = capId ? rt.capabilityNames?.[capId] : undefined;
    rows.push({
      label: "Capability",
      value: capName ? `${capName} (${capId})` : capId || "not configured",
    });
    rows.push({ label: "Model", value: modelLabel });
    if (info.sourceType === "knowledge") {
      rows.push({ label: "Grounding", value: "capability-owned knowledge retrieval (RAG)" });
    }
  }
  rows.push({ label: "Governance", value: "Enforced by AICP policies (risk model, audit)" });
  return { info, rows };
}
