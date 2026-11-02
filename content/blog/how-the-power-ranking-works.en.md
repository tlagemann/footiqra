---
title: How the Footiqra Power Ranking Works
description: How Footiqra ranks every club in Europe's top 7 leagues on one scale, using Elo ratings and league strength from European games.
published: 2026-11-02
---

Is Bayern stronger than Arsenal right now? League tables can't answer that, because the two clubs play in different competitions against different opponents. The Footiqra power ranking can: it rates every club in Europe's top seven leagues on one common scale, using nothing but match results.

This article explains how it works in plain language. If you want every formula and parameter, the [methodology page](/methodology/) documents the full model.

## Every club has a rating

The ranking is built on an Elo rating, the same idea chess uses to rank players. Every club has a number. The bigger the gap between two clubs, the more likely the stronger one is to win: a 100-point lead means an expected score of about 64%.

After each match, both ratings move towards the result. What one club gains, the other loses. Three rules decide how far they move:

- **Surprise:** A win the model expected changes little. An upset changes a lot.
- **Home advantage:** The home side gets 65 extra points when the model calculates its chances.
- **Margin of victory:** A two-goal win counts 1.5 times as much as a one-goal win, and bigger wins count more still.

### A worked example

Two equally rated clubs meet. Thanks to home advantage, the home side is expected to score about 59%. If it wins 1-0, it gains around 8 points and the visitors lose 8.

Now take a home side rated 135 points higher, so with home advantage it is 200 points ahead and expected to score 76%. If the visitors win 1-0, they take about 15 points off their hosts. If they win 3-0, it is about 27 points. Upsets are where ratings move most.

## Comparing clubs across leagues

Inside a league, everyone plays everyone, so ratings are well connected. Between leagues they are not: Bayern and Arsenal only meet in European competition. Domestic results alone can't tell you whether 80 points in the Bundesliga are worth more or less than 80 points in the Premier League.

That is why every club's rating includes a **league strength** value, shared by all clubs in the same league.

- **Where it starts:** From the official UEFA association coefficients, which sum up five seasons of European results. Each coefficient point above or below the average of the seven leagues is worth 2 rating points. The Premier League starts about 58 points above average, the Eredivisie about 45 below.
- **How it changes:** Every Champions League match between clubs from two different covered leagues also moves both league strengths. If a Portuguese club beats an English one, the whole Primeira Liga gains a little and the Premier League loses a little.
- **What never changes it:** Domestic matches. Both teams share the same league strength, so a league cannot talk itself up by beating itself.

The starting values are only a first guess. Over time, results in Europe decide how strong each league really is.

## What happens when a new season starts

Clubs are not reset to zero each summer. Every club keeps half of its distance from the base rating of 1500: a club that finished on 1700 starts the new season on 1600. Promoted clubs start 50 points below the base.

Why half? We replayed every match since 2024/25 and checked the forecast made before each one. Keeping ratings predicted this season's results clearly better than a full reset. Keeping them in full was slightly more accurate still, but let last season dominate the ranking for too long.

## From ratings to forecasts

The same ratings power the rest of the site:

- **Match forecasts:** Win, draw and loss chances for every fixture, calculated from the rating gap. Draws are most likely between evenly matched sides.
- **Season forecasts:** The rest of every league season is played 10,000 times with those probabilities, which gives each club's chances of winning the title, reaching the top four or going down.

Results come from football-data.org and the ranking updates several times a day. The calculation is deterministic: the same results always produce the same ranking.

## What the model can't see

The ranking only knows scores. That keeps it transparent, but it has blind spots:

- **Transfers and new coaches** only show up once results change, so early-season ratings still lean on last season.
- **Injuries, rotation and expected goals** are not part of the calculation.
- **League strength** rests on relatively few European matches per season.

Think of the ranking as an honest summary of results, not a scouting report. To see where your club stands right now, check the [current power ranking](/).

## FAQ

### Which leagues does the Footiqra power ranking cover?

The Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie and Primeira Liga.

### How often is the ranking updated?

Several times a day, as new results come in.

### Can I compare clubs from different leagues?

Yes. Every rating includes a league strength value calibrated by European matches, so all clubs sit on one common scale.

### Does the ranking use expected goals or player data?

No. It is based only on match results, which keeps it simple and transparent.

### Are the forecasts betting tips?

No. They are statistical estimates for information only.
