"use client";

import { Check, ChevronsUpDown, Search } from "lucide-react";
import * as React from "react";

import { apiGet } from "@/lib/api-client";

export interface LookupItem {
  code: string;
  label: string;
  description?: string;
  active?: boolean;
  kind?: string;
  id?: string | null;
}

const CACHE = new Map<string, LookupItem[]>();

/**
 * Searchable, managed lookup bound to a reference-data category (e.g. "languages",
 * "models", "routing_operators"). Stores the item `code`; shows the friendly label.
 * This is the standard replacement for free-text configuration fields.
 */
export function Lookup({
  category,
  value,
  onChange,
  placeholder = "Select…",
  allowEmpty = false,
  disabled = false,
  className = "",
}: {
  category: string;
  value: string | null;
  onChange: (code: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [items, setItems] = React.useState<LookupItem[]>(CACHE.get(category) ?? []);
  const [loading, setLoading] = React.useState(!CACHE.has(category));
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let alive = true;
    if (CACHE.has(category)) {
      setItems(CACHE.get(category)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiGet<LookupItem[]>(`/reference/${category}`)
      .then((data) => {
        if (!alive) return;
        CACHE.set(category, data);
        setItems(data);
      })
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [category]);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = items.find((i) => i.code === value) ?? null;
  const filtered = query
    ? items.filter(
        (i) =>
          i.label.toLowerCase().includes(query.toLowerCase()) ||
          i.code.toLowerCase().includes(query.toLowerCase()),
      )
    : items;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md border border-border bg-surface-1 px-3 py-1.5 text-start text-sm disabled:opacity-60"
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {loading ? "Loading…" : selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border-strong bg-surface-2 shadow-lg">
          <div className="sticky top-0 flex items-center gap-2 border-b border-border bg-surface-2 px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          {allowEmpty && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
              className="block w-full px-3 py-1.5 text-start text-sm text-muted-foreground hover:bg-surface-1"
            >
              — none —
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matches.</div>
          ) : (
            filtered.map((i) => (
              <button
                key={i.code}
                type="button"
                onClick={() => { onChange(i.code); setOpen(false); setQuery(""); }}
                className="flex w-full items-start justify-between gap-2 px-3 py-1.5 text-start text-sm hover:bg-surface-1"
              >
                <span>
                  <span className={i.active === false ? "text-muted-foreground" : ""}>
                    {i.label}
                  </span>
                  {i.active === false && (
                    <span className="ms-2 text-xs text-warning">(inactive)</span>
                  )}
                  {i.description && (
                    <span className="block text-xs text-muted-foreground">{i.description}</span>
                  )}
                </span>
                {i.code === value && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Clears a cached category (call after adding/removing custom reference items). */
export function invalidateLookup(category: string) {
  CACHE.delete(category);
}

/** Fetch (and cache) a category's items — for components that need labels, not a picker. */
export async function fetchLookup(category: string): Promise<LookupItem[]> {
  if (CACHE.has(category)) return CACHE.get(category)!;
  try {
    const data = await apiGet<LookupItem[]>(`/reference/${category}`);
    CACHE.set(category, data);
    return data;
  } catch {
    return [];
  }
}
