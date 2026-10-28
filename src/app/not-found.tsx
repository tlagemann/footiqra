import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted">The page you are looking for does not exist or has moved.</p>
      <Link href="/" className="text-accent underline underline-offset-4">
        Back to the power ranking
      </Link>
    </div>
  );
}
