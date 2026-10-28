import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Datenschutzerklärung (Privacy policy)",
  description:
    "Datenschutzerklärung von Footiqra: keine Cookies, kein Tracking, Hosting bei SiteGround.",
  path: "/datenschutz/",
});

const h2 = "font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground";
const h3 = "font-display text-lg font-bold text-foreground";
const a = "underline underline-offset-4";

/** German privacy policy. Written for what Footiqra actually does: a static site without cookies or tracking. */
export default function DatenschutzPage() {
  return (
    <article lang="de" className="max-w-3xl space-y-10 text-base leading-relaxed">
      <header>
        <Eyebrow>Privacy policy</Eyebrow>
        <h1 className="mt-4 font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-6xl">
          Datenschutz
        </h1>
        <p className="mt-5 text-lg text-muted">
          Kurz gesagt: Footiqra setzt keine Cookies, nutzt keine Analyse- oder Werbedienste und lädt
          keine Inhalte von fremden Servern. Beim Aufruf der Seiten fallen nur die technisch nötigen
          Server-Logdaten beim Hoster an.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className={h2}>1. Verantwortlicher</h2>
        <p>
          Online Creators Tim Lagemann
          <br />
          Julius-von-Niethammer-Straße 21
          <br />
          83052 Bruckmühl, Deutschland
          <br />
          Telefon: +49 151 51187375
          <br />
          E-Mail:{" "}
          <a href="mailto:tlagemann@online-creators.de" className={a}>
            tlagemann@online-creators.de
          </a>
        </p>
        <p>
          Verantwortlicher ist die natürliche oder juristische Person, die allein oder gemeinsam mit
          anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten
          entscheidet. Ein Datenschutzbeauftragter ist nicht bestellt, weil die gesetzlichen
          Voraussetzungen dafür nicht vorliegen.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>2. Hosting und Server-Logfiles</h2>
        <p>
          Diese Website wird bei SiteGround gehostet. Anbieter und Auftragsverarbeiter ist die
          SiteGround Spain S.L., Calle de Prim 19, 28004 Madrid, Spanien. Mit SiteGround besteht ein
          Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO.
        </p>
        <p>
          Bei jedem Aufruf einer Seite übermittelt Ihr Browser automatisch Informationen an den
          Server, die dort in Logfiles gespeichert werden:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>IP-Adresse des anfragenden Geräts</li>
          <li>Datum und Uhrzeit des Zugriffs</li>
          <li>aufgerufene Seite oder Datei, übertragene Datenmenge und Statuscode</li>
          <li>Referrer (zuvor besuchte Seite), sofern der Browser ihn übermittelt</li>
          <li>Browsertyp, Browserversion und Betriebssystem</li>
        </ul>
        <p>
          Die Verarbeitung ist nötig, um die Website auszuliefern sowie ihre Sicherheit und
          Stabilität zu gewährleisten, etwa um Angriffe zu erkennen und abzuwehren. Rechtsgrundlage
          ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt im sicheren und
          fehlerfreien Betrieb der Website. Wir werten die Logfiles nicht zu Analyse- oder
          Werbezwecken aus und führen sie nicht mit anderen Daten zusammen. Sie werden nur so lange
          gespeichert, wie es für diese Zwecke erforderlich ist, und danach vom Hoster gelöscht.
        </p>
        <p>
          SiteGround betreibt Rechenzentren innerhalb und außerhalb der EU. Soweit Daten in Länder
          außerhalb der EU oder des EWR übermittelt werden, geschieht dies auf Grundlage der
          EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO), die Bestandteil des Vertrags
          zur Auftragsverarbeitung mit SiteGround sind.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>3. Keine Cookies, kein Tracking, keine externen Inhalte</h2>
        <p>
          Footiqra setzt keine Cookies und speichert keine Daten in Ihrem Browser. Es werden keine
          Analyse-, Tracking- oder Werbedienste eingesetzt. Schriftarten und Vereinswappen liegen
          auf unserem eigenen Server; beim Aufruf der Seiten werden keine Inhalte von Servern
          Dritter geladen. Ein Cookie-Banner ist deshalb nicht erforderlich.
        </p>
        <p>
          Die Fußballdaten (Ergebnisse, Spielpläne, Tabellen) beziehen wir über eine Schnittstelle
          von football-data.org. Dieser Abruf erfolgt automatisiert auf unseren Systemen und nicht
          über Ihren Browser; dabei werden keine Daten über Besucher dieser Website übermittelt.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>4. Kontakt per E-Mail oder Telefon</h2>
        <p>
          Wenn Sie uns per E-Mail oder Telefon kontaktieren, verarbeiten wir Ihre Angaben (etwa
          Name, E-Mail-Adresse oder Telefonnummer und den Inhalt Ihrer Nachricht), um Ihre Anfrage
          zu bearbeiten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage mit
          einem Vertrag zusammenhängt oder zur Durchführung vorvertraglicher Maßnahmen erforderlich
          ist, und im Übrigen Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in der
          Beantwortung Ihrer Anfrage. Die Daten werden gelöscht, sobald Ihre Anfrage abschließend
          bearbeitet ist und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>5. Externe Links</h2>
        <p>
          Unsere Seiten enthalten Links zu anderen Websites, etwa zu football-data.org oder UEFA.
          Erst wenn Sie einen solchen Link anklicken, werden Daten an den jeweiligen Anbieter
          übertragen. Für dessen Datenverarbeitung gilt die Datenschutzerklärung dieses Anbieters.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>6. SSL- bzw. TLS-Verschlüsselung</h2>
        <p>
          Diese Seite nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine
          verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers mit
          „https://“ beginnt.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>7. Ihre Rechte</h2>
        <p>Sie haben im Rahmen der gesetzlichen Bestimmungen jederzeit das Recht auf</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Auskunft über Ihre gespeicherten personenbezogenen Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        </ul>
        <h3 className={h3}>Widerspruchsrecht nach Art. 21 DSGVO</h3>
        <p>
          Wenn die Datenverarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO erfolgt, haben Sie
          jederzeit das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, gegen
          die Verarbeitung Ihrer personenbezogenen Daten Widerspruch einzulegen. Wir verarbeiten die
          Daten dann nicht mehr, es sei denn, wir können zwingende schutzwürdige Gründe für die
          Verarbeitung nachweisen, die Ihre Interessen, Rechte und Freiheiten überwiegen, oder die
          Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.
        </p>
        <p>
          Für alle Anliegen zum Datenschutz genügt eine formlose Nachricht an die oben genannte
          E-Mail-Adresse.
        </p>
        <h3 className={h3}>Beschwerderecht bei einer Aufsichtsbehörde</h3>
        <p>
          Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren,
          insbesondere in dem Mitgliedstaat Ihres Aufenthaltsorts, Ihres Arbeitsplatzes oder des
          Orts des mutmaßlichen Verstoßes. Für uns zuständig ist das Bayerische Landesamt für
          Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>8. Änderungen</h2>
        <p>
          Wir passen diese Datenschutzerklärung an, wenn sich die Website oder die Rechtslage
          ändert. Es gilt die jeweils hier veröffentlichte Fassung.
        </p>
        <p className="text-muted">Stand: Oktober 2026</p>
        <p>
          Siehe auch:{" "}
          <Link href="/impressum/" className={a}>
            Impressum
          </Link>
        </p>
      </section>
    </article>
  );
}
