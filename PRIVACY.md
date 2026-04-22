# Privacy Policy — Comparative Line Chart

_Last updated: 22 April 2026_

## Summary

**Comparative Line Chart does not collect, store, transmit or share any personal
or report data.** The visual runs entirely inside the Power BI sandbox on your
machine (Power BI Desktop, the Power BI Service, Power BI Mobile or Embedded),
and has no outbound network access of any kind.

## What data the visual sees

The visual is rendered by the Power BI host, which hands it the fields the
report author has bound to the **Period**, **Series A** and **Series B** wells.
These values are used **exclusively** to:

- render the SVG chart in the DOM element Power BI allocated to the visual;
- compute the cumulative totals and the comparison delta shown on screen;
- produce tooltips and context-menu selection identifiers.

## What data leaves the visual

**None.**

- No telemetry, analytics, crash reports or pings.
- No external HTTP, WebSocket, image, font or script request.
- No cookies, `localStorage`, `sessionStorage` or `IndexedDB` reads or writes.
- No use of `fetch`, `XMLHttpRequest`, `navigator.sendBeacon` or any other
  network API.
- No access to the clipboard, camera, microphone, geolocation or any other
  user-sensitive browser API.

The only persisted state is the tiny JSON object describing the current
comparison range (two indices and an on/off flag), which Power BI saves inside
your `.pbix` / report definition via the official `persistProperties` API. That
object stays in your report file and is never sent anywhere by the visual.

## Permissions declared in `capabilities.json`

The visual declares **no** `privileges` block — i.e. it requests no WebAccess,
no LocalStorage and no ExportContent permission.

## Third-party libraries

The visual is bundled with:

- **D3.js** (BSD-3-Clause) — rendering only, no network calls.
- **powerbi-visuals-api** — the Power BI host API surface.
- **powerbi-visuals-utils-formattingmodel** /
  **powerbi-visuals-utils-formattingutils** — format pane and value formatting
  helpers.

None of these libraries emit network traffic when used as they are in this
visual.

## Contact

Privacy questions, security reports or general enquiries:
**karar.sammy@outlook.fr**
Issues and feature requests:
**https://github.com/iLoveMyData/comparative-line-chart/issues**
