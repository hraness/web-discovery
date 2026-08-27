import { describe, expect, mock, test } from "bun:test";
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
  createSocialImageResponse,
  plainSocialImageTheme,
} = await import("./social-image");

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
    expect(image.options.fonts?.every(({ data }) => data.byteLength > 0))
      .toBe(true);
  });
});
