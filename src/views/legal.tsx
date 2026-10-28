import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui";
import { paths, type Locale } from "@/i18n";
import { pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

export function legalMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: locale === "de" ? "Impressum" : "Legal notice (Impressum)",
    description:
      locale === "de"
        ? "Impressum und Anbieterkennzeichnung von Footiqra."
        : "Legal notice and provider identification of Footiqra.",
    paths: { en: paths("en").legal, de: paths("de").legal },
    image: ogImage.legal,
  });
}

export function LegalView({ locale }: { locale: Locale }) {
  return locale === "de" ? <ImpressumDe /> : <LegalNoticeEn />;
}

const h2 = "font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground";

/** German legal notice (Impressum), the legally binding version. */
function ImpressumDe() {
  return (
    <article className="max-w-3xl space-y-10 text-base leading-relaxed">
      <header>
        <Eyebrow>Rechtliches</Eyebrow>
        <h1 className="mt-4 font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-6xl">
          Impressum
        </h1>
      </header>

      <section className="space-y-2">
        <h2 className={h2}>Angaben gemäß § 5 DDG</h2>
        <p>
          Online Creators Tim Lagemann
          <br />
          Julius-von-Niethammer-Straße 21
          <br />
          83052 Bruckmühl
          <br />
          Deutschland
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Kontakt</h2>
        <p>
          Tim Lagemann
          <br />
          Telefon:{" "}
          <a href="tel:+4915151187375" className="underline underline-offset-4">
            +49 151 51187375
          </a>
          <br />
          E-Mail:{" "}
          <a href="mailto:tlagemann@online-creators.de" className="underline underline-offset-4">
            tlagemann@online-creators.de
          </a>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Umsatzsteuer-ID</h2>
        <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: DE332916944</p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>
          Tim Lagemann
          <br />
          Julius-von-Niethammer-Straße 21
          <br />
          83052 Bruckmühl
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Daten, Ranking und Prognosen</h2>
        <p>
          Spielergebnisse, Spielpläne und Tabellen stammen von football-data.org. Ranking,
          Ligastärke, Prognosen und simulierte Abschlusstabellen werden von Footiqra automatisch aus
          diesen Daten berechnet; die Methodik ist auf der Seite „Methodology“ beschrieben. Alle
          Angaben erfolgen ohne Gewähr. Prognosen und Wahrscheinlichkeiten sind Modellschätzungen
          und keine Wett- oder Anlageberatung.
        </p>
        <p>
          Footiqra ist ein unabhängiges Angebot und steht in keiner Verbindung zu Ligen, Verbänden
          oder Vereinen. Vereinsnamen und Vereinswappen sind Eigentum der jeweiligen Rechteinhaber
          und werden nur zur Kennzeichnung der Vereine verwendet.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen
          Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder
          gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf
          eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der
          Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine
          diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
          Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden
          wir diese Inhalte umgehend entfernen.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Haftung für Links</h2>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
          Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
          Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf
          mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der
          Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten
          ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
          Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Urheberrecht</h2>
        <p>
          Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
          dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
          der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen
          Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind
          nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf
          dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter
          beachtet und Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine
          Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei
          Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
        </p>
        <p>
          Informationen zum Datenschutz finden Sie in der{" "}
          <Link href={paths("de").privacy} className="underline underline-offset-4">
            Datenschutzerklärung
          </Link>
          .
        </p>
      </section>
    </article>
  );
}

/** English translation of the legal notice. */
function LegalNoticeEn() {
  return (
    <article className="max-w-3xl space-y-10 text-base leading-relaxed">
      <header>
        <Eyebrow>Impressum</Eyebrow>
        <h1 className="mt-4 font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-6xl">
          Legal notice
        </h1>
        <p className="mt-4 text-muted">
          Translation for information. The legally binding version is the German{" "}
          <Link href={paths("de").legal} className="underline underline-offset-4" hrefLang="de">
            Impressum
          </Link>
          .
        </p>
      </header>

      <section className="space-y-2">
        <h2 className={h2}>Information according to § 5 DDG (German Digital Services Act)</h2>
        <p>
          Online Creators Tim Lagemann
          <br />
          Julius-von-Niethammer-Straße 21
          <br />
          83052 Bruckmühl
          <br />
          Germany
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Contact</h2>
        <p>
          Tim Lagemann
          <br />
          Phone:{" "}
          <a href="tel:+4915151187375" className="underline underline-offset-4">
            +49 151 51187375
          </a>
          <br />
          Email:{" "}
          <a href="mailto:tlagemann@online-creators.de" className="underline underline-offset-4">
            tlagemann@online-creators.de
          </a>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>VAT ID</h2>
        <p>VAT identification number according to § 27a of the German VAT Act: DE332916944</p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Responsible for content according to § 18 (2) MStV</h2>
        <p>
          Tim Lagemann
          <br />
          Julius-von-Niethammer-Straße 21
          <br />
          83052 Bruckmühl
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Consumer dispute resolution</h2>
        <p>
          We are neither willing nor obliged to take part in dispute resolution proceedings before a
          consumer arbitration board.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Data, ranking and forecasts</h2>
        <p>
          Results, fixtures and tables come from football-data.org. Ranking, league strength,
          forecasts and simulated final tables are calculated automatically by Footiqra from this
          data; the method is described on the methodology page. All information is provided without
          guarantee. Forecasts and probabilities are model estimates and not betting or investment
          advice.
        </p>
        <p>
          Footiqra is independent and not affiliated with any league, association or club. Club
          names and crests belong to their respective owners and are only used to identify the
          clubs.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Liability for content</h2>
        <p>
          As a service provider we are responsible for our own content on these pages under the
          general laws. We are not obliged to monitor transmitted or stored third-party information
          or to investigate circumstances that indicate illegal activity. Obligations to remove or
          block the use of information under the general laws remain unaffected. Liability in this
          respect is only possible from the time we become aware of a specific infringement. As soon
          as we become aware of such infringements, we will remove the content immediately.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Liability for links</h2>
        <p>
          Our pages contain links to external websites of third parties, on whose content we have no
          influence. We therefore cannot accept any liability for this third-party content. The
          respective provider or operator of the linked pages is always responsible for their
          content. The linked pages were checked for possible legal violations at the time of
          linking; illegal content was not recognisable at that time. Permanent monitoring of the
          linked pages is not reasonable without concrete evidence of an infringement. As soon as we
          become aware of infringements, we will remove such links immediately.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className={h2}>Copyright</h2>
        <p>
          The content and works created by the site operator on these pages are subject to German
          copyright law. Reproduction, editing, distribution and any kind of use beyond the limits
          of copyright law require the written consent of the respective author or creator.
          Downloads and copies of this site are only permitted for private, non-commercial use.
          Where content on this site was not created by the operator, the copyrights of third
          parties are respected and such content is marked as such. If you nevertheless become aware
          of a copyright infringement, please let us know. As soon as we become aware of
          infringements, we will remove such content immediately.
        </p>
        <p>
          Information on data protection can be found in the{" "}
          <Link href={paths("en").privacy} className="underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
