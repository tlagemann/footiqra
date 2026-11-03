"use client";

import { useEffect, useRef, useState } from "react";
import { fmtChance, fmtPercent, INTL_LOCALE, type Locale } from "@/i18n";

export interface TitleRaceChartSeries {
  name: string;
  /** Title chance at every checkpoint, 0..1. */
  chances: number[];
}

/**
 * Categorical colours for up to five clubs, in fixed order (best club today
 * first). Defined in globals.css with separate light and dark values, checked
 * for colour-blind separation. Text never uses them; labels stay in text colour.
 */
const COLORS = [1, 2, 3, 4, 5].map((i) => `var(--series-${i})`);

const M = { top: 16, bottom: 30, left: 44 };
const LABEL_GAP = 18;

/**
 * Title chances over the season: one line per contender, a crosshair that snaps
 * to the nearest week and lists every club's chance at that moment.
 */
export function TitleRaceChart({
  times,
  played,
  series,
  locale,
  ariaLabel,
}: {
  times: number[];
  played: number[];
  series: TitleRaceChartSeries[];
  locale: Locale;
  ariaLabel: string;
}) {
  const de = locale === "de";
  const pct = (p: number) => fmtChance(locale, p);
  const figureRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [W, setW] = useState(800);
  const [active, setActive] = useState<number | null>(null);
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
  const H = narrow ? 240 : 300;
  const right = narrow
    ? 20
    : Math.max(96, 30 + 7.5 * Math.max(...series.map((s) => s.name.length + 5)));
  const t0 = times[0]!;
  const t1 = Math.max(times.at(-1)!, t0 + 86400000);
  const x = (t: number) => M.left + ((t - t0) / (t1 - t0)) * (W - M.left - right);
  const y = (p: number) => M.top + (1 - p) * (H - M.top - M.bottom);

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
    month: "long",
    timeZone: "UTC",
  });

  // End labels in text colour, spread so they never overlap.
  const last = times.length - 1;
  const labels = series
    .map((s, i) => ({ i, y: y(s.chances[last] ?? 0) }))
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < labels.length; k++) {
    labels[k]!.y = Math.max(labels[k]!.y, labels[k - 1]!.y + LABEL_GAP);
  }
  const overflow = (labels.at(-1)?.y ?? 0) - (H - M.bottom + 4);
  if (overflow > 0) for (const l of labels) l.y -= overflow;
  const labelY = new Map(labels.map((l) => [l.i, l.y]));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    times.forEach((t, i) => {
      if (Math.abs(x(t) - px) < Math.abs(x(times[best]!) - px)) best = i;
    });
    setActive(best);
  };

  const ranked =
    active === null
      ? []
      : series.map((s, i) => ({ s, i, c: s.chances[active] ?? 0 })).sort((a, b) => b.c - a.c);

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
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
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
              {fmtPercent(locale, Math.round(v * 100))}
            </text>
          </g>
        ))}
        {monthTicks.map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--muted)">
            {monthFmt.format(new Date(t))}
          </text>
        ))}
        {active !== null && (
          <line
            x1={x(times[active]!)}
            x2={x(times[active]!)}
            y1={M.top}
            y2={H - M.bottom}
            stroke="var(--muted)"
            strokeWidth="1"
          />
        )}
        {/* Draw the leader last, so it sits on top. */}
        {[...series.keys()].reverse().map((si) => {
          const s = series[si]!;
          const path = s.chances
            .map((c, i) => `${i === 0 ? "M" : "L"}${x(times[i]!).toFixed(1)},${y(c).toFixed(1)}`)
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
              {s.chances.map((c, i) =>
                i === last || i === active ? (
                  <circle
                    key={i}
                    cx={x(times[i]!)}
                    cy={y(c)}
                    r={i === active ? 5.5 : 4.5}
                    fill={COLORS[si]}
                    stroke="var(--background)"
                    strokeWidth="2"
                  />
                ) : null,
              )}
            </g>
          );
        })}
        {!narrow &&
          series.map((s, si) => (
            <g key={s.name}>
              <circle
                cx={W - right + 16}
                cy={labelY.get(si)}
                r="4"
                fill={COLORS[si]}
                aria-hidden="true"
              />
              <text
                x={W - right + 26}
                y={labelY.get(si)}
                dy="0.32em"
                fontSize="13"
                fontWeight="600"
                fill="var(--foreground)"
                className="tabular"
              >
                {s.name} {pct(s.chances[last] ?? 0)}
              </text>
            </g>
          ))}
      </svg>
      {narrow && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-semibold">
          {series.map((s, si) => (
            <li key={s.name} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: COLORS[si] }}
              />
              {s.name} <span className="tabular text-muted">{pct(s.chances[last] ?? 0)}</span>
            </li>
          ))}
        </ul>
      )}
      {active !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-56 -translate-x-1/2 rounded-2xl border border-line/70 bg-background px-4 py-3 text-sm shadow-lg shadow-black/5"
          style={{
            left: `clamp(7rem, ${(x(times[active]!) / W) * 100}%, calc(100% - 7rem))`,
          }}
        >
          <p className="font-semibold">
            {active === last
              ? de
                ? "Heute"
                : "Today"
              : active === 0 && played[0] === 0
                ? de
                  ? "Vor dem 1. Spieltag"
                  : "Before the first matchday"
                : dayFmt.format(new Date(times[active]!))}
          </p>
          <p className="text-muted">
            {de ? `${played[active]} Spiele gespielt` : `${played[active]} matches played`}
          </p>
          <ul className="mt-2 space-y-1">
            {ranked.map(({ s, i, c }) => (
              <li key={s.name} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: COLORS[i] }}
                />
                <span className="truncate">{s.name}</span>
                <span className="tabular ml-auto font-semibold">{pct(c)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
