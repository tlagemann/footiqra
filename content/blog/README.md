# Blogbeiträge

Jeder Beitrag ist eine Markdown-Datei in diesem Ordner, eine Datei pro Sprache:

```
how-the-power-ranking-works.en.md   → footiqra.com/blog/how-the-power-ranking-works/
how-the-power-ranking-works.de.md   → footiqra.com/de/blog/how-the-power-ranking-works/ (optional)
```

Der Dateiname ohne Sprachendung ist die URL (nur Kleinbuchstaben, Zahlen, Bindestriche). Eine deutsche Fassung behält denselben Namen; dann verlinken sich beide Sprachen gegenseitig (hreflang, Sprachumschalter).

## Kopf jeder Datei

```
---
title: How the Footiqra Power Ranking Works
description: Ein bis zwei Sätze für Google und Social Media (50 bis 180 Zeichen).
published: 2026-11-09
updated: 2026-11-15
draft: true
---
```

- `updated` ist optional, für spätere Überarbeitungen.
- `draft: true` versteckt den Beitrag auf der Live-Seite; mit `npm run dev` ist er sichtbar. Zum Veröffentlichen die Zeile löschen oder auf `false` setzen.

## Text

- Normales Markdown. Überschriften beginnen bei `##`, denn der Titel ist schon die Hauptüberschrift.
- Interne Links relativ schreiben, z. B. `[methodology page](/methodology/)`.
- Ein Abschnitt `## FAQ` mit Fragen als `### Frage?` und der Antwort darunter wird automatisch als FAQ-Schema ausgegeben.

Blog-Link in Menü und Footer, Übersichtsseite, Sitemap, Social-Bild und Article-Schema entstehen automatisch, sobald mindestens ein Beitrag veröffentlicht ist. Die Live-Seite übernimmt neue Beiträge beim nächsten Update-Lauf (alle 3 Stunden) oder sofort über GitHub → Actions → „Update data and site“ → Run workflow.
