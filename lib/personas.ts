import {
  Briefcase,
  Cpu,
  Database,
  ShieldCheck,
  Settings2,
  type LucideIcon,
} from "lucide-react";

import type { WorkspaceMode } from "@/lib/use-config-mode";

/** A persona tailors the platform to a role: it sets how much technical surface is shown
 * (workspace mode) and where you land. It is a starting point, not a restriction — the
 * workspace mode can still be changed at any time. */
export interface Persona {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Workspace depth this persona starts in. */
  mode: WorkspaceMode;
  /** Where this persona lands after choosing it. */
  landing: string;
  /** The platform areas this persona mostly works in (shown as chips). */
  focus: string[];
}

export const PERSONAS: Persona[] = [
  {
    key: "business_user",
    name: "Business User",
    description: "Deploy and use AI solutions for business outcomes — no technical setup.",
    icon: Briefcase,
    mode: "simple",
    landing: "/solutions",
    focus: ["Solutions", "Templates", "Demos"],
  },
  {
    key: "ai_engineer",
    name: "AI Engineer",
    description: "Configure the AI itself — models, providers, decision rules and instructions.",
    icon: Cpu,
    mode: "advanced",
    landing: "/models",
    focus: ["Models", "Providers", "Decision Rules", "Instructions"],
  },
  {
    key: "knowledge_manager",
    name: "Knowledge Manager",
    description: "Curate the knowledge the AI relies on — documents, bases and connected facts.",
    icon: Database,
    mode: "advanced",
    landing: "/knowledge",
    focus: ["Knowledge Bases", "Documents", "Connected Knowledge"],
  },
  {
    key: "governance_officer",
    name: "Governance & Compliance",
    description: "Set policies, review held requests and prove compliance.",
    icon: ShieldCheck,
    mode: "advanced",
    landing: "/governance",
    focus: ["Policies", "Review Queue", "Audit"],
  },
  {
    key: "administrator",
    name: "Platform Administrator",
    description: "Full control — users, tenants, system configuration and architecture.",
    icon: Settings2,
    mode: "architect",
    landing: "/configure",
    focus: ["Configuration", "Users & Roles", "System Config"],
  },
];

const _BY_KEY: Record<string, Persona> = Object.fromEntries(
  PERSONAS.map((p) => [p.key, p]),
);

export function getPersona(key: string | null): Persona | null {
  return key ? _BY_KEY[key] ?? null : null;
}
