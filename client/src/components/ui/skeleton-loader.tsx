import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  animation?: "pulse" | "wave" | "shimmer";
  count?: number;
}

export function SkeletonLoader({
  className,
  variant = "text",
  animation = "pulse",
  count = 1
}: SkeletonLoaderProps) {
  const baseClasses = "bg-gray-200 rounded";
  
  const variantClasses = {
    text: "h-4 w-full",
    circular: "w-12 h-12 rounded-full",
    rectangular: "h-32 w-full",
    card: "h-48 w-full rounded-lg"
  };

  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-wave",
    shimmer: "animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]"
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
    />
  ));

  return <>{skeletons}</>;
}