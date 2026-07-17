// Types mirroring the backend IAM schemas.

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  status: string;
  is_superadmin: boolean;
  mfa_enabled: boolean;
  last_login_at: string | null;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface MembershipSummary {
  tenant: TenantSummary;
  role: string;
  membership_id: string;
}

export interface Session {
  user: UserProfile;
  active_tenant: TenantSummary | null;
  memberships: MembershipSummary[];
  permissions: string[];
}

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  status: string;
  is_superadmin: boolean;
  mfa_enabled: boolean;
  role: string | null;
  membership_id: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  code: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  permission_codes: string[];
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface OidcProviderPublic {
  slug: string;
  name: string;
  login_path: string;
}

export interface OidcProvider {
  id: string;
  slug: string;
  name: string;
  issuer: string;
  client_id: string;
  scopes: string;
  default_role_name: string;
  auto_provision: boolean;
  allowed_domains: string[];
  claim_email: string;
  claim_name: string;
  group_claim: string;
  role_mappings: Record<string, string>;
  sync_roles: boolean;
  enabled: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  secret: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string | null;
  actor_id: string | null;
  actor_type: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip: string | null;
  request_id: string | null;
  seq: number;
  hash: string;
  prev_hash: string | null;
  created_at: string;
}

export interface AuditVerifyResult {
  valid: boolean;
  checked: number;
  broken_at_seq: number | null;
  message: string;
}

export function hasPerm(perms: string[], code: string): boolean {
  return perms.includes("*") || perms.includes(code);
}

// ── Registry ──────────────────────────────────────────────────────────────────
export interface Provider {
  id: string;
  type: string;
  display_name: string;
  base_url: string | null;
  config: Record<string, unknown>;
  status: string;
  created_at: string;
}

export interface Credential {
  id: string;
  provider_id: string;
  name: string;
  key_version: number;
  last_used_at: string | null;
  rotated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Capability {
  id: string;
  code: string;
  description: string;
}

export interface ModelHealth {
  status: string;
  latency_ms: number | null;
  checked_at: string;
  detail: Record<string, unknown>;
}

export interface ModelRow {
  id: string;
  provider_id: string;
  provider_type: string;
  key: string;
  display_name: string;
  model_name: string;
  modality: string;
  status: string;
  endpoint: string | null;
  default_params: Record<string, unknown>;
  context_window: number | null;
  is_onprem: boolean;
  tags: string[];
  fallback_model_key: string | null;
  capability_codes: string[];
  has_credential: boolean;
  latest_health: ModelHealth | null;
  created_at: string;
}

export interface ModelTestResult {
  ok: boolean;
  text: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  error: string | null;
}

export const PROVIDER_TYPES = [
  "openai",
  "anthropic",
  "azure_openai",
  "onprem",
  "generic",
] as const;

export const MODALITIES = ["chat", "text", "embedding", "vision", "rerank"] as const;

// ── Service Bus ───────────────────────────────────────────────────────────────
export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cost: string;
  currency: string;
}

export interface InferenceResult {
  trace_id: string;
  status: string;
  output: { text?: string; finish_reason?: string; model?: string } | null;
  selected_model_key: string | null;
  usage: Usage | null;
  latency_ms: number | null;
  policy: { pre?: Record<string, unknown>; post?: Record<string, unknown> } | null;
  error: Record<string, unknown> | null;
}

export interface RequestSummary {
  trace_id: string;
  source: string;
  status: string;
  intent: string | null;
  sensitivity: string;
  selected_model_key: string | null;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: string;
  currency: string;
  latency_ms: number | null;
  created_at: string;
}

export interface StageRead {
  stage: string;
  status: string;
  seq: number;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  detail: Record<string, unknown>;
}

export interface RequestDetail extends RequestSummary {
  input: Record<string, unknown>;
  output: { text?: string; finish_reason?: string; model?: string } | null;
  policy_decision: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  parent_request_id: string | null;
  replayed_from: string | null;
  stages: StageRead[];
}

export interface TraceEvent {
  type: string;
  trace_id?: string;
  stage?: string;
  status?: string;
  seq?: number;
  duration_ms?: number;
  model_key?: string | null;
  latency_ms?: number;
  [k: string]: unknown;
}

// ── Routing ───────────────────────────────────────────────────────────────────
export interface Policy {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  created_at: string;
}

export interface Rule {
  id: string;
  policy_id: string;
  name: string;
  priority: number;
  enabled: boolean;
  conditions: Record<string, unknown>;
  action: Record<string, unknown>;
  created_at: string;
}

export interface FallbackChain {
  id: string;
  name: string;
  key: string;
  model_keys: string[];
  enabled: boolean;
  created_at: string;
}

export interface ExperimentVariant {
  model_key: string;
  weight: number;
}

export interface Experiment {
  id: string;
  name: string;
  key: string;
  type: string;
  status: string;
  variants: ExperimentVariant[];
  config: Record<string, unknown>;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
}

export interface SimulateResult {
  resolved_model_key: string | null;
  fallbacks: string[];
  reason: string;
  matched: boolean;
  detail: Record<string, unknown>;
  error: string | null;
}

export const ACTION_TYPES = [
  "route",
  "cheapest",
  "fastest",
  "onprem",
  "experiment",
  "chain",
  "block",
] as const;

// ── Prompts ───────────────────────────────────────────────────────────────────
export interface PromptVariable {
  name: string;
  type: string;
  required: boolean;
  default: string | number | boolean | null;
  description: string;
}

export interface PromptTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  status: string;
  current_version_id: string | null;
  created_at: string;
}

export interface PromptVersion {
  id: string;
  template_id: string;
  version: number;
  body: string;
  variables: PromptVariable[];
  model_hints: Record<string, unknown>;
  status: string;
  changelog: string;
  approved_at: string | null;
  created_at: string;
}

export interface PromptTestResult {
  ok: boolean;
  rendered: string;
  output: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  error: string | null;
}

export const VARIABLE_TYPES = ["string", "text", "number", "boolean"] as const;

// ── Governance ────────────────────────────────────────────────────────────────
export interface Guardrail {
  id: string;
  name: string;
  description: string;
  direction: string;
  rule_type: string;
  config: Record<string, unknown>;
  action: string;
  severity: string;
  enabled: boolean;
  priority: number;
  created_at: string;
}

export interface Violation {
  id: string;
  request_id: string | null;
  guardrail_id: string | null;
  rule_type: string;
  direction: string;
  severity: string;
  action_taken: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface GovAlert {
  id: string;
  source: string;
  severity: string;
  title: string;
  detail: Record<string, unknown>;
  status: string;
  resolved_at: string | null;
  created_at: string;
}

export interface DetectionItem {
  guardrail: string;
  rule_type: string;
  severity: string;
  action: string;
  count: number;
  samples: string[];
}

export interface ScanResult {
  action: string;
  risk_score: number;
  redactions: number;
  reasons: string[];
  masked_text: string;
  detections: DetectionItem[];
}

export interface ComplianceReport {
  period_days: number;
  total_violations: number;
  by_severity: Record<string, number>;
  by_rule_type: Record<string, number>;
  by_action: Record<string, number>;
  open_alerts: number;
}

// ── Knowledge ─────────────────────────────────────────────────────────────────
export interface Collection {
  id: string;
  key: string;
  name: string;
  description: string;
  embedding_model_key: string;
  dimension: number;
  vector_backend: string;
  created_at: string;
}

export interface KnowledgeDocument {
  id: string;
  collection_id: string;
  title: string;
  uri: string | null;
  mime: string;
  status: string;
  bytes: number;
  created_at: string;
}

export interface IngestionResult {
  document_id: string;
  status: string;
  chunks: number;
  error: string | null;
}

export interface SearchHit {
  chunk_id: string;
  document_id: string;
  document_title: string | null;
  content: string;
  score: number;
}

// ── Agents ────────────────────────────────────────────────────────────────────
export interface Tool {
  id: string;
  key: string;
  name: string;
  description: string;
  type: string;
  config: Record<string, unknown>;
  input_schema: Record<string, unknown>;
  requires_approval: boolean;
  enabled: boolean;
  created_at: string;
}

export interface Agent {
  id: string;
  key: string;
  name: string;
  description: string;
  system_prompt: string;
  model_key: string | null;
  status: string;
  memory_enabled: boolean;
  max_steps: number;
  tool_keys: string[];
  created_at: string;
}

export interface AgentRunResult {
  id: string;
  agent_id: string;
  status: string;
  output: { answer?: string } | null;
  steps: Array<Record<string, unknown>>;
  trace_ids: string[];
  error: string | null;
}

export interface Workflow {
  id: string;
  key: string;
  name: string;
  description: string;
  definition: Record<string, unknown>;
  trigger: string;
  schedule_cron: string | null;
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
}

export interface WorkflowStepRun {
  step_key: string;
  type: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
}

export interface WorkflowRunResult {
  id: string;
  workflow_id: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  context: Record<string, unknown>;
  error: string | null;
  steps: WorkflowStepRun[];
}

export interface ApprovalTask {
  id: string;
  run_id: string | null;
  step_key: string | null;
  status: string;
  payload: Record<string, unknown>;
  comment: string;
  created_at: string;
}

export const TOOL_TYPES = ["http", "retrieval", "echo"] as const;

// ── Observability ─────────────────────────────────────────────────────────────
export interface MetricsOverview {
  window_hours: number;
  total_requests: number;
  completed: number;
  failed: number;
  blocked: number;
  success_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  currency: string;
}

export interface TimePoint {
  day: string;
  requests: number;
  errors: number;
  avg_latency_ms: number;
  cost: number;
}

export interface ModelUsage {
  model_key: string | null;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  avg_latency_ms: number;
}

export interface CostSummary {
  window_days: number;
  total_cost: number;
  currency: string;
  by_model: ModelUsage[];
  by_day: TimePoint[];
}

export interface SlaEvaluation {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  comparison: string;
  current_value: number;
  met: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  comparison: string;
  threshold: number;
  window_hours: number;
  severity: string;
  channels: string[];
  enabled: boolean;
  created_at: string;
}

export interface SystemHealth {
  status: string;
  database: boolean;
  redis: boolean;
  vector_store: boolean;
  search: boolean;
  models: Record<string, number>;
  checked_at: string;
}

// ── Integration ───────────────────────────────────────────────────────────────
export interface Integration {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  status: string;
  health: Record<string, unknown>;
  last_used_at: string | null;
  created_at: string;
}

export interface Webhook {
  id: string;
  url: string;
  description: string;
  events: string[];
  enabled: boolean;
  failure_count: number;
  created_at: string;
}

export interface WebhookCreated extends Webhook {
  secret: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  status: string;
  response_code: number | null;
  attempts: number;
  last_error: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface CatalogEntry {
  path: string;
  methods: string[];
  name: string;
  tags: string[];
}

export interface IntegrationTestResult {
  ok: boolean;
  detail: Record<string, unknown>;
  error: string | null;
}

export const INTEGRATION_TYPES = ["http", "email", "sms", "esign", "crm", "erp"] as const;

// ── Configuration Seed / Packages ─────────────────────────────────────────────
export interface PackageSummary {
  key: string;
  name: string;
  version: string;
  description: string;
  category: string;
  requires: string[];
  resource_counts: Record<string, number>;
  installed: boolean;
  installed_version: string | null;
}

export interface InstalledPackage {
  id: string;
  package_key: string;
  version: string;
  status: string;
  summary: Record<string, unknown>;
  created_at: string;
}

export interface DashboardWidget {
  type: string;
  title: string;
  source: string;
  options: Record<string, unknown>;
}

export interface DashboardDef {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  widgets: DashboardWidget[];
  is_system: boolean;
  created_at: string;
}

// ── System configuration ──────────────────────────────────────────────────────
export interface Language {
  id: string;
  code: string;
  name: string;
  native_name: string;
  direction: string;
  is_default: boolean;
  enabled: boolean;
  created_at: string;
}

export interface Region {
  id: string;
  code: string;
  name: string;
  timezone: string;
  locale: string;
  enabled: boolean;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  key: string;
  name: string;
  channel: string;
  locale: string;
  subject: string;
  body: string;
  enabled: boolean;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: unknown;
  category: string;
  description: string;
  created_at: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
  parent_code: string | null;
  created_at: string;
}

export const METRIC_NAMES = [
  "success_rate",
  "error_rate",
  "avg_latency_ms",
  "p95_latency_ms",
  "request_count",
] as const;

export const RULE_TYPES = ["pii", "injection", "content", "regex"] as const;
export const GUARDRAIL_ACTIONS = [
  "allow",
  "redact",
  "block",
  "flag",
  "require_approval",
] as const;
export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const DIRECTIONS = ["input", "output", "both"] as const;
