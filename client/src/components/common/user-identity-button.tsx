// components/common/UserIdentityButton.tsx
import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const roleBgClass = (role?: string | null) => {
  switch (role) {
    case "admin":
      return "bg-[#C9A646]";
    case "manager":
      return "bg-blue-600";
    case "validator":
      return "bg-green-600";
    default:
      return "bg-gray-600";
  }
};

const roleFrLabel = (role?: string | null) => {
  switch (role) {
    case "admin":
      return "Administrateur";
    case "manager":
      return "Gestionnaire";
    case "validator":
      return "Validateur";
    default:
      return "Utilisateur";
  }
};

type Props = Omit<ButtonProps, "children"> & {
  showEmail?: boolean;
  showRole?: boolean;
};

export const UserIdentityButton = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      variant = "ghost",
      size = "sm",
      className,
      showEmail = false,
      showRole = true,
      ...btnProps
    },
    ref
  ) => {
    const { user } = useAuth();

    const initial = (
      user?.firstName?.[0] ||
      user?.username?.[0] ||
      "U"
    ).toUpperCase();

    const fullName =
      user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.username || "Utilisateur";

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "flex items-center gap-2 hover:bg-transparent focus-visible:ring-0",
          className
        )}
        {...btnProps}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${roleBgClass(
              user?.role
            )}`}
          >
            {initial}
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium">{fullName}</span>
            {showRole && (
              <span className="text-xs text-gray-500">
                {roleFrLabel(user?.role)}
              </span>
            )}
            {showEmail && (
              <span className="text-xs text-gray-400">
                {user?.email || `${user?.username}@engie.com`}
              </span>
            )}
          </div>
        </div>
      </Button>
    );
  }
);

UserIdentityButton.displayName = "UserIdentityButton";
