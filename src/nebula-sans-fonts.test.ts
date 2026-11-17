import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { nebulaSansSocialFonts } from "./fonts/nebula-sans/social-fonts.generated.js";

const fontDirectory = join(import.meta.dir, "fonts", "nebula-sans");
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const provenance = readFileSync(join(fontDirectory, "PROVENANCE.md"), "utf8");

describe("vendored Nebula Sans social fonts", () => {
  test("the font files and licence match the recorded upstream hashes", () => {
    for (const file of ["NebulaSans-Book.otf", "NebulaSans-Bold.otf", "LICENSE.txt"]) {
      const digest = sha256(readFileSync(join(fontDirectory, file)));
      expect(provenance).toContain(`| \`${file}\` | \`${digest}\` |`);
    }
    expect(readFileSync(join(fontDirectory, "LICENSE.txt"), "utf8")).toContain("SIL OPEN FONT LICENSE Version 1.1");
  });

  test("the embedded payloads decode to the vendored OTF files", () => {
    const fonts = nebulaSansSocialFonts();
    expect(fonts.map(({ name, style, weight }) => ({ name, style, weight }))).toEqual([
      { name: "Nebula Sans", style: "normal", weight: 400 },
      { name: "Nebula Sans", style: "normal", weight: 700 },
    ]);
    const [book, bold] = fonts;
    expect(sha256(new Uint8Array(book?.data ?? new ArrayBuffer(0))))
      .toBe(sha256(readFileSync(join(fontDirectory, "NebulaSans-Book.otf"))));
    expect(sha256(new Uint8Array(bold?.data ?? new ArrayBuffer(0))))
      .toBe(sha256(readFileSync(join(fontDirectory, "NebulaSans-Bold.otf"))));
  });
});
