"use client";

import * as React from "react";
import { ChevronDown, Cpu, Database } from "lucide-react";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { ARCHITECTURE } from "@/lib/command-center-types";

export function HowItWorks() {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-5 text-left"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Cpu className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-display text-base font-semibold">{t("cc.how.title")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("cc.how.subtitle")}
          </p>
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="border-t border-border p-5">
            {/* Flow */}
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="rounded-lg bg-muted px-3 py-1.5">{t("cc.how.flowSource")}</span>
              <span className="text-muted-foreground">→</span>
              <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-primary">{t("cc.how.flowAicp")}</span>
              <span className="text-muted-foreground">→</span>
              <span className="rounded-lg bg-muted px-3 py-1.5">{t("cc.how.flowWorkspace")}</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {ARCHITECTURE.map((row) => (
                <div key={row.component} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                  <span className="font-medium">{row.component}</span>
                  <span className="ms-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Database className="h-3.5 w-3.5 text-primary" />
                    {row.poweredBy}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              {t("cc.how.footer")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
