#!/usr/bin/env node
/*
 * Generates the icon set with no dependencies — raw RGBA buffers encoded to
 * PNG with the built-in zlib. The mark is ten rounded slots in a 2x5 grid,
 * nine filled mint and the last one gold: ten to fill, one still open.
 *
 * Usage: node tools/make-icons.js
 */
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const BG = [0x10, 0x14, 0x18], MINT = [0x5f, 0xd3, 0xa8], GOLD = [0xe4, 0xb9, 0x5e];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}
function draw(size) {
  const buf = Buffer.alloc(size * size * 4);
  const put = (x, y, c) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const o = (y * size + x) * 4;
    buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; buf[o + 3] = 255;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) put(x, y, BG);

  // 2 rows x 5 cols of rounded slots, inset from the edges.
  const pad = Math.round(size * 0.17), gap = Math.max(1, Math.round(size * 0.035));
  const cw = (size - pad * 2 - gap * 4) / 5, ch = (size - pad * 2 - gap) / 2;
  const r = Math.max(1, Math.round(Math.min(cw, ch) * 0.28));
  for (let i = 0; i < 10; i++) {
    const col = i % 5, row = Math.floor(i / 5);
    const x0 = pad + col * (cw + gap), y0 = pad + row * (ch + gap);
    const colour = i === 9 ? GOLD : MINT;
    for (let y = Math.floor(y0); y < Math.ceil(y0 + ch); y++) {
      for (let x = Math.floor(x0); x < Math.ceil(x0 + cw); x++) {
        const dx = Math.min(x - x0, x0 + cw - 1 - x), dy = Math.min(y - y0, y0 + ch - 1 - y);
        if (dx < r && dy < r && (r - dx) ** 2 + (r - dy) ** 2 > r * r) continue; // rounded corner
        put(x, y, colour);
      }
    }
  }
  return buf;
}

const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });
const files = { 'favicon-16.png': 16, 'favicon-32.png': 32, 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180 };
for (const [name, size] of Object.entries(files)) {
  fs.writeFileSync(path.join(out, name), png(size, draw(size)));
  console.log(`  ${name} (${size}x${size})`);
}
console.log('icons written');
