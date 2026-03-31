export default function Loading() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-8 w-8 rounded-full" />
      </div>

      {/* Search skeleton */}
      <div className="skeleton h-10 w-full rounded-xl" />

      {/* Pills skeleton */}
      <div className="flex gap-2">
        <div className="skeleton h-7 w-16 rounded-full" />
        <div className="skeleton h-7 w-20 rounded-full" />
        <div className="skeleton h-7 w-24 rounded-full" />
        <div className="skeleton h-7 w-18 rounded-full" />
      </div>

      {/* Card skeletons */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
