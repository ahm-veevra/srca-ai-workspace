/** Per-use-case descriptors for the four AICP views. These describe WHAT a SRCA AI Workspace
 * business use case is and which AICP services/components it uses. The execution-specific
 * values (the model that actually ran, the policy that fired, the routing reason) come from
 * the run's `meta` — see UseCaseViews. Nothing here invents runtime behaviour. */

export interface ConfigItem {
  /** Business-facing label, e.g. "AI Model". */
  label: string;
  /** Which run-meta field fills the live value, if any. */
  source?: "model" | "route" | "policy" | "knowledge" | "prompt";
  /** Static fallback description when there's no live value. */
  detail?: string;
}

export interface UseCase {
  key: string;
  title: string;
  /** What the user experiences (plain outcome steps). */
  businessView: string[];
  /** What AICP executed (the governed pipeline stages). */
  technicalView: string[];
  /** The AICP service layers involved (Architecture View). */
  architectureView: string[];
  /** The AICP configuration this use case relies on (Configuration View). */
  configuration: ConfigItem[];
}

const GOVERNED_PIPELINE = [
  "Intake", "Input governance", "Model routing", "AI model", "Output governance", "Result",
];
const CORE_SERVICES = ["AI Service Bus", "Model Routing", "Governance Engine", "Audit"];

const PROMPT: ConfigItem = { label: "AI Instruction", source: "prompt" };
const MODEL: ConfigItem = { label: "AI Model", source: "model" };
const ROUTE: ConfigItem = { label: "Decision Rule (route)", source: "route" };
const POLICY: ConfigItem = { label: "Governance Policy", source: "policy" };

export const USE_CASES: Record<string, UseCase> = {
  knowledge: {
    key: "knowledge",
    title: "Knowledge & Search",
    businessView: ["Ask or search", "Retrieve & ground", "Cited answer or results"],
    technicalView: ["Intake", "Input governance", "Semantic / keyword retrieval", "Model routing", "AI model", "Output governance", "Cited result"],
    architectureView: ["AI Service Bus", "Knowledge Platform", "Model Routing", "Governance Engine", "Audit"],
    configuration: [
      MODEL, ROUTE,
      { label: "Knowledge Source", source: "knowledge", detail: "The knowledge base searched" },
      POLICY,
    ],
  },
  document: {
    key: "document",
    title: "Document Intelligence",
    businessView: ["Upload / paste a document", "Recognise, classify & extract", "Summary, entities & redaction"],
    technicalView: ["OCR recognition", "Classification", "Field extraction", "Governance redaction", "AI enrichment", "Validation"],
    architectureView: ["Document Intelligence Service", "Governance Engine", "AI Service Bus", "Audit"],
    configuration: [
      { label: "OCR Provider", detail: "Configured document recogniser" },
      MODEL, ROUTE, PROMPT,
      { label: "Redaction / PII Policy", source: "policy" },
      { label: "Validation Rules", detail: "Low-confidence pages flagged for human review" },
    ],
  },
  compliance: {
    key: "compliance",
    title: "Compliance Review",
    businessView: ["Provide a policy / process", "Assess against a framework", "Status, gaps & remediation"],
    technicalView: ["Intake", "Input governance", "Knowledge retrieval (RAG)", "Model routing", "AI model", "Output governance", "Result"],
    architectureView: ["AI Service Bus", "Knowledge Platform", "Model Routing", "Governance Engine", "Audit"],
    configuration: [
      MODEL, ROUTE, PROMPT, POLICY,
      { label: "Knowledge Source", source: "knowledge", detail: "Optional — ground against your policy library" },
    ],
  },
  executive: {
    key: "executive",
    title: "Executive Briefing",
    businessView: ["Provide material / data", "Synthesise", "Board-ready briefing"],
    technicalView: ["Intake", "Input governance", "Knowledge retrieval (RAG)", "Model routing", "AI model", "Output governance", "Result"],
    architectureView: ["AI Service Bus", "Knowledge Platform", "Model Routing", "Governance Engine", "Audit"],
    configuration: [
      MODEL, ROUTE, PROMPT, POLICY,
      { label: "Knowledge Source", source: "knowledge", detail: "Optional — ground the briefing in your content" },
    ],
  },
  correspondence: {
    key: "correspondence",
    title: "Correspondence Triage",
    businessView: ["Receive a letter", "Triage, classify & route", "Draft reply for approval"],
    technicalView: ["OCR recognition", "Classification", "Governance redaction", "AI triage & drafting", "Validation"],
    architectureView: ["Document Intelligence Service", "Governance Engine", "AI Service Bus", "Audit"],
    configuration: [
      { label: "OCR Provider", detail: "Configured document recogniser" },
      MODEL, ROUTE, PROMPT, POLICY,
      { label: "Approval", detail: "Officer reviews the draft before it is sent" },
    ],
  },
  document_compare: {
    key: "document_compare",
    title: "Document Comparison",
    businessView: ["Provide two versions", "Compare", "Changes, differences & risk"],
    technicalView: GOVERNED_PIPELINE,
    architectureView: CORE_SERVICES,
    configuration: [MODEL, ROUTE, PROMPT, POLICY],
  },
  contract: {
    key: "contract",
    title: "Contract Review",
    businessView: ["Upload / paste contract", "Risk & clause analysis", "Summary & recommendations"],
    technicalView: GOVERNED_PIPELINE,
    architectureView: CORE_SERVICES,
    configuration: [
      MODEL, ROUTE, PROMPT, POLICY,
      { label: "Validation Rules", detail: "Low-confidence results flagged for human review" },
      { label: "Integrations", detail: "None required" },
    ],
  },
  rfp: {
    key: "rfp",
    title: "RFP & Tender Analysis",
    businessView: ["Paste RFP / tender", "Requirement & compliance extraction", "Compliance matrix & gaps"],
    technicalView: GOVERNED_PIPELINE,
    architectureView: CORE_SERVICES,
    configuration: [MODEL, ROUTE, PROMPT, POLICY, { label: "Integrations", detail: "None required" }],
  },
  research: {
    key: "research",
    title: "Research Briefing",
    businessView: ["Enter topic", "Research & synthesis", "Findings, opportunities & recommendations"],
    technicalView: ["Intake", "Input governance", "Knowledge retrieval (RAG)", "Model routing", "AI model", "Output governance", "Result"],
    architectureView: ["AI Service Bus", "Knowledge Platform", "Model Routing", "Governance Engine", "Audit"],
    configuration: [
      MODEL, ROUTE, PROMPT, POLICY,
      { label: "Knowledge Source", source: "knowledge", detail: "Optional — grounds the briefing in your content" },
    ],
  },
  meeting: {
    key: "meeting",
    title: "Meeting Write-up",
    businessView: ["Upload audio / paste transcript", "Summarisation & extraction", "Minutes, decisions & actions"],
    technicalView: ["Transcription (STT)", "Intake", "Input governance", "Model routing", "AI model", "Output governance", "Result"],
    architectureView: ["Speech-to-Text", "AI Service Bus", "Model Routing", "Governance Engine", "Audit"],
    configuration: [
      { label: "Speech-to-Text Model", detail: "Used when audio is uploaded" },
      MODEL, ROUTE, PROMPT, POLICY,
    ],
  },
  hr: {
    key: "hr",
    title: "HR Assistant",
    businessView: ["Enter role / paste CV", "Drafting & assessment", "Job description or candidate review"],
    technicalView: GOVERNED_PIPELINE,
    architectureView: CORE_SERVICES,
    configuration: [MODEL, ROUTE, PROMPT, POLICY],
  },
  procurement: {
    key: "procurement",
    title: "Procurement Analysis",
    businessView: ["Paste spend / vendor data", "Analysis & comparison", "Savings & recommendations"],
    technicalView: GOVERNED_PIPELINE,
    architectureView: CORE_SERVICES,
    configuration: [MODEL, ROUTE, PROMPT, POLICY],
  },
  project: {
    key: "project",
    title: "Project Health",
    businessView: ["Paste status update", "Health & risk assessment", "Briefing, risks & actions"],
    technicalView: GOVERNED_PIPELINE,
    architectureView: CORE_SERVICES,
    configuration: [MODEL, ROUTE, PROMPT, POLICY],
  },
};
