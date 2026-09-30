import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { FOIL_ANGLE, FOIL_REFLECTION, FOIL_SPECTRUM, socialImageFoil, socialImageFoilPaint } from "./social-image-foil.js";
import { parseDesignKitLightPalettes } from "./social-image-palette-css.js";
import { DESIGN_KIT_LIGHT_PALETTES, DESIGN_KIT_PALETTE_SOURCE } from "./social-image-palettes.generated.js";

const css = readFileSync(join(import.meta.dir, "../fixtures/design-kit/palette-system.css"), "utf8");

describe("Design Kit palettes and foil", () => {
  test("pins the generated palette table to the reviewed palette-system.css", () => {
    expect(createHash("sha256").update(css).digest("hex")).toBe(DESIGN_KIT_PALETTE_SOURCE.sha256);
    expect(parseDesignKitLightPalettes(css)).toEqual(DESIGN_KIT_LIGHT_PALETTES);
    // The five palettes the marketing sites use are all present.
    expect(Object.keys(DESIGN_KIT_LIGHT_PALETTES).sort()).toEqual(["catppuccin", "gruvbox", "paper", "rose-pine", "tokyo-night"]);
    expect(DESIGN_KIT_LIGHT_PALETTES["tokyo-night"].background).toBe("#e1e2e7");
    expect(DESIGN_KIT_LIGHT_PALETTES.gruvbox.foreground).toBe("#393533");
  });

  test("rejects a palette block without a six-digit light color", () => {
    expect(() => parseDesignKitLightPalettes(":root { }")).toThrow("no light palettes");
    const broken = ':root[data-palette="x"][data-theme="light"], [data-palette="x"][data-theme="light"] { --hraness-palette-background: #fff; }';
    expect(() => parseDesignKitLightPalettes(broken)).toThrow("palette x");
  });

  test("keeps the Design Kit foil recipe: 115deg, a 14% six-stop reflection, neutral bands", () => {
    expect(FOIL_ANGLE).toBe(115);
    expect(FOIL_REFLECTION).toBe(0.14);
    expect(FOIL_SPECTRUM).toHaveLength(6);
    const foil = socialImageFoil("#1c3161", "#d3d7e4");
    // Every band lies between the ink and the background in lightness.
    for (const [band, stop] of foil.bands) {
      expect(band).toMatch(/^#[0-9a-f]{6}$/iu);
      expect(stop).toBeGreaterThanOrEqual(0);
      expect(stop).toBeLessThanOrEqual(100);
    }
    const svg = socialImageFoilPaint(foil, { height: 40, width: 40, x: 0, y: 0 }, "<rect width='40' height='40'/>");
    expect(svg).toContain('mask="url(#f-mask)"');
    expect(svg.match(/<radialGradient/gu)).toHaveLength(2);
    expect(svg.match(/<linearGradient/gu)).toHaveLength(2);
    expect(svg).toContain(`stop-opacity="${String(FOIL_REFLECTION)}"`);
  });
});
