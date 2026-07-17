import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-accent/15 text-accent",
        secondary: "border-border bg-surface-3 text-muted-foreground",
        outline: "border-border-strong text-foreground",
        success: "border-transparent bg-success/15 text-success",
        warning: "border-transparent bg-warning/15 text-warning",
        info: "border-transparent bg-info/15 text-info",
        destructive: "border-transparent bg-danger/15 text-danger",
        // AI visual language
        ai: "border-accent/40 bg-accent/10 text-accent",
        model: "border-border-strong bg-surface-3 font-mono text-foreground",
        routed: "border-info/40 bg-info/10 text-info",
        governed: "border-success/40 bg-success/10 text-success",
        blocked: "border-danger/40 bg-danger/10 text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
