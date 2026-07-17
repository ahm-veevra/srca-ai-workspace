"use client";

import * as React from "react";
import { CheckCircle2, Loader2, RotateCcw, Save, Search, XCircle } from "lucide-react";

import { saveDictionaryAction } from "@/app/(portal)/settings/dictionary/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MESSAGES, type LabelOverrides, type MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const ALL_KEYS = Object.keys(MESSAGES.en) as MessageKey[];

type Edits = Record<string, { en: string; ar: string }>;
type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

/** Seed every field with its CURRENT value: the saved override if any, else the default. */
function initEdits(overrides: LabelOverrides): Edits {
  const edits: Edits = {};
  for (const k of ALL_KEYS) {
    edits[k] = {
      en: overrides[k]?.en ?? MESSAGES.en[k],
      ar: overrides[k]?.ar ?? MESSAGES.ar[k],
    };
  }
  return edits;
}

export function DictionaryForm({ overrides }: { overrides: LabelOverrides }) {
  const [edits, setEdits] = React.useState<Edits>(() => initEdits(overrides));
  const [filter, setFilter] = React.useState("");
  const [ccOnly, setCcOnly] = React.useState(true);
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });

  const set = (key: MessageKey, loc: "en" | "ar", val: string) => {
    setEdits((prev) => ({ ...prev, [key]: { ...prev[key], [loc]: val } }));
    setStatus({ kind: "idle" });
  };
  const reset = (key: MessageKey) => {
    setEdits((prev) => ({ ...prev, [key]: { en: MESSAGES.en[key], ar: MESSAGES.ar[key] } }));
    setStatus({ kind: "idle" });
  };

  const isChanged = (k: MessageKey) => edits[k].en !== MESSAGES.en[k] || edits[k].ar !== MESSAGES.ar[k];

  const keys = React.useMemo(() => {
    const f = filter.trim().toLowerCase();
    return ALL_KEYS.filter((k) => {
      if (ccOnly && !k.startsWith("cc.")) return false;
      if (!f) return true;
      return (
        k.toLowerCase().includes(f) ||
        MESSAGES.en[k].toLowerCase().includes(f) ||
        edits[k].en.toLowerCase().includes(f) ||
        MESSAGES.ar[k].includes(filter.trim()) ||
        edits[k].ar.includes(filter.trim())
      );
    });
  }, [filter, ccOnly, edits]);

  const changedCount = ALL_KEYS.filter(isChanged).length;

  const save = async () => {
    // Only persist labels that differ from the default.
    const payload: LabelOverrides = {};
    for (const k of ALL_KEYS) {
      const entry: { en?: string; ar?: string } = {};
      if (edits[k].en !== MESSAGES.en[k]) entry.en = edits[k].en;
      if (edits[k].ar !== MESSAGES.ar[k]) entry.ar = edits[k].ar;
      if (entry.en !== undefined || entry.ar !== undefined) payload[k] = entry;
    }
    setStatus({ kind: "saving" });
    const res = await saveDictionaryAction(payload);
    setStatus(res.ok ? { kind: "saved" } : { kind: "error", message: res.error ?? "Failed to save." });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder="Search labels (key, English or Arabic)…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <label className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
          <input type="checkbox" checked={ccOnly} onChange={(e) => setCcOnly(e.target.checked)} className="h-3.5 w-3.5 rounded border-border" />
          Command center only
        </label>
        <Button type="button" onClick={save} disabled={status.kind === "saving"}>
          {status.kind === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
        {status.kind === "saved" && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" /> Saved · reload to see changes
          </span>
        )}
        {status.kind === "error" && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-danger">
            <XCircle className="h-4 w-4" /> {status.message}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {keys.length} labels · {changedCount} edited. Edit either language directly; use the reset arrow to
        restore a default. Only these static UI labels change — AI answers and data from AICP are never affected.
      </p>

      <div className="max-h-[65vh] overflow-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="p-2 font-medium">Label</th>
              <th className="p-2 font-medium">English</th>
              <th className="p-2 font-medium">العربية</th>
              <th className="w-8 p-2" />
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => {
              const changed = isChanged(k);
              return (
                <tr key={k} className={cn("border-b border-border/60 align-top", changed && "bg-primary/5")}>
                  <td className="p-2">
                    <code className="text-[11px] text-muted-foreground">{k}</code>
                  </td>
                  <td className="p-2">
                    <Input value={edits[k].en} onChange={(e) => set(k, "en", e.target.value)} className="h-8 text-xs" />
                  </td>
                  <td className="p-2">
                    <Input dir="rtl" value={edits[k].ar} onChange={(e) => set(k, "ar", e.target.value)} className="h-8 text-xs" />
                  </td>
                  <td className="p-2">
                    {changed && (
                      <button
                        type="button"
                        title="Reset to default"
                        onClick={() => reset(k)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
