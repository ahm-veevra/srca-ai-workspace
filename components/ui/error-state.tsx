"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Inline load-error state with a retry — the client-side counterpart to the route error boundary.
 * Use it wherever a component fetches its own data, so a failed load shows a clear message and a
 * Retry instead of a silently-empty screen. Optionally surfaces a support reference (trace id).
 */
export function ErrorState({
  title = "Couldn't load this",
  message,
  onRetry,
  trace,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  trace?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-danger/40 bg-danger/5 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-danger/30 bg-danger/10">
        <AlertTriangle className="h-5 w-5 text-danger" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        {message ?? "Something went wrong loading this data. Please try again."}
      </p>
      {trace && (
        <code className="mt-2 rounded bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground">
          ref: {trace}
        </code>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}
