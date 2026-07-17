/** SRCA AI Workspace — the business-experience layer over AICP. This catalog frames the 20
 * "Centers" and the AICP capability-coverage matrix. It is honest about what is already
 * backed by a live surface vs. on the roadmap; nothing here fabricates a capability.
 *
 * No intelligence lives in SRCA AI Workspace — every Center consumes AICP APIs. */
import {
  Boxes, Brain, Briefcase, Building2, ClipboardCheck, FileSearch, FileText, FlaskConical,
  GraduationCap, Handshake, LayoutGrid, MessagesSquare, Mic, Network, Presentation, ScanText,
  Search, ShieldCheck, Sparkles, Users, Workflow, type LucideIcon,
} from "lucide-react";

export type CenterStatus = "live" | "roadmap";

export interface Center {
  key: string;
  name: string;
  purpose: string;
  icon: LucideIcon;
  status: CenterStatus;
  /** Where it opens when live; the AICP surface that backs it. */
  href?: string;
  capabilities: string[];
  personas: string[];
}

export const CENTERS: Center[] = [
  {
    key: "v_gpt", name: "V-GPT", icon: MessagesSquare, status: "live", href: "/v-gpt",
    purpose: "An enterprise AI workspace — governed chat over your models and knowledge.",
    capabilities: ["Chat", "Multi-turn", "Knowledge grounding", "Model routing", "Governance"],
    personas: ["Employee", "Manager", "Executive"],
  },
  {
    key: "document_intelligence", name: "Document Intelligence Center", icon: ScanText,
    status: "live", href: "/document-intelligence",
    purpose: "Recognise, classify and extract from documents end to end.",
    capabilities: ["OCR", "Classification", "Extraction", "Summarisation", "Redaction"],
    personas: ["Employee", "Compliance Officer"],
  },
  {
    key: "knowledge", name: "Knowledge Center", icon: Network, status: "live", href: "/knowledge-center",
    purpose: "Semantic search, RAG and connected knowledge over your content.",
    capabilities: ["Semantic search", "RAG", "Knowledge graph", "Business facts"],
    personas: ["Researcher", "Employee"],
  },
  {
    key: "correspondence", name: "Correspondence Intelligence Center", icon: FileText,
    status: "live", href: "/correspondence-intelligence",
    purpose: "Triage, summarise and draft replies to official correspondence.",
    capabilities: ["OCR", "Classification", "Summarisation", "Drafting", "Approval"],
    personas: ["Employee", "Manager"],
  },
  {
    key: "executive", name: "Executive Intelligence Center", icon: Presentation,
    status: "live", href: "/executive-intelligence",
    purpose: "Briefings and insights synthesised from your operations.",
    capabilities: ["Briefings", "Summarisation", "Trend insight", "Q&A"],
    personas: ["Executive", "Manager"],
  },
  {
    key: "compliance", name: "Compliance Intelligence Center", icon: ShieldCheck,
    status: "live", href: "/compliance-intelligence",
    purpose: "Enforce and monitor AI governance and data protection.",
    capabilities: ["PII protection", "Content controls", "Audit", "Risk scoring"],
    personas: ["Compliance Officer"],
  },
  {
    key: "enterprise_search", name: "Enterprise Search Center", icon: Search,
    status: "live", href: "/knowledge-center",
    purpose: "Natural-language search across your organisation's knowledge.",
    capabilities: ["Semantic search", "Hybrid search", "Connected knowledge"],
    personas: ["Employee", "Researcher"],
  },
  {
    key: "agents", name: "Agent Marketplace", icon: Sparkles, status: "live", href: "/agent-marketplace",
    purpose: "Governed AI agents that complete multi-step tasks with tools.",
    capabilities: ["Agents", "Tool use", "Workflows", "Approvals"],
    personas: ["AI Administrator", "Solution Architect"],
  },
  {
    key: "workflows", name: "Workflow Marketplace", icon: Workflow, status: "live",
    href: "/workflow-marketplace",
    purpose: "Orchestrated multi-step workflows you can run.",
    capabilities: ["Workflow orchestration", "Approvals", "Tool steps"],
    personas: ["AI Administrator", "Solution Architect"],
  },
  {
    key: "capabilities", name: "AI Capability Marketplace", icon: LayoutGrid, status: "live",
    href: "/capabilities",
    purpose: "Discover every AICP capability with its business value and a way to try it.",
    capabilities: ["Discovery", "Business value", "Run demo", "Launch"],
    personas: ["Executive", "Solution Architect"],
  },
  {
    key: "learn", name: "AICP Learning Center", icon: GraduationCap, status: "live",
    href: "/learn",
    purpose: "Plain-language training on what AICP does and why it matters.",
    capabilities: ["Guided learning", "Glossary", "Concept explainers"],
    personas: ["Employee", "Executive"],
  },
  {
    key: "showcase", name: "AICP Showcase Center", icon: Briefcase, status: "live",
    href: "/showcase",
    purpose: "Sales-ready demonstrations: problem, solution, components, business value.",
    capabilities: ["Demos", "Before/after", "Configuration transparency"],
    personas: ["Executive"],
  },
  // ── Roadmap — framed now, built on the same AICP APIs ───────────────────────
  {
    key: "contract", name: "Contract Intelligence Center", icon: Handshake, status: "live",
    href: "/contract-intelligence",
    purpose: "Clause extraction, risk and renewal analysis, obligation tracking.",
    capabilities: ["Clause extraction", "Risk detection", "Obligations", "Renewal"],
    personas: ["Compliance Officer", "Procurement Officer"],
  },
  {
    key: "rfp", name: "RFP & Tender Intelligence Center", icon: FileSearch, status: "live",
    href: "/rfp-intelligence",
    purpose: "Requirement extraction, compliance matrix, BOQ and gap analysis.",
    capabilities: ["Requirement extraction", "Compliance matrix", "BOQ", "Gap analysis"],
    personas: ["Procurement Officer", "Manager"],
  },
  {
    key: "research", name: "Research Intelligence Center", icon: FlaskConical, status: "live",
    href: "/research-intelligence",
    purpose: "Market, competitor, technology, regulatory and strategic research briefings.",
    capabilities: ["Market research", "Competitor analysis", "Knowledge-grounded", "Reports"],
    personas: ["Researcher", "Executive"],
  },
  {
    key: "meeting", name: "Meeting Intelligence Center", icon: MessagesSquare, status: "live",
    href: "/meeting-intelligence",
    purpose: "Transcribe audio, then summarise decisions, action items and minutes.",
    capabilities: ["Transcription", "Summarisation", "Decisions", "Action items"],
    personas: ["Manager", "Employee"],
  },
  {
    key: "hr", name: "HR Intelligence Center", icon: Users, status: "live",
    href: "/hr-intelligence",
    purpose: "Job description drafting, CV review and candidate-to-role matching.",
    capabilities: ["JD generation", "CV review", "Candidate matching"],
    personas: ["HR Officer"],
  },
  {
    key: "procurement", name: "Procurement Intelligence Center", icon: Building2,
    status: "live", href: "/procurement-intelligence",
    purpose: "Spend analysis and vendor comparison with recommendations.",
    capabilities: ["Spend analysis", "Vendor comparison", "Savings", "Recommendations"],
    personas: ["Procurement Officer"],
  },
  {
    key: "project", name: "Project Intelligence Center", icon: ClipboardCheck, status: "live",
    href: "/project-intelligence",
    purpose: "Project health, risks, milestones, actions and lessons from a status update.",
    capabilities: ["Health rating", "Risk analysis", "Milestones", "Lessons learned"],
    personas: ["Project Manager", "Executive"],
  },
  {
    key: "validation", name: "AICP Validation Center", icon: FlaskConical, status: "live",
    href: "/aicp-validation",
    purpose: "Live end-to-end checks of the gateway, routing, embeddings, knowledge and governance.",
    capabilities: ["Health", "Latency", "Pass/fail", "End-to-end"],
    personas: ["AI Administrator", "Platform Administrator"],
  },
];

/** AICP capability-coverage matrix — every major capability and where SRCA AI Workspace
 * demonstrates it (a live surface) or that it is on the roadmap. */
export interface CapabilityCoverage {
  capability: string;
  icon: LucideIcon;
  businessValue: string;
  demonstratedIn: string;
  href?: string;
  status: CenterStatus;
}

export const CAPABILITY_COVERAGE: CapabilityCoverage[] = [
  { capability: "AI Gateway & Model Routing", icon: Boxes, status: "live", href: "/v-gpt",
    businessValue: "One governed entry point; the right model is chosen automatically.",
    demonstratedIn: "V-GPT" },
  { capability: "OCR & Document Intelligence", icon: ScanText, status: "live",
    href: "/document-intelligence",
    businessValue: "Turn scanned documents into structured, usable data.",
    demonstratedIn: "Document Intelligence Center" },
  { capability: "Speech-to-Text (Transcription)", icon: ScanText, status: "live",
    href: "/meeting-intelligence",
    businessValue: "Turn meeting recordings into searchable, actionable text.",
    demonstratedIn: "Meeting Intelligence Center" },
  { capability: "Redaction Engine", icon: ShieldCheck, status: "live", href: "/governance",
    businessValue: "Protect personal and sensitive data automatically.",
    demonstratedIn: "Compliance Center" },
  { capability: "Human Validation", icon: ClipboardCheck, status: "live", href: "/validation",
    businessValue: "People decide the cases that matter; nothing is a black box.",
    demonstratedIn: "Review Queue" },
  { capability: "Knowledge Management & RAG", icon: Network, status: "live", href: "/knowledge-center",
    businessValue: "Answer strictly from your own content, with citations.",
    demonstratedIn: "Knowledge Center" },
  { capability: "Knowledge Graph & Ontology", icon: Network, status: "live", href: "/graph",
    businessValue: "Understand how your entities and facts connect.",
    demonstratedIn: "Knowledge Center" },
  { capability: "Semantic & Hybrid Search", icon: Search, status: "live",
    href: "/knowledge-center",
    businessValue: "Find anything by meaning, not just keywords.",
    demonstratedIn: "Enterprise Search Center" },
  { capability: "Agent Framework", icon: Sparkles, status: "live", href: "/agent-marketplace",
    businessValue: "Offload multi-step work to governed AI agents.",
    demonstratedIn: "Agent Marketplace" },
  { capability: "Workflow Orchestration", icon: Workflow, status: "live", href: "/workflow-marketplace",
    businessValue: "Automate end-to-end processes with approvals.",
    demonstratedIn: "Workflow Marketplace" },
  { capability: "Governance & Policy Engine", icon: ShieldCheck, status: "live",
    href: "/governance",
    businessValue: "Control what AI may do, on every request in and out.",
    demonstratedIn: "Compliance Center" },
  { capability: "Audit Framework", icon: ClipboardCheck, status: "live", href: "/audit",
    businessValue: "Prove exactly what happened and why.",
    demonstratedIn: "Audit Logs" },
  { capability: "Monitoring & Analytics", icon: LayoutGrid, status: "live",
    href: "/observability",
    businessValue: "See usage, cost and health at a glance.",
    demonstratedIn: "Monitoring" },
  { capability: "Predictive Analytics & Forecasting", icon: Brain, status: "live",
    href: "/forecast",
    businessValue: "Anticipate demand and cost.",
    demonstratedIn: "Forecast" },
  { capability: "Explainability", icon: Brain, status: "live", href: "/solutions",
    businessValue: "Understand why each decision was made.",
    demonstratedIn: "Solution Configuration view" },
  { capability: "Multi-Tenant Features", icon: Building2, status: "live", href: "/tenants",
    businessValue: "Isolated, governed workspaces per organisation.",
    demonstratedIn: "Tenants" },
];

/** Business actions for the home launcher — "What would you like to do today?". Each is a
 * plain-language verb that routes to the Center (SRCA AI Workspace-native or an AICP surface). */
export interface QuickAction {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { label: "Ask AI", description: "Chat with your governed enterprise AI",
    icon: MessagesSquare, href: "/v-gpt" },
  { label: "Review a contract", description: "Clauses, risks, obligations, renewal",
    icon: Handshake, href: "/contract-intelligence" },
  { label: "Analyse an RFP", description: "Requirements, compliance matrix, gaps",
    icon: FileSearch, href: "/rfp-intelligence" },
  { label: "Generate a briefing", description: "Market, competitor & strategic research",
    icon: FlaskConical, href: "/research-intelligence" },
  { label: "Write up a meeting", description: "Transcribe, summarise, capture actions",
    icon: Mic, href: "/meeting-intelligence" },
  { label: "Check project health", description: "Health rating, risks, actions, lessons",
    icon: ClipboardCheck, href: "/project-intelligence" },
  { label: "Review a CV", description: "CV review & job descriptions",
    icon: Users, href: "/hr-intelligence" },
  { label: "Analyse spend", description: "Spend analysis & vendor comparison",
    icon: Building2, href: "/procurement-intelligence" },
  { label: "Analyse a document", description: "OCR, classify, extract & redact",
    icon: ScanText, href: "/document-intelligence" },
  { label: "Search knowledge", description: "Semantic search across your content",
    icon: Network, href: "/knowledge-center" },
  { label: "Draft correspondence", description: "Triage & draft official replies",
    icon: FileText, href: "/correspondence-intelligence" },
  { label: "Run a compliance review", description: "Policy, PII & governance checks",
    icon: ShieldCheck, href: "/compliance-intelligence" },
  { label: "Launch an agent", description: "Run a governed AI agent",
    icon: Sparkles, href: "/agent-marketplace" },
  { label: "Search enterprise data", description: "Hybrid search across everything",
    icon: Search, href: "/knowledge-center" },
];

export const PERSONAS_SUPPORTED: string[] = [
  "Employee", "Manager", "Executive", "Compliance Officer", "Researcher", "HR Officer",
  "Procurement Officer", "Project Manager", "AI Administrator", "Solution Architect",
  "Platform Administrator",
];
