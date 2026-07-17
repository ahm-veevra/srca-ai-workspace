/** Cross-app linking to the AICP console. SRCA AI Workspace and AICP are separate apps; a few
 * SRCA AI Workspace surfaces deep-link into AICP admin pages (e.g. Knowledge, Agents). Those use
 * an absolute URL to the AICP origin; SRCA AI Workspace-native routes stay relative. */
export const AICP_URL =
  process.env.NEXT_PUBLIC_AICP_URL || "http://localhost:3000";

/** Absolute URL for an AICP console path. */
export function aicpHref(path: string): string {
  return `${AICP_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

// Routes SRCA AI Workspace owns; anything else is an AICP console route (opened cross-app).
const VWORKSPACE_ROUTES = [
  "/workspace", "/v-gpt", "/capabilities", "/learn", "/document-intelligence",
  "/knowledge-center", "/correspondence-intelligence", "/executive-intelligence",
  "/compliance-intelligence", "/agent-marketplace", "/workflow-marketplace", "/showcase",
  "/contract-intelligence", "/rfp-intelligence", "/research-intelligence",
  "/meeting-intelligence", "/hr-intelligence", "/procurement-intelligence",
  "/project-intelligence", "/aicp-validation", "/use-cases", "/coverage",
  "/settings",
];

export function isAicpRoute(href: string): boolean {
  return !VWORKSPACE_ROUTES.some((r) => href === r || href.startsWith(`${r}/`));
}
