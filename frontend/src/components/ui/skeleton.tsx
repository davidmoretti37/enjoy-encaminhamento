import { cn } from "@/lib/utils";

type SkeletonVariant = "pulse" | "shimmer";

interface SkeletonProps extends React.ComponentProps<"div"> {
  variant?: SkeletonVariant;
}

function Skeleton({ className, variant = "shimmer", ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md",
        variant === "pulse" && "bg-accent animate-pulse",
        variant === "shimmer" && "skeleton-shimmer",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
export type { SkeletonVariant };
