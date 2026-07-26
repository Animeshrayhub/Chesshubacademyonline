interface LoadingStateProps {
  rows?: number;
  className?: string;
}

function SkeletonLine({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return <div className={`${width} ${height} bg-border/60 rounded-lg animate-pulse`} />;
}

export default function LoadingState({ rows = 5, className = '' }: LoadingStateProps) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-border">
          <div className="w-10 h-10 rounded-xl bg-border/60 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="w-1/3" height="h-3.5" />
            <SkeletonLine width="w-2/3" height="h-3" />
          </div>
          <SkeletonLine width="w-20" height="h-3" />
        </div>
      ))}
    </div>
  );
}
