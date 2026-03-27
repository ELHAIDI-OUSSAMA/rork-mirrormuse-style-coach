import pako from 'pako';

/* ── Base64 ↔ Uint8Array ──────────────────────────────── */

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    bin += String.fromCharCode(...slice);
  }
  return btoa(bin);
}

/* ── CRC-32 (used in PNG chunk encoding) ──────────────── */

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/* ── Helpers ──────────────────────────────────────────── */

function r32(d: Uint8Array, o: number) {
  return ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0;
}

function w32(d: Uint8Array, o: number, v: number) {
  d[o] = (v >>> 24) & 0xff;
  d[o + 1] = (v >>> 16) & 0xff;
  d[o + 2] = (v >>> 8) & 0xff;
  d[o + 3] = v & 0xff;
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/* ── PNG decode → RGBA pixels ─────────────────────────── */

function decodePNG(data: Uint8Array): {
  w: number;
  h: number;
  rgba: Uint8Array;
} {
  const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (data[i] !== SIG[i]) throw new Error('Not a valid PNG file');
  }

  let pos = 8;
  let w = 0,
    h = 0,
    bitDepth = 0,
    colType = 0;
  const idats: Uint8Array[] = [];
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;

  while (pos < data.length) {
    const len = r32(data, pos);
    const type =
      String.fromCharCode(data[pos + 4]) +
      String.fromCharCode(data[pos + 5]) +
      String.fromCharCode(data[pos + 6]) +
      String.fromCharCode(data[pos + 7]);

    if (type === 'IHDR') {
      w = r32(data, pos + 8);
      h = r32(data, pos + 12);
      bitDepth = data[pos + 16];
      colType = data[pos + 17];
    } else if (type === 'PLTE') {
      palette = data.slice(pos + 8, pos + 8 + len);
    } else if (type === 'tRNS') {
      trns = data.slice(pos + 8, pos + 8 + len);
    } else if (type === 'IDAT') {
      idats.push(data.slice(pos + 8, pos + 8 + len));
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }

  console.log(`[PngDecode] ${w}x${h} bitDepth=${bitDepth} colType=${colType} palette=${palette ? palette.length / 3 + ' entries' : 'none'}`);

  const totalLen = idats.reduce((s, c) => s + c.length, 0);
  const compressed = new Uint8Array(totalLen);
  let off = 0;
  for (const c of idats) {
    compressed.set(c, off);
    off += c.length;
  }

  const raw = pako.inflate(compressed);

  // Bytes per pixel in the filtered data stream
  let bpp: number;
  switch (colType) {
    case 0: bpp = Math.ceil(bitDepth / 8); break;       // Grayscale
    case 2: bpp = 3 * Math.ceil(bitDepth / 8); break;   // RGB
    case 3: bpp = 1; break;                              // Indexed (palette)
    case 4: bpp = 2 * Math.ceil(bitDepth / 8); break;   // Grayscale+Alpha
    case 6: bpp = 4 * Math.ceil(bitDepth / 8); break;   // RGBA
    default: bpp = 4;
  }

  // For sub-byte depths (1, 2, 4-bit palette), stride is in bytes
  const pixelsPerByte = bitDepth < 8 ? Math.floor(8 / bitDepth) : 1;
  const stride = colType === 3 && bitDepth < 8
    ? Math.ceil(w / pixelsPerByte)
    : w * bpp;

  // Unfilter scanlines
  const unf = new Uint8Array(h * stride);
  let sp = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[sp++];
    const dst = y * stride;
    const prv = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const cur = raw[sp + x];
      const a = x >= bpp ? unf[dst + x - bpp] : 0;
      const b = y > 0 ? unf[prv + x] : 0;
      const cv = y > 0 && x >= bpp ? unf[prv + x - bpp] : 0;

      switch (ft) {
        case 0: unf[dst + x] = cur; break;
        case 1: unf[dst + x] = (cur + a) & 0xff; break;
        case 2: unf[dst + x] = (cur + b) & 0xff; break;
        case 3: unf[dst + x] = (cur + ((a + b) >> 1)) & 0xff; break;
        case 4: unf[dst + x] = (cur + paeth(a, b, cv)) & 0xff; break;
        default: unf[dst + x] = cur;
      }
    }
    sp += stride;
  }

  // Convert to RGBA
  const rgba = new Uint8Array(w * h * 4);

  if (colType === 3 && palette) {
    // Indexed colour — look up palette + optional tRNS alpha
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let idx: number;
        if (bitDepth === 8) {
          idx = unf[y * stride + x];
        } else {
          const byteOff = y * stride + Math.floor(x * bitDepth / 8);
          const bitOff = (8 - bitDepth) - (x * bitDepth % 8);
          const mask = (1 << bitDepth) - 1;
          idx = (unf[byteOff] >> bitOff) & mask;
        }
        const pi = (y * w + x) * 4;
        const pOff = idx * 3;
        rgba[pi] = palette[pOff] ?? 0;
        rgba[pi + 1] = palette[pOff + 1] ?? 0;
        rgba[pi + 2] = palette[pOff + 2] ?? 0;
        rgba[pi + 3] = trns && idx < trns.length ? trns[idx] : 255;
      }
    }
  } else {
    for (let i = 0; i < w * h; i++) {
      switch (colType) {
        case 6:
          rgba[i * 4] = unf[i * 4];
          rgba[i * 4 + 1] = unf[i * 4 + 1];
          rgba[i * 4 + 2] = unf[i * 4 + 2];
          rgba[i * 4 + 3] = unf[i * 4 + 3];
          break;
        case 2:
          rgba[i * 4] = unf[i * 3];
          rgba[i * 4 + 1] = unf[i * 3 + 1];
          rgba[i * 4 + 2] = unf[i * 3 + 2];
          rgba[i * 4 + 3] = 255;
          break;
        case 4:
          rgba[i * 4] = unf[i * 2];
          rgba[i * 4 + 1] = unf[i * 2];
          rgba[i * 4 + 2] = unf[i * 2];
          rgba[i * 4 + 3] = unf[i * 2 + 1];
          break;
        default:
          rgba[i * 4] = unf[i];
          rgba[i * 4 + 1] = unf[i];
          rgba[i * 4 + 2] = unf[i];
          rgba[i * 4 + 3] = 255;
      }
    }
  }

  return { w, h, rgba };
}

/* ── PNG encode ← RGBA pixels ─────────────────────────── */

function makeChunk(type: string, body: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + body.length);
  w32(chunk, 0, body.length);
  chunk[4] = type.charCodeAt(0);
  chunk[5] = type.charCodeAt(1);
  chunk[6] = type.charCodeAt(2);
  chunk[7] = type.charCodeAt(3);
  chunk.set(body, 8);

  const forCrc = new Uint8Array(4 + body.length);
  forCrc.set(chunk.subarray(4, 8), 0);
  forCrc.set(body, 4);
  w32(chunk, 8 + body.length, crc32(forCrc));

  return chunk;
}

function encodePNG(w: number, h: number, rgba: Uint8Array): Uint8Array {
  const stride = w * 4;
  const scanlines = new Uint8Array(h * (1 + stride));

  for (let y = 0; y < h; y++) {
    scanlines[y * (1 + stride)] = 0; // filter = None
    scanlines.set(
      rgba.subarray(y * stride, (y + 1) * stride),
      y * (1 + stride) + 1
    );
  }

  const compressed = pako.deflate(scanlines);

  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = new Uint8Array(13);
  w32(ihdr, 0, w);
  w32(ihdr, 4, h);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const chunks = [
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', new Uint8Array(0)),
  ];

  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

/* ── Public API ───────────────────────────────────────── */

/**
 * Detect the dominant background color by sampling corner regions.
 * Corners are least likely to contain the garment.
 */
function detectBgColor(rgba: Uint8Array, w: number, h: number): { r: number; g: number; b: number } {
  const size = Math.min(Math.floor(Math.min(w, h) * 0.08), 30);
  const samples: [number, number, number][] = [];

  const corners = [
    [0, 0],
    [w - size, 0],
    [0, h - size],
    [w - size, h - size],
  ];

  for (const [cx, cy] of corners) {
    for (let y = cy; y < cy + size; y++) {
      for (let x = cx; x < cx + size; x++) {
        const idx = (y * w + x) * 4;
        if (rgba[idx + 3] > 128) {
          samples.push([rgba[idx], rgba[idx + 1], rgba[idx + 2]]);
        }
      }
    }
  }

  if (samples.length === 0) return { r: 255, g: 0, b: 255 };

  samples.sort((a, b) => a[0] - b[0]);
  const mid = Math.floor(samples.length / 2);
  const medR = samples[mid][0];

  samples.sort((a, b) => a[1] - b[1]);
  const medG = samples[mid][1];

  samples.sort((a, b) => a[2] - b[2]);
  const medB = samples[mid][2];

  return { r: medR, g: medG, b: medB };
}

/**
 * Remove all pixels matching the detected background color, with anti-aliased edges.
 */
function removeDetectedBg(
  rgba: Uint8Array,
  _w: number,
  _h: number,
  bg: { r: number; g: number; b: number },
  tolerance = 80,
  softEdge = 30
) {
  for (let i = 0; i < rgba.length; i += 4) {
    const dr = rgba[i] - bg.r;
    const dg = rgba[i + 1] - bg.g;
    const db = rgba[i + 2] - bg.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    if (dist < tolerance) {
      rgba[i + 3] = 0;
    } else if (dist < tolerance + softEdge) {
      const t = (dist - tolerance) / softEdge;
      rgba[i + 3] = Math.min(rgba[i + 3], Math.round(t * 255));
    }
  }
}

/**
 * Clear the bottom strip of the image to remove API watermarks.
 */
function stripWatermark(rgba: Uint8Array, w: number, h: number) {
  const stripH = Math.max(Math.ceil(h * 0.035), 20);
  for (let y = h - stripH; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      rgba[idx + 3] = 0;
    }
  }
}

/**
 * Automatically detect the background color from image corners,
 * remove it, and strip the API watermark.
 */
export function makeBackgroundTransparent(
  pngBase64: string,
  _mode: 'green' | 'white' | 'auto' = 'auto'
): string {
  try {
    const bytes = base64ToBytes(pngBase64);
    if (bytes[0] !== 137 || bytes[1] !== 80) {
      console.log('[PngTransparency] Not a PNG — skipping');
      return pngBase64;
    }

    const { w, h, rgba } = decodePNG(bytes);

    const bg = detectBgColor(rgba, w, h);
    console.log(`[PngTransparency] Detected bg: rgb(${bg.r},${bg.g},${bg.b})`);

    removeDetectedBg(rgba, w, h, bg, 80, 35);
    stripWatermark(rgba, w, h);

    let transparent = 0;
    const total = w * h;
    for (let i = 0; i < rgba.length; i += 4) {
      if (rgba[i + 3] < 128) transparent++;
    }
    const pct = transparent / total;
    console.log(`[PngTransparency] Removed ${(pct * 100).toFixed(1)}% of pixels`);

    if (pct < 0.03) {
      console.log('[PngTransparency] Too little removed — widening tolerance');
      const { w: w2, h: h2, rgba: rgba2 } = decodePNG(bytes);
      removeDetectedBg(rgba2, w2, h2, bg, 120, 40);
      stripWatermark(rgba2, w2, h2);
      return bytesToBase64(encodePNG(w2, h2, rgba2));
    }

    return bytesToBase64(encodePNG(w, h, rgba));
  } catch (err) {
    console.log('[PngTransparency] Error:', err instanceof Error ? err.message : err);
    return pngBase64;
  }
}
