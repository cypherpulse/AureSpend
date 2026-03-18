export default function SkeletonCard() {
  return (
    <div className="glass-card p-6 rounded-2xl animate-pulse">
      <div className="h-4 bg-secondary rounded w-1/3 mb-4" />
      <div className="h-8 bg-secondary rounded w-2/3 mb-6" />
      <div className="space-y-3">
        <div className="h-3 bg-secondary rounded w-full" />
        <div className="h-3 bg-secondary rounded w-4/5" />
      </div>
    </div>
  );
}
