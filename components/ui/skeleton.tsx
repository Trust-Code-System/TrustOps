import * as React from "react";
import { cn } from "@/lib/utils";

/** Loading skeleton block — design system §7. Prefer over spinner-on-blank. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-gray-100", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/** A few stacked text-line skeletons. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}
