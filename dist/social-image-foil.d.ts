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
export declare const FOIL_SPECTRUM: readonly [readonly [0.89, 0.065, 337], readonly [0.875, 0.05, 277], readonly [0.92, 0.05, 170], readonly [0.95, 0.045, 96], readonly [0.9, 0.05, 55], readonly [0.875, 0.06, 305]];
/** Opacity of the spectrum over the metal, as Design Kit's --hraness-foil-reflection. */
export declare const FOIL_REFLECTION = 0.14;
/** Direction of the metal bands and spectrum, in CSS degrees. */
export declare const FOIL_ANGLE = 115;
/** An OKLCH color as six-digit sRGB hex, clipped into gamut. */
export declare function oklchHex(lightness: number, chroma: number, hue: number): string;
/**
 * CSS `color-mix(in oklch, first amount%, second)`: lightness, chroma and
 * hue interpolated, the hue along the shorter arc, and a grey's powerless
 * hue taken from the other color.
 */
export declare function mixOklch(first: string, second: string, amount: number): string;
/** The foil resolved for one ink and background. */
export type SocialImageFoil = Readonly<{
    /** Metal band colors with their CSS stop positions in percent. */
    bands: readonly (readonly [string, number])[];
    /** The narrow and broad resting highlight colors. */
    highlight: Readonly<{
        broad: string;
        narrow: string;
    }>;
    /** The six spectrum colors, drawn at `FOIL_REFLECTION` opacity. */
    spectrum: readonly string[];
}>;
export declare function socialImageFoil(ink: string, background: string): SocialImageFoil;
/**
 * The foil as a CSS `background-image` list for text drawn with
 * `background-clip: text`, top layer first, exactly as Design Kit paints
 * `.hraness-foil-text` at rest.
 */
export declare function socialImageFoilCss(foil: SocialImageFoil): string;
type Rect = Readonly<{
    height: number;
    width: number;
    x: number;
    y: number;
}>;
/**
 * SVG markup that paints the foil across `box` through the alpha of
 * `maskContent`: gradient and mask definitions, then the four foil layers.
 * The layers are sized to the box as the site sizes them to the mark's own
 * box, so the highlight rests on the center of the glyph.
 */
export declare function socialImageFoilPaint(foil: SocialImageFoil, box: Rect, maskContent: string, id?: string): string;
export {};
//# sourceMappingURL=social-image-foil.d.ts.map