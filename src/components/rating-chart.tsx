"use client";

import { useEffect, useRef, useState } from "react";
import type { RatingPoint } from "@/data";

const M = { top: 20, right: 52, bottom: 30, left: 44 };

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

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(iso),
  );

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(1)}`;

function niceStep(range: number): number {
  const raw = range / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
}

/**
 * Rating after every match of the season as a single line.
 * The SVG is complete without JavaScript; hovering adds a crosshair and
 * a tooltip with the match behind each point.
 */
export function RatingChart({ points, teamName }: { points: RatingPoint[]; teamName: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const figureRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<number | null>(null);
  // Draw in real pixels so labels keep their size on small screens.
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
  if (points.length < 2) return null;
  const H = W < 560 ? 220 : 260;

  const times = points.map((p) => Date.parse(p.utcDate));
  // The season start shares its date with the first match: draw it a little earlier.
  const span = Math.max(times.at(-1)! - times[0]!, 86400000);
  if (points[0]!.kind === "start") times[0] = times[0]! - Math.max(3 * 86400000, span * 0.04);
  const t0 = times[0]!;
  const t1 = Math.max(times.at(-1)!, t0 + 86400000);
  const ratings = points.map((p) => p.rating);
  const step = niceStep(Math.max(40, Math.max(...ratings) - Math.min(...ratings)));
  const yMin = Math.floor((Math.min(...ratings) - step / 4) / step) * step;
  const yMax = Math.ceil((Math.max(...ratings) + step / 4) / step) * step;

  const x = (t: number) => M.left + ((t - t0) / (t1 - t0)) * (W - M.left - M.right);
  const y = (r: number) => M.top + ((yMax - r) / (yMax - yMin)) * (H - M.top - M.bottom);
  const xs = times.map(x);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xs[i]!.toFixed(1)},${y(p.rating).toFixed(1)}`)
    .join("");

  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 0.001; v += step) yTicks.push(v);
  const monthTicks: number[] = [];
  const d = new Date(t0);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() + 1);
  while (d.getTime() <= t1) {
    monthTicks.push(d.getTime());
    d.setUTCMonth(d.getUTCMonth() + 1);
  }

  const start = points[0]!.rating;
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

  const a = active === null ? null : points[active]!;
  const tooltipLeft = active === null ? 0 : (xs[active]! / W) * 100;
  const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
  const tickEvery = W < 560 && monthTicks.length > 5 ? 2 : 1;

  return (
    <figure ref={figureRef} className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block h-auto w-full touch-pan-y select-none"
        role="img"
        aria-label={`${teamName} rating this season: from ${Math.round(start)} to ${Math.round(points[last]!.rating)}`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
      >
        {yTicks.map((v) => (
          <g key={v}>
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
              {v}
            </text>
          </g>
        ))}
        {monthTicks
          .filter((_, i) => i % tickEvery === 0)
          .map((t) => (
            <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--muted)">
              {monthFormat.format(new Date(t))}
            </text>
          ))}
        {/* Season start reference */}
        <line
          x1={M.left}
          x2={W - M.right}
          y1={y(start)}
          y2={y(start)}
          stroke="var(--muted)"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.7"
        />
        <text x={W - M.right + 6} y={y(start)} dy="0.32em" fontSize="11" fill="var(--muted)">
          start
        </text>

        {a && active !== null && (
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
          i === 0 ? null : (
            <circle
              key={i}
              cx={xs[i]}
              cy={y(p.rating)}
              r={i === active ? 6 : 4}
              fill={i === last ? "var(--brand)" : "var(--foreground)"}
              stroke="var(--surface)"
              strokeWidth="2"
            />
          ),
        )}
        <text
          x={xs[last]! + 10}
          y={y(points[last]!.rating)}
          dy="0.32em"
          fontSize="13"
          fontWeight="700"
          fill="var(--foreground)"
          className="tabular"
        >
          {Math.round(points[last]!.rating)}
        </text>
      </svg>

      {a && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-56 -translate-x-1/2 rounded-2xl border border-line/70 bg-background px-4 py-3 text-sm shadow-lg shadow-black/5"
          style={{ left: `clamp(7rem, ${tooltipLeft}%, calc(100% - 7rem))` }}
        >
          <p className="text-xs font-medium text-muted">
            {dateLabel(a.utcDate)}
            {a.match ? ` · ${COMPETITION[a.match.competition] ?? a.match.competition}` : ""}
          </p>
          {a.kind === "today" ? (
            <p className="mt-1 font-semibold">Today (league strength changed)</p>
          ) : a.match ? (
            <p className="mt-1 font-semibold">
              {a.match.home ? "vs" : "at"} {a.match.opponent}{" "}
              <span className="tabular">
                {a.match.goalsFor}:{a.match.goalsAgainst}
              </span>
            </p>
          ) : (
            <p className="mt-1 font-semibold">Season start</p>
          )}
          <p className="tabular mt-1">
            Rating <span className="font-display font-extrabold">{Math.round(a.rating)}</span>
            {a.kind !== "start" && (
              <span
                className={`ml-2 font-semibold ${a.change > 0.05 ? "text-positive" : a.change < -0.05 ? "text-negative" : "text-muted"}`}
              >
                {signed(a.change)}
              </span>
            )}
          </p>
        </div>
      )}

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-foreground">Show as table</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">{teamName} rating after each match</caption>
            <thead className="text-xs text-muted uppercase">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Date
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Match
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Rating
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Change
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={i} className="border-t border-line/80">
                  <td className="tabular py-2 pr-3 whitespace-nowrap">{dateLabel(p.utcDate)}</td>
                  <td className="py-2 pr-3">
                    {p.kind === "today"
                      ? "Today (league strength changed)"
                      : p.match
                        ? `${p.match.home ? "vs" : "at"} ${p.match.opponent} ${p.match.goalsFor}:${p.match.goalsAgainst}`
                        : "Season start"}
                  </td>
                  <td className="tabular py-2 pr-3 text-right font-semibold">
                    {Math.round(p.rating)}
                  </td>
                  <td className="tabular py-2 text-right">
                    {p.kind === "start" ? "" : signed(p.change)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
