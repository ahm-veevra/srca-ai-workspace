/** Role-based first-run onboarding — tailored starting points, examples and a first task per role.
 * Pure data (no runtime logic); consumed by components/workspace/onboarding.tsx. Every href is a
 * live SRCA AI Workspace route. */
import {
  Building2,
  FlaskConical,
  Handshake,
  type LucideIcon,
  MessagesSquare,
  Presentation,
  ShieldCheck,
  Users,
} from "lucide-react";

export interface StartPoint {
  label: string;
  href: string;
  why: string;
}

export interface Role {
  key: string;
  label: string;
  icon: LucideIcon;
  /** One-line framing shown once the role is chosen. */
  tagline: string;
  starts: StartPoint[];
  /** A concrete first task to try. */
  example: string;
}

export const ROLES: Role[] = [
  {
    key: "executive",
    label: "Executive / Leadership",
    icon: Presentation,
    tagline: "Get briefed fast and make decisions with governed, audited AI.",
    starts: [
      { label: "Executive Intelligence", href: "/executive-intelligence", why: "Summaries, briefings and decision support from your knowledge." },
      { label: "Ask V-GPT", href: "/v-gpt", why: "A governed assistant for any question, document or draft." },
      { label: "Meeting Intelligence", href: "/meeting-intelligence", why: "Turn meetings into notes, decisions and action items." },
    ],
    example: "Ask V-GPT: “Summarize this week's key risks and decisions in 5 bullets.”",
  },
  {
    key: "legal",
    label: "Legal / Contracts",
    icon: Handshake,
    tagline: "Review contracts and tenders faster, with risks flagged and cited.",
    starts: [
      { label: "Contract Intelligence", href: "/contract-intelligence", why: "Extract clauses, obligations, dates and risks from a contract." },
      { label: "RFP & Tender", href: "/rfp-intelligence", why: "Evaluate RFPs and tenders against your requirements." },
      { label: "Documents", href: "/document-intelligence", why: "Read and extract structured data from any document." },
    ],
    example: "Open Contract Intelligence and upload a contract to see clauses and risks extracted.",
  },
  {
    key: "procurement",
    label: "Procurement",
    icon: Building2,
    tagline: "Assess vendors and tenders with consistent, auditable analysis.",
    starts: [
      { label: "Procurement Intelligence", href: "/procurement-intelligence", why: "Validate vendors and check purchase documents for anomalies." },
      { label: "RFP & Tender", href: "/rfp-intelligence", why: "Score proposals against your evaluation criteria." },
      { label: "Ask V-GPT", href: "/v-gpt", why: "Draft requests, compare quotes, summarize submissions." },
    ],
    example: "Open RFP & Tender and paste a proposal to see it scored against criteria.",
  },
  {
    key: "hr",
    label: "HR / People",
    icon: Users,
    tagline: "Answer policy questions and draft correspondence from approved knowledge.",
    starts: [
      { label: "HR", href: "/hr-intelligence", why: "Policy answers, letters and HR document support." },
      { label: "Knowledge & Search", href: "/knowledge-center", why: "Search your organization's approved knowledge with citations." },
      { label: "Ask V-GPT", href: "/v-gpt", why: "Draft, summarize and answer — grounded and governed." },
    ],
    example: "Ask HR: “What's our leave policy for a 3-year employee?”",
  },
  {
    key: "compliance",
    label: "Compliance / Risk",
    icon: ShieldCheck,
    tagline: "Check content against regulations, with evidence and human review.",
    starts: [
      { label: "Compliance", href: "/compliance-intelligence", why: "Assess content and requests against regulatory requirements." },
      { label: "Documents", href: "/document-intelligence", why: "Extract and classify regulated documents." },
      { label: "Knowledge & Search", href: "/knowledge-center", why: "Ground findings in your policy knowledge base." },
    ],
    example: "Open Compliance and paste a document to check it against a framework.",
  },
  {
    key: "knowledge",
    label: "Knowledge / Research",
    icon: FlaskConical,
    tagline: "Find answers and synthesize research across your knowledge.",
    starts: [
      { label: "Knowledge & Search", href: "/knowledge-center", why: "Semantic + keyword search over your collections, with citations." },
      { label: "Research", href: "/research-intelligence", why: "Multi-step research combining internal knowledge and analysis." },
      { label: "Ask V-GPT", href: "/v-gpt", why: "Grounded answers with verified sources." },
    ],
    example: "Ask Knowledge & Search: “What do our policies say about data retention?”",
  },
  {
    key: "general",
    label: "General / Everyone",
    icon: MessagesSquare,
    tagline: "Start with the assistant and grow into ready-made business applications.",
    starts: [
      { label: "Ask V-GPT", href: "/v-gpt", why: "Chat, analyse files, generate documents, search knowledge." },
      { label: "My Capabilities", href: "/capabilities-run", why: "Run the AI capabilities configured for you." },
      { label: "Documents", href: "/document-intelligence", why: "Read and extract data from scanned documents." },
    ],
    example: "Open V-GPT and ask anything — attach a document to analyze it.",
  },
];

export const ROLE_STORAGE_KEY = "veevra-onboarding-role";
export const ONBOARDING_DISMISSED_KEY = "veevra-onboarding-dismissed";
