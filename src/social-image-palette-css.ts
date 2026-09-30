/**
 * Reads the light-theme colors a social card needs from Design Kit's
 * `palette-system.css`. Used by the sync script and by the test that pins
 * the generated table to the reviewed CSS; cards themselves never parse CSS.
 */

/** The palette colors a card draws, all six-digit lowercase hex. */
export type DesignKitPaletteColors = Readonly<{
  /** The page background. */
  background: string;
  /** Body and headline text. */
  foreground: string;
  /** Secondary text. */
  muted: string;
  /** Hairlines, such as the sticky header's bottom border. */
  line: string;
  /** The raised surface the sticky header sits on. */
  surface: string;
  /** The product primary. */
  primary: string;
}>;

const FIELDS = ["background", "foreground", "muted", "line", "surface", "primary"] as const;
const BLOCK = /:root\[data-palette="([a-z-]+)"\]\[data-theme="light"\],\s*\[data-palette="\1"\]\[data-theme="light"\]\s*\{([^}]*)\}/gu;

export function parseDesignKitLightPalettes(css: string): Record<string, DesignKitPaletteColors> {
  const palettes: Record<string, DesignKitPaletteColors> = {};
  for (const [, name = "", body = ""] of css.matchAll(BLOCK)) {
    const colors: Partial<Record<(typeof FIELDS)[number], string>> = {};
    for (const field of FIELDS) {
      const match = new RegExp(`--hraness-palette-${field}:\\s*(#[0-9a-fA-F]{6})\\s*;`, "u").exec(body);
      if (match?.[1] === undefined) throw new Error(`palette ${name} has no six-digit light ${field}`);
      colors[field] = match[1].toLowerCase();
    }
    palettes[name] = colors as DesignKitPaletteColors;
  }
  if (Object.keys(palettes).length === 0) throw new Error("no light palettes found in palette-system.css");
  return palettes;
}
