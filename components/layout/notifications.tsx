"use client";

import * as React from "react";
import { Bell } from "lucide-react";

import { apiGet } from "@/lib/api-client";
import type { GovAlert } from "@/lib/types";
import { StatusDot, type StatusTone } from "@/components/ui/status-dot";

const sevTone = (s: string): StatusTone =>
  s === "critical" || s === "high" ? "danger" : s === "medium" ? "warning" : "info";

export function Notifications({ canRead }: { canRead: boolean }) {
  const [alerts, setAlerts] = React.useState<GovAlert[]>([]);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState(false);
  const aliveRef = React.useRef(true);

  const load = React.useCallback(async () => {
    if (!canRead) return;
    try {
      const all = await apiGet<GovAlert[]>("/governance/alerts");
      if (aliveRef.current) {
        setAlerts(Array.isArray(all) ? all.filter((a) => a.status === "open") : []);
        setError(false);
      }
    } catch {
      if (aliveRef.current) setError(true);
    }
  }, [canRead]);

  React.useEffect(() => {
    aliveRef.current = true;
    load();
    const id = setInterval(load, 30000);
    return () => {
      aliveRef.current = false;
      clearInterval(id);
    };
  }, [load]);

  const count = alerts.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-danger-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border-strong bg-surface-2 shadow-elevated">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">Alerts</span>
              <span className="text-xs text-muted-foreground">{count} open</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {!canRead ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  You don’t have access to alerts.
                </p>
              ) : error && count === 0 ? (
                <div className="px-4 py-8 text-center text-sm">
                  <p className="text-muted-foreground">Couldn’t load alerts.</p>
                  <button
                    onClick={() => load()}
                    className="mt-2 text-xs font-medium text-accent hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : count === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No open alerts. All clear.
                </p>
              ) : (
                // Informational only — governance is administered in the AICP console, not here.
                alerts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-2.5 border-b border-border/60 px-4 py-3 last:border-0"
                  >
                    <span className="mt-1">
                      <StatusDot tone={sevTone(a.severity)} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.title}</span>
                      <span className="text-xs capitalize text-muted-foreground">
                        {a.severity} · {a.source}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
