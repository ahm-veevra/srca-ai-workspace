// Server-side locale resolution (A91 / PRR-029) — ported from the console pattern. Workspace
// pages that are async server components can't use the client `useT()`; they read the locale
// from the `veevra-locale` cookie — which the client LocaleProvider keeps in sync with
// localStorage — and translate with `serverT`.
//
//   import { serverT } from "@/lib/i18n/server";
//   const t = serverT();            // bound to the request's locale
//   <h1>{t("home.quickActions")}</h1>

import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LOCALES,
  MESSAGES,
  type Locale,
  type MessageKey,
} from "./messages";
import { getLabelOverrides } from "./overrides";

type Vars = Record<string, string | number>;

function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

/** The request's locale, from the `veevra-locale` cookie. Falls back to the default. */
export function getServerLocale(): Locale {
  const value = cookies().get(LOCALE_STORAGE_KEY)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Returns a translate function bound to the request's locale, mirroring the client `useT()`. */
export function serverT(): (key: MessageKey, vars?: Vars) => string {
  const locale = getServerLocale();
  const overrides = getLabelOverrides();
  const table = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  return (key, vars) => {
    const ov = overrides[key]?.[locale];
    return interpolate(ov ?? table[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key, vars);
  };
}
