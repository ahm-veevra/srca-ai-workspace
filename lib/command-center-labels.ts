import { MESSAGES, type MessageKey } from "@/lib/i18n/messages";

/**
 * Data-label localization.
 *
 * The connector returns stable *categorical* labels (KPI names, risk names,
 * region names, forecast horizons, …) in English — those are display labels,
 * not free-form record values, so we translate them to the active locale.
 * Record-level values (incident descriptions, hospital names, hotspot names,
 * fleet items) stay exactly as AICP returns them.
 *
 * We map by the English text itself: every `cc.dl.*` / `cc.map.*` key's English
 * value is, by construction, the string the data lake emits (verified against
 * db/srca-datalake/02_seed.sql), so the reverse map needs no manual upkeep.
 */
const EN_TO_KEY: Record<string, MessageKey> = (() => {
  const map: Record<string, MessageKey> = {};
  for (const key of Object.keys(MESSAGES.en) as MessageKey[]) {
    if (key.startsWith("cc.dl.")) map[MESSAGES.en[key]] = key;
  }
  return map;
})();

type T = (key: MessageKey) => string;

/**
 * Translate a stable data label to the active locale. Unknown strings (genuine
 * record values) pass through untouched.
 */
export function dl(t: T, label: string | null | undefined): string {
  if (!label) return label ?? "";
  const key = EN_TO_KEY[label.trim()];
  return key ? t(key) : label;
}
