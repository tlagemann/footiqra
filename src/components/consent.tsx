"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CONSENT_STORAGE_KEY,
  GA_COOKIE_EXPIRES_SECONDS,
  GA_MEASUREMENT_ID,
  OPEN_CONSENT_EVENT,
} from "@/config/analytics";
import { paths, tr, type Locale } from "@/i18n";

type Choice = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readChoice(): Choice | null {
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function storeChoice(choice: Choice) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Storage blocked: the choice applies to this page view only.
  }
}

let loaded = false;

/** Loads gtag.js. Only ever called after the visitor accepted. */
function loadAnalytics() {
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
  if (loaded) {
    window.gtag?.("consent", "update", { analytics_storage: "granted" });
    return;
  }
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js expects the arguments object itself.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: GA_COOKIE_EXPIRES_SECONDS,
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/** Stops analytics and removes its cookies after the visitor withdraws consent. */
function stopAnalytics() {
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
  const host = window.location.hostname;
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]!.trim();
    if (name === "_ga" || name.startsWith("_ga_")) {
      for (const domain of ["", `; domain=${host}`, `; domain=.${host}`]) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
      }
    }
  }
}

/**
 * Consent banner for Google Analytics. Nothing is loaded and no cookie is set
 * until the visitor clicks "Accept". The choice is stored in localStorage and can
 * be changed at any time through the footer link (ConsentSettingsLink).
 */
export function ConsentManager({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const t = (en: string, de: string) => tr(locale, en, de);

  useEffect(() => {
    const choice = readChoice();
    if (choice === "granted") loadAnalytics();
    // Reading storage is only possible after mount; the static HTML has no banner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (choice === null) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  const decide = (choice: Choice) => {
    storeChoice(choice);
    if (choice === "granted") loadAnalytics();
    else stopAnalytics();
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-3xl border border-line bg-background p-5 shadow-xl sm:bottom-5 sm:p-6"
    >
      <h2 id="consent-title" className="font-display text-lg font-bold tracking-[-0.02em]">
        {t("Help us improve Footiqra", "Helfen Sie uns, Footiqra zu verbessern")}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {t(
          "With your consent we use Google Analytics to count visits and see which pages are read. This sets cookies and sends usage data to Google, possibly also to the USA. No advertising, no personalisation. You can change your choice at any time via “Cookie settings” at the bottom of every page.",
          "Mit Ihrer Einwilligung nutzen wir Google Analytics, um Besuche zu zählen und zu sehen, welche Seiten gelesen werden. Dabei werden Cookies gesetzt und Nutzungsdaten an Google übermittelt, möglicherweise auch in die USA. Keine Werbung, keine Personalisierung. Ihre Wahl können Sie jederzeit über „Cookie-Einstellungen“ unten auf jeder Seite ändern.",
        )}{" "}
        <Link href={paths(locale).privacy} className="underline underline-offset-4">
          {t("Privacy policy", "Datenschutzerklärung")}
        </Link>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => decide("denied")}
          className="rounded-full bg-surface px-5 py-3 text-sm font-semibold transition hover:bg-surface-strong"
        >
          {t("Decline", "Ablehnen")}
        </button>
        <button
          type="button"
          onClick={() => decide("granted")}
          className="rounded-full bg-surface px-5 py-3 text-sm font-semibold transition hover:bg-surface-strong"
        >
          {t("Accept", "Akzeptieren")}
        </button>
      </div>
    </div>
  );
}

/** Footer link that reopens the consent banner. */
export function ConsentSettingsLink({ locale }: { locale: Locale }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      className="text-muted hover:text-foreground"
    >
      {tr(locale, "Cookie settings", "Cookie-Einstellungen")}
    </button>
  );
}
