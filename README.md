# Footiqra

Cross-league football power rankings for Europe's top leagues: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga and Eredivisie.

**Projektstand:** Datenabruf, Power-Ranking (Modell `elo-v1`), Liga- und Teamseiten laufen mit echten Daten. Der Upload zu SiteGround ist vorbereitet, aber noch nicht aktiviert.

## So funktioniert es

```
GitHub Actions (alle 3 h) → football-data.org → data/*.json (Commit) → statischer Build → SiteGround
```

Auf SiteGround läuft kein Node.js, nur fertige HTML-Dateien. Begründung und Details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Einrichtung: [`docs/DEPLOYMENT-SITEGROUND.md`](docs/DEPLOYMENT-SITEGROUND.md).

## Stack

Next.js 16 (statischer Export, Webpack) · TypeScript strict · React 19 · Tailwind CSS 4 · zod · Vitest · GitHub Actions

## Voraussetzungen

Node.js 22 oder neuer (`.nvmrc`), npm 10 oder neuer.

## Befehle

| Befehl            | Zweck                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
| `npm ci`          | Abhängigkeiten installieren                                                  |
| `npm run dev`     | Entwicklungsserver, http://localhost:3000                                    |
| `npm run ingest`  | Daten von football-data.org nach `data/` (braucht `FOOTBALL_DATA_API_TOKEN`) |
| `npm run build`   | Statische Website nach `out/`                                                |
| `npm run preview` | `out/` lokal ausliefern                                                      |
| `npm run check`   | Typecheck, Lint, Formatprüfung und Tests                                     |
| `npm test`        | Unit-Tests                                                                   |
| `npm run format`  | Code formatieren                                                             |

## Seitenstruktur

| URL                                                       | Inhalt                                            |
| --------------------------------------------------------- | ------------------------------------------------- |
| `/`                                                       | Ligaübergreifendes Power-Ranking und Ligastärke   |
| `/leagues/`                                               | Übersicht der sieben Ligen                        |
| `/leagues/{slug}/` (z. B. `premier-league`, `eredivisie`) | Liga-Seiten mit Teams                             |
| `/teams/{slug}/`                                          | Teamprofile mit Ergebnissen und kommenden Spielen |
| `/methodology/`                                           | Erklärung der Berechnung                          |
| `/sitemap.xml`, `/robots.txt`                             | SEO (Indexierung bis zum Launch gesperrt)         |

Alle Inhalte stehen im ausgelieferten HTML, inklusive Canonical-URL, Open-Graph-Daten und BreadcrumbList-JSON-LD.

## Projektstruktur

```
src/app/          Seiten und Metadaten
src/components/   UI-Bausteine
src/config/       Ligen-Registry, Site-Konfiguration
src/data/         Lese-Schicht für Seiten
src/ranking/      Ranking-Engine (rein funktional, getestet)
src/ingestion/    Datenabruf: Rate Limit, Retries, Validierung, Client
src/store/        JSON-Datenspeicher: Format und Merge-Regeln
scripts/          npm run ingest
data/             Datenbestand (vom Workflow gepflegt, nicht von Hand ändern)
docs/             Architektur und Deployment
```

## Sicherheit

- Geheimnisse nur als GitHub-Secrets bzw. lokal in `.env.local`, nie im Repository.
- Die Website selbst braucht keine Geheimnisse; sie liest nur `data/`.
- Variablen mit Präfix `NEXT_PUBLIC_` landen im HTML und dürfen nie Geheimnisse enthalten.
