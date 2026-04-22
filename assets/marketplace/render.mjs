// Render logo.svg to several PNG sizes using @resvg/resvg-js.
// Run:  node render.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const svg = readFileSync("logo.svg", "utf8");
const sizes = [
    { w: 300, name: "logo-300.png" },
    { w: 216, name: "logo-216.png" },
    { w: 150, name: "logo-150.png" },
    { w: 90,  name: "logo-90.png"  },
    { w: 48,  name: "logo-48.png"  },
];

for (const { w, name } of sizes) {
    const rsvg = new Resvg(svg, {
        fitTo: { mode: "width", value: w },
        background: "rgba(0,0,0,0)",
        shapeRendering: 2,     // geometricPrecision
        textRendering: 1,      // optimizeLegibility
        imageRendering: 0,
    });
    const png = rsvg.render().asPng();
    writeFileSync(name, png);
    console.log(`${name} → ${png.length.toLocaleString()} bytes`);
}
