"use client";

import * as React from "react";
import { Coins, Info, PhoneCall, ShieldCheck, Sparkles, type LucideIcon, X } from "lucide-react";

import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface LineageRow {
  label: string;
  value: string;
}

/** Icon keys — a NAME is passed across the RSC boundary (server → client) instead of the
 *  Lucide component itself, which (being a function) can't be serialised as a prop. */
export type LineageIcon = "shield" | "coins" | "sparkles" | "phone";
const ICONS: Record<LineageIcon, LucideIcon> = {
  shield: ShieldCheck,
  coins: Coins,
  sparkles: Sparkles,
  phone: PhoneCall,
};

/**
 * Small info button on an AICP-Intelligence widget that reveals what it uses — the AICP
 * source (governance / observability API, or an AI capability), the endpoints it reads, and
 * (for AI surfaces) the capability and model. Mirrors the command-center provenance button,
 * but self-contained: each widget passes its own lineage rather than a global registry.
 */
export function LineageButton({
  icon,
  sourceLabel,
  rows = [],
  endpoints = [],
  className,
}: {
  icon: LineageIcon;
  sourceLabel: string;
  rows?: LineageRow[];
  endpoints?: string[];
  className?: string;
}) {
  const t = useT();
  const Icon = ICONS[icon] ?? Info;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={t("ai.lin.aria")}
        title={t("ai.lin.aria")}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground",
          open && "bg-muted text-foreground",
        )}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute top-7 z-50 w-72 rounded-xl border border-border bg-card p-3.5 text-start shadow-lg ltr:right-0 rtl:left-0">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight">{t("ai.lin.title")}</p>
              <p className="truncate text-[11px] text-muted-foreground">{sourceLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("ai.lin.close")}
              className="ms-auto rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <dl className="space-y-1.5">
            <div className="grid grid-cols-[88px_1fr] gap-2 text-[11px]">
              <dt className="text-muted-foreground">{t("ai.lin.source")}</dt>
              <dd className="break-words font-medium text-foreground">{sourceLabel}</dd>
            </div>
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[88px_1fr] gap-2 text-[11px]">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className="break-words font-medium text-foreground">{r.value}</dd>
              </div>
            ))}
          </dl>

          {endpoints.length > 0 && (
            <div className="mt-2.5 border-t border-border pt-2">
              <p className="mb-1 text-[11px] text-muted-foreground">{t("ai.lin.endpoints")}</p>
              <ul className="space-y-0.5">
                {endpoints.map((e) => (
                  <li key={e} dir="ltr" className="truncate font-mono text-[10.5px] text-foreground/80">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
