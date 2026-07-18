// Server-side data source for the AI Operations Command Center.
//
// The workspace NEVER connects to the database directly — every read goes through
// AICP. Each surface is fetched by a saved-query key via the AICP SQL connector's
// live-query endpoint (POST /connectors/{id}/query { statement_key }), proxied by
// serverApi(). Rows are mapped to the exact shapes the components expect.
//
// There is NO static/mock fallback: if the connector isn't configured yet or a query
// fails, the surface resolves to empty (arrays → [], singletons → null) and the
// component renders an "awaiting live data" state.
import "server-only";

import { getAicpConfig } from "./aicp-config";
import { getServerLocale } from "./i18n/server";
import { serverApi } from "./server-api";
import type {
  AiSummary,
  AmbulanceDemand,
  ColoredSlice,
  CrewFatigue,
  FleetMaint,
  Forecast,
  HospitalCap,
  Hotspot,
  Incident,
  Kpi,
  LabeledValue,
  MapIncident,
  MapPoint,
  MapRegion,
  Readiness,
  Recommendation,
  ResponsePrediction,
  Risk,
  SimBaseline,
  SimScenario,
  Status,
  UtilMetric,
} from "./command-center-types";

export interface CommandCenterData {
  kpis: Kpi[];
  summary: AiSummary | null;
  mapRegions: MapRegion[];
  mapStations: MapPoint[];
  mapHospitals: MapPoint[];
  mapIncidents: MapIncident[];
  incidents: Incident[];
  risks: Risk[];
  forecast: Forecast[];
  responsePrediction: ResponsePrediction | null;
  hotspots: Hotspot[];
  ambulanceDemand: AmbulanceDemand | null;
  hospitalCapacity: HospitalCap[];
  fleetMaintenance: FleetMaint[];
  crewFatigue: CrewFatigue | null;
  recommendations: Recommendation[];
  emergencyTypes: ColoredSlice[];
  responseTrend: number[];
  callsByHour: number[];
  callsByRegion: LabeledValue[];
  incidentsByCategory: ColoredSlice[];
  opsMetrics: UtilMetric[];
  readiness: Readiness[];
  readinessOverall: number | null;
  simBaseline: SimBaseline | null;
  simScenarios: SimScenario[];
  /** ISO time the surfaces were fetched from AICP; null when no live data. */
  updatedAt: string | null;
  /** Real names resolved from AICP for the per-widget data-lineage popovers. */
  provenance: {
    connectorName: string | null;
    model: string | null;
    /** capability id → display name, for the AI surfaces. */
    capabilityNames: Record<string, string>;
  };
}

type Row = Record<string, unknown>;

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const str = (v: unknown): string => (v == null ? "" : String(v));
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/* ── row → shape mappers ─────────────────────────────────────────────────── */

const mapKpis = (rows: Row[]): Kpi[] =>
  rows.map((r) => ({
    key: str(r.key),
    label: str(r.label),
    value: num(r.value),
    format: str(r.format) as Kpi["format"],
    delta: num(r.delta),
    goodWhenUp: Boolean(r.good_when_up),
    status: str(r.status) as Status,
    spark: arr(r.spark).map(num),
  }));

const mapRegions = (rows: Row[]): MapRegion[] =>
  rows.map((r) => ({
    key: str(r.key),
    name: str(r.name),
    nameAr: str(r.name_ar),
    x: num(r.x),
    y: num(r.y),
    calls: num(r.calls),
    activeIncidents: num(r.active_incidents),
    avgResponse: num(r.avg_response),
    status: str(r.status) as Status,
  }));

const mapPoints = (rows: Row[]): MapPoint[] =>
  rows.map((r) => ({ x: num(r.x), y: num(r.y), label: str(r.label) }));

const mapMapIncidents = (rows: Row[]): MapIncident[] =>
  rows.map((r) => ({
    x: num(r.x),
    y: num(r.y),
    label: str(r.label),
    priority: str(r.priority) as MapIncident["priority"],
  }));

const mapIncidentFeed = (rows: Row[]): Incident[] =>
  rows.map((r) => ({
    id: str(r.id),
    time: str(r.time),
    type: str(r.type),
    location: str(r.location),
    priority: str(r.priority) as Incident["priority"],
    ambulance: str(r.ambulance),
    eta: str(r.eta),
    status: str(r.status) as Incident["status"],
  }));

const mapRisks = (rows: Row[]): Risk[] =>
  rows.map((r) => ({ label: str(r.label), score: num(r.score), level: str(r.level) as Status }));

const mapResponsePrediction = (rows: Row[]): ResponsePrediction => {
  const head = rows[0] ?? {};
  return {
    series: rows.map((r) => num(r.predicted_min)),
    labels: rows.map((r) => str(r.hour_label)),
    headline: str(head.headline),
    explanation: str(head.explanation),
    confidence: num(head.confidence),
  };
};

const mapHotspots = (rows: Row[]): Hotspot[] =>
  rows.map((r) => ({ area: str(r.area), level: str(r.level) as Status, factors: arr(r.factors).map(str) }));

const mapAmbulanceDemand = (rows: Row[]): AmbulanceDemand => {
  const r = rows[0];
  return {
    current: num(r.current),
    predictedPeak: num(r.predicted_peak),
    weekend: num(r.weekend),
    holiday: num(r.holiday),
  };
};

const mapHospitalCapacity = (rows: Row[]): HospitalCap[] =>
  rows.map((r) => ({ name: str(r.name), occupancy: num(r.occupancy), predicted: num(r.predicted) }));

const mapFleetMaintenance = (rows: Row[]): FleetMaint[] =>
  rows.map((r) => ({ unit: str(r.unit), issue: str(r.issue), dueHours: num(r.due_hours), prob: num(r.probability) }));

const mapCrewFatigue = (rows: Row[]): CrewFatigue => {
  const r = rows[0];
  return {
    shortageRisk: str(r.shortage_risk),
    overtimeRisk: num(r.overtime_risk),
    fatigueIndex: num(r.fatigue_index),
    recommendation: str(r.recommendation),
  };
};

const mapColored = (rows: Row[]): ColoredSlice[] =>
  rows.map((r) => ({ label: str(r.label), value: num(r.value), colorVar: str(r.color_var) }));

const mapLabeled = (rows: Row[]): LabeledValue[] =>
  rows.map((r) => ({ label: str(r.label), value: num(r.value) }));

const mapOpsMetrics = (rows: Row[]): UtilMetric[] =>
  rows.map((r) => ({ label: str(r.label), value: num(r.value), unit: r.unit == null ? undefined : str(r.unit) }));

const mapReadiness = (rows: Row[]): Readiness[] =>
  rows.map((r) => ({ label: str(r.label), score: num(r.score) }));

const mapSimBaseline = (rows: Row[]): SimBaseline => {
  const r = rows[0];
  return {
    response: num(r.response),
    coverage: num(r.coverage),
    hospitalLoad: num(r.hospital_load),
    fleetUtil: num(r.fleet_util),
    lives: num(r.lives),
    sla: num(r.sla),
    cost: num(r.cost),
  };
};

const mapSimScenarios = (rows: Row[]): SimScenario[] =>
  rows.map((r) => ({
    key: str(r.key),
    label: str(r.label),
    responseDelta: num(r.response_delta),
    coverageDelta: num(r.coverage_delta),
    hospitalLoadDelta: num(r.hospital_load_delta),
    fleetUtilDelta: num(r.fleet_util_delta),
    livesDelta: num(r.lives_delta),
    slaDelta: num(r.sla_delta),
    costDelta: num(r.cost_delta),
  }));

/** Collects the model AICP resolved for an inference call (for data-lineage display). */
type ModelOut = { model: string | null };

/** Best-effort fetch of a governed object's display name via AICP (null on failure). */
async function fetchAicpName(path: string): Promise<string | null> {
  try {
    const r = await throttledServerApi<{ name?: string }>(path);
    return r?.name ?? null;
  } catch {
    return null;
  }
}
/** Pull the first {...} JSON object out of an LLM response (handles code fences/preamble). */
function extractJson(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start === -1 || end <= start ? null : body.slice(start, end + 1);
}

/**
 * Run an AICP AI Capability and return its raw text output. The CAPABILITY owns the prompt,
 * model, and data grounding — the workspace only invokes it by id and renders the result.
 * Captures the resolved model (from meta) for lineage. Null when unconfigured or on failure.
 */
async function runCapability(capId: string, input: string, modelOut: ModelOut): Promise<string | null> {
  if (!capId) return null;
  try {
    const res = await throttledServerApi<{ output?: string; meta?: Record<string, unknown> }>(
      `/ai-capabilities/${capId}/run`,
      { method: "POST", body: JSON.stringify({ input }) },
      { appAuth: true }, // dashboard generators run under the app's grants (kiosk identity)
    );
    const m = res.meta ?? {};
    const model = m.model ?? m.selected_model_key ?? m.model_key;
    if (model) modelOut.model = String(model);
    return typeof res.output === "string" ? res.output : null;
  } catch (err) {
    console.error(`[command-center-source] capability ${capId} run failed:`, err);
    return null;
  }
}

/** Race a promise against a timeout so one slow/failing AICP call can't block the whole SSR render.
 *  The dashboard shows its fast connector data immediately; a laggy AI panel degrades to its fallback
 *  ("Awaiting…") instead of holding the page for the full model latency (seconds on a slow fallback). */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), ms); });
  return Promise.race([p.finally(() => clearTimeout(timer)), timeout]);
}

/** Append a language directive so the capability responds in the user's locale (values only). */
function withLocale(trigger: string, locale: string): string {
  // Force both directions — an English-only directive keeps the multilingual model from drifting
  // to Arabic when the workspace is in English.
  return locale === "ar" ? `${trigger} Respond in Arabic.` : `${trigger} Respond in English.`;
}

/** Executive briefing — capability returns JSON {headline, bullets}. */
async function runBriefing(capId: string, modelOut: ModelOut, locale: string): Promise<AiSummary | null> {
  const out = await runCapability(capId, withLocale("Generate today's operational executive briefing.", locale), modelOut);
  const json = out ? extractJson(out) : null;
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as { headline?: unknown; bullets?: unknown };
    const bullets = Array.isArray(parsed.bullets) ? parsed.bullets.map(String).filter(Boolean) : [];
    if (!parsed.headline || !bullets.length) return null;
    return { headline: String(parsed.headline), bullets, confidence: 0, sources: [], horizon: "" };
  } catch {
    return null;
  }
}

/** Call-demand forecast — capability returns JSON {forecast:[{label,value,confidence}]}. */
async function runForecast(capId: string, modelOut: ModelOut, locale: string): Promise<Forecast[] | null> {
  const out = await runCapability(capId, withLocale("Forecast today's emergency-call demand.", locale), modelOut);
  const json = out ? extractJson(out) : null;
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as { forecast?: unknown };
    if (!Array.isArray(parsed.forecast)) return null;
    const list: Forecast[] = parsed.forecast
      .map((f) => {
        const o = f as Record<string, unknown>;
        return { label: str(o.label), value: str(o.value), confidence: num(o.confidence) };
      })
      .filter((f) => f.label && f.value);
    return list.length ? list : null;
  } catch {
    return null;
  }
}

const REC_IMPACTS = ["High", "Medium", "Low"];
const REC_PRIORITIES = ["Critical", "High", "Medium"];

/** Recommendations — capability returns JSON {recommendations:[{id,title,reason,benefit,confidence,impact,priority}]}. */
async function runRecommendations(capId: string, modelOut: ModelOut, locale: string): Promise<Recommendation[] | null> {
  const out = await runCapability(capId, withLocale("Recommend prioritized operational actions.", locale), modelOut);
  const json = out ? extractJson(out) : null;
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as { recommendations?: unknown };
    if (!Array.isArray(parsed.recommendations)) return null;
    const list: Recommendation[] = parsed.recommendations
      .map((r, i) => {
        const o = r as Record<string, unknown>;
        const impact = str(o.impact);
        const priority = str(o.priority);
        return {
          id: str(o.id) || `R${i + 1}`,
          title: str(o.title),
          reason: str(o.reason),
          benefit: str(o.benefit),
          confidence: num(o.confidence),
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

/** Fully-empty dataset — returned when no connector is configured. */
function emptyData(): CommandCenterData {
  return {
    kpis: [],
    summary: null,
    mapRegions: [],
    mapStations: [],
    mapHospitals: [],
    mapIncidents: [],
    incidents: [],
    risks: [],
    forecast: [],
    responsePrediction: null,
    hotspots: [],
    ambulanceDemand: null,
    hospitalCapacity: [],
    fleetMaintenance: [],
    crewFatigue: null,
    recommendations: [],
    emergencyTypes: [],
    responseTrend: [],
    callsByHour: [],
    callsByRegion: [],
    incidentsByCategory: [],
    opsMetrics: [],
    readiness: [],
    readinessOverall: null,
    simBaseline: null,
    simScenarios: [],
    updatedAt: null,
    provenance: { connectorName: null, model: null, capabilityNames: {} },
  };
}

// Cap concurrent AICP live-query calls so a full-dashboard render doesn't burst 25
// requests at once and trip AICP rate-limiting (429). Slots are handed off between
// waiters so the active count stays balanced.
const MAX_CONCURRENT_QUERIES = 3;
let activeQueries = 0;
const queryWaiters: Array<() => void> = [];
async function acquireSlot(): Promise<void> {
  if (activeQueries < MAX_CONCURRENT_QUERIES) {
    activeQueries++;
    return;
  }
  await new Promise<void>((resolve) => queryWaiters.push(resolve));
}
function releaseSlot(): void {
  const next = queryWaiters.shift();
  if (next) next(); // hand the slot to the next waiter (no decrement)
  else activeQueries--;
}

/** serverApi wrapped by the concurrency cap — used for ALL AICP calls this module makes
 *  (queries, inference, name lookups) so a full render never bursts past the limit (429). */
async function throttledServerApi<T>(
  path: string,
  init?: RequestInit,
  opts?: { appAuth?: boolean },
): Promise<T> {
  await acquireSlot();
  try {
    // NOTE: the dashboard is a machine/kiosk surface. Its capability RUNS
    // (briefing/forecast/recommendations) and the connector data query use appAuth — the SRCA
    // Workspace application is explicitly granted those capabilities + the data-lake connector, so
    // the wallboard renders for ANY signed-in user, not only ones whose personal role is entitled.
    // Name-metadata lookups (fetchAicpName) stay on the user cookie.
    return await serverApi<T>(path, init, opts);
  } finally {
    releaseSlot();
  }
}

// Short in-process cache so rapid re-renders of this force-dynamic page don't re-fire
// every surface query. Keyed on the connector id; refreshed after the TTL.
const CACHE_TTL_MS = 12_000;
let dataCache: { key: string; at: number; data: CommandCenterData } | null = null;

/**
 * Load every command-center surface through AICP (concurrency-capped, briefly cached).
 * Surfaces with no live data (unconfigured connector or a failing query) resolve to
 * empty — components then render an "awaiting live data" state. No static/mock data.
 */
export async function loadCommandCenterData(): Promise<CommandCenterData> {
  const { datalakeConnectorId: connectorId } = await getAicpConfig();
  if (!connectorId) return emptyData();

  const locale = getServerLocale();
  const key = `${connectorId}:${locale}`;
  if (dataCache && dataCache.key === key && Date.now() - dataCache.at < CACHE_TTL_MS) {
    return dataCache.data;
  }
  const data = await computeCommandCenterData(connectorId, locale);
  dataCache = { key, at: Date.now(), data };
  return data;
}

async function computeCommandCenterData(connectorId: string, locale: string): Promise<CommandCenterData> {

  /** Fetch one saved query's rows through AICP (concurrency-capped). Throws on failure. */
  async function runQuery(statementKey: string): Promise<Row[]> {
    await acquireSlot();
    try {
      const res = await serverApi<{ rows?: Row[] }>(
        `/connectors/${connectorId}/query`,
        { method: "POST", body: JSON.stringify({ statement_key: statementKey }) },
        { appAuth: true },
      );
      return res.rows ?? [];
    } finally {
      releaseSlot();
    }
  }

  /** Run + map a surface; resolve to `empty` on any error or empty result. */
  async function safe<T>(statementKey: string, map: (rows: Row[]) => T, empty: T): Promise<T> {
    try {
      const rows = await runQuery(statementKey);
      if (!rows.length) return empty;
      return map(rows);
    } catch (err) {
      console.error(`[command-center-source] ${statementKey} failed:`, err);
      return empty;
    }
  }

  // Probe once: if the live-query endpoint isn't available yet (e.g. not implemented
  // in AICP), return empty quietly instead of firing 25 failing requests per render.
  let kpiRows: Row[];
  try {
    kpiRows = await runQuery("exec_kpis");
  } catch (err) {
    console.error("[command-center-source] data lake unavailable — surfaces empty:", err);
    return emptyData();
  }
  const kpis = kpiRows.length ? mapKpis(kpiRows) : [];

  const [
    mapRegionsData,
    mapStations,
    mapHospitals,
    mapIncidents,
    incidents,
    risks,
    responsePrediction,
    hotspots,
    ambulanceDemand,
    hospitalCapacity,
    fleetMaintenance,
    crewFatigue,
    emergencyTypes,
    responseTrend,
    callsByHour,
    callsByRegion,
    incidentsByCategory,
    opsMetrics,
    readiness,
    simBaseline,
    simScenarios,
  ] = await Promise.all([
    safe<MapRegion[]>("map_regions", mapRegions, []),
    safe<MapPoint[]>("map_stations", mapPoints, []),
    safe<MapPoint[]>("map_hospitals", mapPoints, []),
    safe<MapIncident[]>("map_incidents", mapMapIncidents, []),
    safe<Incident[]>("incident_feed", mapIncidentFeed, []),
    safe<Risk[]>("risks", mapRisks, []),
    safe<ResponsePrediction | null>("response_prediction", mapResponsePrediction, null),
    safe<Hotspot[]>("hotspots", mapHotspots, []),
    safe<AmbulanceDemand | null>("ambulance_demand", mapAmbulanceDemand, null),
    safe<HospitalCap[]>("hospital_capacity", mapHospitalCapacity, []),
    safe<FleetMaint[]>("fleet_maintenance", mapFleetMaintenance, []),
    safe<CrewFatigue | null>("crew_fatigue", mapCrewFatigue, null),
    safe<ColoredSlice[]>("emergency_type_mix", mapColored, []),
    safe<number[]>("response_trend", (rows) => rows.map((r) => num(r.avg_response)), []),
    safe<number[]>("calls_by_hour", (rows) => rows.map((r) => num(r.calls)), []),
    safe<LabeledValue[]>("calls_by_region", mapLabeled, []),
    safe<ColoredSlice[]>("incidents_by_category", mapColored, []),
    safe<UtilMetric[]>("ops_metrics", mapOpsMetrics, []),
    safe<Readiness[]>("readiness", mapReadiness, []),
    safe<SimBaseline | null>("sim_baseline", mapSimBaseline, null),
    safe<SimScenario[]>("sim_scenarios", mapSimScenarios, []),
  ]);

  // Briefing, forecast and recommendations are produced by AICP AI Capabilities (the capability
  // owns the prompt, model and grounding). The workspace only invokes them by their configured id.
  const modelOut: ModelOut = { model: null };
  const cfg = await getAicpConfig();
  // Briefing, forecast and recommendations are generated CLIENT-SIDE by their own panels (each loads
  // independently with its own spinner, via lib/command-center-assist). The SSR render never waits on
  // an AI model, so a slow/failing model (e.g. Qwen down → slow fallback) can't block the dashboard.
  const summary = null;
  const forecast: Forecast[] = [];
  const recommendations: Recommendation[] = [];

  // Resolve real names for the lineage popovers: the connector + each configured capability.
  const capIds = Array.from(
    new Set(
      [
        cfg.briefingCapabilityId,
        cfg.forecastCapabilityId,
        cfg.recommendationsCapabilityId,
        cfg.copilotCapabilityId,
        cfg.knowledgeCapabilityId,
      ].filter(Boolean),
    ),
  );
  // Names are cosmetic (lineage popovers) — never let them hold the render.
  const [connectorName, capNamePairs] = await Promise.all([
    withTimeout(fetchAicpName(`/connectors/${connectorId}`), 2500, null),
    withTimeout(
      Promise.all(capIds.map((id) => fetchAicpName(`/ai-capabilities/${id}`).then((name) => [id, name] as const))),
      2500,
      [] as (readonly [string, string | null])[],
    ),
  ]);
  const capabilityNames: Record<string, string> = {};
  for (const [id, name] of capNamePairs) if (name) capabilityNames[id] = name;

  const readinessOverall =
    readiness.find((r) => r.label === "Operational Readiness")?.score ?? null;

  return {
    kpis,
    summary,
    mapRegions: mapRegionsData,
    mapStations,
    mapHospitals,
    mapIncidents,
    incidents,
    risks,
    forecast,
    responsePrediction,
    hotspots,
    ambulanceDemand,
    hospitalCapacity,
    fleetMaintenance,
    crewFatigue,
    recommendations,
    emergencyTypes,
    responseTrend,
    callsByHour,
    callsByRegion,
    incidentsByCategory,
    opsMetrics,
    readiness,
    readinessOverall,
    simBaseline,
    simScenarios,
    updatedAt: new Date().toISOString(),
    provenance: { connectorName, model: modelOut.model, capabilityNames },
  };
}
