import { ButtonLink, Eyebrow } from "@/components/ui";
import { paths, tr, type Locale } from "@/i18n";

/** 404 content. `bilingual` shows both languages (used for the server-wide error page). */
export function NotFoundView({
  locale = "en",
  bilingual = false,
}: {
  locale?: Locale;
  bilingual?: boolean;
}) {
  return (
    <div className="py-10 sm:py-20">
      <Eyebrow>{tr(locale, "Error 404", "Fehler 404")}</Eyebrow>
      <h1 className="mt-4 font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-7xl">
        {tr(locale, "Offside.", "Abseits.")}
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted">
        {tr(
          locale,
          "The page you are looking for does not exist or has moved.",
          "Die gesuchte Seite gibt es nicht oder sie ist umgezogen.",
        )}
      </p>
      {bilingual && (
        <p lang="de" className="mt-2 max-w-xl text-lg text-muted">
          Die gesuchte Seite gibt es nicht oder sie ist umgezogen.
        </p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={paths(locale).home}>
          {tr(locale, "Back to the power ranking", "Zurück zum Power-Ranking")}
        </ButtonLink>
        {bilingual && (
          <ButtonLink href={paths("de").home} variant="secondary">
            Zur deutschen Startseite
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
