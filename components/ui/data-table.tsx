"use client";

import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Star, X, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Table, TBody, TD, TH, THead, TR } from "./table";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => string | number;
  className?: string;
  align?: "right" | "center";
}

export interface Facet<T> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  match: (row: T, value: string) => boolean;
}

interface SavedView {
  name: string;
  query: string;
  facets: Record<string, string[]>;
  sortKey: string | null;
  sortDir: "asc" | "desc";
}

export function DataTable<T>({
  rows,
  columns,
  getId,
  searchText,
  facets = [],
  savedViewsKey,
  bulkActions,
  onRowClick,
  emptyLabel = "No records.",
}: {
  rows: T[];
  columns: Column<T>[];
  getId: (row: T) => string;
  /** Concatenated searchable text for a row. */
  searchText?: (row: T) => string;
  facets?: Facet<T>[];
  /** localStorage key enabling Saved Views. */
  savedViewsKey?: string;
  bulkActions?: (selectedIds: string[], clear: () => void) => React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState<Record<string, string[]>>({});
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [views, setViews] = React.useState<SavedView[]>([]);

  React.useEffect(() => {
    if (!savedViewsKey) return;
    try {
      const raw = localStorage.getItem(`veevra-views:${savedViewsKey}`);
      if (raw) setViews(JSON.parse(raw));
    } catch {}
  }, [savedViewsKey]);

  function persistViews(next: SavedView[]) {
    setViews(next);
    try {
      localStorage.setItem(`veevra-views:${savedViewsKey}`, JSON.stringify(next));
    } catch {}
  }

  function toggleFacet(key: string, value: string) {
    setActive((prev) => {
      const cur = new Set(prev[key] ?? []);
      cur.has(value) ? cur.delete(value) : cur.add(value);
      return { ...prev, [key]: Array.from(cur) };
    });
  }

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const facetCount = Object.values(active).reduce((n, a) => n + a.length, 0);
  const hasFilters = query.trim() !== "" || facetCount > 0;

  function clearFilters() {
    setQuery("");
    setActive({});
  }

  // ── Pipeline: facets → query → sort ────────────────────────────────────
  const filtered = React.useMemo(() => {
    let out = rows;
    for (const f of facets) {
      const vals = active[f.key];
      if (vals && vals.length) out = out.filter((r) => vals.some((v) => f.match(r, v)));
    }
    const q = query.trim().toLowerCase();
    if (q && searchText) out = out.filter((r) => searchText(r).toLowerCase().includes(q));
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, facets, active, query, searchText, sortKey, sortDir, columns]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(getId(r)));
  const someSelected = selected.size > 0;

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) return new Set();
      return new Set(filtered.map(getId));
    });
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  const clearSelection = () => setSelected(new Set());

  const showCheckbox = !!bulkActions;
  const colSpan = columns.length + (showCheckbox ? 1 : 0) + (onRowClick ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {searchText && (
          <div className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-md border border-border bg-[hsl(var(--input))] px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}
        {facets.map((f) => (
          <div key={f.key} className="flex items-center gap-1">
            {f.options.map((o) => {
              const on = (active[f.key] ?? []).includes(o.value);
              return (
                <button
                  key={o.value}
                  onClick={() => toggleFacet(f.key, o.value)}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    on
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-border bg-surface-3/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        ))}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
        <span className="ms-auto text-xs text-muted-foreground tabular">
          {filtered.length} of {rows.length}
        </span>
        {savedViewsKey && (
          <SavedViews
            views={views}
            onSave={(name) =>
              persistViews([
                ...views.filter((v) => v.name !== name),
                { name, query, facets: active, sortKey, sortDir },
              ])
            }
            onApply={(v) => {
              setQuery(v.query);
              setActive(v.facets);
              setSortKey(v.sortKey);
              setSortDir(v.sortDir);
            }}
            onDelete={(name) => persistViews(views.filter((v) => v.name !== name))}
          />
        )}
      </div>

      {/* Bulk action bar */}
      {showCheckbox && someSelected && (
        <div className="flex items-center justify-between rounded-md border border-accent/40 bg-accent/10 px-3 py-2">
          <span className="text-sm font-medium text-accent">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            {bulkActions!(Array.from(selected), clearSelection)}
            <button
              onClick={clearSelection}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <Table>
        <THead>
          <TR>
            {showCheckbox && (
              <TH className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 accent-[hsl(var(--accent))]"
                  aria-label="Select all"
                />
              </TH>
            )}
            {columns.map((c) => (
              <TH key={c.key} className={cn(c.align === "right" && "text-end", c.className)}>
                {c.sortValue ? (
                  <button
                    onClick={() => toggleSort(c.key)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-foreground",
                      c.align === "right" && "flex-row-reverse",
                    )}
                  >
                    {c.header}
                    {sortKey === c.key ? (
                      sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                ) : (
                  c.header
                )}
              </TH>
            ))}
            {onRowClick && <TH className="w-8" />}
          </TR>
        </THead>
        <TBody>
          {filtered.map((row) => {
            const id = getId(row);
            return (
              <TR
                key={id}
                className={cn(onRowClick && "cursor-pointer", selected.has(id) && "bg-accent/5")}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {showCheckbox && (
                  <TD onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(id)}
                      onChange={() => toggleOne(id)}
                      className="h-3.5 w-3.5 accent-[hsl(var(--accent))]"
                      aria-label="Select row"
                    />
                  </TD>
                )}
                {columns.map((c) => (
                  <TD key={c.key} className={cn(c.align === "right" && "text-end", c.className)}>
                    {c.render ? c.render(row) : (row as Record<string, unknown>)[c.key] as React.ReactNode}
                  </TD>
                ))}
                {onRowClick && (
                  <TD className="text-end">
                    <ChevronRight className="ms-auto h-4 w-4 text-muted-foreground" />
                  </TD>
                )}
              </TR>
            );
          })}
          {filtered.length === 0 && (
            <TR>
              <TD colSpan={colSpan} className="py-8 text-center text-muted-foreground">
                {hasFilters ? "No records match your filters." : emptyLabel}
              </TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}

function SavedViews({
  views,
  onSave,
  onApply,
  onDelete,
}: {
  views: SavedView[];
  onSave: (name: string) => void;
  onApply: (v: SavedView) => void;
  onDelete: (name: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-3/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <Star className="h-3.5 w-3.5" /> Views
        {views.length > 0 && <span className="tabular">({views.length})</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border-strong bg-surface-2 p-1 shadow-elevated">
            {views.length === 0 && (
              <p className="px-2 py-2 text-xs text-muted-foreground">No saved views yet.</p>
            )}
            {views.map((v) => (
              <div key={v.name} className="flex items-center gap-1">
                <button
                  onClick={() => { onApply(v); setOpen(false); }}
                  className="flex-1 truncate rounded-md px-2 py-1.5 text-start text-sm hover:bg-surface-3"
                >
                  {v.name}
                </button>
                <button
                  onClick={() => onDelete(v.name)}
                  className="rounded-md p-1 text-muted-foreground hover:text-danger"
                  aria-label="Delete view"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const name = window.prompt("Save current view as:");
                if (name) { onSave(name); setOpen(false); }
              }}
              className="mt-1 w-full rounded-md border-t border-border px-2 py-1.5 text-start text-xs font-medium text-accent hover:bg-surface-3"
            >
              + Save current view
            </button>
          </div>
        </>
      )}
    </div>
  );
}
