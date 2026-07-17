"use client";

import * as React from "react";

import { apiGet } from "@/lib/api-client";
import type { SystemHealth } from "@/lib/types";
import { StatusDot, type StatusTone } from "@/components/ui/status-dot";

const toneFor = (status?: string): StatusTone => {
  if (status === "healthy" || status === "ok") return "success";
  if (status === "degraded") return "warning";
  if (!status) return "muted";
  return "danger";
};

export function HealthPill({ canRead }: { canRead: boolean }) {
  const [health, setHealth] = React.useState<SystemHealth | null>(null);
  const [err, setErr] = React.useState(false);

  React.useEffect(() => {
    if (!canRead) return;
    let alive = true;
    const load = async () => {
      try {
        const h = await apiGet<SystemHealth>("/system/health");
        if (alive) {
          setHealth(h);
          setErr(false);
        }
      } catch {
        if (alive) setErr(true);
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [canRead]);

  const tone = err ? "danger" : toneFor(health?.status);
  const label = err
    ? "Health"
    : health
      ? health.status.charAt(0).toUpperCase() + health.status.slice(1)
      : "Health";

  return (
    <span
      className="hidden items-center gap-1.5 rounded-md border border-border bg-surface-3/60 px-2.5 py-1 text-xs text-muted-foreground md:inline-flex"
      title={
        health
          ? `DB ${health.database ? "ok" : "down"} · Redis ${health.redis ? "ok" : "down"}`
          : "System health"
      }
    >
      <StatusDot tone={tone} pulse={tone === "success"} />
      {label}
    </span>
  );
}
