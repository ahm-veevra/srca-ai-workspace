/**
 * SRCA AI Operations Command Center — types, formatting helpers, and static UI
 * scaffolding (suggestion chips, architecture explainer). Contains NO operational
 * data: every live figure is loaded through AICP (lib/command-center-source.ts) and
 * surfaces render an "awaiting live data" empty state until it arrives.
 */
import { type MessageKey } from "@/lib/i18n/messages";

export type Status = "good" | "warn" | "critical";

/* ── Surface data shapes ────────────────────────────────────────────────────── */
export interface Kpi {
  key: string;
  label: string;
  value: number;
  /** For formatting: "int" | "min" | "pct" | "score". */
  format: "int" | "min" | "pct" | "score";
  delta: number; // percentage change vs. yesterday
  goodWhenUp: boolean;
  status: Status;
  spark: number[];
}

export interface AiSummary {
  headline: string;
  bullets: string[];
  confidence: number;
  sources: string[];
  horizon: string;
}

export interface MapRegion {
  key: string;
  name: string;
  nameAr: string;
  x: number;
  y: number;
  calls: number;
  activeIncidents: number;
  avgResponse: number;
  status: Status;
}
export interface MapPoint { x: number; y: number; label: string }
export interface MapIncident extends MapPoint { priority: "high" | "medium" | "low" }

export interface Incident {
  id: string;
  time: string;
  type: string;
  location: string;
  priority: "High" | "Medium" | "Low";
  ambulance: string;
  eta: string;
  status: "En Route" | "On Scene" | "Transporting" | "Dispatched" | "Resolved";
}

export interface Forecast { label: string; value: string; confidence: number }

export interface ResponsePrediction {
  series: number[];
  labels: string[];
  headline: string;
  explanation: string;
  confidence: number;
}

export interface Hotspot { area: string; level: Status; factors: string[] }
export interface AmbulanceDemand { current: number; predictedPeak: number; weekend: number; holiday: number }
export interface HospitalCap { name: string; occupancy: number; predicted: number }
export interface FleetMaint { unit: string; issue: string; dueHours: number; prob: number }
export interface CrewFatigue {
  shortageRisk: string;
  overtimeRisk: number;
  fatigueIndex: number;
  recommendation: string;
}

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  benefit: string;
  confidence: number;
  impact: "High" | "Medium" | "Low";
  priority: "Critical" | "High" | "Medium";
}

export interface Risk { label: string; score: number; level: Status }

/** A labelled value for bar charts. */
export interface LabeledValue { label: string; value: number }
/** A labelled value with a themed colour token for pies/segments. */
export interface ColoredSlice { label: string; value: number; colorVar: string }

export interface UtilMetric { label: string; value: number; unit?: string }
export interface Readiness { label: string; score: number }

export interface SimBaseline {
  response: number;
  coverage: number;
  hospitalLoad: number;
  fleetUtil: number;
  lives: number;
  sla: number;
  cost: number;
}
export interface SimScenario {
  key: string;
  label: string;
  responseDelta: number;
  coverageDelta: number;
  hospitalLoadDelta: number;
  fleetUtilDelta: number;
  livesDelta: number;
  slaDelta: number;
  costDelta: number;
}

export interface KnowledgeItem {
  question: string;
  answer: string;
  citations: { title: string; source: string }[];
}

export interface ArchRow { component: string; poweredBy: string }

/* ── Formatting helpers ─────────────────────────────────────────────────────── */
export function fmtKpi(v: number, format: Kpi["format"]): string {
  if (format === "pct") return `${v}%`;
  if (format === "min") return `${v}`;
  if (format === "score") return `${v}`;
  return v.toLocaleString();
}
export const STATUS_TEXT: Record<Status, string> = { good: "text-success", warn: "text-warning", critical: "text-danger" };
export const STATUS_BG: Record<Status, string> = { good: "bg-success", warn: "bg-warning", critical: "bg-danger" };
export const STATUS_SOFT: Record<Status, string> = {
  good: "bg-success/10 text-success",
  warn: "bg-warning/10 text-warning",
  critical: "bg-danger/10 text-danger",
};

/* ── Static UI scaffolding (not operational data) ───────────────────────────── */
// Suggestion chips are dictionary keys — rendered and sent via t(), so they follow
// the active locale (and the AI answers in whatever language the chip resolves to).
export const COPILOT_SUGGESTIONS: MessageKey[] = [
  "cc.copilot.sug.responseTime",
  "cc.copilot.sug.predictDemand",
  "cc.copilot.sug.cardiac",
  "cc.copilot.sug.station",
  "cc.copilot.sug.execReport",
  "cc.copilot.sug.shift",
  "cc.copilot.sug.risks",
  "cc.copilot.sug.translate",
];

export const KNOWLEDGE_SUGGESTIONS: MessageKey[] = [
  "cc.knowledge.sug.cpr",
  "cc.knowledge.sug.bleeding",
  "cc.knowledge.sug.triage",
  "cc.knowledge.sug.heatstroke",
];

/** Reusable AI-panel meta (provenance chip). Not operational telemetry. */
export const DEFAULT_CONFIDENCE = {
  value: 96,
  sources: ["Historical incidents", "Traffic", "Weather", "Hospital occupancy", "Calendar events", "Live GPS"],
  horizon: "Next 12 hours",
};

/** How each surface is powered by AICP — an architecture explainer, not data. */
export const ARCHITECTURE: ArchRow[] = [
  { component: "Emergency Calls & KPIs", poweredBy: "Data Lake Connector (SQL)" },
  { component: "Live KPIs & Analytics", poweredBy: "Enterprise Connectors" },
  { component: "Executive Summary", poweredBy: "LLM + Prompt + Workflow" },
  { component: "Predictions & Forecasts", poweredBy: "Predictive AI Capability" },
  { component: "Recommendations", poweredBy: "Decision Intelligence Agent" },
  { component: "Knowledge Assistant", poweredBy: "Knowledge Base + RAG" },
  { component: "AI Copilot", poweredBy: "AI Agent" },
  { component: "Reports (PDF / PPT)", poweredBy: "AI Workflow" },
  { component: "Interactive Map", poweredBy: "GIS Connector" },
  { component: "Governance & Audit", poweredBy: "AICP Policies" },
];
