// Generates assets/icon.png — a branded 300x300 icon for the visual selector.
// Uses only Node built-ins (fs + zlib) so no extra dependency is required.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const W = 300, H = 300;
const buf = Buffer.alloc(W * H * 4, 0); // RGBA, starts transparent

function setPx(x, y, r, g, b, a) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    if (a <= 0) return;
    const i = (y * W + x) * 4;
    const af = a / 255;
    const ea = buf[i + 3] / 255;
    const na = af + ea * (1 - af);
    if (na < 1e-4) return;
    buf[i]     = Math.round((r * af + buf[i]     * ea * (1 - af)) / na);
    buf[i + 1] = Math.round((g * af + buf[i + 1] * ea * (1 - af)) / na);
    buf[i + 2] = Math.round((b * af + buf[i + 2] * ea * (1 - af)) / na);
    buf[i + 3] = Math.min(255, Math.round(na * 255));
}

// Anti-aliased filled disc
function disc(cx, cy, radius, r, g, b, alpha = 255) {
    const x0 = Math.floor(cx - radius - 1), x1 = Math.ceil(cx + radius + 1);
    const y0 = Math.floor(cy - radius - 1), y1 = Math.ceil(cy + radius + 1);
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > radius + 0.5) continue;
            let a = 1.0;
            if (d > radius - 0.5) a = radius + 0.5 - d;
            setPx(x, y, r, g, b, Math.round(a * alpha));
        }
    }
}

// Filled rounded rectangle
function rrect(x, y, w, h, radius, r, g, b, alpha = 255) {
    for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
            let cx = null, cy = null;
            if (px < x + radius && py < y + radius)        { cx = x + radius;         cy = y + radius; }
            else if (px >= x + w - radius && py < y + radius) { cx = x + w - radius - 1; cy = y + radius; }
            else if (px < x + radius && py >= y + h - radius) { cx = x + radius;         cy = y + h - radius - 1; }
            else if (px >= x + w - radius && py >= y + h - radius) { cx = x + w - radius - 1; cy = y + h - radius - 1; }
            if (cx === null) { setPx(px, py, r, g, b, alpha); continue; }
            const dx = px + 0.5 - (cx + 0.5), dy = py + 0.5 - (cy + 0.5);
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d <= radius - 0.5)      setPx(px, py, r, g, b, alpha);
            else if (d <= radius + 0.5) setPx(px, py, r, g, b, Math.round((radius + 0.5 - d) * alpha));
        }
    }
}

// Anti-aliased stroked cubic bezier (sampled discs)
function bezier(p0, p1, p2, p3, thickness, r, g, b, steps = 600) {
    for (let i = 0; i <= steps; i++) {
        const t = i / steps, it = 1 - t;
        const x = it * it * it * p0[0] + 3 * it * it * t * p1[0] + 3 * it * t * t * p2[0] + t * t * t * p3[0];
        const y = it * it * it * p0[1] + 3 * it * it * t * p1[1] + 3 * it * t * t * p2[1] + t * t * t * p3[1];
        disc(x, y, thickness / 2, r, g, b);
    }
}

// Dashed variant: skip alternating ranges
function bezierDashed(p0, p1, p2, p3, thickness, r, g, b, dash = 18, gap = 10, steps = 600) {
    const cycle = dash + gap;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const approxLen = t * 320; // rough path length
        if ((approxLen % cycle) > dash) continue;
        const it = 1 - t;
        const x = it * it * it * p0[0] + 3 * it * it * t * p1[0] + 3 * it * t * t * p2[0] + t * t * t * p3[0];
        const y = it * it * it * p0[1] + 3 * it * it * t * p1[1] + 3 * it * t * t * p2[1] + t * t * t * p3[1];
        disc(x, y, thickness / 2, r, g, b);
    }
}

// --- Compose the icon ---

// Deep navy rounded background (brand neutral)
rrect(0, 0, W, H, 52, 20, 22, 46, 255);

// Soft inner card
rrect(18, 18, W - 36, H - 36, 40, 255, 255, 255, 255);

// Grid line (subtle) — horizontal mid reference
rrect(42, 168, W - 84, 2, 0, 235, 235, 246, 255);
rrect(42, 110, W - 84, 2, 0, 235, 235, 246, 255);

// Forecast (purple) dashed cumulative — ascending from bottom-left
bezierDashed([40, 220], [100, 200], [180, 150], [258, 100], 10, 126, 69, 255, 16, 10);

// Actual (pink) solid cumulative — ascending more steeply
bezier([40, 230], [90, 215], [170, 110], [258, 65], 12, 240, 71, 122);

// Endpoint markers
disc(40, 230, 9, 240, 71, 122);
disc(258, 65, 9, 240, 71, 122);
disc(40, 220, 8, 126, 69, 255);
disc(258, 100, 8, 126, 69, 255);

// Central markers on actual curve (highlight the "period" concept)
disc(130, 160, 6, 240, 71, 122);
disc(205, 100, 6, 240, 71, 122);

// --- PNG encoding ---
function crc32(buffer) {
    let crc = 0xffffffff;
    for (let i = 0; i < buffer.length; i++) {
        let c = (crc ^ buffer[i]) & 0xff;
        for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
        crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr.writeUInt8(8, 8);  // bit depth
ihdr.writeUInt8(6, 9);  // color type = RGBA
ihdr.writeUInt8(0, 10); // compression
ihdr.writeUInt8(0, 11); // filter
ihdr.writeUInt8(0, 12); // interlace

// Add filter byte 0 per scanline
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
    raw[(W * 4 + 1) * y] = 0;
    buf.copy(raw, (W * 4 + 1) * y + 1, y * W * 4, (y + 1) * W * 4);
}
const idat = zlib.deflateSync(raw, { level: 9 });

const png = Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0))
]);

const outPath = path.resolve(__dirname, "..", "assets", "icon.png");
fs.writeFileSync(outPath, png);
console.log("Wrote", outPath, png.length, "bytes");
