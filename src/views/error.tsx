"use client";

import { tr, type Locale } from "@/i18n";

export function ErrorView({ reset, locale }: { reset: () => void; locale: Locale }) {
  return (
    <div role="alert" className="py-10 sm:py-20">
      <h1 className="font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-6xl">
        {tr(locale, "Something went wrong", "Etwas ist schiefgelaufen")}
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted">
        {tr(
          locale,
          "The data could not be loaded. Please try again in a moment.",
          "Die Daten konnten nicht geladen werden. Bitte gleich noch einmal versuchen.",
        )}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-12 items-center rounded-2xl bg-foreground px-6 font-semibold text-inverse transition hover:opacity-85"
      >
        {tr(locale, "Try again", "Erneut versuchen")}
      </button>
    </div>
  );
}
