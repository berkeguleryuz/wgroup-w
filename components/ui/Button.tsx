import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "dark" | "shine";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary",
  secondary: "bg-muted text-foreground hover:bg-muted/80 border border-border",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  dark: "bg-surface-dark text-surface-dark-foreground hover:bg-surface-dark/90 border border-surface-dark dark:bg-foreground dark:text-background dark:border-foreground dark:hover:bg-foreground/90",
  // Always-dark CTA, flat at rest; hovering runs a highlight sweep across the
  // gradient plus a soft lift, so the state change is obvious on both cream
  // and dark surfaces.
  shine:
    "bf-shine border border-white/10 bg-[linear-gradient(110deg,#100d08,45%,#3f352a,55%,#100d08)] bg-[length:400%_100%] text-surface-dark-foreground transition-[filter,border-color] hover:brightness-[1.25] hover:border-primary/40 dark:border-white/15",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "bf-hover-shine inline-flex items-center justify-center gap-2 rounded-11 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
