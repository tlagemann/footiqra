"use client";

import { useEffect, useRef, useState } from "react";
import { fmtDecimal, INTL_LOCALE, type Locale } from "@/i18n";

export interface TrendPoint {
  /** UTC milliseconds. */
  t: number;
  /** Rating, or power ranking position in rank mode. */
  value: number;
  /** Rating change, or places gained (positive = moved up) in rank mode. */
  change: number;
  /** "vs Bayern 2:1"; null for points without a match (weekly ranks, today). */
  match: string | null;
}

export interface TrendSeries {
  name: string;
  points: TrendPoint[];
}

const M = { top: 18, right: 112, bottom: 30, left: 48 };
const COLORS = ["var(--foreground)", "var(--brand)"] as const;

function niceStep(range: number, targetTicks = 4): number {
  const raw = range / targetTicks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
}

type Mode = "rating" | "rank";

/**
 * Both clubs of a match on one time axis: rating after each of their latest
 * matches, or their weekly power ranking position.
 */
export function MatchTrend({
  rating,
  rank,
  locale,
  names,
}: {
  rating: [TrendSeries, TrendSeries];
  rank: [TrendSeries, TrendSeries] | null;
  locale: Locale;
  /** Full club names for the accessible description. */
  names: [string, string];
}) {
  const [mode, setMode] = useState<Mode>("rating");
  const de = locale === "de";
  const active = mode === "rank" && rank ? "rank" : "rating";
  return (
    <div>
      {rank && (
        <div
          role="group"
          aria-label={de ? "Diagrammansicht" : "Chart view"}
          className="mb-4 inline-flex rounded-full bg-background p-1 text-sm font-semibold"
        >
          {(["rating", "rank"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={active === m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 transition ${
                active === m ? "bg-foreground text-inverse" : "text-muted hover:text-foreground"
              }`}
            >
              {m === "rating" ? "Rating" : de ? "Power-Ranking" : "Power ranking"}
            </button>
          ))}
        </div>
      )}
      <TrendChart
        key={active}
        mode={active}
        series={active === "rank" ? rank! : rating}
        locale={locale}
        ariaLabel={
          active === "rank"
            ? de
              ? `Platz von ${names[0]} und ${names[1]} im Footiqra Power-Ranking nach Wochen`
              : `Footiqra power ranking position of ${names[0]} and ${names[1]} by week`
            : de
              ? `Footiqra-Rating von ${names[0]} und ${names[1]} über die letzten Spiele`
              : `Footiqra rating of ${names[0]} and ${names[1]} over their latest matches`
        }
      />
    </div>
  );
}

function TrendChart({
  series,
  locale,
  ariaLabel,
  mode,
}: {
  series: [TrendSeries, TrendSeries];
  locale: Locale;
  ariaLabel: string;
  mode: Mode;
}) {
  const ranked = mode === "rank";
  const fmtValue = (v: number) => (ranked ? `#${Math.round(v)}` : `${Math.round(v)}`);
  const figureRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [W, setW] = useState(800);
  const [active, setActive] = useState<{ s: number; i: number } | null>(null);
  useEffect(() => {
    const el = figureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setW(Math.max(280, Math.round(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = W < 560;
  const H = narrow ? 220 : 260;
  // Room for the end labels ("Leverkusen 1558"), about 8 px per character at 13 px bold.
  const right = narrow
    ? 56
    : Math.max(M.right, 24 + 8 * Math.max(...series.map((s) => s.name.length + 5)));

  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return null;
  const t0 = Math.min(...all.map((p) => p.t));
  const t1 = Math.max(Math.max(...all.map((p) => p.t)), t0 + 86400000);
  const lo = Math.min(...all.map((p) => p.value));
  const hi = Math.max(...all.map((p) => p.value));
  const step = niceStep(Math.max(ranked ? 8 : 40, hi - lo));
  const yMin = ranked
    ? Math.max(0, Math.floor((lo - step / 4) / step) * step)
    : Math.floor((lo - step / 4) / step) * step;
  const yMax = Math.ceil((hi + step / 4) / step) * step;
  const x = (t: number) => M.left + ((t - t0) / (t1 - t0)) * (W - M.left - right);
  // Rank 1 at the top.
  const frac = (v: number) => (v - yMin) / (yMax - yMin);
  const y = (v: number) => M.top + (ranked ? frac(v) : 1 - frac(v)) * (H - M.top - M.bottom);

  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 0.001; v += step) yTicks.push(v);
  const monthTicks: number[] = [];
  const d = new Date(t0);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  while (d.getTime() <= t1) {
    monthTicks.push(d.getTime());
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  const monthFmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: "short",
    timeZone: "UTC",
  });
  const dayFmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  // End labels, pushed apart when the two lines finish close together.
  const ends = series.map((s) => {
    const last = s.points.at(-1);
    return last ? { x: x(last.t), y: y(last.value) } : null;
  });
  const labelY = ends.map((e) => e?.y ?? 0);
  if (ends[0] && ends[1] && Math.abs(labelY[0]! - labelY[1]!) < 30) {
    const mid = (labelY[0]! + labelY[1]!) / 2;
    const up = labelY[0]! <= labelY[1]! ? 0 : 1;
    labelY[up] = mid - 15;
    labelY[1 - up] = mid + 15;
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    let best = { s: -1, i: -1, d: Infinity };
    series.forEach((s, si) =>
      s.points.forEach((p, i) => {
        const dist = Math.abs(x(p.t) - px) + 0.35 * Math.abs(y(p.value) - py);
        if (dist < best.d) best = { s: si, i, d: dist };
      }),
    );
    setActive(best.s >= 0 ? { s: best.s, i: best.i } : null);
  };

  const activePoint = active ? series[active.s]!.points[active.i] : undefined;
  const signed = (n: number) =>
    `${n > 0 ? "+" : n < 0 ? "−" : "±"}${fmtDecimal(locale, Math.abs(n), 1)}`;

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
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={M.left}
              x2={W - right}
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
              {ranked ? `#${Math.max(1, Math.round(v))}` : Math.round(v)}
            </text>
          </g>
        ))}
        {monthTicks.map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--muted)">
            {monthFmt.format(new Date(t))}
          </text>
        ))}
        {activePoint && (
          <line
            x1={x(activePoint.t)}
            x2={x(activePoint.t)}
            y1={M.top}
            y2={H - M.bottom}
            stroke="var(--muted)"
            strokeWidth="1"
          />
        )}
        {series.map((s, si) => {
          const path = s.points
            .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`)
            .join("");
          return (
            <g key={s.name}>
              <path
                d={path}
                fill="none"
                stroke={COLORS[si]}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.points.map((p, i) => (
                <circle
                  key={i}
                  cx={x(p.t)}
                  cy={y(p.value)}
                  r={active?.s === si && active.i === i ? 6 : 3.5}
                  fill={COLORS[si]}
                  stroke="var(--surface)"
                  strokeWidth="2"
                />
              ))}
            </g>
          );
        })}
        {series.map((s, si) => {
          const end = ends[si];
          const last = s.points.at(-1);
          if (!end || !last) return null;
          return (
            <text
              key={s.name}
              x={end.x + 10}
              y={labelY[si]}
              dy="0.32em"
              fontSize="13"
              fontWeight="700"
              fill={COLORS[si]}
              className="tabular"
            >
              {narrow ? fmtValue(last.value) : `${s.name} ${fmtValue(last.value)}`}
            </text>
          );
        })}
      </svg>
      {narrow && (
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
          {series.map((s, si) => (
            <li key={s.name} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-[3px] w-5 rounded-full"
                style={{ background: COLORS[si] }}
              />
              {s.name}
            </li>
          ))}
        </ul>
      )}
      {active && activePoint && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-56 -translate-x-1/2 rounded-2xl border border-line/70 bg-background px-4 py-3 text-sm shadow-lg shadow-black/5"
          style={{
            left: `clamp(7rem, ${(x(activePoint.t) / W) * 100}%, calc(100% - 7rem))`,
          }}
        >
          <p className="font-semibold">{series[active.s]!.name}</p>
          <p className="text-muted">
            {ranked && !activePoint.match
              ? `${locale === "de" ? "Stand" : "As of"} ${dayFmt.format(new Date(activePoint.t))}`
              : dayFmt.format(new Date(activePoint.t))}
            {activePoint.match ? ` · ${activePoint.match}` : ""}
          </p>
          <p className="tabular mt-1 font-semibold">
            {ranked
              ? `${locale === "de" ? "Platz" : "Rank"} ${fmtValue(activePoint.value)}`
              : `Rating ${fmtValue(activePoint.value)}`}
            {activePoint.change !== 0 && (
              <span
                className={`ml-2 font-medium ${activePoint.change > 0 ? "text-positive" : "text-negative"}`}
              >
                {ranked
                  ? `${activePoint.change > 0 ? "▲" : "▼"} ${Math.abs(activePoint.change)}`
                  : signed(activePoint.change)}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
