// Minimal PNG reader for the headless proofs: just enough of the format to
// sample real pixels out of a Playwright screenshot. RGBA, 8 bit, non
// interlaced — which is what Playwright writes. No third-party dependency, so
// the offline build keeps working.
import { inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error("not a PNG");
  let width = 0, height = 0, colorType = 0, bitDepth = 0, interlace = 0;
  const idat = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    offset += 12 + length;
  }
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`unsupported PNG: depth ${bitDepth} colour ${colorType} interlace ${interlace}`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);
  let source = 0;
  for (let row = 0; row < height; row++) {
    const filter = raw[source++];
    const line = raw.subarray(source, source + stride);
    source += stride;
    const target = out.subarray(row * stride, row * stride + stride);
    const previous = row > 0 ? out.subarray((row - 1) * stride, row * stride) : null;
    for (let column = 0; column < stride; column++) {
      const rawByte = line[column];
      const left = column >= channels ? target[column - channels] : 0;
      const up = previous ? previous[column] : 0;
      const upLeft = previous && column >= channels ? previous[column - channels] : 0;
      let value = rawByte;
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) value += paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`unknown PNG filter ${filter}`);
      target[column] = value & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

/** Alpha of one pixel, 0 = fully transparent. */
export function alphaAt(image, x, y) {
  const column = Math.min(image.width - 1, Math.max(0, Math.round(x)));
  const row = Math.min(image.height - 1, Math.max(0, Math.round(y)));
  const index = (row * image.width + column) * image.channels;
  return image.channels === 4 ? image.data[index + 3] : 255;
}