import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  absoluteWebUrl,
  createSitemap,
  parseOwnedPath,
  serializeJsonLd,
} from "./discovery";

const origin = "https://example.com" as const;
const pathCharacter = fc.constantFrom(
  ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_".split(""),
);
const segment = fc.array(pathCharacter, { minLength: 1, maxLength: 24 })
  .map((characters) => characters.join(""));
const ownedPath = fc.array(segment, { maxLength: 6 })
  .map((segments) => `/${segments.join("/")}`);

describe("web discovery laws", () => {
  test("preserves generated canonical owned paths", () => {
    fc.assert(fc.property(ownedPath, (candidate) => {
      const parsed = parseOwnedPath(candidate);
      expect(candidate).toBe(parsed);
      expect(absoluteWebUrl(origin, parsed)).toBe(`${origin}${candidate}`);
    }));
  });

  test("preserves sitemap order and absolute identity", () => {
    fc.assert(fc.property(
      fc.uniqueArray(ownedPath, { maxLength: 40 }),
      (paths) => {
        const sitemap = createSitemap(
          origin,
          paths.map((path) => ({ path: parseOwnedPath(path) })),
        );
        expect(sitemap.map(({ url }) => url)).toEqual(
          paths.map((path) => `${origin}${path}`),
        );
      },
    ));
  });

  test("serializes arbitrary strings without script-breaking characters", () => {
    fc.assert(fc.property(fc.string(), (value) => {
      const serialized = serializeJsonLd({ value });
      expect(serialized).not.toContain("<");
      expect(serialized).not.toContain(">");
      expect(serialized).not.toContain("&");
      expect(serialized).not.toContain("\u2028");
      expect(serialized).not.toContain("\u2029");
      expect(JSON.parse(serialized)).toEqual({ value });
    }));
  });
});
