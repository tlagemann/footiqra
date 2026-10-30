"use client";

import { useEffect, useState } from "react";
import { CONSENT_STORAGE_KEY } from "@/config/analytics";
import { SOCIAL } from "@/config/site";
import { tr, type Locale } from "@/i18n";

/**
 * Small card in the corner inviting visitors to follow @footiqra on Instagram.
 *
 * - Appears only after the cookie choice was made, so it never stacks on the
 *   consent banner, and only once the visitor is engaged: after 20 seconds or
 *   half a page of scrolling.
 * - Closed: hidden for 30 days. Followed: never shown again.
 * - State lives in localStorage only; nothing is sent anywhere.
 */
const KEY = "footiqra-instagram-prompt";
const SNOOZE_DAYS = 30;
const DELAY_MS = 20_000;

function readState(): { followed?: boolean; closedAt?: number } {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

function writeState(state: { followed?: boolean; closedAt?: number }) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage blocked: the card simply comes back on the next visit.
  }
}

function consentDecided(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) !== null;
  } catch {
    return true;
  }
}

export function InstagramPrompt({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const t = (en: string, de: string) => tr(locale, en, de);

  useEffect(() => {
    const state = readState();
    if (state.followed) return;
    if (state.closedAt && Date.now() - state.closedAt < SNOOZE_DAYS * 24 * 3600 * 1000) return;

    let done = false;
    const show = () => {
      if (done || !consentDecided()) return;
      done = true;
      setOpen(true);
      cleanup();
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= 0.5) show();
    };
    const timer = window.setInterval(() => {
      if (performance.now() >= DELAY_MS) show();
    }, 2000);
    window.addEventListener("scroll", onScroll, { passive: true });
    function cleanup() {
      window.clearInterval(timer);
      window.removeEventListener("scroll", onScroll);
    }
    return cleanup;
  }, []);

  if (!open) return null;

  const close = () => {
    writeState({ closedAt: Date.now() });
    setOpen(false);
  };
  const follow = () => {
    writeState({ followed: true });
    setOpen(false);
  };

  return (
    <aside
      aria-label={t("Follow Footiqra on Instagram", "Footiqra auf Instagram folgen")}
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-sm rounded-3xl border border-line bg-background p-5 shadow-xl motion-safe:animate-[ig-in_.35s_ease-out] sm:inset-x-auto sm:right-5 sm:bottom-5"
    >
      <style>{`@keyframes ig-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>
      <button
        type="button"
        onClick={close}
        aria-label={t("Close", "Schließen")}
        className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className="flex items-start gap-4 pr-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-black">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
          </svg>
        </span>
        <div>
          <p className="font-display text-lg leading-tight font-extrabold tracking-[-0.02em]">
            {t("Follow Footiqra on Instagram", "Folge Footiqra auf Instagram")}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t(
              "Top matches, rankings and forecasts every week, so you never miss a thing.",
              "Topspiele, Rankings und Prognosen jede Woche, damit du nichts verpasst.",
            )}
          </p>
        </div>
      </div>
      <a
        href={SOCIAL.instagram.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={follow}
        className="mt-4 flex w-full items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-inverse transition hover:opacity-90"
      >
        {t("Follow @footiqra", "@footiqra folgen")}
      </a>
    </aside>
  );
}
