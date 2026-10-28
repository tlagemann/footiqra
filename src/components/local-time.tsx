"use client";

import { useEffect, useRef } from "react";
import { INTL_LOCALE, type Locale } from "@/i18n";

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
export function LocalTime({ utc, locale = "en" }: { utc: string; locale?: Locale }) {
  const ref = useRef<HTMLTimeElement>(null);
  const tag = INTL_LOCALE[locale];
  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = new Intl.DateTimeFormat(tag, OPTIONS).format(new Date(utc));
    }
  }, [utc, tag]);
  return (
    <time ref={ref} dateTime={utc} suppressHydrationWarning>
      {new Intl.DateTimeFormat(tag, { ...OPTIONS, timeZone: "UTC" }).format(new Date(utc))} UTC
    </time>
  );
}
