"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { apiGet } from "@/lib/api-client";

interface Impact {
  target: { type: string; key: string; label: string };
  dependents: { type: string; key: string; label: string; relation: string }[];
  by_type: Record<string, number>;
  total: number;
  blocking: boolean;
  replacements: { key: string; label: string }[];
}

const REL_LABELS: Record<string, string> = {
  routes_to: "routes to", uses_model: "uses", limits: "budgets", embeds_with: "embeds with",
  chains: "chains", fallback: "falls back to", tunes: "fine-tunes", trains_on: "trains on",
};

/**
 * Confirmation that first shows what depends on a configuration item (impact analysis)
 * before a destructive action. Reusable across any resource type.
 */
export function ImpactDialog({
  resourceType,
  resourceKey,
  resourceLabel,
  actionLabel,
  onConfirm,
  onClose,
}: {
  resourceType: string;
  resourceKey: string;
  resourceLabel: string;
  actionLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [impact, setImpact] = React.useState<Impact | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiGet<Impact>(
      `/config-map/impact?resource_type=${resourceType}&resource_key=${encodeURIComponent(resourceKey)}`,
    )
      .then(setImpact)
      .catch(() => setImpact(null))
      .finally(() => setLoading(false));
  }, [resourceType, resourceKey]);

  return (
    <Dialog open onClose={onClose} title={`${actionLabel} ${resourceLabel}?`}>
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking what depends on this…
        </p>
      ) : !impact || impact.total === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Nothing else depends on this. Safe to proceed.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { onConfirm(); onClose(); }}>{actionLabel}</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="text-sm">
              <p className="font-medium">This will affect {impact.total} configuration item(s):</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(impact.by_type).map(([t, c]) => (
                  <Badge key={t} variant="secondary">{t.replace(/_/g, " ")}: {c}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-48 space-y-1 overflow-auto">
            {impact.dependents.map((d, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border border-border/60 p-2 text-sm">
                <Badge variant="outline">{d.type.replace(/_/g, " ")}</Badge>
                <span className="font-medium">{d.label}</span>
                <span className="ms-auto text-xs text-muted-foreground">
                  {REL_LABELS[d.relation] ?? d.relation} {impact.target.label}
                </span>
              </div>
            ))}
          </div>

          {impact.replacements.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Tip: you can re-point dependents to{" "}
              {impact.replacements.slice(0, 3).map((r) => r.label).join(", ")} first.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onConfirm(); onClose(); }}>
              {actionLabel} anyway
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
