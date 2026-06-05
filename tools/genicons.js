// Generates GameHub PWA icons as PNGs (no external libs — pure Node + zlib).
// Draws a gradient rounded tile with a white game-controller mark, supersampled
// for smooth edges. Run: node tools/genicons.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ---- PNG encoding ----------------------------------------------------------
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // no filter
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---- Vector drawing helpers (operate at supersampled resolution) -----------
const lerp = (a, b, t) => a + (b - a) * t;
function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
const A = hex('#ff6b9a'), B = hex('#a78bfa'), C = hex('#4ec3ff'); // pink → purple → blue

// Diagonal 3-stop gradient at normalized point (u,v in 0..1)
function bg(u, v) {
  const t = Math.max(0, Math.min(1, (u + v) / 2));
  let r, g, b;
  if (t < 0.5) { const k = t / 0.5; r = lerp(A[0], B[0], k); g = lerp(A[1], B[1], k); b = lerp(A[2], B[2], k); }
  else { const k = (t - 0.5) / 0.5; r = lerp(B[0], C[0], k); g = lerp(B[1], C[1], k); b = lerp(B[2], C[2], k); }
  return [r, g, b];
}
// distance from point to axis-aligned rounded rect (negative inside)
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r), qy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

// Is (nx,ny) (normalized 0..1) inside the white controller mark?
function controller(nx, ny) {
  // body capsule
  const inBody = sdRoundRect(nx, ny, 0.5, 0.52, 0.30, 0.165, 0.165) < 0;
  if (!inBody) return false;
  // punch out d-pad (plus) on the left
  const dpadH = sdRoundRect(nx, ny, 0.37, 0.52, 0.085, 0.028, 0.01) < 0;
  const dpadV = sdRoundRect(nx, ny, 0.37, 0.52, 0.028, 0.085, 0.01) < 0;
  if (dpadH || dpadV) return false;
  // punch out two round buttons on the right
  if (Math.hypot(nx - 0.605, ny - 0.47) < 0.045) return false;
  if (Math.hypot(nx - 0.67, ny - 0.575) < 0.045) return false;
  return true;
}

function render(size, { maskable }) {
  const S = 4, SS = size * S;                 // supersample
  const acc = new Float32Array(size * size * 4);
  const tileR = 0.20 * SS;                     // corner radius (rounded icons)
  for (let y = 0; y < SS; y++) {
    for (let x = 0; x < SS; x++) {
      const nx = x / SS, ny = y / SS;
      let r = 0, g = 0, b = 0, a = 0;
      const inTile = maskable ? true : (sdRoundRect(x, y, SS / 2, SS / 2, SS / 2, SS / 2, tileR) < 0);
      if (inTile) {
        const [br, bgc, bb] = bg(nx, ny);
        r = br; g = bgc; b = bb; a = 255;
        if (controller(nx, ny)) { r = 255; g = 255; b = 255; }
      }
      // accumulate into downsampled pixel
      const dx = (x / S) | 0, dy = (y / S) | 0, di = (dy * size + dx) * 4;
      acc[di] += r; acc[di + 1] += g; acc[di + 2] += b; acc[di + 3] += a;
    }
  }
  const out = Buffer.alloc(size * size * 4);
  const n = S * S;
  for (let i = 0; i < size * size; i++) {
    out[i * 4] = Math.round(acc[i * 4] / n);
    out[i * 4 + 1] = Math.round(acc[i * 4 + 1] / n);
    out[i * 4 + 2] = Math.round(acc[i * 4 + 2] / n);
    out[i * 4 + 3] = Math.round(acc[i * 4 + 3] / n);
  }
  return encodePNG(size, size, out);
}

const dir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(dir, { recursive: true });
const jobs = [
  ['icon-192.png', 192, { maskable: false }],
  ['icon-512.png', 512, { maskable: false }],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: true }],
];
for (const [name, size, opts] of jobs) {
  fs.writeFileSync(path.join(dir, name), render(size, opts));
  console.log('wrote icons/' + name + ' (' + size + 'px)');
}
