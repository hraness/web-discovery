import { nebulaSansSocialFonts } from "@hraness/design-kit/fonts/nebula-sans/social";
import { cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";

import { pngCoverage } from "./social-image-raster.js";
import type { RasterCoverage } from "./social-image-raster.js";

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
  /**
   * The brand color the background wash is tinted toward. Defaults to the
   * main color of an `app` icon, else `accent`, so two sites that share a
   * background token still get cards of their own.
   */
  wash?: string;
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
  /**
   * Throw instead of adapting when the copy does not fit as written: a
   * description that has to be shortened, a three-line headline, characters
   * the embedded fonts cannot draw, or a bracketed placeholder such as
   * "[DRAFT]". Use it in tests and builds; `socialImageFit` reports the same
   * findings without throwing.
   */
  strict?: boolean;
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
  /** Far end of the background gradient: a pale wash of the brand color. */
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
  /** The brand color behind the background wash and the icon glow. */
  wash: string;
}>;

/**
 * The page wash runs from the site background to a pale version of the
 * accent, so two sites that share a background token (a cream paper, say)
 * still get their own tint from their own brand color.
 */
function backgroundStops(background: string, wash: string, dark: boolean) {
  // The wash is mixed into the base itself, not only the far corner, so the
  // whole card carries the brand hue; the gradient then deepens it.
  const pale = dark ? wash : mix("#FFFFFF", wash, 0.42);
  const base = mix(background, pale, dark ? 0.08 : 0.3);
  const tint = mix(background, pale, dark ? 0.2 : 0.72);
  const glow = mix(tint, wash, dark ? 0.12 : 0.1);
  return { base, glow, tint, surfaces: [base, tint, glow] as const };
}

/**
 * Resolves a card theme into the colors the card draws. The accent is the
 * product primary. A mid-tone background moves toward black or white until
 * body text can reach 7:1.
 */
export function socialImagePalette(
  theme: Partial<SocialImageTheme> = {},
  /** Wash color used when the theme sets none, such as an app icon's hue. */
  brand?: string,
): SocialImagePalette {
  const resolved = parseSocialImageTheme(theme);
  const wash = resolved.wash ?? (brand === undefined ? resolved.accent : color(brand, "brand"));
  const dark = relativeLuminance(resolved.foreground) > relativeLuminance(resolved.background);
  const extremeInk = dark ? "#FFFFFF" : "#000000";
  const extremeField = dark ? "#000000" : "#FFFFFF";
  let background = resolved.background;
  for (let step = 0; step <= 50; step += 1) {
    background = mix(resolved.background, extremeField, step / 50);
    const { surfaces } = backgroundStops(background, wash, dark);
    if (worstContrast(extremeInk, surfaces) >= 7.5) break;
  }
  const { base, surfaces, tint } = backgroundStops(background, wash, dark);
  const foreground = readable(resolved.foreground, extremeInk, surfaces, 7);
  const muted = readable(resolved.muted, foreground, surfaces, dark ? 7 : 4.5);
  const primaryText = readable(resolved.accent, foreground, surfaces, 4.5);
  const tileTop = dark ? resolved.accent : mix(resolved.accent, "#FFFFFF", 0.12);
  const tileBottom = mix(resolved.accent, "#000000", dark ? 0.24 : 0.12);
  const glyph = socialImageContrastRatio("#FFFFFF", mix(tileTop, tileBottom, 0.5)) >= 3
    ? "#FFFFFF"
    : readable(mix(resolved.accent, "#000000", 0.55), "#000000", [tileTop, tileBottom], 4.5);
  return {
    background: base,
    backgroundTint: tint,
    dark,
    foreground,
    glyph,
    muted,
    primaryText,
    surfaces,
    tileBottom,
    tileTop,
    wash,
  };
}

function parseSocialImageTheme(theme: unknown): SocialImageTheme {
  if (theme === undefined) return plainSocialImageTheme;
  if (typeof theme !== "object" || theme === null || Array.isArray(theme)) {
    throw new TypeError("theme must be an object of six-digit hex colors.");
  }
  const fields = theme as Record<string, unknown>;
  const pick = (key: keyof typeof plainSocialImageTheme) =>
    color(fields[key] ?? plainSocialImageTheme[key], key);
  return {
    accent: pick("accent"),
    background: pick("background"),
    foreground: pick("foreground"),
    muted: pick("muted"),
    ...(fields.wash === undefined ? {} : { wash: color(fields.wash, "wash") }),
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

type TextField = "description" | "domain" | "eyebrow" | "headline" | "title";

/** Characters a card dropped from one field, and why. */
export type SocialImageRemoval = Readonly<{
  field: TextField;
  reason: "placeholder" | "unsupported";
  text: string;
}>;

/**
 * Bracketed placeholders left in by drafts and CMS defaults. They are removed
 * wherever they appear; a field that holds nothing else counts as empty.
 */
const PLACEHOLDER = /\[\s*(?:draft|wip|untitled|todo|tbd|tk|placeholder|fixme|no title|title|description|headline|coming soon|preview|lorem ipsum)\s*\]/giu;

// Emoji sequences and their joiners, selectors, skin tones, tags, and keycaps.
const EMOJI = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u200D|\uFE0E|\uFE0F|\u20E3|[\u{1F3FB}-\u{1F3FF}]|[\u{E0020}-\u{E007F}])+/gu;

function covered(fonts: SocialImageFonts, codePoint: number): boolean {
  return fonts.every(({ data }) => fontHasGlyph(data, codePoint));
}

/** Collapses the spaces and stray separators that removals leave behind. */
function tidy(value: string): string {
  return value
    .replace(/[ \u00A0]{2,}/gu, " ")
    .replace(/ +([,.;:!?)\]])/gu, "$1")
    .replace(/([([]) +/gu, "$1")
    .replace(/\(\s*\)|\[\s*\]/gu, "")
    .replace(/^[\s,.;:|·–—-]+/u, "")
    .replace(/[\s,;:|·–—-]+$/u, "")
    .trim();
}

/**
 * Drops bracketed placeholders and every character the embedded fonts cannot
 * draw (emoji, CJK, and other scripts outside Nebula Sans), so the renderer
 * never falls back to a tofu box or a network font. Deterministic: the same
 * input always yields the same text.
 */
function cleanSocialImageText(
  value: string,
  field: TextField,
  fonts: SocialImageFonts,
  removals: SocialImageRemoval[],
): string {
  const before = removals.length;
  let text = value.replace(PLACEHOLDER, (match) => {
    removals.push({ field, reason: "placeholder", text: match });
    return " ";
  });
  const dropped: string[] = [];
  text = text.replace(EMOJI, (match) => {
    dropped.push(match);
    return " ";
  });
  let kept = "";
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint === 0x0a || covered(fonts, codePoint)) {
      kept += character;
    } else {
      dropped.push(character);
      kept += " ";
    }
  }
  if (dropped.length > 0) removals.push({ field, reason: "unsupported", text: dropped.join("") });
  if (removals.length === before) return value;
  return kept.split("\n").map(tidy).map(withoutDashFragment).filter((line) => line.length > 0).join("\n");
}

/**
 * A removal can leave one word stranded after a dash ("fuentes oficiales —
 * too"). A dash is a clause boundary, so the cut goes before it: the dash and
 * a trailing fragment of one word are dropped.
 */
function withoutDashFragment(line: string): string {
  const match = /^(.*\S)\s+[–—-]\s+(\S+)$/u.exec(line);
  if (match === null) return line;
  const head = match[1] ?? line;
  const closing = /[.!?]$/u.exec(match[2] ?? "")?.[0] ?? "";
  return /[.!?]$/u.test(head) ? head : `${head}${closing}`;
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

/** Words that read as dangling when they end a line or a shortened text. */
const BINDING_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "is", "its", "nor", "of", "on",
  "or", "our", "so", "than", "that", "the", "their", "to", "via", "vs", "with", "your", "&", "+",
]);

function bare(word: string): string {
  return word.replace(/[^\p{L}\p{N}&+]/gu, "").toLocaleLowerCase("en-US");
}

function dangling(word: string | undefined): boolean {
  return word !== undefined && !ENDS_PHRASE.test(word) && BINDING_WORDS.has(bare(word));
}

/**
 * Chooses where to break `text` into the fewest lines that fit, scoring every
 * candidate: lines of even length win, and a line may not end on a binding
 * word ("the", "and"), inside a proper name, or leave one word alone.
 */
function balanceText(text: string, width: number, measure: Measure): string[] {
  // Every word boundary is a candidate. Short words never end a line, as in
  // wrapText; a number or a break inside a two-word name may, at a cost
  // lower than leaving one word alone on the last line.
  const words = text.split(/\s+/u).filter((word) => word.length > 0);
  const wordCount = words.length;
  const count = greedyLines(words, width, measure).length;
  if (count < 2 || count > 3 || words.length > 60) return wrapText(text, width, measure);
  const widths = new Map<string, number>();
  const size = (line: string) => {
    let value = widths.get(line);
    if (value === undefined) {
      value = measure(line);
      widths.set(line, value);
    }
    return value;
  };
  const penalty = (lastWord: string | undefined, nextWord: string | undefined) => {
    const letters = bare(lastWord ?? "");
    const open = !ENDS_PHRASE.test(lastWord ?? "");
    if (open && /^\p{Ll}{1,3}$/u.test(letters)) return Number.POSITIVE_INFINITY;
    if (dangling(lastWord)) return 0.6;
    if (open && capitalized(lastWord) && capitalized(nextWord)) return 0.8;
    if (open && /^\p{N}/u.test(letters)) return 0.2;
    return /[,;:.!?]$/u.test(lastWord ?? "") ? -0.02 : 0;
  };
  let best: { cost: number; lines: string[] } | undefined;
  const consider = (cuts: readonly number[]) => {
    const bounds = [0, ...cuts, words.length];
    const lines: string[] = [];
    let cost = 0;
    for (let index = 0; index < bounds.length - 1; index += 1) {
      const from = bounds[index] ?? 0;
      const to = bounds[index + 1] ?? 0;
      const line = words.slice(from, to).join(" ");
      if (size(line) > width) return;
      lines.push(line);
      if (index < bounds.length - 2) cost += penalty(words[to - 1], words[to]);
      // A lone word is an orphan; one left on the last line (a widow) reads
      // worst, so it costs more than a short lead-in line.
      if (!line.includes(" ") && wordCount >= 4) cost += index === bounds.length - 2 ? 0.5 : 0.2;
    }
    const lengths = lines.map(size);
    const longest = Math.max(...lengths);
    for (const length of lengths) cost += ((longest - length) / width) ** 2;
    if (!Number.isFinite(cost)) return;
    if (best === undefined || cost < best.cost) best = { cost, lines };
  };
  for (let first = 1; first < words.length; first += 1) {
    if (count === 2) {
      consider([first]);
      continue;
    }
    for (let second = first + 1; second < words.length; second += 1) consider([first, second]);
  }
  return best?.lines ?? wrapText(text, width, measure);
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
    last = `${withoutDanglingEnd(last.replace(/[\s,.;:!?\-–—]+$/u, ""))}${ELLIPSIS}`;
  }
  return [...head.map(fit), last];
}

/** Drops trailing binding words ("and", "the") so a cut never dangles. */
function withoutDanglingEnd(text: string): string {
  const words = text.split(" ");
  while (words.length > 1 && dangling(words[words.length - 1])) words.pop();
  return words.join(" ").replace(/[\s,;:\-–—]+$/u, "");
}

type Cut = "clause" | "ellipsis" | "none" | "sentence";

/**
 * Shorter versions of `text` that end at a natural boundary, longest first:
 * whole sentences, then clauses ending before a comma, semicolon, colon,
 * dash, or parenthesis. A clause keeps the text's closing punctuation.
 */
function boundaryCuts(text: string): { clause: string[]; sentence: string[] } {
  const sentence: string[] = [];
  const clause: string[] = [];
  const closing = /[.!?]$/u.exec(text)?.[0] ?? "";
  for (const match of text.matchAll(/[.!?]["'”’)]?(?=\s+["'“‘(]?[\p{Lu}\p{N}])/gu)) {
    const end = match.index + match[0].length;
    const words = text.slice(0, end).split(/\s+/u);
    // "e.g." and "v1." are not sentence ends.
    if (/^(?:e\.g|i\.e|etc|vs|v\d[\w.]*|mr|ms|dr|no)\.$/iu.test(words[words.length - 1] ?? "")) continue;
    sentence.push(text.slice(0, end).trim());
  }
  for (const match of text.matchAll(/[,;:](?=\s)|\s[–—-]\s|\s\(|\s(?=(?:and|but|while|so|yet|which|where)\s)/gu)) {
    const index = match.index;
    if (match[0] === "," || /^\s$/u.test(match[0])) {
      // A comma inside a list ("the score, setup, and main limit") is not a
      // clause end: cutting there leaves half a list. Only the first comma
      // of a sentence counts as a clause boundary.
      const sentenceStart = Math.max(0, ...[...text.slice(0, index).matchAll(/[.!?;:]\s/gu)].map((m) => m.index + 2));
      if (text.slice(sentenceStart, index).includes(",")) continue;
    }
    const head = withoutDanglingEnd(text.slice(0, index).trim());
    if (head.length === 0) continue;
    const ended = /[.!?]$/u.test(head) ? head : `${head}${closing}`;
    clause.push(ended);
  }
  const unique = (list: string[]) => [...new Set(list)].sort((a, b) => b.length - a.length);
  return { clause: unique(clause), sentence: unique(sentence) };
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

type FitBlock = TextBlock & Readonly<{ cut: Cut }>;

/** A shortened description must still say something. */
const MIN_CUT_LENGTH = 24;

/**
 * Fits a description without an ellipsis: the whole text at the largest size
 * in `sizes`, else the longest whole-sentence version, else the longest
 * clause version (a sentence wins unless the clause keeps far more text).
 * Returns null when nothing fits `accept`.
 */
function fitDescription(
  fonts: SocialImageFonts,
  text: string,
  width: number,
  sizes: readonly number[],
  maxLines: number,
  accept: (candidate: TextBlock) => boolean,
  allowCut: boolean,
): FitBlock | null {
  const fit = (value: string) => {
    for (const size of sizes) {
      const candidate = fitWhole(fonts, value, width, [size], maxLines, BODY);
      if (candidate !== null && accept(candidate)) return candidate;
    }
    return null;
  };
  const whole = fit(text);
  if (whole !== null) return { ...whole, cut: "none" };
  if (!allowCut) return null;
  const { clause, sentence } = boundaryCuts(text);
  const longest = (list: readonly string[]) => {
    for (const value of list) {
      if (value.length < MIN_CUT_LENGTH || value.split(" ").length < 3) continue;
      const candidate = fit(value);
      if (candidate !== null) return { block: candidate, length: value.length };
    }
    return undefined;
  };
  const bySentence = longest(sentence);
  const byClause = longest(clause);
  if (bySentence !== undefined && (byClause === undefined || bySentence.length >= byClause.length * 0.6)) {
    return { ...bySentence.block, cut: "sentence" };
  }
  return byClause === undefined ? null : { ...byClause.block, cut: "clause" };
}

/** Last resort: whole words and an ellipsis in `maxLines` at the minimum size. */
function clampDescription(fonts: SocialImageFonts, text: string, width: number, maxLines: number): FitBlock {
  const clamped = fitClamped(fonts, text, width, SOCIAL_IMAGE_MIN_FONT_SIZE, maxLines, BODY);
  const cut: Cut = clamped.lines.some((line) => line.endsWith(ELLIPSIS)) ? "ellipsis" : "none";
  return { ...clamped, cut };
}

/* ------------------------------------------------------------------- icon */

type ParsedIcon = Readonly<{
  aspect: number;
  /** The art's own bounds inside the image, as fractions; the whole image when unknown. */
  bounds: Readonly<{ bottom: number; left: number; right: number; top: number }>;
  kind: "app" | "mark";
  /** The source re-encoded as base64 so it nests safely inside SVG. */
  base64: string;
  /** How the art sits in its tile: see {@link SocialImageIconShape}. */
  shape: SocialImageIconShape;
  /** The main saturated color of the art, when it can be measured. */
  hue?: string;
  mime: "image/png" | "image/svg+xml";
}>;

const WHOLE = { bottom: 1, left: 0, right: 1, top: 0 } as const;

/**
 * How an `app` icon is drawn, measured from the art itself:
 *
 * - `square`: the art paints its whole canvas (opaque corners), so it fills
 *   the rounded tile edge to edge and the tile clips it.
 * - `solid`: the art is a filled silhouette with its own edge, such as a disc
 *   or a rounded square. It is cropped to that edge and drawn alone at the
 *   tile's size, with no tile behind it, so no rim shows around it.
 * - `open`: anything else (an outline, a glyph on a transparent canvas). It
 *   sits on a neutral plate, cropped and centered in the same 60% safe area
 *   as a `mark` glyph.
 */
export type SocialImageIconShape = "open" | "solid" | "square";

/**
 * True when an SVG paints its whole view box: a first shape that is an
 * unrounded rect from the origin covering the view box. Shaped art such as
 * a disc or a rounded square counts as not full bleed.
 */
function svgShape(svg: string): SocialImageIconShape {
  if (svgFullBleed(svg)) return "square";
  const open = /<svg\b[^>]*>/iu.exec(svg)?.[0] ?? "";
  const box = /viewBox\s*=\s*["']\s*[-+\d.eE]+[\s,]+[-+\d.eE]+[\s,]+([\d.eE+]+)[\s,]+([\d.eE+]+)/u.exec(open);
  const body = svg.slice(svg.indexOf(open) + open.length).replace(/<defs\b[\s\S]*?<\/defs>/giu, "");
  const first = /<(rect|circle|ellipse|path|g|polygon|image|use|text|line|polyline)\b[^>]*>/iu.exec(body);
  const tag = first?.[1]?.toLowerCase();
  if (first === null || /\bfill\s*=\s*["']none["']/u.test(first[0])) return "open";
  const attr = (name: string) => Number(new RegExp(`\\b${name}\\s*=\\s*["']([-+\\d.eE]+)["']`, "u").exec(first[0])?.[1] ?? Number.NaN);
  const width = Number(box?.[1] ?? Number.NaN);
  const height = Number(box?.[2] ?? Number.NaN);
  const large = (value: number, full: number) => Number.isFinite(value) && Number.isFinite(full) && value >= full * 0.8;
  if (tag === "circle") return large(attr("r") * 2, Math.min(width, height)) ? "solid" : "open";
  if (tag === "ellipse") return large(attr("rx") * 2, width) && large(attr("ry") * 2, height) ? "solid" : "open";
  if (tag === "rect") return large(attr("width"), width) && large(attr("height"), height) ? "solid" : "open";
  return "open";
}

function svgFullBleed(svg: string): boolean {
  const open = /<svg\b[^>]*>/iu.exec(svg)?.[0] ?? "";
  const box = /viewBox\s*=\s*["']\s*([-+\d.eE]+)[\s,]+([-+\d.eE]+)[\s,]+([\d.eE+]+)[\s,]+([\d.eE+]+)/u.exec(open);
  const body = svg.slice(svg.indexOf(open) + open.length).replace(/<defs\b[\s\S]*?<\/defs>/giu, "");
  const first = /<(rect|circle|ellipse|path|g|polygon|image|use|text|line|polyline)\b[^>]*>/iu.exec(body);
  if (first?.[1]?.toLowerCase() !== "rect") return false;
  const attr = (name: string) => new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "u").exec(first[0])?.[1];
  if (/\bfill\s*=\s*["']none["']/u.test(first[0])) return false;
  const round = Number(attr("rx") ?? attr("ry") ?? 0);
  const fullWidth = box?.[3] ?? "100%";
  const fullHeight = box?.[4] ?? "100%";
  const at = (value: string | undefined, origin: string) => Number(value ?? 0) === Number(origin);
  const covers = (value: string | undefined, full: string) =>
    value === "100%" || (value !== undefined && Number(value) >= Number(full));
  return (round === 0 || Number.isNaN(round))
    && at(attr("x"), box?.[1] ?? "0")
    && at(attr("y"), box?.[2] ?? "0")
    && covers(attr("width"), fullWidth)
    && covers(attr("height"), fullHeight);
}

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
/**
 * How an icon will sit in its tile. A `mark` is always repainted as a glyph
 * in the 60% safe area, so it reports "open"; an `app` icon reports the shape
 * measured from its art (see {@link SocialImageIconShape}).
 */
export function socialImageIconShape(icon: SocialImageIcon): SocialImageIconShape {
  const parsed = parseSocialImageIcon(icon);
  return parsed.kind === "mark" ? "open" : parseIconSource(parsed.src, "app").shape;
}

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
    const coverage = coverageOf(payload, bytes);
    const bounds = coverage === undefined ? WHOLE : coverage.bounds;
    const cropped = (width * (bounds.right - bounds.left)) / (height * (bounds.bottom - bounds.top));
    return {
      aspect: Math.min(4, Math.max(0.25, Number.isFinite(cropped) && cropped > 0 ? cropped : width / height)),
      base64: payload,
      bounds,
      shape: coverage === undefined || coverage.cornersOpaque
        ? "square"
        : coverage.centerOpaque && coverage.fill >= 0.7 ? "solid" : "open",
      ...(coverage?.hue === undefined ? {} : { hue: coverage.hue }),
      kind,
      mime,
    };
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
    bounds: WHOLE,
    shape: svgShape(svg),
    ...hueField(svgHue(svg)),
    kind,
    mime,
  };
}

function hueField(hue: string | undefined): { hue?: string } {
  return hue === undefined ? {} : { hue };
}

/** The first saturated fill or stroke color an SVG declares. */
function svgHue(svg: string): string | undefined {
  for (const [, value = ""] of svg.matchAll(/(?:fill|stroke|stop-color)\s*[=:]\s*["']?\s*(#[0-9a-f]{6}|#[0-9a-f]{3})\b/giu)) {
    const hex = value.length === 4
      ? `#${value.slice(1).split("").map((digit) => digit + digit).join("")}`
      : value;
    const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
    if (Math.max(...channels) - Math.min(...channels) >= 48) return hex.toUpperCase();
  }
  return undefined;
}

const coverageCache = new Map<string, RasterCoverage | undefined>();

function coverageOf(payload: string, bytes: Uint8Array): RasterCoverage | undefined {
  if (coverageCache.has(payload)) return coverageCache.get(payload);
  let coverage: RasterCoverage | undefined;
  try {
    coverage = pngCoverage(bytes);
  } catch {
    coverage = undefined;
  }
  if (coverage !== undefined && (coverage.bounds.right <= coverage.bounds.left || coverage.bounds.bottom <= coverage.bounds.top)) {
    coverage = undefined;
  }
  if (coverageCache.size > 64) coverageCache.clear();
  coverageCache.set(payload, coverage);
  return coverage;
}

function iconBox(aspect: number, box: number): { height: number; width: number } {
  return aspect >= 1
    ? { height: Math.round(box / aspect), width: box }
    : { height: box, width: Math.round(box * aspect) };
}

/** The icon's alpha repainted in one solid color, as an SVG data URL. */
function knockoutSource(icon: ParsedIcon, fill: string): string {
  return artSource(icon, fill);
}

/**
 * The icon cropped to its own bounds, as an SVG data URL, optionally with its
 * alpha repainted in one solid color. Cropping lets every glyph fill the same
 * share of its tile however much empty margin the source file carries.
 */
function artSource(icon: ParsedIcon, fill?: string): string {
  const { bottom, left, right, top } = icon.bounds;
  const cropped = left > 0 || top > 0 || right < 1 || bottom < 1;
  if (fill === undefined && !cropped) return `data:${icon.mime};base64,${icon.base64}`;
  // Full image size in a 1000-unit space, then a view box around the art.
  const fullAspect = icon.aspect * ((bottom - top) / (right - left));
  const imageWidth = fullAspect >= 1 ? 1000 : 1000 * fullAspect;
  const imageHeight = fullAspect >= 1 ? 1000 / fullAspect : 1000;
  const x = Math.round(left * imageWidth);
  const y = Math.round(top * imageHeight);
  const width = Math.max(1, Math.round((right - left) * imageWidth));
  const height = Math.max(1, Math.round((bottom - top) * imageHeight));
  const iw = String(Math.round(imageWidth));
  const ih = String(Math.round(imageHeight));
  const href = `data:${icon.mime};base64,${icon.base64}`;
  const view = `viewBox="${String(x)} ${String(y)} ${String(width)} ${String(height)}" width="${String(width)}" height="${String(height)}"`;
  if (fill === undefined) {
    const plain = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${view}><image href="${href}" xlink:href="${href}" width="${iw}" height="${ih}" preserveAspectRatio="none"/></svg>`;
    return `data:image/svg+xml;base64,${utf8Base64(plain)}`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${view}><mask id="k" maskUnits="userSpaceOnUse" x="0" y="0" width="${iw}" height="${ih}" style="mask-type:alpha" mask-type="alpha"><image href="${href}" xlink:href="${href}" width="${iw}" height="${ih}" preserveAspectRatio="none"/></mask><rect width="${iw}" height="${ih}" fill="${fill}" mask="url(#k)"/></svg>`;
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

/** Share of a tile's side that a `mark` glyph's own bounds fill. */
export const SOCIAL_IMAGE_GLYPH_SHARE = 0.6;
const GLYPH_SHARE = SOCIAL_IMAGE_GLYPH_SHARE;

function tile({ art, palette, size }: {
  art: TileArt;
  palette: SocialImagePalette;
  size: number;
}): ReactElement {
  const radius = Math.round(size * 0.235);
  const glow = `0 ${String(Math.round(size * 0.1))}px ${String(Math.round(size * 0.26))}px ${palette.dark ? rgba(palette.tileTop, 0.55) : rgba(palette.tileBottom, 0.3)}`;
  const rim = Math.max(2, Math.round(size / 120));
  if (art.type === "app" && art.icon.shape === "solid") {
    // A filled silhouette is already a finished icon: draw it alone, cropped
    // to its own edge, so no tile shows around it as a thin rim.
    const box = iconBox(art.icon.aspect, size);
    return (
      <div style={{ alignItems: "center", display: "flex", flexShrink: 0, height: size, justifyContent: "center", width: size }}>
        <img
          alt=""
          height={box.height}
          src={artSource(art.icon)}
          style={{ height: box.height, width: box.width }}
          width={box.width}
        />
      </div>
    );
  }
  if (art.type === "app" && art.icon.shape === "square") {
    // Edge-to-edge art fills the rounded tile, clipped to its corners; a
    // hairline keeps a white or background-colored icon from dissolving.
    return (
      <div
        style={{
          borderRadius: radius,
          boxShadow: glow,
          display: "flex",
          flexShrink: 0,
          height: size,
          overflow: "hidden",
          position: "relative",
          width: size,
        }}
      >
        <img
          alt=""
          height={size}
          src={artSource(art.icon)}
          style={{ borderRadius: radius, height: size, width: size }}
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
  // Glyph safe area: the art's own bounds fill 60% of the tile, centered.
  const glyphBox = Math.round(size * GLYPH_SHARE);
  let glyph: ReactNode;
  if (art.type === "app") {
    // Open app art keeps its own colors on a neutral plate.
    const box = iconBox(art.icon.aspect, glyphBox);
    return (
      <div
        style={{
          alignItems: "center",
          backgroundImage: palette.dark
            ? `linear-gradient(150deg, ${mix(palette.background, "#FFFFFF", 0.16)} 0%, ${mix(palette.background, "#FFFFFF", 0.08)} 100%)`
            : `linear-gradient(150deg, #FFFFFF 0%, ${mix("#FFFFFF", palette.background, 0.45)} 100%)`,
          border: `${String(rim)}px solid ${palette.dark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.07)"}`,
          borderRadius: radius,
          boxShadow: glow,
          display: "flex",
          flexShrink: 0,
          height: size,
          justifyContent: "center",
          width: size,
        }}
      >
        <img
          alt=""
          height={box.height}
          src={artSource(art.icon)}
          style={{ height: box.height, width: box.width }}
          width={box.width}
        />
      </div>
    );
  }
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
    const box = art.icon.shape === "square" ? { height: size, width: size } : iconBox(art.icon.aspect, size);
    return (
      <img
        alt=""
        height={box.height}
        src={artSource(art.icon)}
        style={{ borderRadius: art.icon.shape === "square" ? Math.round(size * 0.235) : 0, height: box.height, opacity: 0.07, width: box.width }}
        width={box.width}
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
    `radial-gradient(circle at ${x} ${y}, ${rgba(palette.wash, glow)} 0%, ${rgba(palette.wash, 0)} 42%)`,
    `linear-gradient(155deg, ${palette.background} 0%, ${palette.backgroundTint} 100%)`,
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

type CardFit = Readonly<{
  description: FitBlock | undefined;
  eyebrow: TextBlock | undefined;
  headline: TextBlock;
  /** True when the headline is set below its layout's standard size. */
  reduced: boolean;
}>;

type CardLayout = Readonly<{ element: ReactElement; fit: CardFit; ghost?: Box; textBoxes: readonly Box[] }>;

/** Section words that name the same thing, so "Docs" over "Documentation" reads twice. */
const SECTION_WORDS: Readonly<Record<string, string>> = {
  compare: "compare",
  comparison: "compare",
  comparisons: "compare",
  doc: "doc",
  docs: "doc",
  documentation: "doc",
  faq: "faq",
  faqs: "faq",
  intro: "introduc",
  introducing: "introduc",
  introduction: "introduc",
  reference: "reference",
  references: "reference",
  release: "release",
  releases: "release",
};

function sectionKey(word: string): string {
  return SECTION_WORDS[word] ?? word.replace(/(?<=\p{L}{3})s$/u, "");
}

/**
 * The eyebrow, unless the card already shows it: equal to another line, the
 * opening words of one ("Introducing" over "Introducing Gobstopper"), or a
 * section word with the same meaning as the headline's first word ("Docs"
 * over "Documentation"). Case and punctuation are ignored.
 */
function eyebrowKicker(copy: Copy, shown: readonly string[]): string | undefined {
  const eyebrow = copy.eyebrow?.trim();
  if (eyebrow === undefined || eyebrow.length === 0) return undefined;
  const words = (value: string) => brandKey(value).split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 0);
  const key = words(eyebrow);
  if (key.length === 0) return undefined;
  for (const text of shown) {
    const other = words(text);
    if (other.length >= key.length && key.every((word, index) => other[index] === word)) return undefined;
  }
  const first = words(copy.headline)[0];
  if (key.length === 1 && first !== undefined && sectionKey(key[0] ?? "") === sectionKey(first)) return undefined;
  return eyebrow;
}

const PRODUCT = {
  description: [40, 38, 36],
  descriptionSmall: [34, 32, 30],
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

  let description: FitBlock | undefined;
  if (copy.description.length > 0) {
    const fitsBudget = (candidate: TextBlock) => blockHeight(candidate) <= descBudget;
    // A product description keeps the standard sizes and at most two
    // lines: a long one is cut at a sentence or clause before it shrinks,
    // so every product card reads at the same scale.
    description = fitDescription(fonts, copy.description, column, PRODUCT.description, 2, fitsBudget, false)
      ?? fitDescription(fonts, copy.description, column, PRODUCT.description, 2, fitsBudget, true)
      ?? fitDescription(fonts, copy.description, column, PRODUCT.descriptionSmall, 2, fitsBudget, false)
      ?? fitDescription(fonts, copy.description, column, PRODUCT.descriptionSmall, 2, fitsBudget, true)
      ?? clampDescription(
        fonts,
        copy.description,
        column,
        Math.max(1, Math.min(2, Math.floor(descBudget / (SOCIAL_IMAGE_MIN_FONT_SIZE * BODY.lineHeight)))),
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
  return { element, fit: { description, eyebrow: kicker, headline: name, reduced: name.size < 72 }, textBoxes };
}

const PAGE = {
  bottom: 72,
  descriptionWidth: 860,
  headlineWidth: 880,
  descriptionSizes: [36, 34, 32, 30],
  headGap: 30,
  /** The headline size for one and two lines. */
  headline: 80,
  /** Sizes tried, largest first, when the headline needs three lines. */
  headlineThreeLine: [62, 58, 54, 50, 46],
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

  const descriptionWidth = Math.min(width, PAGE.descriptionWidth);
  const hasDescription = copy.description.length > 0;

  // One headline size for every one- and two-line headline, so cards across
  // a site match; smaller sizes only when three lines are unavoidable.
  // A headline that would break into two lines with a lone word ("Query /
  // the derived graph") but fits the card's full width stays on one line;
  // the ghost art moves aside for it.
  const oneLine = fitWhole(fonts, copy.headline, CARD_WIDTH - 2 * PAGE.pad, [PAGE.headline], 1, HEADLINE);
  const balanced = fitWhole(fonts, copy.headline, width, [PAGE.headline], 2, HEADLINE);
  const orphaned = balanced !== null && balanced.lines.length === 2
    && balanced.lines.some((line) => !/\s/u.test(line.trim()));
  // Two lines at the full width come before any smaller size: the headline
  // size changes only when three lines are unavoidable.
  const wide = balanced === null
    ? fitWhole(fonts, copy.headline, CARD_WIDTH - 2 * PAGE.pad, [PAGE.headline], 2, HEADLINE)
    : null;
  const twoLine = oneLine !== null && (balanced === null || orphaned) ? oneLine : balanced ?? wide;
  const heads = twoLine === null
    ? PAGE.headlineThreeLine
      .flatMap((size) => [
        fitWhole(fonts, copy.headline, width, [size], 3, HEADLINE),
        fitWhole(fonts, copy.headline, CARD_WIDTH - 2 * PAGE.pad, [size], 3, HEADLINE),
      ])
      .filter((head): head is TextBlock => head !== null)
    : [twoLine];
  let headline: TextBlock | undefined;
  let description: FitBlock | undefined;
  const room = (head: TextBlock) => available - blockHeight(head) - PAGE.headGap;
  if (hasDescription) {
    const passes = [
      (head: TextBlock) => fitDescription(fonts, copy.description, descriptionWidth, PAGE.descriptionSizes, 2, (desc) => blockHeight(desc) <= room(head), false),
      (head: TextBlock) => fitDescription(fonts, copy.description, descriptionWidth, PAGE.descriptionSizes, 2, (desc) => blockHeight(desc) <= room(head), true),
      (head: TextBlock) => {
        const lines = Math.min(2, Math.floor(room(head) / (SOCIAL_IMAGE_MIN_FONT_SIZE * BODY.lineHeight)));
        return lines < 1 ? null : clampDescription(fonts, copy.description, descriptionWidth, lines);
      },
    ];
    search: for (const pass of passes) {
      for (const head of heads) {
        const desc = pass(head);
        if (desc !== null) {
          headline = head;
          description = desc;
          break search;
        }
      }
    }
  } else {
    headline = heads.find((head) => blockHeight(head) <= available);
  }
  if (headline === undefined) {
    const smallest = PAGE.headlineThreeLine[PAGE.headlineThreeLine.length - 1] ?? 50;
    headline = fitClamped(
      fonts,
      copy.headline,
      width,
      smallest,
      Math.max(1, Math.min(3, Math.floor(available / (smallest * HEADLINE.lineHeight)))),
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
    fit: { description, eyebrow: kicker, headline, reduced: headline.size < PAGE.headline },
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
  if (art.type === "app") return art.icon.shape === "solid" ? art.icon.aspect : 1;
  return art.type === "mark" ? art.icon.aspect : 1;
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

/** How a card's copy was fitted, for tests and builds that check copy. */
export type SocialImageFit = Readonly<{
  description: Readonly<{
    /**
     * "none" when the whole description is shown; "sentence" or "clause" when
     * it ends at an earlier sentence or clause boundary; "ellipsis" when no
     * boundary fit and the text is clamped with "…".
     */
    cut: "clause" | "ellipsis" | "none" | "sentence";
    lines: readonly string[];
    size: number;
  }> | undefined;
  /** The eyebrow as drawn, or undefined when it was empty or repeated the headline. */
  eyebrow: string | undefined;
  headline: Readonly<{
    lines: readonly string[];
    size: number;
    /**
     * True when the headline did not fit two lines at the layout's standard
     * size (80px on a page card, 72px or more on a product card) and was set
     * smaller to fit. Assert it is false to keep a site's headlines uniform.
     */
    reduced: boolean;
    /** True when the headline is drawn on three lines. */
    threeLine: boolean;
    truncated: boolean;
  }>;
  /** Human-readable findings; empty when the copy fits as written. */
  issues: readonly string[];
  layout: SocialImageLayout;
  /** Placeholders and characters the card left out. */
  removed: readonly SocialImageRemoval[];
}>;

type RenderedCard = SocialImageCard & { fit: SocialImageFit; ghost?: Box; textBoxes: readonly Box[] };

function fitIssues(fit: Omit<SocialImageFit, "issues">): string[] {
  const issues: string[] = [];
  for (const removal of fit.removed) {
    issues.push(removal.reason === "placeholder"
      ? `${removal.field} contains the placeholder ${JSON.stringify(removal.text)}`
      : `${removal.field} contains ${JSON.stringify(removal.text)}, which the embedded Nebula Sans fonts cannot draw`);
  }
  if (fit.headline.truncated) issues.push("headline does not fit and was clamped with an ellipsis");
  else if (fit.headline.threeLine) issues.push(`headline needs three lines, so it is set at ${String(fit.headline.size)}px`);
  else if (fit.headline.reduced) issues.push(`headline does not fit two lines at the standard size, so it is set at ${String(fit.headline.size)}px`);
  if (fit.description !== undefined && fit.description.cut !== "none") {
    issues.push(fit.description.cut === "ellipsis"
      ? "description does not fit and was clamped with an ellipsis"
      : `description was shortened to its last whole ${fit.description.cut} that fits`);
  }
  return issues;
}

function renderSocialImageCard(details: SocialImageDetails): RenderedCard {
  const layout = socialImageLayout(details);
  const fonts = nebulaSansSocialFonts();
  const removed: SocialImageRemoval[] = [];
  const clean = (value: string, field: TextField) =>
    cleanSocialImageText(normalizeSocialImageText(value), field, fonts, removed);
  const copy = {
    description: clean(details.description, "description"),
    domain: clean(details.domain, "domain"),
    eyebrow: details.eyebrow === undefined ? undefined : clean(details.eyebrow, "eyebrow"),
    headline: clean(socialImageHeadline(details), details.headline === undefined ? "title" : "headline"),
    lockup: clean(lockupName(details), "title"),
  };
  // A headline that was only a placeholder falls back to the product name.
  const headline = copy.headline.length > 0 ? copy.headline : copy.lockup;
  const flat: Copy = {
    description: oneLine(copy.description),
    domain: oneLine(copy.domain),
    eyebrow: copy.eyebrow === undefined || copy.eyebrow.length === 0 ? undefined : oneLine(copy.eyebrow),
    headline: oneLine(headline),
    lockup: oneLine(copy.lockup.length > 0 ? copy.lockup : headline),
  };
  const art = tileArt(details, flat.lockup.length > 0 ? flat.lockup : flat.headline);
  const brand = art.type === "app" || art.type === "mark" ? art.icon.hue : undefined;
  const palette = socialImagePalette(details.theme ?? {}, art.type === "app" ? brand : undefined);
  const card = layout === "page"
    ? pageCard(flat, art, palette, fonts)
    : productCard(flat, art, palette, fonts);

  const measured: Omit<SocialImageFit, "issues"> = {
    description: card.fit.description === undefined
      ? undefined
      : { cut: card.fit.description.cut, lines: card.fit.description.lines, size: card.fit.description.size },
    eyebrow: card.fit.eyebrow?.lines.join(" "),
    headline: {
      lines: card.fit.headline.lines,
      size: card.fit.headline.size,
      reduced: card.fit.reduced,
      threeLine: card.fit.headline.lines.length >= 3,
      truncated: card.fit.headline.lines.some((line) => line.endsWith(ELLIPSIS)),
    },
    layout,
    removed,
  };
  const fit: SocialImageFit = { ...measured, issues: fitIssues(measured) };
  if (details.strict === true && fit.issues.length > 0) {
    throw new RangeError(`social image copy does not fit as written: ${fit.issues.join("; ")}.`);
  }

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
    fit,
    fonts,
    ...(card.ghost === undefined ? {} : { ghost: card.ghost }),
    height: CARD_HEIGHT,
    textBoxes: card.textBoxes,
    width: CARD_WIDTH,
  };
}

/**
 * Lays out a card without rendering it and reports how its copy fitted:
 * whether the description was shortened, whether the headline needed three
 * lines, and what placeholders or undrawable characters were left out. A
 * site can assert `socialImageFit(details).issues` is empty in its tests.
 */
export function socialImageFit(details: SocialImageDetails): SocialImageFit {
  return renderSocialImageCard({ ...details, strict: false }).fit;
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
  // The site tagline describes the product, not a page: a page card with no
  // description of its own leaves the subtitle empty.
  const pageCard = page.layout === "page"
    || (page.layout === undefined && page.headline !== undefined && page.headline !== site.name);
  return {
    description: page.description ?? (pageCard ? "" : site.description),
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

