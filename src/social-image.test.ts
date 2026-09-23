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
  createSocialImageResponse,
  plainSocialImageTheme,
  socialImageHeadline,
} = await import("./social-image");

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
});
