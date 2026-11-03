# UEFA-5-Jahres-Wertung

Die Seite footiqra.com/de/5-jahres-wertung/ wird aus den Dateien in diesem Ordner berechnet. Nach jedem Speichern startet automatisch der Update-Lauf, nach etwa 5 Minuten ist die Seite aktuell. Ist eine Datei fehlerhaft, schlägt der Lauf fehl und die Live-Seite bleibt unverändert; die Fehlermeldung nennt Datei und Zeile (GitHub → Actions → letzter Lauf).

Bearbeiten: Datei auf github.com öffnen → Stift-Symbol → ändern → „Commit changes“. Zeilen mit `#` am Anfang sind Kommentare.

## Dateien

| Datei                      | Inhalt                                    | Wann pflegen                                |
| -------------------------- | ----------------------------------------- | ------------------------------------------- |
| `associations.csv`         | Die 55 Verbände mit Code und Namen        | nie                                         |
| `history.csv`              | Saisonkoeffizienten der Vorjahre pro Land | einmalig, dann jeden Sommer eine Spalte     |
| `2026-27/clubs.csv`        | Alle Vereine der Saison mit Land          | wenn ein neuer Verein auftaucht             |
| `2026-27/matches.csv`      | Ergebnisse                                | nach jedem Spieltag                         |
| `2026-27/league-phase.csv` | Endstand der Ligaphasen                   | einmal nach dem letzten Ligaphasen-Spieltag |

## history.csv

Eine Zeile pro Land, eine Spalte pro Saison, Werte mit Punkt: `21.785`. Gebraucht werden 2021-22 bis 2025-26 (2021-22 nur für die Spalte „±“, also die Veränderung zum Vorjahr). Solange Werte fehlen, zeigt die Seite einen Hinweis, ist für Google gesperrt und steht nicht im Menü.

## clubs.csv

```
club,country,fd_id
Freiburg,GER,
```

- `club`: der Name, den du auch in `matches.csv` verwendest (Groß- und Kleinschreibung egal).
- `country`: 3-Buchstaben-Code aus `associations.csv`, z. B. GER, ENG, SUI, TUR.
- `fd_id`: nur bei Vereinen in der Ligaphase der Champions League, damit ihre Spiele automatisch übernommen werden. Fehlt ein solcher Verein, nennt die Fehlermeldung Namen und `fd_id`.

Gezählt werden alle Vereine, die in der Saison mindestens ein Spiel haben. Durch diese Zahl werden die Punkte eines Landes geteilt.

## matches.csv

```
date,competition,round,home,away,score
2026-07-08,UECL,Q1,Shamrock Rovers,Víkingur,2-0
2026-08-27,UEL,PO,Freiburg,Molde,1-1 pen
2026-10-23,UEL,LP,Freiburg,Molde,
```

- `date`: Spieltag als JJJJ-MM-TT.
- `competition`: `UCL`, `UEL` oder `UECL`.
- `round`:
  - Qualifikation (halbe Punkte): `PR` (nur Champions League), `Q1`, `Q2`, `Q3`, `PO` (Play-off vor der Ligaphase)
  - Hauptwettbewerb: `LP` (Ligaphase), `KPO` (K.-o.-Play-off), `R16` (Achtelfinale), `QF`, `SF`, `F`
- `score`: Ergebnis nach Verlängerung, z. B. `2-1` oder `2:1`. Nach Elfmeterschießen das Remis plus `pen`: `1-1 pen` (das Elfmeterschießen zählt nicht). Leer lassen für noch nicht gespielte Spiele; die erreichte Runde zählt dann schon für die Bonuspunkte.

**Champions League ab der Ligaphase nicht eintragen**: Diese Spiele kommen automatisch aus den Footiqra-Daten. Aus der Champions League trägst du nur `PR`, `Q1`, `Q2`, `Q3` und `PO` ein.

## league-phase.csv

Nach dem letzten Spieltag einer Ligaphase alle 36 Plätze eintragen (Bonuspunkte je nach Platz):

```
competition,position,club
UEL,1,Freiburg
```

Für die Champions League reichen die Vereine mit `fd_id`, die Namen müssen wie in `clubs.csv` geschrieben sein.

## Neue Saison

Im Sommer einen neuen Ordner anlegen (`2027-28/` mit denselben drei Dateien) und in `history.csv` eine Spalte `2026-27` mit den Endwerten ergänzen. Die Seite nimmt automatisch den neuesten Ordner.

## Was berechnet wird

2 Punkte pro Sieg, 1 pro Remis, in der Qualifikation die Hälfte. Bonus: 6 für die Ligaphase der Champions League, Platzierungsbonus der Ligaphase (CL und EL bis 6, ECL bis 4), pro K.-o.-Runde ab dem Achtelfinale 1,5 (CL), 1 (EL), 0,5 (ECL). Saisonwert eines Landes = alle Punkte seiner Vereine geteilt durch die Zahl seiner Vereine, auf drei Stellen abgeschnitten. Die Regeln stehen im Code in `src/uefa/rules.ts`.
