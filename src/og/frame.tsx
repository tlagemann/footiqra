import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { getSiteUrl } from "@/config/site";

/**
 * Shared building blocks for social preview images (1200 x 630).
 * Rendered at build time by Next's ImageResponse; fonts and crests are read
 * from disk, so nothing is fetched from third parties.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export const C = {
  bg: "#ffffff",
  fg: "#0a0a0a",
  muted: "#6b7079",
  surface: "#f2f4f7",
  line: "#e4e7ec",
  brand: "#12c27a",
  brandInk: "#0a7a4b",
  positive: "#12a868",
  negative: "#e5484d",
  neutral: "#a1a7b0",
};

const root = process.cwd();
const fontFile = (pkg: string, file: string) =>
  readFile(path.join(root, "node_modules", "@fontsource", pkg, "files", file));

let fontsPromise:
  Promise<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]> | undefined;

function fonts() {
  fontsPromise ??= (async () => {
    const entries: [string, string, 500 | 600 | 700 | 800][] = [
      ["inter", "inter-latin-500-normal.woff", 500],
      ["inter", "inter-latin-ext-500-normal.woff", 500],
      ["inter", "inter-latin-600-normal.woff", 600],
      ["inter", "inter-latin-ext-600-normal.woff", 600],
      ["inter", "inter-latin-700-normal.woff", 700],
      ["inter", "inter-latin-ext-700-normal.woff", 700],
      ["inter-tight", "inter-tight-latin-800-normal.woff", 800],
      ["inter-tight", "inter-tight-latin-ext-800-normal.woff", 800],
    ];
    return Promise.all(
      entries.map(async ([pkg, file, weight]) => ({
        name: pkg === "inter" ? "Inter" : "Inter Tight",
        data: await fontFile(pkg, file),
        weight,
        style: "normal" as const,
      })),
    );
  })();
  return fontsPromise;
}

/** Crest as data URI, or null if it has not been downloaded. */
export async function crestData(crestPath: string | null): Promise<string | null> {
  if (!crestPath || !/^\/crests\/\d+\.png$/.test(crestPath)) return null;
  try {
    const data = await readFile(path.join(root, "public", crestPath));
    return `data:image/png;base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

export function CrestImg({ src, name, size }: { src: string | null; name: string; size: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} width={size} height={size} alt="" style={{ objectFit: "contain" }} />;
  }
  const initials = name
    .replace(/^(FC|AC|AS|SC|SL|SS|US|1\.)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: C.line,
        color: C.muted,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 700,
      }}
    >
      {initials}
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <svg width="44" height="44" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="9" fill={C.fg} />
        <rect x="8" y="17" width="4" height="7" rx="2" fill={C.brand} />
        <rect x="14" y="12" width="4" height="12" rx="2" fill={C.brand} />
        <rect x="20" y="7" width="4" height="17" rx="2" fill={C.brand} />
      </svg>
      <span
        style={{
          fontFamily: "Inter Tight",
          fontWeight: 800,
          fontSize: 34,
          letterSpacing: -1.5,
          color: C.fg,
        }}
      >
        footiqra
      </span>
    </div>
  );
}

/** Page frame: logo and eyebrow on top, content in the middle, footer line at the bottom. */
export async function renderOg({
  eyebrow,
  children,
  footer,
}: {
  eyebrow: string;
  children: ReactNode;
  footer?: string;
}): Promise<ImageResponse> {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: C.bg,
        padding: "56px 64px 48px",
        fontFamily: "Inter",
        color: C.fg,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Logo />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 24,
            fontWeight: 600,
            color: C.brandInk,
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: 10, background: C.brand }} />
          {eyebrow}
        </div>
      </div>
      <div
        style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}
      >
        {children}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 22,
          fontWeight: 500,
          color: C.muted,
        }}
      >
        <span>{footer ?? "Power rankings across Europe's top football leagues"}</span>
        <span>{new URL(getSiteUrl()).host}</span>
      </div>
    </div>,
    { ...OG_SIZE, fonts: await fonts() },
  );
}

export const headline = (size = 76) =>
  ({
    fontFamily: "Inter Tight",
    fontWeight: 800,
    fontSize: size,
    letterSpacing: -size * 0.045,
    lineHeight: 1.02,
  }) as const;

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
