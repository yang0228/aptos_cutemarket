export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function MarketCardSkeleton() {
  return (
    <div className="bg-white/95 rounded-xl shadow-lg p-6">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-3 w-10 mb-1" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="text-right">
          <Skeleton className="h-3 w-10 mb-1" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
    </div>
  );
}

export function PositionCardSkeleton() {
  return (
    <div className="bg-white/95 rounded-xl p-6">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-5 gap-4 mt-3">
        {[...Array(5)].map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-10 mb-1" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
