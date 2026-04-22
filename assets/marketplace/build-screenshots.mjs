// Build two AppSource screenshot mockups (1366x768 PNG) that faithfully
// reproduce the Comparative Line Chart visual in two states:
//   screenshot-1.png — Comparison OFF (pristine dual cumulative line chart)
//   screenshot-2.png — Comparison ON, analysed period 3 -> 6
//
// Run:  node build-screenshots.mjs
import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

// ---------- Data: cumulative year-to-date for 2024 ----------
const monthlyA = [48000, 52000, 55000, 58000, 62000, 65000, 42000, 55000, 60000, 72000, 85000, 95000];
const monthlyB = [50000, 51000, 52000, 54000, 56000, 58000, 60000, 62000, 63000, 65000, 68000, 72000];
const cum = arr => { let s = 0; return arr.map(v => (s += v)); };
const cumA = cum(monthlyA);
const cumB = cum(monthlyB);

// ---------- Visual constants ----------
const C = {
    navy:    "#0B1E3B",
    slate:   "#334155",
    slateLt: "#64748B",
    muted:   "#94A3B8",
    grid:    "#E2E8F0",
    blue:    "#1E90FF",
    green:   "#8BC34A",
    greenDk: "#4CAF50",
    bandFill:"#EEF2FF",
    bandStr: "#CBD5E1",
    pillBg:  "#F1F5F9",
    pillBr:  "#CBD5E1",
    white:   "#FFFFFF",
    toggleOff:"#CBD5E1",
    toggleOn: "#1E90FF",
};

const FONT = "'Segoe UI','Helvetica Neue',Arial,sans-serif";

// Smooth path via Catmull-Rom -> cubic Bezier (tension 0).
// Returns a string starting with "M x0 y0 C ..." for the given points.
function smoothPath(points) {
    if (points.length < 2) return "";
    const [p0] = points;
    const parts = [`M ${p0[0].toFixed(2)} ${p0[1].toFixed(2)}`];
    const n = points.length;
    for (let i = 0; i < n - 1; i++) {
        const p_prev = points[Math.max(0, i - 1)];
        const p_cur  = points[i];
        const p_next = points[i + 1];
        const p_after= points[Math.min(n - 1, i + 2)];
        const c1x = p_cur[0] + (p_next[0] - p_prev[0]) / 6;
        const c1y = p_cur[1] + (p_next[1] - p_prev[1]) / 6;
        const c2x = p_next[0] - (p_after[0] - p_cur[0]) / 6;
        const c2y = p_next[1] - (p_after[1] - p_cur[1]) / 6;
        parts.push(
            `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ` +
            `${c2x.toFixed(2)} ${c2y.toFixed(2)}, ` +
            `${p_next[0].toFixed(2)} ${p_next[1].toFixed(2)}`
        );
    }
    return parts.join(" ");
}

// Slice a smooth path to only the segment covering [fromIdx, toIdx] (inclusive).
function smoothPathSlice(points, fromIdx, toIdx) {
    return smoothPath(points.slice(fromIdx, toIdx + 1));
}

// Slice to the OUTSIDE portion (two separate paths joined with "M" moves).
function smoothPathOutside(points, fromIdx, toIdx) {
    const parts = [];
    if (fromIdx > 0) parts.push(smoothPath(points.slice(0, fromIdx + 1)));
    if (toIdx < points.length - 1) parts.push(smoothPath(points.slice(toIdx)));
    return parts.join(" ");
}

// ---------- Scales ----------
const W = 1366, H = 768;

// Chart area for screenshot 1 (no side panel)
const chart1 = { x: 92, y: 170, w: 1215, h: 510, yMax: 800000 };
// Chart area for screenshot 2 (side panel on the right)
const chart2 = { x: 92, y: 200, w: 870,  h: 480, yMax: 800000 };

function pointsFor(chart, values) {
    const n = values.length;
    const dx = chart.w / (n - 1);
    return values.map((v, i) => [
        chart.x + i * dx,
        chart.y + chart.h - (v / chart.yMax) * chart.h,
    ]);
}

function xAt(chart, i, n) {
    return chart.x + (i / (n - 1)) * chart.w;
}

// ---------- Screenshot 1: Comparison OFF ----------
function buildScreenshot1() {
    const ptsA = pointsFor(chart1, cumA);
    const ptsB = pointsFor(chart1, cumB);

    const gridLevels = [0, 200000, 400000, 600000, 800000];
    const yTicks = gridLevels.map(v => ({
        y: chart1.y + chart1.h - (v / chart1.yMax) * chart1.h,
        label: v === 0 ? "0" : v.toLocaleString("fr-FR").replace(/\u00A0/g, " "),
    }));
    const n = cumA.length;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="geometricPrecision">
  <rect width="${W}" height="${H}" fill="${C.white}"/>

  <!-- Title -->
  <text x="60" y="62" font-family="${FONT}" font-size="30" font-weight="700" fill="${C.navy}">Comparative Line Chart</text>

  <!-- Legend -->
  <g font-family="${FONT}" font-size="15" fill="${C.slate}">
    <rect x="60"  y="92" width="14" height="14" rx="2" fill="${C.blue}"/>
    <text x="82"  y="105">Actual</text>
    <rect x="148" y="92" width="14" height="14" rx="2" fill="${C.green}"/>
    <text x="170" y="105">Budget</text>
  </g>

  <!-- Comparison toggle (OFF) -->
  <g font-family="${FONT}">
    <text x="${W - 140}" y="105" font-size="15" fill="${C.slateLt}">Comparison</text>
    <g transform="translate(${W - 62}, 92)">
      <rect x="0" y="0" width="40" height="22" rx="11" fill="${C.toggleOff}"/>
      <circle cx="11" cy="11" r="8" fill="${C.white}"/>
    </g>
  </g>

  <!-- Grid lines -->
  <g stroke="${C.grid}" stroke-width="1">
    ${yTicks.map(t => `<line x1="${chart1.x}" y1="${t.y}" x2="${chart1.x + chart1.w}" y2="${t.y}"/>`).join("\n    ")}
  </g>

  <!-- Y axis labels -->
  <g font-family="${FONT}" font-size="14" fill="${C.muted}" text-anchor="end">
    ${yTicks.map(t => `<text x="${chart1.x - 12}" y="${t.y + 5}">${t.label}</text>`).join("\n    ")}
  </g>

  <!-- X axis labels (1..12) -->
  <g font-family="${FONT}" font-size="14" fill="${C.muted}" text-anchor="middle">
    ${Array.from({ length: n }, (_, i) =>
        `<text x="${xAt(chart1, i, n).toFixed(1)}" y="${chart1.y + chart1.h + 28}">${i + 1}</text>`
    ).join("\n    ")}
  </g>

  <!-- Curves -->
  <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="3">
    <path d="${smoothPath(ptsB)}" stroke="${C.green}"/>
    <path d="${smoothPath(ptsA)}" stroke="${C.blue}"/>
  </g>
</svg>`;
}

// ---------- Screenshot 2: Comparison ON, range 3 -> 6 (1-based) ----------
function buildScreenshot2() {
    const fromIdx = 2;  // month 3 (0-based index 2)
    const toIdx   = 5;  // month 6
    const ptsA = pointsFor(chart2, cumA);
    const ptsB = pointsFor(chart2, cumB);

    const gridLevels = [0, 200000, 400000, 600000, 800000];
    const yTicks = gridLevels.map(v => ({
        y: chart2.y + chart2.h - (v / chart2.yMax) * chart2.h,
        label: v === 0 ? "0" : v.toLocaleString("fr-FR").replace(/\u00A0/g, " "),
    }));
    const n = cumA.length;

    // Sum over the analysed period (inclusive). These match the side panel in the visual.
    const sumA = monthlyA.slice(fromIdx, toIdx + 1).reduce((s, v) => s + v, 0); // 240000
    const sumB = monthlyB.slice(fromIdx, toIdx + 1).reduce((s, v) => s + v, 0); // 220000
    const delta = sumA - sumB;                                                   // +20000
    const deltaPct = (delta / sumB) * 100;                                       // 9.09%
    const fmt = v => v.toLocaleString("fr-FR").replace(/\u00A0/g, " ");

    const xFrom = xAt(chart2, fromIdx, n);
    const xTo   = xAt(chart2, toIdx,   n);
    const bandY1 = chart2.y;
    const bandY2 = chart2.y + chart2.h;

    // Side panel position
    const panelX = 1020;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="geometricPrecision">
  <rect width="${W}" height="${H}" fill="${C.white}"/>

  <!-- Title -->
  <text x="60" y="62" font-family="${FONT}" font-size="30" font-weight="700" fill="${C.navy}">Comparative Line Chart</text>

  <!-- Row 1: Analysed period dropdowns (left) + Comparison ON (right) -->
  <g font-family="${FONT}" font-size="15" fill="${C.slateLt}">
    <text x="60" y="108">Analyzed period:</text>
    <!-- Dropdown "3" -->
    <g transform="translate(188, 92)">
      <rect x="0" y="0" width="54" height="26" rx="13" fill="${C.white}" stroke="${C.pillBr}"/>
      <text x="16" y="18" font-size="14" fill="${C.slate}">3</text>
      <path d="M 38 11 l 4 4 l 4 -4" stroke="${C.slateLt}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <text x="250" y="110" font-size="16" fill="${C.slateLt}">—</text>
    <!-- Dropdown "6" -->
    <g transform="translate(268, 92)">
      <rect x="0" y="0" width="54" height="26" rx="13" fill="${C.white}" stroke="${C.pillBr}"/>
      <text x="16" y="18" font-size="14" fill="${C.slate}">6</text>
      <path d="M 38 11 l 4 4 l 4 -4" stroke="${C.slateLt}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>

  <!-- Comparison toggle (ON) -->
  <g font-family="${FONT}">
    <text x="${W - 140}" y="108" font-size="15" fill="${C.toggleOn}" font-weight="600">Comparison</text>
    <g transform="translate(${W - 62}, 95)">
      <rect x="0" y="0" width="40" height="22" rx="11" fill="${C.toggleOn}"/>
      <circle cx="29" cy="11" r="8" fill="${C.white}"/>
    </g>
  </g>

  <!-- Row 2: Legend -->
  <g font-family="${FONT}" font-size="15" fill="${C.slate}">
    <rect x="60"  y="138" width="14" height="14" rx="2" fill="${C.blue}"/>
    <text x="82"  y="151">Actual</text>
    <rect x="148" y="138" width="14" height="14" rx="2" fill="${C.green}"/>
    <text x="170" y="151">Budget</text>
  </g>

  <!-- Comparison band -->
  <rect x="${xFrom}" y="${bandY1}" width="${xTo - xFrom}" height="${bandY2 - bandY1}"
        fill="${C.bandFill}" stroke="none"/>
  <!-- Handles -->
  <g stroke="${C.slate}" stroke-width="1.5">
    <line x1="${xFrom}" y1="${bandY1}" x2="${xFrom}" y2="${bandY2}"/>
    <line x1="${xTo}"   y1="${bandY1}" x2="${xTo}"   y2="${bandY2}"/>
  </g>

  <!-- Grid -->
  <g stroke="${C.grid}" stroke-width="1">
    ${yTicks.map(t => `<line x1="${chart2.x}" y1="${t.y}" x2="${chart2.x + chart2.w}" y2="${t.y}"/>`).join("\n    ")}
  </g>

  <!-- Y axis labels -->
  <g font-family="${FONT}" font-size="14" fill="${C.muted}" text-anchor="end">
    ${yTicks.map(t => `<text x="${chart2.x - 12}" y="${t.y + 5}">${t.label}</text>`).join("\n    ")}
  </g>

  <!-- X axis labels -->
  <g font-family="${FONT}" font-size="14" fill="${C.muted}" text-anchor="middle">
    ${Array.from({ length: n }, (_, i) =>
        `<text x="${xAt(chart2, i, n).toFixed(1)}" y="${chart2.y + chart2.h + 28}">${i + 1}</text>`
    ).join("\n    ")}
  </g>

  <!-- Curves: dashed outside range, solid within -->
  <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="3">
    <path d="${smoothPathOutside(ptsB, fromIdx, toIdx)}" stroke="${C.green}" stroke-dasharray="6 6" stroke-opacity="0.75"/>
    <path d="${smoothPathOutside(ptsA, fromIdx, toIdx)}" stroke="${C.blue}"  stroke-dasharray="6 6" stroke-opacity="0.75"/>
    <path d="${smoothPathSlice(ptsB, fromIdx, toIdx)}"   stroke="${C.green}"/>
    <path d="${smoothPathSlice(ptsA, fromIdx, toIdx)}"   stroke="${C.blue}"/>
  </g>

  <!-- Endpoint markers at the two handles -->
  <g>
    <circle cx="${ptsA[fromIdx][0]}" cy="${ptsA[fromIdx][1]}" r="7" fill="${C.white}" stroke="${C.blue}"  stroke-width="2.5"/>
    <circle cx="${ptsA[toIdx][0]}"   cy="${ptsA[toIdx][1]}"   r="7" fill="${C.white}" stroke="${C.blue}"  stroke-width="2.5"/>
    <circle cx="${ptsB[fromIdx][0]}" cy="${ptsB[fromIdx][1]}" r="7" fill="${C.white}" stroke="${C.green}" stroke-width="2.5"/>
    <circle cx="${ptsB[toIdx][0]}"   cy="${ptsB[toIdx][1]}"   r="7" fill="${C.white}" stroke="${C.green}" stroke-width="2.5"/>
  </g>

  <!-- Side panel separator -->
  <line x1="${panelX - 20}" y1="${chart2.y - 10}" x2="${panelX - 20}" y2="${chart2.y + chart2.h}"
        stroke="${C.grid}" stroke-width="1"/>

  <!-- Side panel -->
  <g font-family="${FONT}">
    <text x="${panelX}" y="${chart2.y + 18}" font-size="22" font-weight="700" fill="${C.navy}">Over this period</text>

    <text x="${panelX}" y="${chart2.y + 90}"  font-size="15" fill="${C.slateLt}">Actual</text>
    <text x="${panelX}" y="${chart2.y + 132}" font-size="36" font-weight="700" fill="${C.navy}">${fmt(sumA)}</text>

    <text x="${panelX}" y="${chart2.y + 218}" font-size="15" fill="${C.slateLt}">Budget</text>
    <text x="${panelX}" y="${chart2.y + 260}" font-size="36" font-weight="700" fill="${C.navy}">${fmt(sumB)}</text>

    <text x="${panelX}" y="${chart2.y + 346}" font-size="15" fill="${C.slateLt}">Delta</text>
    <!-- Up-arrow + delta value -->
    <g transform="translate(${panelX}, ${chart2.y + 388})">
      <path d="M 0 0 l 11 -14 l 11 14 z" fill="${C.greenDk}"/>
      <text x="30" y="0" font-size="32" font-weight="700" fill="${C.greenDk}">+${fmt(delta)} (${deltaPct.toFixed(1).replace(".", ",")}%)</text>
    </g>
  </g>
</svg>`;
}

// ---------- Render ----------
const jobs = [
    { name: "screenshot-1", svg: buildScreenshot1() },
    { name: "screenshot-2", svg: buildScreenshot2() },
];

for (const { name, svg } of jobs) {
    writeFileSync(`${name}.svg`, svg);
    const rsvg = new Resvg(svg, {
        fitTo: { mode: "width", value: W },
        background: "#FFFFFF",
        shapeRendering: 2,
        textRendering: 1,
    });
    const png = rsvg.render().asPng();
    writeFileSync(`${name}.png`, png);
    console.log(`${name}.png -> ${png.length.toLocaleString()} bytes`);
}
