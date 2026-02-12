'use client';

interface ServerCardSkeletonProps {
  count?: number;
}

export function ServerCardSkeleton({ count = 3 }: ServerCardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-lg p-4 space-y-3 animate-pulse"
          aria-hidden="true"
        >
          {/* Header Section */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted rounded" />
                <div className="flex gap-1">
                  <div className="h-5 w-12 bg-muted rounded" />
                  <div className="h-5 w-16 bg-muted rounded" />
                </div>
              </div>
            </div>
            <div className="h-8 w-20 bg-muted rounded-full flex-shrink-0" />
          </div>

          {/* Stats Section */}
          <div className="h-6 w-full bg-muted/50 rounded" />

          {/* Mods Section */}
          <div className="h-4 w-24 bg-muted/50 rounded" />

          {/* Actions Section */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="h-8 w-full bg-muted rounded-lg" />
            <div className="flex gap-2">
              <div className="h-8 flex-1 bg-muted rounded-lg" />
              <div className="h-8 flex-1 bg-muted rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
