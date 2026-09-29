/**
 * Just enough PNG decoding to measure an icon's opaque area. It runs in any
 * runtime (no `node:zlib`), reads nothing outside the given bytes, and gives
 * up quietly on anything unusual, so the card falls back to drawing the icon
 * as declared.
 */

/** Opaque-pixel bounds of an image, as fractions of its width and height. */
export type RasterBounds = Readonly<{
  bottom: number;
  left: number;
  right: number;
  top: number;
}>;

export type RasterCoverage = Readonly<{
  bounds: RasterBounds;
  /** True when all four corner pixels are opaque, so the art is a full square. */
  cornersOpaque: boolean;
  /** True when the middle of the art's bounds is opaque (a filled shape, not a ring or outline). */
  centerOpaque: boolean;
  /** Share of the pixels inside `bounds` that are opaque, from 0 to 1. */
  fill: number;
  /**
   * The most common saturated color among opaque pixels, as `#RRGGBB`, or
   * undefined when the art is greyscale.
   */
  hue?: string;
}>;

/* ---------------------------------------------------------------- inflate */

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CODE_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

type Huffman = Readonly<{ counts: Uint16Array; symbols: Uint16Array }>;

function huffman(lengths: ArrayLike<number>): Huffman {
  const counts = new Uint16Array(16);
  for (let index = 0; index < lengths.length; index += 1) { const slot = lengths[index] ?? 0; counts[slot] = (counts[slot] ?? 0) + 1; }
  counts[0] = 0;
  const offsets = new Uint16Array(16);
  for (let bits = 1; bits < 16; bits += 1) offsets[bits] = (offsets[bits - 1] ?? 0) + (counts[bits - 1] ?? 0);
  const symbols = new Uint16Array(lengths.length);
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index] ?? 0;
    if (length === 0) continue;
    const slot = offsets[length] ?? 0;
    symbols[slot] = index;
    offsets[length] = slot + 1;
  }
  return { counts, symbols };
}

class Bits {
  private bit = 0;
  private held = 0;
  position = 0;
  constructor(private readonly data: Uint8Array) {}
  read(count: number): number {
    while (this.held < count) {
      if (this.position >= this.data.length) throw new RangeError("inflate: out of data");
      this.bit |= (this.data[this.position++] ?? 0) << this.held;
      this.held += 8;
    }
    const value = this.bit & ((1 << count) - 1);
    this.bit >>>= count;
    this.held -= count;
    return value;
  }
  align(): void {
    this.bit = 0;
    this.held = 0;
  }
  decode(table: Huffman): number {
    let code = 0;
    let first = 0;
    let index = 0;
    for (let length = 1; length < 16; length += 1) {
      code |= this.read(1);
      const count = (table.counts[length] ?? 0);
      if (code - first < count) return (table.symbols[index + code - first] ?? 0);
      index += count;
      first = (first + count) << 1;
      code <<= 1;
    }
    throw new RangeError("inflate: bad code");
  }
}

const FIXED_LITERALS = huffman(Array.from({ length: 288 }, (_, symbol) =>
  symbol < 144 ? 8 : symbol < 256 ? 9 : symbol < 280 ? 7 : 8));
const FIXED_DISTANCES = huffman(Array.from({ length: 30 }, () => 5));

/** Inflates a zlib stream (RFC 1950/1951) whose output is `expected` bytes. */
export function inflateZlib(data: Uint8Array, expected: number): Uint8Array {
  const out = new Uint8Array(expected);
  let written = 0;
  const bits = new Bits(data.subarray(2));
  let last = 0;
  while (last === 0) {
    last = bits.read(1);
    const type = bits.read(2);
    if (type === 0) {
      bits.align();
      const view = data.subarray(2);
      const start = bits.position;
      const length = (view[start] ?? 0) | ((view[start + 1] ?? 0) << 8);
      if (written + length > expected) throw new RangeError("inflate: overflow");
      out.set(view.subarray(start + 4, start + 4 + length), written);
      written += length;
      bits.position = start + 4 + length;
      continue;
    }
    let literals = FIXED_LITERALS;
    let distances = FIXED_DISTANCES;
    if (type === 2) {
      const literalCount = bits.read(5) + 257;
      const distanceCount = bits.read(5) + 1;
      const codeCount = bits.read(4) + 4;
      const codeLengths = new Uint8Array(19);
      for (let index = 0; index < codeCount; index += 1) codeLengths[(CODE_ORDER[index] ?? 0)] = bits.read(3);
      const codes = huffman(codeLengths);
      const lengths = new Uint8Array(literalCount + distanceCount);
      for (let index = 0; index < lengths.length;) {
        const symbol = bits.decode(codes);
        if (symbol < 16) {
          lengths[index++] = symbol;
        } else {
          const previous = symbol === 16 ? (lengths[index - 1] ?? 0) : 0;
          const repeat = symbol === 16 ? 3 + bits.read(2) : symbol === 17 ? 3 + bits.read(3) : 11 + bits.read(7);
          for (let step = 0; step < repeat && index < lengths.length; step += 1) lengths[index++] = previous;
        }
      }
      literals = huffman(lengths.subarray(0, literalCount));
      distances = huffman(lengths.subarray(literalCount));
    } else if (type !== 1) {
      throw new RangeError("inflate: bad block type");
    }
    for (;;) {
      const symbol = bits.decode(literals);
      if (symbol < 256) {
        if (written >= expected) throw new RangeError("inflate: overflow");
        out[written++] = symbol;
        continue;
      }
      if (symbol === 256) break;
      const lengthIndex = symbol - 257;
      const length = (LENGTH_BASE[lengthIndex] ?? 0) + bits.read((LENGTH_EXTRA[lengthIndex] ?? 0));
      const distanceIndex = bits.decode(distances);
      const distance = (DIST_BASE[distanceIndex] ?? 0) + bits.read((DIST_EXTRA[distanceIndex] ?? 0));
      if (distance > written || written + length > expected) throw new RangeError("inflate: bad distance");
      for (let step = 0; step < length; step += 1) {
        out[written] = (out[written - distance] ?? 0);
        written += 1;
      }
    }
  }
  if (written !== expected) throw new RangeError("inflate: short output");
  return out;
}

/* -------------------------------------------------------------------- png */

const CHANNELS: Readonly<Record<number, number>> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);
  if (toLeft <= toUp && toLeft <= toUpLeft) return left;
  return toUp <= toUpLeft ? up : upLeft;
}

/**
 * Measures where a PNG is opaque (alpha above ~10%). Returns undefined for
 * interlaced, 16-bit, or malformed files and for images with no opaque pixel.
 */
export function pngCoverage(bytes: Uint8Array): RasterCoverage | undefined {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 8;
    let width = 0;
    let height = 0;
    let depth = 0;
    let colorType = 0;
    let interlace = 0;
    let transparency: Uint8Array | undefined;
    const chunks: Uint8Array[] = [];
    while (offset + 8 <= bytes.length) {
      const length = view.getUint32(offset, false);
      const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      const body = bytes.subarray(offset + 8, offset + 8 + length);
      if (type === "IHDR") {
        width = view.getUint32(offset + 8, false);
        height = view.getUint32(offset + 12, false);
        depth = body[8] ?? 0;
        colorType = body[9] ?? 0;
        interlace = body[12] ?? 0;
      } else if (type === "tRNS") {
        transparency = body;
      } else if (type === "IDAT") {
        chunks.push(body);
      } else if (type === "IEND") {
        break;
      }
      offset += 12 + length;
    }
    const channels = CHANNELS[colorType];
    if (channels === undefined || depth !== 8 || interlace !== 0 || width === 0 || height === 0) return undefined;
    if (width * height > 4_194_304) return undefined;
    const compressed = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    let at = 0;
    for (const chunk of chunks) {
      compressed.set(chunk, at);
      at += chunk.length;
    }
    const stride = width * channels;
    const raw = inflateZlib(compressed, (stride + 1) * height);
    const pixels = new Uint8Array(stride * height);
    for (let row = 0; row < height; row += 1) {
      const filter = (raw[row * (stride + 1)] ?? 0);
      const source = row * (stride + 1) + 1;
      const target = row * stride;
      for (let column = 0; column < stride; column += 1) {
        const value = (raw[source + column] ?? 0);
        const left = column >= channels ? (pixels[target + column - channels] ?? 0) : 0;
        const up = row > 0 ? (pixels[target - stride + column] ?? 0) : 0;
        const upLeft = row > 0 && column >= channels ? (pixels[target - stride + column - channels] ?? 0) : 0;
        const predictor = filter === 0 ? 0
          : filter === 1 ? left
            : filter === 2 ? up
              : filter === 3 ? (left + up) >> 1
                : filter === 4 ? paeth(left, up, upLeft)
                  : Number.NaN;
        if (Number.isNaN(predictor)) return undefined;
        pixels[target + column] = (value + predictor) & 0xff;
      }
    }
    const alpha = (x: number, y: number): number => {
      const base = y * stride + x * channels;
      if (colorType === 6) return (pixels[base + 3] ?? 0);
      if (colorType === 4) return (pixels[base + 1] ?? 0);
      if (colorType === 3) return transparency?.[(pixels[base] ?? 0)] ?? 255;
      if (transparency !== undefined && transparency.length >= 2 * channels) {
        const matches = Array.from({ length: channels }, (_, index) =>
          pixels[base + index] === transparency[index * 2 + 1]).every(Boolean);
        return matches ? 0 : 255;
      }
      return 255;
    };
    let left = width;
    let right = -1;
    let top = height;
    let bottom = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (alpha(x, y) <= 24) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    if (right < 0) return undefined;
    const opaque = (x: number, y: number) => alpha(x, y) >= 230;
    const rgb = (x: number, y: number): readonly [number, number, number] => {
      const base = y * stride + x * channels;
      if (colorType === 2 || colorType === 6) return [(pixels[base] ?? 0), (pixels[base + 1] ?? 0), (pixels[base + 2] ?? 0)];
      return [(pixels[base] ?? 0), (pixels[base] ?? 0), (pixels[base] ?? 0)];
    };
    let solid = 0;
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) if (opaque(x, y)) solid += 1;
    }
    // Hue histogram weighted by chroma: twelve 30-degree bins, then the mean
    // color of the winning bin. Palette PNGs report greyscale (no hue).
    const bins = Array.from({ length: 12 }, () => ({ blue: 0, green: 0, red: 0, weight: 0 }));
    const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 16_384)));
    if (colorType === 2 || colorType === 6) {
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          if (!opaque(x, y)) continue;
          const [red, green, blue] = rgb(x, y);
          const high = Math.max(red, green, blue);
          const low = Math.min(red, green, blue);
          const chroma = high - low;
          if (chroma < 48) continue;
          let hue = high === red ? ((green - blue) / chroma) % 6
            : high === green ? (blue - red) / chroma + 2
              : (red - green) / chroma + 4;
          if (hue < 0) hue += 6;
          const bin = bins[Math.min(11, Math.floor(hue * 2))];
          if (bin === undefined) continue;
          bin.red += red * chroma;
          bin.green += green * chroma;
          bin.blue += blue * chroma;
          bin.weight += chroma;
        }
      }
    }
    const winner = bins.reduce((best, bin) => (bin.weight > best.weight ? bin : best));
    const hex = (value: number) => Math.round(value).toString(16).padStart(2, "0").toUpperCase();
    const hue = winner.weight > 0
      ? `#${hex(winner.red / winner.weight)}${hex(winner.green / winner.weight)}${hex(winner.blue / winner.weight)}`
      : undefined;
    return {
      ...(hue === undefined ? {} : { hue }),
      bounds: {
        bottom: (bottom + 1) / height,
        left: left / width,
        right: (right + 1) / width,
        top: top / height,
      },
      centerOpaque: [-1, 0, 1].every((dy) => [-1, 0, 1].every((dx) =>
        opaque(
          Math.min(width - 1, Math.max(0, Math.round((left + right) / 2 + dx * Math.max(1, (right - left) / 16)))),
          Math.min(height - 1, Math.max(0, Math.round((top + bottom) / 2 + dy * Math.max(1, (bottom - top) / 16)))),
        ))),
      cornersOpaque: opaque(0, 0) && opaque(width - 1, 0) && opaque(0, height - 1) && opaque(width - 1, height - 1),
      fill: solid / ((right - left + 1) * (bottom - top + 1)),
    };
  } catch {
    return undefined;
  }
}
