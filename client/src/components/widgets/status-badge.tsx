import { Badge } from "@/components/ui/badge";
import { type VariantProps } from "class-variance-authority";

interface StatusBadgeProps {
  variant: "primary" | "secondary" | "success" | "warning" | "destructive" | "outline" | "info" | "error";
  text: string;
  className?: string;
}

const getVariantMapping = (variant: StatusBadgeProps["variant"]) => {
  switch (variant) {
    case "primary":
      return "default";
    case "info":
      return "secondary";
    case "error":
      return "destructive";
    case "warning":
      return "outline";
    default:
      return variant;
  }
};

export default function StatusBadge({ variant, text, className }: StatusBadgeProps) {
  const badgeVariant = getVariantMapping(variant);
  
  const getCustomStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "info":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "success":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "warning":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "error":
      case "destructive":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "";
    }
  };

  return (
    <Badge
      variant={badgeVariant as VariantProps<typeof Badge>["variant"]}
      className={`text-xs font-medium ${getCustomStyles()} ${className}`}
      data-testid={`status-badge-${variant}`}
    >
      {text}
    </Badge>
  );
}
