import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Impressum (Legal notice)",
  description: "Impressum und Anbieterkennzeichnung von Footiqra.",
  path: "/impressum/",
});

const h2 = "font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground";

/** German legal notice (Impressum). The site is in English, the legal text in German. */
export default function ImpressumPage() {
  return (
    <article lang="de" className="max-w-3xl space-y-10 text-base leading-relaxed">
      <header>
        <Eyebrow>Legal notice</Eyebrow>
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
      </section>
    </article>
  );
}
