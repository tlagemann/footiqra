import Link from "next/link";
import { paths, tr, type Locale } from "@/i18n";
import { Logo } from "./logo";
import { MainNav } from "./main-nav";

export function SiteHeader({ locale }: { locale: Locale }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[4.5rem]">
        <Link
          href={paths(locale).home}
          aria-label={tr(locale, "Footiqra home", "Footiqra Startseite")}
          className="text-foreground"
        >
          <Logo />
        </Link>
        <MainNav locale={locale} />
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const p = paths(locale);
  const t = (en: string, de: string) => tr(locale, en, de);
  const links: [string, string][] = [
    [p.leagues, t("Leagues", "Ligen")],
    [p.championsLeague, "Champions League"],
    [p.predictions, t("Predictions", "Prognosen")],
    [p.tableVsStrength, t("Table vs. strength", "Tabelle vs. Stärke")],
    [p.methodology, t("Methodology", "Methodik")],
    [p.legal, t("Legal notice", "Impressum")],
    [p.privacy, t("Privacy", "Datenschutz")],
  ];
  return (
    <footer className="mt-24 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1fr_auto] sm:px-6">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-md text-sm text-muted">
            {t(
              "Independent, data-driven power rankings for Europe's top football leagues. Not affiliated with any league or club. Club names and crests belong to their owners.",
              "Unabhängiges, datenbasiertes Power-Ranking der Top-Fußballligen Europas. Keine Verbindung zu Ligen oder Vereinen. Vereinsnamen und Wappen gehören den jeweiligen Rechteinhabern.",
            )}
          </p>
          <p className="text-sm text-muted">{t("Data", "Daten")}: football-data.org</p>
        </div>
        <ul className="space-y-2 text-sm">
          {links.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="text-muted hover:text-foreground">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
