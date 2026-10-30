"use client";

import { useEffect, useRef, useState } from "react";
import { fmtDecimal, INTL_LOCALE, type Locale } from "@/i18n";

export interface TrendPoint {
  /** UTC milliseconds. */
  t: number;
  rating: number;
  change: number;
  /** "vs Bayern 2:1"; null for the current value without a match. */
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

/** Ratings of both clubs of a match over their latest matches, on one time axis. */
export function RatingTrend({
  series,
  locale,
  ariaLabel,
}: {
  series: [TrendSeries, TrendSeries];
  locale: Locale;
  ariaLabel: string;
}) {
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
  const right = narrow ? 92 : M.right;

  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return null;
  const t0 = Math.min(...all.map((p) => p.t));
  const t1 = Math.max(Math.max(...all.map((p) => p.t)), t0 + 86400000);
  const lo = Math.min(...all.map((p) => p.rating));
  const hi = Math.max(...all.map((p) => p.rating));
  const step = niceStep(Math.max(40, hi - lo));
  const yMin = Math.floor((lo - step / 4) / step) * step;
  const yMax = Math.ceil((hi + step / 4) / step) * step;
  const x = (t: number) => M.left + ((t - t0) / (t1 - t0)) * (W - M.left - right);
  const y = (v: number) => M.top + (1 - (v - yMin) / (yMax - yMin)) * (H - M.top - M.bottom);

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
    return last ? { x: x(last.t), y: y(last.rating) } : null;
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
        const dist = Math.abs(x(p.t) - px) + 0.35 * Math.abs(y(p.rating) - py);
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
              {Math.round(v)}
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
            .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.rating).toFixed(1)}`)
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
                  cy={y(p.rating)}
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
              {narrow ? Math.round(last.rating) : `${s.name} ${Math.round(last.rating)}`}
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
            {dayFmt.format(new Date(activePoint.t))}
            {activePoint.match ? ` · ${activePoint.match}` : ""}
          </p>
          <p className="tabular mt-1 font-semibold">
            Rating {Math.round(activePoint.rating)}
            {activePoint.change !== 0 && (
              <span
                className={`ml-2 font-medium ${activePoint.change > 0 ? "text-positive" : "text-negative"}`}
              >
                {signed(activePoint.change)}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
