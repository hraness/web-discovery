import { nebulaSansSocialFonts } from "@hraness/design-kit/fonts/nebula-sans/social";
import type { ReactElement, ReactNode } from "react";
export declare const CARD_WIDTH = 1200;
export declare const CARD_HEIGHT = 630;
export declare const CARD_PADDING = 60;
export declare const TOP_BAR_HEIGHT = 54;
export declare const BOTTOM_RULE_HEIGHT = 54;
/** The smallest font size any card draws, in pixels. */
export declare const SOCIAL_IMAGE_MIN_FONT_SIZE = 30;
export declare const socialImageMarks: {
    readonly splitSquare: "◫";
};
export type SocialImageMark = (typeof socialImageMarks)[keyof typeof socialImageMarks];
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
export declare const plainSocialImageTheme: {
    readonly accent: "#2457A6";
    readonly background: "#FFFFFF";
    readonly foreground: "#171717";
    readonly muted: "#666666";
};
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
/** WCAG 2 contrast ratio between two six-digit hex colors. */
export declare function socialImageContrastRatio(first: string, second: string): number;
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
 * Resolves a card theme into the colors the card draws. The accent is the
 * product primary. A mid-tone background moves toward black or white until
 * body text can reach 7:1.
 */
export declare function socialImagePalette(theme?: Partial<SocialImageTheme>, 
/** Wash color used when the theme sets none, such as an app icon's hue. */
brand?: string): SocialImagePalette;
/**
 * The smallest `socialImagePaletteDistance` at which two sites' cards read as
 * different sites in a feed of thumbnails: about twice a just-noticeable
 * difference. Washes 30 degrees of hue apart on one base clear it.
 */
export declare const SOCIAL_IMAGE_MIN_PALETTE_DISTANCE = 5;
/**
 * How far apart two resolved card palettes look: the mean CIE76 ΔE of the
 * background base and its washed far corner, the colors that fill a
 * thumbnail. Below `SOCIAL_IMAGE_MIN_PALETTE_DISTANCE` two sites' cards read
 * as one site; give one of them a different `theme.wash`.
 */
export declare function socialImagePaletteDistance(first: SocialImagePalette, second: SocialImagePalette): number;
/**
 * Returns the card headline: `details.headline` when given, otherwise the
 * title with one trailing brand segment removed. A segment counts as the
 * brand only when it matches the eyebrow, the domain, or the domain without
 * its top-level label, ignoring case, so page words are never dropped.
 */
export declare function socialImageHeadline(details: Pick<SocialImageDetails, "domain" | "eyebrow" | "headline" | "title">): string;
/**
 * Returns the layout a card uses: `details.layout` when given, otherwise
 * "page" when `headline` is set and differs from `title`, else "product".
 */
export declare function socialImageLayout(details: Pick<SocialImageDetails, "headline" | "layout" | "title">): SocialImageLayout;
type TextField = "description" | "domain" | "eyebrow" | "headline" | "title";
/** Characters a card dropped from one field, and why. */
export type SocialImageRemoval = Readonly<{
    field: TextField;
    reason: "placeholder" | "unsupported";
    text: string;
}>;
/**
 * Sets straight quotes as curly quotes (’ ‘ “ ”) and a hyphen between two
 * ascending numbers as an en dash. Contractions and possessives ("Lovelace's",
 * "ALGAL's") take ’. URLs, domains, paths, and code-like tokens, and text in
 * backticks, stay as written.
 */
export declare function socialImageTypography(text: string): string;
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
 * Parses `details.icon` from an unknown value. The source must be a local
 * `data:` URL holding an SVG or PNG image; remote URLs and file paths throw.
 */
/**
 * How an icon will sit in its tile. A `mark` is always repainted as a glyph
 * in the 60% safe area, so it reports "open"; an `app` icon reports the shape
 * measured from its art (see {@link SocialImageIconShape}).
 */
export declare function socialImageIconShape(icon: SocialImageIcon): SocialImageIconShape;
export declare function parseSocialImageIcon(value: unknown): SocialImageIcon;
/** Share of a tile's side that a `mark` glyph's own bounds fill. */
export declare const SOCIAL_IMAGE_GLYPH_SHARE = 0.6;
/**
 * The default eyebrow for a page at `path`: its first route segment as a
 * section label ("/docs/setup" gives "Documentation", "/compare/x" gives
 * "Comparison", "/use-cases" gives "Use cases"). The home page and paths
 * without a readable segment get none.
 */
export declare function socialImageEyebrow(path: string): string | undefined;
export declare function socialImageFonts(): SocialImageFonts;
export declare function createSocialImageElement(details: SocialImageDetails): ReactElement;
/** Where each text line and the page-layout ghost land, in card pixels. */
export type SocialImageGeometry = Readonly<{
    ghost?: Readonly<{
        height: number;
        width: number;
        x: number;
        y: number;
    }>;
    textBoxes: readonly Readonly<{
        height: number;
        width: number;
        x: number;
        y: number;
    }>[];
}>;
/**
 * The laid-out geometry of a card, for checks that text and decoration never
 * collide. It renders nothing.
 */
export declare function socialImageGeometry(details: SocialImageDetails): SocialImageGeometry;
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
export type SocialImageFindingCode = "description-clamped" | "description-reduced" | "description-repeats-tagline" | "description-shortened" | "description-trailing-ellipsis" | "eyebrow-missing" | "eyebrow-repeats-headline" | "headline-clamped" | "headline-reduced" | "headline-three-lines" | "placeholder" | "unsupported-characters";
export type SocialImageFinding = Readonly<{
    code: SocialImageFindingCode;
    message: string;
}>;
/**
 * Lays out a card without rendering it and reports how its copy fitted:
 * whether the description was shortened, whether the headline needed three
 * lines, and what placeholders or undrawable characters were left out. A
 * site can assert `socialImageFit(details).issues` is empty in its tests.
 */
export declare function socialImageFit(details: SocialImageDetails): SocialImageFit;
export declare function createSocialImageCard(details: SocialImageDetails): SocialImageCard;
/**
 * One site's social identity, declared once and shared by every card the
 * site renders. The card design itself stays in this package.
 */
export type SocialImageSite = Readonly<{
    description: string;
    domain: string;
    icon?: SocialImageIcon;
    /** Names no card on the site may break across lines, such as "Claude Code Router". */
    keepTogether?: readonly string[];
    mark?: SocialImageDetails["mark"];
    name: string;
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
export declare function defineSocialImageSite(site: SocialImageSite): SocialImageSite;
/** The palette every card of `site` draws, including an app icon's wash. */
export declare function socialImageSitePalette(site: SocialImageSite): SocialImagePalette;
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
export declare function socialImageLookAlikes(sites: readonly SocialImageSite[], minimum?: number): SocialImageLookAlike[];
export declare function socialImageSiteDetails(site: SocialImageSite, page?: SocialImagePage): SocialImageDetails;
export declare function socialImageAlt(site: SocialImageSite, page?: SocialImagePage): string;
export {};
//# sourceMappingURL=social-image-card.d.ts.map