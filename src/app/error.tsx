"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="py-10 sm:py-20">
      <h1 className="font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-6xl">
        Something went wrong
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted">
        The data could not be loaded. Please try again in a moment.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-12 items-center rounded-2xl bg-foreground px-6 font-semibold text-inverse transition hover:opacity-85"
      >
        Try again
      </button>
    </div>
  );
}
