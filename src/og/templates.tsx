import type { ImageResponse } from "next/og";
import { C, CrestImg, crestData, headline, ordinal, renderOg } from "./frame";

interface TeamLine {
  name: string;
  crest: string | null;
  value: string;
  sub?: string;
}

/** Title page with optional three clubs underneath (home, overview pages). */
export async function genericOg({
  eyebrow,
  title,
  subtitle,
  teams = [],
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  teams?: TeamLine[];
}): Promise<ImageResponse> {
  const crests = await Promise.all(teams.map((t) => crestData(t.crest)));
  return renderOg({
    eyebrow,
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ ...headline(teams.length > 0 ? 72 : 88), display: "flex", maxWidth: 1000 }}>
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 30,
              fontWeight: 500,
              color: C.muted,
              maxWidth: 980,
              display: "flex",
            }}
          >
            {subtitle}
          </div>
        )}
        {teams.length > 0 && (
          <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
            {teams.map((t, i) => (
              <div
                key={t.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  background: C.surface,
                  borderRadius: 28,
                  padding: "20px 26px",
                  flex: 1,
                }}
              >
                <CrestImg src={crests[i] ?? null} name={t.name} size={64} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 28, fontWeight: 700 }}>{t.name}</span>
                  <span style={{ ...headline(40), letterSpacing: -1.5 }}>{t.value}</span>
                  {t.sub && <span style={{ fontSize: 20, color: C.muted }}>{t.sub}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
  });
}

/** Team card: crest, name, power rank and rating, league and form. */
export async function teamOg({
  name,
  crest,
  league,
  rank,
  rating,
  tablePosition,
  form,
}: {
  name: string;
  crest: string | null;
  league: string;
  rank: number | null;
  rating: number | null;
  tablePosition: number | null;
  form: ("W" | "D" | "L")[];
}): Promise<ImageResponse> {
  const crestSrc = await crestData(crest);
  const formColor = { W: C.positive, D: C.neutral, L: C.negative };
  const stat = (label: string, value: string, dark = false) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: dark ? C.fg : C.surface,
        color: dark ? C.bg : C.fg,
        borderRadius: 28,
        padding: "20px 28px",
        minWidth: 220,
      }}
    >
      <span
        style={{
          fontSize: 22,
          fontWeight: 600,
          opacity: dark ? 0.7 : 1,
          color: dark ? C.bg : C.muted,
        }}
      >
        {label}
      </span>
      <span style={{ ...headline(56), letterSpacing: -2 }}>{value}</span>
    </div>
  );
  return renderOg({
    eyebrow: league,
    footer: "Power ranking, results and predictions",
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div
            style={{
              display: "flex",
              width: 150,
              height: 150,
              borderRadius: 40,
              background: C.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CrestImg src={crestSrc} name={name} size={104} />
          </div>
          <div style={{ ...headline(name.length > 22 ? 64 : 80), display: "flex", maxWidth: 900 }}>
            {name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "stretch" }}>
          {rank !== null && stat("Power rank", `#${rank}`, true)}
          {rating !== null && stat("Rating", String(Math.round(rating)))}
          {tablePosition !== null && stat("League position", ordinal(tablePosition))}
          {form.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: C.surface,
                borderRadius: 28,
                padding: "20px 28px",
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 600, color: C.muted }}>Form</span>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                {form.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: formColor[f],
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      fontWeight: 700,
                    }}
                  >
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    ),
  });
}

/** Match card: both crests, score or forecast bar, date and competition. */
export async function matchOg({
  competition,
  dateLabel,
  home,
  away,
  score,
  percentages,
  forecastLabel,
}: {
  competition: string;
  dateLabel: string;
  home: { name: string; crest: string | null };
  away: { name: string; crest: string | null };
  score: string | null;
  percentages: { home: number; draw: number; away: number } | null;
  forecastLabel: string;
}): Promise<ImageResponse> {
  const [hc, ac] = await Promise.all([crestData(home.crest), crestData(away.crest)]);
  const side = (t: { name: string }, src: string | null) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        width: 360,
      }}
    >
      <CrestImg src={src} name={t.name} size={150} />
      <span
        style={{ ...headline(t.name.length > 14 ? 40 : 50), textAlign: "center", display: "flex" }}
      >
        {t.name}
      </span>
    </div>
  );
  const p = percentages;
  return renderOg({
    eyebrow: `${competition} · ${dateLabel}`,
    footer: score ? "Result, stats and pre-match forecast" : "Prediction, stats and form",
    children: (
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {side(home, hc)}
          <div
            style={{
              display: "flex",
              ...headline(score ? 120 : 64),
              color: score ? C.fg : C.muted,
            }}
          >
            {score ?? "vs"}
          </div>
          {side(away, ac)}
        </div>
        {p && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{ display: "flex", gap: 4, height: 18, borderRadius: 18, overflow: "hidden" }}
            >
              <div style={{ width: `${p.home}%`, background: C.fg }} />
              <div style={{ width: `${p.draw}%`, background: C.neutral }} />
              <div style={{ width: `${p.away}%`, background: C.brand }} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              <span>
                {p.home}%{" "}
                <span style={{ color: C.muted, fontWeight: 500, marginLeft: 8 }}>{home.name}</span>
              </span>
              <span>
                {p.draw}%{" "}
                <span style={{ color: C.muted, fontWeight: 500, marginLeft: 8 }}>draw</span>
              </span>
              <span>
                {p.away}%{" "}
                <span style={{ color: C.muted, fontWeight: 500, marginLeft: 8 }}>{away.name}</span>
              </span>
            </div>
            <span style={{ fontSize: 20, color: C.muted }}>{forecastLabel}</span>
          </div>
        )}
      </div>
    ),
  });
}
