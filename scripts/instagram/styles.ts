import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const ROOT = process.cwd();
export const fileUrl = (...parts: string[]) => pathToFileURL(join(ROOT, ...parts)).href;

const font = (family: string, pkg: string, file: string) =>
  `@font-face{font-family:${family};src:url(${fileUrl("node_modules/@fontsource-variable", pkg, "files", file)});font-weight:100 900}`;

/** Footiqra look for 1080x1350 (4:5) Instagram slides: dark, one green, Inter. */
export const CSS = `
${font("IT", "inter-tight", "inter-tight-latin-wght-normal.woff2")}
${font("IN", "inter", "inter-latin-wght-normal.woff2")}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1350px;background:#0a0a0a;color:#f5f6f7;font-family:IN,sans-serif;position:relative;overflow:hidden}
.pad{padding:84px 80px}
.brand{position:absolute;left:80px;bottom:44px;display:flex;align-items:center;gap:16px;color:#9aa0a8;font-size:28px}
.brand img{height:34px}
.eyebrow{font-family:IT;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#12c27a;font-size:28px}
h1{font-family:IT;font-weight:800;font-size:88px;line-height:1.02;letter-spacing:-.02em;margin-top:22px}
h2{font-family:IT;font-weight:800;font-size:64px;line-height:1.05;letter-spacing:-.02em;margin-top:18px}
.sub{color:#9aa0a8;font-size:30px;margin-top:22px;line-height:1.35}
.list{margin-top:44px}
.row{display:flex;align-items:center;gap:26px;height:98px;border-top:2px solid #1f2226}
.row:first-child{border-top:0}
.n{font-family:IT;font-weight:800;font-size:46px;width:70px;color:#6b7079}
.row:nth-child(-n+3) .n{color:#12c27a}
.row img{width:64px;height:64px;object-fit:contain}
.nocrest{width:64px;height:64px;border-radius:50%;background:#1f2226;display:inline-block}
.nm{font-family:IT;font-weight:700;font-size:44px;flex:1}
.lg{color:#9aa0a8;font-size:26px;display:block;font-family:IN;font-weight:400;margin-top:2px}
.rt{font-family:IT;font-weight:800;font-size:46px;font-variant-numeric:tabular-nums}
.bar{height:10px;border-radius:5px;background:#1f2226;width:170px;overflow:hidden}.bar i{display:block;height:100%;background:#12c27a;border-radius:5px}
.m{margin-top:10px;padding-bottom:16px}.m+.m{border-top:2px solid #1f2226;padding-top:16px}
.mt{display:flex;align-items:center;justify-content:space-between;gap:12px}
.tm{display:flex;align-items:center;gap:18px;font-family:IT;font-weight:700;font-size:40px;flex:1}
.tm.r{justify-content:flex-end;text-align:right}.tm img{width:60px;height:60px;object-fit:contain}
.meta{color:#9aa0a8;font-size:24px;margin-bottom:10px}
.prob{display:flex;height:44px;border-radius:12px;overflow:hidden;margin-top:14px;font-family:IT;font-weight:800;font-size:26px}
.prob div{display:flex;align-items:center;justify-content:center;color:#0a0a0a}
.ph{background:#12c27a}.pd{background:#3a3f45;color:#f5f6f7!important}.pa{background:#f5f6f7}
.leg{display:flex;gap:26px;color:#9aa0a8;font-size:24px;margin-top:14px}
.leg i{display:inline-block;width:18px;height:18px;border-radius:5px;margin-right:8px;vertical-align:-2px}
.cta{display:flex;flex-direction:column;justify-content:center;height:100%;padding:0 90px}
.url{margin-top:48px;display:inline-block;background:#12c27a;color:#0a0a0a;font-family:IT;font-weight:800;font-size:44px;padding:22px 40px;border-radius:999px;align-self:flex-start}
.big{font-family:IT;font-weight:800;font-size:150px;color:#12c27a;line-height:1}
.step{font-family:IT;font-weight:800;font-size:150px;color:#12c27a;line-height:1}
.card{background:#111214;border:2px solid #1f2226;border-radius:28px;padding:34px 40px;margin-top:34px}
.card b{font-family:IT;font-size:44px;display:block}
.card span{color:#9aa0a8;font-size:30px;line-height:1.35;display:block;margin-top:8px}
.eq{font-family:IT;font-weight:800;font-size:64px;margin-top:60px;line-height:1.15}
.eq em{font-style:normal;color:#12c27a}
`;

export const page = (inner: string) =>
  `<!doctype html><meta charset=utf-8><style>${CSS}</style><body>${inner}<div class="brand"><img src="${fileUrl("public/brand/footiqra-logo-white.png")}"><span>footiqra.com</span></div></body>`;

export const crest = (c: string | null) =>
  c ? `<img src="${fileUrl("public", c)}">` : '<span class="nocrest"></span>';
