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
  socialImageFit,
  socialImageHeadline,
  socialImageIconShape,
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
    expect(fit.description?.cut).toBe("clause");
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
      expect(bindingWords.has(lastWord(shown))).toBe(false);
      expect(shown.join(" ").endsWith(".")).toBe(true);
    }), { numRuns: 60 });
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
    expect(socialImageFit(socialImageSiteDetails(site)).description?.lines.join(" ")).toBe("Compacts long agent sessions");
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

  test("tints the page wash from each site's brand color", () => {
    const paper = { background: "#FFF8E7", foreground: "#1F1B16", muted: "#5F564B" };
    const red = socialImagePalette({ ...paper, accent: "#B43A1D" });
    const blue = socialImagePalette({ ...paper, accent: "#2457A6" });
    expect(red.backgroundTint).not.toBe(blue.backgroundTint);
    expect(red.wash).toBe("#B43A1D");
    // An explicit wash wins, and an app icon's color is used when there is none.
    expect(socialImagePalette({ ...paper, accent: "#2457A6", wash: "#176B5B" }).wash).toBe("#176B5B");
    expect(socialImagePalette({ ...paper, accent: "#2457A6" }, "#176B5B").wash).toBe("#176B5B");
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

  test("draws solid app art without a tile rim, and marks in the 60% safe area", () => {
    const imgs = (node: unknown): { height: number; width: number }[] => {
      if (Array.isArray(node)) return node.flatMap(imgs);
      if (!isNode(node)) return [];
      const props = node.props as { children?: unknown; height?: number; src?: string; width?: number };
      const own = typeof props.src === "string" && typeof props.width === "number" && typeof props.height === "number"
        ? [{ height: props.height, width: props.width }]
        : [];
      return [...own, ...imgs(props.children)];
    };
    const disc = svgUrl("<circle cx='12' cy='12' r='12' fill='#b43a1d'/>");
    const product = createSocialImageCard({ ...base, description: "Memory for agents", icon: { kind: "app", src: disc } });
    // The disc is drawn at the full 304px tile size.
    expect(imgs(product.element).some((image) => image.width === 304 && image.height === 304)).toBe(true);
    const mark = createSocialImageCard({ ...base, description: "Memory for agents", icon: { kind: "mark", src: svgMark } });
    expect(imgs(mark.element).some((image) => Math.max(image.width, image.height) === Math.round(304 * 0.6))).toBe(true);
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
    const empty = socialImageFit(pageCopy("[DRAFT]", "[untitled]"));
    expect(empty.headline.lines.join(" ")).toBe("Example");
    expect(empty.description).toBeUndefined();
    expect(() => createSocialImageCard({ ...pageCopy("[wip] Notes", ""), strict: true })).toThrow("placeholder");
    fc.assert(fc.property(fc.constantFrom("[DRAFT]", "[ draft ]", "[untitled]", "[WIP]", "[TBD]"), fc.stringMatching(/^[A-Z][a-z]{3,9}( [a-z]{3,9}){0,4}$/u), (tag, text) => {
      const result = socialImageFit(pageCopy(`${tag} ${text}`, `${text} ${tag}`, tag));
      expect(result.headline.lines.join(" ")).toBe(text);
      expect(result.eyebrow).toBeUndefined();
    }), { numRuns: 40 });
  });
});
