---
title: How Accurate Are Our Football Predictions? We Checked Every One
description: We replayed 5,614 matches and compared every Footiqra forecast with the result. When we say 70%, here is how often it really happens.
published: 2026-11-05
---

Every match on Footiqra comes with a forecast: the chances of a home win, a draw and an away win. But a percentage is only worth something if it holds up. So we checked.

We replayed every match since the start of the 2024/25 season, **5,614 games** up to early November 2026: league matches in all seven leagues we cover plus European matches between their clubs. For each one we took the forecast the model would have made before kick-off and compared it with what actually happened.

## Does 70% really mean 70%?

A good forecast is not one that is always right. It is one whose percentages match reality. If we give teams a 70% chance in hundreds of matches, roughly 70% of them should win.

Here is every win probability we gave, grouped in steps of 10 percentage points, against how often those teams actually won:

| Forecast win chance | Cases | Average forecast | Actually won |
| ------------------- | ----- | ---------------- | ------------ |
| 0 to 10%            | 162   | 7.9%             | 3.7%         |
| 10 to 20%           | 1,150 | 15.8%            | 14.3%        |
| 20 to 30%           | 2,435 | 25.5%            | 23.2%        |
| 30 to 40%           | 2,450 | 34.8%            | 33.3%        |
| 40 to 50%           | 2,338 | 45.1%            | 43.8%        |
| 50 to 60%           | 1,532 | 54.5%            | 55.2%        |
| 60 to 70%           | 772   | 64.6%            | 65.5%        |
| 70 to 80%           | 319   | 74.1%            | 74.9%        |
| 80 to 90%           | 66    | 83.3%            | 87.9%        |

Each match counts twice here, once for the home side and once for the away side. The four cases above 90% are too few to say anything and are left out.

**The forecasts hold up well.** In almost every group, the share of teams that actually won is within two percentage points of the forecast. Teams we rated at around 65% won 65.5% of the time. Teams at around 45% won 43.8%.

There is one small, consistent pattern: **favourites win slightly more often than predicted, underdogs slightly less.** Teams given more than 50% beat their forecast by about one point, teams below 50% fell short by one to two and a half points. Only in the extremes is the gap larger: big underdogs below 10% won just 3.7% of the time instead of 7.9%. The model is a little too generous to them.

## How often is the favourite right?

Looking only at clear favourites:

| Favourite's win chance | Matches | Favourite won |
| ---------------------- | ------- | ------------- |
| 50% or more            | 2,693   | 61.3%         |
| 60% or more            | 1,161   | 69.3%         |
| 70% or more            | 389     | 76.9%         |
| 80% or more            | 70      | 85.7%         |

That is the most useful way to read a forecast. **60% does not mean "will win".** It means the favourite fails to win about four times in ten. Even at 80%, one match in seven still ends in a draw or a defeat.

## The draw problem

Draws are the hardest outcome in football to predict. In our data, **24.7% of all matches ended level**, but the model never rates a draw as the single most likely outcome. Its draw chance peaks at about 25% for perfectly even matches, and in an even match a home win is always a little more likely because of [home advantage](/blog/home-advantage-in-football/).

That is not a flaw so much as football's nature: even when a draw is quite likely, it is rarely more likely than both a home and an away win. But it means draws are slightly underrated in close games. Where we gave a draw 20 to 25%, the match actually ended level 26.1% of the time.

## How often is the most likely outcome right?

If you simply backed whatever the model rated most likely, you would have been right in **51.5%** of the 5,614 matches. For comparison: always picking the home team would have been right 43.5% of the time.

The figure has improved each season:

| Season            | Matches | Most likely outcome happened |
| ----------------- | ------- | ---------------------------- |
| 2024/25           | 2,472   | 50.3%                        |
| 2025/26           | 2,467   | 52.2%                        |
| 2026/27 (to date) | 675     | 53.5%                        |

The main reason: 2024/25 is the first season in our data, so every club started from the same base rating plus its league's strength. It took months of results before the ratings sorted the clubs properly. Since then, each season starts with half of the previous season's rating carried over, as explained in [how the power ranking works](/blog/how-the-power-ranking-works/).

Is around 52% good? It sounds modest, but football is a low-scoring game with three possible outcomes and a lot of chance. No model, ours included, gets close to always being right.

## The biggest upsets

Low probabilities do come in. These are the results the model rated least likely, with the winner's chance before kick-off:

- **Bayern 1-2 Augsburg** (24 January 2026): Augsburg had a 5% chance of winning, the biggest upset in our data.
- **Bayern 2-3 Bochum** (8 March 2025): 6% for Bochum.
- **AVS 3-1 Porto** (10 May 2026): 8% for AVS.
- **Real Madrid 0-1 Getafe** (2 March 2026): 8% for Getafe.
- **Arsenal 0-1 West Ham** (22 February 2025): 9% for West Ham.

With 162 cases below 10%, a few such shocks are exactly what you would expect. Six of those teams won, in line with that group's 3.7% in the table above.

## The limits of this check

We want to be clear about one thing: this is a replay, not a record of forecasts published at the time. The model's settings, such as the size of rating changes, home advantage and the draw formula, were tuned on these same seasons. A model always looks a little better on the data it was tuned on. The real test is the matches still to come, and we will repeat this check as the season goes on.

## Where to find the forecasts

- **[Match predictions](/predictions/):** Win, draw and loss chances for every fixture in the next seven days.
- **[Title race](/title-race/):** The rest of each season simulated 10,000 times with these probabilities.
- **[Methodology](/methodology/):** The exact formulas behind the forecasts.

## FAQ

### How accurate are Footiqra's football predictions?

Over 5,614 matches since 2024/25, the most likely outcome happened in 51.5% of games. More importantly, the percentages match reality: teams given a 70 to 80% chance won 74.9% of the time, teams given 30 to 40% won 33.3% of the time.

### Why does the model never predict a draw?

Its draw chance never exceeds about 25%, and in any match at least one of the two wins is a little more likely than that. Draws still happen in about a quarter of all matches, so the forecast always shows them as a real possibility.

### What does a 60% win chance mean?

It means the team wins about six times out of ten in matches like this one, and fails to win about four times. In our data, favourites rated 60% or more won 69.3% of their matches.
