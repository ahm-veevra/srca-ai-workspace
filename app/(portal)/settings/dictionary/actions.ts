"use server";

import { revalidatePath } from "next/cache";

import { saveLabelOverrides } from "@/lib/i18n/overrides";
import type { LabelOverrides } from "@/lib/i18n/messages";
import { getSession } from "@/lib/server-api";

async function canConfigure(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return (
    session.user.is_superadmin ||
    session.permissions.includes("*") ||
    session.permissions.includes("config.write")
  );
}

export async function saveDictionaryAction(
  overrides: LabelOverrides,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await canConfigure())) return { ok: false, error: "You don't have permission to edit labels." };
  try {
    saveLabelOverrides(overrides);
    // Labels are used across every page — revalidate the whole app tree.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save." };
  }
}
