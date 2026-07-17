/** SRCA AI Workspace navigation — business-oriented. SRCA AI Workspace is a separate application from
 * the AICP console; every item here is a SRCA AI Workspace experience that consumes AICP APIs. */
import {
  Boxes,
  GraduationCap,
  History,
  LayoutGrid,
  type LucideIcon,
  Languages,
  MessagesSquare,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

import { SUITES } from "./suites";

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

// Navigation is organised by the Enterprise Suites: each suite is an application built on AICP,
// and its Intelligence Centers appear as the suite's capabilities. The five suite groups are
// GENERATED from lib/suites.ts (the single source of truth) so nav membership can never drift
// from the suite registry. Cross-cutting AICP tools stay in "Workspace"; discovery in "Explore".
const _SUITE_GROUPS: NavGroup[] = SUITES.map((s) => ({
  label: `${s.name} · ${s.short}`,
  items: s.nav.map((n) => ({ href: n.href, label: n.label, icon: n.icon, perm: n.perm })),
}));

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/workspace", label: "Home", icon: LayoutGrid, perm: null },
      { href: "/v-gpt", label: "V-GPT", icon: MessagesSquare, perm: "inference.run" },
      { href: "/capabilities-run", label: "My Capabilities", icon: Sparkles, perm: "inference.run" },
      { href: "/create", label: "Build a Capability", icon: Wand2, perm: "config.write" },
      { href: "/intelligence-history", label: "Intelligence History", icon: History, perm: "inference.run" },
      { href: "/ai-intelligence", label: "AICP Intelligence", icon: ShieldCheck, perm: "inference.run" },
      { href: "/settings/aicp", label: "AICP Configuration", icon: Settings2, perm: "config.write" },
      { href: "/settings/dictionary", label: "Label Dictionary", icon: Languages, perm: "config.write" },
    ],
  },
  ..._SUITE_GROUPS,
  {
    label: "Explore",
    items: [
      { href: "/capabilities", label: "AI Capabilities", icon: Boxes, perm: null },
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
