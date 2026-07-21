interface LoadingSkeletonProps {
  className?: string;
  count?: number;
}

export function LoadingSkeleton({ className = '', count = 1 }: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton ${className}`} />
      ))}
    </>
  );
}

export function WardrobeItemSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="skeleton aspect-square w-full" />
      <div className="p-3 flex flex-col gap-2">
        <div className="skeleton h-4 w-3/4 rounded-lg" />
        <div className="skeleton h-3 w-1/2 rounded-lg" />
      </div>
    </div>
  );
}

export function OutfitCardSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="skeleton aspect-[4/5] w-full" />
      <div className="p-4 flex flex-col gap-2">
        <div className="skeleton h-5 w-2/3 rounded-lg" />
        <div className="skeleton h-3 w-full rounded-lg" />
        <div className="skeleton h-3 w-4/5 rounded-lg" />
      </div>
    </div>
  );
}
