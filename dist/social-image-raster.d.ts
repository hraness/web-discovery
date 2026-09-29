/**
 * Just enough PNG decoding to measure an icon's opaque area. It runs in any
 * runtime (no `node:zlib`), reads nothing outside the given bytes, and gives
 * up quietly on anything unusual, so the card falls back to drawing the icon
 * as declared.
 */
/** Opaque-pixel bounds of an image, as fractions of its width and height. */
export type RasterBounds = Readonly<{
    bottom: number;
    left: number;
    right: number;
    top: number;
}>;
export type RasterCoverage = Readonly<{
    bounds: RasterBounds;
    /** True when all four corner pixels are opaque, so the art is a full square. */
    cornersOpaque: boolean;
    /** True when the middle of the art's bounds is opaque (a filled shape, not a ring or outline). */
    centerOpaque: boolean;
    /** Share of the pixels inside `bounds` that are opaque, from 0 to 1. */
    fill: number;
    /**
     * The most common saturated color among opaque pixels, as `#RRGGBB`, or
     * undefined when the art is greyscale.
     */
    hue?: string;
}>;
/** Inflates a zlib stream (RFC 1950/1951) whose output is `expected` bytes. */
export declare function inflateZlib(data: Uint8Array, expected: number): Uint8Array;
/**
 * Measures where a PNG is opaque (alpha above ~10%). Returns undefined for
 * interlaced, 16-bit, or malformed files and for images with no opaque pixel.
 */
export declare function pngCoverage(bytes: Uint8Array): RasterCoverage | undefined;
//# sourceMappingURL=social-image-raster.d.ts.map