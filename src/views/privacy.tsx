import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui";
import { paths, type Locale } from "@/i18n";
import { pageMetadata } from "@/lib/seo";
import { ogImage } from "@/og/images";

export function privacyMetadata(locale: Locale): Metadata {
  return pageMetadata({
    locale,
    title: locale === "de" ? "Datenschutzerklärung" : "Privacy policy",
    description:
      locale === "de"
        ? "Datenschutzerklärung von Footiqra: Hosting bei SiteGround, Google Analytics nur mit Einwilligung."
        : "Footiqra privacy policy: hosting at SiteGround, Google Analytics only with consent.",
    paths: { en: paths("en").privacy, de: paths("de").privacy },
    image: ogImage.privacy,
  });
}

export function PrivacyView({ locale }: { locale: Locale }) {
  return locale === "de" ? <DatenschutzDe /> : <PrivacyEn />;
}

const h2 = "font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground";
const h3 = "font-display text-lg font-bold text-foreground";
const a = "underline underline-offset-4";

/** German privacy policy. Written for what Footiqra actually does: a static site; Google Analytics only after consent. */
function DatenschutzDe() {
  return (
    <article className="max-w-3xl space-y-10 text-base leading-relaxed">
      <header>
        <Eyebrow>Rechtliches</Eyebrow>
        <h1 className="mt-4 font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-6xl">
          Datenschutz
        </h1>
        <p className="mt-5 text-lg text-muted">
          Kurz gesagt: Beim Aufruf der Seiten fallen die technisch nötigen Server-Logdaten beim
          Hoster an. Google Analytics nutzen wir nur, wenn Sie im Banner ausdrücklich zustimmen.
          Werbedienste setzen wir nicht ein.
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
        <h2 className={h2}>3. Einwilligung, Cookies und eigene Inhalte</h2>
        <p>
          Schriftarten und Vereinswappen liegen auf unserem eigenen Server. Ohne Ihre Einwilligung
          werden beim Aufruf der Seiten keine Inhalte von Servern Dritter geladen und keine Cookies
          gesetzt.
        </p>
        <p>
          Ihre Entscheidung im Einwilligungsbanner („Akzeptieren“ oder „Ablehnen“) speichern wir im
          lokalen Speicher Ihres Browsers (localStorage, Eintrag „footiqra-consent-v1“), damit das
          Banner nicht bei jedem Seitenaufruf erneut erscheint. Dieser Eintrag enthält nur Ihre
          Entscheidung und wird nicht an uns übertragen. Das Speichern ist für die Verwaltung Ihrer
          Einwilligung unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG); Rechtsgrundlage ist Art. 6
          Abs. 1 lit. c DSGVO in Verbindung mit Art. 7 Abs. 1 DSGVO. Sie können den Eintrag
          jederzeit über die Einstellungen Ihres Browsers löschen.
        </p>
        <p>
          Die Fußballdaten (Ergebnisse, Spielpläne, Tabellen) beziehen wir über eine Schnittstelle
          von football-data.org. Dieser Abruf erfolgt automatisiert auf unseren Systemen und nicht
          über Ihren Browser; dabei werden keine Daten über Besucher dieser Website übermittelt.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>4. Google Analytics</h2>
        <p>
          Wenn Sie im Banner einwilligen, nutzen wir Google Analytics 4, einen Webanalysedienst der
          Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland („Google“). Google
          Analytics hilft uns zu verstehen, wie die Website genutzt wird, etwa welche Seiten
          aufgerufen werden, wie lange Besuche dauern und über welche Wege Besucher zu uns kommen.
          Damit verbessern wir Inhalte und Bedienung.
        </p>
        <p>
          Dazu lädt Ihr Browser ein Skript von Google und setzt Cookies („_ga“ und
          „_ga_5ZXN3X6QF1“), die Ihr Gerät mit einer zufälligen Kennung wiedererkennen. Wir haben
          die Laufzeit dieser Cookies auf 13 Monate begrenzt. Verarbeitet werden insbesondere
          aufgerufene Seiten, Datum und Uhrzeit, Verweildauer, die zuvor besuchte Seite, ungefährer
          Standort (Land, Region, Stadt, aus der IP-Adresse abgeleitet), Gerätetyp, Betriebssystem,
          Browser und Bildschirmgröße. Google Analytics 4 speichert nach Angaben von Google keine
          IP-Adressen von Nutzern in der EU. Google Signals und die Personalisierung von Werbung
          haben wir deaktiviert; die Daten nutzen wir nicht für Werbung und führen sie nicht mit
          anderen Daten zusammen.
        </p>
        <p>
          Rechtsgrundlage ist Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1
          TDDDG. Ohne Ihre Einwilligung wird Google Analytics nicht geladen. Sie können Ihre
          Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, indem Sie unten auf jeder
          Seite „Cookie-Einstellungen“ öffnen und „Ablehnen“ wählen. Dabei werden auch die
          Google-Analytics-Cookies gelöscht. Die Rechtmäßigkeit der bis zum Widerruf erfolgten
          Verarbeitung bleibt unberührt.
        </p>
        <p>
          Mit Google haben wir einen Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO
          abgeschlossen. Es ist nicht auszuschließen, dass Daten an die Google LLC in den USA
          übermittelt werden. Google LLC ist unter dem EU-US Data Privacy Framework zertifiziert;
          für die USA besteht damit ein Angemessenheitsbeschluss der EU-Kommission (Art. 45 DSGVO).
          Ergänzend gelten die EU-Standardvertragsklauseln. Die in Google Analytics gespeicherten
          Ereignisdaten werden nach 14 Monaten automatisch gelöscht.
        </p>
        <p>
          Weitere Informationen:{" "}
          <a href="https://policies.google.com/privacy" className={a}>
            Datenschutzerklärung von Google
          </a>
          ,{" "}
          <a href="https://support.google.com/analytics/answer/6004245" className={a}>
            Datenschutz in Google Analytics
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>5. Kontakt per E-Mail oder Telefon</h2>
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
        <h2 className={h2}>6. Externe Links</h2>
        <p>
          Unsere Seiten enthalten Links zu anderen Websites, etwa zu football-data.org oder UEFA.
          Erst wenn Sie einen solchen Link anklicken, werden Daten an den jeweiligen Anbieter
          übertragen. Für dessen Datenverarbeitung gilt die Datenschutzerklärung dieses Anbieters.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>7. SSL- bzw. TLS-Verschlüsselung</h2>
        <p>
          Diese Seite nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine
          verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers mit
          „https://“ beginnt.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>8. Ihre Rechte</h2>
        <p>Sie haben im Rahmen der gesetzlichen Bestimmungen jederzeit das Recht auf</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Auskunft über Ihre gespeicherten personenbezogenen Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        </ul>
        <h3 className={h3}>Widerruf Ihrer Einwilligung</h3>
        <p>
          Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen,
          für Google Analytics über „Cookie-Einstellungen“ unten auf jeder Seite (Art. 7 Abs. 3
          DSGVO).
        </p>
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
        <h2 className={h2}>9. Änderungen</h2>
        <p>
          Wir passen diese Datenschutzerklärung an, wenn sich die Website oder die Rechtslage
          ändert. Es gilt die jeweils hier veröffentlichte Fassung.
        </p>
        <p className="text-muted">Stand: Oktober 2026</p>
        <p>
          Siehe auch:{" "}
          <Link href={paths("de").legal} className={a}>
            Impressum
          </Link>
        </p>
      </section>
    </article>
  );
}

/** English translation of the privacy policy. */
function PrivacyEn() {
  return (
    <article className="max-w-3xl space-y-10 text-base leading-relaxed">
      <header>
        <Eyebrow>Datenschutz</Eyebrow>
        <h1 className="mt-4 font-display text-5xl font-extrabold tracking-[-0.045em] sm:text-6xl">
          Privacy policy
        </h1>
        <p className="mt-5 text-lg text-muted">
          In short: visiting the pages creates the technically necessary server log data at the
          host. We only use Google Analytics if you explicitly agree in the banner. We use no
          advertising services.
        </p>
        <p className="mt-3 text-sm text-muted">
          Translation for information. The legally binding version is the German{" "}
          <Link href={paths("de").privacy} className={a} hrefLang="de">
            Datenschutzerklärung
          </Link>
          .
        </p>
      </header>

      <section className="space-y-3">
        <h2 className={h2}>1. Controller</h2>
        <p>
          Online Creators Tim Lagemann
          <br />
          Julius-von-Niethammer-Straße 21
          <br />
          83052 Bruckmühl, Germany
          <br />
          Phone: +49 151 51187375
          <br />
          Email:{" "}
          <a href="mailto:tlagemann@online-creators.de" className={a}>
            tlagemann@online-creators.de
          </a>
        </p>
        <p>
          The controller is the natural or legal person who, alone or jointly with others, decides
          on the purposes and means of processing personal data. No data protection officer has been
          appointed because the legal requirements for this are not met.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>2. Hosting and server log files</h2>
        <p>
          This website is hosted by SiteGround. Provider and processor is SiteGround Spain S.L.,
          Calle de Prim 19, 28004 Madrid, Spain. A data processing agreement according to Art. 28
          GDPR is in place with SiteGround.
        </p>
        <p>
          Whenever a page is requested, your browser automatically sends information to the server,
          which is stored in log files:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>IP address of the requesting device</li>
          <li>date and time of the request</li>
          <li>requested page or file, amount of data transferred and status code</li>
          <li>referrer (previously visited page), if the browser sends it</li>
          <li>browser type, browser version and operating system</li>
        </ul>
        <p>
          This processing is necessary to deliver the website and to keep it secure and stable, for
          example to detect and fend off attacks. The legal basis is Art. 6 (1) (f) GDPR; our
          legitimate interest is the secure and error-free operation of the website. We do not
          analyse the log files for analytics or advertising and do not combine them with other
          data. They are only stored for as long as necessary for these purposes and are then
          deleted by the host.
        </p>
        <p>
          SiteGround operates data centres inside and outside the EU. Where data is transferred to
          countries outside the EU or EEA, this is based on the EU standard contractual clauses
          (Art. 46 (2) (c) GDPR), which are part of the data processing agreement with SiteGround.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>3. Consent, cookies and self-hosted content</h2>
        <p>
          Fonts and club crests are hosted on our own server. Without your consent, no content is
          loaded from third-party servers and no cookies are set when you visit the pages.
        </p>
        <p>
          Your choice in the consent banner (&ldquo;Accept&rdquo; or &ldquo;Decline&rdquo;) is
          stored in your browser&apos;s local storage (localStorage, entry
          &ldquo;footiqra-consent-v1&rdquo;) so the banner does not appear on every page. The entry
          only contains your choice and is not sent to us. Storing it is strictly necessary to
          manage your consent (Section 25 (2) no. 2 TDDDG); the legal basis is Art. 6 (1) (c) GDPR
          in conjunction with Art. 7 (1) GDPR. You can delete the entry at any time in your browser
          settings.
        </p>
        <p>
          We obtain the football data (results, fixtures, tables) through an interface of
          football-data.org. This happens automatically on our systems and not through your browser;
          no data about visitors of this website is transmitted.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>4. Google Analytics</h2>
        <p>
          If you consent in the banner, we use Google Analytics 4, a web analytics service of Google
          Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland (&ldquo;Google&rdquo;).
          Google Analytics helps us understand how the website is used, for example which pages are
          visited, how long visits last and how visitors find us. We use this to improve content and
          usability.
        </p>
        <p>
          For this, your browser loads a script from Google and sets cookies (&ldquo;_ga&rdquo; and
          &ldquo;_ga_5ZXN3X6QF1&rdquo;) that recognise your device by a random identifier. We have
          limited the lifetime of these cookies to 13 months. Processed data includes in particular
          pages visited, date and time, time on page, the previously visited page, approximate
          location (country, region, city, derived from the IP address), device type, operating
          system, browser and screen size. According to Google, Google Analytics 4 does not store IP
          addresses of users in the EU. We have disabled Google signals and ad personalisation; we
          do not use the data for advertising and do not combine it with other data.
        </p>
        <p>
          The legal basis is your consent under Art. 6 (1) (a) GDPR and Section 25 (1) TDDDG.
          Without your consent, Google Analytics is not loaded. You can withdraw your consent at any
          time with effect for the future by opening &ldquo;Cookie settings&rdquo; at the bottom of
          any page and choosing &ldquo;Decline&rdquo;. This also deletes the Google Analytics
          cookies. Withdrawal does not affect the lawfulness of processing before it.
        </p>
        <p>
          We have concluded a data processing agreement with Google under Art. 28 GDPR. Data may be
          transferred to Google LLC in the USA. Google LLC is certified under the EU-US Data Privacy
          Framework, for which an adequacy decision of the European Commission exists (Art. 45
          GDPR). The EU standard contractual clauses apply in addition. Event data stored in Google
          Analytics is deleted automatically after 14 months.
        </p>
        <p>
          More information:{" "}
          <a href="https://policies.google.com/privacy" className={a}>
            Google privacy policy
          </a>
          ,{" "}
          <a href="https://support.google.com/analytics/answer/6004245" className={a}>
            Safeguarding your data in Google Analytics
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>5. Contact by email or phone</h2>
        <p>
          If you contact us by email or phone, we process your details (such as name, email address
          or phone number and the content of your message) to handle your request. The legal basis
          is Art. 6 (1) (b) GDPR if your request relates to a contract or is necessary for
          pre-contractual measures, and otherwise Art. 6 (1) (f) GDPR; our legitimate interest is
          answering your request. The data is deleted once your request has been fully handled and
          no statutory retention obligations apply.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>6. External links</h2>
        <p>
          Our pages contain links to other websites, for example football-data.org or UEFA. Data is
          only transmitted to the respective provider once you click such a link. Their privacy
          policy applies to their processing.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>7. SSL / TLS encryption</h2>
        <p>
          For security reasons this site uses SSL / TLS encryption. You can recognise an encrypted
          connection by the browser address bar starting with &ldquo;https://&rdquo;.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>8. Your rights</h2>
        <p>Within the statutory provisions you have the right at any time to</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>access to your stored personal data (Art. 15 GDPR)</li>
          <li>rectification of inaccurate data (Art. 16 GDPR)</li>
          <li>erasure (Art. 17 GDPR)</li>
          <li>restriction of processing (Art. 18 GDPR)</li>
          <li>data portability (Art. 20 GDPR)</li>
        </ul>
        <h3 className={h3}>Withdrawing consent</h3>
        <p>
          You can withdraw any consent you have given at any time with effect for the future; for
          Google Analytics via &ldquo;Cookie settings&rdquo; at the bottom of every page (Art. 7 (3)
          GDPR).
        </p>
        <h3 className={h3}>Right to object under Art. 21 GDPR</h3>
        <p>
          Where processing is based on Art. 6 (1) (f) GDPR, you have the right to object at any
          time, on grounds relating to your particular situation, to the processing of your personal
          data. We will then no longer process the data unless we can demonstrate compelling
          legitimate grounds for the processing which override your interests, rights and freedoms,
          or the processing serves the establishment, exercise or defence of legal claims.
        </p>
        <p>
          For any data protection matter, an informal message to the email address above is enough.
        </p>
        <h3 className={h3}>Right to lodge a complaint with a supervisory authority</h3>
        <p>
          You have the right to lodge a complaint with a data protection supervisory authority, in
          particular in the member state of your habitual residence, place of work or place of the
          alleged infringement. The authority responsible for us is the Bavarian State Office for
          Data Protection Supervision (BayLDA), Promenade 18, 91522 Ansbach, Germany.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={h2}>9. Changes</h2>
        <p>
          We update this privacy policy when the website or the legal situation changes. The version
          published here applies.
        </p>
        <p className="text-muted">Last updated: October 2026</p>
        <p>
          See also:{" "}
          <Link href={paths("en").legal} className={a}>
            Legal notice
          </Link>
        </p>
      </section>
    </article>
  );
}
