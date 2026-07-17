"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { useLocale } from "@/lib/i18n";
import { LOCALE_LABEL } from "@/lib/i18n/messages";

/**
 * English ⇄ Arabic switch (A91 / PRR-029) — ported from the console. Mirrors ThemeToggle:
 * persists the choice and stamps <html lang/dir> via the locale provider, so the whole workspace
 * flips to RTL. The button shows the code of the language it will switch *to*, matching the
 * sun/moon "shows the target state" convention.
 */
export function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();
  const router = useRouter();
  const next = locale === "en" ? "ar" : "en";

  function switchTo() {
    setLocale(next);
    // Re-render server components so cookie-driven server-side translations update too.
    router.refresh();
  }

  return (
    <button
      onClick={switchTo}
      aria-label={t("lang.switchTo", { name: LOCALE_LABEL[next] })}
      title={t("lang.switchTo", { name: LOCALE_LABEL[next] })}
      className="flex h-9 items-center gap-1.5 rounded-md px-2 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-semibold uppercase">{next}</span>
    </button>
  );
}
