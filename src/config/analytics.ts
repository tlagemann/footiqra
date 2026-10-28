/**
 * Google Analytics 4. The measurement id is public (it is visible in every page
 * that loads gtag.js), so it lives in the code. Analytics only loads after the
 * visitor accepts in the consent banner (src/components/consent.tsx).
 */
export const GA_MEASUREMENT_ID = "G-5ZXN3X6QF1";

/** localStorage key for the visitor's choice; bump the version to ask again. */
export const CONSENT_STORAGE_KEY = "footiqra-consent-v1";

/** GA cookies expire after 13 months instead of Google's default 2 years. */
export const GA_COOKIE_EXPIRES_SECONDS = 13 * 30 * 24 * 60 * 60;

/** Window event that reopens the consent banner (footer link). */
export const OPEN_CONSENT_EVENT = "footiqra:open-consent";
