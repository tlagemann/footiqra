/**
 * Shown wherever data is not available. Makes the missing state explicit
 * instead of rendering placeholders that could be mistaken for real numbers.
 */
export function DataNotice({
  title = "Data not available yet",
  reason,
}: {
  title?: string;
  reason: string;
}) {
  return (
    <div role="status" className="rounded-3xl bg-surface px-6 py-8 text-sm text-muted sm:px-8">
      <p className="font-display text-lg font-bold text-foreground">{title}</p>
      <p className="mt-1">{reason}</p>
    </div>
  );
}
