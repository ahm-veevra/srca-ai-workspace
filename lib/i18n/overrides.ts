// Server-side store for user-editable label overrides (the in-app Dictionary). Overrides are
// merged over the base catalog by serverT() (server) and the LocaleProvider's t() (client, via a
// prop). Persisted to a JSON file, read at request time with mtime-based cache invalidation.
import "server-only";

import { mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";

import type { LabelOverrides } from "./messages";

const OVERRIDES_PATH =
  process.env.LABEL_OVERRIDES_PATH || path.join(process.cwd(), "data", "label-overrides.json");

let cache: { data: LabelOverrides; mtimeMs: number } | null = null;

/** Current label overrides (sync so serverT stays synchronous). Empty if none saved. */
export function getLabelOverrides(): LabelOverrides {
  let mtimeMs = -1;
  try {
    mtimeMs = statSync(OVERRIDES_PATH).mtimeMs;
  } catch {
    return {};
  }
  if (cache && cache.mtimeMs === mtimeMs) return cache.data;
  try {
    const data = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8")) as LabelOverrides;
    cache = { data, mtimeMs };
    return data;
  } catch {
    return {};
  }
}

/** Persist overrides (empty per-locale strings are dropped). Invalidates the cache. */
export function saveLabelOverrides(next: LabelOverrides): void {
  const clean: LabelOverrides = {};
  for (const [key, byLocale] of Object.entries(next)) {
    if (!byLocale) continue;
    const entry: Record<string, string> = {};
    for (const [loc, val] of Object.entries(byLocale)) {
      if (typeof val === "string" && val.trim().length > 0) entry[loc] = val;
    }
    if (Object.keys(entry).length) (clean as Record<string, unknown>)[key] = entry;
  }
  mkdirSync(path.dirname(OVERRIDES_PATH), { recursive: true });
  writeFileSync(OVERRIDES_PATH, JSON.stringify(clean, null, 2), "utf8");
  cache = null;
}
