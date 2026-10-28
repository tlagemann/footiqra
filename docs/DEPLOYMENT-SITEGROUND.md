# Bereitstellung auf SiteGround

Status: **noch nicht durchgeführt.** Diese Anleitung beschreibt die geplanten Schritte. Nichts davon wurde bisher auf einem SiteGround-Konto ausgeführt.

## A. Machbarkeitstest (vor Phase 2, ca. 30 Minuten)

Ziel: die offenen Hosting-Fragen aus `ARCHITECTURE.md` (Abschnitt 2) praktisch klären.

1. **Tarif prüfen:** SiteGround Client Area > Services. Tarif muss GrowBig, GoGeek oder Cloud sein.
2. **Funktion prüfen:** Client Area > Websites > Node.js Projects. Ist der Menüpunkt sichtbar und "New Project" möglich?
3. **Repo verbinden:** Footiqra als **privates** GitHub-Repository anlegen und pushen. Im Wizard "Import Git repository" wählen, die SiteGround GitHub App für genau dieses Repository autorisieren.
4. **Build-Einstellungen** (Site Tools > Node.js > Deployment Options):
   - Framework-Preset: Next.js (falls angeboten)
   - Node-Version: 22 oder neuer
   - Paketmanager: npm
   - Build-Befehl: `npm run build`
   - Umgebungsvariablen: `NEXT_PUBLIC_SITE_URL` (temporäre Domain), `NEXT_PUBLIC_ALLOW_INDEXING=false`, `NEXT_TELEMETRY_DISABLED=1`
5. **Beobachten und notieren:**
   - Läuft der Build durch? Falls er an Prozess- oder Thread-Grenzen scheitert, Fehlermeldung aus dem Build-Log sichern.
   - Welcher Start-Befehl wird verwendet? (Erwartet: `npm start`, also `next start`)
   - Antworten `/`, `/leagues/bundesliga/` mit 200 und `/leagues/xyz/` mit 404?
   - Nach 30 bis 60 Minuten ohne Aufruf: erste Antwortzeit messen (Hinweis auf Schlafmodus).
6. **PostgreSQL:** Site Tools > Site > PostgreSQL > Create Database, Benutzer anlegen und zuordnen. Version notieren. Host und Port für die lokale Verbindung notieren.
7. **Cron:** Site Tools > Devs > Cron Jobs. Testweise einen Job anlegen, der `node --version` und `pwd` in eine Logdatei schreibt. Prüfen: Ist Node im PATH? In welchem Verzeichnis läuft der Job?
8. **SSH:** Site Tools > Devs > SSH Keys Manager, Schlüssel anlegen, verbinden, prüfen ob `npm` und das Projektverzeichnis erreichbar sind.

Ergebnis zurückmelden, dann wird der Server- oder Export-Modus final festgelegt.

## B. Server-Modus (Ziel)

1. Repository wie oben verbinden, Auto-Deploy auf Branch `main`.
2. Umgebungsvariablen laut `.env.example` setzen. Geheimnisse (`DATABASE_URL`, `FOOTBALL_DATA_API_TOKEN`, `REVALIDATE_SECRET`) ausschließlich dort eintragen, nie im Repository.
3. Datenbank-Migration einmalig ausführen (per SSH): `psql "$DATABASE_URL" -f db/migrations/0001_initial_schema.sql` (Migrations-Skript folgt in Phase 2).
4. Cron Job für die Aktualisierung (Phase 2), Beispiel: alle 2 Stunden `cd <projektpfad> && npm run ingest`.
5. Eigene Domain zuweisen (Client Area > Node.js Projects > Domain), SSL aktivieren, erst dann `NEXT_PUBLIC_ALLOW_INDEXING=true`.

## C. Export-Modus (Fallback)

1. Lokal oder per SSH: `npm ci && npm run build:static`
2. Inhalt von `out/` in das Webverzeichnis der Domain kopieren (`public_html/`).
3. Optional `.htaccess` für saubere 404-Antworten: `ErrorDocument 404 /404.html`
4. Aktualisierung: nach jedem Ingestion-Lauf neu bauen und kopieren (Automatisierung in Phase 2).

## D. Was nicht automatisch passiert

- Es gibt kein automatisches Deployment aus der CI. GitHub Actions führt nur Prüfungen aus.
- Ohne Freigabe wird nichts veröffentlicht, keine Domain registriert und kein kostenpflichtiger Tarif gebucht.
