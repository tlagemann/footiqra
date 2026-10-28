import type { Locale } from "@/i18n";
import Link from "next/link";
import type { ReactNode } from "react";
import type { FormResult } from "@/data/repository";

/** Club crest from our own server, or a neutral initials badge if none is available. */
export function Crest({
  src,
  name,
  size = 24,
  className = "",
}: {
  src: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      // Plain <img>: static hosting, files are already small PNGs.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={`shrink-0 object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name
    .replace(/\b(FC|CF|AC|AS|SC|SV|SS|AFC|CD|RC|1\.)\b/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-surface-strong font-display font-bold text-muted ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.36) }}
    >
      {initials}
    </span>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-foreground text-inverse hover:opacity-85"
      : "bg-surface text-foreground hover:bg-surface-strong";
  return (
    <Link
      href={href}
      className={`inline-flex h-12 items-center justify-center rounded-2xl px-6 text-[15px] font-semibold transition ${styles}`}
    >
      {children}
    </Link>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted">
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
      <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
      {children}
    </p>
  );
}

export function SectionHeading({
  id,
  title,
  aside,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h2 id={id} className="font-display text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
        {title}
      </h2>
      {aside}
    </div>
  );
}

const FORM_STYLE: Record<FormResult, string> = {
  W: "bg-positive text-white",
  D: "bg-neutral text-white",
  L: "bg-negative text-white",
};
const FORM_LABEL: Record<Locale, Record<FormResult, string>> = {
  en: { W: "win", D: "draw", L: "loss" },
  de: { W: "Sieg", D: "Unentschieden", L: "Niederlage" },
};
/** Letters shown in the squares: W/D/L in English, S/U/N in German. */
export const FORM_LETTER: Record<Locale, Record<FormResult, string>> = {
  en: { W: "W", D: "D", L: "L" },
  de: { W: "S", D: "U", L: "N" },
};

/** Last results as small coloured squares, oldest first. */
export function FormGuide({ form, locale = "en" }: { form: FormResult[]; locale?: Locale }) {
  if (form.length === 0) return <span className="text-muted">·</span>;
  const labels = form.map((f) => FORM_LABEL[locale][f]).join(", ");
  return (
    <span
      className="inline-flex gap-1"
      aria-label={
        locale === "de"
          ? `Letzte ${form.length} Ergebnisse: ${labels}`
          : `Last ${form.length} results: ${labels}`
      }
    >
      {form.map((r, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ${FORM_STYLE[r]}`}
        >
          {FORM_LETTER[locale][r]}
        </span>
      ))}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-surface p-5 sm:p-7 ${className}`}>{children}</div>;
}
