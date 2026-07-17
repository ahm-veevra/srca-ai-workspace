"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Layers } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MembershipSummary, TenantSummary } from "@/lib/types";

export type EnvKey = "prod" | "staging" | "sandbox";

export const ENVIRONMENTS: { key: EnvKey; label: string; tone: string }[] = [
  { key: "prod", label: "Production", tone: "bg-success" },
  { key: "staging", label: "Staging", tone: "bg-warning" },
  { key: "sandbox", label: "Sandbox", tone: "bg-info" },
];

export function EnvSelector({
  value,
  onChange,
}: {
  value: EnvKey;
  onChange: (v: EnvKey) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const current = ENVIRONMENTS.find((e) => e.key === value) ?? ENVIRONMENTS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-3/60 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-surface-3"
      >
        <span className={cn("h-2 w-2 rounded-full", current.tone)} />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-border-strong bg-surface-2 p-1 shadow-elevated">
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Environment
            </p>
            {ENVIRONMENTS.map((e) => (
              <button
                key={e.key}
                onClick={() => {
                  onChange(e.key);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-3"
              >
                <span className={cn("h-2 w-2 rounded-full", e.tone)} />
                <span className="flex-1 text-start">{e.label}</span>
                {e.key === value && <Check className="h-3.5 w-3.5 text-accent" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function TenantSelector({
  activeTenant,
  memberships,
  isSuperadmin,
}: {
  activeTenant: TenantSummary | null;
  memberships: MembershipSummary[];
  isSuperadmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  // Only superadmins can switch tenant at runtime (X-Tenant-Id is superadmin-only).
  const switchable = isSuperadmin && memberships.length > 0;

  function selectTenant(id: string) {
    document.cookie = `veevra_tenant=${id}; path=/; max-age=2592000; samesite=lax`;
    setOpen(false);
    router.refresh();
  }

  const trigger = (
    <span className="inline-flex items-center gap-1.5">
      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="max-w-[140px] truncate">
        {activeTenant?.name ?? "No tenant"}
      </span>
    </span>
  );

  if (!switchable) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-3/60 px-2.5 py-1.5 text-xs font-medium">
        {trigger}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-3/60 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-surface-3"
      >
        {trigger}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border border-border-strong bg-surface-2 p-1 shadow-elevated">
            <p className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Layers className="h-3 w-3" /> Switch tenant
            </p>
            <div className="max-h-72 overflow-y-auto">
              {memberships.map((m) => (
                <button
                  key={m.membership_id}
                  onClick={() => selectTenant(m.tenant.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-3"
                >
                  <span className="flex-1 text-start">
                    <span className="block truncate">{m.tenant.name}</span>
                    <span className="text-[11px] text-muted-foreground">{m.role}</span>
                  </span>
                  {activeTenant?.id === m.tenant.id && (
                    <Check className="h-3.5 w-3.5 text-accent" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
