"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, UserCog } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { PERSONAS, getPersona } from "@/lib/personas";
import { usePersona } from "@/lib/use-config-mode";

/** Compact persona control for the (dark) sidebar plus the selection dialog. Choosing a
 * persona sets the workspace depth and navigates to that persona's landing area. */
export function PersonaSwitcher({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const { persona, choose } = usePersona();
  const [open, setOpen] = React.useState(false);
  const current = getPersona(persona);

  function pick(key: string) {
    const p = getPersona(key);
    if (!p) return;
    choose(p.key, p.mode);
    setOpen(false);
    router.push(p.landing);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={current ? `Persona: ${current.name}` : "Choose your role"}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border border-white/10 text-start transition-colors hover:bg-white/5",
          collapsed ? "h-9 justify-center px-0" : "px-2.5 py-1.5",
        )}
      >
        <UserCog className="h-4 w-4 shrink-0 text-accent" />
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-white">
              {current ? current.name : "Choose your role"}
            </span>
            <span className="block text-[10px] text-white/40">
              {current ? "Tap to switch" : "Personalise your view"}
            </span>
          </span>
        )}
        {!collapsed && <ChevronRight className="h-3.5 w-3.5 text-white/40" />}
      </button>

      {open && (
        <Dialog open onClose={() => setOpen(false)} title="Choose your role">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              We&apos;ll tailor the platform to how you work. You can change this anytime, and
              the workspace depth stays adjustable.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PERSONAS.map((p) => {
                const Icon = p.icon;
                const active = p.key === persona;
                return (
                  <button
                    key={p.key}
                    onClick={() => pick(p.key)}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-lg border p-3 text-start transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border-strong hover:bg-muted/40",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{p.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{p.description}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {p.focus.map((f) => (
                        <span key={f}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {f}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
