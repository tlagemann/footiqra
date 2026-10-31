"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Crest } from "@/components/ui";
import { INTL_LOCALE, paths, tr, type Locale } from "@/i18n";
import { applyResults, type CalcFixture, type CalcTeam } from "@/lib/table-calc";

/**
 * Interactive table calculator: enter scores for the open fixtures, the table
 * updates at once. Entries stay in this browser (localStorage) and can be
 * shared as a link (#r=…); nothing is sent anywhere.
 */
type Entry = { home: string; away: string };
type Entries = Record<number, Entry>;

const storageKey = (league: string, season: number) => `footiqra-calc-${league}-${season}`;

const valid = (s: string) => /^\d{1,2}$/.test(s);

function encode(entries: Entries): string {
  return Object.entries(entries)
    .filter(([, e]) => valid(e.home) && valid(e.away))
    .map(([id, e]) => `${id}-${e.home}-${e.away}`)
    .join("~");
}

function decode(text: string, known: ReadonlySet<number>): Entries {
  const out: Entries = {};
  for (const part of text.split("~")) {
    const m = /^(\d+)-(\d{1,2})-(\d{1,2})$/.exec(part);
    if (m && known.has(Number(m[1]))) out[Number(m[1])] = { home: m[2]!, away: m[3]! };
  }
  return out;
}

export function TableCalculator({
  leagueSlug,
  season,
  teams,
  fixtures,
  locale,
}: {
  leagueSlug: string;
  season: number;
  teams: CalcTeam[];
  fixtures: CalcFixture[];
  locale: Locale;
}) {
  const t = (en: string, de: string) => tr(locale, en, de);
  const p = paths(locale);
  const [entries, setEntries] = useState<Entries>({});
  const [view, setView] = useState<"fixtures" | "table">("fixtures");
  const [shared, setShared] = useState<"idle" | "copied" | "failed">("idle");
  const [loaded, setLoaded] = useState(false);
  const known = useMemo(() => new Set(fixtures.map((f) => f.id)), [fixtures]);
  const byId = useMemo(() => new Map(teams.map((tm) => [tm.id, tm])), [teams]);
  const key = storageKey(leagueSlug, season);

  // Load once: a shared link wins over this browser's own entries.
  useEffect(() => {
    let initial: Entries = {};
    const hash = window.location.hash.match(/[#&]r=([^&]*)/);
    if (hash) {
      initial = decode(decodeURIComponent(hash[1]!), known);
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } else {
      try {
        initial = decode(window.localStorage.getItem(key) ?? "", known);
      } catch {
        // Storage blocked: start empty.
      }
    }
    setEntries(initial);
    setLoaded(true);
  }, [key, known]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(key, encode(entries));
    } catch {
      // Storage blocked: entries last for this visit only.
    }
  }, [entries, key, loaded]);

  const results = useMemo(() => {
    const map = new Map<number, { home: number; away: number }>();
    for (const [id, e] of Object.entries(entries)) {
      if (valid(e.home) && valid(e.away)) map.set(Number(id), { home: +e.home, away: +e.away });
    }
    return map;
  }, [entries]);
  const rows = useMemo(() => applyResults(teams, fixtures, results), [teams, fixtures, results]);

  const matchdays = useMemo(() => {
    const groups = new Map<number | null, CalcFixture[]>();
    for (const f of fixtures) groups.set(f.matchday, [...(groups.get(f.matchday) ?? []), f]);
    return [...groups];
  }, [fixtures]);

  const set = (id: number, side: "home" | "away", value: string) =>
    setEntries((prev) => {
      const cur = prev[id] ?? { home: "", away: "" };
      return { ...prev, [id]: { ...cur, [side]: value.replace(/\D/g, "").slice(0, 2) } };
    });
  const clear = (list: CalcFixture[]) =>
    setEntries((prev) => {
      const next = { ...prev };
      for (const f of list) delete next[f.id];
      return next;
    });

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#r=${encode(entries)}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ url, title: document.title });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared("copied");
    } catch {
      setShared("failed");
    }
    window.setTimeout(() => setShared("idle"), 2500);
  };

  /** Moves focus to the next score box after one digit, so a matchday is typed in one go. */
  const advance = (el: HTMLInputElement) => {
    const all = [...document.querySelectorAll<HTMLInputElement>("input[data-calc-score]")];
    all.at(all.indexOf(el) + 1)?.focus();
  };

  const day = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Berlin",
  });
  const done = results.size;
  const btn =
    "rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

  const table = (
    <div className="overflow-hidden rounded-3xl bg-surface">
      <table className="w-full text-[15px]">
        <caption className="sr-only">
          {t("Table after your results", "Tabelle nach deinen Ergebnissen")}
        </caption>
        <thead>
          <tr className="text-xs font-medium text-muted">
            <th scope="col" className="w-10 py-3 pl-4 text-left font-medium">
              #
            </th>
            <th scope="col" className="py-3 pr-2 text-left font-medium">
              {t("Club", "Verein")}
            </th>
            <th scope="col" className="px-1.5 py-3 text-right font-medium">
              {t("P", "Sp")}
            </th>
            <th scope="col" className="hidden px-1.5 py-3 text-right font-medium sm:table-cell">
              {t("W-D-L", "S-U-N")}
            </th>
            <th scope="col" className="hidden px-1.5 py-3 text-right font-medium sm:table-cell">
              {t("Goals", "Tore")}
            </th>
            <th scope="col" className="px-1.5 py-3 text-right font-medium">
              {t("GD", "Diff")}
            </th>
            <th scope="col" className="py-3 pr-4 pl-1.5 text-right font-medium">
              {t("Pts", "Pkt")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-t border-line/80">
              <td className="tabular py-2.5 pl-4 font-display font-bold">
                {i + 1}
                {r.change !== 0 && (
                  <span
                    className={`ml-1 text-[11px] font-semibold ${r.change > 0 ? "text-positive" : "text-negative"}`}
                    aria-label={
                      r.change > 0
                        ? t(`up ${r.change}`, `${r.change} hoch`)
                        : t(`down ${-r.change}`, `${-r.change} runter`)
                    }
                  >
                    {r.change > 0 ? "▲" : "▼"}
                    {Math.abs(r.change)}
                  </span>
                )}
              </td>
              <th scope="row" className="py-2.5 pr-2 text-left font-semibold">
                <span className="flex min-w-0 items-center gap-2">
                  <Crest src={r.crest} name={r.name} size={20} />
                  <span className="truncate">{r.name}</span>
                </span>
              </th>
              <td className="tabular px-1.5 py-2.5 text-right text-muted">{r.played}</td>
              <td className="tabular hidden px-1.5 py-2.5 text-right text-muted sm:table-cell">
                {r.won}-{r.drawn}-{r.lost}
              </td>
              <td className="tabular hidden px-1.5 py-2.5 text-right text-muted sm:table-cell">
                {r.goalsFor}:{r.goalsAgainst}
              </td>
              <td className="tabular px-1.5 py-2.5 text-right text-muted">
                {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
              </td>
              <td className="tabular py-2.5 pr-4 pl-1.5 text-right font-display text-lg font-extrabold">
                {r.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={share}
          disabled={done === 0}
          className={`${btn} bg-surface hover:bg-surface-strong`}
        >
          {shared === "copied"
            ? t("Link copied", "Link kopiert")
            : shared === "failed"
              ? t("Copy failed", "Kopieren fehlgeschlagen")
              : t("Share link", "Link teilen")}
        </button>
        <button
          type="button"
          onClick={() => clear(fixtures)}
          disabled={done === 0}
          className={`${btn} bg-surface hover:bg-surface-strong`}
        >
          {t("Reset all", "Alles zurücksetzen")}
        </button>
        <span className="tabular ml-auto text-sm text-muted" aria-live="polite">
          {t(
            `${done} of ${fixtures.length} matches entered`,
            `${done} von ${fixtures.length} Spielen eingetragen`,
          )}
        </span>
      </div>

      {/* Phones: switch between fixtures and table */}
      <div className="sticky top-16 z-10 -mx-4 mb-4 bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
        <div
          role="group"
          aria-label={t("View", "Ansicht")}
          className="flex rounded-full bg-surface p-1 text-sm font-semibold"
        >
          {(["fixtures", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => {
                setView(v);
                const top = document.getElementById("calc-views");
                if (top && top.getBoundingClientRect().top < 0) {
                  window.scrollTo({ top: window.scrollY + top.getBoundingClientRect().top - 140 });
                }
              }}
              className={`flex-1 rounded-full px-4 py-2 transition ${
                view === v ? "bg-foreground text-inverse" : "text-muted"
              }`}
            >
              {v === "fixtures" ? t("Results", "Ergebnisse") : t("Table", "Tabelle")}
            </button>
          ))}
        </div>
      </div>

      <div
        id="calc-views"
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start"
      >
        <div className={`space-y-3 ${view === "fixtures" ? "" : "hidden lg:block"}`}>
          {matchdays.map(([md, list], gi) => {
            const entered = list.filter((f) => results.has(f.id)).length;
            return (
              <details key={md ?? "none"} open={gi === 0} className="group rounded-3xl bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                  <span className="font-display text-lg font-extrabold tracking-[-0.02em]">
                    {md === null
                      ? t("Other matches", "Weitere Spiele")
                      : t(`Matchday ${md}`, `${md}. Spieltag`)}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular text-sm text-muted">
                      {entered}/{list.length}
                    </span>
                    <span
                      aria-hidden
                      className="text-xl text-muted transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <div className="px-3 pb-3 sm:px-4">
                  {entered > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2 px-2">
                      <button
                        type="button"
                        onClick={() => clear(list)}
                        className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-strong"
                      >
                        {t("Clear matchday", "Spieltag leeren")}
                      </button>
                    </div>
                  )}
                  <ul className="space-y-1.5">
                    {list.map((f) => {
                      const h = byId.get(f.homeId)!;
                      const a = byId.get(f.awayId)!;
                      const e = entries[f.id] ?? { home: "", away: "" };
                      const input = (side: "home" | "away") => (
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          data-calc-score
                          value={e[side]}
                          onChange={(ev) => {
                            set(f.id, side, ev.target.value);
                            if (/^\d$/.test(ev.target.value)) advance(ev.target);
                          }}
                          onFocus={(ev) => ev.target.select()}
                          aria-label={t(
                            `Goals ${side === "home" ? h.name : a.name} vs ${side === "home" ? a.name : h.name}`,
                            `Tore ${side === "home" ? h.name : a.name} gegen ${side === "home" ? a.name : h.name}`,
                          )}
                          placeholder="·"
                          className="tabular h-10 w-10 rounded-xl border border-line bg-background text-center font-display text-lg font-extrabold outline-none placeholder:text-muted focus:border-foreground"
                        />
                      );
                      return (
                        <li key={f.id} className="rounded-2xl bg-background px-3 py-2.5">
                          <div className="mb-1.5 flex items-center gap-2 text-xs text-muted">
                            <span>{day.format(new Date(f.utcDate))}</span>
                            {f.status === "POSTPONED" && (
                              <span className="font-semibold">{t("postponed", "verlegt")}</span>
                            )}
                            {f.slug && (
                              <Link
                                href={p.match(f.slug)}
                                className="hover:text-foreground hover:underline"
                              >
                                {t("Preview", "Vorschau")}
                              </Link>
                            )}
                          </div>
                          <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-1.5 text-[15px] sm:gap-2">
                            <span className="flex min-w-0 items-center justify-end gap-2 text-right font-semibold">
                              <span className="truncate">{h.name}</span>
                              <Crest
                                src={h.crest}
                                name={h.name}
                                size={22}
                                className="hidden sm:block"
                              />
                            </span>
                            {input("home")}
                            <span className="font-display font-extrabold text-muted">:</span>
                            {input("away")}
                            <span className="flex min-w-0 items-center gap-2 font-semibold">
                              <Crest
                                src={a.crest}
                                name={a.name}
                                size={22}
                                className="hidden sm:block"
                              />
                              <span className="truncate">{a.name}</span>
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </details>
            );
          })}
        </div>

        <div
          className={`lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain ${view === "table" ? "" : "hidden lg:block"}`}
        >
          {table}
          <p className="mt-3 text-sm text-muted">
            {t(
              "▲▼: places compared with the current table. Ties are split by goal difference, then goals scored; head-to-head rules are not applied.",
              "▲▼: Plätze im Vergleich zur aktuellen Tabelle. Bei Punktgleichheit entscheiden Tordifferenz, dann erzielte Tore; der direkte Vergleich wird nicht angewendet.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
