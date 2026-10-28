# Footiqra: Technische Architektur

Stand: 28.10.2026 (nach dem SiteGround-Machbarkeitstest). Ergebnisse des Tests: `DEPLOYMENT-SITEGROUND.md`, Abschnitt E.

## 1. Zusammenfassung

| Bereich         | Entscheidung                                                                             |
| --------------- | ---------------------------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router), TypeScript strict, React 19, Build mit Webpack                  |
| Ausgabe         | Rein statische Website (`output: "export"`), Ordner `out/`                               |
| Hosting         | SiteGround (bestehender GrowBig-Tarif), nur fertige HTML/CSS/JS-Dateien                  |
| Datenspeicher   | Versionierte JSON-Dateien im Repository (`data/`), keine Datenbank                       |
| Datenquelle     | football-data.org, kostenloser Tarif (7 Ligen + Champions League, aktuelle Saison)       |
| Automatisierung | GitHub Actions nach Zeitplan: Abruf, Commit, Build, Upload per SSH                       |
| Ranking         | `elo-v1`: Elo plus Ligastärke aus UEFA-Koeffizienten, kalibriert durch Europapokalspiele |
| Laufende Kosten | 0 € zusätzlich                                                                           |

## 2. Warum statisch statt Node.js-Server

Der Machbarkeitstest am 28.10.2026 hat gezeigt:

- SiteGround-Node.js-Projekte funktionieren grundsätzlich (Node 22, npm, Next.js-Preset).
- Ein einziges Projekt belegte aber **29.012 Inodes** (`node_modules`). Der Tarif hat 400.000 Inodes und wird von 10 weiteren Websites genutzt. Das Konto lag dadurch über 90 %.
- Die statische Ausgabe braucht etwa 100 bis 1.000 Dateien.

Deshalb läuft auf SiteGround kein Node-Prozess. Alles, was Rechenleistung oder Abhängigkeiten braucht, läuft in GitHub Actions. Auf den Webspace kommen nur die fertigen Dateien.

Vorteile zusätzlich: sehr schnelle Seiten, keine Angriffsfläche durch Server-Code, keine Geheimnisse auf dem Webserver, vollständig indexierbares HTML.

## 3. Datenfluss

```
GitHub Actions (alle 3 Stunden, manuell auslösbar)
  │
  ├─ npm run ingest
  │    football-data.org ── Rate Limit (8/min) ── Retry mit Backoff ── zod-Validierung
  │    → data/matches/{Wettbewerb}/{Saison}.json   (Upsert per Spiel-ID)
  │    → data/teams.json                           (stabile URL-Slugs)
  │    → data/meta.json                            (Zeitstempel letzter Erfolg)
  │
  ├─ git commit data/      (nur bei Änderungen; Historie = Git-Historie)
  ├─ npm run build         (liest data/, erzeugt out/)
  ├─ Artefakt "site"       (zum Herunterladen und Prüfen, 7 Tage)
  └─ rsync out/ → SiteGround   (nur wenn DEPLOY_ENABLED=true)
```

Die Website ruft nie die Fußball-API auf. Fällt die API aus, bleibt der letzte erfolgreiche Stand online, mit Zeitstempel auf jeder Datenseite.

## 4. Verzeichnisstruktur

```
src/app/          Seiten und Metadaten (nur Darstellung)
src/components/   UI-Bausteine
src/config/       Ligen-Registry, Site-Konfiguration
src/data/         Lese-Schicht für Seiten (server-only) + reine Abfragelogik
src/ranking/      Ranking-Engine, ohne Abhängigkeiten
src/ingestion/    Datenabruf: HTTP, Rate Limit, Retries, Provider-Client, Lauf-Logik
src/store/        JSON-Speicher: Format, Merge-Regeln, Dateizugriff
scripts/          Einstiegspunkte (npm run ingest)
data/             Datenbestand (wird vom Workflow gepflegt)
docs/             Architektur und Deployment
```

Regeln: Seiten importieren nie aus `src/ingestion`. `src/ranking` importiert nur eigene Typen. `src/data/index.ts` ist `server-only`.

## 5. Datenmodell (data/)

- **Spiele** pro Wettbewerb und Saison, sortiert nach Anstoß. Eindeutig über die Anbieter-ID. Eine Antwort ersetzt einen gespeicherten Stand nur, wenn ihr `lastUpdated` gleich oder neuer ist; veraltete Antworten können also nichts überschreiben.
- **Teams** mit einmalig vergebenem Slug. Ändert der Anbieter einen Namen, bleibt die URL gleich. Slug-Kollisionen werden mit Suffix aufgelöst.
- **Meta** mit Zeitstempel des letzten erfolgreichen Abrufs je Wettbewerb.
- Schreibvorgänge sind atomar (temporäre Datei, dann Umbenennen). Jede Datei trägt `schemaVersion`.
- Rankings werden nicht gespeichert, sondern beim Build deterministisch aus den Spielen berechnet. Historische Rankings und Formkurven entstehen durch Nachrechnen bis zu einem Stichtag.

Datenmenge: rund 1.800 Ligaspiele pro Saison, etwa 1 MB JSON. Wird das zu groß oder werden Abfragen komplex, kann eine Datenbank hinter `src/data/` nachgerüstet werden, ohne Seiten zu ändern.

## 6. Datenquelle

football-data.org, kostenloser Tarif (Stand Oktober 2026): 12 Wettbewerbe inklusive der fünf Ligen und der Champions League, 10 Anfragen pro Minute, Ergebnisse verzögert, keine Spielstatistiken, nur aktuelle Saison. Ein Lauf braucht 8 Anfragen (7 Ligen + Champions League). Erfasst sind seit 28.10.2026 zusätzlich Primeira Liga und Eredivisie; weitere Ligen (z. B. Belgien, Türkei) bräuchten einen Bezahltarif oder zweiten Anbieter.

Erweiterungen bei Bedarf: Livescores 12 €/Monat, 10 Saisons Historie 29 €/Monat, Statistik-Add-on 15 €/Monat (jeweils zzgl. MwSt.). Der Anbieter ist in `src/ingestion/providers/` gekapselt.

API-Football bleibt Alternative (100 Anfragen/Tag kostenlos). Welche Saisons der Gratistarif freigibt, ist unbestätigt.

## 7. Ranking und Methodik (entschieden am 28.10.2026: Option 1)

Modell `elo-v1` (`src/ranking/league-elo.ts`), öffentlich erklärt auf `/methodology/`:

- **Teamrating:** Elo, Start 1500, K-Faktor 20, Heimvorteil 65, Tordifferenz-Faktor.
- **Ligastärke:** Jede Liga startet mit einem festen Wert aus den offiziellen UEFA-Länderkoeffizienten der Saison 2025/26 (`src/config/league-strength.ts`, gelesen am 28.10.2026): 2 Ratingpunkte je Koeffizientenpunkt Abstand zum Durchschnitt aller erfassten Ligen. Ergebnis: Premier League +57,9, Serie A +18,7, La Liga +12,9, Bundesliga +4,7, Ligue 1 -14,1, Primeira Liga -34,8, Eredivisie -45,3.
- **Nachjustierung:** Jedes Europapokalspiel zwischen Teams zweier verschiedener Top-5-Ligen verschiebt beide Ligawerte (K 4, Nullsumme). Ligaspiele ändern die Ligastärke nie.
- **Verwendete Spiele:** beendete Ligaspiele der aktuellen Saison plus Champions-League-Spiele zwischen Top-5-Teams. Nicht verwendet: Spiele gegen Klubs anderer Länder, Entscheidungen nach Verlängerung oder Elfmeterschießen.
- **Saisonstart:** Ratings beginnen jede Saison neu. Mit Historie (Bezahlpaket) ließe sich ein Übertrag mit Rückführung zum Mittelwert ergänzen.
- Rankings werden nicht gespeichert, sondern beim Build deterministisch berechnet.

Die UEFA-Koeffizienten werden einmal pro Saison aktualisiert (Datum in der Konfiguration mitpflegen).

## 8. Kosten

| Posten                          | Kosten                                                  |
| ------------------------------- | ------------------------------------------------------- |
| SiteGround (bestehend)          | keine Mehrkosten                                        |
| football-data.org Free          | 0 €                                                     |
| GitHub (privates Repo, Actions) | 0 € (2.000 Minuten/Monat frei)                          |
| Geschätzter Actions-Verbrauch   | ca. 8 Läufe/Tag x 2 bis 3 Min. = 500 bis 750 Min./Monat |
| Domain                          | nur falls eine neue registriert wird                    |

## 9. Sicherheit und Qualität

- TypeScript strict, ESLint, Prettier, Vitest (Ranking, Merge-Regeln, Dateispeicher, HTTP-Retry, Rate Limit, Validierung, Client, Lese-Schicht).
- Externe Daten werden mit zod geprüft; fehlerhafte Antworten werden abgelehnt statt geraten.
- Der API-Token existiert nur als GitHub-Secret und im HTTP-Header, nie in URLs, Logs oder im Repository.
- Upload nur in ein Verzeichnis mit Markierungsdatei `.footiqra-deploy-target`; SSH-Hostschlüssel ist fest hinterlegt.
- `robots.txt` sperrt die Indexierung, bis `ALLOW_INDEXING=true` gesetzt ist.
- Keine Fantasiedaten: fehlen Daten, zeigt die Seite das ausdrücklich. Tests nutzen erkennbar erfundene Teams.

## 10. Offene Punkte

| #   | Punkt                                                                                                          | Wer                |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------ |
| 1   | Domain für Footiqra festlegen und als Website bei SiteGround anlegen                                           | Tim                |
| 2   | SSH-Zugang und Deploy-Secrets einrichten (Anleitung in DEPLOYMENT)                                             | Tim, dann Test     |
| 3   | Prüfen, ob SiteGrounds Dynamic Cache statische HTML-Dateien zwischenspeichert (sonst Cache nach Upload leeren) | beim ersten Upload |
| 4   | Historie vor dem Start nötig? (dann 29 €/Monat)                                                                | Tim                |
| 5   | Inode-Reserve des Kontos (84 %) und Tarifverlängerung am 29.11.2026                                            | Tim                |
