"use client";

import { X } from "lucide-react";
import * as React from "react";

import { Lookup, fetchLookup, type LookupItem } from "@/components/ui/lookup";

/** Multi-select bound to a reference category. Stores an array of codes; shows chips with
 * friendly labels. Used for "is one of [...]" conditions and ordered model lists. */
export function MultiLookup({
  category,
  value,
  onChange,
  placeholder = "Add…",
}: {
  category: string;
  value: string[];
  onChange: (codes: string[]) => void;
  placeholder?: string;
}) {
  const [items, setItems] = React.useState<LookupItem[]>([]);
  React.useEffect(() => {
    fetchLookup(category).then(setItems);
  }, [category]);

  const labelOf = (code: string) => items.find((i) => i.code === code)?.label ?? code;

  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((code) => (
            <span key={code} className="flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs">
              {labelOf(code)}
              <button type="button" onClick={() => onChange(value.filter((c) => c !== code))}>
                <X className="h-3 w-3 text-muted-foreground hover:text-danger" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Lookup
        category={category}
        value={null}
        placeholder={placeholder}
        onChange={(code) => {
          if (code && !value.includes(code)) onChange([...value, code]);
        }}
      />
    </div>
  );
}
