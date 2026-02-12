'use client';

export interface LoadingSkeletonProps {
  count?: number;
  height?: string;
  className?: string;
}

export function LoadingSkeleton({
  count = 3,
  height = 'h-16',
  className = ''
}: LoadingSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-muted rounded-lg animate-pulse`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
