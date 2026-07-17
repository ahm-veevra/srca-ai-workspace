// Server-side data access. Runs in Server Components / Route Handlers and forwards
// the incoming httpOnly cookies to the backend. When NO user session is present
// (kiosk/wallboard mode), falls back to the workspace's registered Application token —
// AICP's grant model then decides what that identity may touch (data plane only).
import { cookies } from "next/headers";

import { getAicpExtra } from "./aicp-config";
import type { Session } from "./types";

const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL || "http://localhost:8000";
const ACCESS_COOKIE = process.env.ACCESS_COOKIE_NAME || "veevra_access";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE_NAME || "veevra_refresh";

export class ServerApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function serverApi<T>(
  path: string,
  init: RequestInit = {},
  opts: { appAuth?: boolean } = {},
): Promise<T> {
  const jar = cookies();
  // Superadmin tenant override (backend ignores it for non-superadmins).
  const tenant = jar.get("veevra_tenant")?.value;
  // Kiosk/wallboard fallback: no user session at all -> authenticate as the registered
  // "SRCA Workspace" Application (X-API-Key). A signed-in user ALWAYS wins — per-user
  // clearance fencing and audit attribution depend on it. What the app identity may do
  // is enforced by AICP's grants (data widgets yes; copilot/knowledge deliberately not).
  //
  // `appAuth` FORCES the Application identity even when a user is signed in — used for the
  // command-center *data plane* (connector queries + dashboard generators), which AICP grants
  // to the app, not to every user's tenant. Per-user surfaces (copilot/knowledge) never set it.
  const hasUserSession = jar.has(ACCESS_COOKIE) || jar.has(REFRESH_COOKIE);
  const useAppToken = opts.appAuth || !hasUserSession;
  const appToken = useAppToken ? await getAicpExtra("workspaceApiToken") : undefined;
  // When forcing app auth, don't also send the user cookie (the backend would prefer the user
  // session and scope to their tenant, re-introducing the 404).
  const cookieHeader = opts.appAuth ? "" : jar.toString();
  const res = await fetch(`${API_INTERNAL_URL}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(tenant && !opts.appAuth ? { "X-Tenant-Id": tenant } : {}),
      ...(appToken ? { "X-API-Key": appToken } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ServerApiError(res.status, `API ${res.status} for ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function getSession(): Promise<Session | null> {
  try {
    return await serverApi<Session>("/me");
  } catch {
    return null;
  }
}
