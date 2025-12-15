import * as React from "react";
import { cn } from "@/lib/utils"; // or use your own cn()
import { Circle } from "lucide-react";

type PillVariant = "soft" | "solid" | "outline";
type PillSize = "sm" | "md" | "lg";

export type PillProps = React.HTMLAttributes<HTMLSpanElement> & {
  icon?: React.ReactNode;
  dot?: boolean;
  color?:
    | "gray"
    | "blue"
    | "green"
    | "amber"
    | "red"
    | "violet"
    | "cyan"
    | "rose";
  variant?: PillVariant;
  size?: PillSize;
  rounded?: "md" | "lg" | "full";
};

const sizeClasses: Record<PillSize, string> = {
  sm: "text-[11px] px-2 py-0.5",
  md: "text-[12px] px-2.5 py-1",
  lg: "text-[13px] px-3 py-1.5",
};

const roundedClasses = {
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

// base = pairs for text/bg/border in each variant
function colorClasses(
  variant: PillVariant,
  color: NonNullable<PillProps["color"]>
) {
  const map: Record<
    NonNullable<PillProps["color"]>,
    Record<PillVariant, string>
  > = {
    gray: {
      soft: "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-800",
      solid:
        "bg-gray-800 text-white border border-gray-800 dark:bg-gray-700 dark:border-gray-700",
      outline:
        "text-gray-700 border border-gray-300 dark:text-gray-300 dark:border-gray-700",
    },
    blue: {
      soft: "bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800",
      solid:
        "bg-[var(--klyxor-blue,#0059d6)] text-white border border-[var(--klyxor-blue,#0059d6)]",
      outline:
        "text-[var(--klyxor-blue,#0059d6)] border border-[var(--klyxor-blue,#0059d6)]",
    },
    green: {
      soft: "bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800",
      solid: "bg-green-600 text-white border border-green-600",
      outline: "text-green-700 border border-green-600 dark:text-green-300",
    },
    amber: {
      soft: "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800",
      solid: "bg-amber-600 text-white border border-amber-600",
      outline: "text-amber-700 border border-amber-600 dark:text-amber-300",
    },
    red: {
      soft: "bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800",
      solid: "bg-red-600 text-white border border-red-600",
      outline: "text-red-700 border border-red-600 dark:text-red-300",
    },
    violet: {
      soft: "bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800",
      solid: "bg-violet-600 text-white border border-violet-600",
      outline: "text-violet-700 border border-violet-600 dark:text-violet-300",
    },
    cyan: {
      soft: "bg-cyan-50 text-cyan-700 border border-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-800",
      solid: "bg-cyan-600 text-white border border-cyan-600",
      outline: "text-cyan-700 border border-cyan-600 dark:text-cyan-300",
    },
    rose: {
      soft: "bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800",
      solid: "bg-rose-600 text-white border border-rose-600",
      outline: "text-rose-700 border border-rose-600 dark:text-rose-300",
    },
  };
  return map[color][variant];
}

export const Pill = React.forwardRef<HTMLSpanElement, PillProps>(
  (
    {
      className,
      children,
      icon,
      dot,
      size = "md",
      variant = "soft",
      color = "gray",
      rounded = "full",
      ...rest
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 select-none whitespace-nowrap",
          sizeClasses[size],
          roundedClasses[rounded],
          colorClasses(variant, color),
          "font-medium leading-none",
          className
        )}
        {...rest}
      >
        {dot ? <Circle className="h-2.5 w-2.5 fill-current" /> : icon ?? null}
        {children}
      </span>
    );
  }
);
Pill.displayName = "Pill";
