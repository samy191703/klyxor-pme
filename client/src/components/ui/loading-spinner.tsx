import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fullScreen?: boolean;
  message?: string;
}

export function LoadingSpinner({ 
  size = "md", 
  className,
  fullScreen = false,
  message
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
    xl: "w-16 h-16 border-4"
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div
          className={cn(
            "animate-spin rounded-full border-[var(--klyxor-or)]/20",
            "border-t-[var(--klyxor-or)] border-r-[var(--klyxor-or)]",
            sizeClasses[size],
            className
          )}
        />
        <div
          className={cn(
            "absolute inset-0 animate-ping rounded-full opacity-75",
            "bg-[var(--klyxor-or)]/10",
            sizeClasses[size]
          )}
        />
      </div>
      {message && (
        <p className="text-sm text-gray-600 animate-pulse">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}