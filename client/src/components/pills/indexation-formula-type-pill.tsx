import * as React from "react";
import { Pill, PillProps } from "@/components/ui/pill";
import { Sigma, FunctionSquare, Calculator, LucideIcon } from "lucide-react";

/** Adapt this to your real formula types */
export type FormulaTypeValue =
  | "SIMPLE_ICHT"
  | "CPI_PN1"
  | "CPI_HICP"
  | "COMPOSITE"
  | "CUSTOM"
  | "NONE"
  | string;

export const FORMULA_TYPE_LABELS: Record<string, string> = {
  SIMPLE_ICHT: "ICHT (simple)",
  CPI_PN1: "CPI (PN1)",
  CPI_HICP: "CPI HICP",
  COMPOSITE: "Formule composite",
  CUSTOM: "Formule personnalisée",
  NONE: "Aucune",
};

const FORMULA_STYLE: Record<
  string,
  { color: PillProps["color"]; icon?: React.ReactNode }
> = {
  SIMPLE_ICHT: { color: "blue", icon: <Sigma className="h-3.5 w-3.5" /> },
  CPI_PN1: { color: "cyan", icon: <Calculator className="h-3.5 w-3.5" /> },
  CPI_HICP: { color: "violet", icon: <Calculator className="h-3.5 w-3.5" /> },
  COMPOSITE: {
    color: "amber",
    icon: <FunctionSquare className="h-3.5 w-3.5" />,
  },
  CUSTOM: { color: "green", icon: <FunctionSquare className="h-3.5 w-3.5" /> },
  NONE: { color: "gray" },
};

export function FormulaTypePill({
  type,
  variant = "soft",
  size = "sm",
  rounded = "full",
  className,
  ...rest
}: {
  type: FormulaTypeValue | null | undefined;
} & Omit<PillProps, "color" | "children">) {
  if (!type) {
    return (
      <Pill
        size={size}
        variant={variant}
        rounded={rounded}
        className={className}
      >
        —
      </Pill>
    );
  }

  const t = String(type).toUpperCase();
  const style = FORMULA_STYLE[t] ?? { color: "gray" as const };
  const label = FORMULA_TYPE_LABELS[t] ?? String(type);

  return (
    <Pill
      size={size}
      variant={variant}
      rounded={rounded}
      color={style.color}
      icon={style.icon}
      className={className}
      {...rest}
    >
      {label}
    </Pill>
  );
}
