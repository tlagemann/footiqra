"use client";

import { ErrorView } from "@/views/error";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorView reset={reset} locale="de" />;
}
