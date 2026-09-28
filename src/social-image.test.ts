import { createHash } from "node:crypto";
import { describe, expect, mock, test } from "bun:test";
import fc from "fast-check";
import type { ReactElement } from "react";

type CapturedFont = Readonly<{
  data: ArrayBuffer;
  name: string;
  style?: string;
  weight?: number;
}>;

type CapturedImage = Readonly<{
  element: ReactElement<{ style: Readonly<Record<string, unknown>> }>;
  options: Readonly<{
    fonts?: readonly CapturedFont[];
    height?: number;
    width?: number;
  }>;
}>;

let capturedImage: CapturedImage | undefined;

function requireCapturedImage(): CapturedImage {
  if (capturedImage === undefined) {
    throw new Error("ImageResponse was not constructed");
  }
  return capturedImage;
}

await mock.module("next/og.js", () => ({
  ImageResponse: class ImageResponse extends Response {
    constructor(
      element: CapturedImage["element"],
      options: CapturedImage["options"],
    ) {
      super();
      capturedImage = { element, options };
    }
  },
}));

const {
  createSocialImageCard,
  createSiteSocialImageResponse,
  createSocialImageResponse,
  defineSocialImageSite,
  parseSocialImageIcon,
  plainSocialImageTheme,
  socialImageAlt,
  socialImageContrastRatio,
  socialImageHeadline,
  socialImageLayout,
  socialImageMarks,
  socialImageSiteDetails,
} = await import("./social-image");
const { socialImageGeometry, socialImagePalette } = await import("./social-image-card");

const svgMark = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='10' fill='#2474d4'/></svg>",
)}`;
// A 1 × 1 opaque PNG.
const pngIcon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

type RenderedNode = Readonly<{ props: { children?: unknown; style?: Readonly<Record<string, unknown>> } }>;

function isNode(value: unknown): value is RenderedNode {
  return typeof value === "object" && value !== null && "props" in value;
}

/** Each text block on the card, as its font size and rendered lines. */
function textBlocks(node: unknown, inherited = 32): { lines: string[]; size: number }[] {
  if (Array.isArray(node)) return node.flatMap((child) => textBlocks(child, inherited));
  if (!isNode(node)) return [];
  const size = typeof node.props.style?.fontSize === "number" ? node.props.style.fontSize : inherited;
  const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
  const lines = children.filter(isNode).filter((child) =>
    child.props.style?.whiteSpace === "nowrap" && typeof child.props.children === "string");
  if (lines.length > 0 && lines.length === children.filter(isNode).length) {
    return [{ lines: lines.map((line) => String(line.props.children)), size }];
  }
  if (typeof node.props.children === "string" && node.props.children.trim().length > 0) {
    return [{ lines: [node.props.children], size }];
  }
  return textBlocks(node.props.children, size);
}

const hex = fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 3, maxLength: 3 })
  .map((channels) => `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase());

function renderedText(node: unknown): string[] {
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap(renderedText);
  if (typeof node === "object" && node !== null && "props" in node) {
    const { children } = (node as { props: { children?: unknown } }).props;
    return renderedText(children);
  }
  return [];
}

describe("shared social images", () => {
  test("defaults to the neutral plain-site palette", () => {
    expect(plainSocialImageTheme).toEqual({
      accent: "#2457A6",
      background: "#FFFFFF",
      foreground: "#171717",
      muted: "#666666",
    });
  });

  test("rejects malformed theme overrides before rendering", () => {
    expect(() => createSocialImageResponse({
      description: "A deterministic preview",
      domain: "example.com",
      theme: { background: "white" },
      title: "Plain content",
    })).toThrow("background must be a six-digit hex color");
  });

  test("renders proportional copy with the bundled Nebula Sans cuts", () => {
    capturedImage = undefined;
    createSocialImageResponse({
      description: "A deterministic preview",
      domain: "example.com",
      title: "Plain content",
    });
    const image = requireCapturedImage();

    expect(image.element.props.style.fontFamily).toBe("Nebula Sans");
    expect(image.options).toMatchObject({
      height: 630,
      width: 1200,
    });
    expect(image.options.fonts?.map(({ name, style, weight }) => ({
      name,
      style,
      weight,
    }))).toEqual([
      {
        name: "Nebula Sans",
        style: "normal",
        weight: 400,
      },
      {
        name: "Nebula Sans",
        style: "normal",
        weight: 700,
      },
    ]);
    // Design Kit v0.2.1 and v0.5.0 publish these same official OTF payloads.
    // Hash the buffers actually passed to ImageResponse, not a package label.
    expect(image.options.fonts?.map(({ data }) => ({
      bytes: data.byteLength,
      sha256: createHash("sha256").update(new Uint8Array(data)).digest("hex"),
    }))).toEqual([
      {
        bytes: 140_008,
        sha256: "4cc650f856591af1affc4add4f50e260c8239a2542bafe77909b78006023f091",
      },
      {
        bytes: 145_348,
        sha256: "91617d3e2281e8213f64f6bf359f387022d3149b35000b38365c32130a25bfa8",
      },
    ]);
  });

  test("drops a trailing brand segment from the default headline", () => {
    expect(socialImageHeadline({
      domain: "example.com",
      eyebrow: "Example",
      title: "Pricing | Example",
    })).toBe("Pricing");
    expect(socialImageHeadline({
      domain: "example.com",
      title: "Pricing · example.com",
    })).toBe("Pricing");
    expect(socialImageHeadline({
      domain: "example.com",
      title: "Pricing - EXAMPLE",
    })).toBe("Pricing");
  });

  test("keeps title words that are not the brand", () => {
    expect(socialImageHeadline({
      domain: "example.com",
      eyebrow: "Example",
      title: "Import - Export guide",
    })).toBe("Import - Export guide");
    expect(socialImageHeadline({
      domain: "example.com",
      eyebrow: "Example",
      title: "Example",
    })).toBe("Example");
    expect(socialImageHeadline({
      domain: "example.com",
      title: "Pricing | Plans | Example",
    })).toBe("Pricing | Plans");
  });

  test("renders an explicit headline instead of the title", () => {
    const card = createSocialImageCard({
      description: "Monthly and annual plans.",
      domain: "example.com",
      headline: "Plans for teams",
      title: "Pricing and plans for teams | Example",
    });
    const text = renderedText(card.element).join("\n");

    expect(text).toContain("Plans for teams");
    expect(text).not.toContain("Pricing and plans");
  });

  test("renders the page name without the brand suffix by default", () => {
    const card = createSocialImageCard({
      description: "Monthly and annual plans.",
      domain: "example.com",
      eyebrow: "Example",
      title: "Pricing | Example",
    });
    const text = renderedText(card.element);

    expect(text).toContain("Pricing");
    expect(text).not.toContain("Pricing | Example");
  });

  test("derives a headline that is a prefix of the title and drops only the brand", () => {
    const word = fc.array(
      fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")),
      { minLength: 1, maxLength: 10 },
    ).map((letters) => letters.join(""));
    const text = fc.array(
      fc.oneof(word, fc.constantFrom("|", "·", "-", "–")),
      { minLength: 1, maxLength: 8 },
    ).map((words) => words.join(" "));
    const separator = fc.constantFrom(" | ", " · ", " — ", " – ", " - ");

    fc.assert(fc.property(text, word, separator, (title, brand, between) => {
      const details = { domain: `${brand}.com`, eyebrow: brand };
      const plain = socialImageHeadline({ ...details, title });
      expect(title.startsWith(plain)).toBe(true);
      expect(plain.length).toBeGreaterThan(0);

      const branded = socialImageHeadline({ ...details, title: `${title}${between}${brand}` });
      expect(`${title}${between}${brand}`.startsWith(branded)).toBe(true);
      expect(branded.length).toBeGreaterThanOrEqual(title.trimEnd().length);
    }));
  });

  test("accepts only SVG and PNG data URLs as icons", () => {
    expect(parseSocialImageIcon({ kind: "mark", src: svgMark })).toEqual({ kind: "mark", src: svgMark });
    expect(parseSocialImageIcon({ kind: "app", src: pngIcon })).toEqual({ kind: "app", src: pngIcon });
    for (const src of [
      "https://example.com/icon.svg",
      "/icon.png",
      "icon.svg",
      "data:image/jpeg;base64,/9j/4AAQ",
      "data:image/png,not-base64",
      "data:image/png;base64,AAAA",
      "data:image/svg+xml,",
      "data:text/html,<svg></svg>",
    ]) {
      expect(() => parseSocialImageIcon({ kind: "mark", src })).toThrow(/icon\.src/u);
    }
    expect(() => parseSocialImageIcon({ kind: "logo", src: svgMark })).toThrow(/icon\.kind/u);
    expect(() => parseSocialImageIcon(svgMark)).toThrow(/icon must be an object/u);
    expect(() => createSocialImageCard({
      description: "A card",
      domain: "example.com",
      icon: { kind: "mark", src: "https://example.com/icon.svg" },
      title: "Example",
    })).toThrow(/data: URL/u);
  });

  test("rejects every icon source that is not a data URL", () => {
    fc.assert(fc.property(
      fc.string().filter((value) => !value.startsWith("data:")),
      fc.constantFrom("app" as const, "mark" as const),
      (src, kind) => {
        expect(() => parseSocialImageIcon({ kind, src })).toThrow();
      },
    ));
    fc.assert(fc.property(fc.webUrl(), (src) => {
      expect(() => parseSocialImageIcon({ kind: "app", src })).toThrow(/data: URL/u);
    }));
  });

  test("defaults to the page layout only when the headline differs from the title", () => {
    expect(socialImageLayout({ title: "Example" })).toBe("product");
    expect(socialImageLayout({ headline: "Example", title: "Example" })).toBe("product");
    expect(socialImageLayout({ headline: "Plans", title: "Example" })).toBe("page");
    expect(socialImageLayout({ headline: "Plans", layout: "product", title: "Example" })).toBe("product");
    expect(socialImageLayout({ layout: "page", title: "Example" })).toBe("page");
    expect(() => socialImageLayout({ layout: "hero" as never, title: "Example" })).toThrow(/layout/u);

    fc.assert(fc.property(fc.string(), fc.option(fc.string(), { nil: undefined }), (title, headline) => {
      const expected = headline !== undefined && headline !== title ? "page" : "product";
      expect(socialImageLayout(headline === undefined ? { title } : { headline, title })).toBe(expected);
    }));
  });

  const word = fc.stringMatching(/^[A-Za-z][a-z]{0,11}$/u);
  const sentence = fc.array(word, { minLength: 1, maxLength: 28 }).map((words) => words.join(" "));
  const icon = fc.constantFrom(
    undefined,
    { kind: "mark" as const, src: svgMark },
    { kind: "app" as const, src: pngIcon },
  );

  test("never renders text under 30 pixels and keeps the caller's case", () => {
    fc.assert(fc.property(
      sentence,
      sentence,
      fc.option(sentence, { nil: undefined }),
      fc.constantFrom("page" as const, "product" as const),
      icon,
      (title, description, eyebrow, layout, chosen) => {
        const card = createSocialImageCard({
          description,
          domain: "example.com",
          ...(eyebrow === undefined ? {} : { eyebrow }),
          ...(chosen === undefined ? {} : { icon: chosen }),
          headline: title,
          layout,
          title: "Example",
        });
        const blocks = textBlocks(card.element);
        expect(blocks.length).toBeGreaterThan(0);
        // The tile shows the first letter of the name when there is no icon.
        const source = new Set([title, description, eyebrow ?? "", "E", "Example", "example.com"]
          .join(" ").split(" "));
        for (const block of blocks) {
          expect(block.size).toBeGreaterThanOrEqual(30);
          for (const line of block.lines) {
            for (const token of line.split(" ")) {
              const bare = token.replace(/…$/u, "");
              if (bare.length === 0 || token.endsWith("…")) continue;
              expect(source.has(bare)).toBe(true);
            }
          }
        }
      },
    ), { numRuns: 60 });
  });

  test("keeps lowercase names lowercase", () => {
    const card = createSocialImageCard({
      description: "One bounded turn across your own accounts.",
      domain: "qzt.example",
      eyebrow: "qzt / Quartz",
      title: "qzt",
    });
    const text = renderedText(card.element);
    expect(text).toContain("qzt");
    expect(text).not.toContain("QZT");
    expect(text).not.toContain("Qzt");
  });

  test("binds short words to the next word instead of ending a line", () => {
    const card = createSocialImageCard({
      description: "A walk through the vault, the preview, and the cut, with the numbers from a real session.",
      domain: "example.com",
      headline: "How Example compacts a 2 million token work session without losing a byte",
      title: "Example",
    });
    const blocks = textBlocks(card.element).filter((block) => block.lines.length > 1);
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      for (const line of block.lines.slice(0, -1)) {
        const last = line.split(" ").at(-1) ?? "";
        expect(/^(?:[A-Za-z]{1,3}|\d+)$/u.test(last)).toBe(false);
      }
    }

    // At most one short word before each longer word, so every bound pair fits a line.
    const phrase = fc.tuple(
      fc.option(fc.stringMatching(/^[a-z]{1,3}$/u), { nil: undefined }),
      fc.stringMatching(/^[A-Za-z][a-z]{3,8}$/u),
    ).map(([short, long]) => (short === undefined ? long : `${short} ${long}`));
    const bindable = fc.array(phrase, { minLength: 1, maxLength: 12 }).map((parts) => parts.join(" "));
    fc.assert(fc.property(bindable, bindable, (headline, description) => {
      const card = createSocialImageCard({ description, domain: "example.com", headline, title: "Example" });
      for (const block of textBlocks(card.element)) {
        for (const line of block.lines.slice(0, -1)) {
          const last = line.split(" ").at(-1) ?? "";
          expect(/^[a-z]{1,3}$/u.test(last)).toBe(false);
        }
      }
    }), { numRuns: 40 });
  });

  test("rejects SVG icons that could load anything outside themselves", () => {
    const svg = (body: string) => `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>${body}</svg>`,
    )}`;
    for (const body of [
      "<image href='http://example.com/a.png' width='32' height='32'/>",
      "<image xlink:href='https://example.com/a.png' width='32' height='32'/>",
      "<rect width='32' height='32' fill='url(http://example.com/p.svg#g)'/>",
      "<style>@import \"http://example.com/a.css\";</style>",
      "<rect width='32' height='32' style='fill: url(//example.com/p)'/>",
      `<image href='data:image/svg+xml,${encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg"><image href="http://example.com/a.png"/></svg>',
      )}'/>`,
    ]) {
      expect(() => parseSocialImageIcon({ kind: "mark", src: svg(body) })).toThrow(/icon\.src/u);
    }
    // Local fragment references and embedded data stay allowed.
    expect(() => parseSocialImageIcon({
      kind: "mark",
      src: svg("<defs><linearGradient id='g'/></defs><rect width='32' height='32' fill='url(#g)'/>"),
    })).not.toThrow();
    const base64 = `data:image/svg+xml;base64,${btoa(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='10'/></svg>",
    )}`;
    expect(parseSocialImageIcon({ kind: "mark", src: base64 })).toEqual({ kind: "mark", src: base64 });
    const card = createSocialImageCard({
      description: "A card",
      domain: "example.com",
      icon: { kind: "mark", src: base64 },
      title: "Example",
    });
    expect(card.width).toBe(1200);
    expect(() => parseSocialImageIcon({
      kind: "mark",
      src: `data:image/svg+xml;base64,${btoa("<svg><image href='https://example.com/x.png'/></svg>")}`,
    })).toThrow(/external/u);
  });

  test("renders a legacy mark, or the first letter, when there is no icon", () => {
    const legacy = createSocialImageCard({
      description: "A card",
      domain: "example.com",
      mark: socialImageMarks.splitSquare,
      title: "Example",
    });
    expect(JSON.stringify(legacy.element)).toContain(socialImageMarks.splitSquare);
    expect(renderedText(legacy.element)).not.toContain("E");

    const node = createSocialImageCard({
      description: "A card",
      domain: "example.com",
      mark: { props: { "data-mark": "custom", viewBox: "0 0 10 10" }, type: "svg" } as unknown as ReactElement,
      title: "Example",
    });
    expect(JSON.stringify(node.element)).toContain("custom");

    fc.assert(fc.property(word, (title) => {
      const card = createSocialImageCard({ description: "A card", domain: "example.com", title });
      expect(renderedText(card.element)).toContain(title.slice(0, 1));
    }), { numRuns: 30 });
  });

  test("never lets the page ghost touch a text line", () => {
    const intersects = (
      a: Readonly<{ height: number; width: number; x: number; y: number }>,
      b: Readonly<{ height: number; width: number; x: number; y: number }>,
      gap: number,
    ) => a.x < b.x + b.width + gap && b.x < a.x + a.width + gap
      && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;
    let ghosts = 0;
    fc.assert(fc.property(
      sentence,
      sentence,
      fc.option(sentence, { nil: undefined }),
      icon,
      (headline, description, eyebrow, chosen) => {
        const geometry = socialImageGeometry({
          description,
          domain: "example.com",
          ...(eyebrow === undefined ? {} : { eyebrow }),
          ...(chosen === undefined ? {} : { icon: chosen }),
          headline,
          layout: "page",
          title: "Example",
        });
        expect(geometry.textBoxes.length).toBeGreaterThan(0);
        if (geometry.ghost === undefined) return;
        ghosts += 1;
        for (const box of geometry.textBoxes) {
          expect(intersects(geometry.ghost, box, 24)).toBe(false);
        }
      },
    ), { numRuns: 80 });
    expect(ghosts).toBeGreaterThan(0);
  });

  test("meets the contrast thresholds for any theme", () => {
    fc.assert(fc.property(hex, hex, hex, hex, (accent, background, foreground, muted) => {
      const palette = socialImagePalette({ accent, background, foreground, muted });
      for (const surface of palette.surfaces) {
        expect(socialImageContrastRatio(palette.foreground, surface)).toBeGreaterThanOrEqual(7);
        expect(socialImageContrastRatio(palette.muted, surface)).toBeGreaterThanOrEqual(palette.dark ? 7 : 4.5);
        expect(socialImageContrastRatio(palette.primaryText, surface)).toBeGreaterThanOrEqual(4.5);
      }
      const tile = [palette.tileTop, palette.tileBottom].map((stop) => socialImageContrastRatio(palette.glyph, stop));
      if (palette.glyph === "#FFFFFF") {
        expect(Math.max(...tile)).toBeGreaterThanOrEqual(3);
      } else {
        expect(Math.min(...tile)).toBeGreaterThanOrEqual(4.5);
      }
    }), { numRuns: 300 });
  });
});


describe("site social image template", () => {
  const site = defineSocialImageSite({
    description: "Compacts long agent sessions into smaller copies",
    domain: "example.com",
    icon: { kind: "mark", src: svgMark },
    name: "Example",
    theme: { accent: "#2474D4" },
  });

  test("renders the home card from the site alone", () => {
    expect(socialImageSiteDetails(site)).toEqual({
      description: "Compacts long agent sessions into smaller copies",
      domain: "example.com",
      icon: { kind: "mark", src: svgMark },
      theme: { accent: "#2474D4" },
      title: "Example",
    });
    expect(socialImageLayout(socialImageSiteDetails(site))).toBe("product");
    expect(socialImageAlt(site)).toBe("Example: Compacts long agent sessions into smaller copies");
  });

  test("layers page copy over the site and switches to the page layout", () => {
    const page = { description: "A walk through the vault", eyebrow: "Blog", headline: "How compaction works" };
    const details = socialImageSiteDetails(site, page);
    expect(details).toMatchObject({ ...page, domain: "example.com", title: "Example" });
    expect(socialImageLayout(details)).toBe("page");
    expect(socialImageAlt(site, page)).toBe("How compaction works, from Example");
    capturedImage = undefined;
    createSiteSocialImageResponse(site, page);
    expect(requireCapturedImage().options).toMatchObject({ height: 630, width: 1200 });
  });

  test("rejects an incomplete site or a remote icon when it is declared", () => {
    expect(() => defineSocialImageSite({ ...site, name: " " })).toThrow("name must be non-empty text");
    expect(() => defineSocialImageSite({
      ...site,
      icon: { kind: "app", src: "https://example.com/icon.png" },
    })).toThrow("icon.src");
  });

  test("keeps site identity for any page copy", () => {
    fc.assert(fc.property(
      fc.record({ description: fc.option(fc.string({ minLength: 1 }), { nil: undefined }), headline: fc.option(fc.string({ minLength: 1 }), { nil: undefined }) }),
      (page) => {
        const clean = Object.fromEntries(Object.entries(page).filter(([, value]) => value !== undefined));
        const details = socialImageSiteDetails(site, clean);
        expect(details.title).toBe(site.name);
        expect(details.domain).toBe(site.domain);
        expect(details.icon).toEqual(site.icon);
        expect(details.description).toBe(page.description ?? site.description);
      },
    ));
  });
});
