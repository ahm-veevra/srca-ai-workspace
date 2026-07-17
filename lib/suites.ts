/** Enterprise Suites — the business-application tier over AICP.
 *
 * Each suite is an application built ON the AI Control Plane: it consumes AICP APIs
 * exactly as an external customer's app would, and groups the SRCA AI Workspace Intelligence
 * Centers (capabilities) for its business domain. No intelligence lives in a suite —
 * the intelligence always belongs to AICP; a suite is experience + workflow over it.
 *
 * The canonical, server-side source of truth is the backend suite registry
 * (GET /api/v1/reference/suites — backend/app/modules/reference/suites.py). This file is the
 * frontend mirror: it must match that registry's keys, names, membership, labels and hrefs, and
 * additionally carries presentation the backend intentionally omits (icons, accent hues) plus the
 * build-time nav definition the sidebar is generated from. Keep the two in lockstep when either
 * changes. Navigation, the workspace home and the "belongs to" cues all derive from this file. */
import {
  Bot, Boxes, Building2, ClipboardCheck, Compass, FileSearch, FlaskConical, Handshake, Layers,
  Mail, Mic, Network, Presentation, ScanText, ShieldCheck, TrendingUp, Users,
  Workflow, type LucideIcon,
} from "lucide-react";

export type SuiteKey = "v-core" | "v-flow" | "v-manage" | "v-grow" | "v-lead";

/** A navigation entry for a suite's Center — the label/icon/perm the sidebar renders. */
export interface SuiteNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  perm: string | null;
}

export interface Suite {
  key: SuiteKey;
  /** Product name, e.g. "V-Manage". */
  name: string;
  /** Short domain tag used in the nav group label, e.g. "Operations". */
  short: string;
  /** Domain line, e.g. "Enterprise Operations". */
  domain: string;
  /** One business sentence — what this suite makes intelligent. */
  tagline: string;
  icon: LucideIcon;
  /** Tailwind accent hue used for the suite chip/card (kept subtle, one design language). */
  accent: string;
  /** Center keys (from lib/workspace CENTERS) that belong to this suite, in display order. */
  centers: string[];
  /** The Centers surfaced in production navigation for this suite (a subset of `centers`;
   *  demo/QA and duplicate-route Centers are members but intentionally not shown). The sidebar
   *  is generated from this — there is no second, hand-maintained nav definition to drift from. */
  nav: SuiteNavItem[];
}

/** Every suite is an application built on AICP — the same governed engine, different
 * business domain. Membership groups the existing Centers; it moves no code. */
export const SUITES: Suite[] = [
  {
    key: "v-core", name: "V-Core", short: "Foundation", domain: "Enterprise Foundation",
    tagline: "Identity, security, governance and insight — the trusted base every other suite runs on.",
    icon: ShieldCheck, accent: "#4da3ff",
    centers: ["compliance", "validation"],
    nav: [
      { href: "/compliance-intelligence", label: "Compliance", icon: ShieldCheck, perm: "inference.run" },
    ],
  },
  {
    key: "v-flow", name: "V-Flow", short: "Automation", domain: "Enterprise Automation",
    tagline: "Turn requests into governed, automated processes — agents, workflows and orchestration.",
    icon: Workflow, accent: "#34d399",
    centers: ["agents", "workflows", "procurement"],
    nav: [
      { href: "/agent-marketplace", label: "Agents", icon: Bot, perm: "agent.read" },
      { href: "/procurement-intelligence", label: "Procurement", icon: Building2, perm: "inference.run" },
    ],
  },
  {
    key: "v-manage", name: "V-Manage", short: "Operations", domain: "Enterprise Operations",
    tagline: "Run day-to-day operations intelligently — documents, correspondence, contracts and meetings.",
    icon: Layers, accent: "#f5b445",
    centers: ["document_intelligence", "correspondence", "contract", "rfp", "meeting"],
    nav: [
      { href: "/document-intelligence", label: "Documents", icon: ScanText, perm: "inference.run" },
      { href: "/correspondence-intelligence", label: "Correspondence", icon: Mail, perm: "inference.run" },
      { href: "/contract-intelligence", label: "Contract", icon: Handshake, perm: "inference.run" },
      { href: "/rfp-intelligence", label: "RFP & Tender", icon: FileSearch, perm: "inference.run" },
      { href: "/meeting-intelligence", label: "Meeting", icon: Mic, perm: "inference.run" },
    ],
  },
  {
    key: "v-grow", name: "V-Grow", short: "Knowledge & People", domain: "Knowledge & People",
    tagline: "Grow institutional knowledge and people — search, research, HR and learning.",
    icon: Compass, accent: "#a78bfa",
    centers: ["knowledge", "enterprise_search", "research", "hr", "learn"],
    nav: [
      { href: "/knowledge-center", label: "Knowledge & Search", icon: Network, perm: "knowledge.read" },
      { href: "/research-intelligence", label: "Research", icon: FlaskConical, perm: "inference.run" },
      { href: "/hr-intelligence", label: "HR", icon: Users, perm: "inference.run" },
    ],
  },
  {
    key: "v-lead", name: "V-Lead", short: "Executive", domain: "Executive Intelligence",
    tagline: "Give leadership a clear line of sight — executive briefings and project intelligence.",
    icon: TrendingUp, accent: "#f472b6",
    centers: ["executive", "project"],
    nav: [
      { href: "/project-intelligence", label: "Project", icon: ClipboardCheck, perm: "inference.run" },
      { href: "/executive-intelligence", label: "Executive", icon: Presentation, perm: "inference.run" },
    ],
  },
];

/** Cross-cutting AICP tools that belong to no single suite (the shared platform surface). */
export const PLATFORM_ICON: LucideIcon = Boxes;

const _BY_KEY: Record<SuiteKey, Suite> = Object.fromEntries(
  SUITES.map((s) => [s.key, s]),
) as Record<SuiteKey, Suite>;

const _SUITE_FOR_CENTER: Record<string, SuiteKey> = Object.fromEntries(
  SUITES.flatMap((s) => s.centers.map((c) => [c, s.key])),
);

export function suiteByKey(key: SuiteKey): Suite {
  return _BY_KEY[key];
}

/** The suite a Center belongs to, or null for cross-cutting platform surfaces. */
export function suiteForCenter(centerKey: string): Suite | null {
  const key = _SUITE_FOR_CENTER[centerKey];
  return key ? _BY_KEY[key] : null;
}
