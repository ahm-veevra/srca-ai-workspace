"use server";

import { revalidatePath } from "next/cache";

import {
  getAicpConfig,
  saveAicpConfig,
  SECRET_MASK,
  type AicpConfig,
} from "@/lib/aicp-config";
import { serverApi } from "@/lib/server-api";
import { getSession } from "@/lib/server-api";

/** Gate config changes to admins / config.write holders. */
async function assertCanConfigure(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };
  const allowed =
    session.user.is_superadmin ||
    session.permissions.includes("*") ||
    session.permissions.includes("config.write");
  if (!allowed) return { ok: false, error: "You don't have permission to change configuration." };
  return { ok: true };
}

export type SaveResult = { ok: boolean; error?: string };

/** Persist the AICP connection config. Preserves unchanged (masked) secret values. */
export async function saveAicpConfigAction(next: AicpConfig): Promise<SaveResult> {
  const gate = await assertCanConfigure();
  if (!gate.ok) return { ok: false, error: gate.error };

  // A secret whose submitted value is still the mask means "unchanged" — keep the stored one.
  const current = await getAicpConfig();
  const byKey = new Map(current.extra.map((e) => [e.key, e.value]));
  const extra = (next.extra ?? []).map((e) =>
    e.secret && e.value === SECRET_MASK ? { ...e, value: byKey.get(e.key) ?? "" } : e,
  );

  try {
    await saveAicpConfig({ ...next, extra });
    revalidatePath("/settings/aicp");
    revalidatePath("/workspace");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save." };
  }
}

/** Return the real (unmasked) value of a secret extra parameter. Gated to config.write
 *  holders so the token is only revealed to operators already allowed to edit it. */
export async function revealAicpExtraAction(
  key: string,
): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  const gate = await assertCanConfigure();
  if (!gate.ok) return { ok: false, error: gate.error };
  const cfg = await getAicpConfig();
  const found = cfg.extra.find((e) => e.key === key);
  if (!found) return { ok: false, error: "Parameter not found." };
  return { ok: true, value: found.value };
}

export type TestResult = { ok: boolean; message: string };

/** Validate the data-lake connector by running one saved query through AICP. */
export async function testDatalakeConnectorAction(connectorId: string): Promise<TestResult> {
  const gate = await assertCanConfigure();
  if (!gate.ok) return { ok: false, message: gate.error };
  const id = connectorId.trim();
  if (!id) return { ok: false, message: "Enter a connector id first." };

  try {
    // Data plane runs under the Application identity (the connector is granted to the app, not to
    // every signed-in user's tenant) — mirror the command center so the test reflects reality.
    const res = await serverApi<{ rows?: unknown[]; row_count?: number }>(
      `/connectors/${id}/query`,
      { method: "POST", body: JSON.stringify({ statement_key: "exec_kpis" }) },
      { appAuth: true },
    );
    const count = res.row_count ?? res.rows?.length ?? 0;
    return { ok: true, message: `Connected — 'exec_kpis' returned ${count} row(s).` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Query failed: ${msg}` };
  }
}

/** Lightweight AICP reachability check (authenticated session against the backend). */
export async function testAicpBackendAction(): Promise<TestResult> {
  const gate = await assertCanConfigure();
  if (!gate.ok) return { ok: false, message: gate.error };
  try {
    await serverApi("/me");
    return { ok: true, message: "AICP backend reachable and session valid." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Not reachable: ${msg}` };
  }
}
