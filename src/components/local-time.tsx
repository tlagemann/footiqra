"use client";

import { useEffect, useRef } from "react";

const OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * Kick-off time: rendered in UTC in the static HTML, switched to the
 * visitor's own time zone in the browser.
 */
export function LocalTime({ utc }: { utc: string }) {
  const ref = useRef<HTMLTimeElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = new Intl.DateTimeFormat("en-GB", OPTIONS).format(new Date(utc));
    }
  }, [utc]);
  return (
    <time ref={ref} dateTime={utc} suppressHydrationWarning>
      {new Intl.DateTimeFormat("en-GB", { ...OPTIONS, timeZone: "UTC" }).format(new Date(utc))} UTC
    </time>
  );
}
