"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/** Route-level error boundary for the workspace. Replaces silent failure with a clear message,
 * a retry, and a support reference (the framework's error digest) when available. */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for diagnostics; the digest links server logs to this render.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          This screen couldn&apos;t be loaded. You can retry, or navigate away and come back. If it
          keeps happening, share the reference below with support.
        </p>
      </div>
      {error.digest && (
        <code className="rounded bg-surface-2 px-2 py-1 text-xs text-muted-foreground">
          ref: {error.digest}
        </code>
      )}
      <Button onClick={reset} className="gap-1.5">
        <RotateCcw className="h-4 w-4" /> Try again
      </Button>
    </div>
  );
}
