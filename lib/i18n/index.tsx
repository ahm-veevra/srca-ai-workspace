"use client";

/**
 * i18n runtime for SRCA AI Workspace (A91 / PRR-029 / MF-12) — ported from the console pattern.
 *
 * Mirrors the app's theme mechanism (localStorage + a pre-paint script that stamps the root
 * element) so locale survives reloads with no flash of the wrong direction. The provider seeds
 * its state to DEFAULT_LOCALE so the server render and first client render agree (no hydration
 * mismatch); it then reconciles to the persisted locale in an effect and mirrors it onto
 * <html lang> / <html dir>.
 *
 * Usage:
 *   const t = useT();               t("shell.signOut")
 *   const { locale, dir, setLocale } = useLocale();
 */

import * as React from "react";

import {
  DEFAULT_LOCALE,
  LOCALE_DIR,
  LOCALE_STORAGE_KEY,
  LOCALES,
  MESSAGES,
  type LabelOverrides,
  type Locale,
  type MessageKey,
} from "./messages";

type Vars = Record<string, string | number>;

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

function applyToDocument(locale: Locale) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = LOCALE_DIR[locale];
}

// Persist to both localStorage (client reads) and a cookie (server components read via
// `@/lib/i18n/server`), so client and server-rendered text stay on the same locale.
function persist(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {}
  try {
    document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
  } catch {}
}

export function LocaleProvider({
  children,
  overrides = {},
}: {
  children: React.ReactNode;
  overrides?: LabelOverrides;
}) {
  // Seed to the default so SSR and first client render match; reconcile after mount.
  const [locale, setLocaleState] = React.useState<Locale>(DEFAULT_LOCALE);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(stored)) {
        if (stored !== locale) setLocaleState(stored);
        applyToDocument(stored);
        persist(stored); // ensure the cookie matches localStorage for server components
      } else {
        applyToDocument(locale);
      }
    } catch {
      applyToDocument(locale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    applyToDocument(l);
    persist(l);
  }, []);

  const t = React.useCallback(
    (key: MessageKey, vars?: Vars) => {
      const table = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
      const ov = overrides[key]?.[locale];
      const raw = ov ?? table[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
      return interpolate(raw, vars);
    },
    [locale, overrides],
  );

  const value = React.useMemo<LocaleContextValue>(
    () => ({ locale, dir: LOCALE_DIR[locale], setLocale, t }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within <LocaleProvider>");
  }
  return ctx;
}

/** Convenience hook — returns just the translate function. */
export function useT(): (key: MessageKey, vars?: Vars) => string {
  return useLocale().t;
}

export type { Locale, MessageKey };
