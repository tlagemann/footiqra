# Footiqra: Technische Architektur (Phase 1)

Stand: 28.10.2026. Dieses Dokument hält die Entscheidungen aus Phase 1 fest, inklusive der Punkte, die bewusst offen sind.

## 1. Zusammenfassung

| Bereich             | Entscheidung                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Framework           | Next.js 16 (App Router) mit TypeScript (strict), React 19                                                                                |
| Styling             | Tailwind CSS 4, eigene Design-Tokens. shadcn/ui wird erst eingebunden, wenn echte Komponenten (Tabellen, Tabs, Dialoge) gebraucht werden |
| Hosting (Ziel)      | SiteGround GoGeek, Funktion "Node.js Projects" (seit Oktober 2026 in GrowBig/GoGeek/Cloud enthalten, GoGeek bis 10 Projekte)             |
| Hosting (Fallback)  | Statischer Export (`npm run build:static`), lauffähig auf jedem SiteGround-Webspace                                                      |
| Datenbank           | PostgreSQL direkt bei SiteGround (Site Tools > Site > PostgreSQL). Kein Supabase                                                         |
| Fußballdaten        | football-data.org, zunächst kostenloser Tarif. API-Football als Alternative hinter derselben Schnittstelle                               |
| Aktualisierung      | Eigenständiger Ingestion-Job (Node-Skript), ausgelöst per SiteGround Cron Job, schreibt in PostgreSQL                                    |
| Ranking             | Reines TypeScript-Modul `src/ranking/`, unabhängig von UI, Datenbank und API                                                             |
| Versionsverwaltung  | Git + GitHub, CI über GitHub Actions (nur Prüfungen, kein Deployment)                                                                    |
| Laufende Mehrkosten | 0 € in der Startkonfiguration (siehe Abschnitt 8)                                                                                        |

Kernidee: **alles bei einem Anbieter** (App, Datenbank, Cron bei SiteGround), die Website liest ausschließlich aus der eigenen Datenbank, nie live aus der Fußball-API.

## 2. Hosting: Was SiteGround GoGeek kann und was offen ist

### Verifiziert (offizielle SiteGround-Quellen, Oktober 2026)

- Node.js-Projekte sind in GrowBig, GoGeek und Cloud enthalten, ohne Zusatzkosten. GoGeek: bis zu 10 Projekte. StartUp: keine.
- Deployment per GitHub-Repository (Auto-Deploy bei Push auf den gewählten Branch) oder ZIP-Upload (max. 128 MB).
- Einstellbar: Framework-Preset, Node-Version, Paketmanager, Build-Befehl, Output-Verzeichnis, Umgebungsvariablen.
- Build-Logs pro Deployment, Laufzeitfehler unter Statistics > Error Log.
- In Site Tools vorhanden: Cron Jobs (Devs), MySQL und **PostgreSQL** (Site), SSH-Schlüssel, Backups, SSL.
- PostgreSQL: Fernzugriff ist standardmäßig gesperrt und kann per IP freigegeben werden.
- Next.js wird im Ankündigungsartikel als unterstütztes Framework genannt.

### Nicht verifiziert (muss vor Phase 2 praktisch getestet werden)

| Frage                                                                                                   | Warum relevant                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Läuft die App als dauerhafter Prozess (`next start`) oder wird sie schlafen gelegt?                     | Bestimmt, ob serverseitiges Rendering und Revalidierung zuverlässig funktionieren                                                                                               |
| Wie wird die App gestartet (Start-Befehl, `PORT`-Variable)?                                             | `npm start` muss passen                                                                                                                                                         |
| CPU-, RAM- und Prozessgrenzen                                                                           | In den Kommentaren zum SiteGround-Blog berichtet ein Nutzer von einem Limit von 80 Prozessen/Threads, das Next.js-Builds blockiert hat. SiteGround hat die Zahl nicht bestätigt |
| Läuft ein Cron Job im Kontext des Node-Projekts (Node im PATH, Projektverzeichnis, Umgebungsvariablen)? | Davon hängt die automatische Datenaktualisierung ab                                                                                                                             |
| Erreicht die Node-App die PostgreSQL-Datenbank lokal (Host, Port)?                                      | Sonst Fernzugriff nötig                                                                                                                                                         |
| PostgreSQL-Version und Speichergrenzen                                                                  | Schema nutzt nur Standard-SQL, sollte ab PostgreSQL 12 laufen                                                                                                                   |
| Bleiben Dateien im Projektordner bei einem Redeploy erhalten?                                           | Wir planen ohnehin keine Dateispeicherung zur Laufzeit                                                                                                                          |

Die Funktion ist erst seit Anfang Oktober 2026 verfügbar, SSH-Zugriff auf Node-Projekte laut SiteGround-Kommentaren ebenfalls erst seit Anfang Oktober. Deshalb ist die Architektur so gebaut, dass ein Wechsel auf den statischen Fallback ohne Umbau der Seiten möglich ist.

Konkrete Prüfschritte: siehe `docs/DEPLOYMENT-SITEGROUND.md`, Abschnitt "Machbarkeitstest".

### Fallback, falls der Node-Betrieb nicht zuverlässig ist

`FOOTIQRA_BUILD_TARGET=export` erzeugt reines HTML/CSS/JS im Ordner `out/`. Ablauf dann:

1. Ingestion-Job läuft weiter als SiteGround Cron Job und schreibt in PostgreSQL.
2. Nach erfolgreicher Aktualisierung wird die Seite neu gebaut (auf SiteGround per SSH-Build oder per GitHub Actions) und `out/` ins Webverzeichnis kopiert.

Nachteil: Jede Datenänderung erfordert einen kompletten Build. Für 5 Ligen mit etwa 100 Teams ist das unkritisch (Build dauert unter einer Minute).

Verworfen: Vercel (vom Auftraggeber ausgeschlossen), eigener VPS (Wartungsaufwand), Next.js-Server auf klassischem Shared Hosting ohne Node-Projekte (nicht unterstützt).

## 3. Schichten und Verzeichnisstruktur

```
src/
  app/                    Darstellung: Routen, Seiten, Metadaten (nur UI)
  components/             Wiederverwendbare UI-Bausteine
  config/                 Statische Stammdaten (Ligen, Site-Einstellungen)
  data/                   Lese-Schicht für Seiten (heute: "nicht verfügbar", Phase 2: SQL)
  ranking/                Ranking-Berechnung, rein funktional, ohne Abhängigkeiten
  ingestion/              Abruf externer Daten: HTTP, Rate Limit, Retries, Provider
    providers/football-data/  Validierungsschemas und Mapping für football-data.org
  lib/                    Querschnitt: Umgebungsvariablen, SEO-Helfer, Slugs
db/migrations/            SQL-Migrationen für PostgreSQL
docs/                     Architektur und Deployment
```

Regeln:

- Seiten (`src/app`) importieren nur aus `src/data`, `src/config`, `src/components`, `src/lib`. Nie aus `src/ingestion`.
- `src/ranking` importiert nichts aus dem Projekt außer den eigenen Typen.
- `src/lib/env.ts` ist mit `import "server-only"` geschützt: Ein Import in Client-Code bricht den Build ab.

## 4. Datenfluss

```
football-data.org
      │  (Cron, z. B. alle 2 h an Spieltagen, sonst 1x täglich)
      ▼
Ingestion-Job  ── Rate Limiter (8 Anfragen/min) ── Retry mit Backoff ── zod-Validierung
      │
      ▼
PostgreSQL  (Upsert über externe IDs, Rohantworten in api_cache, Lauf in ingestion_runs)
      │
      ▼
Ranking-Job  (src/ranking, neuer Eintrag in ranking_runs + team_ratings)
      │
      ▼
Next.js-Seiten lesen nur aus PostgreSQL  ──►  Besucher
```

Die Website ist nie direkt von der externen API abhängig. Fällt die API aus, zeigt die Seite den letzten erfolgreichen Stand mit Zeitstempel.

## 5. Datenmodell (db/migrations/0001_initial_schema.sql)

- `competitions`, `seasons`, `teams`, `season_teams`: Stammdaten, anbieterunabhängig.
- `external_ids`: Zuordnung Anbieter-ID zu interner ID. Ermöglicht Anbieterwechsel ohne neue URLs.
- `matches`: Ergebnisse. Doppelte Datensätze werden doppelt verhindert: über `external_ids` und über einen natürlichen Schlüssel (Saison, Heim, Gast, Anstoß).
- `standings_snapshots` / `standings_rows`: Tabellenstände als Zeitreihe.
- `ranking_runs` / `team_ratings`: Jede Ranking-Berechnung wird mit Modellname und Parametern gespeichert. Historie wird nie überschrieben, daraus entstehen Formkurven.
- `ingestion_runs`: Status, Zeitstempel, Anzahl Anfragen. Liefert "zuletzt aktualisiert" und Monitoring.
- `api_cache`: Rohantworten zum Nachvollziehen und Neuberechnen ohne API-Kontingent.

Das Schema wurde in Phase 1 gegen eine PostgreSQL-17-Instanz (PGlite) geprüft, einschließlich der Duplikat- und Plausibilitätsregeln.

## 6. Fußball-Datenquelle

### football-data.org (gewählt für den Start)

- Kostenloser Tarif: 12 Wettbewerbe, darunter alle fünf Zielligen und die Champions League. 10 Anfragen pro Minute. Spielpläne, Ergebnisse, Tabellen.
- Einschränkungen im kostenlosen Tarif: Ergebnisse verzögert (kein Livescore), keine Aufstellungen, keine Spielstatistiken (Schüsse, Ballbesitz), nur die aktuelle Saison.
- Kostenpflichtige Erweiterungen (Stand Oktober 2026, zzgl. MwSt.): Livescores 12 €/Monat, "ML Pack Light" mit 10 Saisons Historie 29 €/Monat, Statistik-Add-on 15 €/Monat.
- Anfragebedarf: Pro Lauf etwa 12 Anfragen (5 Ligen x Spiele + Tabellen, plus Champions League). Liegt weit unter dem Limit.

### API-Football (Alternative)

- Kostenloser Tarif: 100 Anfragen pro Tag, laut Anbieter alle Wettbewerbe und Endpunkte inklusive Teamstatistiken.
- Bezahltarife laut Anbieter-Blog: Pro 19 $, Ultra 29 $, Mega 39 $ pro Monat.
- **Offen:** Welche Saisons der kostenlose Tarif tatsächlich freigibt, konnte nicht verifiziert werden. Laut Anbieter-Blog nur "aktuelle Saisons". Vor einer Entscheidung im Dashboard mit einem Test-Key prüfen.

### Begründung

football-data.org deckt mit dem kostenlosen Tarif alles ab, was für Ranking und Tabellen nötig ist, und hat das großzügigere Limit pro Lauf. Historie bauen wir ab Start selbst auf (jede Saison wird gespeichert). Wenn rückwirkende Historie für den Launch wichtig ist, ist das 29-€-Paket der direkteste Weg. Der Provider ist hinter `src/ingestion/providers/` gekapselt, ein Wechsel betrifft nur diesen Ordner.

## 7. Ranking

Phase 1 enthält ein bewusst einfaches Basismodell (`elo-v0`): Elo mit Heimvorteil und Tordifferenz-Faktor. Es dient dazu, die gesamte Kette testbar zu machen. Getestet sind Nullsummen-Eigenschaft, Heimvorteil, neutrale Spielorte, Reihenfolge-Unabhängigkeit, Duplikat-Erkennung und Rangvergabe bei Gleichstand.

**Wichtiger methodischer Punkt:** Ein ligaübergreifendes Ranking lässt sich nicht allein aus Ligaspielen ableiten. Innerhalb jeder Liga sind die Bewertungen nur relativ zueinander. Die Ligen werden erst über Spiele zwischen Teams verschiedener Ligen vergleichbar, also über europäische Wettbewerbe. Die Champions League ist im kostenlosen Tarif enthalten, Europa League und Conference League nicht. Optionen für Phase 2:

1. Kalibrierung über Champions-League-Spiele (kostenlos, aber wenige Spiele pro Saison).
2. Zusätzliche europäische Wettbewerbe über einen Bezahltarif.
3. Ein Liga-Stärkefaktor als expliziter, dokumentierter Modellparameter.

Diese Entscheidung gehört zur Methodik und ist in Abschnitt 10 als offene Frage geführt.

## 8. Laufende Kosten

| Posten                               | Kosten                                                               |
| ------------------------------------ | -------------------------------------------------------------------- |
| SiteGround GoGeek (bestehend)        | keine Mehrkosten                                                     |
| PostgreSQL bei SiteGround            | im Tarif enthalten                                                   |
| football-data.org Free               | 0 €                                                                  |
| GitHub (Repo, Actions für CI)        | 0 € im Rahmen der Freikontingente                                    |
| Domain                               | nur falls eine neue Domain registriert wird (nicht Teil von Phase 1) |
| **Summe Startkonfiguration**         | **0 € zusätzlich**                                                   |
| Optional später: Historie 10 Saisons | 29 €/Monat                                                           |
| Optional später: Livescores          | 12 €/Monat                                                           |

Supabase wäre im kostenlosen Tarif ebenfalls 0 €, pausiert Projekte aber nach einer Woche ohne Aktivität und enthält keine automatischen Backups. Da SiteGround PostgreSQL mitbringt, entfällt der zweite Anbieter.

## 9. Sicherheit und Qualität

- TypeScript `strict`, ESLint (Next.js Core Web Vitals + TypeScript-Regeln), Prettier.
- Externe Daten werden mit zod validiert, unbekannte Felder verworfen, fehlerhafte Datensätze abgelehnt statt geraten.
- Geheimnisse nur serverseitig (`src/lib/env.ts` mit `server-only`), Fehlermeldungen nennen Variablennamen, nie Werte.
- `.env*` ist per `.gitignore` ausgeschlossen, nur `.env.example` mit Platzhaltern liegt im Repo.
- `robots.txt` sperrt die Indexierung, bis `NEXT_PUBLIC_ALLOW_INDEXING=true` gesetzt wird. Temporäre SiteGround-Domains werden so nicht indexiert.
- Keine Fantasiedaten: Fehlen Daten, zeigt die Seite einen eindeutigen Hinweis. Testdaten verwenden erfundene Teamnamen ("Example United") und sind als solche gekennzeichnet.
- Automatisierte Tests (Vitest) für Ranking, HTTP-Retry/Rate-Limit, Validierung und Mapping, Umgebungsvariablen, Slugs.

## 10. Offene Fragen

| #   | Frage                                                                          | Wer                          | Blockiert                              |
| --- | ------------------------------------------------------------------------------ | ---------------------------- | -------------------------------------- |
| 1   | Machbarkeitstest Node.js-Projekt bei SiteGround (Prozessmodell, Start, Limits) | Tim (Zugang), dann Umsetzung | Wahl zwischen Server- und Export-Modus |
| 2   | Cron Job im Node-Kontext und lokale PostgreSQL-Verbindung                      | wie 1                        | Automatische Aktualisierung            |
| 3   | Domain für Footiqra (bestehend oder neu?)                                      | Tim                          | Produktivgang, nicht die Entwicklung   |
| 4   | Ranking-Methodik, insbesondere ligaübergreifende Kalibrierung                  | Tim (inhaltlich)             | Startseite, Methodik-Seite             |
| 5   | Wird Historie vor dem Start benötigt (dann 29 €/Monat)?                        | Tim                          | Formkurven ab Launch                   |
| 6   | API-Football: Saisonumfang im kostenlosen Tarif                                | Test mit kostenlosem Key     | nur falls Anbieterwechsel              |

## 11. Caching und Aktualität (Planung Phase 2)

- Server-Modus: Seiten werden statisch vorgerendert und nach jedem erfolgreichen Ingestion-Lauf gezielt neu erzeugt (On-Demand-Revalidierung über einen geschützten Endpunkt mit `REVALIDATE_SECRET`). Ob dafür Cache Components (`use cache`, `cacheTag`) eingesetzt werden, wird nach dem Machbarkeitstest entschieden; in Phase 1 sind sie deaktiviert.
- Export-Modus: Aktualität entsteht durch Neubau nach jedem Ingestion-Lauf.
- In beiden Fällen zeigt jede Seite "Last updated" aus `ingestion_runs`.
