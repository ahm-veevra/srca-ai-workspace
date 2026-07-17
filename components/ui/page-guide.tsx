"use client";

import { ChevronDown, GraduationCap, Lightbulb } from "lucide-react";
import * as React from "react";

import { useT } from "@/lib/i18n";

/**
 * Inline learning panel — "What is this? Why does it exist? When do I use it?" — so every
 * screen teaches the user. Collapsed by default (one line); expands on click and remembers
 * per-page in localStorage.
 */
export function PageGuide({
  id,
  title,
  what,
  why,
  when,
  example,
}: {
  id: string;
  title: string;
  what: string;
  why: string;
  when: string;
  example?: string;
}) {
  const t = useT();
  const key = `veevra-guide-${id}`;
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(key) === "open");
    } catch {
      /* ignore */
    }
  }, [key]);
  function toggle() {
    setOpen((o) => {
      const next = !o;
      try {
        window.localStorage.setItem(key, next ? "open" : "closed");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="rounded-lg border border-accent/20 bg-accent/[0.04]">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm"
      >
        <GraduationCap className="h-4 w-4 shrink-0 text-accent" />
        <span className="font-medium">{t("ci.guide.whatIs", { title })}</span>
        <span className="ms-1 hidden truncate text-muted-foreground sm:inline">{what}</span>
        <ChevronDown
          className={`ms-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-accent/15 px-4 py-3 text-sm">
          <Row label={t("ci.guide.whatItIs")} text={what} />
          <Row label={t("ci.guide.whyExists")} text={why} />
          <Row label={t("ci.guide.whenUse")} text={when} />
          {example && (
            <div className="flex items-start gap-2 rounded-md bg-surface-2/50 p-2.5">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-muted-foreground"><span className="font-medium text-foreground">{t("ci.guide.example")} </span>{example}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, text }: { label: string; text: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_1fr]">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span>{text}</span>
    </div>
  );
}
