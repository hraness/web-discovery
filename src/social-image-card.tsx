import { nebulaSansSocialFonts } from "@hraness/design-kit/fonts/nebula-sans/social";
import { cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";

import { socialImageFoil, socialImageFoilCss, socialImageFoilPaint } from "./social-image-foil.js";
import type { SocialImageFoil } from "./social-image-foil.js";
import { DESIGN_KIT_LIGHT_PALETTES } from "./social-image-palettes.generated.js";
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
  /** The product primary. Cards no longer draw it; kept for v0.12 themes. */
  accent: string;
  /** The page background the card body sits on. */
  background: string;
  /** Headline and body text, and the ink the brand foil is mixed from. */
  foreground: string;
  /**
   * The sticky header band. Defaults to the Design Kit palette's header
   * tint, or to `background` deepened slightly toward `foreground`.
   */
  headerBackground?: string;
  /** The hairline under the header band. Defaults from the palette or theme. */
  line?: string;
  /** Eyebrow, description, and domain text. */
  muted: string;
  /**
   * Legacy (v0.12): Cards since v0.13 draw the site's flat background with no
   * brand wash. Accepted and ignored so v0.12 themes still build.
   */
  wash?: string;
}>;

/** A light-theme palette from Design Kit's `palette-system.css`. */
export type SocialImagePaletteName = keyof typeof DESIGN_KIT_LIGHT_PALETTES;

/** The palette names a card accepts, in Design Kit's order. */
export const socialImagePaletteNames = Object.keys(DESIGN_KIT_LIGHT_PALETTES) as readonly SocialImagePaletteName[];

export const plainSocialImageTheme = {
  accent: "#2457A6",
  background: "#FFFFFF",
  foreground: "#171717",
  muted: "#666666",
} as const satisfies SocialImageTheme;

/**
 * A product icon as a `data:` URL.
 *
 * Legacy (v0.12): Pass `brandMark` instead. A `mark` icon is drawn exactly like a
 * `brandMark`: its alpha painted in the brand foil in the header. An `app`
 * icon is drawn as it is, at the same size, in place of the foil mark.
 */
export type SocialImageIcon = Readonly<{
  kind: "app" | "mark";
  src: string;
}>;

export type SocialImageLayout = "page" | "product";

export type SocialImageDetails = Readonly<{
  /**
   * The product name as the site header shows it, drawn in foil beside the
   * brand mark. Defaults to the brand segment of `title`, else `title`.
   */
  brand?: string;
  /**
   * The monochrome product mark the site header paints in foil: SVG markup,
   * or a `data:` URL of an SVG or PNG. Only its alpha is used.
   */
  brandMark?: string;
  description: string;
  domain: string;
  /**
   * The small label above a page headline, such as "Guide" or "Comparison".
   * An empty string means the page has none on purpose; leaving it out on a
   * page card is reported by `socialImageFit`.
   */
  eyebrow?: string;
  /**
   * Multi-word names a line must not break inside, such as "Claude Code
   * Router". Matching ignores case. A no-break space (U+00A0) in the copy
   * does the same for one occurrence.
   */
  keepTogether?: readonly string[];
  /**
   * The site's own tagline, so `socialImageFit` can report a page card whose
   * subtitle only repeats it. `socialImageSiteDetails` sets it.
   */
  tagline?: string;
  /**
   * The large text on the card. Defaults to `title` without a trailing brand
   * segment such as " | Example" when that segment repeats the eyebrow or the
   * domain, so an SEO page title does not become the card headline verbatim.
   */
  headline?: string;
  /** Legacy (v0.12): Pass `brandMark`. See {@link SocialImageIcon}. */
  icon?: SocialImageIcon;
  /**
   * "product" is a home card: the tagline (`description`) is the headline.
   * "page" is a subpage card: `headline` with `description` beneath it.
   * Both share one design, the site's sticky header over its hero.
   * Defaults to "page" when `headline` is set and differs from `title`.
   */
  layout?: SocialImageLayout;
  /**
   * Legacy (v0.12): Pass `brandMark`. A React node drawn in the header in the
   * foreground color, without foil.
   */
  mark?: ReactNode;
  /**
   * The site's Design Kit palette, such as "tokyo-night". Sets the
   * background, header band, hairline, and text colors of its light theme;
   * `theme` fields override single colors.
   */
  palette?: SocialImagePaletteName;
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
  /** The body background: the site's flat page background. */
  background: string;
  /** The header band color; the second color a thumbnail shows. */
  backgroundTint: string;
  dark: boolean;
  /** The brand foil for the mark and wordmark, mixed from `foreground` and `header`. */
  foil: SocialImageFoil;
  foreground: string;
  /** Legacy (v0.12): Tile knockout color; cards since v0.13 draw no tile. */
  glyph: string;
  /** The sticky header band. */
  header: string;
  /** The hairline under the header band. */
  headerLine: string;
  muted: string;
  /** Accent adjusted to at least 4.5:1 against the background. */
  primaryText: string;
  /** Legacy (v0.12): Tile gradient end; cards since v0.13 draw no tile. */
  tileBottom: string;
  /** Legacy (v0.12): Tile gradient start; cards since v0.13 draw no tile. */
  tileTop: string;
  /** Every background color text can sit on, for contrast checks. */
  surfaces: readonly string[];
  /** Legacy (v0.12): The v0.12 wash color; cards since v0.13 draw no wash. */
  wash: string;
}>;

/**
 * The theme a card draws: the named Design Kit palette's light colors, then
 * any explicit `theme` colors over them.
 */
function paletteTheme(
  theme: Partial<SocialImageTheme>,
  palette: SocialImagePaletteName | undefined,
): Partial<SocialImageTheme> {
  if (palette === undefined) return theme;
  if (!Object.hasOwn(DESIGN_KIT_LIGHT_PALETTES, palette)) {
    throw new RangeError(`palette must be one of ${socialImagePaletteNames.join(", ")}; received ${describe(palette)}.`);
  }
  const colors = DESIGN_KIT_LIGHT_PALETTES[palette];
  // The marketing header is the page background at 82% over whatever
  // scrolls beneath it; over the palette's raised surface it reads as the
  // slightly deeper (or lighter) band the live sites show.
  const header = mix(colors.surface, colors.background, 0.18);
  const defined = Object.fromEntries(Object.entries(theme as Record<string, unknown>).filter(([, value]) => value !== undefined));
  return {
    accent: colors.primary,
    background: colors.background,
    foreground: colors.foreground,
    headerBackground: header,
    line: mix(colors.line, header, 0.35),
    muted: colors.muted,
    ...defined,
  };
}

/**
 * Resolves a card theme into the colors the card draws: the site's flat
 * background, its header band and hairline, text colors that meet their
 * contrast rules, and the brand foil. A mid-tone background moves toward
 * black or white until body text can reach 7:1.
 */
export function socialImagePalette(
  theme: Partial<SocialImageTheme> = {},
  /** Legacy (v0.12): The v0.12 wash color; ignored by the card. */
  brand?: string,
  /** A Design Kit palette whose light colors fill in unset theme colors. */
  palette?: SocialImagePaletteName,
): SocialImagePalette {
  const merged = paletteTheme(theme, palette);
  const resolved = parseSocialImageTheme(merged);
  const wash = resolved.wash ?? (brand === undefined ? resolved.accent : color(brand, "brand"));
  const dark = relativeLuminance(resolved.foreground) > relativeLuminance(resolved.background);
  const extremeInk = dark ? "#FFFFFF" : "#000000";
  const extremeField = dark ? "#000000" : "#FFFFFF";
  const headerOf = (field: string) => resolved.headerBackground ?? mix(field, resolved.foreground, dark ? 0.08 : 0.05);
  let background = resolved.background;
  for (let step = 0; step <= 50; step += 1) {
    background = mix(resolved.background, extremeField, step / 50);
    if (worstContrast(extremeInk, [background, headerOf(background)]) >= 7.5) break;
  }
  const header = headerOf(background);
  const surfaces = [background, header] as const;
  const foreground = readable(resolved.foreground, extremeInk, surfaces, 7);
  const muted = readable(resolved.muted, foreground, surfaces, dark ? 7 : 4.5);
  const primaryText = readable(resolved.accent, foreground, surfaces, 4.5);
  const headerLine = resolved.line ?? mix(header, foreground, dark ? 0.2 : 0.14);
  const tileTop = dark ? resolved.accent : mix(resolved.accent, "#FFFFFF", 0.12);
  const tileBottom = mix(resolved.accent, "#000000", dark ? 0.24 : 0.12);
  const glyph = socialImageContrastRatio("#FFFFFF", mix(tileTop, tileBottom, 0.5)) >= 3
    ? "#FFFFFF"
    : readable(mix(resolved.accent, "#000000", 0.55), "#000000", [tileTop, tileBottom], 4.5);
  return {
    background,
    backgroundTint: header,
    dark,
    foil: socialImageFoil(foreground, header),
    foreground,
    glyph,
    header,
    headerLine,
    muted,
    primaryText,
    surfaces,
    tileBottom,
    tileTop,
    wash,
  };
}

/** CIE L*a*b* of a six-digit hex color under D65. */
function lab(hex: string): readonly [number, number, number] {
  const linear = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.040_45 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  const [red, green, blue] = channels(hex).map(linear) as unknown as Rgb;
  const x = (0.412_456_4 * red + 0.357_576_1 * green + 0.180_437_5 * blue) / 0.950_47;
  const y = 0.212_672_9 * red + 0.715_152_2 * green + 0.072_175 * blue;
  const z = (0.019_333_9 * red + 0.119_192 * green + 0.950_304_1 * blue) / 1.088_83;
  const f = (value: number) => (value > 216 / 24_389 ? Math.cbrt(value) : (24_389 / 27 * value + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76 color difference: about 2.3 is just noticeable. */
function deltaE(first: string, second: string): number {
  const a = lab(first);
  const b = lab(second);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * The smallest `socialImagePaletteDistance` at which two sites' cards read as
 * different sites in a feed of thumbnails: about twice a just-noticeable
 * difference.
 */
export const SOCIAL_IMAGE_MIN_PALETTE_DISTANCE = 5;

/**
 * How far apart two resolved card palettes look: the mean CIE76 ΔE of the
 * body background and the header band, the colors that fill a thumbnail.
 */
export function socialImagePaletteDistance(first: SocialImagePalette, second: SocialImagePalette): number {
  return (deltaE(first.background, second.background) + deltaE(first.backgroundTint, second.backgroundTint)) / 2;
}

function parseSocialImageTheme(theme: unknown): SocialImageTheme {
  if (theme === undefined) return plainSocialImageTheme;
  if (typeof theme !== "object" || theme === null || Array.isArray(theme)) {
    throw new TypeError("theme must be an object of six-digit hex colors.");
  }
  const fields = theme as Record<string, unknown>;
  const pick = (key: keyof typeof plainSocialImageTheme) =>
    color(fields[key] ?? plainSocialImageTheme[key], key);
  const optional = (key: "headerBackground" | "line" | "wash") =>
    fields[key] === undefined ? {} : { [key]: color(fields[key], key) };
  return {
    accent: pick("accent"),
    background: pick("background"),
    foreground: pick("foreground"),
    muted: pick("muted"),
    ...optional("headerBackground"),
    ...optional("line"),
    ...optional("wash"),
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
  details: Pick<SocialImageDetails, "brand" | "domain" | "eyebrow" | "title">,
): string {
  if (details.brand !== undefined) return requiredText(details.brand, "brand");
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
 * wherever they appear; a field that holds nothing else counts as empty. Only
 * words that never name real work are listed, so a title such as "[untitled]"
 * survives. A backslash keeps any bracketed text: "\[DRAFT]" draws "[DRAFT]".
 */
const PLACEHOLDER = /(\\?)(\[\s*(?:draft|wip|todo|tbd|tk|placeholder|fixme|no title|title|description|headline|coming soon|preview|lorem ipsum)\s*\])/giu;

/** A backslash before a bracket asks the card to draw the bracket as written. */
const ESCAPED_BRACKET = /\\\[/gu;

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
  let text = value.replace(PLACEHOLDER, (match, escape: string, placeholder: string) => {
    if (escape.length > 0) return match;
    removals.push({ field, reason: "placeholder", text: placeholder });
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
  if (removals.length === before) return value.replace(ESCAPED_BRACKET, "[");
  return kept.split("\n").map(tidy).map(withoutDashFragment).filter((line) => line.length > 0).join("\n")
    .replace(ESCAPED_BRACKET, "[");
}

/* ------------------------------------------------------------- typography */

/** Characters that mark a token as a URL, path, or code rather than prose. */
const CODE_LIKE = /:\/\/|[/\\`=<>{}@#$%^*_|~]|^[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+$/u;
const OPENS = /[\s([{“‘"'—–-]/u;
const WORD_CHARACTER = /[\p{L}\p{N}]/u;

function curlToken(token: string): string {
  let result = "";
  const characters = Array.from(token);
  for (const [index, character] of characters.entries()) {
    const previous = characters[index - 1] ?? " ";
    const next = characters[index + 1] ?? " ";
    const opening = OPENS.test(previous) && !/\s/u.test(next);
    if (character === "\"") {
      result += opening ? "“" : "”";
    } else if (character === "'") {
      if (WORD_CHARACTER.test(previous) && WORD_CHARACTER.test(next)) result += "’";
      // An elided year or word ("’90s", "’til") takes an apostrophe, not an opening quote.
      else if (opening && /^'(?:\d\d(?:s\b|$)|til\b|tis\b|em\b|n\b)/iu.test(characters.slice(index).join(""))) result += "’";
      else result += opening ? "‘" : "’";
    } else {
      result += character;
    }
  }
  // A range of two ascending numbers takes an en dash: "10-20", "2020-2024".
  // Digit counts within one of each other, and never 3 then 4 digits, so a
  // phone fragment such as "555-1234" keeps its hyphen.
  return result.replace(/^([(“‘]*)([1-9]\d{0,3}|0)-([1-9]\d{0,3})(?=[)\].,;:!?”’]*$)/u, (match, lead: string, from: string, to: string) => {
    const ascending = Number(from) < Number(to);
    const lengths = Math.abs(from.length - to.length) <= 1 && !(from.length === 3 && to.length === 4);
    return ascending && lengths ? `${lead}${from}–${to}` : match;
  });
}

/**
 * Sets straight quotes as curly quotes (’ ‘ “ ”) and a hyphen between two
 * ascending numbers as an en dash. Contractions and possessives ("Lovelace's",
 * "ALGAL's") take ’. URLs, domains, paths, and code-like tokens, and text in
 * backticks, stay as written.
 */
export function socialImageTypography(text: string): string {
  return text
    .split(/(`[^`]*`)/u)
    .map((part, index) => index % 2 === 1
      ? part
      : part.replace(/\S+/gu, (token) => {
        const core = trimEnds(token, "\"'“‘(", "\"'”’).,;:!?");
        return CODE_LIKE.test(core) ? token : curlToken(token);
      }))
    .join("");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Joins the words of each phrase in `keepTogether` with no-break spaces so a
 * line never breaks inside it. Matching ignores case and quote style.
 */
function bindPhrases(text: string, keepTogether: readonly string[]): string {
  let result = text;
  for (const phrase of keepTogether) {
    const words = socialImageTypography(phrase).split(/\s+/u).filter((word) => word.length > 0);
    if (words.length < 2) continue;
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${words.map(escapeRegExp).join("[^\\S\\n]+")}(?![\\p{L}\\p{N}])`,
      "giu",
    );
    result = result.replace(pattern, (match) => match.replace(/[^\S\n]+/gu, "\u00A0"));
  }
  return result;
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

/** Where a line may break: any white space except a no-break space. */
const BREAKS = /[^\S\u00A0]+/u;

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
  const words = text.split(BREAKS).filter((word) => word.length > 0);
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
    if (measure(unit) <= width || !/[ \u00A0]/u.test(unit)) {
      line = unit;
      continue;
    }
    // A bound group or kept-together phrase wider than the line breaks back
    // into single words.
    const split = greedyLines(unit.split(/[ \u00A0]/u), width, measure);
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

const ARTICLES = new Set(["a", "an", "the"]);

/** Break costs, in units of a line's squared share of empty width. */
const BREAK_COST = {
  /** Ending a two-word first line on a short word such as "vs" or "on". */
  shortWord: 0.7,
  /** A line break inside a run of two capitalized words. */
  name: 0.8,
  /** A line break inside a run of three or more, such as "Claude Code Router". */
  longName: 1.2,
  /** One word alone on the first line of three or more words ("Notes / on the…"). */
  loneFirst: 1.5,
  /** One word alone on a middle line. */
  loneMiddle: 0.2,
  /** One word alone on the last line. */
  widow: 0.5,
} as const;

/** How many capitalized words run through the boundary after `index`. */
function capitalRun(words: readonly string[], index: number): number {
  let run = 0;
  for (let at = index; at >= 0 && capitalized(words[at]); at -= 1) run += 1;
  for (let at = index + 1; at < words.length && capitalized(words[at]); at += 1) run += 1;
  return run;
}

/**
 * Chooses where to break `text` into the fewest lines that fit, scoring every
 * candidate: lines of even length win, and a line should not end on a short
 * or binding word ("vs", "the"), break inside a proper name, or leave one word
 * alone. Words joined by a no-break space never split.
 */
function balanceText(text: string, width: number, measure: Measure): string[] {
  // Every word boundary is a candidate, each with a cost; see `penalty` for
  // the one place a short word may end a line.
  const words = text.split(BREAKS).filter((word) => word.length > 0);
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
  // `leadIn` is true for a first line of exactly two words, the one place a
  // short word other than an article may end a line: "Wordcell vs /
  // Supermemory" reads better than "Wordcell / vs Supermemory". Everywhere
  // else a short word never ends one, and an article never does.
  const penalty = (index: number, leadIn: boolean) => {
    const lastWord = words[index];
    const letters = bare(lastWord ?? "");
    const open = !ENDS_PHRASE.test(lastWord ?? "");
    if (open && /^\p{Ll}{1,3}$/u.test(letters)) {
      return leadIn && !ARTICLES.has(letters.toLocaleLowerCase("en-US")) ? BREAK_COST.shortWord : Number.POSITIVE_INFINITY;
    }
    if (dangling(lastWord)) return 0.6;
    if (open && capitalized(lastWord) && capitalized(words[index + 1])) {
      return capitalRun(words, index) >= 3 ? BREAK_COST.longName : BREAK_COST.name;
    }
    // A number binds to the lowercase unit or noun after it ("2 / million"
    // never splits) but may close a name ("Ley 60 / en Puerto Rico").
    if (open && /^\p{N}/u.test(letters)) {
      const closesName = /^\p{Lu}/u.test(words[index - 1] ?? "");
      return closesName || !/^\p{Ll}/u.test(words[index + 1] ?? "") ? 0.2 : Number.POSITIVE_INFINITY;
    }
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
      if (index < bounds.length - 2) cost += penalty(to - 1, index === 0 && to === 2);
      // A lone word is an orphan. On the first line it reads as a label cut
      // off from its phrase ("Notes / on the Analytical Engine"), so it costs
      // most; one left on the last line (a widow) costs more than a middle one.
      if (!/[ \u00A0]/u.test(line)) {
        if (index === 0 && wordCount >= 3) cost += BREAK_COST.loneFirst;
        else if (wordCount >= 4) cost += index === bounds.length - 2 ? BREAK_COST.widow : BREAK_COST.loneMiddle;
      }
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
  const words = text.split(BREAKS).filter((word) => word.length > 0);
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
  // No-break spaces only steer line breaking; the card draws plain spaces.
  const drawn = lines.map((line) => line.replaceAll("\u00A0", " "));
  return {
    lines: drawn,
    size,
    style,
    widths: drawn.map((line) => textWidth(fonts, line, size, style)),
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
  // A size at which a kept-together phrase must split is not a fit.
  const groups = text.split(BREAKS).filter((word) => word.includes("\u00A0"));
  for (const size of sizes) {
    const measure = measurer(fonts, size, style);
    if (groups.some((group) => measure(group) > usable)) continue;
    // The balanced break can fit where binding every short word cannot:
    // "Why I still use Arc / on desktop, and why" is two lines, while the
    // bound unit "use Arc on desktop," forces three.
    const lines = balanceText(text, usable, measure);
    if (lines.length <= maxLines && lines.every((line) => measure(line) <= usable)) {
      return block(fonts, lines, size, style);
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

/** The icon cropped to its bounds with its alpha painted in the brand foil, as an SVG data URL. */
function foilSource(icon: ParsedIcon, foil: SocialImageFoil): string {
  const { bottom, left, right, top } = icon.bounds;
  const fullAspect = icon.aspect * ((bottom - top) / (right - left));
  const imageWidth = fullAspect >= 1 ? 1000 : 1000 * fullAspect;
  const imageHeight = fullAspect >= 1 ? 1000 / fullAspect : 1000;
  const x = Math.round(left * imageWidth);
  const y = Math.round(top * imageHeight);
  const width = Math.max(1, Math.round((right - left) * imageWidth));
  const height = Math.max(1, Math.round((bottom - top) * imageHeight));
  const href = `data:${icon.mime};base64,${icon.base64}`;
  const image = `<image href="${href}" xlink:href="${href}" width="${String(Math.round(imageWidth))}" height="${String(Math.round(imageHeight))}" preserveAspectRatio="none"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${String(x)} ${String(y)} ${String(width)} ${String(height)}" width="${String(width)}" height="${String(height)}">`
    + socialImageFoilPaint(foil, { height, width, x, y }, image)
    + "</svg>";
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
  if (details.brandMark !== undefined) {
    return { icon: parseIconSource(brandMarkSource(details.brandMark), "mark"), type: "mark" };
  }
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

/** Legacy (v0.12): Share of a v0.12 tile's side that a `mark` glyph filled; cards since v0.13 draw no tile. */
export const SOCIAL_IMAGE_GLYPH_SHARE = 0.6;

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

const HEADLINE: TextStyle = { lineHeight: 1.06, tracking: -0.02, weight: 700 };
const BODY: TextStyle = { lineHeight: 1.3, tracking: 0, weight: 400 };

type Copy = Readonly<{
  description: string;
  domain: string;
  eyebrow: string | undefined;
  headline: string;
  lockup: string;
}>;

type Box = Readonly<{ height: number; width: number; x: number; y: number }>;

/** A `brandMark` as a data URL: SVG markup is encoded, a data URL passes through. */
function brandMarkSource(mark: unknown): string {
  if (typeof mark !== "string" || mark.trim().length === 0) {
    throw new TypeError("brandMark must be SVG markup or a data: URL of an SVG or PNG.");
  }
  const trimmed = mark.trim();
  if (trimmed.startsWith("data:")) return trimmed;
  if (!/^(?:<\?xml[^>]*>\s*)?<svg\b/iu.test(trimmed)) {
    throw new TypeError("brandMark must be SVG markup or a data: URL of an SVG or PNG.");
  }
  return `data:image/svg+xml;base64,${utf8Base64(trimmed)}`;
}

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
  return eyebrowRepeats(eyebrow, copy.headline, shown) === undefined ? eyebrow : undefined;
}

function keyWords(value: string): string[] {
  return brandKey(value).split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 0);
}

/**
 * Which shown line an eyebrow repeats: "headline" when it opens the headline
 * or names the same section as its first word, "other" when it opens the
 * lockup or domain, else undefined.
 */
function eyebrowRepeats(
  eyebrow: string,
  headline: string,
  others: readonly string[],
): "headline" | "other" | undefined {
  const key = keyWords(eyebrow);
  if (key.length === 0) return "other";
  const opens = (text: string) => {
    const other = keyWords(text);
    return other.length >= key.length && key.every((word, index) => other[index] === word);
  };
  const first = keyWords(headline)[0];
  if (opens(headline)) return "headline";
  if (key.length === 1 && first !== undefined && sectionKey(key[0] ?? "") === sectionKey(first)) return "headline";
  return others.some(opens) ? "other" : undefined;
}

/** Route sections whose label is not the segment itself. */
const SECTION_LABELS: Readonly<Record<string, string>> = {
  benchmark: "Benchmarks",
  benchmarks: "Benchmarks",
  blog: "Blog",
  changelog: "Release",
  compare: "Comparison",
  comparison: "Comparison",
  comparisons: "Comparison",
  doc: "Documentation",
  docs: "Documentation",
  documentation: "Documentation",
  guide: "Guide",
  guides: "Guide",
  integration: "Integration",
  integrations: "Integration",
  news: "News",
  post: "Blog",
  posts: "Blog",
  release: "Release",
  releases: "Release",
  vs: "Comparison",
};

/**
 * The default eyebrow for a page at `path`: its first route segment as a
 * section label ("/docs/setup" gives "Documentation", "/compare/x" gives
 * "Comparison", "/use-cases" gives "Use cases"). The home page and paths
 * without a readable segment get none.
 */
export function socialImageEyebrow(path: string): string | undefined {
  const query = path.search(/[?#]/u);
  const segment = (query === -1 ? path : path.slice(0, query)).split("/").find((part) => part.length > 0);
  if (segment === undefined) return undefined;
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return undefined;
  }
  const key = decoded.toLocaleLowerCase("en-US");
  const label = SECTION_LABELS[key];
  if (label !== undefined) return label;
  const words = key.replace(/\.[a-z0-9]+$/u, "").split(/[-_\s]+/u).filter((word) => word.length > 0);
  if (words.length === 0 || !words.every((word) => /^\p{L}[\p{L}\p{N}]*$/u.test(word))) return undefined;
  const text = words.join(" ");
  return `${text.charAt(0).toLocaleUpperCase("en-US")}${text.slice(1)}`;
}

/**
 * The one card: a crop of the site's sticky header over the top of its
 * hero. The header band carries the foil brand mark, the foil product name,
 * and the domain; the body carries the eyebrow, the headline, and the
 * description in the site's own type scale and colors.
 */
const CARD = {
  /** Space between the header hairline and the body text. */
  bodyTop: 44,
  bottom: 60,
  descriptionSizes: [36, 34, 32, 30],
  descriptionWidth: 940,
  domainSize: 30,
  eyebrowGap: 18,
  eyebrowSize: 32,
  headGap: 26,
  header: 124,
  /** The headline size for one and two lines. */
  headline: 80,
  /** Sizes tried, largest first, when the headline needs three lines. */
  headlineThreeLine: [62, 58, 54, 50, 46],
  headlineWidth: 1056,
  hairline: 2,
  /** The brand mark's box in the header. */
  mark: 54,
  markGap: 18,
  /** Wordmark sizes, largest first; the standard size sets the cap height near the mark's. */
  nameSizes: [58, 52, 46, 42],
  pad: 72,
  /** Home-card tagline sizes for two lines, then three. */
  taglineTwoLine: [80, 74, 68, 64],
  taglineThreeLine: [60, 56, 52, 48],
} as const;

const WORDMARK: TextStyle = { lineHeight: 1.1, tracking: -0.04, weight: 700 };
const EYEBROW: TextStyle = { lineHeight: 1.2, tracking: 0, weight: 400 };
const DOMAIN: TextStyle = { lineHeight: 1.2, tracking: 0, weight: 400 };

/** The brand mark drawn in the header band, at `box` pixels. */
function headerMark(art: TileArt, palette: SocialImagePalette, box: number): ReactNode {
  if (art.type === "letter") return null;
  if (art.type === "node") {
    return <div style={{ color: palette.foreground, display: "flex" }}>{sizedMark(art.node, box)}</div>;
  }
  const size = iconBox(art.icon.aspect, box);
  const src = art.type === "mark" ? foilSource(art.icon, palette.foil) : artSource(art.icon);
  return <img alt="" height={size.height} src={src} style={{ display: "flex" }} width={size.width} />;
}

function markWidth(art: TileArt, box: number): number {
  if (art.type === "letter") return 0;
  if (art.type === "node") return box;
  return iconBox(art.icon.aspect, box).width;
}

/** The body headline: a page title at the page scale, a tagline at the home scale. */
function fitHeadline(
  fonts: SocialImageFonts,
  text: string,
  layout: SocialImageLayout,
  available: number,
): { headline: TextBlock; reduced: boolean } {
  const full = CARD.headlineWidth;
  if (layout === "product") {
    const head = fitWhole(fonts, text, full, CARD.taglineTwoLine, 2, HEADLINE)
      ?? fitWhole(fonts, text, full, CARD.taglineThreeLine, 3, HEADLINE)
      ?? fitClamped(fonts, text, full, CARD.taglineThreeLine[CARD.taglineThreeLine.length - 1] ?? 48, 3, HEADLINE);
    // A home tagline is set as large as it fits in two lines; only a third
    // line or an ellipsis counts as a change to the copy.
    return { headline: head, reduced: false };
  }
  // One headline size for every one- and two-line page title, so cards
  // across a site match; smaller sizes only when three lines are unavoidable.
  const two = fitWhole(fonts, text, full, [CARD.headline], 2, HEADLINE);
  if (two !== null) return { headline: two, reduced: false };
  const three = CARD.headlineThreeLine
    .map((size) => fitWhole(fonts, text, full, [size], 3, HEADLINE))
    .find((head): head is TextBlock => head !== null && blockHeight(head) <= available);
  if (three !== undefined) return { headline: three, reduced: true };
  const smallest = CARD.headlineThreeLine[CARD.headlineThreeLine.length - 1] ?? 46;
  return {
    headline: fitClamped(fonts, text, full, smallest, Math.max(1, Math.min(3, Math.floor(available / (smallest * HEADLINE.lineHeight)))), HEADLINE),
    reduced: true,
  };
}

function siteCard(
  copy: Copy,
  layout: SocialImageLayout,
  art: TileArt,
  palette: SocialImagePalette,
  fonts: SocialImageFonts,
): CardLayout {
  const inner = CARD_WIDTH - CARD.pad * 2;
  const textBoxes: Box[] = [];

  // Header band: mark and wordmark on the left, the domain on the right.
  const domain = fitClamped(fonts, copy.domain, inner / 3, CARD.domainSize, 1, DOMAIN);
  const domainWidth = domain.widths[0] ?? 0;
  const markSpace = art.type === "letter" ? 0 : markWidth(art, CARD.mark) + CARD.markGap;
  const nameWidth = inner - markSpace - domainWidth - 48;
  const name = fitWhole(fonts, copy.lockup, nameWidth, CARD.nameSizes, 1, WORDMARK)
    ?? fitClamped(fonts, copy.lockup, nameWidth, CARD.nameSizes[CARD.nameSizes.length - 1] ?? 42, 1, WORDMARK);
  const nameLineHeight = name.size * WORDMARK.lineHeight;
  textBoxes.push({ height: nameLineHeight, width: name.widths[0] ?? 0, x: CARD.pad + markSpace, y: (CARD.header - nameLineHeight) / 2 });
  textBoxes.push({ height: blockHeight(domain), width: domainWidth, x: CARD_WIDTH - CARD.pad - domainWidth, y: (CARD.header - blockHeight(domain)) / 2 });

  // Body: eyebrow, headline, description, centred between the header and
  // the bottom padding.
  const bodyTop = CARD.header + CARD.hairline + CARD.bodyTop;
  const available = CARD_HEIGHT - bodyTop - CARD.bottom;
  const kickerText = eyebrowKicker(copy, [copy.lockup, copy.domain, copy.headline]);
  const kicker = kickerText === undefined ? undefined : fitClamped(fonts, kickerText, inner, CARD.eyebrowSize, 1, EYEBROW);
  const kickerSpace = kicker === undefined ? 0 : blockHeight(kicker) + CARD.eyebrowGap;

  const { headline, reduced } = fitHeadline(fonts, copy.headline, layout, available - kickerSpace);
  let description: FitBlock | undefined;
  if (copy.description.length > 0) {
    const room = available - kickerSpace - blockHeight(headline) - CARD.headGap;
    const fits = (candidate: TextBlock) => blockHeight(candidate) <= room;
    const width = CARD.descriptionWidth;
    description = fitDescription(fonts, copy.description, width, CARD.descriptionSizes, 2, fits, false)
      ?? fitDescription(fonts, copy.description, width, CARD.descriptionSizes, 2, fits, true)
      ?? clampDescription(fonts, copy.description, width, Math.max(1, Math.min(2, Math.floor(room / (SOCIAL_IMAGE_MIN_FONT_SIZE * BODY.lineHeight)))));
  }
  const stack = kickerSpace + blockHeight(headline) + (description === undefined ? 0 : CARD.headGap + blockHeight(description));
  // Short copy sits a little above centre, as a hero does under its header.
  const lift = Math.max(0, Math.floor((available - stack) * 0.42));
  let y = bodyTop + lift;
  const place = (text: TextBlock | undefined, gapAfter: number) => {
    if (text === undefined) return;
    const lineHeight = text.size * text.style.lineHeight;
    text.widths.forEach((width, index) => {
      textBoxes.push({ height: lineHeight, width, x: CARD.pad, y: y + index * lineHeight });
    });
    y += blockHeight(text) + gapAfter;
  };
  place(kicker, CARD.eyebrowGap);
  place(headline, CARD.headGap);
  place(description, 0);

  const element = (
    <div style={{ backgroundColor: palette.background, display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      <div
        style={{
          alignItems: "center",
          backgroundColor: palette.header,
          borderBottom: `${String(CARD.hairline)}px solid ${palette.headerLine}`,
          display: "flex",
          height: CARD.header + CARD.hairline,
          justifyContent: "space-between",
          padding: `0 ${String(CARD.pad)}px`,
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex" }}>
          {art.type === "letter" ? null : (
            <div style={{ display: "flex", marginRight: CARD.markGap }}>{headerMark(art, palette, CARD.mark)}</div>
          )}
          <div
            style={{
              backgroundClip: "text",
              backgroundImage: socialImageFoilCss(palette.foil),
              color: "transparent",
              display: "flex",
              fontSize: name.size,
              fontWeight: 700,
              letterSpacing: `${String(WORDMARK.tracking)}em`,
              lineHeight: WORDMARK.lineHeight,
              // Room for the last glyph's overhang, so the clip keeps its edge.
              paddingRight: Math.ceil(name.size * 0.06),
              whiteSpace: "nowrap",
            }}
          >
            {name.lines[0] ?? ""}
          </div>
        </div>
        {lines({ color: palette.muted, text: domain })}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          padding: `${String(CARD.bodyTop + lift)}px ${String(CARD.pad)}px ${String(CARD.bottom)}px`,
        }}
      >
        {kicker === undefined ? null : lines({ color: palette.muted, style: { marginBottom: CARD.eyebrowGap }, text: kicker })}
        {lines({ color: palette.foreground, text: headline })}
        {description === undefined ? null : (
          lines({ color: palette.muted, style: { marginTop: CARD.headGap }, text: description })
        )}
      </div>
    </div>
  );
  return { element, fit: { description, eyebrow: kicker, headline, reduced }, textBoxes };
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

/** Reported lines use plain spaces; the no-break spaces only steer layout. */
function plainSpaces(line: string): string {
  return line.replace(/\u00A0/gu, " ");
}

function oneLine(value: string): string {
  return value.replace(/[^\S\u00A0]+/gu, " ").trim();
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
    /**
     * True when the description is set below its layout's standard size
     * (36px) to fit. Shorten the copy so every card reads at one scale.
     */
    reduced: boolean;
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
  /**
   * The same findings as `issues`, each with a stable code for tests that
   * allow some and reject others.
   */
  findings: readonly SocialImageFinding[];
  /** Human-readable findings; empty when the copy fits as written. */
  issues: readonly string[];
  layout: SocialImageLayout;
  /** Placeholders and characters the card left out. */
  removed: readonly SocialImageRemoval[];
}>;

/** Stable identifiers for the findings `socialImageFit` reports. */
export type SocialImageFindingCode =
  | "description-clamped"
  | "description-reduced"
  | "description-repeats-tagline"
  | "description-shortened"
  | "description-trailing-ellipsis"
  | "eyebrow-missing"
  | "eyebrow-repeats-headline"
  | "headline-clamped"
  | "headline-reduced"
  | "headline-three-lines"
  | "home-headline-three-lines"
  | "placeholder"
  | "unsupported-characters";

export type SocialImageFinding = Readonly<{
  code: SocialImageFindingCode;
  message: string;
}>;

/** Copy findings that depend on the source text rather than the fitted layout. */
type CopyFindings = Readonly<{
  eyebrowMissing: boolean;
  eyebrowRepeatsHeadline: boolean;
  repeatsTagline: boolean;
  trailingEllipsis: boolean;
}>;

type RenderedCard = SocialImageCard & { fit: SocialImageFit; ghost?: Box; textBoxes: readonly Box[] };

/**
 * Findings `strict` throws on: copy that the card had to change to fit.
 * Review findings added later (a reduced description size, a missing or
 * repeated eyebrow, a repeated tagline, a trailing ellipsis) are reported by
 * `socialImageFit` only, so upgrading never breaks a strict build.
 */
const STRICT_CODES: ReadonlySet<SocialImageFindingCode> = new Set([
  "description-clamped",
  "description-shortened",
  "headline-clamped",
  "headline-reduced",
  "headline-three-lines",
  "placeholder",
  "unsupported-characters",
]);

/** The description size every layout treats as standard. */
const STANDARD_DESCRIPTION_SIZE = 36;

function fitFindings(
  fit: Omit<SocialImageFit, "findings" | "issues">,
  copy: CopyFindings,
): SocialImageFinding[] {
  const findings: SocialImageFinding[] = [];
  const add = (code: SocialImageFindingCode, message: string) => findings.push({ code, message });
  for (const removal of fit.removed) {
    if (removal.reason === "placeholder") {
      add("placeholder", `${removal.field} contains the placeholder ${JSON.stringify(removal.text)}`);
    } else {
      add("unsupported-characters", `${removal.field} contains ${JSON.stringify(removal.text)}, which the embedded Nebula Sans fonts cannot draw`);
    }
  }
  if (fit.headline.truncated) add("headline-clamped", "headline does not fit and was clamped with an ellipsis");
  else if (fit.headline.threeLine && fit.layout === "page") add("headline-three-lines", `headline needs three lines, so it is set at ${String(fit.headline.size)}px`);
  else if (fit.headline.threeLine) add("home-headline-three-lines", `the home tagline needs three lines at ${String(fit.headline.size)}px; pass the site's short hero headline as the home page's \`headline\``);
  else if (fit.headline.reduced) add("headline-reduced", `headline does not fit two lines at the standard size, so it is set at ${String(fit.headline.size)}px`);
  if (fit.description !== undefined && fit.description.cut !== "none") {
    if (fit.description.cut === "ellipsis") add("description-clamped", "description does not fit and was clamped with an ellipsis");
    else add("description-shortened", `description was shortened to its last whole ${fit.description.cut} that fits`);
  }
  if (fit.description?.reduced === true) {
    add("description-reduced", `description fits only below the standard ${String(STANDARD_DESCRIPTION_SIZE)}px, so it is set at ${String(fit.description.size)}px; shorten it`);
  }
  if (copy.trailingEllipsis) add("description-trailing-ellipsis", "description ends with an ellipsis, as if it was cut before it reached the card");
  if (copy.repeatsTagline) add("description-repeats-tagline", "description repeats the site tagline; give the page its own description");
  if (copy.eyebrowMissing) add("eyebrow-missing", "page card has no eyebrow; set one, or pass an empty string to leave it out on purpose");
  if (copy.eyebrowRepeatsHeadline) add("eyebrow-repeats-headline", "eyebrow repeats the opening of the headline, so it is not drawn");
  return findings;
}

/** Text compared without case, spacing, quote style, or closing punctuation. */
function comparable(value: string): string {
  const spaced = socialImageTypography(value).replace(/\s+/gu, " ");
  return trimEnds(spaced, "", " .!?…").trim().toLocaleLowerCase("en-US");
}

/** Strips leading characters in `head` and trailing characters in `tail`, in linear time. */
function trimEnds(value: string, head: string, tail: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && head.includes(value.charAt(start))) start += 1;
  while (end > start && tail.includes(value.charAt(end - 1))) end -= 1;
  return value.slice(start, end);
}

function renderSocialImageCard(details: SocialImageDetails): RenderedCard {
  const layout = socialImageLayout(details);
  const fonts = nebulaSansSocialFonts();
  const removed: SocialImageRemoval[] = [];
  const clean = (value: string, field: TextField) =>
    cleanSocialImageText(normalizeSocialImageText(value), field, fonts, removed);
  const keep = details.keepTogether ?? [];
  // Prose fields get curly quotes and kept-together names; the domain stays as written.
  const prose = (value: string, field: TextField) => bindPhrases(socialImageTypography(clean(value, field)), keep);
  const copy = {
    description: prose(details.description, "description"),
    domain: clean(details.domain, "domain"),
    eyebrow: details.eyebrow === undefined ? undefined : prose(details.eyebrow, "eyebrow"),
    headline: prose(socialImageHeadline(details), details.headline === undefined ? "title" : "headline"),
    lockup: prose(lockupName(details), "title"),
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
  // A home card is the site's hero: the product name sits in the header, so
  // the tagline becomes the headline. A card whose headline differs from the
  // product name (a named headline, or a title such as "Pricing | Example")
  // keeps its description beneath the headline instead.
  const ownHeadline = comparable(flat.headline) !== comparable(flat.lockup);
  const hero: Copy = layout === "product" && !ownHeadline && flat.description.length > 0
    ? { ...flat, description: "", headline: flat.description }
    : flat;
  const art = tileArt(details, flat.lockup.length > 0 ? flat.lockup : flat.headline);
  const palette = socialImagePalette(details.theme ?? {}, undefined, details.palette);
  const card = siteCard(hero, layout, art, palette, fonts);

  const measured: Omit<SocialImageFit, "findings" | "issues"> = {
    description: card.fit.description === undefined
      ? undefined
      : {
        cut: card.fit.description.cut,
        lines: card.fit.description.lines.map(plainSpaces),
        reduced: card.fit.description.size < STANDARD_DESCRIPTION_SIZE,
        size: card.fit.description.size,
      },
    eyebrow: card.fit.eyebrow === undefined ? undefined : plainSpaces(card.fit.eyebrow.lines.join(" ")),
    headline: {
      lines: card.fit.headline.lines.map(plainSpaces),
      size: card.fit.headline.size,
      reduced: card.fit.reduced,
      threeLine: card.fit.headline.lines.length >= 3,
      truncated: card.fit.headline.lines.some((line) => line.endsWith(ELLIPSIS)),
    },
    layout,
    removed,
  };
  const eyebrowText = flat.eyebrow;
  const findings = fitFindings(measured, {
    eyebrowMissing: layout === "page" && details.eyebrow === undefined,
    eyebrowRepeatsHeadline: eyebrowText !== undefined
      && eyebrowRepeats(eyebrowText, flat.headline, [flat.lockup, flat.domain]) === "headline",
    repeatsTagline: details.tagline !== undefined
      && flat.description.length > 0
      && comparable(flat.headline) !== comparable(flat.lockup)
      && comparable(flat.description) === comparable(details.tagline),
    trailingEllipsis: /(?:\.\.\.|…)$/u.test(flat.description),
  });
  const fit: SocialImageFit = { ...measured, findings, issues: findings.map(({ message }) => message) };
  const blocking = findings.filter(({ code }) => STRICT_CODES.has(code));
  if (details.strict === true && blocking.length > 0) {
    throw new RangeError(`social image copy does not fit as written: ${blocking.map(({ message }) => message).join("; ")}.`);
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
  /** The product name as the site header shows it. Defaults to `name`. */
  brand?: string;
  /** The header's monochrome brand mark: SVG markup or a data: URL. */
  brandMark?: string;
  description: string;
  domain: string;
  /** Legacy (v0.12): pass `brandMark`. */
  icon?: SocialImageIcon;
  /** Names no card on the site may break across lines, such as "Claude Code Router". */
  keepTogether?: readonly string[];
  mark?: SocialImageDetails["mark"];
  name: string;
  /** The site's Design Kit palette. See {@link SocialImageDetails.palette}. */
  palette?: SocialImagePaletteName;
  theme?: Partial<SocialImageTheme>;
}>;

/** Per-page copy layered over a site. Omit it for the site's home card. */
export type SocialImagePage = Readonly<{
  description?: string;
  /**
   * The label above the headline. When omitted on a page card, it defaults
   * to `socialImageEyebrow(path)`. `false` leaves the card without one.
   */
  eyebrow?: string | false;
  headline?: string;
  layout?: SocialImageLayout;
  /** The page's route, such as "/docs/setup", used for the default eyebrow. */
  path?: string;
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
  if (site.keepTogether !== undefined && (!Array.isArray(site.keepTogether) || !site.keepTogether.every((phrase) => typeof phrase === "string"))) {
    throw new TypeError("social image site keepTogether must be an array of strings");
  }
  if (site.brand !== undefined) requiredText(site.brand, "brand");
  if (site.brandMark !== undefined) parseIconSource(brandMarkSource(site.brandMark), "mark");
  if (site.palette !== undefined) paletteTheme({}, site.palette);
  const icon = site.icon === undefined ? undefined : parseSocialImageIcon(site.icon);
  return Object.freeze({ ...site, ...(icon === undefined ? {} : { icon }) });
}

/** The palette every card of `site` draws. */
export function socialImageSitePalette(site: SocialImageSite): SocialImagePalette {
  return socialImagePalette(site.theme ?? {}, undefined, site.palette);
}

/** Two sites whose cards look alike. */
export type SocialImageLookAlike = Readonly<{
  distance: number;
  first: string;
  second: string;
}>;

/**
 * Every pair of `sites` whose card backgrounds are closer than `minimum`
 * (CIE76 ΔE, default `SOCIAL_IMAGE_MIN_PALETTE_DISTANCE`), closest first.
 * Run it over a portfolio's site records in one test to keep every site's
 * cards distinct in a feed.
 */
export function socialImageLookAlikes(
  sites: readonly SocialImageSite[],
  minimum: number = SOCIAL_IMAGE_MIN_PALETTE_DISTANCE,
): SocialImageLookAlike[] {
  const palettes = sites.map((site) => ({ name: site.name, palette: socialImageSitePalette(site) }));
  const pairs: SocialImageLookAlike[] = [];
  for (const [index, first] of palettes.entries()) {
    for (const second of palettes.slice(index + 1)) {
      // Sites that share a Design Kit palette share it on the web too; their
      // cards differ by mark and name, as their headers do.
      const shared = sites[index]?.palette;
      if (shared !== undefined && sites[palettes.indexOf(second)]?.palette === shared) continue;
      const distance = socialImagePaletteDistance(first.palette, second.palette);
      if (distance < minimum) pairs.push({ distance, first: first.name, second: second.name });
    }
  }
  return pairs.sort((a, b) => a.distance - b.distance);
}

/**
 * The route-derived eyebrow, or "" (none on purpose) when the path has no
 * section or its label only repeats the headline's opening ("Documentation"
 * over "Documentation", on a section index page).
 */
function defaultEyebrow(path: string, headline: string): string {
  const label = socialImageEyebrow(path);
  if (label === undefined) return "";
  const key = keyWords(label);
  const said = key.length === 1 && keyWords(headline).some((word) => sectionKey(word) === sectionKey(key[0] ?? ""));
  return said || eyebrowRepeats(label, headline, []) === "headline" ? "" : label;
}

export function socialImageSiteDetails(
  site: SocialImageSite,
  page: SocialImagePage = {},
): SocialImageDetails {
  // The site tagline describes the product, not a page: a page card with no
  // description of its own leaves the subtitle empty.
  const pageCard = page.layout === "page"
    || (page.layout === undefined && page.headline !== undefined && page.headline !== site.name);
  const eyebrow = page.eyebrow === false
    ? ""
    : page.eyebrow ?? (pageCard && page.path !== undefined ? defaultEyebrow(page.path, page.headline ?? site.name) : undefined);
  return {
    description: page.description ?? (pageCard ? "" : site.description),
    domain: site.domain,
    tagline: site.description,
    title: site.name,
    ...(eyebrow === undefined ? {} : { eyebrow }),
    ...(page.headline === undefined ? {} : { headline: page.headline }),
    ...(site.keepTogether === undefined ? {} : { keepTogether: site.keepTogether }),
    ...(page.layout === undefined ? {} : { layout: page.layout }),
    ...(site.brand === undefined ? {} : { brand: site.brand }),
    ...(site.brandMark === undefined ? {} : { brandMark: site.brandMark }),
    ...(site.icon === undefined ? {} : { icon: site.icon }),
    ...(site.mark === undefined ? {} : { mark: site.mark }),
    ...(site.palette === undefined ? {} : { palette: site.palette }),
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

