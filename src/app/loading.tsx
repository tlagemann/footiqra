export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <div className="h-8 w-64 animate-pulse rounded bg-surface" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded bg-surface" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
