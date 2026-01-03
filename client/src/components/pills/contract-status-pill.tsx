import * as React from "react";
import { Pill, PillProps } from "@/components/ui/pill";
import { CheckCircle2, Clock, Archive, Ban, PlayCircle } from "lucide-react";
import { ContractStatusLabels } from "@shared/enums/contracts-status.enum";

export type ContractStatusValue =
  | "draft"
  | "pending_validation"
  | "active"
  | "terminated"
  | "closed"
  | "archived";

const STATUS_STYLE: Record<
  ContractStatusValue,
  { color: PillProps["color"]; icon?: React.ReactNode }
> = {
  draft: { color: "gray", icon: <Clock className="h-3.5 w-3.5" /> },
  pending_validation: {
    color: "amber",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  active: { color: "green", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  terminated: { color: "red", icon: <Ban className="h-3.5 w-3.5" /> },
  closed: { color: "violet", icon: <Archive className="h-3.5 w-3.5" /> },
  archived: { color: "rose", icon: <Archive className="h-3.5 w-3.5" /> },
};

export function StatusPill({
  status,
  variant = "soft",
  size = "sm",
  rounded = "full",
  className,
  ...rest
}: {
  status: ContractStatusValue | string | null | undefined;
} & Omit<PillProps, "color" | "children">) {
  if (!status) {
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

  const key = status as ContractStatusValue;
  const style = STATUS_STYLE[key] ?? { color: "gray" as const };
  const label =
    ContractStatusLabels[key as keyof typeof ContractStatusLabels] ??
    String(status);

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
