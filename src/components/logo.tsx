/**
 * Footiqra logo (first draft): a rounded square with three rising bars,
 * standing for "ranking", plus the lowercase wordmark.
 * The square follows the text colour, the bars use the signature green.
 */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <rect x="8" y="17" width="4" height="7" rx="2" fill="var(--brand)" />
      <rect x="14" y="12" width="4" height="12" rx="2" fill="var(--brand)" />
      <rect x="20" y="7" width="4" height="17" rx="2" fill="var(--brand)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-[1.35rem] font-extrabold tracking-[-0.045em]">
        footiqra
      </span>
    </span>
  );
}
