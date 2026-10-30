# Instagram

Account: https://www.instagram.com/footiqra/ (language: English). The link in the bio points to https://footiqra.com.

## Generate graphics and captions

```bash
npm run instagram                      # weekly set: top10, leagues, weekend
npm run instagram -- methodology       # evergreen carousel "How the ranking works"
npm run instagram -- top10 weekend     # single posts
npm run instagram -- match             # biggest game of the week in detail (5 slides)
npm run instagram -- match --match=<match-slug>   # a specific match
```

Output lands in `instagram-out/` (git-ignored): 1080x1350 PNGs plus `captions.md` with ready English captions.
The numbers come from the same data layer as the website, so run it right before posting.

The script needs a Chromium. Set `CHROME_PATH=/path/to/chrome`, or install one with `npx playwright-core install chromium`.

Slide layouts live in `scripts/instagram/` (`styles.ts`, `slides.ts`), captions in `scripts/instagram.ts`.

## Rules

- Check that the active Instagram account is `footiqra` before posting.
- Review every number in `captions.md` against the site before posting.
- Only real data. No invented stats, no screenshots of other people's content.
- Max 8 to 10 hashtags, mixed broad and specific.

## Weekly rhythm

| Day      | Post                        | Command   |
| -------- | --------------------------- | --------- |
| Tuesday  | Top 10 carousel             | `top10`   |
| Thursday | Best club per league        | `leagues` |
| Friday   | Weekend forecast            | `weekend` |
| Sunday   | Story or reel (free choice) | manual    |

Best posting time is evening in Central Europe. Reply to every comment within the first hour.

## Two-week plan

**Week 1**

1. Mon: pin the methodology post ("How the Footiqra ranking works") in the app.
2. Tue: Top 10 carousel.
3. Thu: Best club per league.
4. Fri: Weekend forecast.
5. Sun: Poll story "Which club is overrated in the Top 10?"

**Week 2**

1. Tue: Top 10 carousel (new numbers). Add a line on who moved.
2. Wed: Single graphic "Biggest Elo gap in the Premier League", built from the ranking page.
3. Thu: Best club per league.
4. Fri: Weekend forecast, plus a Monday follow-up comparing forecast and result.
5. Sun: Reel idea: ranking bars growing from 1500 to today (needs 7+ days of history).

Once seven days of rating history exist, add a weekly "Risers and fallers" post. `getWeekAgo` returns data from then on.

## Caption template

```
<One-line hook with a number> <emoji>

<Two sentences with the finding and why it matters.>

Full ranking, forecasts and projections: link in bio.

#football #footballanalytics <league tags>
```
