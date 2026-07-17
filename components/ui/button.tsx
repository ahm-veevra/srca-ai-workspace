import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // Signature AI action — glows on hover
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-glow",
        destructive: "bg-danger text-danger-foreground hover:bg-danger/90",
        outline:
          "border border-border-strong bg-transparent hover:bg-surface-3 hover:text-foreground",
        ghost: "hover:bg-surface-3 hover:text-foreground",
        secondary: "bg-surface-3 text-foreground hover:bg-surface-3/70",
      },
      size: {
        default: "h-9 px-4 py-2 text-sm",
        xs: "h-7 rounded-md px-2.5 text-xs",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
