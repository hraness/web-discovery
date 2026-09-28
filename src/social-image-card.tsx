import { nebulaSansSocialFonts } from "@hraness/design-kit/fonts/nebula-sans/social";
import { cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const CARD_PADDING = 60;
export const TOP_BAR_HEIGHT = 54;
export const BOTTOM_RULE_HEIGHT = 54;

/** The smallest font size any card draws, in pixels. */
export const SOCIAL_IMAGE_MIN_FONT_SIZE = 30;

export const socialImageMarks = {
  splitSquare: "◫",
} as const;

export type SocialImageMark =
  (typeof socialImageMarks)[keyof typeof socialImageMarks];

export type SocialImageTheme = Readonly<{
  accent: string;
  background: string;
  foreground: string;
  muted: string;
}>;

export const plainSocialImageTheme = {
  accent: "#2457A6",
  background: "#FFFFFF",
  foreground: "#171717",
  muted: "#666666",
} as const satisfies SocialImageTheme;

/**
 * A product icon as a `data:` URL. `mark` is a single-colour glyph that the
 * card repaints on a tile of the theme accent; `app` is a finished app icon
 * that fills the tile with its own colours.
 */
export type SocialImageIcon = Readonly<{
  kind: "app" | "mark";
  src: string;
}>;

export type SocialImageLayout = "page" | "product";

export type SocialImageDetails = Readonly<{
  description: string;
  domain: string;
  eyebrow?: string;
  /**
   * The large text on the card. Defaults to `title` without a trailing brand
   * segment such as " | Example" when that segment repeats the eyebrow or the
   * domain, so an SEO page title does not become the card headline verbatim.
   */
  headline?: string;
  icon?: SocialImageIcon;
  /**
   * "product" draws a large icon tile beside the name and description.
   * "page" draws a small product lockup above the headline. Defaults to
   * "page" when `headline` is set and differs from `title`.
   */
  layout?: SocialImageLayout;
  mark?: ReactNode;
  theme?: Partial<SocialImageTheme>;
  title: string;
}>;

export type SocialImageFonts = ReturnType<typeof nebulaSansSocialFonts>;

export type SocialImageCard = Readonly<{
  element: ReactElement;
  fonts: SocialImageFonts;
  height: number;
  width: number;
}>;

/* ------------------------------------------------------------------ color */

type Rgb = readonly [number, number, number];

function color(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^#[0-9A-F]{6}$/iu.test(value)) {
    throw new RangeError(
      `${label} must be a six-digit hex color; received ${String(value)}.`,
    );
  }
  return value;
}

function channels(hex: string): Rgb {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function toHex(rgb: readonly number[]): string {
  return `#${rgb
    .map((value) => Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function mix(from: string, to: string, amount: number): string {
  const a = channels(from);
  const b = channels(to);
  return toHex(a.map((value, index) => value + ((b[index] ?? value) - value) * amount));
}

function rgba(hex: string, alpha: number): string {
  const [red, green, blue] = channels(hex);
  return `rgba(${String(red)}, ${String(green)}, ${String(blue)}, ${String(alpha)})`;
}

function relativeLuminance(hex: string): number {
  const linear = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.040_45 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  const [red, green, blue] = channels(hex);
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

/** WCAG 2 contrast ratio between two six-digit hex colors. */
export function socialImageContrastRatio(first: string, second: string): number {
  const a = relativeLuminance(color(first, "first color"));
  const b = relativeLuminance(color(second, "second color"));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function worstContrast(value: string, against: readonly string[]): number {
  return Math.min(...against.map((surface) => socialImageContrastRatio(value, surface)));
}

/** Moves `value` toward `target` only as far as `minimum` contrast requires. */
function readable(
  value: string,
  target: string,
  against: readonly string[],
  minimum: number,
): string {
  for (let step = 0; step <= 100; step += 1) {
    const candidate = mix(value, target, step / 100);
    if (worstContrast(candidate, against) >= minimum) return candidate;
  }
  return target;
}

/** Resolved colors for one card. Every text color meets its contrast rule. */
export type SocialImagePalette = Readonly<{
  /** Base of the background gradient. */
  background: string;
  /** Far end of the background gradient: a light wash of the accent. */
  backgroundTint: string;
  dark: boolean;
  foreground: string;
  /** Knockout color for single-colour marks and letters on the tile. */
  glyph: string;
  muted: string;
  /** Accent adjusted to at least 4.5:1 for the domain and kicker text. */
  primaryText: string;
  /** The accent as the tile gradient runs from `tileTop` to `tileBottom`. */
  tileBottom: string;
  tileTop: string;
  /** Every background color text can sit on, for contrast checks. */
  surfaces: readonly string[];
}>;

function backgroundStops(background: string, accent: string, dark: boolean) {
  const tint = mix(background, accent, dark ? 0.08 : 0.06);
  const glow = mix(tint, accent, dark ? 0.14 : 0.08);
  return { glow, tint, surfaces: [background, tint, glow] as const };
}

/**
 * Resolves a card theme into the colors the card draws. The accent is the
 * product primary. A mid-tone background moves toward black or white until
 * body text can reach 7:1.
 */
export function socialImagePalette(
  theme: Partial<SocialImageTheme> = {},
): SocialImagePalette {
  const resolved = parseSocialImageTheme(theme);
  const dark = relativeLuminance(resolved.foreground) > relativeLuminance(resolved.background);
  const extremeInk = dark ? "#FFFFFF" : "#000000";
  const extremeField = dark ? "#000000" : "#FFFFFF";
  let background = resolved.background;
  for (let step = 0; step <= 50; step += 1) {
    background = mix(resolved.background, extremeField, step / 50);
    const { surfaces } = backgroundStops(background, resolved.accent, dark);
    if (worstContrast(extremeInk, surfaces) >= 7.5) break;
  }
  const { surfaces, tint } = backgroundStops(background, resolved.accent, dark);
  const foreground = readable(resolved.foreground, extremeInk, surfaces, 7);
  const muted = readable(resolved.muted, foreground, surfaces, dark ? 7 : 4.5);
  const primaryText = readable(resolved.accent, foreground, surfaces, 4.5);
  const tileTop = dark ? resolved.accent : mix(resolved.accent, "#FFFFFF", 0.12);
  const tileBottom = mix(resolved.accent, "#000000", dark ? 0.24 : 0.12);
  const glyph = socialImageContrastRatio("#FFFFFF", mix(tileTop, tileBottom, 0.5)) >= 3
    ? "#FFFFFF"
    : readable(mix(resolved.accent, "#000000", 0.55), "#000000", [tileTop, tileBottom], 4.5);
  return {
    background,
    backgroundTint: tint,
    dark,
    foreground,
    glyph,
    muted,
    primaryText,
    surfaces,
    tileBottom,
    tileTop,
  };
}

function parseSocialImageTheme(theme: unknown): SocialImageTheme {
  if (theme === undefined) return plainSocialImageTheme;
  if (typeof theme !== "object" || theme === null || Array.isArray(theme)) {
    throw new TypeError("theme must be an object of six-digit hex colors.");
  }
  const fields = theme as Record<string, unknown>;
  const pick = (key: keyof SocialImageTheme) =>
    color(fields[key] ?? plainSocialImageTheme[key], key);
  return {
    accent: pick("accent"),
    background: pick("background"),
    foreground: pick("foreground"),
    muted: pick("muted"),
  };
}

/* ------------------------------------------------------------------- font */

type CmapSubtable = Readonly<{
  format: 4 | 12;
  offset: number;
}>;

type FontTables = Readonly<{
  advance: (glyph: number) => number;
  subtables: readonly CmapSubtable[];
  unitsPerEm: number;
}>;

const fontTableCache = new WeakMap<ArrayBuffer, FontTables>();

function readableRange(view: DataView, offset: number, length: number): boolean {
  return Number.isSafeInteger(offset)
    && Number.isSafeInteger(length)
    && offset >= 0
    && length >= 0
    && offset + length <= view.byteLength;
}

function fontTables(font: ArrayBuffer): FontTables {
  const cached = fontTableCache.get(font);
  if (cached !== undefined) return cached;

  const view = new DataView(font);
  if (!readableRange(view, 0, 12)) {
    throw new Error("Embedded social-image font has an invalid SFNT header.");
  }

  const tableCount = view.getUint16(4, false);
  const tables = new Map<string, number>();
  for (let index = 0; index < tableCount; index += 1) {
    const recordOffset = 12 + index * 16;
    if (!readableRange(view, recordOffset, 16)) break;
    const tag = String.fromCharCode(
      view.getUint8(recordOffset),
      view.getUint8(recordOffset + 1),
      view.getUint8(recordOffset + 2),
      view.getUint8(recordOffset + 3),
    );
    tables.set(tag, view.getUint32(recordOffset + 8, false));
  }

  const cmapOffset = tables.get("cmap");
  if (cmapOffset === undefined || !readableRange(view, cmapOffset, 4)) {
    throw new Error("Embedded social-image font is missing a valid cmap table.");
  }
  const subtableCount = view.getUint16(cmapOffset + 2, false);
  const subtables: CmapSubtable[] = [];
  for (let index = 0; index < subtableCount; index += 1) {
    const recordOffset = cmapOffset + 4 + index * 8;
    if (!readableRange(view, recordOffset, 8)) break;
    const offset = cmapOffset + view.getUint32(recordOffset + 4, false);
    if (!readableRange(view, offset, 2)) continue;
    const format = view.getUint16(offset, false);
    if (format === 4 || format === 12) subtables.push({ format, offset });
  }
  if (subtables.length === 0) {
    throw new Error("Embedded social-image font has no supported cmap subtable.");
  }

  const head = tables.get("head");
  const hhea = tables.get("hhea");
  const hmtx = tables.get("hmtx");
  if (
    head === undefined || !readableRange(view, head, 54)
    || hhea === undefined || !readableRange(view, hhea, 36)
    || hmtx === undefined
  ) {
    throw new Error("Embedded social-image font is missing valid head, hhea, or hmtx tables.");
  }
  const unitsPerEm = view.getUint16(head + 18, false);
  const metricCount = view.getUint16(hhea + 34, false);
  if (unitsPerEm === 0 || metricCount === 0 || !readableRange(view, hmtx, metricCount * 4)) {
    throw new Error("Embedded social-image font has invalid horizontal metrics.");
  }
  const advances = new Map<number, number>();
  const tablesForFont: FontTables = {
    advance: (glyph) => {
      const cachedAdvance = advances.get(glyph);
      if (cachedAdvance !== undefined) return cachedAdvance;
      const index = Math.min(glyph, metricCount - 1);
      const value = view.getUint16(hmtx + index * 4, false);
      advances.set(glyph, value);
      return value;
    },
    subtables,
    unitsPerEm,
  };
  fontTableCache.set(font, tablesForFont);
  return tablesForFont;
}

function formatFourGlyph(view: DataView, offset: number, codePoint: number): number {
  if (codePoint > 0xffff || !readableRange(view, offset, 14)) return 0;
  const length = view.getUint16(offset + 2, false);
  if (!readableRange(view, offset, length)) return 0;
  const segmentCount = view.getUint16(offset + 6, false) / 2;
  const endCodesOffset = offset + 14;
  const startCodesOffset = endCodesOffset + segmentCount * 2 + 2;
  const deltasOffset = startCodesOffset + segmentCount * 2;
  const rangeOffsetsOffset = deltasOffset + segmentCount * 2;

  for (let index = 0; index < segmentCount; index += 1) {
    const endCode = view.getUint16(endCodesOffset + index * 2, false);
    if (codePoint > endCode) continue;
    const startCode = view.getUint16(startCodesOffset + index * 2, false);
    if (codePoint < startCode) return 0;
    const delta = view.getInt16(deltasOffset + index * 2, false);
    const rangeOffsetAddress = rangeOffsetsOffset + index * 2;
    const rangeOffset = view.getUint16(rangeOffsetAddress, false);
    if (rangeOffset === 0) return (codePoint + delta) & 0xffff;

    const glyphAddress = rangeOffsetAddress
      + rangeOffset
      + (codePoint - startCode) * 2;
    if (!readableRange(view, glyphAddress, 2)) return 0;
    const glyph = view.getUint16(glyphAddress, false);
    return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
  }
  return 0;
}

function formatTwelveGlyph(view: DataView, offset: number, codePoint: number): number {
  if (!readableRange(view, offset, 16)) return 0;
  const length = view.getUint32(offset + 4, false);
  if (!readableRange(view, offset, length)) return 0;
  const groupCount = view.getUint32(offset + 12, false);
  let lower = 0;
  let upper = groupCount - 1;
  while (lower <= upper) {
    const index = Math.floor((lower + upper) / 2);
    const groupOffset = offset + 16 + index * 12;
    if (!readableRange(view, groupOffset, 12)) return 0;
    const start = view.getUint32(groupOffset, false);
    const end = view.getUint32(groupOffset + 4, false);
    if (codePoint < start) {
      upper = index - 1;
    } else if (codePoint > end) {
      lower = index + 1;
    } else {
      return view.getUint32(groupOffset + 8, false) + codePoint - start;
    }
  }
  return 0;
}

function fontGlyph(font: ArrayBuffer, codePoint: number): number {
  const view = new DataView(font);
  for (const { format, offset } of fontTables(font).subtables) {
    const glyph = format === 4
      ? formatFourGlyph(view, offset, codePoint)
      : formatTwelveGlyph(view, offset, codePoint);
    if (glyph !== 0) return glyph;
  }
  return 0;
}

function fontHasGlyph(font: ArrayBuffer, codePoint: number): boolean {
  return fontGlyph(font, codePoint) !== 0;
}

type Weight = 400 | 700;

type TextStyle = Readonly<{
  lineHeight: number;
  /** Letter spacing in em. */
  tracking: number;
  weight: Weight;
}>;

/** Advance width in pixels of `text` set in Nebula Sans at `size`. */
function textWidth(
  fonts: SocialImageFonts,
  text: string,
  size: number,
  style: TextStyle,
): number {
  const font = fonts.find(({ weight }) => weight === style.weight) ?? fonts[0];
  if (font === undefined) throw new Error("No social-image fonts are embedded.");
  const tables = fontTables(font.data);
  let units = 0;
  let count = 0;
  for (const character of text) {
    units += tables.advance(fontGlyph(font.data, character.codePointAt(0) ?? 0x20));
    count += 1;
  }
  return (units / tables.unitsPerEm) * size + Math.max(0, count - 1) * style.tracking * size;
}

/* ------------------------------------------------------------------- text */

const TITLE_SEPARATORS = [" | ", " · ", " — ", " – ", " - "] as const;

function brandKey(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function brandKeys(details: Pick<SocialImageDetails, "domain" | "eyebrow">): Set<string> {
  const domain = details.domain.trim();
  return new Set(
    [details.eyebrow, domain, domain.replace(/\.[^.]+$/u, "")]
      .filter((value): value is string => value !== undefined && value.trim().length > 0)
      .map(brandKey),
  );
}

/**
 * Returns the card headline: `details.headline` when given, otherwise the
 * title with one trailing brand segment removed. A segment counts as the
 * brand only when it matches the eyebrow, the domain, or the domain without
 * its top-level label, ignoring case, so page words are never dropped.
 */
export function socialImageHeadline(
  details: Pick<SocialImageDetails, "domain" | "eyebrow" | "headline" | "title">,
): string {
  if (details.headline !== undefined) return details.headline;
  const brands = brandKeys(details);
  let best: string | undefined;
  for (const separator of TITLE_SEPARATORS) {
    const index = details.title.lastIndexOf(separator);
    if (index <= 0) continue;
    const page = details.title.slice(0, index).trimEnd();
    const suffix = details.title.slice(index + separator.length);
    if (page.length === 0 || !brands.has(brandKey(suffix))) continue;
    if (best === undefined || page.length > best.length) best = page;
  }
  return best ?? details.title;
}

/** The name in a page card's lockup: the title's brand segment, or the title. */
function lockupName(
  details: Pick<SocialImageDetails, "domain" | "eyebrow" | "title">,
): string {
  const brands = brandKeys(details);
  for (const separator of TITLE_SEPARATORS) {
    const index = details.title.lastIndexOf(separator);
    if (index <= 0) continue;
    const suffix = details.title.slice(index + separator.length).trim();
    if (suffix.length > 0 && brands.has(brandKey(suffix))) return suffix;
  }
  return details.title;
}

/**
 * Returns the layout a card uses: `details.layout` when given, otherwise
 * "page" when `headline` is set and differs from `title`, else "product".
 */
export function socialImageLayout(
  details: Pick<SocialImageDetails, "headline" | "layout" | "title">,
): SocialImageLayout {
  if (details.layout !== undefined) return parseSocialImageLayout(details.layout);
  return details.headline !== undefined && details.headline !== details.title
    ? "page"
    : "product";
}

function parseSocialImageLayout(value: unknown): SocialImageLayout {
  if (value === "page" || value === "product") return value;
  throw new RangeError(`layout must be "product" or "page"; received ${describe(value)}.`);
}

function normalizeSocialImageText(value: string): string {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n").replaceAll("\t", " ");
}

function assertSocialImageText(
  value: string,
  label: "description" | "domain" | "eyebrow" | "headline" | "title",
  fonts: SocialImageFonts,
): void {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === 0x0a) {
      continue;
    }
    if (codePoint !== undefined && fonts.every(({ data }) => fontHasGlyph(data, codePoint))) {
      continue;
    }
    const notation = codePoint === undefined
      ? "unknown"
      : `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
    throw new RangeError(
      `${label} contains ${JSON.stringify(character)} (${notation}), which is not covered by the embedded Nebula Sans social fonts.`,
    );
  }
}

type Measure = (text: string) => number;

/** How tightly `layoutUnits` binds words: "names" also keeps proper names whole. */
type Binding = "names" | "short";

const ENDS_PHRASE = /[.,;:!?)\]]$/u;

function capitalized(word: string | undefined): boolean {
  return word !== undefined && /^\p{Lu}\p{Ll}/u.test(word);
}

/**
 * Words, with short words and numbers bound to the word that follows. With
 * "names", a pair of capitalized words such as "Puerto Rico" is also kept
 * on one line. A bound group wider than a line still breaks.
 */
function layoutUnits(text: string, binding: Binding = "names"): string[] {
  const words = text.split(/\s+/u).filter((word) => word.length > 0);
  const units: string[] = [];
  let carry: string[] = [];
  let run = 0;
  for (const [index, word] of words.entries()) {
    carry.push(word);
    const letters = word.replace(/[^\p{L}\p{N}]/gu, "");
    const phraseEnd = ENDS_PHRASE.test(word);
    const short = letters.length > 0
      && (letters.length <= 3 || /^\p{N}/u.test(letters))
      && !phraseEnd;
    run = capitalized(word) ? run + 1 : 0;
    const name = binding === "names"
      && index > 0
      && run > 0
      && run < 2
      && !phraseEnd
      && capitalized(words[index + 1]);
    if ((short || name) && index < words.length - 1) continue;
    units.push(carry.join(" "));
    carry = [];
  }
  if (carry.length > 0) units.push(carry.join(" "));
  return units;
}

function greedyLines(units: readonly string[], width: number, measure: Measure): string[] {
  const lines: string[] = [];
  let line = "";
  for (const unit of units) {
    const candidate = line.length === 0 ? unit : `${line} ${unit}`;
    if (measure(candidate) <= width) {
      line = candidate;
      continue;
    }
    if (line.length > 0) lines.push(line);
    if (measure(unit) <= width || !unit.includes(" ")) {
      line = unit;
      continue;
    }
    // A bound group wider than the line breaks back into single words.
    const split = greedyLines(unit.split(" "), width, measure);
    line = split.pop() ?? "";
    lines.push(...split);
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

function wrapText(text: string, width: number, measure: Measure, binding: Binding = "names"): string[] {
  return greedyLines(layoutUnits(text, binding), width, measure);
}

/** The narrowest wrap that keeps the same line count, for an even rag. */
function balanceText(text: string, width: number, measure: Measure): string[] {
  const lines = wrapText(text, width, measure);
  if (lines.length < 2) return lines;
  // Never narrow past a bound group that fits, so balancing cannot split it.
  const widest = Math.max(0, ...layoutUnits(text).map(measure).filter((size) => size <= width));
  let low = Math.max(Math.floor(width * 0.5), Math.ceil(widest) - 1);
  let high = width;
  while (high - low > 2) {
    const middle = Math.floor((low + high) / 2);
    const trial = wrapText(text, middle, measure);
    if (trial.length === lines.length && trial.every((line) => measure(line) <= middle)) {
      high = middle;
    } else {
      low = middle;
    }
  }
  return wrapText(text, high, measure);
}

const ELLIPSIS = "…";

function truncateWord(word: string, width: number, measure: Measure): string {
  const characters = Array.from(
    new Intl.Segmenter("en", { granularity: "grapheme" }).segment(word),
    ({ segment }) => segment,
  );
  while (characters.length > 1 && measure(`${characters.join("")}${ELLIPSIS}`) > width) {
    characters.pop();
  }
  return `${characters.join("")}${ELLIPSIS}`;
}

/** Wraps into at most `maxLines`, ending on a whole word and an ellipsis. */
function clampWith(
  text: string,
  width: number,
  maxLines: number,
  measure: Measure,
  binding: Binding,
): string[] {
  const fit = (line: string) => (measure(line) <= width ? line : truncateWord(line, width, measure));
  const wrapped = wrapText(text, width, measure, binding);
  if (wrapped.length <= maxLines) return wrapped.map(fit);
  const words = text.split(/\s+/u).filter((word) => word.length > 0);
  const head = wrapped.slice(0, maxLines - 1);
  const used = head.join(" ").split(" ").filter((word) => word.length > 0).length;
  const rest = words.slice(used);
  let last = "";
  for (const word of rest) {
    const candidate = last.length === 0 ? word : `${last} ${word}`;
    if (measure(`${candidate}${ELLIPSIS}`) > width) break;
    last = candidate;
  }
  if (last.length === 0) {
    last = truncateWord(rest[0] ?? "", width, measure);
  } else {
    last = `${last.replace(/[\s,.;:!?\-–—]+$/u, "")}${ELLIPSIS}`;
  }
  return [...head.map(fit), last];
}

/**
 * Clamps with name binding unless it leaves a visibly short line before the
 * ellipsis; then proper names may break, but short words stay bound.
 */
function clampText(text: string, width: number, maxLines: number, measure: Measure): string[] {
  let fallback: string[] | undefined;
  for (const binding of ["names", "short"] as const) {
    const lines = clampWith(text, width, maxLines, measure, binding);
    fallback ??= lines;
    const full = lines.length < maxLines ? [] : lines.slice(0, -1);
    if (full.every((line) => measure(line) >= width * 0.8)) return lines;
  }
  return fallback ?? [];
}

type TextBlock = Readonly<{
  lines: readonly string[];
  size: number;
  style: TextStyle;
  widths: readonly number[];
}>;

function block(
  fonts: SocialImageFonts,
  lines: readonly string[],
  size: number,
  style: TextStyle,
): TextBlock {
  return {
    lines,
    size,
    style,
    widths: lines.map((line) => textWidth(fonts, line, size, style)),
  };
}

function blockHeight(text: TextBlock): number {
  return text.lines.length * text.size * text.style.lineHeight;
}

// Headroom for kerning and rasterization differences between measure and render.
const SAFETY = 0.97;

function measurer(fonts: SocialImageFonts, size: number, style: TextStyle): Measure {
  return (text) => textWidth(fonts, text, size, style);
}

/** Largest size whose wrap needs at most `maxLines`, balanced; else null. */
function fitWhole(
  fonts: SocialImageFonts,
  text: string,
  width: number,
  sizes: readonly number[],
  maxLines: number,
  style: TextStyle,
): TextBlock | null {
  const usable = Math.floor(width * SAFETY);
  for (const size of sizes) {
    const measure = measurer(fonts, size, style);
    const lines = wrapText(text, usable, measure);
    if (lines.length <= maxLines && lines.every((line) => measure(line) <= usable)) {
      return block(fonts, balanceText(text, usable, measure), size, style);
    }
  }
  return null;
}

function fitClamped(
  fonts: SocialImageFonts,
  text: string,
  width: number,
  size: number,
  maxLines: number,
  style: TextStyle,
): TextBlock {
  const usable = Math.floor(width * SAFETY);
  const measure = measurer(fonts, size, style);
  const whole = wrapText(text, usable, measure);
  const lines = whole.length <= maxLines && whole.every((line) => measure(line) <= usable)
    ? balanceText(text, usable, measure)
    : clampText(text, usable, Math.max(1, maxLines), measure);
  return block(fonts, lines, size, style);
}

/* ------------------------------------------------------------------- icon */

type ParsedIcon = Readonly<{
  aspect: number;
  kind: "app" | "mark";
  /** The source re-encoded as base64 so it nests safely inside SVG. */
  base64: string;
  mime: "image/png" | "image/svg+xml";
}>;

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/u;

// Runtime-neutral base64 and UTF-8 helpers: Node, Bun, and the Edge runtime
// all provide atob, btoa, TextEncoder, and TextDecoder; Buffer is Node-only.
function base64Bytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function utf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

const SVG_DATA_URL = /data:image\/svg\+xml(?:;charset=[\w-]+)?(;base64)?,([^"')\s]+)/giu;

/**
 * Throws when SVG text could load anything outside itself: a remote href,
 * src, or url(), an @import, or a nested SVG data URL that does any of these.
 */
function assertSelfContainedSvg(svg: string, depth = 0): void {
  if (depth > 3) throw new RangeError("icon.src SVG nests data URLs too deeply.");
  if (
    /\b(?:href|src)\s*=\s*["']\s*(?!data:|#)/iu.test(svg)
    || /url\(\s*["']?\s*(?!data:|#)/iu.test(svg)
    || /@import\b/iu.test(svg)
  ) {
    throw new RangeError("icon.src SVG must not reference external resources.");
  }
  for (const [, encoded, payload = ""] of svg.matchAll(SVG_DATA_URL)) {
    let nested: string;
    try {
      nested = encoded === undefined
        ? decodeURIComponent(payload)
        : new TextDecoder().decode(base64Bytes(payload));
    } catch {
      throw new RangeError("icon.src SVG contains a malformed nested SVG data URL.");
    }
    assertSelfContainedSvg(nested, depth + 1);
  }
}

function describe(value: unknown): string {
  if (typeof value !== "string") return typeof value;
  return JSON.stringify(value.length > 48 ? `${value.slice(0, 48)}…` : value);
}

function svgAspect(svg: string): number {
  const open = /<svg\b[^>]*>/iu.exec(svg)?.[0] ?? "";
  const box = /viewBox\s*=\s*["']\s*[-+\d.eE]+[\s,]+[-+\d.eE]+[\s,]+([\d.eE+]+)[\s,]+([\d.eE+]+)\s*["']/u.exec(open);
  const width = Number(box?.[1] ?? /\bwidth\s*=\s*["']([\d.]+)/u.exec(open)?.[1]);
  const height = Number(box?.[2] ?? /\bheight\s*=\s*["']([\d.]+)/u.exec(open)?.[1]);
  const aspect = width / height;
  return Number.isFinite(aspect) && aspect > 0 ? Math.min(4, Math.max(0.25, aspect)) : 1;
}

/**
 * Parses `details.icon` from an unknown value. The source must be a local
 * `data:` URL holding an SVG or PNG image; remote URLs and file paths throw.
 */
export function parseSocialImageIcon(value: unknown): SocialImageIcon {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`icon must be an object with src and kind; received ${describe(value)}.`);
  }
  const { kind, src } = value as Record<string, unknown>;
  if (kind !== "mark" && kind !== "app") {
    throw new RangeError(`icon.kind must be "mark" or "app"; received ${describe(kind)}.`);
  }
  if (typeof src !== "string") {
    throw new TypeError(`icon.src must be a data: URL string; received ${describe(src)}.`);
  }
  parseIconSource(src, kind);
  return { kind, src };
}

function parseIconSource(src: string, kind: "app" | "mark"): ParsedIcon {
  const match = /^data:(image\/svg\+xml|image\/png)(;charset=[\w-]+)?(;base64)?,([\s\S]+)$/u.exec(src);
  if (match === null) {
    throw new RangeError(
      `icon.src must be a data: URL of type image/svg+xml or image/png; received ${describe(src)}.`,
    );
  }
  const mime = match[1] === "image/png" ? "image/png" : "image/svg+xml";
  const encoded = match[3] !== undefined;
  const payload = match[4] ?? "";
  if (mime === "image/png") {
    if (!encoded || !BASE64.test(payload)) {
      throw new RangeError("icon.src PNG data must be base64 encoded.");
    }
    const bytes = base64Bytes(payload);
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length < 24 || signature.some((byte, index) => bytes[index] !== byte)) {
      throw new RangeError("icon.src does not contain a PNG image.");
    }
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = header.getUint32(16, false);
    const height = header.getUint32(20, false);
    if (width === 0 || height === 0) throw new RangeError("icon.src PNG has no pixels.");
    return { aspect: Math.min(4, Math.max(0.25, width / height)), base64: payload, kind, mime };
  }
  let svg: string;
  if (encoded) {
    if (!BASE64.test(payload)) throw new RangeError("icon.src SVG base64 data is malformed.");
    try {
      svg = new TextDecoder("utf-8", { fatal: true }).decode(base64Bytes(payload));
    } catch {
      throw new RangeError("icon.src SVG base64 data is not valid UTF-8.");
    }
  } else {
    try {
      svg = decodeURIComponent(payload);
    } catch {
      throw new RangeError("icon.src SVG data is not valid percent-encoding.");
    }
  }
  if (!/<svg\b/iu.test(svg)) throw new RangeError("icon.src does not contain an SVG image.");
  assertSelfContainedSvg(svg);
  return {
    aspect: svgAspect(svg),
    base64: utf8Base64(svg),
    kind,
    mime,
  };
}

function iconBox(aspect: number, box: number): { height: number; width: number } {
  return aspect >= 1
    ? { height: Math.round(box / aspect), width: box }
    : { height: box, width: Math.round(box * aspect) };
}

/** The icon's alpha repainted in one solid color, as an SVG data URL. */
function knockoutSource(icon: ParsedIcon, fill: string): string {
  const width = Math.round(icon.aspect >= 1 ? 1000 : 1000 * icon.aspect);
  const height = Math.round(icon.aspect >= 1 ? 1000 / icon.aspect : 1000);
  const href = `data:${icon.mime};base64,${icon.base64}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${String(width)} ${String(height)}" width="${String(width)}" height="${String(height)}"><mask id="k" maskUnits="userSpaceOnUse" x="0" y="0" width="${String(width)}" height="${String(height)}" style="mask-type:alpha" mask-type="alpha"><image href="${href}" xlink:href="${href}" width="${String(width)}" height="${String(height)}"/></mask><rect width="${String(width)}" height="${String(height)}" fill="${fill}" mask="url(#k)"/></svg>`;
  return `data:image/svg+xml;base64,${utf8Base64(svg)}`;
}

function isReactElement(node: unknown): node is { props: Record<string, unknown> } {
  return typeof node === "object"
    && node !== null
    && "props" in node
    && node.props !== undefined
    && node.props !== null
    && typeof (node as { props?: unknown }).props === "object";
}

function assertNoRemoteAssets(node: unknown, label = "mark"): void {
  if (node === undefined || node === null) return;
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") return;
  if (Array.isArray(node)) {
    for (const child of node) assertNoRemoteAssets(child, label);
    return;
  }
  if (isReactElement(node)) {
    const { props } = node;
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === "string" && /^https?:/u.test(value)) {
        throw new RangeError(`${label} must not load remote assets; found ${key}=${value}.`);
      }
      if (key !== "children") {
        assertNoRemoteAssets(value, label);
      }
    }
  }
}

function registeredSocialImageMark(mark: string, size = 42) {
  if (mark !== socialImageMarks.splitSquare) {
    throw new RangeError(`Unsupported social-image mark: ${JSON.stringify(mark)}.`);
  }
  return (
    <svg
      aria-label={mark}
      height={String(size)}
      role="img"
      viewBox="0 0 36 36"
      width={String(size)}
    >
      <rect
        fill="none"
        height="23"
        stroke="currentColor"
        strokeWidth="3"
        width="23"
        x="6.5"
        y="6.5"
      />
      <path
        d="M18 8v20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  );
}

function numeric(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Draws a caller's `mark` node at `box` pixels. Plain function components are
 * resolved so a top-level `<svg>` can be resized as vectors; anything else is
 * scaled from its declared size, or from the 42 px legacy mark size.
 */
function sizedMark(mark: ReactNode, box: number): ReactNode {
  if (typeof mark === "string") return registeredSocialImageMark(mark, box);
  let node: unknown = mark;
  for (let depth = 0; depth < 4 && isValidElement(node) && typeof node.type === "function"; depth += 1) {
    const component = node.type as (props: unknown) => unknown;
    if ((component as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent !== undefined) break;
    node = component(node.props);
  }
  if (isValidElement<Record<string, unknown>>(node) && node.type === "svg") {
    const props = node.props;
    const viewBox = typeof props.viewBox === "string" ? props.viewBox.trim().split(/[\s,]+/u).map(Number) : [];
    const aspect = (viewBox[2] ?? numeric(props.width) ?? 1) / (viewBox[3] ?? numeric(props.height) ?? 1);
    const size = iconBox(Number.isFinite(aspect) && aspect > 0 ? aspect : 1, box);
    return cloneElement(node, { height: String(size.height), width: String(size.width) });
  }
  const natural = isValidElement<Record<string, unknown>>(node)
    ? numeric(node.props.width) ?? 42
    : 42;
  return (
    <div style={{ display: "flex", transform: `scale(${String(box / natural)})` }}>
      {mark}
    </div>
  );
}

type TileArt =
  | Readonly<{ icon: ParsedIcon; type: "app" }>
  | Readonly<{ icon: ParsedIcon; type: "mark" }>
  | Readonly<{ letter: string; type: "letter" }>
  | Readonly<{ node: ReactNode; type: "node" }>;

function tileArt(details: SocialImageDetails, title: string): TileArt {
  if (details.icon !== undefined) {
    const icon = parseSocialImageIcon(details.icon);
    const parsed = parseIconSource(icon.src, icon.kind);
    return icon.kind === "app" ? { icon: parsed, type: "app" } : { icon: parsed, type: "mark" };
  }
  if (details.mark !== undefined && details.mark !== null && details.mark !== false) {
    if (typeof details.mark === "string") registeredSocialImageMark(details.mark);
    else assertNoRemoteAssets(details.mark);
    return { node: details.mark, type: "node" };
  }
  const letter = /[\p{L}\p{N}]/u.exec(title)?.[0] ?? /\S/u.exec(title)?.[0] ?? "";
  return { letter, type: "letter" };
}

function tile({ art, palette, size }: {
  art: TileArt;
  palette: SocialImagePalette;
  size: number;
}): ReactElement {
  const radius = Math.round(size * 0.235);
  const glow = `0 ${String(Math.round(size * 0.1))}px ${String(Math.round(size * 0.26))}px ${palette.dark ? rgba(palette.tileTop, 0.55) : rgba(palette.tileBottom, 0.3)}`;
  const rim = Math.max(2, Math.round(size / 120));
  if (art.type === "app") {
    const surface = palette.dark ? mix(palette.background, "#FFFFFF", 0.1) : "#FFFFFF";
    return (
      <div
        style={{
          backgroundColor: surface,
          borderRadius: radius,
          boxShadow: glow,
          display: "flex",
          flexShrink: 0,
          height: size,
          position: "relative",
          width: size,
        }}
      >
        <img
          alt=""
          height={size}
          src={`data:${art.icon.mime};base64,${art.icon.base64}`}
          style={{ borderRadius: radius, height: size, objectFit: "cover", width: size }}
          width={size}
        />
        <div
          style={{
            border: `${String(rim)}px solid ${palette.dark ? "rgba(255, 255, 255, 0.16)" : "rgba(0, 0, 0, 0.08)"}`,
            borderRadius: radius,
            display: "flex",
            height: size,
            left: 0,
            position: "absolute",
            top: 0,
            width: size,
          }}
        />
      </div>
    );
  }
  const glyphBox = Math.round(size * 0.56);
  let glyph: ReactNode;
  if (art.type === "mark") {
    const box = iconBox(art.icon.aspect, glyphBox);
    glyph = (
      <img
        alt=""
        height={box.height}
        src={knockoutSource(art.icon, palette.glyph)}
        style={{ height: box.height, width: box.width }}
        width={box.width}
      />
    );
  } else if (art.type === "node") {
    glyph = sizedMark(art.node, glyphBox);
  } else {
    glyph = (
      <div
        style={{
          display: "flex",
          fontSize: Math.round(size * 0.54),
          fontWeight: 700,
          letterSpacing: 0,
          lineHeight: 1,
          marginTop: -Math.round(size * 0.04),
        }}
      >
        {art.letter}
      </div>
    );
  }
  return (
    <div
      style={{
        alignItems: "center",
        backgroundImage: `linear-gradient(150deg, ${palette.tileTop} 0%, ${palette.tileBottom} 100%)`,
        border: `${String(rim)}px solid ${rgba(mix(palette.tileTop, "#FFFFFF", 0.5), palette.dark ? 0.32 : 0.45)}`,
        borderRadius: radius,
        boxShadow: glow,
        color: palette.glyph,
        display: "flex",
        flexShrink: 0,
        height: size,
        justifyContent: "center",
        width: size,
      }}
    >
      {glyph}
    </div>
  );
}

function ghostArt({ art, palette, size }: {
  art: TileArt;
  palette: SocialImagePalette;
  size: number;
}): ReactElement {
  const faint = mix(palette.background, palette.tileTop, palette.dark ? 0.16 : 0.1);
  if (art.type === "app") {
    return (
      <img
        alt=""
        height={size}
        src={`data:${art.icon.mime};base64,${art.icon.base64}`}
        style={{ borderRadius: Math.round(size * 0.235), height: size, opacity: 0.07, width: size }}
        width={size}
      />
    );
  }
  if (art.type === "mark") {
    const box = iconBox(art.icon.aspect, size);
    return (
      <img
        alt=""
        height={box.height}
        src={knockoutSource(art.icon, faint)}
        style={{ height: box.height, width: box.width }}
        width={box.width}
      />
    );
  }
  if (art.type === "node") {
    return <div style={{ color: faint, display: "flex" }}>{sizedMark(art.node, size)}</div>;
  }
  // A cropped letterform reads as a broken shape, so the monogram fallback
  // ghosts the rounded tile instead.
  return (
    <div
      style={{
        backgroundColor: faint,
        borderRadius: Math.round(size * 0.235),
        display: "flex",
        height: size,
        width: size,
      }}
    />
  );
}

/* ----------------------------------------------------------------- layout */

function lines({ color: textColor, text, style }: {
  color?: string;
  text: TextBlock;
  style?: Readonly<Record<string, unknown>>;
}): ReactElement {
  return (
    <div
      style={{
        ...(textColor === undefined ? {} : { color: textColor }),
        display: "flex",
        flexDirection: "column",
        fontSize: text.size,
        fontWeight: text.style.weight,
        letterSpacing: `${String(text.style.tracking)}em`,
        lineHeight: text.style.lineHeight,
        ...style,
      }}
    >
      {text.lines.map((line, index) => (
        <div key={`${String(index)}:${line}`} style={{ display: "flex", whiteSpace: "nowrap" }}>
          {line}
        </div>
      ))}
    </div>
  );
}

function fieldBackground(palette: SocialImagePalette, x: string, y: string): string {
  const glow = palette.dark ? 0.3 : 0.16;
  return [
    `radial-gradient(circle at ${x} ${y}, ${rgba(palette.tileTop, glow)} 0%, ${rgba(palette.tileTop, 0)} 42%)`,
    `linear-gradient(155deg, ${palette.background} 0%, ${palette.background} 38%, ${palette.backgroundTint} 100%)`,
  ].join(", ");
}

const NAME: TextStyle = { lineHeight: 1.04, tracking: -0.02, weight: 700 };
const HEADLINE: TextStyle = { lineHeight: 1.06, tracking: -0.02, weight: 700 };
const BODY: TextStyle = { lineHeight: 1.3, tracking: 0, weight: 400 };
const LABEL: TextStyle = { lineHeight: 1.2, tracking: 0, weight: 700 };

type Copy = Readonly<{
  description: string;
  domain: string;
  eyebrow: string | undefined;
  headline: string;
  lockup: string;
}>;

type Box = Readonly<{ height: number; width: number; x: number; y: number }>;

type CardLayout = Readonly<{ element: ReactElement; ghost?: Box; textBoxes: readonly Box[] }>;

function eyebrowKicker(copy: Copy, shown: readonly string[]): string | undefined {
  if (copy.eyebrow === undefined || copy.eyebrow.trim().length === 0) return undefined;
  const key = brandKey(copy.eyebrow);
  return shown.some((text) => brandKey(text) === key) ? undefined : copy.eyebrow.trim();
}

const PRODUCT = {
  gap: 60,
  maxGroup: 510,
  pad: 72,
  tile: 304,
} as const;

function productCard(
  copy: Copy,
  art: TileArt,
  palette: SocialImagePalette,
  fonts: SocialImageFonts,
): CardLayout {
  const column = CARD_WIDTH - PRODUCT.pad * 2 - PRODUCT.tile - PRODUCT.gap;
  const kickerText = eyebrowKicker(copy, [copy.headline, copy.domain]);
  const kicker = kickerText === undefined
    ? undefined
    : fitClamped(fonts, kickerText, column, 32, 1, LABEL);
  const kickerSpace = kicker === undefined ? 0 : blockHeight(kicker) + 14;

  const name = fitWhole(fonts, copy.headline, column, [104, 96, 88, 80, 72], 1, NAME)
    ?? fitWhole(fonts, copy.headline, column, [80, 72, 66, 60, 56, 52, 48], 2, NAME)
    // A sentence passed as the title may take a third line rather than
    // break a proper name or lose its ending to an ellipsis.
    ?? fitWhole(fonts, copy.headline, column, [48], 3, NAME)
    ?? fitClamped(fonts, copy.headline, column, 48, 3, NAME);
  const domain = fitClamped(fonts, copy.domain, column, 34, 1, LABEL);
  const nameGap = 20;
  const domainGap = 30;
  const descBudget = PRODUCT.maxGroup - kickerSpace - blockHeight(name) - blockHeight(domain) - domainGap - nameGap;

  let description: TextBlock | undefined;
  if (copy.description.length > 0) {
    const fitsBudget = (candidate: TextBlock | null) =>
      candidate !== null && blockHeight(candidate) <= descBudget ? candidate : null;
    description = fitsBudget(fitWhole(fonts, copy.description, column, [40, 38, 36, 34, 32, 30], 2, BODY))
      ?? fitsBudget(fitWhole(fonts, copy.description, column, [36, 34, 32], 3, BODY))
      ?? fitClamped(
        fonts,
        copy.description,
        column,
        SOCIAL_IMAGE_MIN_FONT_SIZE,
        Math.max(1, Math.min(3, Math.floor(descBudget / (SOCIAL_IMAGE_MIN_FONT_SIZE * BODY.lineHeight)))),
        BODY,
      );
  }

  const groupHeight = kickerSpace + blockHeight(name)
    + (description === undefined ? 0 : nameGap + blockHeight(description))
    + domainGap + blockHeight(domain);
  const x = PRODUCT.pad + PRODUCT.tile + PRODUCT.gap;
  let y = (CARD_HEIGHT - groupHeight) / 2;
  const textBoxes: Box[] = [];
  const place = (text: TextBlock | undefined, gapAfter: number) => {
    if (text === undefined) return;
    text.widths.forEach((width, index) => {
      textBoxes.push({ height: text.size * text.style.lineHeight, width, x, y: y + index * text.size * text.style.lineHeight });
    });
    y += blockHeight(text) + gapAfter;
  };
  place(kicker, 14);
  place(name, description === undefined ? 0 : nameGap);
  place(description, 0);
  y += domainGap;
  place(domain, 0);

  const element = (
    <div
      style={{
        alignItems: "center",
        backgroundImage: fieldBackground(palette, `${String(PRODUCT.pad + PRODUCT.tile / 2)}px`, "50%"),
        display: "flex",
        height: "100%",
        padding: `0 ${String(PRODUCT.pad)}px`,
        width: "100%",
      }}
    >
      {tile({ art, palette, size: PRODUCT.tile })}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginLeft: PRODUCT.gap,
          width: column,
        }}
      >
        {kicker === undefined ? null : lines({ color: palette.primaryText, style: { marginBottom: 14 }, text: kicker })}
        {lines({ text: name })}
        {description === undefined ? null : (
          lines({ color: palette.muted, style: { marginTop: nameGap }, text: description })
        )}
        {lines({ color: palette.primaryText, style: { marginTop: domainGap }, text: domain })}
      </div>
    </div>
  );
  return { element, textBoxes };
}

const PAGE = {
  bottom: 72,
  descriptionWidth: 860,
  headlineWidth: 880,
  headGap: 30,
  lockup: 112,
  lockupGap: 28,
  minGapBelowLockup: 40,
  pad: 72,
  top: 60,
} as const;

function pageCard(
  copy: Copy,
  art: TileArt,
  palette: SocialImagePalette,
  fonts: SocialImageFonts,
): CardLayout {
  const width: number = PAGE.headlineWidth;
  const lockupWidth = width - PAGE.lockup - PAGE.lockupGap;
  const lockupName = fitClamped(fonts, copy.lockup, lockupWidth, 42, 1, LABEL);
  const lockupDomain = fitClamped(fonts, copy.domain, lockupWidth, 34, 1, LABEL);
  const kickerText = eyebrowKicker(copy, [copy.lockup, copy.domain, copy.headline]);
  const kicker = kickerText === undefined ? undefined : fitClamped(fonts, kickerText, width, 32, 1, LABEL);
  const kickerSpace = kicker === undefined ? 0 : blockHeight(kicker) + 16;
  const available = CARD_HEIGHT - PAGE.top - PAGE.bottom - PAGE.lockup - PAGE.minGapBelowLockup - kickerSpace;

  const headSizes = [96, 88, 80, 72, 66, 60, 54, 50] as const;
  const descSizes = [36, 34, 32, 30] as const;
  const descriptionWidth = Math.min(width, PAGE.descriptionWidth);
  let headline: TextBlock | undefined;
  let description: TextBlock | undefined;
  const hasDescription = copy.description.length > 0;

  search: for (const size of headSizes) {
    const head = fitWhole(fonts, copy.headline, width, [size], 3, HEADLINE);
    if (head === null) continue;
    if (!hasDescription) {
      if (blockHeight(head) <= available) {
        headline = head;
        break;
      }
      continue;
    }
    for (const descSize of descSizes) {
      const desc = fitWhole(fonts, copy.description, descriptionWidth, [descSize], 2, BODY);
      if (desc !== null && blockHeight(head) + PAGE.headGap + blockHeight(desc) <= available) {
        headline = head;
        description = desc;
        break search;
      }
    }
  }
  if (headline === undefined) {
    // No size keeps the whole description; keep the largest headline that
    // leaves room for two clamped description lines, then one.
    for (const lines of hasDescription ? [2, 1, 0] : [0]) {
      const room = available - (lines === 0 ? 0 : PAGE.headGap + lines * SOCIAL_IMAGE_MIN_FONT_SIZE * BODY.lineHeight);
      for (const size of headSizes) {
        const head = fitWhole(fonts, copy.headline, width, [size], 3, HEADLINE);
        if (head !== null && blockHeight(head) <= room) {
          headline = head;
          break;
        }
      }
      if (headline !== undefined) {
        description = lines === 0
          ? undefined
          : fitClamped(fonts, copy.description, descriptionWidth, SOCIAL_IMAGE_MIN_FONT_SIZE, lines, BODY);
        break;
      }
    }
  }
  if (headline === undefined) {
    const smallest = headSizes[headSizes.length - 1] ?? 50;
    headline = fitClamped(
      fonts,
      copy.headline,
      width,
      smallest,
      Math.max(1, Math.floor(available / (smallest * HEADLINE.lineHeight))),
      HEADLINE,
    );
  }

  // Short copy would leave a dead band under the lockup, so the text group
  // sits centred in the space between the lockup and the bottom padding.
  const stackHeight = kickerSpace + blockHeight(headline)
    + (description === undefined ? 0 : PAGE.headGap + blockHeight(description));
  const lift = Math.max(0, Math.floor((available + kickerSpace - stackHeight) / 2));

  const textBoxes: Box[] = [];
  const push = (text: TextBlock, top: number, left: number = PAGE.pad) => {
    text.widths.forEach((lineWidth, index) => {
      const lineHeight = text.size * text.style.lineHeight;
      textBoxes.push({ height: lineHeight, width: lineWidth, x: left, y: top + index * lineHeight });
    });
  };
  const lockupTextHeight = blockHeight(lockupName) + 2 + blockHeight(lockupDomain);
  const lockupTextTop = PAGE.top + (PAGE.lockup - lockupTextHeight) / 2;
  push(lockupName, lockupTextTop, PAGE.pad + PAGE.lockup + PAGE.lockupGap);
  push(lockupDomain, lockupTextTop + blockHeight(lockupName) + 2, PAGE.pad + PAGE.lockup + PAGE.lockupGap);
  textBoxes.push({ height: PAGE.lockup, width: PAGE.lockup, x: PAGE.pad, y: PAGE.top });
  const bottom = CARD_HEIGHT - PAGE.bottom - lift;
  const descriptionTop = description === undefined ? bottom : bottom - blockHeight(description);
  const headlineTop = descriptionTop - (description === undefined ? 0 : PAGE.headGap) - blockHeight(headline);
  if (description !== undefined) push(description, descriptionTop);
  push(headline, headlineTop);
  if (kicker !== undefined) push(kicker, headlineTop - kickerSpace);

  const ghost = ghostPlacement(art, textBoxes);

  const element = (
    <div
      style={{
        backgroundImage: fieldBackground(palette, `${String(PAGE.pad + PAGE.lockup / 2)}px`, `${String(PAGE.top + PAGE.lockup / 2)}px`),
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: `${String(PAGE.top)}px ${String(PAGE.pad)}px ${String(PAGE.bottom)}px`,
        position: "relative",
        width: "100%",
      }}
    >
      {ghost === undefined ? null : (
        <div style={{ display: "flex", left: ghost.x, position: "absolute", top: ghost.y }}>
          {ghostArt({ art, palette, size: ghost.size })}
        </div>
      )}
      <div style={{ alignItems: "center", display: "flex", height: PAGE.lockup }}>
        {tile({ art, palette, size: PAGE.lockup })}
        <div style={{ display: "flex", flexDirection: "column", marginLeft: PAGE.lockupGap }}>
          {lines({ text: lockupName })}
          {lines({ color: palette.primaryText, style: { marginTop: 2 }, text: lockupDomain })}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "flex-end",
          paddingBottom: lift,
        }}
      >
        {kicker === undefined ? null : lines({ color: palette.primaryText, style: { marginBottom: 16 }, text: kicker })}
        {lines({ text: headline })}
        {description === undefined ? null : (
          lines({ color: palette.muted, style: { marginTop: PAGE.headGap }, text: description })
        )}
      </div>
    </div>
  );
  return {
    element,
    ...(ghost === undefined ? {} : { ghost: ghostBox(art, ghost) }),
    textBoxes: textBoxes.slice(0, 2).concat(textBoxes.slice(3)),
  };
}

type GhostPlacement = Readonly<{ size: number; x: number; y: number }>;

function ghostBox(art: TileArt, ghost: GhostPlacement): Box {
  const box = iconBox(artAspect(art), ghost.size);
  return { height: box.height, width: box.width, x: ghost.x, y: ghost.y };
}

function artAspect(art: TileArt): number {
  return art.type === "app" || art.type === "mark" ? (art.type === "app" ? 1 : art.icon.aspect) : 1;
}

/**
 * Places a large faint copy of the icon so it bleeds off the bottom-right
 * corner without touching any text line. Returns undefined when even the
 * smallest candidate would overlap text.
 */
function ghostPlacement(art: TileArt, textBoxes: readonly Box[]): GhostPlacement | undefined {
  const clearance = 36;
  const aspect = artAspect(art);
  for (const size of [520, 480, 440, 400, 360]) {
    const box = iconBox(aspect, size);
    const y = CARD_HEIGHT - Math.round(box.height * 0.7);
    let x = CARD_WIDTH - Math.round(box.width * 0.66);
    for (const text of textBoxes) {
      if (text.y + text.height + clearance > y) x = Math.max(x, text.x + text.width + clearance);
    }
    if (CARD_WIDTH - x >= box.width * 0.34) return { size, x, y };
  }
  return undefined;
}

/* ------------------------------------------------------------------ entry */

export function socialImageFonts(): SocialImageFonts {
  return nebulaSansSocialFonts();
}

export function createSocialImageElement(
  details: SocialImageDetails,
): ReactElement {
  return createSocialImageCard(details).element;
}

function oneLine(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

/** Where each text line and the page-layout ghost land, in card pixels. */
export type SocialImageGeometry = Readonly<{
  ghost?: Readonly<{ height: number; width: number; x: number; y: number }>;
  textBoxes: readonly Readonly<{ height: number; width: number; x: number; y: number }>[];
}>;

/**
 * The laid-out geometry of a card, for checks that text and decoration never
 * collide. It renders nothing.
 */
export function socialImageGeometry(details: SocialImageDetails): SocialImageGeometry {
  const { ghost, textBoxes } = renderSocialImageCard(details);
  return ghost === undefined ? { textBoxes } : { ghost, textBoxes };
}

function renderSocialImageCard(
  details: SocialImageDetails,
): SocialImageCard & { ghost?: Box; textBoxes: readonly Box[] } {
  const palette = socialImagePalette(details.theme ?? {});
  const layout = socialImageLayout(details);
  const fonts = nebulaSansSocialFonts();
  const copy = {
    description: normalizeSocialImageText(details.description),
    domain: normalizeSocialImageText(details.domain),
    eyebrow: details.eyebrow === undefined
      ? undefined
      : normalizeSocialImageText(details.eyebrow),
    headline: normalizeSocialImageText(socialImageHeadline(details)),
    lockup: normalizeSocialImageText(lockupName(details)),
  };
  assertSocialImageText(copy.description, "description", fonts);
  assertSocialImageText(copy.domain, "domain", fonts);
  if (copy.eyebrow !== undefined) {
    assertSocialImageText(copy.eyebrow, "eyebrow", fonts);
  }
  assertSocialImageText(
    copy.headline,
    details.headline === undefined ? "title" : "headline",
    fonts,
  );
  assertSocialImageText(copy.lockup, "title", fonts);
  const flat: Copy = {
    description: oneLine(copy.description),
    domain: oneLine(copy.domain),
    eyebrow: copy.eyebrow === undefined ? undefined : oneLine(copy.eyebrow),
    headline: oneLine(copy.headline),
    lockup: oneLine(copy.lockup),
  };
  const art = tileArt(details, flat.lockup.length > 0 ? flat.lockup : flat.headline);
  const card = layout === "page"
    ? pageCard(flat, art, palette, fonts)
    : productCard(flat, art, palette, fonts);

  return {
    element: (
      <div
        style={{
          backgroundColor: palette.background,
          color: palette.foreground,
          display: "flex",
          fontFamily: "Nebula Sans",
          fontSize: 32,
          height: "100%",
          width: "100%",
        }}
      >
        {card.element}
      </div>
    ),
    fonts,
    ...(card.ghost === undefined ? {} : { ghost: card.ghost }),
    height: CARD_HEIGHT,
    textBoxes: card.textBoxes,
    width: CARD_WIDTH,
  };
}

export function createSocialImageCard(
  details: SocialImageDetails,
): SocialImageCard {
  const { element, fonts, height, width } = renderSocialImageCard(details);
  return { element, fonts, height, width };
}

/**
 * One site's social identity, declared once and shared by every card the
 * site renders. The card design itself stays in this package.
 */
export type SocialImageSite = Readonly<{
  description: string;
  domain: string;
  icon?: SocialImageIcon;
  mark?: SocialImageDetails["mark"];
  name: string;
  theme?: Partial<SocialImageTheme>;
}>;

/** Per-page copy layered over a site. Omit it for the site's home card. */
export type SocialImagePage = Readonly<{
  description?: string;
  eyebrow?: string;
  headline?: string;
  layout?: SocialImageLayout;
}>;

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`social image site ${label} must be non-empty text`);
  }
  return value;
}

export function defineSocialImageSite(site: SocialImageSite): SocialImageSite {
  const value: unknown = site;
  if (typeof value !== "object" || value === null) {
    throw new TypeError("social image site must be an object");
  }
  requiredText(site.name, "name");
  requiredText(site.domain, "domain");
  requiredText(site.description, "description");
  const icon = site.icon === undefined ? undefined : parseSocialImageIcon(site.icon);
  return Object.freeze({ ...site, ...(icon === undefined ? {} : { icon }) });
}

export function socialImageSiteDetails(
  site: SocialImageSite,
  page: SocialImagePage = {},
): SocialImageDetails {
  return {
    description: page.description ?? site.description,
    domain: site.domain,
    title: site.name,
    ...(page.eyebrow === undefined ? {} : { eyebrow: page.eyebrow }),
    ...(page.headline === undefined ? {} : { headline: page.headline }),
    ...(page.layout === undefined ? {} : { layout: page.layout }),
    ...(site.icon === undefined ? {} : { icon: site.icon }),
    ...(site.mark === undefined ? {} : { mark: site.mark }),
    ...(site.theme === undefined ? {} : { theme: site.theme }),
  };
}

export function socialImageAlt(
  site: SocialImageSite,
  page: SocialImagePage = {},
): string {
  if (page.headline !== undefined && page.headline !== site.name) {
    return `${page.headline}, from ${site.name}`;
  }
  return `${site.name}: ${page.description ?? site.description}`;
}

