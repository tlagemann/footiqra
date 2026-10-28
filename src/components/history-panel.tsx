"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { RankPoint, RatingPoint } from "@/data";
import { fmtDecimal, INTL_LOCALE, tr, type Locale } from "@/i18n";

const M = { top: 20, right: 52, bottom: 30, left: 44 };
const DAY = 86400000;

const COMPETITION: Record<string, string> = {
  PL: "Premier League",
  PD: "La Liga",
  SA: "Serie A",
  BL1: "Bundesliga",
  FL1: "Ligue 1",
  PPL: "Primeira Liga",
  DED: "Eredivisie",
  CL: "Champions League",
};

const dateLabelFor = (locale: Locale) => (iso: string) =>
  new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
const signedRatingFor = (locale: Locale) => (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : "±"}${fmtDecimal(locale, Math.abs(n), 1)}`;

function niceStep(range: number, targetTicks = 4): number {
  const raw = range / targetTicks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
}

interface ChartPoint {
  t: number;
  y: number;
  marker: boolean;
}

/** Single-series time line in real pixels, with crosshair and tooltip. */
function LineChart({
  points,
  invert,
  formatY,
  reference,
  endLabel,
  ariaLabel,
  tooltip,
  locale,
}: {
  locale: Locale;
  points: ChartPoint[];
  /** Smaller values at the top (rankings). */
  invert: boolean;
  formatY: (v: number) => string;
  reference?: { value: number; label: string };
  endLabel: string;
  ariaLabel: string;
  tooltip: (index: number) => ReactNode;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [W, setW] = useState(800);
  useEffect(() => {
    const el = figureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setW(Math.max(280, Math.round(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 560 ? 220 : 260;

  const t0 = points[0]!.t;
  const t1 = Math.max(points.at(-1)!.t, t0 + DAY);
  const values = points.map((p) => p.y).concat(reference ? [reference.value] : []);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const step = niceStep(Math.max(invert ? 8 : 40, hi - lo));
  let yMin = Math.floor((lo - step / 4) / step) * step;
  const yMax = Math.ceil((hi + step / 4) / step) * step;
  if (invert) yMin = Math.max(yMin, 0);

  const x = (t: number) => M.left + ((t - t0) / (t1 - t0)) * (W - M.left - M.right);
  const frac = (v: number) => (v - yMin) / (yMax - yMin);
  const y = (v: number) => M.top + (invert ? frac(v) : 1 - frac(v)) * (H - M.top - M.bottom);
  const xs = points.map((p) => x(p.t));
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xs[i]!.toFixed(1)},${y(p.y).toFixed(1)}`)
    .join("");

  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 0.001; v += step) yTicks.push(v);
  const visibleTicks = invert ? yTicks.map((v) => Math.max(1, v)) : yTicks;
  const monthTicks: number[] = [];
  const d = new Date(t0);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  while (d.getTime() <= t1) {
    monthTicks.push(d.getTime());
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  const tickEvery = W < 560 && monthTicks.length > 5 ? 2 : 1;
  const last = points.length - 1;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < xs.length; i++) {
      if (Math.abs(xs[i]! - px) < Math.abs(xs[best]! - px)) best = i;
    }
    setActive(best);
  };

  return (
    <div ref={figureRef} className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block h-auto w-full touch-pan-y select-none"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
      >
        {visibleTicks.map((v, i) => (
          <g key={`${v}-${i}`}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text
              x={M.left - 10}
              y={y(v)}
              dy="0.32em"
              textAnchor="end"
              fontSize="12"
              fill="var(--muted)"
              className="tabular"
            >
              {formatY(v)}
            </text>
          </g>
        ))}
        {monthTicks
          .filter((_, i) => i % tickEvery === 0)
          .map((t) => (
            <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--muted)">
              {new Intl.DateTimeFormat(INTL_LOCALE[locale], {
                month: "short",
                timeZone: "UTC",
              }).format(new Date(t))}
            </text>
          ))}
        {reference && (
          <>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(reference.value)}
              y2={y(reference.value)}
              stroke="var(--muted)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.7"
            />
            <text
              x={W - M.right + 6}
              y={y(reference.value)}
              dy="0.32em"
              fontSize="11"
              fill="var(--muted)"
            >
              {reference.label}
            </text>
          </>
        )}
        {active !== null && (
          <line
            x1={xs[active]}
            x2={xs[active]}
            y1={M.top}
            y2={H - M.bottom}
            stroke="var(--muted)"
            strokeWidth="1"
          />
        )}
        <path
          d={path}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) =>
          p.marker || i === last ? (
            <circle
              key={i}
              cx={xs[i]}
              cy={y(p.y)}
              r={i === active ? 6 : 4}
              fill={i === last ? "var(--brand)" : "var(--foreground)"}
              stroke="var(--surface)"
              strokeWidth="2"
            />
          ) : null,
        )}
        <text
          x={xs[last]! + 10}
          y={y(points[last]!.y)}
          dy="0.32em"
          fontSize="13"
          fontWeight="700"
          fill="var(--foreground)"
          className="tabular"
        >
          {endLabel}
        </text>
      </svg>
      {active !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-56 -translate-x-1/2 rounded-2xl border border-line/70 bg-background px-4 py-3 text-sm shadow-lg shadow-black/5"
          style={{ left: `clamp(7rem, ${(xs[active]! / W) * 100}%, calc(100% - 7rem))` }}
        >
          {tooltip(active)}
        </div>
      )}
    </div>
  );
}

function matchText(m: NonNullable<RatingPoint["match"]>, locale: Locale): string {
  const where = locale === "de" ? (m.home ? "gegen" : "bei") : m.home ? "vs" : "at";
  return `${where} ${m.opponent} ${m.goalsFor}:${m.goalsAgainst}`;
}

function RankChange({ change }: { change: number }) {
  if (change === 0) return <span className="text-muted">=</span>;
  return (
    <span className={`font-semibold ${change > 0 ? "text-positive" : "text-negative"}`}>
      {change > 0 ? "▲" : "▼"}
      {Math.abs(change)}
    </span>
  );
}

/**
 * Season history of a club: power ranking position per week (default) or
 * rating after every match, with key numbers, tooltip and a table view.
 */
export function HistoryPanel({
  teamName,
  ranks,
  ratings,
  locale = "en",
}: {
  teamName: string;
  ranks: RankPoint[];
  ratings: RatingPoint[];
  locale?: Locale;
}) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const dateLabel = dateLabelFor(locale);
  const signedRating = signedRatingFor(locale);
  const hasRanks = ranks.length >= 2;
  const [mode, setMode] = useState<"rank" | "rating">(hasRanks ? "rank" : "rating");
  if (ratings.length < 2 && !hasRanks) return null;

  const rankStats = hasRanks
    ? (() => {
        const best = Math.min(...ranks.map((r) => r.rank));
        const total = ranks[0]!.rank - ranks.at(-1)!.rank;
        return [
          { label: t("First week", "Erste Woche"), value: `#${ranks[0]!.rank}` },
          { label: t("Now", "Aktuell"), value: `#${ranks.at(-1)!.rank}` },
          { label: t("Best", "Bester Platz"), value: `#${best}` },
          {
            label: t("Change", "Veränderung"),
            value: total === 0 ? "=" : `${total > 0 ? "▲" : "▼"}${Math.abs(total)}`,
            tone: total > 0 ? "text-positive" : total < 0 ? "text-negative" : "",
          },
        ];
      })()
    : [];
  const ratingStats =
    ratings.length >= 2
      ? (() => {
          const values = ratings.map((p) => p.rating);
          const best = ratings.reduce((a, b) => (b.change > a.change ? b : a));
          return [
            { label: t("Season start", "Saisonstart"), value: String(Math.round(values[0]!)) },
            { label: t("Now", "Aktuell"), value: String(Math.round(values.at(-1)!)) },
            {
              label: t("Season high", "Saisonhoch"),
              value: String(Math.round(Math.max(...values))),
            },
            {
              label: t("Biggest gain", "Größter Sprung"),
              value: best.change > 0 ? `+${fmtDecimal(locale, best.change, 1)}` : "·",
              hint: best.match ? matchText(best.match, locale) : undefined,
            },
          ];
        })()
      : [];
  const stats: { label: string; value: string; hint?: string; tone?: string }[] =
    mode === "rank" ? rankStats : ratingStats;

  // The rating season start shares its date with the first match: draw it a little earlier.
  const ratingPoints: ChartPoint[] = ratings.map((p, i) => ({
    t:
      Date.parse(p.utcDate) -
      (i === 0 && p.kind === "start"
        ? Math.max(3 * DAY, (Date.parse(ratings.at(-1)!.utcDate) - Date.parse(p.utcDate)) * 0.04)
        : 0),
    y: p.rating,
    marker: p.kind !== "start",
  }));
  const rankPoints: ChartPoint[] = ranks.map((p) => ({
    t: Date.parse(p.utcDate),
    y: p.rank,
    marker: true,
  }));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <dl className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-xs font-medium text-muted">{s.label}</dt>
              <dd
                className={`tabular mt-0.5 font-display text-2xl font-extrabold tracking-[-0.03em] ${s.tone ?? ""}`}
              >
                {s.value}
              </dd>
              {s.hint && <dd className="truncate text-xs text-muted">{s.hint}</dd>}
            </div>
          ))}
        </dl>
        {hasRanks && ratings.length >= 2 && (
          <div
            role="group"
            aria-label={t("Chart view", "Diagrammansicht")}
            className="flex rounded-full bg-background p-1 text-sm font-semibold"
          >
            {(["rank", "rating"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-4 py-1.5 transition ${
                  mode === m ? "bg-foreground text-inverse" : "text-muted hover:text-foreground"
                }`}
              >
                {m === "rank" ? t("Rank", "Platz") : "Rating"}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === "rank" && hasRanks ? (
        <LineChart
          key="rank"
          locale={locale}
          points={rankPoints}
          invert
          formatY={(v) => `#${v}`}
          endLabel={`#${ranks.at(-1)!.rank}`}
          ariaLabel={
            locale === "de"
              ? `${teamName}: Platz im Power-Ranking nach Wochen, von ${ranks[0]!.rank} auf ${ranks.at(-1)!.rank}`
              : `${teamName} power ranking position by week: from ${ranks[0]!.rank} to ${ranks.at(-1)!.rank}`
          }
          tooltip={(i) => {
            const p = ranks[i]!;
            return (
              <>
                <p className="text-xs font-medium text-muted">
                  {p.kind === "today"
                    ? t("Today", "Heute")
                    : `${t("Week to", "Woche bis")} ${dateLabel(p.utcDate)}`}
                </p>
                <p className="mt-1">
                  <span className="font-display text-lg font-extrabold">#{p.rank}</span>{" "}
                  {i > 0 && <RankChange change={p.change} />}
                </p>
                <p className="tabular text-muted">Rating {Math.round(p.rating)}</p>
              </>
            );
          }}
        />
      ) : (
        <LineChart
          key="rating"
          locale={locale}
          points={ratingPoints}
          invert={false}
          formatY={(v) => String(v)}
          reference={{ value: ratings[0]!.rating, label: t("start", "Start") }}
          endLabel={String(Math.round(ratings.at(-1)!.rating))}
          ariaLabel={
            locale === "de"
              ? `${teamName}: Rating in dieser Saison, von ${Math.round(ratings[0]!.rating)} auf ${Math.round(ratings.at(-1)!.rating)}`
              : `${teamName} rating this season: from ${Math.round(ratings[0]!.rating)} to ${Math.round(ratings.at(-1)!.rating)}`
          }
          tooltip={(i) => {
            const p = ratings[i]!;
            return (
              <>
                <p className="text-xs font-medium text-muted">
                  {dateLabel(p.utcDate)}
                  {p.match ? ` · ${COMPETITION[p.match.competition] ?? p.match.competition}` : ""}
                </p>
                <p className="mt-1 font-semibold">
                  {p.kind === "today"
                    ? t("Today (league strength changed)", "Heute (Ligastärke verändert)")
                    : p.match
                      ? matchText(p.match, locale)
                      : t("Season start", "Saisonstart")}
                </p>
                <p className="tabular mt-1">
                  Rating <span className="font-display font-extrabold">{Math.round(p.rating)}</span>
                  {p.kind !== "start" && (
                    <span
                      className={`ml-2 font-semibold ${
                        p.change > 0.05
                          ? "text-positive"
                          : p.change < -0.05
                            ? "text-negative"
                            : "text-muted"
                      }`}
                    >
                      {signedRating(p.change)}
                    </span>
                  )}
                </p>
              </>
            );
          }}
        />
      )}

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-foreground">
          {t("Show as table", "Als Tabelle anzeigen")}
        </summary>
        <div className="mt-3 grid gap-6 lg:grid-cols-2">
          {hasRanks && (
            <table className="w-full text-left">
              <caption className="mb-2 text-left text-xs font-semibold text-muted uppercase">
                {t("Power ranking by week", "Power-Ranking nach Wochen")}
              </caption>
              <thead className="text-xs text-muted uppercase">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("Week to", "Woche bis")}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    {t("Rank", "Platz")}
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    {t("Change", "Veränderung")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranks.map((p, i) => (
                  <tr key={i} className="border-t border-line/80">
                    <td className="tabular py-2 pr-3">
                      {p.kind === "today" ? t("Today", "Heute") : dateLabel(p.utcDate)}
                    </td>
                    <td className="tabular py-2 pr-3 text-right font-semibold">#{p.rank}</td>
                    <td className="tabular py-2 text-right">
                      {i > 0 && <RankChange change={p.change} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {ratings.length >= 2 && (
            <table className="w-full text-left">
              <caption className="mb-2 text-left text-xs font-semibold text-muted uppercase">
                {t("Rating after each match", "Rating nach jedem Spiel")}
              </caption>
              <thead className="text-xs text-muted uppercase">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("Date", "Datum")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("Match", "Spiel")}
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Rating
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    {t("Change", "Veränderung")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((p, i) => (
                  <tr key={i} className="border-t border-line/80">
                    <td className="tabular py-2 pr-3 whitespace-nowrap">{dateLabel(p.utcDate)}</td>
                    <td className="py-2 pr-3">
                      {p.kind === "today"
                        ? t("Today (league strength changed)", "Heute (Ligastärke verändert)")
                        : p.match
                          ? matchText(p.match, locale)
                          : t("Season start", "Saisonstart")}
                    </td>
                    <td className="tabular py-2 pr-3 text-right font-semibold">
                      {Math.round(p.rating)}
                    </td>
                    <td className="tabular py-2 text-right">
                      {p.kind === "start" ? "" : signedRating(p.change)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </details>
    </div>
  );
}
