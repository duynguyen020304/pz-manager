'use client';

export function UserTableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div>
            <div className="h-4 w-24 bg-muted rounded mb-1" />
            <div className="h-3 w-32 bg-muted rounded" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-20 bg-muted rounded-full" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-16 bg-muted rounded-full" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-20 bg-muted rounded" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-8 w-8 bg-muted rounded-lg ml-auto" />
      </td>
    </tr>
  );
}

export function UserTableSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <UserTableRowSkeleton key={i} />
      ))}
    </>
  );
}
