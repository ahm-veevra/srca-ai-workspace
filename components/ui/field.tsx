import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "./label";

/** A titled group of related settings with an optional description. */
export function FieldGroup({
  title,
  description,
  className,
  children,
}: {
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || description) && (
        <div>
          {title && <p className="eyebrow">{title}</p>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Label + control + optional contextual help + inline error. */
export function Field({
  label,
  htmlFor,
  help,
  error,
  required,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  help?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ms-0.5 text-danger">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : help ? (
        <p className="text-xs text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-20 w-full rounded-md border border-border bg-[hsl(var(--input))] p-2.5 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/** Inline toggle row: label + description on the left, switch on the right. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </span>
      <span className="relative inline-flex">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-5 w-9 rounded-full bg-surface-3 transition-colors peer-checked:bg-accent" />
        <span className="absolute start-0.5 top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform peer-checked:translate-x-4 peer-checked:bg-accent-foreground" />
      </span>
    </label>
  );
}
