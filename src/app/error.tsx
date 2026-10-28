"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="space-y-4">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted">The data could not be loaded. Please try again in a moment.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-line px-4 py-2 text-sm hover:border-accent"
      >
        Try again
      </button>
    </div>
  );
}
