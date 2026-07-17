/** SRCA AI Workspace navigation — business-oriented. SRCA AI Workspace is a separate application from
 * the AICP console; every item here is a SRCA AI Workspace experience that consumes AICP APIs. */
import {
  Bot,
  Boxes,
  Building2,
  ClipboardCheck,
  FileSearch,
  FlaskConical,
  GraduationCap,
  Handshake,
  History,
  Languages,
  LayoutGrid,
  type LucideIcon,
  Mail,
  MessagesSquare,
  Mic,
  Network,
  PhoneCall,
  Presentation,
  Rocket,
  ScanText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  perm: string | null;
  live?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// The sidebar is organised by BUSINESS FUNCTION — what an SRCA user is doing — not by the AICP
// product suites (V-Core/V-Flow/…). This nav is hand-authored and deliberately DECOUPLED from the
// suite registry (lib/suites.ts): the suites still drive the home page and the "belongs to" cues,
// but menu grouping is a separate concern so it reads naturally for staff. Every item maps to an
// existing route and keeps its original perm, so role-gated items still hide for users who lack them.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/workspace", label: "Home", icon: LayoutGrid, perm: null },
      { href: "/ai-intelligence", label: "AICP Intelligence", icon: ShieldCheck, perm: "inference.run" },
      { href: "/intelligence-history", label: "Intelligence History", icon: History, perm: "inference.run" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/call-center", label: "Call Center", icon: PhoneCall, perm: "inference.run" },
      { href: "/document-intelligence", label: "Documents", icon: ScanText, perm: "inference.run" },
      { href: "/correspondence-intelligence", label: "Correspondence", icon: Mail, perm: "inference.run" },
      { href: "/contract-intelligence", label: "Contract", icon: Handshake, perm: "inference.run" },
      { href: "/rfp-intelligence", label: "RFP & Tender", icon: FileSearch, perm: "inference.run" },
      { href: "/procurement-intelligence", label: "Procurement", icon: Building2, perm: "inference.run" },
      { href: "/meeting-intelligence", label: "Meeting", icon: Mic, perm: "inference.run" },
    ],
  },
  {
    label: "Knowledge & People",
    items: [
      { href: "/knowledge-center", label: "Knowledge & Search", icon: Network, perm: "knowledge.read" },
      { href: "/research-intelligence", label: "Research", icon: FlaskConical, perm: "inference.run" },
      { href: "/hr-intelligence", label: "HR", icon: Users, perm: "inference.run" },
    ],
  },
  {
    label: "Governance & Leadership",
    items: [
      { href: "/compliance-intelligence", label: "Compliance", icon: ShieldCheck, perm: "inference.run" },
      { href: "/project-intelligence", label: "Project", icon: ClipboardCheck, perm: "inference.run" },
      { href: "/executive-intelligence", label: "Executive", icon: Presentation, perm: "inference.run" },
    ],
  },
  {
    label: "AI Tools",
    items: [
      { href: "/v-gpt", label: "V-GPT", icon: MessagesSquare, perm: "inference.run" },
      { href: "/capabilities-run", label: "My Capabilities", icon: Sparkles, perm: "inference.run" },
      { href: "/create", label: "Build a Capability", icon: Wand2, perm: "config.write" },
      { href: "/agent-marketplace", label: "Agents", icon: Bot, perm: "agent.read" },
      { href: "/capabilities", label: "AI Capabilities", icon: Boxes, perm: null },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings/aicp", label: "AICP Configuration", icon: Settings2, perm: "config.write" },
      { href: "/settings/dictionary", label: "Label Dictionary", icon: Languages, perm: "config.write" },
      { href: "/learn", label: "Learning Center", icon: GraduationCap, perm: null },
    ],
  },
];

// Demo / QA surfaces (use-case runner, capability coverage, showcase) are intentionally NOT in
// production navigation — they remain reachable by direct URL for internal validation only.

// Workspace tiers — kept for shell compatibility. SRCA AI Workspace is entirely business-facing,
// so every item is the "business" tier and always visible regardless of workspace mode.
export type Tier = "business" | "advanced" | "architect";

export const TIER_RANK: Record<Tier, number> = { business: 0, advanced: 1, architect: 2 };

export function navTier(_href: string): Tier {
  return "business";
}

export interface QuickAction {
  label: string;
  href: string;
  perm: string | null;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { label: "Ask AI", href: "/v-gpt", perm: "inference.run" },
  { label: "Review a contract", href: "/contract-intelligence", perm: "inference.run" },
  { label: "Analyse an RFP", href: "/rfp-intelligence", perm: "inference.run" },
];

/** Best-effort human label for the current path (breadcrumbs / titles). */
export function labelForPath(pathname: string): string {
  for (const g of NAV_GROUPS) {
    for (const it of g.items) {
      if (pathname === it.href || pathname.startsWith(it.href + "/")) {
        return it.label;
      }
    }
  }
  return "SRCA AI Workspace";
}

// Re-exported so any shell code importing Rocket-driven affordances keeps working.
export const LAUNCH_ICON = Rocket;
