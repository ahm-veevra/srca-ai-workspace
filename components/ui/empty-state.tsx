import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Guided empty state — never a bare "no data". Shows an icon, title, a sentence
 * of guidance, primary/secondary actions, and an optional recommendation line.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  recommendation,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  recommendation?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-2/40 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
          <Icon className="h-6 w-6 text-accent" />
        </div>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {actions && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      )}
      {recommendation && (
        <p className="mt-4 text-xs text-muted-foreground">{recommendation}</p>
      )}
    </div>
  );
}
