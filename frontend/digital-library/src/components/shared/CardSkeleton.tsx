// src/components/shared/CardSkeleton.tsx

interface CardSkeletonProps {
  variant: "folder" | "document";
}

export function CardSkeleton({ variant }: CardSkeletonProps) {
  if (variant === "folder") {
    return (
      <div className="flex min-h-[64px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="h-10 w-10 rounded-lg bg-gray-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-3 w-16 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-[1/0.82] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-[60%] bg-gray-200 animate-pulse" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}