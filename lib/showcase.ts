/** Showcase scenarios for sales demonstrations. Each maps a business use case to the
 * Problem → Solution → Processing → AICP Components → Business Value → Before/After story.
 * Processing steps, components and architecture are pulled from the shared use-case
 * descriptors so the showcase stays consistent with what the live Centers actually do. */
import { USE_CASES, type UseCase } from "@/lib/use-cases";

export interface Showcase {
  key: string;
  title: string;
  sector: string;
  problem: string;
  solution: string;
  useCaseKey: string;
  businessValue: string[];
  before: string;
  after: string;
  /** Launch the live Center for this scenario. */
  href: string;
}

export function showcaseUseCase(s: Showcase): UseCase | undefined {
  return USE_CASES[s.useCaseKey];
}

export const SHOWCASES: Showcase[] = [
  {
    key: "gov_correspondence", title: "Government Correspondence Desk", sector: "Government",
    problem: "Incoming letters pile up; triage, routing and replies are slow and inconsistent.",
    solution: "AICP recognises each letter, classifies and routes it, prioritises it, and drafts a reply for an officer to approve.",
    useCaseKey: "correspondence",
    businessValue: ["Cut correspondence handling time from days to minutes",
      "Consistent routing and prioritisation", "Every reply approved and audited"],
    before: "An officer opens each letter, decides the department, writes a reply from scratch — hours per item.",
    after: "The letter is triaged, routed and a draft reply is ready in seconds; the officer reviews and approves.",
    href: "/correspondence-intelligence",
  },
  {
    key: "bank_documents", title: "KYC Document Processing", sector: "Banking",
    problem: "Manual document handling is slow and error-prone, and sensitive data is exposed.",
    solution: "AICP recognises, classifies and extracts fields, redacts PII, summarises, and flags low-confidence cases for review.",
    useCaseKey: "document",
    businessValue: ["Process documents in seconds, not minutes",
      "PII redacted automatically", "Low-confidence pages routed to humans"],
    before: "Staff read and re-key each document by hand; sensitive data is copied around.",
    after: "Documents are read, classified, extracted and redacted automatically, with confidence scoring.",
    href: "/document-intelligence",
  },
  {
    key: "legal_contracts", title: "Contract Risk Review", sector: "Legal",
    problem: "Reviewing contracts for risk and obligations is slow and depends on scarce expertise.",
    solution: "AICP extracts clauses, flags risks, lists obligations and key dates, and summarises — in seconds.",
    useCaseKey: "contract",
    businessValue: ["Surface risky clauses instantly", "Never miss a renewal or obligation",
      "Consistent review quality"],
    before: "A lawyer reads every page to find the liability cap and renewal terms.",
    after: "Risks, obligations and renewal terms are extracted and summarised automatically.",
    href: "/contract-intelligence",
  },
  {
    key: "procurement_rfp", title: "RFP Compliance & Response", sector: "Procurement",
    problem: "Long RFPs make it easy to miss mandatory requirements and lose bids.",
    solution: "AICP extracts requirements, builds a compliance matrix, lists the BOQ and flags gaps.",
    useCaseKey: "rfp",
    businessValue: ["Respond faster with fewer people", "Never miss a mandatory requirement",
      "Clear gap analysis before submission"],
    before: "A bid team manually reads the tender and builds a requirements spreadsheet.",
    after: "Requirements, a compliance matrix and gaps are produced automatically from the RFP.",
    href: "/rfp-intelligence",
  },
  {
    key: "compliance_audit", title: "Policy Compliance Review", sector: "Cross-sector",
    problem: "Assessing policies against DGA/NDMO/ISO is slow, subjective and audit-stressful.",
    solution: "AICP assesses a policy against the chosen framework and returns a control matrix, gaps and remediation.",
    useCaseKey: "compliance",
    businessValue: ["Audit-ready gap analysis in minutes", "Consistent, framework-aligned findings",
      "Clear remediation steps"],
    before: "A compliance officer maps the policy to each control by hand before an audit.",
    after: "Each control is assessed met/partial/gap with findings and remediation automatically.",
    href: "/compliance-intelligence",
  },
  {
    key: "exec_board", title: "Board Briefing on Demand", sector: "Enterprise",
    problem: "Leaders drown in reports and lack a concise, consistent read on the business.",
    solution: "AICP synthesises material into a board-ready briefing with metrics, risks and recommendations.",
    useCaseKey: "executive",
    businessValue: ["Briefings in minutes from raw updates", "Consistent, objective framing",
      "Trended metrics and clear actions"],
    before: "A chief of staff manually collates updates into a deck the night before the board.",
    after: "A titled briefing with metrics, risks and recommendations is produced on demand.",
    href: "/executive-intelligence",
  },
  {
    key: "knowledge_qa", title: "Answers from Your Own Content", sector: "Cross-sector",
    problem: "Staff can't find answers buried across documents and policies.",
    solution: "AICP searches by meaning and answers questions grounded in your content, with citations.",
    useCaseKey: "knowledge",
    businessValue: ["Find anything by meaning, not keywords", "Grounded answers with sources",
      "No invented facts"],
    before: "Employees email around or read manuals to find a policy answer.",
    after: "They ask a question and get a cited answer drawn from approved content.",
    href: "/knowledge-center",
  },
  {
    key: "meeting_minutes", title: "Instant Meeting Minutes", sector: "Enterprise",
    problem: "Decisions and actions from meetings are lost or inconsistently captured.",
    solution: "AICP transcribes the recording and produces a summary, decisions, action items and minutes.",
    useCaseKey: "meeting",
    businessValue: ["Minutes and actions in minutes", "Nothing agreed is lost",
      "Clear owners for every action"],
    before: "Someone takes notes, then writes up minutes later — often missing actions.",
    after: "Upload the recording; AICP returns minutes, decisions and owner-assigned actions.",
    href: "/meeting-intelligence",
  },
];
