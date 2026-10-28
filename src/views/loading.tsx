export function LoadingView({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <div className="h-14 w-80 max-w-full animate-pulse rounded-2xl bg-surface" />
      <div className="h-5 w-96 max-w-full animate-pulse rounded-xl bg-surface" />
      <div className="h-72 animate-pulse rounded-3xl bg-surface" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
