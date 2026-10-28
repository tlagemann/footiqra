# Bereitstellung: GitHub Actions und SiteGround

Status: Datenabruf und Build sind eingerichtet. **Der Upload zu SiteGround ist noch ausgeschaltet** (`DEPLOY_ENABLED` nicht gesetzt) und wurde noch nicht durchgeführt.

## A. Datenabruf aktivieren (einmalig, ca. 5 Minuten)

1. Kostenlos registrieren: https://www.football-data.org/client/register. Der Token kommt per E-Mail.
2. GitHub: Repository **tlagemann/footiqra** > Settings > Secrets and variables > Actions > **New repository secret**
   - Name: `FOOTBALL_DATA_API_TOKEN`
   - Wert: der Token
3. Actions > "Update data and site" > **Run workflow**.
4. Ergebnis: Ein Commit "data: update ..." mit den Dateien in `data/`, und unter dem Lauf ein Artefakt **site** (die fertige Website als ZIP zum Ansehen).

Danach läuft der Workflow automatisch alle 3 Stunden.

## B. Upload zu SiteGround aktivieren (einmalig, ca. 15 Minuten)

Voraussetzung: Footiqra hat eine Website bei SiteGround (eigene Domain, Subdomain oder temporäre Domain).

1. **Zielordner markieren:** Im Site Tools File Manager der Footiqra-Website im Webverzeichnis (meist `public_html`) eine leere Datei `.footiqra-deploy-target` anlegen. Ohne diese Datei verweigert der Workflow den Upload. Das schützt die anderen Websites im Konto.
2. **SSH-Schlüssel:** Site Tools > Devs > SSH Keys Manager > neuen Schlüssel erzeugen (ohne Passphrase, da der Workflow ihn automatisch nutzt). Den privaten Schlüssel anzeigen lassen.
3. **Verbindungsdaten** stehen im SSH Keys Manager unter "SSH Credentials": Host, Benutzername, Port.
4. **Hostschlüssel** auf dem Mac im Terminal ermitteln: `ssh-keyscan -p PORT HOST` (Ausgabe komplett kopieren).
5. **GitHub Secrets** (wie in A.2) anlegen:

   | Secret            | Inhalt                                                                           |
   | ----------------- | -------------------------------------------------------------------------------- |
   | `SSH_PRIVATE_KEY` | privater Schlüssel aus Schritt 2 (komplett)                                      |
   | `SSH_KNOWN_HOSTS` | Ausgabe aus Schritt 4                                                            |
   | `SSH_HOST`        | Host aus Schritt 3                                                               |
   | `SSH_PORT`        | Port aus Schritt 3                                                               |
   | `SSH_USER`        | Benutzername aus Schritt 3                                                       |
   | `DEPLOY_PATH`     | absoluter Pfad zum Webverzeichnis, z. B. `/home/customer/www/DOMAIN/public_html` |

6. **GitHub Variables** (Reiter "Variables"):

   | Variable         | Wert                                                     |
   | ---------------- | -------------------------------------------------------- |
   | `SITE_URL`       | z. B. `https://footiqra.com` (ohne Schrägstrich am Ende) |
   | `DEPLOY_ENABLED` | `true`                                                   |
   | `ALLOW_INDEXING` | erst zum Launch `true`, vorher weglassen                 |

7. Workflow manuell starten und die Seite im Browser prüfen.

Der Upload nutzt `rsync --delete`: Dateien im Zielordner, die nicht mehr zur Website gehören, werden entfernt. Ausgenommen sind `.footiqra-deploy-target`, `.htaccess` und `.well-known/`.

Erster Upload am 28.10.2026 auf `timl92.sg-host.com` (Host `ssh.timl92.sg-host.com`, Port 18765, Pfad `/home/customer/www/timl92.sg-host.com/public_html`). Befund: SiteGrounds Dynamic Cache speichert die HTML-Seiten (`x-proxy-cache: HIT`). Damit Aktualisierungen sofort sichtbar werden, ist der Dynamic Cache für diese Website abzuschalten (Site Tools > Geschwindigkeit > Caching). `public/.htaccess` setzt eigene 404-Seite und kurze Browser-Cache-Zeiten für HTML, Sitemap und robots.txt (SiteGround-Standard waren 180 Tage).

### Umzug auf footiqra.com

1. In SiteGround footiqra.com mit der bestehenden Website verbinden (DNS-Eintrag auf denselben Server, Webverzeichnis bleibt `/home/customer/www/timl92.sg-host.com/public_html`) und ein SSL-Zertifikat für footiqra.com und www.footiqra.com ausstellen.
2. GitHub Variable `SITE_URL` auf `https://footiqra.com` setzen, `ALLOW_INDEXING` auf `true`.
3. Workflow starten. `scripts/htaccess.ts` hängt beim Build eine 301-Weiterleitung an `.htaccess` an: http, www und die temporäre sg-host-Adresse führen dann auf `https://footiqra.com`. Die Regel entsteht nur, wenn `SITE_URL` eine https-Adresse ist; `/.well-known/` bleibt für die Zertifikatsprüfung erreichbar.
4. Danach footiqra.com in der Google Search Console anlegen und `https://footiqra.com/sitemap.xml` einreichen.

## C. Lokal arbeiten

```bash
npm ci
npm run dev                                   # Entwicklung, http://localhost:3000
FOOTBALL_DATA_API_TOKEN=... npm run ingest    # Daten lokal abrufen (optional)
npm run build && npm run preview              # statische Seite wie auf dem Server
```

## D. Was nicht automatisch passiert

- Ohne `DEPLOY_ENABLED=true` wird nichts hochgeladen.
- Es wird keine Domain registriert und kein kostenpflichtiger Tarif gebucht.
- Die Indexierung durch Suchmaschinen bleibt gesperrt, bis `ALLOW_INDEXING=true` gesetzt ist.

## E. Ergebnis des Machbarkeitstests (28.10.2026)

Durchgeführt mit ZIP-Upload als SiteGround Node.js-Projekt auf einer temporären Domain. Das Testprojekt wurde danach gelöscht.

| Punkt               | Ergebnis                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Tarif               | GrowBig (nicht GoGeek), bis zu 5 Node.js-Projekte, läuft bis 29.11.2026                                                                         |
| Laufzeit            | Node v22.23.4, npm 10.9.9, Framework-Preset Next.js wird erkannt                                                                                |
| `npm install`       | erfolgreich (394 Pakete)                                                                                                                        |
| Build mit Turbopack | **scheitert**: Build-Umgebung verbietet das Öffnen von Ports ("binding to a port: Operation not permitted")                                     |
| Build-Befehl        | nur Skriptnamen erlaubt (`run build`), keine Zusatzparameter                                                                                    |
| Korrektur           | Build auf Webpack umgestellt (`next build --webpack`, Tailwind via PostCSS), lokal grün; auf SiteGround nicht mehr getestet                     |
| Inodes              | Ein Node.js-Projekt belegte **29.012 Inodes** (`node_modules`). Konto: Limit 400.000, ohne Projekt 335.886 belegt (84 %), mit Projekt über 90 % |

**Schlussfolgerung:** Ein Node.js-Projekt ist auf diesem Tarif technisch möglich, passt aber nicht in die Inode-Reserve, da sich 10 weitere Websites den Tarif teilen. Footiqra wird deshalb als statische Website betrieben (ca. 100 bis 1.000 Dateien). Build und Datenabruf laufen außerhalb von SiteGround (GitHub Actions), hochgeladen werden nur die fertigen Dateien.
