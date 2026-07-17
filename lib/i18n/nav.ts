"use client";

/**
 * Navigation localization (A91 / PRR-029) — ported from the console pattern. The English nav
 * labels stay the single source of truth in `@/lib/nav` (and `@/lib/suites`); this module only
 * supplies Arabic overrides, keyed by href (items) and by the English label (groups). Product
 * names (SRCA AI Workspace, V-GPT, V-Core, …) stay Latin as brand marks. For the English locale the
 * original label is returned unchanged, and any label without an Arabic entry gracefully falls
 * back to English — so adding a nav item never breaks, it just shows in English until translated.
 */

import { useLocale } from "@/lib/i18n";
import { NAV_GROUPS } from "@/lib/nav";

// Group headers are business-function labels (see lib/nav.ts). Keyed by the exact English string.
const AR_GROUPS: Record<string, string> = {
  Overview: "نظرة عامة",
  Operations: "العمليات",
  "Knowledge & People": "المعرفة والأفراد",
  "Governance & Leadership": "الحوكمة والقيادة",
  "AI Tools": "أدوات الذكاء",
  Settings: "الإعدادات",
};

const AR_ITEMS: Record<string, string> = {
  // Workspace
  "/workspace": "الرئيسية",
  "/v-gpt": "V-GPT",
  "/capabilities-run": "قدراتي",
  "/create": "إنشاء قدرة",
  "/intelligence-history": "سجل الذكاء",
  "/ai-intelligence": "ذكاء AICP",
  "/settings/aicp": "إعدادات AICP",
  "/settings/dictionary": "قاموس التسميات",
  // Suites — Intelligence Centers
  "/compliance-intelligence": "الامتثال",
  "/agent-marketplace": "الوكلاء",
  "/procurement-intelligence": "المشتريات",
  "/document-intelligence": "المستندات",
  "/correspondence-intelligence": "المراسلات",
  "/contract-intelligence": "العقود",
  "/rfp-intelligence": "المناقصات والعطاءات",
  "/meeting-intelligence": "الاجتماعات",
  "/knowledge-center": "المعرفة والبحث",
  "/research-intelligence": "الأبحاث",
  "/hr-intelligence": "الموارد البشرية",
  "/project-intelligence": "المشاريع",
  "/executive-intelligence": "الإدارة التنفيذية",
  // Explore
  "/capabilities": "القدرات الذكية",
  "/learn": "مركز التعلّم",
};

export interface NavLabeler {
  group: (englishLabel: string) => string;
  item: (href: string, englishLabel: string) => string;
}

/** Returns label resolvers bound to the active locale. */
export function useNavLabels(): NavLabeler {
  const { locale } = useLocale();
  if (locale === "en") {
    return { group: (l) => l, item: (_href, l) => l };
  }
  return {
    group: (l) => AR_GROUPS[l] ?? l,
    item: (href, l) => AR_ITEMS[href] ?? l,
  };
}

/** Localized best-effort label for the current path (breadcrumbs / titles). Mirrors
 * `labelForPath` in `@/lib/nav` but applies the active locale's overrides. */
export function usePathLabel(pathname: string): string {
  const labels = useNavLabels();
  for (const g of NAV_GROUPS) {
    for (const it of g.items) {
      if (pathname === it.href || pathname.startsWith(it.href + "/")) {
        return labels.item(it.href, it.label);
      }
    }
  }
  return "SRCA AI Workspace";
}
