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
    <div
      role="status"
      className="rounded-lg border border-dashed border-line bg-surface px-5 py-6 text-sm text-muted"
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1">{reason}</p>
    </div>
  );
}
