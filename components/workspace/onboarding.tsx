"use client";

import { ArrowRight, Sparkles, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ONBOARDING_DISMISSED_KEY,
  ROLE_STORAGE_KEY,
  ROLES,
  type Role,
} from "@/lib/onboarding";

/**
 * First-run, role-based onboarding. On first visit it asks the user's role and then shows tailored
 * starting points + a concrete first task. The choice persists (localStorage) and can be changed or
 * dismissed — it never blocks the workspace.
 */
export function Onboarding() {
  const [role, setRole] = React.useState<Role | null>(null);
  const [ready, setReady] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "1") setDismissed(true);
      const k = localStorage.getItem(ROLE_STORAGE_KEY);
      if (k) setRole(ROLES.find((r) => r.key === k) ?? null);
    } catch {
      /* storage unavailable — show the picker */
    }
    setReady(true);
  }, []);

  function chooseRole(r: Role) {
    setRole(r);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, r.key);
    } catch {
      /* ignore */
    }
  }
  function changeRole() {
    setRole(null);
    try {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!ready || dismissed) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="font-display text-base font-semibold">
                {role ? "Recommended for you" : "Welcome to SRCA AI Workspace"}
              </p>
              <p className="text-xs text-muted-foreground">
                {role
                  ? role.tagline
                  : "What best describes your role? We'll tailor your starting points."}
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!role ? (
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.key}
                  onClick={() => chooseRole(r)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm transition hover:border-primary/50 hover:bg-surface-2/50"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" /> {r.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              {role.starts.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="group rounded-md border border-border bg-background p-3 transition hover:border-primary/50"
                >
                  <p className="flex items-center gap-1 text-sm font-medium">
                    {s.label}
                    <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.why}</p>
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Try:</span> {role.example}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={changeRole}
                className="shrink-0 text-xs text-muted-foreground"
              >
                Change role
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
