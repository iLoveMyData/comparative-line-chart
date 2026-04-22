import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";

import DataView = powerbi.DataView;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ITooltipService = powerbi.extensibility.ITooltipService;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;

import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { valueFormatter as vf } from "powerbi-visuals-utils-formattingutils";

import { VisualSettings } from "./settings";
import { transform, ChartData, ChartPoint } from "./dataTransformer";

import "./../style/visual.less";

const CURVE_MAP: Record<string, d3.CurveFactory> = {
    monotone: d3.curveMonotoneX,
    natural: d3.curveNatural,
    catmull: d3.curveCatmullRom.alpha(0.5) as unknown as d3.CurveFactory,
    linear: d3.curveLinear,
    step: d3.curveStepAfter
};

const EASING_MAP: Record<string, (t: number) => number> = {
    polyOut: d3.easePolyOut.exponent(4),
    cubicOut: d3.easeCubicOut,
    expoOut: d3.easeExpOut,
    backOut: d3.easeBackOut.overshoot(1.6),
    elasticOut: d3.easeElasticOut.amplitude(1).period(0.45),
    linear: d3.easeLinear
};

const MIN_DUR = 50;
const ROOT_PAD_X = 12;
const ROOT_PAD_Y = 10;
const SCALE_MIN = 0.55;
const SCALE_MAX = 1.15;
const SCALE_REF_W = 520;
const SCALE_REF_H = 340;
const TT_MOVE_MS = 160;

type ColorBag = {
    a: string; f: string; muted: string; grid: string;
    zone: string; delim: string;
    tgOff: string; tgOn: string; tgLblOff: string; tgLblOn: string;
    ttBg: string; ttText: string; ttLine: string;
    panelVal: string; panelHead: string; panelLbl: string; panelSep: string; panelBg: string;
    pos: string; neg: string;
    dropBorder: string; dropBg: string; dropText: string;
    dropHover: string; dropSelBg: string; dropSelText: string;
};

export class Visual implements IVisual {
    private host: IVisualHost;
    private events: IVisualEventService;
    private tooltipService: ITooltipService;
    private selectionManager: ISelectionManager;
    private localization: ILocalizationManager;
    private colorPalette: ISandboxExtendedColorPalette;
    private settingsService: FormattingSettingsService;
    private settings: VisualSettings;

    private rootEl: HTMLDivElement;
    private emptyEl: HTMLDivElement;
    private titleEl: HTMLDivElement;
    private topbarEl: HTMLDivElement;
    private topRow1El: HTMLDivElement;
    private topRow2El: HTMLDivElement;
    private row1SlotEl: HTMLDivElement;   // hosts legend or period selector
    private row2SlotEl: HTMLDivElement;   // hosts legend when period is in row 1
    private toggleEl: HTMLDivElement;
    private togglePillEl: HTMLDivElement;
    private toggleThumbEl: HTMLDivElement;
    private toggleTextEl: HTMLSpanElement;
    private periodLblEl: HTMLSpanElement;
    private chartWrapEl: HTMLDivElement;
    private chartEl: HTMLDivElement;
    private chartSvgEl: SVGSVGElement;
    private panelEl: HTMLDivElement;

    private compareOn = false;
    private fromIdx = 1;
    private toIdx = 2;
    private lastSignature = "";
    private stateLoaded = false;
    private suppressPersist = false;
    private counterTimers: number[] = [];
    private cachedData: ChartData | null = null;
    private viewportW = 0;
    private viewportH = 0;
    private scale = 1;
    private panelPrev = { a: 0, f: 0, d: 0 };
    private idCounter = 0;
    private openDropMenu: HTMLElement | null = null;
    private dropDocHandler: ((e: Event) => void) | null = null;
    private lastPanelVisible = false;
    private panelHideTimer: number | null = null;
    private measureCtx: CanvasRenderingContext2D | null = null;

    private nextId(prefix: string): string {
        this.idCounter = (this.idCounter + 1) | 0;
        return `${prefix}-${this.idCounter}`;
    }

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.tooltipService = options.host.tooltipService;
        this.selectionManager = options.host.createSelectionManager();
        this.localization = options.host.createLocalizationManager();
        this.colorPalette = options.host.colorPalette;
        this.settingsService = new FormattingSettingsService(this.localization);

        this.buildDOM(options.element);
    }

    private clearChildren(el: Element): void {
        while (el.firstChild) el.removeChild(el.firstChild);
    }

    private loc(key: string, fallback: string): string {
        try { return this.localization.getDisplayName(key) || fallback; }
        catch { return fallback; }
    }

    private sc(v: number): number {
        return Math.max(1, Math.round(v * this.scale));
    }

    private buildDOM(container: HTMLElement): void {
        this.clearChildren(container);

        this.rootEl = document.createElement("div");
        this.rootEl.className = "clc-root";
        this.rootEl.setAttribute("role", "figure");
        container.appendChild(this.rootEl);

        this.emptyEl = document.createElement("div");
        this.emptyEl.className = "clc-empty";
        this.emptyEl.style.display = "none";
        this.rootEl.appendChild(this.emptyEl);

        this.titleEl = document.createElement("div");
        this.titleEl.className = "clc-title";
        this.rootEl.appendChild(this.titleEl);

        this.topbarEl = document.createElement("div");
        this.topbarEl.className = "clc-topbar";
        this.rootEl.appendChild(this.topbarEl);

        this.topRow1El = document.createElement("div");
        this.topRow1El.className = "clc-top-row-1";
        this.topbarEl.appendChild(this.topRow1El);

        this.row1SlotEl = document.createElement("div");
        this.row1SlotEl.className = "clc-row-slot clc-row-slot-1";
        this.topRow1El.appendChild(this.row1SlotEl);

        this.periodLblEl = document.createElement("span");
        this.periodLblEl.className = "clc-period-lbl";

        this.toggleEl = document.createElement("div");
        this.toggleEl.className = "clc-toggle";
        this.topRow1El.appendChild(this.toggleEl);

        this.toggleTextEl = document.createElement("span");
        this.toggleTextEl.className = "clc-tg-label";
        this.toggleEl.appendChild(this.toggleTextEl);

        this.togglePillEl = document.createElement("div");
        this.togglePillEl.className = "clc-tg-pill";
        this.togglePillEl.setAttribute("role", "switch");
        this.togglePillEl.setAttribute("aria-checked", "false");
        this.togglePillEl.setAttribute("tabindex", "0");

        this.toggleThumbEl = document.createElement("div");
        this.toggleThumbEl.className = "clc-tg-thumb";
        this.togglePillEl.appendChild(this.toggleThumbEl);
        this.toggleEl.appendChild(this.togglePillEl);

        this.topRow2El = document.createElement("div");
        this.topRow2El.className = "clc-top-row-2";
        this.topbarEl.appendChild(this.topRow2El);

        this.row2SlotEl = document.createElement("div");
        this.row2SlotEl.className = "clc-row-slot clc-row-slot-2";
        this.topRow2El.appendChild(this.row2SlotEl);

        this.chartWrapEl = document.createElement("div");
        this.chartWrapEl.className = "clc-chart-wrap";
        this.rootEl.appendChild(this.chartWrapEl);

        this.chartEl = document.createElement("div");
        this.chartEl.className = "clc-chart-box";
        this.chartWrapEl.appendChild(this.chartEl);

        this.chartSvgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.chartSvgEl.setAttribute("class", "clc-chart");
        this.chartSvgEl.setAttribute("role", "img");
        this.chartEl.appendChild(this.chartSvgEl);

        this.panelEl = document.createElement("div");
        this.panelEl.className = "clc-panel";
        this.chartWrapEl.appendChild(this.panelEl);

        this.togglePillEl.addEventListener("click", () => this.setCompare(!this.compareOn, true));
        this.togglePillEl.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === " " || e.key === "Enter") { e.preventDefault(); this.setCompare(!this.compareOn, true); }
        });

        this.rootEl.addEventListener("contextmenu", (e: MouseEvent) => {
            e.preventDefault();
            const tgt = e.target as Element;
            const node = tgt.closest("[data-pidx]") as HTMLElement | SVGElement | null;
            if (node && this.cachedData) {
                const idx = Number(node.getAttribute("data-pidx"));
                const pt = this.cachedData.points[idx];
                if (pt) { this.selectionManager.showContextMenu(pt.selectionId, { x: e.clientX, y: e.clientY }); return; }
            }
            this.selectionManager.showContextMenu({} as powerbi.visuals.ISelectionId, { x: e.clientX, y: e.clientY });
        });

        this.dropDocHandler = () => this.closeDropMenu();
        document.addEventListener("click", this.dropDocHandler, true);
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);
        try {
            this.viewportW = Math.max(10, Math.floor(options.viewport.width));
            this.viewportH = Math.max(10, Math.floor(options.viewport.height));
            this.rootEl.style.width = this.viewportW + "px";
            this.rootEl.style.height = this.viewportH + "px";
            const raw = Math.min(this.viewportW / SCALE_REF_W, this.viewportH / SCALE_REF_H);
            this.scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, raw));

            const dv: DataView | undefined = options.dataViews?.[0];
            this.settings = this.settingsService.populateFormattingSettingsModel(VisualSettings, dv);

            const data = transform(dv, this.host);
            this.cachedData = data;

            if (!data || !data.points.length) {
                this.renderEmpty();
                this.events.renderingFinished(options);
                return;
            }
            this.showChartChrome();

            const persisted = this.readPersistedState(dv);
            const sig = this.buildSignature(data);
            const n = data.points.length;
            const compEnabled = !!this.settings.comparison.enabled.value;

            if (sig !== this.lastSignature) {
                this.lastSignature = sig;
                this.fromIdx = 1;
                this.toIdx = Math.min(2, n);
                this.compareOn = false;
                this.panelPrev = { a: 0, f: 0, d: 0 };
            }
            if (persisted) {
                if (typeof persisted.compareOn === "boolean") this.compareOn = persisted.compareOn;
                if (typeof persisted.fromIdx === "number" && persisted.fromIdx >= 1) this.fromIdx = persisted.fromIdx;
                if (typeof persisted.toIdx === "number" && persisted.toIdx >= 1) this.toIdx = persisted.toIdx;
                this.stateLoaded = true;
            }
            // Clamp each independently to [1, n] — the zone uses min/max so the
            // delimiter works in both directions (from > to OR from < to).
            this.fromIdx = Math.min(Math.max(1, this.fromIdx), n);
            this.toIdx = Math.min(Math.max(1, this.toIdx), n);
            if (!compEnabled) this.compareOn = false;

            this.applyStyleVars();
            this.renderTopbar();
            this.renderChart(true);
            this.renderPanel(true);

            this.events.renderingFinished(options);
        } catch (e) {
            this.events.renderingFailed(options, String(e));
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.settingsService.buildFormattingModel(this.settings);
    }

    public destroy(): void {
        this.counterTimers.forEach(t => clearTimeout(t));
        this.counterTimers = [];
        if (this.dropDocHandler) {
            document.removeEventListener("click", this.dropDocHandler, true);
            this.dropDocHandler = null;
        }
    }

    private buildSignature(d: ChartData): string {
        return [
            d.categoryDisplayName, d.actualDisplayName, d.forecastDisplayName,
            d.points.length, d.hasActual ? 1 : 0, d.hasForecast ? 1 : 0
        ].join("|");
    }

    private readPersistedState(dv: DataView | undefined): { compareOn?: boolean; fromIdx?: number; toIdx?: number } | null {
        const obj = (dv?.metadata?.objects as { state?: { compareOn?: boolean; fromIdx?: number; toIdx?: number } } | undefined)?.state;
        if (!obj) return null;
        return {
            compareOn: obj.compareOn,
            fromIdx: obj.fromIdx,
            toIdx: obj.toIdx
        };
    }

    private persistState(): void {
        if (this.suppressPersist) return;
        try {
            this.host.persistProperties({
                merge: [{
                    objectName: "state",
                    selector: null,
                    properties: {
                        compareOn: this.compareOn,
                        fromIdx: this.fromIdx,
                        toIdx: this.toIdx
                    }
                }]
            });
        } catch {
            // non-fatal
        }
    }

    private renderEmpty(): void {
        this.chartWrapEl.style.display = "none";
        this.topbarEl.style.display = "none";
        this.titleEl.style.display = "none";
        this.emptyEl.style.display = "flex";
        this.clearChildren(this.emptyEl);

        // A small welcome / landing page. Explains the visual in one sentence
        // and lists the three field wells the user has to fill in to light
        // the chart up. Fully localised via the resjson files.
        const svgNs = "http://www.w3.org/2000/svg";
        const card = document.createElement("div");
        card.className = "clc-welcome";

        const mk = (tag: string, attrs: Record<string, string>): SVGElement => {
            const el = document.createElementNS(svgNs, tag);
            for (const k in attrs) el.setAttribute(k, attrs[k]);
            return el as SVGElement;
        };

        const hero = mk("svg", {
            "class": "clc-welcome-hero",
            "viewBox": "0 0 220 120",
            "aria-hidden": "true"
        });
        const defs = mk("defs", {});
        const gradA = mk("linearGradient", {
            id: "clc-wl-a", x1: "0", y1: "1", x2: "1", y2: "0"
        });
        gradA.appendChild(mk("stop", { offset: "0%",   "stop-color": "#F0477A" }));
        gradA.appendChild(mk("stop", { offset: "100%", "stop-color": "#FF8AB4" }));
        const gradF = mk("linearGradient", {
            id: "clc-wl-f", x1: "0", y1: "1", x2: "1", y2: "0"
        });
        gradF.appendChild(mk("stop", { offset: "0%",   "stop-color": "#7E45FF" }));
        gradF.appendChild(mk("stop", { offset: "100%", "stop-color": "#B58CFF" }));
        defs.appendChild(gradA);
        defs.appendChild(gradF);
        hero.appendChild(defs);

        // Three subtle grid lines
        [30, 60, 90].forEach(y => {
            hero.appendChild(mk("line", {
                x1: "12", x2: "208", y1: String(y), y2: String(y),
                stroke: "#EFEFF6", "stroke-width": "1"
            }));
        });

        // Solid pink curve (Actual), drawn in with a stroke-dashoffset animation
        const pathA = mk("path", {
            d: "M14 102 C 60 96, 100 68, 140 48 S 195 20, 206 16",
            stroke: "url(#clc-wl-a)", "stroke-width": "3", fill: "none",
            "stroke-linecap": "round",
            "stroke-dasharray": "320", "stroke-dashoffset": "320"
        });
        pathA.appendChild(mk("animate", {
            attributeName: "stroke-dashoffset",
            from: "320", to: "0", dur: "1.6s", fill: "freeze",
            calcMode: "spline", keySplines: "0.2 0.7 0.2 1"
        }));
        hero.appendChild(pathA);

        // Dashed purple curve (Forecast), fades in after a short delay
        const pathF = mk("path", {
            d: "M14 108 C 60 104, 100 82, 140 66 S 195 40, 206 36",
            stroke: "url(#clc-wl-f)", "stroke-width": "3", fill: "none",
            "stroke-linecap": "round", "stroke-dasharray": "6 5",
            opacity: "0"
        });
        pathF.appendChild(mk("animate", {
            attributeName: "opacity", from: "0", to: "1",
            dur: "0.5s", begin: "0.8s", fill: "freeze"
        }));
        hero.appendChild(pathF);

        // Endpoint dots pop in
        const dotSpecs: Array<[string, string, string, string, string]> = [
            ["14", "102", "4",   "#F0477A", "1.2s"],
            ["206", "16", "4",   "#F0477A", "1.4s"],
            ["14", "108", "3.5", "#7E45FF", "1.3s"],
            ["206", "36", "3.5", "#7E45FF", "1.5s"]
        ];
        dotSpecs.forEach(([cx, cy, r, fill, begin]) => {
            const dot = mk("circle", { cx, cy, r, fill, opacity: "0" });
            dot.appendChild(mk("animate", {
                attributeName: "opacity", from: "0", to: "1",
                dur: "0.4s", begin, fill: "freeze"
            }));
            hero.appendChild(dot);
        });
        card.appendChild(hero);

        const title = document.createElement("div");
        title.className = "clc-welcome-title";
        title.textContent = this.loc("Welcome_Title", "Comparative line chart");
        card.appendChild(title);

        const desc = document.createElement("div");
        desc.className = "clc-welcome-desc";
        desc.textContent = this.loc(
            "Welcome_Desc",
            "Compare two cumulative series over time and quickly measure the gap over any sub-period with an interactive selector."
        );
        card.appendChild(desc);

        const list = document.createElement("ul");
        list.className = "clc-welcome-list";
        const items: Array<[string, string, string]> = [
            ["dot-period", this.loc("Role_Category", "Period"),
                this.loc("Welcome_CatHint", "a date, a month or any ordered axis")],
            ["dot-a", this.loc("Role_Actual", "Series A (auto-cumulated)"),
                this.loc("Welcome_ARole", "first measure — the visual cumulates per period")],
            ["dot-f", this.loc("Role_Forecast", "Series B (auto-cumulated)"),
                this.loc("Welcome_FRole", "second measure — the visual cumulates per period")]
        ];
        items.forEach(([cls, label, hint]) => {
            const li = document.createElement("li");
            li.className = "clc-welcome-item";
            const dot = document.createElement("span");
            dot.className = `clc-welcome-dot ${cls}`;
            li.appendChild(dot);
            const body = document.createElement("div");
            body.className = "clc-welcome-body";
            const head = document.createElement("div");
            head.className = "clc-welcome-label";
            head.textContent = label;
            const sub = document.createElement("div");
            sub.className = "clc-welcome-hint";
            sub.textContent = hint;
            body.appendChild(head);
            body.appendChild(sub);
            li.appendChild(body);
            list.appendChild(li);
        });
        card.appendChild(list);

        const foot = document.createElement("div");
        foot.className = "clc-welcome-foot";
        foot.textContent = this.loc(
            "Welcome_Hint",
            "Drop fields into the three wells above to get started."
        );
        card.appendChild(foot);

        this.emptyEl.appendChild(card);
    }

    private showChartChrome(): void {
        this.chartWrapEl.style.display = "flex";
        this.topbarEl.style.display = "flex";
        this.emptyEl.style.display = "none";
    }

    private setCompare(on: boolean, animate: boolean): void {
        if (!this.cachedData) return;
        this.compareOn = on;
        if (on) {
            const n = this.cachedData.points.length;
            if (!this.stateLoaded) {
                this.fromIdx = 1;
                this.toIdx = Math.min(2, n);
            }
        }
        this.renderTopbar();
        this.renderChart(animate);
        this.renderPanel(animate);
        this.persistState();
    }

    private applyFontStyle(
        el: HTMLElement,
        family: string, size: number, bold: boolean, italic: boolean, underline: boolean, color: string
    ): void {
        el.style.fontFamily = family;
        el.style.fontSize = size + "px";
        el.style.fontWeight = bold ? "700" : "400";
        el.style.fontStyle = italic ? "italic" : "normal";
        el.style.textDecoration = underline ? "underline" : "none";
        el.style.color = color;
    }

    private seriesName(which: "a" | "f"): string {
        const s = this.settings;
        const d = this.cachedData!;
        if (which === "a") {
            const o = (s.series.nameActual.value || "").trim();
            return o || d.actualDisplayName || "Series A";
        }
        const o = (s.series.nameForecast.value || "").trim();
        return o || d.forecastDisplayName || "Series B";
    }

    private computeColors(): ColorBag {
        const s = this.settings;
        const isHC = this.colorPalette.isHighContrast;
        if (isHC) {
            const fg = this.colorPalette.foreground.value;
            const bg = this.colorPalette.background.value;
            const sel = this.colorPalette.foregroundSelected.value;
            const link = this.colorPalette.hyperlink.value;
            return {
                a: link, f: sel, muted: fg,
                grid: fg, zone: fg, delim: fg,
                tgOff: fg, tgOn: link, tgLblOff: fg, tgLblOn: link,
                ttBg: bg, ttText: fg, ttLine: fg,
                panelVal: fg, panelHead: fg, panelLbl: fg, panelSep: fg, panelBg: bg,
                pos: link, neg: sel,
                dropBorder: fg, dropBg: bg, dropText: fg,
                dropHover: fg, dropSelBg: link, dropSelText: bg
            };
        }
        return {
            a: s.series.colorActual.value.value,
            f: s.series.colorForecast.value.value,
            muted: s.legend.color.value.value,
            grid: s.axes.gridColor.value.value,
            zone: s.comparison.zoneColor.value.value,
            delim: s.comparison.delimColor.value.value,
            tgOff: s.toggle.bgOff.value.value,
            tgOn: s.toggle.bgOn.value.value,
            tgLblOff: s.toggle.labelColor.value.value,
            tgLblOn: s.toggle.labelColorOn.value.value,
            ttBg: s.tooltipStyle.bg.value.value,
            ttText: s.tooltipStyle.text.value.value,
            ttLine: s.comparison.delimColor.value.value,
            panelVal: s.panel.valColor.value.value,
            panelHead: s.panel.headColor.value.value,
            panelLbl: s.panel.lblColor.value.value,
            panelSep: s.panel.sepColor.value.value,
            panelBg: s.panel.bgColor.value.value,
            pos: s.panel.colorPos.value.value,
            neg: s.panel.colorNeg.value.value,
            dropBorder: s.dropdowns.border.value.value,
            dropBg: s.dropdowns.bg.value.value,
            dropText: s.dropdowns.text.value.value,
            dropHover: s.dropdowns.menuHoverBg.value.value,
            dropSelBg: s.dropdowns.menuSelectedBg.value.value,
            dropSelText: s.dropdowns.menuSelectedText.value.value
        };
    }

    // Rect captured right before the chart resize, used to play the exit
    // animation without the panel collapsing to width 0 immediately.
    private pendingPanelExit: { w: number; h: number; right: number; top: number } | null = null;
    // True while the exit animation is currently playing — lets us ignore
    // redundant update() calls triggered by persistState() during the animation.
    private panelExitInFlight = false;

    private capturePanelExitGeometry(willBeVisible: boolean): void {
        if (!willBeVisible && this.lastPanelVisible) {
            const rectParent = this.chartWrapEl.getBoundingClientRect();
            const rectPanel = this.panelEl.getBoundingClientRect();
            if (rectPanel.width > 0 && rectPanel.height > 0) {
                this.pendingPanelExit = {
                    w: rectPanel.width,
                    h: rectPanel.height,
                    right: rectParent.right - rectPanel.right,
                    top: rectPanel.top - rectParent.top
                };
            }
        }
    }

    private clearPanelExitStyles(): void {
        const el = this.panelEl;
        el.classList.remove("is-anim-out");
        el.style.position = "";
        el.style.right = "";
        el.style.top = "";
        el.style.margin = "";
        el.style.zIndex = "";
        el.style.pointerEvents = "";
        el.style.animation = "";
    }

    private applyPanelVisibility(visible: boolean): void {
        const el = this.panelEl;
        const wasVisible = this.lastPanelVisible;

        // If an exit animation is already playing and we're asked to stay
        // hidden, DO NOT interrupt — Power BI's persistState() round-trip
        // commonly fires a second update() within the animation window, which
        // would otherwise kill the animation and make the panel vanish.
        if (this.panelExitInFlight && !visible) {
            return;
        }

        if (this.panelHideTimer !== null) {
            window.clearTimeout(this.panelHideTimer);
            this.panelHideTimer = null;
            this.panelExitInFlight = false;
            this.clearPanelExitStyles();
        }

        if (visible) {
            el.style.display = "flex";
            el.classList.remove("is-anim-out");
            this.clearPanelExitStyles();
            if (!wasVisible) {
                // Restart the enter animation cleanly
                el.classList.remove("is-anim-in");
                void el.offsetWidth; // force reflow so animation replays
                el.classList.add("is-anim-in");
            }
        } else {
            el.classList.remove("is-anim-in");
            if (wasVisible) {
                // Lift the panel out of the flex flow with absolute positioning
                // so the chart expands immediately underneath while we animate
                // the panel out. We use the captured geometry when available;
                // otherwise we fall back to the live rect (mid-transition resize).
                let g = this.pendingPanelExit;
                if (!g) {
                    const rectParent = this.chartWrapEl.getBoundingClientRect();
                    const rectPanel = el.getBoundingClientRect();
                    if (rectPanel.width > 0 && rectPanel.height > 0) {
                        g = {
                            w: rectPanel.width,
                            h: rectPanel.height,
                            right: rectParent.right - rectPanel.right,
                            top: rectPanel.top - rectParent.top
                        };
                    }
                }
                if (g) {
                    this.chartWrapEl.style.position = "relative";
                    el.style.display = "flex";
                    el.style.position = "absolute";
                    el.style.right = g.right + "px";
                    el.style.top = g.top + "px";
                    el.style.width = g.w + "px";
                    el.style.height = g.h + "px";
                    el.style.margin = "0";
                    el.style.zIndex = "2";
                    el.style.pointerEvents = "none";
                    // Force a reflow so the animation starts from its INITIAL
                    // keyframe (opacity:1, translateX(0)) rather than jumping
                    // straight to the end.
                    void el.offsetWidth;
                    el.classList.add("is-anim-out");
                    this.panelExitInFlight = true;
                    this.panelHideTimer = window.setTimeout(() => {
                        el.style.display = "none";
                        this.clearPanelExitStyles();
                        this.panelExitInFlight = false;
                        this.panelHideTimer = null;
                    }, 340);
                } else {
                    el.style.display = "none";
                }
            } else {
                el.style.display = "none";
            }
        }
        this.pendingPanelExit = null;
        this.lastPanelVisible = visible;
    }

    private applyStyleVars(): void {
        const s = this.settings;
        const c = this.computeColors();
        const style = this.rootEl.style;
        style.setProperty("--clc-actual", c.a);
        style.setProperty("--clc-forecast", c.f);
        style.setProperty("--clc-muted", c.muted);
        style.setProperty("--clc-grid", c.grid);
        style.setProperty("--clc-zone", c.zone);
        style.setProperty("--clc-delim", c.delim);
        style.setProperty("--clc-tg-off", c.tgOff);
        style.setProperty("--clc-tg-on", c.tgOn);
        style.setProperty("--clc-tg-label-off", c.tgLblOff);
        style.setProperty("--clc-tg-label-on", c.tgLblOn);
        style.setProperty("--clc-drop-border", c.dropBorder);
        style.setProperty("--clc-drop-bg", c.dropBg);
        style.setProperty("--clc-drop-text", c.dropText);
        style.setProperty("--clc-drop-hover", c.dropHover);
        style.setProperty("--clc-drop-selbg", c.dropSelBg);
        style.setProperty("--clc-drop-seltext", c.dropSelText);
        style.setProperty("--clc-panel-bg", c.panelBg);
        style.setProperty("--clc-sep", c.panelSep);
        const tgScale = Math.max(0.5, Math.min(2.0, Number(s.toggle.globalScale.value) / 100));
        const pillW = Math.round(this.sc(Number(s.toggle.pillW.value)) * tgScale);
        const pillH = Math.round(this.sc(Number(s.toggle.pillH.value)) * tgScale);
        const thumb = Math.min(pillH - 4, Math.round(this.sc(Number(s.toggle.thumb.value)) * tgScale));
        const tgRad = Number(s.toggle.radius.value);
        style.setProperty("--clc-tg-pillW", `${pillW}px`);
        style.setProperty("--clc-tg-pillH", `${pillH}px`);
        style.setProperty("--clc-tg-thumb", `${thumb}px`);
        style.setProperty("--clc-tg-radius", `${tgRad}px`);
        style.setProperty("--clc-tg-label-size", `${Math.round(this.sc(Number(s.toggle.labelSize.value)) * tgScale)}px`);
        style.setProperty("--clc-drop-radius", `${Number(s.dropdowns.radius.value)}px`);
        style.setProperty("--clc-drop-fontSize", `${this.sc(Number(s.dropdowns.fontSize.value))}px`);
        style.setProperty("--clc-drop-padV", `${this.sc(Number(s.dropdowns.padV.value))}px`);
        style.setProperty("--clc-drop-padH", `${this.sc(Number(s.dropdowns.padH.value))}px`);
        style.setProperty("--clc-panel-radius", `${Number(s.panel.radius.value)}px`);
        style.setProperty("--clc-panel-pad", `${this.sc(Number(s.panel.padding.value))}px`);
    }

    private renderTitle(): void {
        const s = this.settings;
        const t = s.title;
        const show = !!t.show.value;
        const txt = (t.text.value || "").trim();
        if (!show || !txt) {
            this.titleEl.style.display = "none";
            this.titleEl.textContent = "";
            return;
        }
        this.titleEl.style.display = "block";
        this.titleEl.textContent = txt;
        this.applyFontStyle(
            this.titleEl,
            String(t.fontFamily.value),
            this.sc(Number(t.fontSize.value)),
            !!t.fontBold.value, !!t.fontItalic.value, !!t.fontUnderline.value,
            t.color.value.value
        );
        const al = String(t.align.value);
        this.titleEl.style.textAlign =
            al === "center" ? "center" :
            al === "right" ? "right" : "left";
    }

    private buildLegendInto(target: HTMLElement): boolean {
        const s = this.settings;
        const data = this.cachedData!;
        const c = this.computeColors();
        if (!s.legend.show.value) return false;
        const legFont = String(s.legend.fontFamily.value);
        const legSize = this.sc(Number(s.legend.fontSize.value));
        const legBold = !!s.legend.fontBold.value;
        const legItalic = !!s.legend.fontItalic.value;
        const legUnder = !!s.legend.fontUnderline.value;
        const swSize = this.sc(Number(s.legend.swatchSize.value));
        const wrap = document.createElement("div");
        wrap.className = "clc-legend";
        const addItem = (color: string, name: string) => {
            const row = document.createElement("div");
            row.className = "clc-leg-item";
            const sw = document.createElement("span");
            sw.className = "clc-leg-sw";
            sw.style.background = color;
            sw.style.width = swSize + "px";
            sw.style.height = swSize + "px";
            const tx = document.createElement("span");
            tx.textContent = name;
            row.appendChild(sw);
            row.appendChild(tx);
            this.applyFontStyle(
                row, legFont, legSize, legBold, legItalic, legUnder, c.muted
            );
            wrap.appendChild(row);
        };
        if (data.hasActual) addItem(c.a, this.seriesName("a"));
        if (data.hasForecast) addItem(c.f, this.seriesName("f"));
        target.appendChild(wrap);
        return true;
    }

    private buildPeriodSelectorInto(target: HTMLElement): void {
        const s = this.settings;
        const data = this.cachedData!;
        const lblFont = String(s.dropdowns.fontFamily.value);
        const lblSize = this.sc(Number(s.dropdowns.fontSize.value));
        const lblBold = !!s.dropdowns.fontBold.value;

        const wrap = document.createElement("div");
        wrap.className = "clc-summarize";

        const showLbl = !!s.dropdowns.showLabel.value;
        if (showLbl) {
            this.periodLblEl.textContent = (s.dropdowns.label.value || "").trim()
                || this.loc("Ui_AnalyzedPeriod", "Analyzed period:");
            this.applyFontStyle(
                this.periodLblEl, lblFont, lblSize, lblBold, false, false,
                s.dropdowns.text.value.value
            );
            wrap.appendChild(this.periodLblEl);
        }

        wrap.appendChild(this.buildDropdown(data, this.fromIdx, v => {
            this.fromIdx = v;
            this.renderTopbar();
            this.renderChart(false);
            this.renderPanel(true);
            this.persistState();
        }));
        const dash = document.createElement("span");
        dash.className = "clc-summarize-dash";
        dash.textContent = "\u2014";
        this.applyFontStyle(
            dash, lblFont, lblSize, lblBold, false, false,
            s.dropdowns.text.value.value
        );
        wrap.appendChild(dash);
        wrap.appendChild(this.buildDropdown(data, this.toIdx, v => {
            this.toIdx = v;
            this.renderTopbar();
            this.renderChart(false);
            this.renderPanel(true);
            this.persistState();
        }));

        target.appendChild(wrap);
    }

    private renderTopbar(): void {
        const s = this.settings;
        const c = this.computeColors();
        this.closeDropMenu();
        this.clearChildren(this.row1SlotEl);
        this.clearChildren(this.row2SlotEl);
        // Detach periodLbl so we can re-parent safely
        if (this.periodLblEl.parentElement) {
            this.periodLblEl.parentElement.removeChild(this.periodLblEl);
        }

        this.renderTitle();

        const compEnabled = !!s.comparison.enabled.value;
        const toggleScale = Math.max(0.5, Math.min(2.0, Number(s.toggle.globalScale.value) / 100));

        // --- Toggle (row 1 right) ---
        if (compEnabled) {
            this.toggleEl.style.display = "inline-flex";
            this.toggleEl.classList.toggle("is-on", this.compareOn);
            this.togglePillEl.setAttribute("aria-checked", this.compareOn ? "true" : "false");
            const showLbl = !!s.toggle.showLabel.value;
            if (showLbl) {
                this.toggleTextEl.style.display = "inline";
                this.toggleTextEl.textContent = (s.toggle.label.value || "").trim()
                    || this.loc("Ui_Comparison", "Comparison");
                this.applyFontStyle(
                    this.toggleTextEl,
                    String(s.toggle.fontFamily.value),
                    Math.round(this.sc(Number(s.toggle.labelSize.value)) * toggleScale),
                    !!s.toggle.fontBold.value, !!s.toggle.fontItalic.value, !!s.toggle.fontUnderline.value,
                    this.compareOn ? c.tgLblOn : c.tgLblOff
                );
            } else {
                this.toggleTextEl.style.display = "none";
            }
        } else {
            this.toggleEl.style.display = "none";
        }

        // --- Slot layout ---
        // When comparison is ON: period selector goes row 1, legend drops to row 2
        // When comparison is OFF (or disabled): legend takes the row 1 slot, row 2 hidden
        const showPeriod = compEnabled && this.compareOn;
        if (showPeriod) {
            this.buildPeriodSelectorInto(this.row1SlotEl);
            const hasLegend = this.buildLegendInto(this.row2SlotEl);
            this.topRow2El.style.display = hasLegend ? "flex" : "none";
        } else {
            this.buildLegendInto(this.row1SlotEl);
            this.topRow2El.style.display = "none";
        }
    }

    private buildDropdown(data: ChartData, selectedIdx: number, onChange: (v: number) => void): HTMLElement {
        const s = this.settings;
        const wrap = document.createElement("div");
        wrap.className = "clc-drop";
        wrap.setAttribute("role", "combobox");
        wrap.setAttribute("tabindex", "0");
        wrap.setAttribute("aria-haspopup", "listbox");
        wrap.setAttribute("aria-expanded", "false");
        this.applyFontStyle(
            wrap,
            String(s.dropdowns.fontFamily.value), this.sc(Number(s.dropdowns.fontSize.value)),
            !!s.dropdowns.fontBold.value, !!s.dropdowns.fontItalic.value, false,
            s.dropdowns.text.value.value
        );
        wrap.style.background = s.dropdowns.bg.value.value;
        wrap.style.borderColor = s.dropdowns.border.value.value;

        const dv = document.createElement("span");
        dv.className = "clc-drop-dv";
        dv.textContent = data.points[selectedIdx - 1]?.label ?? "";
        wrap.appendChild(dv);

        const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        arrow.setAttribute("class", "clc-drop-arrow");
        arrow.setAttribute("width", "10");
        arrow.setAttribute("height", "10");
        arrow.setAttribute("viewBox", "0 0 10 10");
        arrow.setAttribute("fill", "none");
        arrow.setAttribute("stroke", "currentColor");
        arrow.setAttribute("stroke-width", "1.1");
        arrow.setAttribute("stroke-linecap", "round");
        arrow.setAttribute("stroke-linejoin", "round");
        const ap = document.createElementNS("http://www.w3.org/2000/svg", "path");
        ap.setAttribute("d", "M2 4l3 3 3-3");
        arrow.appendChild(ap);
        wrap.appendChild(arrow);

        const menu = document.createElement("div");
        menu.className = "clc-drop-menu";
        menu.setAttribute("role", "listbox");
        menu.style.display = "none";

        data.points.forEach((p, i) => {
            const opt = document.createElement("div");
            opt.className = "clc-drop-opt";
            opt.setAttribute("role", "option");
            opt.setAttribute("tabindex", "-1");
            opt.dataset["idx"] = String(i + 1);
            if (i + 1 === selectedIdx) opt.classList.add("is-selected");
            opt.textContent = p.label;
            opt.addEventListener("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                dv.textContent = p.label;
                this.closeDropMenu();
                onChange(i + 1);
            });
            menu.appendChild(opt);
        });
        wrap.appendChild(menu);

        const openClose = (e: Event) => {
            e.stopPropagation();
            if (this.openDropMenu === menu) {
                this.closeDropMenu();
            } else {
                this.closeDropMenu();
                this.openDropMenuAt(menu, wrap, selectedIdx - 1);
            }
        };
        wrap.addEventListener("click", openClose);
        wrap.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === " " || e.key === "Enter" || e.key === "ArrowDown") {
                e.preventDefault();
                openClose(e);
            } else if (e.key === "Escape") {
                this.closeDropMenu();
            }
        });

        return wrap;
    }

    private openDropMenuAt(menu: HTMLElement, anchor: HTMLElement, selectedChildIdx: number): void {
        menu.style.display = "block";
        menu.classList.add("is-open");
        anchor.setAttribute("aria-expanded", "true");
        this.openDropMenu = menu;

        const child = menu.children[selectedChildIdx] as HTMLElement | undefined;
        if (child) {
            const ch = child.offsetTop + child.offsetHeight / 2;
            const mh = menu.clientHeight;
            menu.scrollTop = Math.max(0, ch - mh / 2);
        }
    }

    private closeDropMenu(): void {
        if (this.openDropMenu) {
            this.openDropMenu.style.display = "none";
            this.openDropMenu.classList.remove("is-open");
            const combo = this.openDropMenu.parentElement;
            if (combo) combo.setAttribute("aria-expanded", "false");
            this.openDropMenu = null;
        }
    }

    private makeValueFormatter(format: string | undefined, unit: number, decimals: number) {
        return vf.create({
            format: format,
            value: unit || 0,
            precision: decimals,
            cultureSelector: this.host.locale,
            allowFormatBeautification: true
        });
    }

    /**
     * Build a formatter for the Y axis that inherits the *thousand separator*
     * and decimal conventions from the measure's native format string (the
     * `format` argument — typically the `#,##0` / `#,##0.00` pattern defined
     * on the DAX measure). Passing the measure format through means:
     *   - if the measure uses a thousand separator, so does the axis (and
     *     it follows the locale — non-breaking space for fr-FR, comma for
     *     en-US, etc.),
     *   - if the user picked a unit (K/M/B) in the Number format card, the
     *     formatter scales the tick values and appends the unit suffix.
     * The measure-level currency / percent symbols are stripped only when
     * the user requested a specific unit (so we don't end up with "€2.6M€").
     */
    private makeAxisFormatter(maxVal: number, format: string | undefined, unit: number, decimals: number) {
        const v = unit || (maxVal >= 1e9 ? 1e9 : maxVal >= 1e6 ? 1e6 : maxVal >= 1e3 ? 1e3 : 0);
        return vf.create({
            format: format,
            value: v,
            precision: decimals,
            cultureSelector: this.host.locale,
            allowFormatBeautification: true
        });
    }

    private pctFmt(v: number): string {
        return v.toLocaleString(this.host.locale, {
            minimumFractionDigits: 1, maximumFractionDigits: 1
        }) + "%";
    }

    private lastDefined(pts: ChartPoint[], lo: number, hi: number, key: "actual" | "forecast"): number | null {
        for (let i = hi; i >= lo; i--) {
            const v = pts[i]?.[key];
            if (v != null) return v as number;
        }
        return null;
    }

    private sumRaw(pts: ChartPoint[], lo: number, hi: number, key: "actualRaw" | "forecastRaw"): number {
        let sum = 0;
        for (let i = lo; i <= hi; i++) {
            const v = pts[i]?.[key];
            if (v != null) sum += v as number;
        }
        return sum;
    }

    /**
     * Decide how to render the X-axis labels:
     *  - "horiz" at the user's font size when labels fit horizontally.
     *  - "horiz" with a shrunk font when labels are SHORT (months/years).
     *  - "rot" at −60° only when labels are long (dates) and too tight.
     * Returns the chosen mode, font size, and vertical pixels reserved.
     */
    private planXAxisLayout(
        points: ChartPoint[], pitch: number, requestedSize: number
    ): { mode: "horiz" | "rot"; size: number; height: number } {
        const n = points.length;
        if (n <= 0) return { mode: "horiz", size: requestedSize, height: 0 };
        const longestChars = points.reduce((m, p) => Math.max(m, p.label.length), 0);
        const avgCharW = (fs: number) => Math.max(3, fs * 0.58);
        const minGap = this.sc(6);

        // (A) horizontal at requested size
        if (longestChars * avgCharW(requestedSize) + minGap <= pitch) {
            return { mode: "horiz", size: requestedSize, height: requestedSize + this.sc(8) };
        }

        // (B) shrink for short labels only (max 6 chars ~ "Jan", "2025", "12")
        const SHORT_THRESHOLD = 6;
        const shortFloor = this.sc(9);
        if (longestChars <= SHORT_THRESHOLD) {
            for (let fs = requestedSize - 1; fs >= shortFloor; fs -= 1) {
                if (longestChars * avgCharW(fs) + minGap <= pitch) {
                    return { mode: "horiz", size: fs, height: fs + this.sc(8) };
                }
            }
        }

        // (C) rotate -60°. Adjacent rotated labels collide at their baselines
        // when the projected height of the glyph (~fontSize * cos60 = fs/2)
        // exceeds the usable pitch projected on the rotation normal.
        const projected = pitch * Math.sin((Math.PI / 180) * 60);
        let rotSize = requestedSize;
        while (rotSize > shortFloor && rotSize / 2 + this.sc(2) > projected) {
            rotSize -= 1;
        }
        const labelPx = longestChars * avgCharW(rotSize);
        const height = Math.min(labelPx * 0.92, this.sc(90)) + this.sc(8);
        return { mode: "rot", size: rotSize, height };
    }

    private fitToContainer(el: HTMLElement, maxW: number): void {
        if (maxW <= 0) return;
        const style = window.getComputedStyle(el);
        let fs = parseFloat(style.fontSize);
        if (!Number.isFinite(fs) || fs <= 0) return;
        // Guard: at most 20 iterations
        let guard = 20;
        while (el.scrollWidth > maxW && fs > 8 && guard-- > 0) {
            fs -= 1;
            el.style.fontSize = fs + "px";
        }
    }

    /**
     * Measure the width (in CSS px) a string would take when rendered with
     * the given font. We use a singleton off-screen 2D canvas so we don't
     * pay DOM layout cost. Returns a safe approximate-fallback (0.6 × size
     * per character) if the 2D context can't be created.
     */
    private measureTextWidth(text: string, fontSize: number, fontFamily: string, bold: boolean, italic: boolean): number {
        if (!this.measureCtx) {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (ctx) this.measureCtx = ctx;
        }
        if (!this.measureCtx) return text.length * fontSize * 0.6;
        const weight = bold ? "700" : "400";
        const style  = italic ? "italic" : "normal";
        this.measureCtx.font = `${style} ${weight} ${fontSize}px ${fontFamily}`;
        return this.measureCtx.measureText(text).width;
    }

    private renderChart(animate: boolean): void {
        if (!this.cachedData) return;
        const data = this.cachedData;
        const s = this.settings;
        const c = this.computeColors();

        const rootW = Math.max(200, this.viewportW - ROOT_PAD_X * 2);
        // Deduct BOTH the title (when visible) AND the topbar heights from the
        // viewport so the chart + X axis always fit inside the root. Otherwise
        // enabling the title pushes the X axis below the bottom edge.
        //
        // `offsetHeight` excludes the CSS margin-bottom, so we add the
        // margins explicitly — these line up with the values in visual.less
        // (.clc-title { margin-bottom: 8px }, .clc-topbar { margin-bottom: 10px }).
        const titleVisible = !!(this.titleEl && this.titleEl.style.display !== "none");
        const titleH = titleVisible ? this.titleEl.offsetHeight : 0;
        const titleMargin = titleVisible ? 8 : 0;
        const topbarH = this.topbarEl.offsetHeight;
        const topbarMargin = 10;
        const availH = Math.max(
            120,
            this.viewportH - ROOT_PAD_Y * 2 - titleH - titleMargin - topbarH - topbarMargin
        );
        this.chartWrapEl.style.width = rootW + "px";
        this.chartWrapEl.style.height = availH + "px";

        const panelVisible = this.compareOn && !!s.panel.show.value;
        const panelPct = Math.max(15, Math.min(45, Number(s.panel.widthPct.value) || 30)) / 100;
        const panelW = panelVisible ? Math.max(140, Math.round(rootW * panelPct)) : 0;
        const svgW = Math.max(160, rootW - panelW);
        const svgH = availH;
        // CRITICAL: capture the panel's on-screen rect BEFORE we mutate its
        // width/height, otherwise the exit animation would have nothing to
        // animate from (it would collapse to width 0 on the same frame).
        this.capturePanelExitGeometry(panelVisible);
        this.chartEl.style.width = svgW + "px";
        this.chartEl.style.height = svgH + "px";
        this.panelEl.style.width = panelW + "px";
        this.panelEl.style.height = svgH + "px";
        this.applyPanelVisibility(panelVisible);

        const svg = d3.select(this.chartSvgEl);
        svg.selectAll("*").remove();
        this.chartSvgEl.setAttribute("width", String(svgW));
        this.chartSvgEl.setAttribute("height", String(svgH));
        this.chartSvgEl.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);

        const xShow = !!s.axes.xShow.value;
        const yShow = !!s.axes.yShow.value;

        const axFontEarly = String(s.axes.fontFamily.value);
        const xSizeEarly = this.sc(Number(s.axes.xSize.value));

        const PAD_T_RAW = Number(s.axes.padTop.value) || 10;
        const PAD_R_RAW = Number(s.axes.padRight.value) || 12;
        const PAD_B_BASE = xShow ? (Number(s.axes.padBottom.value) || 26) : 6;
        const PAD_L_BASE = yShow ? (Number(s.axes.padLeft.value) || 48) : 6;
        const PAD_T = this.sc(PAD_T_RAW);
        const PAD_R = this.sc(PAD_R_RAW);
        // PAD_L starts at the user's requested padding but we will *grow* it
        // later to fit the widest Y-axis label (see below). Small values
        // (e.g. "1 000") fit within the default 48 px, but large values like
        // "2 500 000" or a currency prefix overflow it and get clipped at
        // the left edge of the SVG. We re-compute PAD_L after building the
        // axis formatter so the plot area always has enough room.
        let PAD_L = this.sc(PAD_L_BASE);

        // Plan the X-axis BEFORE finalising PAD_B, so rotated labels can reserve
        // the vertical room they need (otherwise the rotated text escapes the
        // SVG at the bottom).
        const nEarly = data.points.length;
        const pitchEarly = nEarly > 1 ? (svgW - PAD_L - this.sc(PAD_R_RAW)) / (nEarly - 1) : 1;
        const xPlan = xShow
            ? this.planXAxisLayout(data.points, pitchEarly, xSizeEarly)
            : { mode: "horiz" as const, size: xSizeEarly, height: 0 };
        const PAD_B = this.sc(PAD_B_BASE) + (xShow ? Math.max(0, xPlan.height - this.sc(18)) : 0);
        const ih = svgH - PAD_T - PAD_B;
        if (ih <= 0) return;

        const allVals: number[] = [];
        data.points.forEach(p => {
            if (p.actual != null) allVals.push(p.actual);
            if (p.forecast != null) allVals.push(p.forecast);
        });
        // Intelligent Y scale.
        // Goals:
        //   (1) the topmost gridline lands EXACTLY on the plot-area top
        //       (keeps the "top grid visible" guarantee),
        //   (2) the number of ticks never exceeds what the height can
        //       comfortably hold (min ~2× font-size of breathing room
        //       between labels),
        //   (3) the user's "Y ticks" slider is the absolute upper bound —
        //       the algorithm will happily use fewer when it's cleaner.
        // We do NOT use d3.tickStep directly because it treats "count" as
        // a loose hint and often emits MORE ticks than requested (e.g. a
        // hint of 8 on a max of 2 450 000 yields step=200 000 → 14 ticks).
        // Instead we compute our own nice step that rounds UP, then count
        // how many ticks fall out, and tighten the step if needed.
        const niceStep = (rough: number): number => {
            if (!(rough > 0) || !isFinite(rough)) return 1;
            const mag = Math.pow(10, Math.floor(Math.log10(rough)));
            const m = rough / mag;
            // Round UP to the next "nice" multiple (1, 2, 2.5, 5, 10)×10ⁿ.
            const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
            return nice * mag;
        };
        const bumpStep = (current: number): number => {
            // Jump to the next nice step just above `current`.
            const mag = Math.pow(10, Math.floor(Math.log10(current)));
            const m = current / mag;
            if (m < 2)   return 2   * mag;
            if (m < 2.5) return 2.5 * mag;
            if (m < 5)   return 5   * mag;
            return 10 * mag;
        };

        const userYTicks    = Math.max(2, Number(s.axes.yTicks.value) || 8);
        const ySizePx       = this.sc(Number(s.axes.ySize.value));
        const minGapPx      = Math.max(22, ySizePx * 2.4);
        // intervals that actually fit vertically; at least 2 so we always
        // show both extremities even on tiny visuals.
        const fitIntervals  = Math.max(2, Math.floor(ih / minGapPx));
        // cap = user's upper bound ∧ pixel limit, expressed as "max ticks"
        // (= intervals + 1 because both endpoints are shown).
        const tickCap       = Math.max(3, Math.min(userYTicks, fitIntervals + 1));

        const rawMax = allVals.length ? Math.max(...allVals) : 1;
        // Start with the step that targets (tickCap-1) intervals, rounded
        // UP to a nice number. That yields AT MOST tickCap ticks in most
        // cases — but nice rounding can still over-shoot by 1, so we loop.
        let step = niceStep(rawMax / Math.max(2, tickCap - 1));
        let yMax = Math.max(step, Math.ceil(rawMax / step) * step);
        let nTicks = Math.round(yMax / step) + 1;
        // Safety: if we're still over the cap, bump the step up.
        let safety = 8;
        while (nTicks > tickCap && safety-- > 0) {
            step   = bumpStep(step);
            yMax   = Math.max(step, Math.ceil(rawMax / step) * step);
            nTicks = Math.round(yMax / step) + 1;
        }
        const y = d3.scaleLinear().domain([0, yMax]).range([ih, 0]);

        const unit = Number(s.numberFormat.unit.value) || 0;
        const decimals = Number(s.numberFormat.decimals.value) || 0;
        const measureFmt = data.actualFormat || data.forecastFormat;
        const valFmt = this.makeValueFormatter(measureFmt, unit, decimals);
        const axisFmt = this.makeAxisFormatter(yMax, measureFmt, unit, decimals);

        // --- Auto-grow PAD_L so the Y-axis labels never clip on the left ---
        // Measure each tick's rendered width (including currency/unit suffix
        // and the locale's thousand separator) and take PAD_L = widest + 10
        // (room for the "-8" tick offset and a visual gutter). If the user
        // set a wider padLeft manually we keep that (max). When the Y axis
        // is hidden we leave PAD_L at the small base of 6.
        if (yShow) {
            const axFontFamily = String(s.axes.fontFamily.value);
            const axBoldEarly   = !!s.axes.fontBold.value;
            const axItalicEarly = !!s.axes.fontItalic.value;
            const ySizePxLbl    = this.sc(Number(s.axes.ySize.value));
            let widest = 0;
            for (let t = 0; t <= yMax + step * 0.5; t += step) {
                const w = this.measureTextWidth(
                    axisFmt.format(t), ySizePxLbl, axFontFamily, axBoldEarly, axItalicEarly
                );
                if (w > widest) widest = w;
            }
            // +8 px for the tick label's "-8" x-offset, +6 px outer gutter.
            const needed = Math.ceil(widest) + 8 + 6;
            PAD_L = Math.max(PAD_L, needed);
        }
        const iw = svgW - PAD_L - PAD_R;
        if (iw <= 0) return;

        // Align the panel's inner content vertically with the chart plot area.
        const panelPadH = this.sc(Number(s.panel.padding.value) || 12);
        this.panelEl.style.paddingLeft = panelPadH + "px";
        this.panelEl.style.paddingRight = panelPadH + "px";
        this.panelEl.style.paddingTop = PAD_T + "px";
        this.panelEl.style.paddingBottom = PAD_B + "px";

        const n = data.points.length;
        const defs = svg.append("defs");
        const g = svg.append("g").attr("transform", `translate(${PAD_L},${PAD_T})`);

        const x = d3.scalePoint<string>()
            .domain(data.points.map(p => p.label))
            .range([0, iw])
            .padding(0);

        if (s.axes.gridShow.value) {
            // Emit evenly-spaced ticks on [0..yMax] using our step, so the
            // gridlines include both extremities (0 and the top = plot top).
            const ticks: number[] = [];
            for (let t = 0; t <= yMax + step * 0.5; t += step) ticks.push(t);
            const op = Number(s.axes.gridOpacity.value) / 100;
            g.append("g").attr("class", "clc-grid")
                .selectAll("line")
                .data(ticks).enter().append("line")
                .attr("x1", 0).attr("x2", iw)
                .attr("y1", d => y(d)).attr("y2", d => y(d))
                .attr("stroke", c.grid).attr("stroke-opacity", op)
                .attr("shape-rendering", "crispEdges");
        }

        const axFont = String(s.axes.fontFamily.value);
        const axItalic = !!s.axes.fontItalic.value;
        const axBold = !!s.axes.fontBold.value;
        const xSize = this.sc(Number(s.axes.xSize.value));
        const ySize = this.sc(Number(s.axes.ySize.value));

        if (yShow) {
            // Emit evenly-spaced ticks on [0..yMax] using our step, so the
            // gridlines include both extremities (0 and the top = plot top).
            const ticks: number[] = [];
            for (let t = 0; t <= yMax + step * 0.5; t += step) ticks.push(t);
            const ya = g.append("g").attr("class", "clc-yaxis");
            ya.selectAll("text").data(ticks).enter().append("text")
                .attr("x", -8).attr("y", d => y(d))
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .attr("font-family", axFont)
                .attr("font-size", ySize)
                .attr("font-style", axItalic ? "italic" : "normal")
                .attr("font-weight", axBold ? "700" : "400")
                .attr("fill", s.axes.yColor.value.value)
                .text(d => axisFmt.format(d));
        }

        if (xShow) {
            const xColor = s.axes.xColor.value.value;
            if (xPlan.mode === "rot") {
                const yBase = ih + this.sc(10);
                g.append("g").attr("class", "clc-xaxis clc-xaxis-rot")
                    .selectAll("text")
                    .data(data.points.map((p, i) => ({ p, i }))).enter().append("text")
                    .attr("x", d => x(d.p.label)!)
                    .attr("y", yBase)
                    .attr("text-anchor", "end")
                    .attr("font-family", axFont).attr("font-size", xPlan.size)
                    .attr("font-style", axItalic ? "italic" : "normal")
                    .attr("font-weight", axBold ? "700" : "400")
                    .attr("fill", xColor)
                    .attr("transform", d => `rotate(-60, ${x(d.p.label)}, ${yBase})`)
                    .text(d => d.p.label)
                    .append("title").text(d => d.p.label);
            } else {
                const anchorAt = (i: number): "start" | "middle" | "end" =>
                    i === 0 ? "start" : i === n - 1 ? "end" : "middle";
                const yBase = ih + this.sc(xPlan.size >= 12 ? 16 : 14);
                g.append("g").attr("class", "clc-xaxis")
                    .selectAll("text")
                    .data(data.points.map((p, i) => ({ p, i }))).enter().append("text")
                    .attr("x", d => x(d.p.label)!)
                    .attr("y", yBase)
                    .attr("text-anchor", d => anchorAt(d.i))
                    .attr("font-family", axFont).attr("font-size", xPlan.size)
                    .attr("font-style", axItalic ? "italic" : "normal")
                    .attr("font-weight", axBold ? "700" : "400")
                    .attr("fill", xColor)
                    .text(d => d.p.label)
                    .append("title").text(d => d.p.label);
            }
        }

        const dur = Math.max(MIN_DUR, Number(s.animations.duration.value) || 1400);
        const animEn = !!s.animations.enabled.value && animate;
        const easeFn = EASING_MAP[String(s.animations.easing.value)] ?? EASING_MAP.polyOut;
        const shimmerOn = !!s.animations.shimmer.value;
        const stagger = Number(s.animations.markerStagger.value) || 0;

        const zoneLayer = g.append("g").attr("class", "clc-zone-layer");
        const delimLayer = g.append("g").attr("class", "clc-delim-layer");

        if (this.compareOn) {
            const rangeLo = Math.min(this.fromIdx, this.toIdx);
            const rangeHi = Math.max(this.fromIdx, this.toIdx);
            const xL = x(data.points[rangeLo - 1].label)!;
            const xH = x(data.points[rangeHi - 1].label)!;
            const zw = Math.max(0, xH - xL);
            const cx = xL + zw / 2;
            const zr = zoneLayer.append("rect").attr("class", "clc-zone")
                .attr("y", 0).attr("height", ih)
                .attr("fill", c.zone)
                .attr("opacity", Number(s.comparison.zoneOpacity.value) / 100);
            if (animEn) {
                zr.attr("x", cx).attr("width", 0)
                    .transition().duration(dur * 0.55).ease(d3.easeCubicOut)
                    .attr("x", xL).attr("width", zw);
            } else {
                zr.attr("x", xL).attr("width", zw);
            }

            const delimStyle = String(s.comparison.delimStyle.value);
            const dw = Number(s.comparison.delimWidth.value);
            const delimDash = delimStyle === "dashed" ? `${dw * 4} ${dw * 3}`
                           : delimStyle === "dotted" ? `${dw} ${dw * 2}`
                           : "";

            [xL, xH].forEach(xp => {
                const line = delimLayer.append("line").attr("class", "clc-delim")
                    .attr("x1", xp).attr("x2", xp)
                    .attr("y1", 0).attr("y2", ih)
                    .attr("stroke", c.delim)
                    .attr("stroke-width", dw)
                    .attr("stroke-linecap", "round");
                if (delimDash) line.attr("stroke-dasharray", delimDash);
                if (animEn) {
                    line.attr("y2", 0)
                        .transition().delay(dur * 0.2).duration(dur * 0.45).ease(d3.easeCubicOut)
                        .attr("y2", ih);
                }
            });
        }

        const curveFn = CURVE_MAP[String(s.series.curveType.value)] ?? d3.curveMonotoneX;
        const lineGen = d3.line<ChartPoint>()
            .defined(p => (p.actual != null) || (p.forecast != null))
            .x(p => x(p.label)!)
            .curve(curveFn);

        const aPts = data.points.filter(p => p.actual != null);
        const fPts = data.points.filter(p => p.forecast != null);

        const dActual = data.hasActual && aPts.length >= 2
            ? lineGen.y(p => y(p.actual as number))(aPts) : null;
        const dForecast = data.hasForecast && fPts.length >= 2
            ? lineGen.y(p => y(p.forecast as number))(fPts) : null;

        const dashStr = `${Number(s.series.dashLen.value)} ${Number(s.series.dashGap.value)}`;
        const strokeA = Number(s.series.strokeActual.value);
        const strokeF = Number(s.series.strokeForecast.value);
        const lineOp = Math.max(0.2, Math.min(1, Number(s.series.lineOpacity.value) / 100));

        const hasZone = this.compareOn;
        const rangeLoS = Math.min(this.fromIdx, this.toIdx);
        const rangeHiS = Math.max(this.fromIdx, this.toIdx);
        const xL = hasZone ? x(data.points[rangeLoS - 1].label)! : 0;
        const xH = hasZone ? x(data.points[rangeHiS - 1].label)! : iw;

        const revealId = this.nextId("clc-clip-reveal");
        const revealRect = defs.append("clipPath").attr("id", revealId)
            .append("rect")
            .attr("x", -4).attr("y", -6).attr("height", ih + 12)
            .attr("width", animEn ? 0 : iw + 8);
        const gLines = g.append("g").attr("clip-path", `url(#${revealId})`);

        if (hasZone) {
            const solidClipId = this.nextId("clc-clip-solid");
            defs.append("clipPath").attr("id", solidClipId)
                .append("rect")
                .attr("x", xL - 1).attr("y", -6)
                .attr("width", Math.max(0, xH - xL + 2)).attr("height", ih + 12);

            const makeDashed = (d: string, stroke: string, sw: number) =>
                gLines.append("path").attr("class", "clc-line dashed")
                    .attr("d", d).attr("fill", "none")
                    .attr("stroke", stroke).attr("stroke-width", sw).attr("stroke-opacity", lineOp)
                    .attr("stroke-dasharray", dashStr)
                    .attr("stroke-linecap", "round").attr("stroke-linejoin", "round");
            const makeSolid = (d: string, stroke: string, sw: number) =>
                gLines.append("path").attr("class", "clc-line solid")
                    .attr("d", d).attr("fill", "none")
                    .attr("stroke", stroke).attr("stroke-width", sw).attr("stroke-opacity", lineOp)
                    .attr("clip-path", `url(#${solidClipId})`)
                    .attr("stroke-linecap", "round").attr("stroke-linejoin", "round");

            if (dActual) { makeDashed(dActual, c.a, strokeA); makeSolid(dActual, c.a, strokeA); }
            if (dForecast) { makeDashed(dForecast, c.f, strokeF); makeSolid(dForecast, c.f, strokeF); }
        } else {
            const addLine = (d: string, stroke: string, sw: number) =>
                gLines.append("path").attr("class", "clc-line solid")
                    .attr("d", d).attr("fill", "none")
                    .attr("stroke", stroke).attr("stroke-width", sw).attr("stroke-opacity", lineOp)
                    .attr("stroke-linecap", "round").attr("stroke-linejoin", "round");
            if (dActual) addLine(dActual, c.a, strokeA);
            if (dForecast) addLine(dForecast, c.f, strokeF);
        }

        if (animEn) {
            revealRect.transition().duration(dur).ease(easeFn)
                .attr("width", iw + 8);
        }

        if (animEn && shimmerOn) {
            const shineId = this.nextId("clc-shine");
            const grad = defs.append("linearGradient")
                .attr("id", shineId)
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", -iw).attr("y1", 0).attr("x2", 0).attr("y2", 0);
            grad.append("stop").attr("offset", "0%").attr("stop-color", "#FFFFFF").attr("stop-opacity", 0);
            grad.append("stop").attr("offset", "50%").attr("stop-color", "#FFFFFF").attr("stop-opacity", 0.65);
            grad.append("stop").attr("offset", "100%").attr("stop-color", "#FFFFFF").attr("stop-opacity", 0);
            grad.transition().delay(dur * 0.75).duration(900).ease(d3.easeCubicOut)
                .attr("x1", iw).attr("x2", iw * 2);

            const addShine = (d: string, sw: number) => {
                g.append("path")
                    .attr("class", "clc-shine")
                    .attr("d", d).attr("fill", "none")
                    .attr("stroke", `url(#${shineId})`)
                    .attr("stroke-width", sw + 2)
                    .attr("stroke-linecap", "round")
                    .attr("pointer-events", "none");
            };
            if (dActual) addShine(dActual, strokeA);
            if (dForecast) addShine(dForecast, strokeF);
        }

        if (this.compareOn) {
            const mDelayBase = animEn ? dur * 0.65 : 0;
            const mDur = animEn ? 420 : 0;
            const mR = this.sc(Number(s.markers.markerR.value));
            const mSW = Number(s.markers.markerSW.value);
            const popEase = d3.easeBackOut.overshoot(2.4);
            const handles = [this.fromIdx, this.toIdx];
            handles.forEach((idx1, handleIdx) => {
                const p = data.points[idx1 - 1];
                const xp = x(p.label)!;
                const delay = mDelayBase + handleIdx * stagger;
                if (data.hasActual && p.actual != null) {
                    const m = g.append("circle").attr("class", "clc-m")
                        .attr("cx", xp).attr("cy", y(p.actual))
                        .attr("fill", "#fff")
                        .attr("stroke", c.a).attr("stroke-width", mSW)
                        .attr("data-pidx", String(p.index))
                        .attr("tabindex", "0").attr("role", "button");
                    if (mDur > 0) {
                        m.attr("r", 0).transition().delay(delay).duration(mDur)
                            .ease(popEase).attr("r", mR);
                    } else {
                        m.attr("r", mR);
                    }
                }
                if (data.hasForecast && p.forecast != null) {
                    const m = g.append("circle").attr("class", "clc-m")
                        .attr("cx", xp).attr("cy", y(p.forecast))
                        .attr("fill", "#fff")
                        .attr("stroke", c.f).attr("stroke-width", mSW)
                        .attr("data-pidx", String(p.index));
                    if (mDur > 0) {
                        m.attr("r", 0).transition().delay(delay + 60).duration(mDur)
                            .ease(popEase).attr("r", mR);
                    } else {
                        m.attr("r", mR);
                    }
                }
            });
        }

        // Data labels (per-series, collision-aware). Rendered AFTER the lines
        // so they sit above the curves, but BEFORE the tooltip focus overlay
        // so the hover dot can still appear on top.
        this.renderDataLabels(g, data, x, y, iw, ih, measureFmt, s);

        this.installTooltip(g, data, x, y, iw, ih, c, valFmt, s);

        if (this.compareOn) {
            const addDragHandle = (idx1: number, setter: (v: number) => void) => {
                const xp = x(data.points[idx1 - 1].label)!;
                const hg = g.append("g").style("cursor", "ew-resize");
                hg.append("rect")
                    .attr("x", xp - 10).attr("y", -2)
                    .attr("width", 20).attr("height", ih + 4)
                    .attr("fill", "transparent");
                hg.call(d3.drag<SVGGElement, unknown>()
                    .on("drag", (event) => {
                        const newX = Math.max(0, Math.min(iw, event.x));
                        const step = iw / Math.max(1, n - 1);
                        const idx = Math.max(1, Math.min(n, Math.round(newX / step) + 1));
                        setter(idx);
                        this.renderTopbar();
                        this.renderChart(false);
                        this.renderPanel(true);
                    })
                    .on("end", () => { this.persistState(); })
                );
            };
            addDragHandle(this.fromIdx, v => { this.fromIdx = v; });
            addDragHandle(this.toIdx, v => { this.toIdx = v; });
        }
    }

    /**
     * Per-series, fully customisable data labels with smart default placement.
     *
     * Design notes:
     *   - Each series (A / F) is independent: enable, color, font size,
     *     bold, italic, bg color + opacity, and its own X/Y offset for
     *     manual fine-tuning on top of the auto placement.
     *   - The "position" preset per series ("auto" / "above" / "below" /
     *     "left" / "right") defines which *preferred* candidate is tried
     *     first. Remaining directions (including 4 diagonal fall-backs)
     *     are always tried after if the preferred one collides or falls
     *     off the plot — the user's intent is honoured whenever there's
     *     room, but labels are never dropped silently.
     *   - Collision avoidance is an AABB sweep over already-placed labels
     *     (the first label in reading order wins; later ones move). The
     *     user can disable it with `avoidCollision`.
     *   - Leader lines are drawn from the data point to the closest point
     *     on the label rectangle border, unless the data point would sit
     *     inside the label (no useful leader there). Dash style follows
     *     the shared `leaderDash` setting.
     *   - Formatter: `formatOverride` (user-supplied pattern, e.g.
     *     "#,##0.0 k€") falls back to the measure's own format string,
     *     so thousand separators / currency / % are inherited by default.
     *     `decimalsOverride = -1` means "follow Number format card".
     *   - Rendered inside `g` so they honour the same chart transform and
     *     clipping, above the lines but below the tooltip focus overlay.
     *   - Uses `.text()` (not innerHTML) to satisfy the
     *     `powerbi-visuals/no-inner-outer-html` lint rule.
     */
    private renderDataLabels(
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        data: ChartData,
        x: d3.ScalePoint<string>,
        y: d3.ScaleLinear<number, number>,
        iw: number, ih: number,
        measureFmt: string | undefined,
        s: VisualSettings
    ): void {
        const dl = s.dataLabels;
        const showA = !!dl.showA.value && data.hasActual;
        const showF = !!dl.showF.value && data.hasForecast;
        if (!showA && !showF) return;

        const points = data.points;
        const n = points.length;
        if (n === 0) return;

        // Shared formatter (format override → measure format; decimals override → Number-format card)
        const unit     = Number(s.numberFormat.unit.value) || 0;
        const decOver  = Number(dl.decimalsOverride.value);
        const decFallb = Number(s.numberFormat.decimals.value) || 0;
        const dec      = decOver >= 0 ? decOver : decFallb;
        const fmtStr   = String(dl.formatOverride.value || "") || measureFmt;
        const fmt      = this.makeValueFormatter(fmtStr, unit, dec);

        // Shared appearance
        const fontFamily   = String(dl.fontFamily.value);
        const padH         = Number(dl.padH.value);
        const padV         = Number(dl.padV.value);
        const borderColor  = dl.borderColor.value.value;
        const borderWidth  = Number(dl.borderWidth.value);
        const borderRadius = Number(dl.borderRadius.value);
        const density      = String(dl.density.value);
        const everyN       = Math.max(2, Math.round(Number(dl.everyN.value)));
        const avoid        = !!dl.avoidCollision.value;
        const showLeader   = !!dl.showLeader.value;
        const leaderColor  = dl.leaderColor.value.value;
        const leaderWidth  = Number(dl.leaderWidth.value);
        const leaderDashKey = String(dl.leaderDash.value);
        const leaderDash   = leaderDashKey === "dashed" ? "4 3"
                             : leaderDashKey === "dotted" ? "1 3"
                             : "";
        const markerR      = this.sc(Number(s.markers.markerR.value));

        // Per-series styling
        const fontSizeA = this.sc(Number(dl.fontSizeA.value));
        const fontSizeF = this.sc(Number(dl.fontSizeF.value));
        const styleA = {
            fontSize: fontSizeA,
            color: dl.colorA.value.value,
            bold: !!dl.boldA.value,
            italic: !!dl.italicA.value,
            bgColor: dl.bgColorA.value.value,
            bgOpacity: Number(dl.bgOpacityA.value) / 100,
            offX: Number(dl.offsetXA.value),
            offY: Number(dl.offsetYA.value),
            position: String(dl.positionA.value)
        };
        const styleF = {
            fontSize: fontSizeF,
            color: dl.colorF.value.value,
            bold: !!dl.boldF.value,
            italic: !!dl.italicF.value,
            bgColor: dl.bgColorF.value.value,
            bgOpacity: Number(dl.bgOpacityF.value) / 100,
            offX: Number(dl.offsetXF.value),
            offY: Number(dl.offsetYF.value),
            position: String(dl.positionF.value)
        };

        // Density filter: which point indices carry a label?
        const includeIdx = (i: number): boolean => {
            if (density === "firstLast") return i === 0 || i === n - 1;
            if (density === "endpoints") return i === n - 1;
            if (density === "everyN")    return i === 0 || i === n - 1 || (i % everyN) === 0;
            return true; // "all"
        };

        // Build the entry list in stable reading order (left-to-right, A before F at the same x).
        type Entry = {
            px: number; py: number;
            text: string;
            w: number; h: number;
            style: typeof styleA;
        };
        const entries: Entry[] = [];
        for (let i = 0; i < n; i++) {
            if (!includeIdx(i)) continue;
            const p = points[i];
            const cx = x(p.label);
            if (cx == null) continue;
            if (showA && p.actual != null) {
                const txt = fmt.format(p.actual);
                const tw  = this.measureTextWidth(txt, styleA.fontSize, fontFamily, styleA.bold, styleA.italic);
                entries.push({
                    px: cx, py: y(p.actual), text: txt,
                    w: tw + 2 * padH, h: styleA.fontSize + 2 * padV,
                    style: styleA
                });
            }
            if (showF && p.forecast != null) {
                const txt = fmt.format(p.forecast);
                const tw  = this.measureTextWidth(txt, styleF.fontSize, fontFamily, styleF.bold, styleF.italic);
                entries.push({
                    px: cx, py: y(p.forecast), text: txt,
                    w: tw + 2 * padH, h: styleF.fontSize + 2 * padV,
                    style: styleF
                });
            }
        }
        if (entries.length === 0) return;

        // Candidate positions: try the user's preferred direction first, then the other
        // cardinals, then the 4 diagonals. Every candidate is a Rect (top-left corner).
        type Rect = { x: number; y: number; w: number; h: number };
        const gap = 4;
        const candidatesFor = (px: number, py: number, w: number, h: number, mode: string): Rect[] => {
            const r = markerR + gap;
            const mk = (rx: number, ry: number): Rect => ({ x: rx, y: ry, w, h });
            const above = mk(px - w / 2, py - h - r);
            const below = mk(px - w / 2, py + r);
            const right = mk(px + r,     py - h / 2);
            const left  = mk(px - w - r, py - h / 2);
            const ar = mk(px + r,     py - h - r);
            const al = mk(px - w - r, py - h - r);
            const br = mk(px + r,     py + r);
            const bl = mk(px - w - r, py + r);
            if (mode === "above") return [above, ar, al, right, left, below, br, bl];
            if (mode === "below") return [below, br, bl, right, left, above, ar, al];
            if (mode === "left")  return [left,  al, bl, above, below, right, ar, br];
            if (mode === "right") return [right, ar, br, above, below, left,  al, bl];
            // "auto" — above is the natural default for line charts
            return [above, right, left, below, ar, al, br, bl];
        };

        const inBounds = (r: Rect): boolean =>
            r.x >= 0 && r.y >= 0 && r.x + r.w <= iw && r.y + r.h <= ih;
        const clamp = (r: Rect): Rect => ({
            x: Math.max(0, Math.min(iw - r.w, r.x)),
            y: Math.max(0, Math.min(ih - r.h, r.y)),
            w: r.w, h: r.h
        });
        const overlap = (a: Rect, b: Rect): boolean =>
            a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

        // Greedy placement: first entry wins; subsequent entries move to the first
        // candidate slot that doesn't collide and stays on screen.
        const placed: Rect[] = [];
        const placements: { e: Entry; r: Rect }[] = [];
        for (const e of entries) {
            const cands = candidatesFor(e.px, e.py, e.w, e.h, e.style.position);
            let chosen: Rect | null = null;
            if (avoid) {
                for (const cand of cands) {
                    if (!inBounds(cand)) continue;
                    let collides = false;
                    for (const p of placed) {
                        if (overlap(cand, p)) { collides = true; break; }
                    }
                    if (!collides) { chosen = cand; break; }
                }
            }
            if (!chosen) chosen = clamp(cands[0]);
            // Manual fine-tune offsets sit on top of the auto placement, then re-clamp.
            chosen = clamp({
                x: chosen.x + e.style.offX,
                y: chosen.y + e.style.offY,
                w: chosen.w, h: chosen.h
            });
            placed.push(chosen);
            placements.push({ e, r: chosen });
        }

        // Paint the results. One sub-layer keeps labels above lines but below the focus overlay.
        const layer = g.append("g").attr("class", "clc-dl-layer").style("pointer-events", "none");

        for (const { e, r } of placements) {
            // Leader from data point to closest point on the label rectangle
            if (showLeader && leaderWidth > 0) {
                const tx = Math.max(r.x, Math.min(r.x + r.w, e.px));
                const ty = Math.max(r.y, Math.min(r.y + r.h, e.py));
                const dx = tx - e.px;
                const dy = ty - e.py;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > markerR + 2) {
                    const ln = layer.append("line").attr("class", "clc-dl-leader")
                        .attr("x1", e.px).attr("y1", e.py)
                        .attr("x2", tx).attr("y2", ty)
                        .attr("stroke", leaderColor)
                        .attr("stroke-width", leaderWidth)
                        .attr("stroke-linecap", "round");
                    if (leaderDash) ln.attr("stroke-dasharray", leaderDash);
                }
            }
            // Background box (skipped entirely when opacity=0 so text sits directly on the chart)
            if (e.style.bgOpacity > 0 || borderWidth > 0) {
                const bg = layer.append("rect").attr("class", "clc-dl-bg")
                    .attr("x", r.x).attr("y", r.y)
                    .attr("width", r.w).attr("height", r.h)
                    .attr("rx", borderRadius).attr("ry", borderRadius)
                    .attr("fill", e.style.bgColor)
                    .attr("fill-opacity", e.style.bgOpacity);
                if (borderWidth > 0) {
                    bg.attr("stroke", borderColor).attr("stroke-width", borderWidth);
                }
            }
            // Label text
            const t = layer.append("text").attr("class", "clc-dl-text")
                .attr("x", r.x + r.w / 2)
                .attr("y", r.y + r.h / 2)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "central")
                .attr("font-family", fontFamily)
                .attr("font-size", e.style.fontSize)
                .attr("fill", e.style.color);
            if (e.style.bold)   t.attr("font-weight", "700");
            if (e.style.italic) t.attr("font-style", "italic");
            t.text(e.text);
        }
    }

    private installTooltip(
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        data: ChartData,
        x: d3.ScalePoint<string>,
        y: d3.ScaleLinear<number, number>,
        iw: number, ih: number,
        c: ColorBag,
        valFmt: { format: (v: number) => string },
        s: VisualSettings
    ): void {
        const focus = g.append("g").attr("class", "clc-focus").style("pointer-events", "none").style("opacity", 0);
        const ttLine = focus.append("line").attr("class", "clc-tt-line")
            .attr("y1", 0).attr("y2", ih)
            .attr("stroke", c.ttLine).attr("stroke-width", 1.2).attr("stroke-dasharray", "4 4").attr("stroke-opacity", 0.6);
        const mR = this.sc(Number(s.markers.markerR.value));
        const mSW = Number(s.markers.markerSW.value);
        const dotA = focus.append("circle").attr("r", mR).attr("fill", "#fff")
            .attr("stroke", c.a).attr("stroke-width", mSW);
        const dotF = focus.append("circle").attr("r", mR).attr("fill", "#fff")
            .attr("stroke", c.f).attr("stroke-width", mSW);

        const ttSize = this.sc(Number(s.tooltipStyle.size.value));
        const ttRadius = Math.max(6, Number(s.tooltipStyle.radius.value));
        const fontFam = String(s.tooltipStyle.fontFamily.value);
        const ttBold = !!s.tooltipStyle.fontBold.value;
        const ttItalic = !!s.tooltipStyle.fontItalic.value;
        const swPx = Math.max(8, Math.min(ttSize, this.sc(10)));

        const showA = data.hasActual;
        const showF = data.hasForecast;
        const rowCount = (showA ? 1 : 0) + (showF ? 1 : 0);
        const padX = this.sc(12);
        const padY = this.sc(9);
        const rowGap = this.sc(6);
        const rowH = Math.max(swPx, ttSize) + 2;
        const headerH = ttSize + 2;
        const headSize = Math.round(ttSize * 0.92);
        const sepGap = this.sc(7);
        const sepH = 1;
        // Layout: [padY] [header] [sepGap] [sep] [sepGap] [rows…] [padY]
        const bubH = padY * 2 + headerH + sepGap + sepH + sepGap
            + rowCount * rowH + (rowCount > 1 ? rowGap : 0);
        const bubbleGap = this.sc(12); // vertical gap between anchor and bubble

        const measureEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        measureEl.setAttribute("font-family", fontFam);
        measureEl.setAttribute("font-size", String(ttSize));
        measureEl.setAttribute("font-weight", ttBold ? "700" : "400");
        measureEl.style.visibility = "hidden";
        const measureHead = document.createElementNS("http://www.w3.org/2000/svg", "text");
        measureHead.setAttribute("font-family", fontFam);
        measureHead.setAttribute("font-size", String(headSize));
        measureHead.setAttribute("font-weight", "600");
        measureHead.style.visibility = "hidden";

        const bubble = focus.append("g").attr("class", "clc-tt-bubble");
        const bubbleRect = bubble.append("rect")
            .attr("rx", ttRadius).attr("ry", ttRadius)
            .attr("height", bubH)
            .attr("fill", c.ttBg)
            .attr("stroke", c.ttText)
            .attr("stroke-opacity", 0.08)
            .attr("stroke-width", 1);

        const headText = bubble.append("text").attr("class", "clc-tt-head")
            .attr("dominant-baseline", "central")
            .attr("fill", c.ttText)
            .attr("fill-opacity", 0.78)
            .attr("font-family", fontFam)
            .attr("font-size", headSize)
            .attr("font-weight", "600")
            .attr("letter-spacing", "0.2");

        const sepLine = bubble.append("line").attr("class", "clc-tt-sep")
            .attr("stroke", c.ttText)
            .attr("stroke-opacity", 0.12)
            .attr("stroke-width", sepH)
            .attr("shape-rendering", "crispEdges");

        const makeRow = () => {
            const row = bubble.append("g");
            const sw = row.append("rect")
                .attr("x", 0).attr("y", -swPx / 2)
                .attr("width", swPx).attr("height", swPx)
                .attr("rx", 2).attr("ry", 2);
            const tx = row.append("text")
                .attr("x", swPx + this.sc(8)).attr("y", 0)
                .attr("dominant-baseline", "central")
                .attr("fill", c.ttText)
                .attr("font-family", fontFam)
                .attr("font-size", ttSize)
                .attr("font-style", ttItalic ? "italic" : "normal")
                .attr("font-weight", ttBold ? "700" : "400");
            return { row, sw, tx };
        };
        const rowA = showA ? makeRow() : null;
        const rowF = showF ? makeRow() : null;
        if (rowA) rowA.sw.attr("fill", c.a);
        if (rowF) rowF.sw.attr("fill", c.f);

        const pointsByX = data.points.map(p => ({ xp: x(p.label)!, p }));

        let currentIdx = -1;
        let isVisible = false;
        const moveEase = d3.easeCubicOut;

        const showAt = (idx: number) => {
            const p = data.points[idx];
            if (!p) return;
            const xp = x(p.label)!;

            const valAStr = p.actual != null ? valFmt.format(p.actual) : "\u2014";
            const valFStr = p.forecast != null ? valFmt.format(p.forecast) : "\u2014";
            if (rowA) rowA.tx.text(valAStr);
            if (rowF) rowF.tx.text(valFStr);
            headText.text(p.label);

            g.node()!.appendChild(measureEl);
            g.node()!.appendChild(measureHead);
            let longest = 0;
            if (rowA) {
                measureEl.textContent = valAStr;
                longest = Math.max(longest, measureEl.getBBox().width + swPx + this.sc(8));
            }
            if (rowF) {
                measureEl.textContent = valFStr;
                longest = Math.max(longest, measureEl.getBBox().width + swPx + this.sc(8));
            }
            measureHead.textContent = p.label;
            const headW = measureHead.getBBox().width;
            longest = Math.max(longest, headW);
            measureEl.parentNode?.removeChild(measureEl);
            measureHead.parentNode?.removeChild(measureHead);

            const bubW = Math.max(this.sc(96), Math.round(longest + padX * 2));

            const anchorY = p.forecast != null ? y(p.forecast) : (p.actual != null ? y(p.actual) : ih / 2);
            const leftEdge = xp - bubW / 2;
            const rightEdge = xp + bubW / 2;
            let nudge = 0;
            if (leftEdge < 0) nudge = -leftEdge;
            else if (rightEdge > iw) nudge = iw - rightEdge;
            const bx = -bubW / 2 + nudge;

            // Flip the bubble below the anchor when there isn't room above it.
            // No triangle/tail — the vertical crosshair already indicates the
            // exact data point, which keeps the bubble clean and soft.
            const flip = (anchorY - (bubH + bubbleGap)) < 0;
            const bubbleTopY = flip ? bubbleGap : -(bubH + bubbleGap);

            const dur = isVisible ? TT_MOVE_MS : 0;
            ttLine.interrupt().transition().duration(dur).ease(moveEase)
                .attr("x1", xp).attr("x2", xp);
            if (p.actual != null) {
                dotA.style("display", null);
                dotA.interrupt().transition().duration(dur).ease(moveEase)
                    .attr("cx", xp).attr("cy", y(p.actual));
            } else dotA.style("display", "none");
            if (p.forecast != null) {
                dotF.style("display", null);
                dotF.interrupt().transition().duration(dur).ease(moveEase)
                    .attr("cx", xp).attr("cy", y(p.forecast));
            } else dotF.style("display", "none");

            bubble.interrupt().transition().duration(dur).ease(moveEase)
                .attr("transform", `translate(${xp},${anchorY})`);
            bubbleRect.interrupt().transition().duration(dur).ease(moveEase)
                .attr("x", bx).attr("y", bubbleTopY)
                .attr("width", bubW);

            // Layout: [padY] [header] [sepGap] [sep] [sepGap] [rows...] [padY]
            const innerTop = bubbleTopY + padY;
            const headerCenter = innerTop + headerH / 2;
            const sepY = innerTop + headerH + sepGap;
            const rowsTop = sepY + sepH + sepGap;
            const rowACenter = rowsTop + rowH / 2;
            const rowFCenter = rowsTop + (rowA ? rowH + rowGap : 0) + rowH / 2;

            headText.interrupt().transition().duration(dur).ease(moveEase)
                .attr("x", bx + padX).attr("y", headerCenter);
            sepLine.interrupt().transition().duration(dur).ease(moveEase)
                .attr("x1", bx + padX).attr("x2", bx + bubW - padX)
                .attr("y1", sepY).attr("y2", sepY);
            if (rowA) {
                rowA.row.interrupt().transition().duration(dur).ease(moveEase)
                    .attr("transform", `translate(${bx + padX},${rowACenter})`);
            }
            if (rowF) {
                rowF.row.interrupt().transition().duration(dur).ease(moveEase)
                    .attr("transform", `translate(${bx + padX},${rowFCenter})`);
            }

            if (!isVisible) {
                focus.interrupt().transition().duration(140).ease(d3.easeCubicOut)
                    .style("opacity", 1);
                isVisible = true;
            }
            currentIdx = idx;
        };
        const hide = () => {
            focus.interrupt().transition().duration(160).ease(d3.easeCubicOut).style("opacity", 0);
            isVisible = false;
            currentIdx = -1;
        };

        const hit = g.append("rect")
            .attr("class", "clc-hit")
            .attr("x", 0).attr("y", 0)
            .attr("width", iw).attr("height", ih)
            .attr("fill", "transparent")
            .style("cursor", "crosshair");
        hit.on("mousemove", function(ev: MouseEvent) {
            const [mx] = d3.pointer(ev, this);
            let best = 0, bestD = Infinity;
            for (let i = 0; i < pointsByX.length; i++) {
                const dd = Math.abs(pointsByX[i].xp - mx);
                if (dd < bestD) { bestD = dd; best = i; }
            }
            if (best !== currentIdx) showAt(best);
        });
        hit.on("mouseleave", hide);
        hit.on("click", () => this.selectionManager.clear());
    }

    private renderPanel(animate: boolean): void {
        if (!this.cachedData) return;
        const s = this.settings;
        const c = this.computeColors();
        if (!s.panel.show.value || !this.compareOn) {
            // Visibility is orchestrated by applyPanelVisibility() (which plays
            // the exit animation if needed); here we just clear content.
            this.clearChildren(this.panelEl);
            return;
        }
        this.clearChildren(this.panelEl);
        this.panelEl.style.background = c.panelBg;

        const data = this.cachedData;
        const L = Math.min(this.fromIdx, this.toIdx);
        const H = Math.max(this.fromIdx, this.toIdx);
        const pts = data.points;

        const unit = Number(s.numberFormat.unit.value) || 0;
        const decimals = Number(s.numberFormat.decimals.value) || 0;
        const fmtA = this.makeValueFormatter(data.actualFormat, unit, decimals);
        const fmtF = this.makeValueFormatter(data.forecastFormat, unit, decimals);

        // Panel aggregation: SUM raw decumulated values across the selected period [L-1 .. H-1]
        const acc = this.sumRaw(pts, L - 1, H - 1, "actualRaw");
        const exp = this.sumRaw(pts, L - 1, H - 1, "forecastRaw");
        const delta = acc - exp;
        const pct = exp === 0 ? 0 : (delta / exp) * 100;

        const pFont = String(s.panel.fontFamily.value);
        const pItalic = !!s.panel.fontItalic.value;
        const pUnder = !!s.panel.fontUnderline.value;
        const panelInner = Math.max(60, this.panelEl.clientWidth - this.sc(Number(s.panel.padding.value)) * 2);

        const head = document.createElement("h2");
        head.className = "clc-pn-head";
        head.textContent = (s.panel.headText.value || "").trim()
            || this.loc("Ui_OverPeriod", "Over this period");
        head.style.whiteSpace = "nowrap";
        this.applyFontStyle(
            head, pFont, this.sc(Number(s.panel.headSize.value)),
            true, pItalic, pUnder,
            s.panel.headColor.value.value
        );
        this.panelEl.appendChild(head);

        const makeBlock = (labelText: string, valueEl: HTMLElement): HTMLElement => {
            const blk = document.createElement("div");
            blk.className = "clc-pn-blk";
            const l = document.createElement("div");
            l.className = "clc-pn-lbl";
            l.textContent = labelText;
            l.style.whiteSpace = "nowrap";
            this.applyFontStyle(
                l, pFont, this.sc(Number(s.panel.lblSize.value)),
                false, pItalic, false,
                s.panel.lblColor.value.value
            );
            blk.appendChild(l);
            blk.appendChild(valueEl);
            return blk;
        };

        this.counterTimers.forEach(t => clearTimeout(t));
        this.counterTimers = [];
        const dur = animate && s.animations.enabled.value ? 500 : 0;

        // Track all text elements along with the animation hook that SHOULD
        // start driving their textContent. We deliberately delay animateTo()
        // until AFTER the per-element width fit has completed, otherwise
        // fitToContainer measures the in-flight "0" placeholder (tiny) and
        // never shrinks the font to fit the FINAL widest value. We also
        // pre-seed textContent with the final string so scrollWidth reflects
        // the worst case.
        type PanelRow = { el: HTMLElement; maxW: number; start: () => void };
        const rows: PanelRow[] = [];
        rows.push({ el: head, maxW: panelInner, start: () => { /* static */ } });

        if (data.hasActual) {
            const v = document.createElement("div");
            v.className = "clc-pn-val";
            v.style.whiteSpace = "nowrap";
            this.applyFontStyle(
                v, pFont, this.sc(Number(s.panel.valSize.value)),
                true, pItalic, false,
                s.panel.valColor.value.value
            );
            v.textContent = fmtA.format(acc);
            this.panelEl.appendChild(makeBlock(this.seriesName("a"), v));
            rows.push({ el: v, maxW: panelInner, start: () => this.animateTo(v, 0, acc, dur, x => fmtA.format(x)) });
        }
        if (data.hasForecast) {
            const v = document.createElement("div");
            v.className = "clc-pn-val";
            v.style.whiteSpace = "nowrap";
            this.applyFontStyle(
                v, pFont, this.sc(Number(s.panel.valSize.value)),
                true, pItalic, false,
                s.panel.valColor.value.value
            );
            v.textContent = fmtF.format(exp);
            this.panelEl.appendChild(makeBlock(this.seriesName("f"), v));
            rows.push({ el: v, maxW: panelInner, start: () => this.animateTo(v, 0, exp, dur, x => fmtF.format(x)) });
        }
        if (data.hasActual && data.hasForecast) {
            const deltaRow = document.createElement("div");
            deltaRow.className = "clc-pn-delta";
            deltaRow.style.whiteSpace = "nowrap";
            const neg = delta < 0;
            const col = neg ? c.neg : c.pos;
            const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            const arrSz = this.sc(14);
            arrow.setAttribute("width", String(arrSz));
            arrow.setAttribute("height", String(arrSz));
            arrow.setAttribute("viewBox", "0 0 14 14");
            arrow.style.flexShrink = "0";
            const tri = document.createElementNS("http://www.w3.org/2000/svg", "path");
            tri.setAttribute("d", neg ? "M1 3L13 3L7 12Z" : "M1 11L13 11L7 2Z");
            tri.setAttribute("fill", col);
            arrow.appendChild(tri);
            const valSpan = document.createElement("span");
            valSpan.className = "clc-pn-dv";
            valSpan.style.whiteSpace = "nowrap";
            valSpan.textContent = `${neg ? "" : "+"}${fmtA.format(Math.abs(delta))} (${this.pctFmt(Math.abs(pct))})`;
            deltaRow.appendChild(arrow);
            deltaRow.appendChild(valSpan);
            this.applyFontStyle(
                deltaRow, pFont, this.sc(Number(s.panel.deltaSize.value)),
                true, pItalic, false,
                col
            );
            const lblDelta = (s.panel.lblDelta.value || "").trim()
                || this.loc("Ui_Delta", "Delta");
            this.panelEl.appendChild(makeBlock(lblDelta, deltaRow));
            rows.push({
                el: deltaRow, maxW: panelInner,
                start: () => this.animateTo(valSpan, 0, Math.abs(delta), dur,
                    v => `${neg ? "" : "+"}${fmtA.format(v)} (${this.pctFmt(Math.abs(pct))})`)
            });
        }

        // Fit every row to the panel width FIRST (using final textContent as
        // the worst-case measurement), THEN also scale down globally if the
        // total content height exceeds the panel's inner height — this is
        // how we guarantee nothing is ever truncated regardless of the
        // visual's width/height.
        requestAnimationFrame(() => {
            rows.forEach(({ el, maxW }) => this.fitToContainer(el, maxW));
            this.fitPanelVertically();
            // Now that font sizes are locked in, kick off value animations.
            rows.forEach(r => r.start());
        });

        this.panelPrev = { a: acc, f: exp, d: delta };
    }

    /**
     * After per-row width fitting, check whether the sum of the children's
     * natural heights exceeds the panel's available inner height. If yes,
     * scale every text element down uniformly until it fits — so we never
     * clip content vertically either.
     */
    private fitPanelVertically(): void {
        const el = this.panelEl;
        if (!el || el.style.display === "none") return;
        const available = el.clientHeight;
        if (available <= 0) return;
        const textSelector = ".clc-pn-head, .clc-pn-lbl, .clc-pn-val, .clc-pn-delta";
        const texts = Array.from(el.querySelectorAll<HTMLElement>(textSelector));
        if (texts.length === 0) return;

        let guard = 12;
        while (el.scrollHeight > available + 1 && guard-- > 0) {
            let shrunkAny = false;
            texts.forEach(t => {
                const fs = parseFloat(window.getComputedStyle(t).fontSize);
                if (Number.isFinite(fs) && fs > 9) {
                    t.style.fontSize = (fs - 1) + "px";
                    shrunkAny = true;
                }
            });
            if (!shrunkAny) break;
        }
    }

    private animateTo(el: HTMLElement, _fromV: number, toV: number, dur: number, fmt: (v: number) => string): void {
        // Always scroll from 0 → toV, no noise, cubic ease-out, ultra-fast.
        if (!dur) { el.textContent = fmt(toV); return; }
        const from = 0;
        const t0 = performance.now();
        const step = () => {
            const p = Math.min(1, (performance.now() - t0) / dur);
            const e = 1 - Math.pow(1 - p, 3); // cubic ease-out
            const cur = from + (toV - from) * e;
            el.textContent = fmt(cur);
            if (p < 1) {
                const id = window.setTimeout(step, 16);
                this.counterTimers.push(id);
            } else {
                el.textContent = fmt(toV);
            }
        };
        el.textContent = fmt(from);
        const id = window.setTimeout(step, 16);
        this.counterTimers.push(id);
    }
}
