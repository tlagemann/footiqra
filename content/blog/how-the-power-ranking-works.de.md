---
title: So funktioniert das Footiqra Power-Ranking
description: Wie Footiqra alle Vereine der sieben Topligen Europas auf einer Skala bewertet: mit Elo-Ratings und Ligastärke aus dem Europapokal.
published: 2026-11-02
---

Ist Bayern gerade stärker als Arsenal? Die Tabellen beantworten das nicht, denn beide Vereine spielen in verschiedenen Ligen gegen verschiedene Gegner. Das Footiqra Power-Ranking kann es: Es bewertet jeden Verein der sieben Topligen Europas auf einer gemeinsamen Skala, allein auf Basis von Spielergebnissen.

Dieser Artikel erklärt einfach, wie das funktioniert. Alle Formeln und Parameter stehen auf der [Methodik-Seite](/de/methodik/).

## Jeder Verein hat ein Rating

Grundlage ist ein Elo-Rating, dasselbe Prinzip, mit dem im Schach Spieler bewertet werden. Jeder Verein hat eine Zahl. Je größer der Abstand zwischen zwei Vereinen, desto wahrscheinlicher gewinnt der stärkere: 100 Punkte Vorsprung entsprechen einem Erwartungswert von etwa 64 %.

Nach jedem Spiel bewegen sich beide Ratings in Richtung des Ergebnisses. Was ein Verein gewinnt, verliert der andere. Drei Regeln bestimmen, wie stark:

- **Überraschung:** Ein erwarteter Sieg verändert wenig, eine Überraschung viel.
- **Heimvorteil:** Die Heimmannschaft bekommt bei der Berechnung der Chancen 65 Punkte dazu.
- **Höhe des Sieges:** Ein Sieg mit zwei Toren zählt 1,5-mal so viel wie einer mit einem Tor, höhere Siege noch mehr.

### Ein Rechenbeispiel

Zwei gleich starke Vereine treffen aufeinander. Dank Heimvorteil liegt der Erwartungswert der Gastgeber bei etwa 59 %. Gewinnen sie 1:0, bekommen sie rund 8 Punkte, die Gäste verlieren 8.

Nun liegt das Heimteam 135 Punkte vorn, mit Heimvorteil also 200 Punkte, und hat einen Erwartungswert von 76 %. Gewinnen die Gäste 1:0, nehmen sie den Gastgebern etwa 15 Punkte ab. Bei einem 3:0 sind es etwa 27 Punkte. Überraschungen bewegen die Ratings am stärksten.

## Vereine über Ligagrenzen vergleichen

Innerhalb einer Liga spielt jeder gegen jeden, die Ratings sind also gut miteinander verbunden. Zwischen den Ligen nicht: Bayern und Arsenal treffen sich nur im Europapokal. Aus Ligaspielen allein lässt sich nicht ablesen, ob 80 Punkte in der Bundesliga mehr oder weniger wert sind als 80 Punkte in der Premier League.

Deshalb enthält jedes Rating eine **Ligastärke**, die sich alle Vereine einer Liga teilen.

- **Wo sie startet:** Bei den offiziellen UEFA-Verbandskoeffizienten, die fünf Saisons Europapokal zusammenfassen. Jeder Koeffizientenpunkt über oder unter dem Schnitt der sieben Ligen ist 2 Ratingpunkte wert. Die Premier League startet etwa 58 Punkte über dem Schnitt, die Eredivisie etwa 45 darunter.
- **Wie sie sich ändert:** Jedes Champions-League-Spiel zwischen Vereinen aus zwei verschiedenen abgedeckten Ligen verschiebt beide Ligastärken. Schlägt ein portugiesischer Verein einen englischen, gewinnt die ganze Primeira Liga ein wenig und die Premier League verliert ein wenig.
- **Was sie nie ändert:** Ligaspiele. Beide Teams teilen dieselbe Ligastärke, eine Liga kann sich also nicht selbst stärker machen.

Die Startwerte sind nur eine erste Annahme. Mit der Zeit entscheiden die Ergebnisse im Europapokal, wie stark jede Liga wirklich ist.

## Was beim Saisonwechsel passiert

Die Vereine fangen im Sommer nicht bei null an. Jeder behält die Hälfte seines Abstands zum Grundwert von 1500: Ein Verein, der die Saison mit 1700 beendet hat, startet mit 1600. Aufsteiger beginnen 50 Punkte unter dem Grundwert.

Warum die Hälfte? Wir haben jedes Spiel seit 2024/25 nachgerechnet und die Prognose vor jedem Anpfiff geprüft. Mit übernommenen Ratings wurden die Ergebnisse dieser Saison deutlich besser vorhergesagt als mit einem kompletten Neustart. Eine volle Übernahme war noch etwas genauer, hätte das Ranking aber zu lange von der Vorsaison bestimmen lassen.

## Vom Rating zur Prognose

Dieselben Ratings stecken hinter allen anderen Funktionen der Seite:

- **Spielprognosen:** Chancen auf Sieg, Remis und Niederlage für jedes Spiel, berechnet aus dem Rating-Abstand. Remis sind bei gleich starken Teams am wahrscheinlichsten.
- **Saisonprognosen:** Der Rest jeder Ligasaison wird 10.000-mal mit diesen Wahrscheinlichkeiten durchgespielt. Daraus ergeben sich die Chancen jedes Vereins auf Meisterschaft, die ersten vier Plätze oder den Abstieg.

Die Ergebnisse stammen von football-data.org, das Ranking wird mehrmals täglich aktualisiert. Die Berechnung ist deterministisch: Dieselben Ergebnisse ergeben immer dasselbe Ranking.

## Was das Modell nicht sieht

Das Ranking kennt nur Ergebnisse. Das macht es transparent, hat aber blinde Flecken:

- **Transfers und neue Trainer** zeigen sich erst, wenn sich die Ergebnisse ändern. Früh in der Saison stützen sich die Ratings daher noch auf die Vorsaison.
- **Verletzungen, Rotation und Expected Goals** fließen nicht ein.
- **Die Ligastärke** beruht pro Saison auf vergleichsweise wenigen Europapokalspielen.

Das Ranking ist also eine ehrliche Zusammenfassung der Ergebnisse, kein Scouting-Bericht. Wo dein Verein gerade steht, zeigt das [aktuelle Power-Ranking](/de/).

## Häufige Fragen

### Welche Ligen deckt das Footiqra Power-Ranking ab?

Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie und Primeira Liga.

### Wie oft wird das Ranking aktualisiert?

Mehrmals täglich, sobald neue Ergebnisse vorliegen.

### Kann ich Vereine aus verschiedenen Ligen vergleichen?

Ja. Jedes Rating enthält eine Ligastärke, die über Europapokalspiele geeicht wird. So stehen alle Vereine auf einer gemeinsamen Skala.

### Nutzt das Ranking Expected Goals oder Spielerdaten?

Nein. Es beruht nur auf Spielergebnissen, das hält es einfach und nachvollziehbar.

### Sind die Prognosen Wetttipps?

Nein. Sie sind statistische Schätzungen und dienen nur zur Information.
