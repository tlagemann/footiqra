# Footiqra

Cross-league football power rankings for Europe's top five leagues: Premier League, La Liga, Serie A, Bundesliga and Ligue 1.

**Projektstand: Phase 1 (technische Grundlage).** Es gibt noch keine Live-Datenanbindung. Seiten zeigen bewusst "Data not available yet" statt Beispielzahlen.

## Stack

Next.js 16 (App Router) · TypeScript strict · React 19 · Tailwind CSS 4 · PostgreSQL · zod · Vitest

Details und Begründungen: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
Bereitstellung: [`docs/DEPLOYMENT-SITEGROUND.md`](docs/DEPLOYMENT-SITEGROUND.md)

## Voraussetzungen

- Node.js 22 oder neuer (`.nvmrc`)
- npm 10 oder neuer

## Installation

```bash
npm ci
cp .env.example .env.local   # Werte nur lokal eintragen, nie committen
npm run dev                  # http://localhost:3000
```

Für Phase 1 sind keine Umgebungsvariablen nötig.

## Befehle

| Befehl                 | Zweck                                                               |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run dev`          | Entwicklungsserver                                                  |
| `npm run build`        | Produktions-Build für den Server-Modus (SiteGround Node.js Project) |
| `npm run build:static` | Statischer Export nach `out/` (Fallback für jeden Webspace)         |
| `npm start`            | Startet den Produktions-Build                                       |
| `npm run check`        | Typecheck, Lint, Formatprüfung und Tests in einem Schritt           |
| `npm test`             | Unit-Tests (Vitest)                                                 |
| `npm run format`       | Code formatieren (Prettier)                                         |

## Seitenstruktur

| URL                                                             | Inhalt                                                    |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| `/`                                                             | Ligaübergreifendes Power-Ranking                          |
| `/leagues/`                                                     | Übersicht der fünf Ligen                                  |
| `/leagues/{premier-league,la-liga,serie-a,bundesliga,ligue-1}/` | Liga-Seiten                                               |
| `/teams/{slug}/`                                                | Teamprofile (entstehen, sobald Teamdaten importiert sind) |
| `/methodology/`                                                 | Erklärung der Berechnung                                  |
| `/sitemap.xml`, `/robots.txt`                                   | SEO (Indexierung bis zum Launch gesperrt)                 |

Alle Seiten werden serverseitig vorgerendert, Inhalte sind ohne JavaScript im HTML enthalten. Jede Seite hat Canonical-URL, Open-Graph-Daten und auf Liga-Seiten BreadcrumbList-JSON-LD.

## Projektstruktur

```
src/app/          Seiten und Metadaten
src/components/   UI-Bausteine
src/config/       Ligen-Registry, Site-Konfiguration
src/data/         Lese-Schicht für Seiten
src/ranking/      Ranking-Engine (rein funktional, getestet)
src/ingestion/    Datenabruf: Rate Limit, Retries, Validierung, Provider-Mapping
src/lib/          Env-Validierung, SEO-Helfer, Slugs
db/migrations/    PostgreSQL-Schema
docs/             Architektur und Deployment
```

## Sicherheit

- Geheimnisse nur in `.env.local` bzw. in den Umgebungsvariablen bei SiteGround.
- `src/lib/env.ts` ist `server-only`: Ein versehentlicher Import im Browser-Code bricht den Build ab.
- Variablen mit Präfix `NEXT_PUBLIC_` landen im Browser und dürfen nie Geheimnisse enthalten.

## Nächster Schritt

Machbarkeitstest auf SiteGround (siehe `docs/DEPLOYMENT-SITEGROUND.md`, Abschnitt A), danach Phase 2: Ingestion-Job für football-data.org und Anbindung der Datenbank.
