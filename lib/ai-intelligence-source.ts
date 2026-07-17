// AICP Intelligence — governance & audit data loader.
//
// Reads the platform's live governance posture straight from AICP (no prompts, no local
// computation): governance score, risk models, violations, human-in-the-loop review queue,
// audit ledger, and 24h AI-request metrics. Every call is independent and fault-tolerant —
// a missing endpoint or a permission denial degrades that one tile to an empty state instead
// of failing the page.
import "server-only";

import { serverApi } from "@/lib/server-api";

/* ── shapes (subset of AICP's responses we render) ──────────────────────────── */

export interface GovScore {
  overall: number | null;
  grade: string | null;
  posture: string | null;
  coverage: number | null;
}

export interface RiskModel {
  key: string;
  name: string;
  version?: number | string;
  status?: string;
  defaultLevel?: string;
}

export interface HitlTask {
  id: string;
  title: string;
  priority?: string;
  status?: string;
  classification?: string;
  dueAt?: string | null;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  createdAt?: string;
}

export interface AiMetrics {
  totalRequests: number | null;
  successRate: number | null;
  blocked: number | null;
  avgLatencyMs: number | null;
  totalCost: number | null;
  currency: string | null;
}

export interface GovernanceData {
  score: GovScore | null;
  riskModels: RiskModel[];
  violationsCount: number | null;
  pendingReview: HitlTask[];
  audit: AuditEntry[];
  metrics: AiMetrics | null;
  /** true if at least one governance call succeeded (used to distinguish "no access" from "empty"). */
  connected: boolean;
}

/* ── helpers ────────────────────────────────────────────────────────────────── */

/** Call an AICP endpoint, returning `fallback` (not throwing) on any error. */
async function safe<T>(path: string, fallback: T): Promise<{ value: T; ok: boolean }> {
  try {
    const value = await serverApi<T>(path);
    return { value, ok: true };
  } catch {
    return { value: fallback, ok: false };
  }
}

const PENDING_STATUSES = new Set(["pending", "open", "assigned", "in_review", "escalated", "new"]);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);

/** Coerce an AICP response to an array. Some endpoints wrap results as {items:[…]}/{data:[…]}
 *  or return a bare object — anything non-array would blow up `.map`, so normalise it here. */
function arr(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["items", "data", "results", "rows", "records"]) {
      if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
    }
  }
  return [];
}

/** Resolve an AI capability's display name (best-effort; returns undefined on failure). */
export async function fetchCapabilityName(id: string): Promise<string | undefined> {
  if (!id) return undefined;
  const res = await safe<Record<string, unknown>>(`/ai-capabilities/${id}`, {});
  return res.ok ? (str(res.value.name) ?? str(res.value.key)) : undefined;
}

/* ── Model & Cost (FinOps) shapes ───────────────────────────────────────────── */

export interface CostTotals {
  requests: number | null;
  cost: number | null;
  currency: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  successRate: number | null;
}

export interface ModelUsage {
  modelKey: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  avgLatencyMs: number | null;
}

export interface BudgetStatus {
  id: string;
  name: string;
  scope?: string;
  period?: string;
  enforcement?: string;
  limit: number;
  spent: number;
  remaining: number;
  pct: number;
}

export interface ModelCostData {
  totals: CostTotals | null;
  byModel: ModelUsage[];
  budgets: BudgetStatus[];
  connected: boolean;
}

/** AICP cost endpoints report money in micros (millionths of a currency unit). */
const fromMicros = (v: unknown): number => (typeof v === "number" ? v / 1_000_000 : 0);

export async function loadModelCostData(): Promise<ModelCostData> {
  const [overview, byModel, budgets] = await Promise.all([
    safe<Record<string, unknown>>("/metrics/overview?hours=24", {}),
    safe<Record<string, unknown>[]>("/metrics/by-model?hours=24", []),
    safe<Record<string, unknown>[]>("/cost/budgets/status", []),
  ]);

  const connected = overview.ok || byModel.ok || budgets.ok;
  const o = overview.value;

  const totals: CostTotals | null = overview.ok
    ? {
        requests: num(o.total_requests),
        cost: num(o.total_cost),
        currency: str(o.currency) ?? null,
        inputTokens: num(o.input_tokens),
        outputTokens: num(o.output_tokens),
        avgLatencyMs: num(o.avg_latency_ms),
        p95LatencyMs: num(o.p95_latency_ms),
        successRate: num(o.success_rate),
      }
    : null;

  const models: ModelUsage[] = arr(byModel.value)
    .map((m) => ({
      modelKey: String(m.model_key ?? "unknown"),
      requests: num(m.requests) ?? 0,
      inputTokens: num(m.input_tokens) ?? 0,
      outputTokens: num(m.output_tokens) ?? 0,
      cost: num(m.cost) ?? 0,
      avgLatencyMs: num(m.avg_latency_ms),
    }))
    .sort((a, b) => b.cost - a.cost || b.requests - a.requests);

  const budgetStatus: BudgetStatus[] = arr(budgets.value).map((b) => ({
    id: String(b.id ?? b.budget_key ?? ""),
    name: String(b.name ?? b.budget_key ?? "Budget"),
    scope: str(b.scope),
    period: str(b.period),
    enforcement: str(b.enforcement),
    limit: fromMicros(b.limit_micros),
    spent: fromMicros(b.spent_micros),
    remaining: fromMicros(b.remaining_micros),
    pct: num(b.pct) ?? 0,
  }));

  return { totals, byModel: models, budgets: budgetStatus, connected };
}

/* ── loader ─────────────────────────────────────────────────────────────────── */

export async function loadGovernanceData(): Promise<GovernanceData> {
  const [score, models, violations, tasks, audit, metrics] = await Promise.all([
    safe<Record<string, unknown>>("/governance/score?days=7", {}),
    safe<Record<string, unknown>[]>("/governance/risk-models", []),
    safe<Record<string, unknown>[]>("/governance/violations?limit=200", []),
    safe<Record<string, unknown>[]>("/validation/tasks", []),
    safe<Record<string, unknown>[]>("/audit-logs?limit=8", []),
    safe<Record<string, unknown>>("/metrics/overview?hours=24", {}),
  ]);

  const connected =
    score.ok || models.ok || violations.ok || tasks.ok || audit.ok || metrics.ok;

  const s = score.value;
  const govScore: GovScore | null = score.ok
    ? {
        overall: num(s.overall),
        grade: str(s.grade) ?? null,
        posture: str(s.posture) ?? null,
        coverage: num(s.coverage_score),
      }
    : null;

  const riskModels: RiskModel[] = arr(models.value).map((m) => ({
    key: String(m.key ?? m.name ?? ""),
    name: String(m.name ?? m.key ?? ""),
    version: (m.version as number | string) ?? undefined,
    status: str(m.status),
    defaultLevel: str(m.default_level),
  }));

  const allTasks: HitlTask[] = arr(tasks.value).map((tk) => ({
    id: String(tk.id ?? ""),
    title: String(tk.title ?? tk.subject_type ?? "Review task"),
    priority: str(tk.priority),
    status: str(tk.status),
    classification: str(tk.classification),
    dueAt: str(tk.due_at) ?? null,
  }));
  const pendingReview = allTasks.filter(
    (tk) => !tk.status || PENDING_STATUSES.has(tk.status.toLowerCase()),
  );

  const auditEntries: AuditEntry[] = (audit.value ?? []).map((a) => ({
    id: String(a.id ?? a.seq ?? ""),
    actor: String(a.actor_name ?? a.actor_username ?? a.actor_type ?? "system"),
    action: String(a.action ?? ""),
    resourceType: str(a.resource_type),
    resourceId: str(a.resource_id),
    createdAt: str(a.created_at),
  }));

  const m = metrics.value;
  const aiMetrics: AiMetrics | null = metrics.ok
    ? {
        totalRequests: num(m.total_requests),
        successRate: num(m.success_rate),
        blocked: num(m.blocked),
        avgLatencyMs: num(m.avg_latency_ms),
        totalCost: num(m.total_cost),
        currency: str(m.currency) ?? null,
      }
    : null;

  return {
    score: govScore,
    riskModels,
    violationsCount: violations.ok ? (violations.value ?? []).length : null,
    pendingReview,
    audit: auditEntries,
    metrics: aiMetrics,
    connected,
  };
}
