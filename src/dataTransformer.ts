import powerbiVisualsApi from "powerbi-visuals-api";
import { valueFormatter as vf } from "powerbi-visuals-utils-formattingutils";
import DataView = powerbiVisualsApi.DataView;
import IVisualHost = powerbiVisualsApi.extensibility.visual.IVisualHost;
import ISelectionId = powerbiVisualsApi.visuals.ISelectionId;
import PrimitiveValue = powerbiVisualsApi.PrimitiveValue;
import DataViewValueColumn = powerbiVisualsApi.DataViewValueColumn;

export interface ChartPoint {
    index: number;           // 0-based (after sorting)
    label: string;           // formatted category label
    rawCategory: PrimitiveValue;
    actual: number | null;        // cumulative (computed by transformer, used for plotting)
    forecast: number | null;      // cumulative (computed by transformer, used for plotting)
    actualRaw: number | null;     // decumulated original (used for panel sums)
    forecastRaw: number | null;   // decumulated original (used for panel sums)
    selectionId: ISelectionId;
    highlightedActual: boolean;
    highlightedForecast: boolean;
}

export interface ChartData {
    points: ChartPoint[];
    hasActual: boolean;
    hasForecast: boolean;
    categoryDisplayName: string;
    actualDisplayName: string;
    forecastDisplayName: string;
    actualFormat: string | undefined;
    forecastFormat: string | undefined;
    hasHighlights: boolean;
    categoryIsDate: boolean;
}

/**
 * Find a value column bound to a given data role.
 * Power BI places each measure into dataView.categorical.values[i] — we match by role.
 */
function findValueColumn(
    values: DataViewValueColumn[],
    role: string
): DataViewValueColumn | undefined {
    return values.find(v => !!v.source?.roles?.[role]);
}

function toNumber(v: PrimitiveValue | undefined | null): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export function transform(dataView: DataView | undefined, host: IVisualHost): ChartData | null {
    const cat = dataView?.categorical;
    if (!cat || !cat.categories || cat.categories.length === 0) return null;
    if (!cat.values || cat.values.length === 0) return null;

    const category = cat.categories[0];
    const values = cat.values;
    const actualCol = findValueColumn(values, "actual");
    const forecastCol = findValueColumn(values, "forecast");

    if (!actualCol && !forecastCol) return null;

    const actualFmt = actualCol?.source?.format;
    const forecastFmt = forecastCol?.source?.format;

    const categoryValues = category.values ?? [];
    const categoryFormat = category.source?.format;
    const categoryIsDate = !!category.source?.type?.dateTime
        || categoryValues.some(v => v instanceof Date);

    // Build a formatter for the category:
    //  - For Date-typed categories: ALWAYS force a short numeric date ("dd/MM/yyyy")
    //    regardless of the column's original format (otherwise Power BI can hand us
    //    "dddd d MMMM yyyy" which yields "lundi 1 décembre 2025" — too long for
    //    both the X axis and the pill dropdowns). A short date remains fully
    //    unambiguous across locales and keeps the axis/labels readable.
    //  - For numeric/string categories (months 1-12, years, etc.): use the
    //    column format as-is so integers/years render correctly ("12", "2025").
    const catFormatter = vf.create({
        format: categoryIsDate ? "dd/MM/yyyy" : categoryFormat,
        cultureSelector: host.locale
    });
    const formatCat = (v: PrimitiveValue): string => {
        if (v == null) return "";
        try { return catFormatter.format(v); }
        catch { return String(v); }
    };

    const actualHighlights = actualCol?.highlights as (PrimitiveValue | null)[] | undefined;
    const forecastHighlights = forecastCol?.highlights as (PrimitiveValue | null)[] | undefined;
    const hasHighlights = !!(actualHighlights || forecastHighlights);

    // IMPORTANT: we do NOT sort the category values. Power BI already hands us
    // the data in the order chosen in the field wells (user-controlled via
    // "Sort axis by …"). Re-sorting here would break:
    //   - custom sort orders (e.g. by another measure),
    //   - manual reorderings via the model's "Sort by column" property,
    //   - the "data-as-is" expectation for fiscal calendars where month 4 = April.
    // We cumulate the raw values in the order they arrive.
    const points: ChartPoint[] = [];
    let accA = 0;
    let accF = 0;
    for (let i = 0; i < categoryValues.length; i++) {
        const rawCat = categoryValues[i];
        const aRaw = actualCol ? toNumber(actualCol.values[i]) : null;
        const fRaw = forecastCol ? toNumber(forecastCol.values[i]) : null;
        const aHi = actualHighlights ? toNumber(actualHighlights[i]) !== null : false;
        const fHi = forecastHighlights ? toNumber(forecastHighlights[i]) !== null : false;

        const selectionId = host.createSelectionIdBuilder()
            .withCategory(category, i)
            .createSelectionId();

        let aCum: number | null = null;
        let fCum: number | null = null;
        if (aRaw != null) { accA += aRaw; aCum = accA; }
        if (fRaw != null) { accF += fRaw; fCum = accF; }

        points.push({
            index: i,
            label: formatCat(rawCat),
            rawCategory: rawCat,
            actual: aCum,
            forecast: fCum,
            actualRaw: aRaw,
            forecastRaw: fRaw,
            selectionId,
            highlightedActual: aHi,
            highlightedForecast: fHi
        });
    }

    return {
        points,
        hasActual: !!actualCol,
        hasForecast: !!forecastCol,
        categoryDisplayName: category.source.displayName ?? "",
        actualDisplayName: actualCol?.source.displayName ?? "Actual",
        forecastDisplayName: forecastCol?.source.displayName ?? "Forecast",
        actualFormat: actualFmt,
        forecastFormat: forecastFmt,
        hasHighlights,
        categoryIsDate
    };
}
