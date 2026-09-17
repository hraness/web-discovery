import { nebulaSansSocialFonts } from "@hraness/design-kit/fonts/nebula-sans/social";
import { ImageResponse } from "next/og.js";
import type { ReactNode } from "react";

import { LARGE_SOCIAL_IMAGE } from "./discovery.js";

export const socialImageSize = LARGE_SOCIAL_IMAGE;
export const socialImageContentType = "image/png";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const CARD_PADDING = 60;
export const TOP_BAR_HEIGHT = 54;
export const BOTTOM_RULE_HEIGHT = 54;

export const socialImageMarks = {
  splitSquare: "◫",
} as const;

export type SocialImageMark =
  (typeof socialImageMarks)[keyof typeof socialImageMarks];

export type SocialImageTheme = Readonly<{
  accent: string;
  background: string;
  foreground: string;
  muted: string;
}>;

export const plainSocialImageTheme = {
  accent: "#2457A6",
  background: "#FFFFFF",
  foreground: "#171717",
  muted: "#666666",
} as const satisfies SocialImageTheme;

export type SocialImageDetails = Readonly<{
  description: string;
  domain: string;
  eyebrow?: string;
  mark?: ReactNode;
  theme?: Partial<SocialImageTheme>;
  title: string;
}>;

function color(value: string, label: string): string {
  if (!/^#[0-9A-F]{6}$/iu.test(value)) {
    throw new RangeError(`${label} must be a six-digit hex color; received ${value}.`);
  }
  return value;
}

type CmapSubtable = Readonly<{
  format: 4 | 12;
  offset: number;
}>;

const cmapCache = new WeakMap<ArrayBuffer, readonly CmapSubtable[]>();

function readableRange(view: DataView, offset: number, length: number): boolean {
  return Number.isSafeInteger(offset)
    && Number.isSafeInteger(length)
    && offset >= 0
    && length >= 0
    && offset + length <= view.byteLength;
}

function fontCmapSubtables(font: ArrayBuffer): readonly CmapSubtable[] {
  const cached = cmapCache.get(font);
  if (cached !== undefined) return cached;

  const view = new DataView(font);
  if (!readableRange(view, 0, 12)) {
    throw new Error("Embedded social-image font has an invalid SFNT header.");
  }

  const tableCount = view.getUint16(4, false);
  let cmapOffset: number | undefined;
  for (let index = 0; index < tableCount; index += 1) {
    const recordOffset = 12 + index * 16;
    if (!readableRange(view, recordOffset, 16)) break;
    const tag = String.fromCharCode(
      view.getUint8(recordOffset),
      view.getUint8(recordOffset + 1),
      view.getUint8(recordOffset + 2),
      view.getUint8(recordOffset + 3),
    );
    if (tag === "cmap") {
      cmapOffset = view.getUint32(recordOffset + 8, false);
      break;
    }
  }

  if (cmapOffset === undefined || !readableRange(view, cmapOffset, 4)) {
    throw new Error("Embedded social-image font is missing a valid cmap table.");
  }

  const subtableCount = view.getUint16(cmapOffset + 2, false);
  const subtables: CmapSubtable[] = [];
  for (let index = 0; index < subtableCount; index += 1) {
    const recordOffset = cmapOffset + 4 + index * 8;
    if (!readableRange(view, recordOffset, 8)) break;
    const offset = cmapOffset + view.getUint32(recordOffset + 4, false);
    if (!readableRange(view, offset, 2)) continue;
    const format = view.getUint16(offset, false);
    if (format === 4 || format === 12) subtables.push({ format, offset });
  }

  if (subtables.length === 0) {
    throw new Error("Embedded social-image font has no supported cmap subtable.");
  }
  cmapCache.set(font, subtables);
  return subtables;
}

function formatFourHasGlyph(
  view: DataView,
  offset: number,
  codePoint: number,
): boolean {
  if (codePoint > 0xffff || !readableRange(view, offset, 14)) return false;
  const length = view.getUint16(offset + 2, false);
  if (!readableRange(view, offset, length)) return false;
  const segmentCount = view.getUint16(offset + 6, false) / 2;
  const endCodesOffset = offset + 14;
  const startCodesOffset = endCodesOffset + segmentCount * 2 + 2;
  const deltasOffset = startCodesOffset + segmentCount * 2;
  const rangeOffsetsOffset = deltasOffset + segmentCount * 2;

  for (let index = 0; index < segmentCount; index += 1) {
    const endCode = view.getUint16(endCodesOffset + index * 2, false);
    if (codePoint > endCode) continue;
    const startCode = view.getUint16(startCodesOffset + index * 2, false);
    if (codePoint < startCode) return false;
    const delta = view.getInt16(deltasOffset + index * 2, false);
    const rangeOffsetAddress = rangeOffsetsOffset + index * 2;
    const rangeOffset = view.getUint16(rangeOffsetAddress, false);
    if (rangeOffset === 0) return ((codePoint + delta) & 0xffff) !== 0;

    const glyphAddress = rangeOffsetAddress
      + rangeOffset
      + (codePoint - startCode) * 2;
    if (!readableRange(view, glyphAddress, 2)) return false;
    const glyph = view.getUint16(glyphAddress, false);
    return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0;
  }
  return false;
}

function formatTwelveHasGlyph(
  view: DataView,
  offset: number,
  codePoint: number,
): boolean {
  if (!readableRange(view, offset, 16)) return false;
  const length = view.getUint32(offset + 4, false);
  if (!readableRange(view, offset, length)) return false;
  const groupCount = view.getUint32(offset + 12, false);
  let lower = 0;
  let upper = groupCount - 1;
  while (lower <= upper) {
    const index = Math.floor((lower + upper) / 2);
    const groupOffset = offset + 16 + index * 12;
    if (!readableRange(view, groupOffset, 12)) return false;
    const start = view.getUint32(groupOffset, false);
    const end = view.getUint32(groupOffset + 4, false);
    if (codePoint < start) {
      upper = index - 1;
    } else if (codePoint > end) {
      lower = index + 1;
    } else {
      const startGlyph = view.getUint32(groupOffset + 8, false);
      return startGlyph + codePoint - start !== 0;
    }
  }
  return false;
}

function fontHasGlyph(font: ArrayBuffer, codePoint: number): boolean {
  const view = new DataView(font);
  return fontCmapSubtables(font).some(({ format, offset }) => format === 4
    ? formatFourHasGlyph(view, offset, codePoint)
    : formatTwelveHasGlyph(view, offset, codePoint));
}

function normalizeSocialImageText(value: string): string {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n").replaceAll("\t", " ");
}

function assertSocialImageText(
  value: string,
  label: "description" | "domain" | "eyebrow" | "title",
  fonts: ReturnType<typeof nebulaSansSocialFonts>,
): void {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === 0x0a) {
      continue;
    }
    if (codePoint !== undefined && fonts.every(({ data }) => fontHasGlyph(data, codePoint))) {
      continue;
    }
    const notation = codePoint === undefined
      ? "unknown"
      : `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
    throw new RangeError(
      `${label} contains ${JSON.stringify(character)} (${notation}), which is not covered by the embedded Nebula Sans social fonts.`,
    );
  }
}

function isReactElement(node: unknown): node is { props: Record<string, unknown> } {
  return typeof node === "object"
    && node !== null
    && "props" in node
    && node.props !== undefined
    && node.props !== null
    && typeof (node as { props?: unknown }).props === "object";
}

function assertNoRemoteAssets(node: unknown, label = "mark"): void {
  if (node === undefined || node === null) return;
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") return;
  if (Array.isArray(node)) {
    for (const child of node) assertNoRemoteAssets(child, label);
    return;
  }
  if (isReactElement(node)) {
    const { props } = node;
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === "string" && /^https?:/u.test(value)) {
        throw new RangeError(`${label} must not load remote assets; found ${key}=${value}.`);
      }
      if (key !== "children") {
        assertNoRemoteAssets(value, label);
      }
    }
  }
}

function registeredSocialImageMark(mark: string) {
  if (mark !== socialImageMarks.splitSquare) {
    throw new RangeError(`Unsupported social-image mark: ${JSON.stringify(mark)}.`);
  }
  return (
    <svg
      aria-label={mark}
      height="42"
      role="img"
      viewBox="0 0 36 36"
      width="42"
    >
      <rect
        fill="none"
        height="23"
        stroke="currentColor"
        strokeWidth="3"
        width="23"
        x="6.5"
        y="6.5"
      />
      <path
        d="M18 8v20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  );
}

function renderMark(mark: SocialImageDetails["mark"]) {
  if (mark === undefined) return null;
  if (typeof mark === "string") return registeredSocialImageMark(mark);
  assertNoRemoteAssets(mark);
  return <div style={{ alignItems: "center", display: "flex" }}>{mark}</div>;
}

function wrapWords(text: string, maxChars: number): string[] {
  const words = text.split(/ +/u).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current.length === 0 ? word : `${current} ${word}`;
    if (word.length > maxChars && current.length === 0) {
      for (let start = 0; start < word.length; start += maxChars) {
        const chunk = word.slice(start, start + maxChars);
        if (start === 0) {
          current = chunk;
        } else {
          lines.push(current);
          current = chunk;
        }
      }
      continue;
    }
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current.length > 0) {
      lines.push(current);
    }
    current = word;
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines;
}

function estimateMaxChars(fontSize: number, availableWidth: number): number {
  const averageGlyphWidth = fontSize * 0.52;
  return Math.floor(availableWidth / averageGlyphWidth);
}

function fittedCopy(
  title: string,
  description: string,
  maxTextHeight: number,
  availableWidth: number,
) {
  const titleSizes: readonly number[] = [80, 72, 64, 56, 48, 42];
  const descSizes: readonly number[] = [32, 28, 24];
  const gap = 28;

  for (const titleSize of titleSizes) {
    const titleMaxChars = estimateMaxChars(titleSize, availableWidth);
    const titleLines = wrapWords(title, titleMaxChars);
    const titleLineHeight = titleSize * 1.08;
    const titleHeight = titleLines.length * titleLineHeight;

    for (const descSize of descSizes) {
      const descMaxChars = estimateMaxChars(descSize, availableWidth);
      const maxDescHeight = Math.max(0, maxTextHeight - titleHeight - gap);
      const descMaxLines = Math.max(1, Math.floor(maxDescHeight / (descSize * 1.35)));
      const rawDescLines = wrapWords(description, descMaxChars);
      const descLines = rawDescLines.slice(0, descMaxLines);
      const descHeight = descLines.length * (descSize * 1.35);
      const totalHeight = titleHeight + descHeight + gap;

      if (descLines.length === rawDescLines.length && totalHeight <= maxTextHeight) {
        return { titleSize, titleLines, descSize, descLines };
      }
    }
  }

  const smallestTitle = titleSizes[titleSizes.length - 1] as number;
  const smallestDesc = descSizes[descSizes.length - 1] as number;
  const titleMaxChars = estimateMaxChars(smallestTitle, availableWidth);
  const titleLines = wrapWords(title, titleMaxChars);
  const descMaxChars = estimateMaxChars(smallestDesc, availableWidth);
  const maxDescHeight = Math.max(0, maxTextHeight - titleLines.length * (smallestTitle * 1.08) - gap);
  const descMaxLines = Math.max(1, Math.floor(maxDescHeight / (smallestDesc * 1.35)));
  const rawDescLines = wrapWords(description, descMaxChars);
  const descLines: string[] = [];
  for (const line of rawDescLines.slice(0, descMaxLines)) {
    if (descLines.length < descMaxLines - 1) {
      descLines.push(line);
      continue;
    }
    const tail = rawDescLines.slice(descMaxLines - 1).join(" ");
    if (tail.length > descMaxChars) {
      const truncated = tail.slice(0, Math.max(0, descMaxChars - 3));
      const end = truncated.endsWith(" ") ? truncated.trimEnd() : truncated;
      descLines.push(`${end}...`);
    } else {
      descLines.push(tail);
    }
    break;
  }

  return {
    titleLines,
    titleSize: smallestTitle,
    descLines,
    descSize: smallestDesc,
  };
}

export function createSocialImageResponse(
  details: SocialImageDetails,
): ImageResponse {
  const theme = {
    accent: color(
      details.theme?.accent ?? plainSocialImageTheme.accent,
      "accent",
    ),
    background: color(
      details.theme?.background ?? plainSocialImageTheme.background,
      "background",
    ),
    foreground: color(
      details.theme?.foreground ?? plainSocialImageTheme.foreground,
      "foreground",
    ),
    muted: color(
      details.theme?.muted ?? plainSocialImageTheme.muted,
      "muted",
    ),
  };
  const fonts = nebulaSansSocialFonts();
  const copy = {
    description: normalizeSocialImageText(details.description),
    domain: normalizeSocialImageText(details.domain),
    eyebrow: details.eyebrow === undefined
      ? undefined
      : normalizeSocialImageText(details.eyebrow),
    title: normalizeSocialImageText(details.title),
  };
  assertSocialImageText(copy.description, "description", fonts);
  assertSocialImageText(copy.domain, "domain", fonts);
  if (copy.eyebrow !== undefined) {
    assertSocialImageText(copy.eyebrow, "eyebrow", fonts);
  }
  assertSocialImageText(copy.title, "title", fonts);

  const availableWidth = CARD_WIDTH - CARD_PADDING * 2;
  const maxTextHeight = CARD_HEIGHT - CARD_PADDING * 2 - TOP_BAR_HEIGHT - BOTTOM_RULE_HEIGHT - 40;
  const fit = fittedCopy(copy.title, copy.description, maxTextHeight, availableWidth);

  return new ImageResponse(
    (
      <div
        style={{
          background: theme.background,
          color: theme.foreground,
          display: "flex",
          flexDirection: "column",
          fontFamily: "Nebula Sans",
          height: "100%",
          justifyContent: "space-between",
          padding: `${String(CARD_PADDING)}px`,
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            borderBottom: `2px solid ${theme.accent}`,
            color: theme.foreground,
            display: "flex",
            fontSize: 22,
            fontWeight: 700,
            height: TOP_BAR_HEIGHT,
            justifyContent: "space-between",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            width: "100%",
          }}
        >
          <span>{copy.eyebrow ?? copy.domain}</span>
          {renderMark(details.mark)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", width: "100%" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0",
              fontSize: fit.titleSize,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              maxWidth: availableWidth,
            }}
          >
            {fit.titleLines.map((line) => (
              <div key={line} style={{ maxWidth: availableWidth }}>
                {line}
              </div>
            ))}
          </div>
          <div
            style={{
              color: theme.muted,
              display: "flex",
              flexDirection: "column",
              fontSize: fit.descSize,
              fontWeight: 400,
              lineHeight: 1.35,
              maxWidth: availableWidth - 40,
            }}
          >
            {fit.descLines.map((line) => (
              <div key={line} style={{ maxWidth: availableWidth - 40 }}>
                {line}
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            alignItems: "center",
            borderTop: `2px solid ${theme.accent}`,
            color: theme.accent,
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            height: BOTTOM_RULE_HEIGHT,
            justifyContent: "space-between",
            letterSpacing: "0.02em",
            width: "100%",
          }}
        >
          <span>{copy.domain}</span>
        </div>
      </div>
    ),
    {
      ...LARGE_SOCIAL_IMAGE,
      fonts: [...fonts],
    },
  );
}
