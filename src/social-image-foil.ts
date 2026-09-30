/**
 * The Design Kit brand foil, resolved for a still social card.
 *
 * Marketing sites paint the header mark and product name with one metallic
 * recipe (`src/foil-material.ts` in @hraness/design-kit): four layers over the
 * glyphs, top first,
 *
 *   1. a narrow radial highlight, ellipse 24% x 85% at the resting center,
 *      from the ink mixed 80% into the background to transparent at 68%;
 *   2. a broad radial highlight, ellipse 65% x 160% at the center, from the
 *      ink mixed 98% to transparent at 72%;
 *   3. a 115deg six-stop spectrum at 14% opacity (the restrained rainbow);
 *   4. 115deg neutral metal bands mixed from ink and background in OKLCH at
 *      90, 100, 86, 100, 84 and 100 percent ink.
 *
 * A card renderer cannot read CSS custom properties or `color-mix()`, so this
 * module resolves the same recipe to plain colors: CSS gradient strings for
 * text drawn with `background-clip: text`, and a self-contained SVG that
 * paints the recipe through a mark's alpha for the brand mark.
 */

/** The light-theme spectrum from Design Kit's foil material, as OKLCH. */
export const FOIL_SPECTRUM = [
  [0.89, 0.065, 337],
  [0.875, 0.05, 277],
  [0.92, 0.05, 170],
  [0.95, 0.045, 96],
  [0.9, 0.05, 55],
  [0.875, 0.06, 305],
] as const;

/** Opacity of the spectrum over the metal, as Design Kit's --hraness-foil-reflection. */
export const FOIL_REFLECTION = 0.14;
/** Direction of the metal bands and spectrum, in CSS degrees. */
export const FOIL_ANGLE = 115;
/** Percent ink in each metal band, at 0, 24, 39, 56, 82 and 100 percent. */
const METAL_BANDS = [[90, 0], [100, 24], [86, 39], [100, 56], [84, 82], [100, 100]] as const;

type Oklab = readonly [number, number, number];

function channel(hex: string, index: number): number {
  return Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
}

function toLinear(value: number): number {
  return value <= 0.040_45 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function fromLinear(value: number): number {
  return value <= 0.003_130_8 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}

function oklab(hex: string): Oklab {
  const [r, g, b] = [0, 1, 2].map((index) => toLinear(channel(hex, index))) as [number, number, number];
  const l = Math.cbrt(0.412_221_470_8 * r + 0.536_332_536_3 * g + 0.051_445_992_9 * b);
  const m = Math.cbrt(0.211_903_498_2 * r + 0.680_699_545_1 * g + 0.107_396_956_6 * b);
  const s = Math.cbrt(0.088_302_461_9 * r + 0.281_718_837_6 * g + 0.629_978_700_5 * b);
  return [
    0.210_454_255_3 * l + 0.793_617_785 * m - 0.004_072_046_8 * s,
    1.977_998_495_1 * l - 2.428_592_205 * m + 0.450_593_709_9 * s,
    0.025_904_037_1 * l + 0.782_771_766_2 * m - 0.808_675_766 * s,
  ];
}

function oklabHex([lightness, a, b]: Oklab): string {
  const l = (lightness + 0.396_337_777_4 * a + 0.215_803_757_3 * b) ** 3;
  const m = (lightness - 0.105_561_345_8 * a - 0.063_854_172_8 * b) ** 3;
  const s = (lightness - 0.089_484_177_5 * a - 1.291_485_548 * b) ** 3;
  const rgb = [
    4.076_741_662_1 * l - 3.307_711_591_3 * m + 0.230_969_929_2 * s,
    -1.268_438_004_6 * l + 2.609_757_401_1 * m - 0.341_319_396_5 * s,
    -0.004_196_086_3 * l - 0.703_418_614_7 * m + 1.707_614_701 * s,
  ];
  return `#${rgb
    .map((value) => Math.round(Math.min(1, Math.max(0, fromLinear(value))) * 255).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

/** An OKLCH color as six-digit sRGB hex, clipped into gamut. */
export function oklchHex(lightness: number, chroma: number, hue: number): string {
  const radians = (hue * Math.PI) / 180;
  return oklabHex([lightness, chroma * Math.cos(radians), chroma * Math.sin(radians)]);
}

/**
 * CSS `color-mix(in oklch, first amount%, second)`: lightness, chroma and
 * hue interpolated, the hue along the shorter arc, and a grey's powerless
 * hue taken from the other color.
 */
export function mixOklch(first: string, second: string, amount: number): string {
  const polar = (hex: string) => {
    const [l, a, b] = oklab(hex);
    const chroma = Math.hypot(a, b);
    return { chroma, hue: chroma < 1e-4 ? undefined : Math.atan2(b, a), l };
  };
  const p = polar(first);
  const q = polar(second);
  const hueP = p.hue ?? q.hue ?? 0;
  const hueQ = q.hue ?? p.hue ?? 0;
  let delta = hueP - hueQ;
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  const hue = hueQ + delta * amount;
  const chroma = q.chroma + (p.chroma - q.chroma) * amount;
  const l = q.l + (p.l - q.l) * amount;
  return oklabHex([l, chroma * Math.cos(hue), chroma * Math.sin(hue)]);
}

/** The foil resolved for one ink and background. */
export type SocialImageFoil = Readonly<{
  /** Metal band colors with their CSS stop positions in percent. */
  bands: readonly (readonly [string, number])[];
  /** The narrow and broad resting highlight colors. */
  highlight: Readonly<{ broad: string; narrow: string }>;
  /** The six spectrum colors, drawn at `FOIL_REFLECTION` opacity. */
  spectrum: readonly string[];
}>;

export function socialImageFoil(ink: string, background: string): SocialImageFoil {
  return {
    bands: METAL_BANDS.map(([share, stop]) => [mixOklch(ink, background, share / 100), stop] as const),
    highlight: { broad: mixOklch(ink, background, 0.98), narrow: mixOklch(ink, background, 0.8) },
    spectrum: FOIL_SPECTRUM.map(([l, c, h]) => oklchHex(l, c, h)),
  };
}

function rgbaOf(hex: string, alpha: number): string {
  const [r, g, b] = [0, 1, 2].map((index) => Math.round(channel(hex, index) * 255));
  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(alpha)})`;
}

/**
 * The foil as a CSS `background-image` list for text drawn with
 * `background-clip: text`, top layer first, exactly as Design Kit paints
 * `.hraness-foil-text` at rest.
 */
export function socialImageFoilCss(foil: SocialImageFoil): string {
  const angle = `${String(FOIL_ANGLE)}deg`;
  return [
    `radial-gradient(24% 85% at 50% 50%, ${foil.highlight.narrow} 0%, ${rgbaOf(foil.highlight.narrow, 0)} 68%)`,
    `radial-gradient(65% 160% at 50% 50%, ${foil.highlight.broad} 0%, ${rgbaOf(foil.highlight.broad, 0)} 72%)`,
    `linear-gradient(${angle}, ${foil.spectrum.map((stop) => rgbaOf(stop, FOIL_REFLECTION)).join(", ")})`,
    `linear-gradient(${angle}, ${foil.bands.map(([band, stop]) => `${band} ${String(stop)}%`).join(", ")})`,
  ].join(", ");
}

/** The endpoints of a CSS angle gradient across a `width` by `height` box. */
function cssGradientLine(width: number, height: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return {
    x1: round(width / 2 - dx * half),
    x2: round(width / 2 + dx * half),
    y1: round(height / 2 - dy * half),
    y2: round(height / 2 + dy * half),
  };
}

type Rect = Readonly<{ height: number; width: number; x: number; y: number }>;

/**
 * SVG markup that paints the foil across `box` through the alpha of
 * `maskContent`: gradient and mask definitions, then the four foil layers.
 * The layers are sized to the box as the site sizes them to the mark's own
 * box, so the highlight rests on the center of the glyph.
 */
export function socialImageFoilPaint(foil: SocialImageFoil, box: Rect, maskContent: string, id = "f"): string {
  const { height, width, x, y } = box;
  const line = cssGradientLine(width, height, FOIL_ANGLE);
  const lineAttributes = `gradientUnits="userSpaceOnUse" x1="${String(x + line.x1)}" y1="${String(y + line.y1)}" x2="${String(x + line.x2)}" y2="${String(y + line.y2)}"`;
  const spectrumStops = foil.spectrum
    .map((stop, index) => `<stop offset="${String(index / (foil.spectrum.length - 1))}" stop-color="${stop}" stop-opacity="${String(FOIL_REFLECTION)}"/>`)
    .join("");
  const bandStops = foil.bands.map(([band, stop]) => `<stop offset="${String(stop / 100)}" stop-color="${band}"/>`).join("");
  const radial = (name: string, rx: number, ry: number, colorValue: string, end: number) =>
    `<radialGradient id="${id}-${name}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${String(x + width / 2)} ${String(y + height / 2)}) scale(${String(rx * width)} ${String(ry * height)})">`
    + `<stop offset="0" stop-color="${colorValue}"/><stop offset="${String(end)}" stop-color="${colorValue}" stop-opacity="0"/></radialGradient>`;
  const rect = (fill: string) =>
    `<rect x="${String(x)}" y="${String(y)}" width="${String(width)}" height="${String(height)}" fill="url(#${id}-${fill})"/>`;
  return "<defs>"
    + `<linearGradient id="${id}-metal" ${lineAttributes}>${bandStops}</linearGradient>`
    + `<linearGradient id="${id}-spectrum" ${lineAttributes}>${spectrumStops}</linearGradient>`
    + radial("broad", 0.65, 1.6, foil.highlight.broad, 0.72)
    + radial("narrow", 0.24, 0.85, foil.highlight.narrow, 0.68)
    + `<mask id="${id}-mask" maskUnits="userSpaceOnUse" x="${String(x)}" y="${String(y)}" width="${String(width)}" height="${String(height)}" style="mask-type:alpha" mask-type="alpha">${maskContent}</mask>`
    + "</defs>"
    + `<g mask="url(#${id}-mask)">${rect("metal")}${rect("spectrum")}${rect("broad")}${rect("narrow")}</g>`;
}
