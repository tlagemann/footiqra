---
title: Why League Strength Matters in Football Rankings
description: A win is not just a win: why the same result counts for more in some leagues, and how Footiqra measures league strength.
published: 2026-11-09
draft: true
---

Every league gives three points for a win. That makes tables easy to read, but it hides a simple fact: winning in the Premier League is harder than winning in the Eredivisie. Any ranking that compares clubs across leagues has to account for that, and that is what league strength does.

## The problem: leagues are islands

Inside a league, every club plays every other club twice. Results connect all of them, so it is easy to tell who is stronger. Between leagues there is almost no connection. Bayern and Arsenal never meet in the Bundesliga or the Premier League, only in Europe, and only if the draw puts them together.

A club that wins its league comfortably might be the best team in Europe, or simply the best team in a weaker league. Domestic results alone cannot tell the difference.

## The solution: a strength value per league

Footiqra gives every league a **league strength** value, shared by all its clubs. A club's rating in the ranking is its own team rating plus that value. Two clubs with the same team rating can therefore end up far apart in the ranking if their leagues differ in strength.

Here is what that means in practice. At the start, UEFA coefficients put the Premier League about 58 points above average and the Eredivisie about 45 below. Take two clubs with the same team rating, one from each league. On neutral ground the Premier League side would be about 103 points stronger, which means an expected score of around 64%.

## How league strength is measured

League strength starts from UEFA's association coefficients and then follows results in Europe:

- **Only cross-league matches count.** When a club from one covered league plays a club from another in the Champions League, both league strengths move. A Portuguese win over an English club lifts the whole Primeira Liga a little and lowers the Premier League a little.
- **Domestic matches never change it.** Both clubs share the same league strength, so a league cannot inflate itself.
- **Steps are smaller than for clubs.** One result says more about two clubs than about two whole leagues. The base step is 12 points for a league and 20 for a club, both scaled by how surprising the result was.

## Why this is hard to get right

The weakness of any league comparison is the small number of matches. By early November 2026, only around 25 matches this season had connected two of the seven covered leagues. That is why Footiqra keeps league strength from season to season instead of starting fresh, and why the UEFA coefficients serve as a sensible first guess.

It also means league strength changes slowly. A single shock result in Europe nudges it; a whole autumn of results moves it clearly.

## Where league strength shows up on Footiqra

- **[Power ranking](/):** Every rating includes it, so you can compare Arsenal with Bayern or PSV with Sporting.
- **[Match forecasts](/predictions/):** Champions League forecasts between leagues depend on it directly.
- **[Scorer power ranking](/top-scorers/power-ranking/):** Goals are weighted by the strength of the league they were scored in.
- **[Leagues overview](/leagues/):** Shows the current strength of all seven leagues.

To see how the seven leagues compare today, read [which is Europe's strongest league right now](/blog/strongest-league-in-europe/).

## FAQ

### Is league strength the same as the UEFA coefficient?

No. The UEFA coefficient is only the starting point. After that, Footiqra's league strength moves with every European match between covered leagues.

### Can a league become stronger by winning domestic matches?

No. Domestic matches never change league strength, because both teams share it.

### Why not just use the UEFA coefficient?

It changes once per season and sums up five years. Footiqra's league strength reacts after every European match, so it reflects current form faster.
