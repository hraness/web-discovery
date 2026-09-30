import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
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
  socialImageEyebrow,
  socialImageFit,
  socialImageHeadline,
  socialImageIconShape,
  socialImageLayout,
  socialImageLookAlikes,
  socialImageMarks,
  socialImagePaletteDistance,
  socialImageSiteDetails,
  socialImageSitePalette,
  socialImageTypography,
  SOCIAL_IMAGE_MIN_PALETTE_DISTANCE,
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
    // Since v0.12 one exception: a two-word first line may end on a short word
    // that is not an article, so "Wordcell vs / Supermemory" beats a lone
    // first word.
    const articles = new Set(["a", "an", "the"]);
    fc.assert(fc.property(bindable, bindable, (headline, description) => {
      const card = createSocialImageCard({ description, domain: "example.com", headline, title: "Example" });
      for (const block of textBlocks(card.element)) {
        for (const [index, line] of block.lines.slice(0, -1).entries()) {
          const words = line.split(" ");
          const last = words.at(-1) ?? "";
          if (!/^[a-z]{1,3}$/u.test(last)) continue;
          expect(index === 0 && words.length === 2 && !articles.has(last)).toBe(true);
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

  test("renders a legacy mark, or the name alone, when there is no brand mark", () => {
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

    // With no mark the header shows the wordmark alone, as a site header does.
    fc.assert(fc.property(word, (title) => {
      const card = createSocialImageCard({ description: "A card", domain: "example.com", title });
      expect(renderedText(card.element)).toContain(title);
      expect(JSON.stringify(card.element)).not.toContain("data:image");
    }), { numRuns: 30 });
  });

  test("draws no page ghost, and no text line touches another", () => {
    const intersects = (
      a: Readonly<{ height: number; width: number; x: number; y: number }>,
      b: Readonly<{ height: number; width: number; x: number; y: number }>,
    ) => a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;
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
        expect(geometry.ghost).toBeUndefined();
        expect(geometry.textBoxes.length).toBeGreaterThan(0);
        for (const [index, box] of geometry.textBoxes.entries()) {
          expect(box.x + box.width).toBeLessThanOrEqual(1200);
          expect(box.y + box.height).toBeLessThanOrEqual(630);
          for (const other of geometry.textBoxes.slice(index + 1)) expect(intersects(box, other)).toBe(false);
        }
      },
    ), { numRuns: 80 });
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
      tagline: "Compacts long agent sessions into smaller copies",
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
        // A page card never borrows the site tagline; the product card keeps it.
        const pageCard = page.headline !== undefined && page.headline !== site.name;
        expect(details.description).toBe(page.description ?? (pageCard ? "" : site.description));
      },
    ));
  });
});


/** Encodes an RGBA PNG whose pixel at (x, y) is opaque when `paint` says so. */
function pngDataUrl(size: number, paint: (x: number, y: number) => boolean, rgb = [0xB4, 0x3A, 0x1D]): string {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Uint8Array) => {
    let c = 0xFFFFFFFF;
    for (const byte of bytes) c = (crcTable[(c ^ byte) & 0xFF] ?? 0) ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const chunk = (type: string, data: Uint8Array) => {
    const body = new Uint8Array(4 + data.length);
    body.set(new TextEncoder().encode(type));
    body.set(data, 4);
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    out.set(body, 4);
    view.setUint32(8 + data.length, crc(body));
    return out;
  };
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, size);
  headerView.setUint32(4, size);
  header.set([8, 6, 0, 0, 0], 8);
  const raw = new Uint8Array(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!paint(x, y)) continue;
      raw.set([...rgb, 255], y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk("IHDR", header),
    chunk("IDAT", new Uint8Array(deflateSync(raw))),
    chunk("IEND", new Uint8Array()),
  ];
  return `data:image/png;base64,${Buffer.concat(parts).toString("base64")}`;
}

const svgUrl = (body: string, viewBox = "0 0 24 24") => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'>${body}</svg>`,
)}`;

describe("v0.11 card copy and art rules", () => {
  const base = { domain: "example.com", title: "Example" } as const;
  const pageCopy = (headline: string, description: string, eyebrow?: string) => ({
    ...base,
    description,
    ...(eyebrow === undefined ? {} : { eyebrow }),
    headline,
    layout: "page" as const,
  });
  const bindingWords = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "is", "of", "on", "or", "the", "to", "with"]);
  const lastWord = (lines: readonly string[]) => (lines.at(-1) ?? "").replace(/[^A-Za-z ]/gu, "").trim().split(" ").at(-1)?.toLowerCase() ?? "";

  test("shortens a long description at a sentence or clause, never mid-sentence", () => {
    const fit = socialImageFit(pageCopy(
      "Query the derived graph",
      "Run a derived-graph query against the knowledge base to find every decision that touches a file, and the reviews, owners, and tests that depend on it across every repository.",
    ));
    expect(fit.description?.cut).not.toBe("ellipsis");
    expect(fit.description?.lines.join(" ")).toBe("Run a derived-graph query against the knowledge base to find every decision that touches a file.");
    expect(fit.issues.some((issue) => issue.includes("shortened"))).toBe(true);

    // A comma inside a list is not a clause end.
    const list = socialImageFit(pageCopy(
      "Benchmark results",
      "Every memory benchmark result Oh has published, with the score, setup, and main limit for each study and a link to its full record.",
    ));
    expect(list.description?.lines.join(" ")).toBe("Every memory benchmark result Oh has published.");

    const word = fc.stringMatching(/^[a-z]{2,9}$/u);
    const clause = fc.array(word, { minLength: 3, maxLength: 9 }).map((words) => words.join(" "));
    const text = fc.array(clause, { minLength: 1, maxLength: 6 }).map((clauses) => `${clauses.map((part, index) =>
      index === 0 ? `${part.slice(0, 1).toUpperCase()}${part.slice(1)}` : part).join(", ")}.`);
    fc.assert(fc.property(text, (description) => {
      const result = socialImageFit(pageCopy("A walk through the vault", description));
      const shown = result.description?.lines ?? [];
      if (result.description?.cut === "ellipsis") return;
      expect(shown.join(" ")).not.toContain("…");
      // Copy shown whole is the author's own ending; only a cut is checked.
      if (result.description?.cut !== "none") expect(bindingWords.has(lastWord(shown))).toBe(false);
      expect(shown.join(" ").endsWith(".")).toBe(true);
    }), { numRuns: 60 });
  });

  test("sets the home tagline as the headline, and keeps a hero description at the standard size", () => {
    const long = "Oh is open-source memory for agents that stores each fact with its sources and every change in a history you can replay.";
    const tagline = socialImageFit({ ...base, description: "Agent memory that shows its work.", title: "Oh" });
    expect(tagline.layout).toBe("product");
    expect(tagline.description).toBeUndefined();
    expect(tagline.headline.lines.join(" ")).toBe("Agent memory that shows its work.");
    expect(tagline.issues).toEqual([]);
    const wordy = socialImageFit({ ...base, description: long, title: "Oh" });
    expect(wordy.findings.map(({ code }) => code)).toContain("home-headline-three-lines");
    // A home card with the site's hero headline keeps the tagline beneath it.
    const fit = socialImageFit({ ...base, description: long, headline: "Agent memory that shows its work.", layout: "product", title: "Oh" });
    expect(fit.layout).toBe("product");
    expect(fit.headline.lines.join(" ")).toBe("Agent memory that shows its work.");
    expect(fit.description?.lines.length).toBe(2);
    expect(fit.description?.size).toBeGreaterThanOrEqual(30);
    // The whole description fits in two lines under a one-line hero headline.
    expect(fit.description?.cut).toBe("none");

    const word = fc.stringMatching(/^[a-z]{3,9}$/u);
    const sentence = fc.array(word, { minLength: 3, maxLength: 40 }).map((words) => `${words.join(" ")}.`);
    fc.assert(fc.property(sentence, (description) => {
      const product = socialImageFit({ ...base, description, headline: "Example hero", layout: "product", title: "Example" });
      expect(product.description?.lines.length ?? 0).toBeLessThanOrEqual(2);
    }), { numRuns: 40 });
  });

  test("cuts before a dash and never leaves a one-word fragment after one", () => {
    const fit = socialImageFit(pageCopy("A guide", "Guía en español 🇵🇷 con fuentes oficiales — 日本語 too 🚀"));
    expect(fit.description?.lines.join(" ")).toBe("Guía en español con fuentes oficiales");
  });

  test("breaks a headline elsewhere rather than strand one word after a name", () => {
    const fit = socialImageFit(pageCopy("Ley 60 en Puerto Rico guide", ""));
    expect(fit.headline.lines).toEqual(["Ley 60", "en Puerto Rico guide"]);
    for (const line of fit.headline.lines) expect(line.includes(" ")).toBe(true);
  });

  test("keeps the ellipsis as a last resort and reports it", () => {
    const fit = socialImageFit(pageCopy("A walk through the vault", "Oneverylongrunonsentencewithoutanybreak ".repeat(12).trim()));
    expect(fit.description?.cut).toBe("ellipsis");
    expect(fit.issues).toContain("description does not fit and was clamped with an ellipsis");
  });

  test("throws in strict mode when copy does not fit as written", () => {
    const long = pageCopy("Query the derived graph", "Run a derived-graph query against the knowledge base to find every decision that touches a file, and the reviews that depend on it everywhere.");
    expect(() => createSocialImageCard({ ...long, strict: true })).toThrow("does not fit as written");
    expect(() => createSocialImageCard({ ...pageCopy("Query the derived graph", "Find every decision behind a file."), strict: true })).not.toThrow();
  });

  test("leaves a page card without a description empty, but keeps the tagline on the home card", () => {
    const site = defineSocialImageSite({ description: "Compacts long agent sessions", domain: "example.com", name: "Example" });
    expect(socialImageSiteDetails(site, { headline: "Set up Example" }).description).toBe("");
    expect(socialImageSiteDetails(site).description).toBe("Compacts long agent sessions");
    expect(socialImageFit(socialImageSiteDetails(site, { headline: "Set up Example" })).description).toBeUndefined();
    const text = renderedText(createSocialImageCard(socialImageSiteDetails(site, { headline: "Set up Example" })).element).join(" ");
    expect(text).not.toContain("Compacts long agent sessions");
    expect(socialImageFit(socialImageSiteDetails(site)).headline.lines.join(" ")).toBe("Compacts long agent sessions");
  });

  test("drops an eyebrow that the headline already opens with", () => {
    expect(socialImageFit(pageCopy("Introducing Gobstopper", "", "Introducing")).eyebrow).toBeUndefined();
    expect(socialImageFit(pageCopy("introducing gobstopper", "", "INTRODUCING")).eyebrow).toBeUndefined();
    expect(socialImageFit(pageCopy("Documentation for the vault", "", "Docs")).eyebrow).toBeUndefined();
    expect(socialImageFit(pageCopy("Benchmark results", "", "Benchmarks")).eyebrow).toBeUndefined();
    // Word boundary: "Gob" does not repeat "Gobstopper".
    expect(socialImageFit(pageCopy("Gobstopper internals", "", "Gob")).eyebrow).toBe("Gob");
    expect(socialImageFit(pageCopy("How compaction works", "", "Blog")).eyebrow).toBe("Blog");
    const word = fc.stringMatching(/^[A-Z][a-z]{3,10}$/u);
    fc.assert(fc.property(word, word, (first, rest) => {
      expect(socialImageFit(pageCopy(`${first} ${rest}`, "", first.toLowerCase())).eyebrow).toBeUndefined();
    }), { numRuns: 40 });
  });

  test("sets one- and two-line page headlines at one size and flags the rest", () => {
    const word = fc.stringMatching(/^[A-Za-z][a-z]{2,10}$/u);
    const headline = fc.array(word, { minLength: 1, maxLength: 12 }).map((words) => words.join(" "));
    fc.assert(fc.property(headline, (text) => {
      const fit = socialImageFit(pageCopy(text, ""));
      if (!fit.headline.reduced) expect(fit.headline.size).toBe(80);
      expect(fit.headline.lines.length <= 2 || fit.headline.reduced).toBe(true);
      expect(fit.headline.threeLine).toBe(fit.headline.lines.length === 3);
      if (fit.headline.threeLine && !fit.headline.truncated) {
        expect(fit.issues.some((issue) => issue.includes("three lines"))).toBe(true);
      }
    }), { numRuns: 30 });
    // No lone word before a longer line when the headline fits on one line.
    expect(socialImageFit(pageCopy("Query the derived graph", "")).headline.lines).toEqual(["Query the derived graph"]);
    const long = socialImageFit(pageCopy("How the SlopTrade governor refuses an order that would breach the drawdown floor during a volatile open", ""));
    expect(long.headline.threeLine).toBe(true);
    expect(long.headline.truncated).toBe(false);
    expect(long.headline.size).toBeGreaterThanOrEqual(30);
  });

  test("draws the header band from the site palette, and ignores the legacy wash", () => {
    const paper = { background: "#FFF8E7", foreground: "#1F1B16", muted: "#5F564B" };
    const red = socialImagePalette({ ...paper, accent: "#B43A1D" });
    const blue = socialImagePalette({ ...paper, accent: "#2457A6" });
    expect(red.header).toBe(blue.header);
    expect(red.background).toBe(blue.background);
    expect(socialImagePalette({ ...paper, accent: "#2457A6", wash: "#176B5B" }).header).toBe(blue.header);
    expect(socialImagePalette({ ...paper, headerBackground: "#EEE4CC" }).header).toBe("#EEE4CC");
    // A Design Kit palette fills the colors a theme leaves unset.
    const tokyo = socialImagePalette({}, undefined, "tokyo-night");
    expect(tokyo.background.toLowerCase()).toBe("#e1e2e7");
    // The header band is a slightly deeper step of the same tint.
    expect(tokyo.header).not.toBe(tokyo.background);
    expect(socialImageContrastRatio(tokyo.foreground, tokyo.header)).toBeLessThan(socialImageContrastRatio(tokyo.foreground, tokyo.background));
    expect(tokyo.headerLine).not.toBe(tokyo.header);
    expect(socialImagePalette({ background: "#FFFFFF" }, undefined, "tokyo-night").background).toBe("#FFFFFF");
    fc.assert(fc.property(hex, hex, hex, hex, hex, (accent, background, foreground, muted, wash) => {
      const palette = socialImagePalette({ accent, background, foreground, muted, wash });
      for (const surface of palette.surfaces) {
        expect(socialImageContrastRatio(palette.foreground, surface)).toBeGreaterThanOrEqual(7);
        expect(socialImageContrastRatio(palette.primaryText, surface)).toBeGreaterThanOrEqual(4.5);
      }
    }), { numRuns: 200 });
  });

  test("measures how app art sits in its tile", () => {
    const square = pngDataUrl(32, () => true);
    const disc = pngDataUrl(32, (x, y) => (x - 15.5) ** 2 + (y - 15.5) ** 2 <= 15.5 ** 2);
    const ring = pngDataUrl(32, (x, y) => {
      const distance = Math.hypot(x - 15.5, y - 15.5);
      return distance <= 15 && distance >= 11;
    });
    expect(socialImageIconShape({ kind: "app", src: square })).toBe("square");
    expect(socialImageIconShape({ kind: "app", src: disc })).toBe("solid");
    expect(socialImageIconShape({ kind: "app", src: ring })).toBe("open");
    expect(socialImageIconShape({ kind: "app", src: svgUrl("<circle cx='12' cy='12' r='12' fill='#b43a1d'/><circle cx='8' cy='13' r='3' fill='#fff'/>") })).toBe("solid");
    expect(socialImageIconShape({ kind: "app", src: svgUrl("<rect width='24' height='24' fill='#2474d4'/>") })).toBe("square");
    expect(socialImageIconShape({ kind: "app", src: svgUrl("<circle cx='12' cy='12' r='9' fill='none' stroke='#000'/>") })).toBe("open");
    expect(socialImageIconShape({ kind: "mark", src: svgMark })).toBe("open");
  });

  test("draws the brand mark in baked foil at header size, and a legacy icon as a monochrome mark", () => {
    const imgs = (node: unknown): { height: number; src: string; width: number }[] => {
      if (Array.isArray(node)) return node.flatMap(imgs);
      if (!isNode(node)) return [];
      const props = node.props as { children?: unknown; height?: number; src?: string; width?: number };
      const own = typeof props.src === "string" && typeof props.width === "number" && typeof props.height === "number"
        ? [{ height: props.height, src: props.src, width: props.width }]
        : [];
      return [...own, ...imgs(props.children)];
    };
    const decode = (src: string) => src.startsWith("data:image/svg+xml;base64,")
      ? atob(src.slice("data:image/svg+xml;base64,".length))
      : decodeURIComponent(src.slice(src.indexOf(",") + 1));
    const branded = createSocialImageCard({ ...base, brandMark: "<svg viewBox='0 0 24 24'><circle cx='12' cy='12' r='10'/></svg>", description: "Memory for agents" });
    const [mark] = imgs(branded.element);
    expect(mark).toBeDefined();
    expect(Math.max(mark?.width ?? 0, mark?.height ?? 0)).toBeGreaterThanOrEqual(44);
    expect(Math.max(mark?.width ?? 0, mark?.height ?? 0)).toBeLessThanOrEqual(64);
    const svg = decode(mark?.src ?? "");
    expect(svg).toContain("<mask");
    expect(svg).toContain("linearGradient");
    expect(svg).toContain("radialGradient");
    // A legacy app icon still builds; it is drawn in the header, not as a tile.
    const disc = svgUrl("<circle cx='12' cy='12' r='12' fill='#b43a1d'/>");
    const legacy = createSocialImageCard({ ...base, description: "Memory for agents", icon: { kind: "app", src: disc } });
    expect(imgs(legacy.element).every((image) => Math.max(image.width, image.height) <= 64)).toBe(true);
    const marked = createSocialImageCard({ ...base, description: "Memory for agents", icon: { kind: "mark", src: svgMark } });
    expect(imgs(marked.element).length).toBeGreaterThan(0);
  });

  test("drops emoji and characters the fonts cannot draw, deterministically", () => {
    const details = pageCopy("Ley 60 en Puerto Rico 🌴 税金 guide", "Guía en español 🇵🇷 con fuentes oficiales 🚀.", "Guía ✨");
    const first = socialImageFit(details);
    expect(first.headline.lines.join(" ")).toBe("Ley 60 en Puerto Rico guide");
    expect(first.eyebrow).toBe("Guía");
    expect(first.description?.lines.join(" ")).toBe("Guía en español con fuentes oficiales.");
    expect(first.removed.map((removal) => removal.reason)).toEqual(["unsupported", "unsupported", "unsupported"]);
    expect(socialImageFit(details)).toEqual(first);
    const fonts = createSocialImageCard(details).fonts;
    const drawable = fc.string({ unit: "binary", maxLength: 40 });
    fc.assert(fc.property(drawable, (headline) => {
      const card = createSocialImageCard({ ...pageCopy(`Guide ${headline}`, "")});
      const text = renderedText(card.element).join("");
      for (const character of text) {
        const code = character.codePointAt(0) ?? 0;
        if (code <= 0x20) continue;
        expect(fonts.length).toBeGreaterThan(0);
        expect(/\p{Extended_Pictographic}|\p{Script=Han}/u.test(character)).toBe(false);
      }
    }), { numRuns: 60 });
  });

  test("strips bracketed placeholders and treats a placeholder-only field as empty", () => {
    const fit = socialImageFit(pageCopy("[DRAFT] Report pipeline internals", "[TODO] Short description of the report pipeline.", "[WIP]"));
    expect(fit.headline.lines.join(" ")).toBe("Report pipeline internals");
    expect(fit.description?.lines.join(" ")).toBe("Short description of the report pipeline.");
    expect(fit.eyebrow).toBeUndefined();
    expect(fit.removed.filter((removal) => removal.reason === "placeholder").map((removal) => removal.text).sort())
      .toEqual(["[DRAFT]", "[TODO]", "[WIP]"]);
    const empty = socialImageFit(pageCopy("[DRAFT]", "[TBD]"));
    expect(empty.headline.lines.join(" ")).toBe("Example");
    expect(empty.description).toBeUndefined();
    expect(() => createSocialImageCard({ ...pageCopy("[wip] Notes", ""), strict: true })).toThrow("placeholder");
    fc.assert(fc.property(fc.constantFrom("[DRAFT]", "[ draft ]", "[TODO]", "[WIP]", "[TBD]"), fc.stringMatching(/^[A-Z][a-z]{3,9}( [a-z]{3,9}){0,4}$/u), (tag, text) => {
      const result = socialImageFit(pageCopy(`${tag} ${text}`, `${text} ${tag}`, tag));
      expect(result.headline.lines.join(" ")).toBe(text);
      expect(result.eyebrow).toBeUndefined();
    }), { numRuns: 40 });
  });
});

describe("v0.12 typography, breaks, eyebrows, and palettes", () => {
  const base = { domain: "example.com", title: "Example" } as const;
  const page = (headline: string, extra: Record<string, unknown> = {}) => ({
    ...base,
    description: "",
    eyebrow: "Guide",
    headline,
    layout: "page" as const,
    ...extra,
  });
  const codes = (details: Parameters<typeof socialImageFit>[0]) => socialImageFit(details).findings.map(({ code }) => code);

  test("sets curly quotes, apostrophes, and number ranges in prose only", () => {
    expect(socialImageTypography(`Lovelace's "Notes"`)).toBe("Lovelace’s “Notes”");
    expect(socialImageTypography("ALGAL's receipts")).toBe("ALGAL’s receipts");
    expect(socialImageTypography("'Tis the '90s")).toBe("’Tis the ’90s");
    expect(socialImageTypography(`it's "a 'nested' one"`)).toBe("it’s “a ‘nested’ one”");
    expect(socialImageTypography("10-20 pages, 2020-2024")).toBe("10–20 pages, 2020–2024");
    for (const kept of ["5-3", "555-1234", "https://x.com/a's", "example.com", "src/it's", "`don't`", "a_b's"]) {
      expect(socialImageTypography(kept)).toBe(kept);
    }
    const fit = socialImageFit(page(`Lovelace's "Notes"`, { description: `ALGAL's "receipts"`, eyebrow: "Ada's notes" }));
    expect(fit.headline.lines.join(" ")).toBe("Lovelace’s “Notes”");
    expect(fit.description?.lines.join(" ")).toBe("ALGAL’s “receipts”");
    expect(fit.eyebrow).toBe("Ada’s notes");
    expect(socialImageFit({ ...page("Docs"), domain: "it's.example.com" }).removed).toEqual([]);

    // Straight quotes never survive in prose words, and nothing else changes.
    const word = fc.stringMatching(/^[A-Za-z]{1,8}$/u);
    const quoted = fc.tuple(fc.constantFrom("", "\"", "'"), word, fc.constantFrom("", "'s", "\"", "'")).map(([open, text, close]) => `${open}${text}${close}`);
    fc.assert(fc.property(fc.array(quoted, { minLength: 1, maxLength: 8 }), (parts) => {
      const text = parts.join(" ");
      const result = socialImageTypography(text);
      expect(result).not.toMatch(/["']/u);
      expect(result.replace(/[“”]/gu, "\"").replace(/[‘’]/gu, "'")).toBe(text);
    }), { numRuns: 60 });
  });

  test("never leaves one short word alone on the first line", () => {
    for (const layout of ["page", "product"] as const) {
      for (const [headline, first] of [
        ["Wordcell vs Supermemory", "Wordcell vs"],
        ["Notes on the Analytical Engine", "Notes on"],
        ["Migrate from Supermemory", "Migrate from"],
      ] as const) {
        const details = layout === "page" ? page(headline) : { ...base, description: "Notes", layout, title: headline };
        const lines = socialImageFit(details).headline.lines;
        if (lines.length > 1) expect(lines[0]).toBe(first);
      }
    }
    // A first line of one word, when the headline has three or more words, loses to any break that fits.
    // Short lowercase words: any two fit a line, and no run of capitals reads
    // as a name to keep whole.
    const word = fc.stringMatching(/^[a-z]{4,6}$/u);
    fc.assert(fc.property(fc.array(word, { minLength: 3, maxLength: 6 }), (words) => {
      const lines = socialImageFit(page(words.join(" "))).headline.lines;
      if (lines.length > 1) expect(lines[0]?.includes(" ")).toBe(true);
    }), { numRuns: 40 });
  });

  test("keeps named phrases and no-break spaces on one line", () => {
    const named = socialImageFit(page("xcb vs Claude Code Router", { keepTogether: ["claude code router"] }));
    expect(named.headline.lines).toEqual(["xcb vs", "Claude Code Router"]);
    const nbsp = socialImageFit({ ...base, description: "xcb vs Claude Code Router", layout: "product", title: "Example" });
    expect(nbsp.headline.lines.some((line) => line.includes("Claude Code Router"))).toBe(true);
    expect(nbsp.headline.lines.join("")).not.toContain(" ");
    const site = defineSocialImageSite({ description: "Routes", domain: "example.com", keepTogether: ["Claude Code Router"], name: "Example" });
    expect(socialImageSiteDetails(site, { headline: "xcb vs Claude Code Router" }).keepTogether).toEqual(["Claude Code Router"]);
    expect(() => defineSocialImageSite({ ...site, keepTogether: "x" as unknown as string[] })).toThrow("keepTogether");

    const name = fc.array(fc.stringMatching(/^[A-Z][a-z]{2,7}$/u), { minLength: 2, maxLength: 3 }).map((words) => words.join(" "));
    const filler = fc.array(fc.stringMatching(/^[a-z]{4,8}$/u), { minLength: 1, maxLength: 4 }).map((words) => words.join(" "));
    fc.assert(fc.property(filler, name, filler, (before, phrase, after) => {
      const fit = socialImageFit(page(`${before} ${phrase} ${after}`, { keepTogether: [phrase] }));
      if (!fit.headline.truncated) expect(fit.headline.lines.some((line) => line.includes(phrase))).toBe(true);
    }), { numRuns: 30 });
  });

  test("derives a default eyebrow from the route, and reports a missing or repeated one", () => {
    expect(socialImageEyebrow("/docs/setup")).toBe("Documentation");
    expect(socialImageEyebrow("/compare/wordcell-vs-supermemory")).toBe("Comparison");
    expect(socialImageEyebrow("/use-cases/x?y#z")).toBe("Use cases");
    expect(socialImageEyebrow("/blog/post")).toBe("Blog");
    for (const none of ["/", "", "/2024/x", "/%E0%A4"]) expect(socialImageEyebrow(none)).toBeUndefined();

    const site = defineSocialImageSite({ description: "Memory for agents", domain: "example.com", name: "Example" });
    expect(socialImageSiteDetails(site, { headline: "Wordcell vs Supermemory", path: "/compare/supermemory" }).eyebrow).toBe("Comparison");
    expect(socialImageSiteDetails(site, { eyebrow: false, headline: "Wordcell vs Supermemory", path: "/compare/supermemory" }).eyebrow).toBe("");
    expect(socialImageSiteDetails(site, { eyebrow: "Guide", headline: "Setup", path: "/docs/setup" }).eyebrow).toBe("Guide");
    // A section index whose headline already names the section gets none.
    expect(socialImageSiteDetails(site, { headline: "Benchmarks for agent memory", path: "/benchmarks" }).eyebrow).toBe("");
    expect(socialImageSiteDetails(site).eyebrow).toBeUndefined();

    expect(codes({ ...page("Setup"), eyebrow: undefined } as never)).toContain("eyebrow-missing");
    expect(codes(page("Setup", { eyebrow: "" }))).not.toContain("eyebrow-missing");
    expect(codes({ ...base, description: "x", layout: "product" as const })).not.toContain("eyebrow-missing");
    expect(codes(page("Gobstopper internals", { eyebrow: "Gobstopper" }))).toContain("eyebrow-repeats-headline");
    expect(codes(page("Guides to compaction", { eyebrow: "Guide" }))).toContain("eyebrow-repeats-headline");
    expect(codes(page("Gobstopper internals", { eyebrow: "Gob" }))).not.toContain("eyebrow-repeats-headline");
  });

  test("reports a reduced, tagline, or ellipsis-ended subtitle", () => {
    const long = "Oh is open-source memory for agents that stores each fact with its sources and every change in a history you can replay.";
    const reduced = socialImageFit({ ...base, description: long, headline: "Setup", layout: "page" });
    expect(reduced.description?.reduced).toBe(true);
    expect(reduced.findings.map(({ code }) => code)).toContain("description-reduced");
    expect(codes({ ...base, description: "Compacts long agent sessions.", headline: "Setup", layout: "page" })).not.toContain("description-reduced");

    const site = defineSocialImageSite({ description: "Memory for agents", domain: "example.com", name: "Example" });
    expect(codes(socialImageSiteDetails(site, { description: "Memory for agents.", eyebrow: "Guide", headline: "Setup" }))).toContain("description-repeats-tagline");
    expect(codes(socialImageSiteDetails(site))).not.toContain("description-repeats-tagline");
    expect(codes(page("Setup", { description: "It keeps going..." }))).toContain("description-trailing-ellipsis");
    expect(codes(page("Setup", { description: "It keeps going…" }))).toContain("description-trailing-ellipsis");
    expect(codes(page("Setup", { description: "It stops." }))).not.toContain("description-trailing-ellipsis");
  });

  test("keeps real bracketed names and escaped brackets, drops known placeholders", () => {
    const fit = socialImageFit(page("[untitled] notes", { description: "\\[DRAFT] means draft." }));
    expect(fit.headline.lines.join(" ")).toBe("[untitled] notes");
    expect(fit.description?.lines.join(" ")).toBe("[DRAFT] means draft.");
    expect(fit.removed).toEqual([]);
    const dropped = socialImageFit(page("[DRAFT] Notes [preview]"));
    expect(dropped.headline.lines.join(" ")).toBe("Notes");
    expect(dropped.removed.map(({ text }) => text)).toEqual(["[DRAFT]", "[preview]"]);
    const glyphs = socialImageFit(page("Notes 🚀 [untitled]"));
    expect(glyphs.headline.lines.join(" ")).toBe("Notes [untitled]");
    expect(glyphs.removed.map(({ reason }) => reason)).toEqual(["unsupported"]);
  });

  test("measures palette distance and flags look-alike sites", () => {
    const site = (name: string, background: string) => defineSocialImageSite({ description: "x", domain: `${name}.com`, name, theme: { background } });
    const a = site("a", "#E1E2E7");
    expect(socialImagePaletteDistance(socialImageSitePalette(a), socialImageSitePalette(a))).toBe(0);
    const lookAlikes = socialImageLookAlikes([a, site("b", "#E0E2E8"), site("c", "#FBF1C7")]);
    expect(lookAlikes.map(({ first, second }) => `${first}~${second}`)).toEqual(["a~b"]);
    expect(lookAlikes[0]?.distance).toBeLessThan(SOCIAL_IMAGE_MIN_PALETTE_DISTANCE);
    // Sites on one Design Kit palette share it on the web, so they are not flagged.
    const kit = (name: string, palette: "gruvbox" | "tokyo-night") => defineSocialImageSite({ description: "x", domain: `${name}.com`, name, palette });
    expect(socialImageLookAlikes([kit("oh", "gruvbox"), kit("sponge", "gruvbox"), kit("xcb", "tokyo-night")])).toEqual([]);
    fc.assert(fc.property(fc.integer({ min: 0, max: 0xffffff }), fc.integer({ min: 0, max: 0xffffff }), (x, y) => {
      const hex = (value: number) => `#${value.toString(16).padStart(6, "0")}`;
      const first = socialImageSitePalette(site("x", hex(x)));
      const second = socialImageSitePalette(site("y", hex(y)));
      const distance = socialImagePaletteDistance(first, second);
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeCloseTo(socialImagePaletteDistance(second, first), 9);
    }), { numRuns: 40 });
  });
});

describe("v0.13.1 headline widows and home-card taglines", () => {
  const base = { domain: "example.com", title: "Example" } as const;
  const hero = (headline: string) => ({ ...base, description: "A tagline under the hero.", eyebrow: "Research", headline, layout: "product" as const });
  const page = (headline: string) => ({ ...base, description: "", eyebrow: "Guide", headline, layout: "page" as const });

  test("breaks a three-line hero headline at the clause, never stranding the last word", () => {
    const fit = socialImageFit(hero("See how someone thinks, and where every claim comes from."));
    expect(fit.headline.lines).toEqual(["See how someone thinks,", "and where every claim", "comes from."]);
    expect(fit.findings.map(({ code }) => code)).toContain("home-headline-three-lines");
  });

  test("leaves no single word on the last line when a better break exists", () => {
    for (const make of [hero, page]) {
      for (const headline of [
        "See how someone thinks, and where every claim comes from.",
        "AI writes the research. Your rules make the trade.",
        "Every memory benchmark result, with the setup and the limits it came from.",
        "Compacts long agent sessions into smaller copies you can resume from.",
        "Agent memory that shows its work.",
        "Notes on the Analytical Engine and what it was for.",
      ]) {
        const lines = socialImageFit(make(headline)).headline.lines;
        if (lines.length > 1) expect(lines.at(-1)?.includes(" "), `${headline} → ${JSON.stringify(lines)}`).toBe(true);
      }
    }
    // Lowercase prose with binding words: a lone last word always loses.
    const word = fc.constantFrom("and", "the", "from", "every", "where", "claim", "comes", "thinks", "someone", "memory", "sessions", "research", "it", "of");
    fc.assert(fc.property(fc.array(word, { minLength: 5, maxLength: 12 }), (words) => {
      const text = `${words.join(" ")}.`;
      for (const make of [hero, page]) {
        const lines = socialImageFit(make(text)).headline.lines;
        if (lines.length > 1 && !lines.some((line) => line.endsWith("…"))) expect(lines.at(-1)?.includes(" ")).toBe(true);
      }
    }), { numRuns: 80 });
  });

  test("keeps the tagline under a home card's hero headline without a finding", () => {
    const site = defineSocialImageSite({ description: "Memory for agents that shows its work.", domain: "example.com", name: "Example" });
    const home = socialImageSiteDetails(site, { description: "Memory for agents that shows its work.", eyebrow: "Agent memory", headline: "See where every fact came from.", layout: "product" });
    const codes = socialImageFit(home).findings.map(({ code }) => code);
    expect(codes).not.toContain("description-repeats-tagline");
    const pageCard = socialImageSiteDetails(site, { description: "Memory for agents that shows its work.", eyebrow: "Guide", headline: "Setup" });
    expect(socialImageFit(pageCard).findings.map(({ code }) => code)).toContain("description-repeats-tagline");
  });
});
