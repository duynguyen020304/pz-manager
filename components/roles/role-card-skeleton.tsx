'use client';

export function RoleCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg" />
          <div>
            <div className="h-5 w-24 bg-muted rounded mb-1" />
            <div className="h-4 w-40 bg-muted rounded" />
          </div>
        </div>
      </div>

      {/* Permissions skeleton */}
      <div className="space-y-2 mb-4">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="flex flex-wrap gap-2">
          <div className="h-6 w-28 bg-muted rounded" />
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-6 w-24 bg-muted rounded" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-16 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function RoleCardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <RoleCardSkeleton key={i} />
      ))}
    </div>
  );
}
