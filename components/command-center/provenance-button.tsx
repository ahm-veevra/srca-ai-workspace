"use client";

import * as React from "react";
import { BookOpenCheck, Bot, Database, Info, X } from "lucide-react";

import { resolveProvenance } from "@/lib/command-center-provenance";
import { cn } from "@/lib/utils";

import { useProvenanceRuntime } from "./provenance-context";

/** Small info button on a widget that reveals its data lineage (source, connector,
 *  saved query, table/view, model, agent, collection) in a click-away popover. */
export function ProvenanceButton({
  surfaceKey,
  className,
}: {
  surfaceKey: string;
  className?: string;
}) {
  const rt = useProvenanceRuntime();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const resolved = resolveProvenance(surfaceKey, rt);

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

  if (!resolved) return null;
  const { info, rows } = resolved;
  const Icon = info.sourceType === "database" ? Database : info.sourceType === "knowledge" ? BookOpenCheck : Bot;

  return (
    <div ref={ref} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label="Where does this data come from?"
        title="Where does this data come from?"
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
              <p className="text-xs font-semibold leading-tight">Data lineage</p>
              <p className="truncate text-[11px] text-muted-foreground">{info.poweredBy}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="ms-auto rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <dl className="space-y-1.5">
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[88px_1fr] gap-2 text-[11px]">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className="break-words font-medium text-foreground">{r.value}</dd>
              </div>
            ))}
          </dl>
          {info.note && (
            <p className="mt-2.5 border-t border-border pt-2 text-[11px] leading-relaxed text-muted-foreground">
              {info.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
