"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { hasPerm } from "@/lib/types";
import { NAV_GROUPS, QUICK_ACTIONS } from "@/lib/nav";

interface Entry {
  label: string;
  group: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: boolean;
}

export function CommandPalette({
  open,
  onOpenChange,
  permissions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  permissions: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const entries = React.useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    for (const a of QUICK_ACTIONS) {
      if (a.perm === null || hasPerm(permissions, a.perm)) {
        out.push({ label: a.label, group: "Quick actions", href: a.href, icon: Sparkles, action: true });
      }
    }
    for (const grp of NAV_GROUPS) {
      for (const it of grp.items) {
        if (it.perm === null || hasPerm(permissions, it.perm)) {
          out.push({ label: it.label, group: grp.label, href: it.href, icon: it.icon });
        }
      }
    }
    return out;
  }, [permissions]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) => e.label.toLowerCase().includes(q) || e.group.toLowerCase().includes(q),
    );
  }, [entries, query]);

  React.useEffect(() => {
    setActive(0);
  }, [query, open]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      // focus after paint
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const target = filtered[active];
        if (target) go(target);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered, active]);

  function go(e: Entry) {
    onOpenChange(false);
    router.push(e.href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-background/70 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border-strong bg-surface-2 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules, actions…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches for “{query}”.
            </p>
          )}
          {filtered.map((e, i) => {
            const Icon = e.icon;
            return (
              <button
                key={`${e.href}-${e.label}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(e)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm transition-colors",
                  i === active ? "bg-accent/15 text-foreground" : "text-muted-foreground",
                )}
              >
                {Icon && (
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      e.action ? "text-accent" : i === active ? "text-accent" : "",
                    )}
                  />
                )}
                <span className="flex-1 text-foreground">{e.label}</span>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {e.group}
                </span>
                {i === active && (
                  <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
