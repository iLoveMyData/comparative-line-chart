import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

const DEFAULT_FONT = "\"Segoe UI\", Roboto, sans-serif";

class TitleCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show",
        displayNameKey: "Prop_Show",
        value: true
    });
    text = new formattingSettings.TextInput({
        name: "text",
        displayName: "Text",
        displayNameKey: "Prop_Text",
        value: "",
        placeholder: "Chart title"
    });
    color = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Color",
        displayNameKey: "Prop_Color",
        value: { value: "#0E1336" }
    });
    fontFamily = new formattingSettings.FontPicker({
        name: "fontFamily",
        displayName: "Font family",
        displayNameKey: "Prop_FontFamily",
        value: DEFAULT_FONT
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Size",
        displayNameKey: "Prop_FontSize",
        value: 16,
        options: {
            minValue: { value: 10, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 32, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    fontBold = new formattingSettings.ToggleSwitch({
        name: "fontBold",
        displayName: "Bold",
        displayNameKey: "Prop_Bold",
        value: true
    });
    fontItalic = new formattingSettings.ToggleSwitch({
        name: "fontItalic",
        displayName: "Italic",
        displayNameKey: "Prop_Italic",
        value: false
    });
    fontUnderline = new formattingSettings.ToggleSwitch({
        name: "fontUnderline",
        displayName: "Underline",
        displayNameKey: "Prop_Underline",
        value: false
    });
    align = new formattingSettings.AutoDropdown({
        name: "align",
        displayName: "Alignment",
        displayNameKey: "Prop_Align",
        value: "left"
    });

    name = "title";
    displayName = "Title";
    displayNameKey = "Obj_Title";
    topLevelSlice = this.show;
    slices: FormattingSettingsSlice[] = [
        this.text, this.color, this.fontFamily, this.fontSize,
        this.fontBold, this.fontItalic, this.fontUnderline, this.align
    ];
}

class SeriesCard extends FormattingSettingsCard {
    nameActual = new formattingSettings.TextInput({
        name: "nameActual",
        displayName: "Series A label (override)",
        displayNameKey: "Prop_NameActual",
        value: "",
        placeholder: "Use measure name"
    });
    nameForecast = new formattingSettings.TextInput({
        name: "nameForecast",
        displayName: "Series B label (override)",
        displayNameKey: "Prop_NameForecast",
        value: "",
        placeholder: "Use measure name"
    });
    curveType = new formattingSettings.AutoDropdown({
        name: "curveType",
        displayName: "Curve",
        displayNameKey: "Prop_CurveType",
        value: "monotone"
    });
    colorActual = new formattingSettings.ColorPicker({
        name: "colorActual",
        displayName: "Series A color",
        displayNameKey: "Prop_ColorActual",
        value: { value: "#F0477A" }
    });
    colorForecast = new formattingSettings.ColorPicker({
        name: "colorForecast",
        displayName: "Series B color",
        displayNameKey: "Prop_ColorForecast",
        value: { value: "#7E45FF" }
    });
    strokeActual = new formattingSettings.Slider({
        name: "strokeActual",
        displayName: "Series A stroke",
        displayNameKey: "Prop_StrokeActual",
        value: 3,
        options: {
            minValue: { value: 1, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 8, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    strokeForecast = new formattingSettings.Slider({
        name: "strokeForecast",
        displayName: "Series B stroke",
        displayNameKey: "Prop_StrokeForecast",
        value: 3,
        options: {
            minValue: { value: 1, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 8, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    lineOpacity = new formattingSettings.Slider({
        name: "lineOpacity",
        displayName: "Line opacity",
        displayNameKey: "Prop_LineOpacity",
        value: 100,
        options: {
            minValue: { value: 20, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 100, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    dashLen = new formattingSettings.Slider({
        name: "dashLen",
        displayName: "Dash length",
        displayNameKey: "Prop_DashLen",
        value: 8,
        options: {
            minValue: { value: 2, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 20, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    dashGap = new formattingSettings.Slider({
        name: "dashGap",
        displayName: "Dash gap",
        displayNameKey: "Prop_DashGap",
        value: 11,
        options: {
            minValue: { value: 2, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 20, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name = "series";
    displayName = "Series & curves";
    displayNameKey = "Obj_Series";
    slices: FormattingSettingsSlice[] = [
        this.nameActual, this.nameForecast, this.curveType,
        this.colorActual, this.colorForecast, this.strokeActual, this.strokeForecast,
        this.lineOpacity, this.dashLen, this.dashGap
    ];
}

class LegendCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show",
        displayNameKey: "Prop_Show",
        value: true
    });
    color = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Color",
        displayNameKey: "Prop_Color",
        value: { value: "#8A8AAA" }
    });
    fontFamily = new formattingSettings.FontPicker({
        name: "fontFamily",
        displayName: "Font family",
        displayNameKey: "Prop_FontFamily",
        value: DEFAULT_FONT
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Size",
        displayNameKey: "Prop_FontSize",
        value: 14,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 24, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    fontBold = new formattingSettings.ToggleSwitch({
        name: "fontBold",
        displayName: "Bold",
        displayNameKey: "Prop_Bold",
        value: false
    });
    fontItalic = new formattingSettings.ToggleSwitch({
        name: "fontItalic",
        displayName: "Italic",
        displayNameKey: "Prop_Italic",
        value: false
    });
    fontUnderline = new formattingSettings.ToggleSwitch({
        name: "fontUnderline",
        displayName: "Underline",
        displayNameKey: "Prop_Underline",
        value: false
    });
    swatchSize = new formattingSettings.Slider({
        name: "swatchSize",
        displayName: "Swatch size",
        displayNameKey: "Prop_SwatchSize",
        value: 10,
        options: {
            minValue: { value: 6, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 20, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name = "legend";
    displayName = "Legend";
    displayNameKey = "Obj_Legend";
    topLevelSlice = this.show;
    slices: FormattingSettingsSlice[] = [
        this.color, this.fontFamily, this.fontSize,
        this.fontBold, this.fontItalic, this.fontUnderline, this.swatchSize
    ];
}

class AxesCard extends FormattingSettingsCard {
    xShow = new formattingSettings.ToggleSwitch({
        name: "xShow",
        displayName: "Show X axis",
        displayNameKey: "Prop_XShow",
        value: true
    });
    xColor = new formattingSettings.ColorPicker({
        name: "xColor",
        displayName: "X color",
        displayNameKey: "Prop_XColor",
        value: { value: "#8A8AAA" }
    });
    xSize = new formattingSettings.NumUpDown({
        name: "xSize",
        displayName: "X size",
        displayNameKey: "Prop_XSize",
        value: 12,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 20, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    yShow = new formattingSettings.ToggleSwitch({
        name: "yShow",
        displayName: "Show Y axis",
        displayNameKey: "Prop_YShow",
        value: true
    });
    yColor = new formattingSettings.ColorPicker({
        name: "yColor",
        displayName: "Y color",
        displayNameKey: "Prop_YColor",
        value: { value: "#8A8AAA" }
    });
    ySize = new formattingSettings.NumUpDown({
        name: "ySize",
        displayName: "Y size",
        displayNameKey: "Prop_YSize",
        value: 12,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 20, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    yTicks = new formattingSettings.Slider({
        name: "yTicks",
        displayName: "Y ticks",
        displayNameKey: "Prop_YTicks",
        value: 8,
        options: {
            minValue: { value: 3, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 14, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    gridShow = new formattingSettings.ToggleSwitch({
        name: "gridShow",
        displayName: "Show grid",
        displayNameKey: "Prop_GridShow",
        value: true
    });
    gridColor = new formattingSettings.ColorPicker({
        name: "gridColor",
        displayName: "Grid color",
        displayNameKey: "Prop_GridColor",
        value: { value: "#EFEFF6" }
    });
    gridOpacity = new formattingSettings.Slider({
        name: "gridOpacity",
        displayName: "Grid opacity",
        displayNameKey: "Prop_GridOpacity",
        value: 100,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 100, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    fontFamily = new formattingSettings.FontPicker({
        name: "fontFamily",
        displayName: "Font family",
        displayNameKey: "Prop_FontFamily",
        value: DEFAULT_FONT
    });
    fontBold = new formattingSettings.ToggleSwitch({
        name: "fontBold",
        displayName: "Bold",
        displayNameKey: "Prop_Bold",
        value: false
    });
    fontItalic = new formattingSettings.ToggleSwitch({
        name: "fontItalic",
        displayName: "Italic",
        displayNameKey: "Prop_Italic",
        value: false
    });
    padTop = new formattingSettings.Slider({
        name: "padTop",
        displayName: "Top padding",
        displayNameKey: "Prop_PadTop",
        value: 18,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 60, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    padRight = new formattingSettings.Slider({
        name: "padRight",
        displayName: "Right padding",
        displayNameKey: "Prop_PadRight",
        value: 26,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 60, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    padBottom = new formattingSettings.Slider({
        name: "padBottom",
        displayName: "Bottom padding",
        displayNameKey: "Prop_PadBottom",
        value: 26,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 80, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    padLeft = new formattingSettings.Slider({
        name: "padLeft",
        displayName: "Left padding",
        displayNameKey: "Prop_PadLeft",
        value: 48,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 120, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name = "axes";
    displayName = "Axes & grid";
    displayNameKey = "Obj_Axes";
    slices: FormattingSettingsSlice[] = [
        this.xShow, this.xColor, this.xSize,
        this.yShow, this.yColor, this.ySize, this.yTicks,
        this.gridShow, this.gridColor, this.gridOpacity,
        this.fontFamily, this.fontBold, this.fontItalic,
        this.padTop, this.padRight, this.padBottom, this.padLeft
    ];
}

class TooltipCard extends FormattingSettingsCard {
    bg = new formattingSettings.ColorPicker({
        name: "bg",
        displayName: "Background",
        displayNameKey: "Prop_TtBg",
        value: { value: "#14162E" }
    });
    text = new formattingSettings.ColorPicker({
        name: "text",
        displayName: "Text",
        displayNameKey: "Prop_TtText",
        value: { value: "#FFFFFF" }
    });
    fontFamily = new formattingSettings.FontPicker({
        name: "fontFamily",
        displayName: "Font family",
        displayNameKey: "Prop_FontFamily",
        value: DEFAULT_FONT
    });
    size = new formattingSettings.NumUpDown({
        name: "size",
        displayName: "Text size",
        displayNameKey: "Prop_TtSize",
        value: 13,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 20, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    fontBold = new formattingSettings.ToggleSwitch({
        name: "fontBold",
        displayName: "Bold",
        displayNameKey: "Prop_Bold",
        value: true
    });
    fontItalic = new formattingSettings.ToggleSwitch({
        name: "fontItalic",
        displayName: "Italic",
        displayNameKey: "Prop_Italic",
        value: false
    });
    radius = new formattingSettings.Slider({
        name: "radius",
        displayName: "Radius",
        displayNameKey: "Prop_TtRadius",
        value: 10,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 20, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name = "tooltipStyle";
    displayName = "Tooltip";
    displayNameKey = "Obj_Tooltip";
    slices: FormattingSettingsSlice[] = [
        this.bg, this.text, this.fontFamily, this.size,
        this.fontBold, this.fontItalic, this.radius
    ];
}

class ComparisonCard extends FormattingSettingsCard {
    enabled = new formattingSettings.ToggleSwitch({
        name: "enabled",
        displayName: "Enable comparison mode",
        displayNameKey: "Prop_CompEnabled",
        value: true
    });
    zoneColor = new formattingSettings.ColorPicker({
        name: "zoneColor",
        displayName: "Zone color",
        displayNameKey: "Prop_ZoneColor",
        value: { value: "#DCDCEA" }
    });
    zoneOpacity = new formattingSettings.Slider({
        name: "zoneOpacity",
        displayName: "Zone opacity",
        displayNameKey: "Prop_ZoneOpacity",
        value: 55,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 100, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    delimColor = new formattingSettings.ColorPicker({
        name: "delimColor",
        displayName: "Delimiter color",
        displayNameKey: "Prop_DelimColor",
        value: { value: "#14162E" }
    });
    delimWidth = new formattingSettings.Slider({
        name: "delimWidth",
        displayName: "Delimiter width",
        displayNameKey: "Prop_DelimWidth",
        value: 2,
        options: {
            minValue: { value: 1, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 6, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    delimStyle = new formattingSettings.AutoDropdown({
        name: "delimStyle",
        displayName: "Delimiter style",
        displayNameKey: "Prop_DelimStyle",
        value: "solid"
    });
    name = "comparison";
    displayName = "Comparison mode";
    displayNameKey = "Obj_Comparison";
    topLevelSlice = this.enabled;
    slices: FormattingSettingsSlice[] = [
        this.zoneColor, this.zoneOpacity, this.delimColor, this.delimWidth, this.delimStyle
    ];
}

/**
 * Markers card — controls the radius / stroke of the two kinds of dots that
 * appear on the curves:
 *   - the hover marker that follows the tooltip cross-hair
 *   - the end-of-solid-curve marker shown when comparison mode is on
 * Kept as its own card (rather than nested under Comparison) so the user
 * can still tweak the hover marker size when comparison is disabled.
 */
class MarkersCard extends FormattingSettingsCard {
    markerR = new formattingSettings.Slider({
        name: "markerR",
        displayName: "Marker radius",
        displayNameKey: "Prop_MarkerR",
        value: 6,
        options: {
            minValue: { value: 2, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 12, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    markerSW = new formattingSettings.Slider({
        name: "markerSW",
        displayName: "Marker stroke",
        displayNameKey: "Prop_MarkerSW",
        value: 3,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 6, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name = "markers";
    displayName = "Markers";
    displayNameKey = "Obj_Markers";
    slices: FormattingSettingsSlice[] = [this.markerR, this.markerSW];
}

class PanelCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show panel",
        displayNameKey: "Prop_Show",
        value: true
    });
    headText = new formattingSettings.TextInput({
        name: "headText",
        displayName: "Title",
        displayNameKey: "Prop_HeadText",
        value: "",
        placeholder: "Over this period"
    });
    headColor = new formattingSettings.ColorPicker({
        name: "headColor",
        displayName: "Title color",
        displayNameKey: "Prop_HeadColor",
        value: { value: "#0E1336" }
    });
    headSize = new formattingSettings.NumUpDown({
        name: "headSize",
        displayName: "Title size",
        displayNameKey: "Prop_HeadSize",
        value: 21,
        options: {
            minValue: { value: 10, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 40, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    valColor = new formattingSettings.ColorPicker({
        name: "valColor",
        displayName: "Value color",
        displayNameKey: "Prop_ValColor",
        value: { value: "#0E1336" }
    });
    valSize = new formattingSettings.NumUpDown({
        name: "valSize",
        displayName: "Value size",
        displayNameKey: "Prop_ValSize",
        value: 30,
        options: {
            minValue: { value: 14, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 60, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    lblColor = new formattingSettings.ColorPicker({
        name: "lblColor",
        displayName: "Label color",
        displayNameKey: "Prop_LblColor",
        value: { value: "#8A8AAA" }
    });
    lblSize = new formattingSettings.NumUpDown({
        name: "lblSize",
        displayName: "Label size",
        displayNameKey: "Prop_LblSize",
        value: 14,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 22, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    deltaSize = new formattingSettings.NumUpDown({
        name: "deltaSize",
        displayName: "Delta size",
        displayNameKey: "Prop_DeltaSize",
        value: 24,
        options: {
            minValue: { value: 10, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 48, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    colorPos = new formattingSettings.ColorPicker({
        name: "colorPos",
        displayName: "Delta positive",
        displayNameKey: "Prop_ColorPos",
        value: { value: "#24C38E" }
    });
    colorNeg = new formattingSettings.ColorPicker({
        name: "colorNeg",
        displayName: "Delta negative",
        displayNameKey: "Prop_ColorNeg",
        value: { value: "#F0477A" }
    });
    sepColor = new formattingSettings.ColorPicker({
        name: "sepColor",
        displayName: "Separators",
        displayNameKey: "Prop_SepColor",
        value: { value: "#E2E2EF" }
    });
    lblDelta = new formattingSettings.TextInput({
        name: "lblDelta",
        displayName: "Delta label",
        displayNameKey: "Prop_LblDelta",
        value: "",
        placeholder: "Delta"
    });
    fontFamily = new formattingSettings.FontPicker({
        name: "fontFamily",
        displayName: "Font family",
        displayNameKey: "Prop_FontFamily",
        value: DEFAULT_FONT
    });
    fontItalic = new formattingSettings.ToggleSwitch({
        name: "fontItalic",
        displayName: "Italic",
        displayNameKey: "Prop_Italic",
        value: false
    });
    fontUnderline = new formattingSettings.ToggleSwitch({
        name: "fontUnderline",
        displayName: "Underline",
        displayNameKey: "Prop_Underline",
        value: false
    });
    widthPct = new formattingSettings.Slider({
        name: "widthPct",
        displayName: "Width (%)",
        displayNameKey: "Prop_PanelWidthPct",
        value: 30,
        options: {
            minValue: { value: 15, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 45, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    bgColor = new formattingSettings.ColorPicker({
        name: "bgColor",
        displayName: "Background",
        displayNameKey: "Prop_PanelBg",
        value: { value: "#FFFFFF" }
    });
    radius = new formattingSettings.Slider({
        name: "radius",
        displayName: "Radius",
        displayNameKey: "Prop_PanelRadius",
        value: 0,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 24, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    padding = new formattingSettings.Slider({
        name: "padding",
        displayName: "Padding",
        displayNameKey: "Prop_PanelPadding",
        value: 18,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 40, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name = "panel";
    displayName = "Side panel";
    displayNameKey = "Obj_Panel";
    topLevelSlice = this.show;
    slices: FormattingSettingsSlice[] = [
        this.headText, this.headColor, this.headSize,
        this.valColor, this.valSize, this.lblColor, this.lblSize,
        this.deltaSize, this.colorPos, this.colorNeg, this.sepColor, this.lblDelta,
        this.fontFamily, this.fontItalic, this.fontUnderline,
        this.widthPct, this.bgColor, this.radius, this.padding
    ];
}

class ToggleCard extends FormattingSettingsCard {
    showLabel = new formattingSettings.ToggleSwitch({
        name: "showLabel",
        displayName: "Show label",
        displayNameKey: "Prop_ToggleShowLabel",
        value: true
    });
    label = new formattingSettings.TextInput({
        name: "label",
        displayName: "Label",
        displayNameKey: "Prop_ToggleLabel",
        value: "",
        placeholder: "Comparison"
    });
    globalScale = new formattingSettings.NumUpDown({
        name: "globalScale",
        displayName: "Global scale (%)",
        displayNameKey: "Prop_ToggleScale",
        value: 100,
        options: {
            minValue: { value: 50, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 200, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    radius = new formattingSettings.Slider({
        name: "radius",
        displayName: "Pill radius",
        displayNameKey: "Prop_ToggleRadius",
        value: 999,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 999, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    bgOff = new formattingSettings.ColorPicker({
        name: "bgOff",
        displayName: "Background off",
        displayNameKey: "Prop_BgOff",
        value: { value: "#E2E2EF" }
    });
    bgOn = new formattingSettings.ColorPicker({
        name: "bgOn",
        displayName: "Background on",
        displayNameKey: "Prop_BgOn",
        value: { value: "#7E45FF" }
    });
    pillW = new formattingSettings.Slider({
        name: "pillW",
        displayName: "Pill width",
        displayNameKey: "Prop_PillW",
        value: 46,
        options: {
            minValue: { value: 30, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 80, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    pillH = new formattingSettings.Slider({
        name: "pillH",
        displayName: "Pill height",
        displayNameKey: "Prop_PillH",
        value: 24,
        options: {
            minValue: { value: 16, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 40, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    thumb = new formattingSettings.Slider({
        name: "thumb",
        displayName: "Thumb size",
        displayNameKey: "Prop_ThumbSize",
        value: 20,
        options: {
            minValue: { value: 10, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 32, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    labelColor = new formattingSettings.ColorPicker({
        name: "labelColor",
        displayName: "Label color (off)",
        displayNameKey: "Prop_LabelColor",
        value: { value: "#8A8AAA" }
    });
    labelColorOn = new formattingSettings.ColorPicker({
        name: "labelColorOn",
        displayName: "Label color (on)",
        displayNameKey: "Prop_LabelColorOn",
        value: { value: "#7E45FF" }
    });
    labelSize = new formattingSettings.NumUpDown({
        name: "labelSize",
        displayName: "Label size",
        displayNameKey: "Prop_LabelSize",
        value: 13,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 20, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    fontFamily = new formattingSettings.FontPicker({
        name: "fontFamily",
        displayName: "Font family",
        displayNameKey: "Prop_FontFamily",
        value: DEFAULT_FONT
    });
    fontBold = new formattingSettings.ToggleSwitch({
        name: "fontBold",
        displayName: "Bold",
        displayNameKey: "Prop_Bold",
        value: true
    });
    fontItalic = new formattingSettings.ToggleSwitch({
        name: "fontItalic",
        displayName: "Italic",
        displayNameKey: "Prop_Italic",
        value: false
    });
    fontUnderline = new formattingSettings.ToggleSwitch({
        name: "fontUnderline",
        displayName: "Underline",
        displayNameKey: "Prop_Underline",
        value: false
    });

    name = "toggle";
    displayName = "Comparison toggle";
    displayNameKey = "Obj_Toggle";
    slices: FormattingSettingsSlice[] = [
        this.globalScale, this.showLabel, this.label,
        this.bgOff, this.bgOn, this.pillW, this.pillH, this.thumb, this.radius,
        this.labelColor, this.labelColorOn, this.labelSize,
        this.fontFamily, this.fontBold, this.fontItalic, this.fontUnderline
    ];
}

class DropdownsCard extends FormattingSettingsCard {
    showLabel = new formattingSettings.ToggleSwitch({
        name: "showLabel",
        displayName: "Show label",
        displayNameKey: "Prop_DropShowLabel",
        value: true
    });
    label = new formattingSettings.TextInput({
        name: "label",
        displayName: "Label",
        displayNameKey: "Prop_DropLabel",
        value: "",
        placeholder: "Analyzed period:"
    });
    border = new formattingSettings.ColorPicker({
        name: "border",
        displayName: "Border",
        displayNameKey: "Prop_DropBorder",
        value: { value: "#E2E2EF" }
    });
    bg = new formattingSettings.ColorPicker({
        name: "bg",
        displayName: "Background",
        displayNameKey: "Prop_DropBg",
        value: { value: "#FFFFFF" }
    });
    text = new formattingSettings.ColorPicker({
        name: "text",
        displayName: "Text",
        displayNameKey: "Prop_DropText",
        value: { value: "#0E1336" }
    });
    radius = new formattingSettings.Slider({
        name: "radius",
        displayName: "Radius",
        displayNameKey: "Prop_DropRadius",
        value: 99,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 99, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    fontFamily = new formattingSettings.FontPicker({
        name: "fontFamily",
        displayName: "Font family",
        displayNameKey: "Prop_FontFamily",
        value: DEFAULT_FONT
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Text size",
        displayNameKey: "Prop_DropFontSize",
        value: 13,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 20, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    fontBold = new formattingSettings.ToggleSwitch({
        name: "fontBold",
        displayName: "Bold",
        displayNameKey: "Prop_Bold",
        value: false
    });
    fontItalic = new formattingSettings.ToggleSwitch({
        name: "fontItalic",
        displayName: "Italic",
        displayNameKey: "Prop_Italic",
        value: false
    });
    padV = new formattingSettings.Slider({
        name: "padV",
        displayName: "Padding Y",
        displayNameKey: "Prop_DropPadV",
        value: 5,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 14, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    padH = new formattingSettings.Slider({
        name: "padH",
        displayName: "Padding X",
        displayNameKey: "Prop_DropPadH",
        value: 12,
        options: {
            minValue: { value: 4, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 28, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    menuHoverBg = new formattingSettings.ColorPicker({
        name: "menuHoverBg",
        displayName: "Menu hover",
        displayNameKey: "Prop_DropHoverBg",
        value: { value: "#F3EEFF" }
    });
    menuSelectedBg = new formattingSettings.ColorPicker({
        name: "menuSelectedBg",
        displayName: "Menu selected",
        displayNameKey: "Prop_DropSelectedBg",
        value: { value: "#7E45FF" }
    });
    menuSelectedText = new formattingSettings.ColorPicker({
        name: "menuSelectedText",
        displayName: "Menu selected text",
        displayNameKey: "Prop_DropSelectedText",
        value: { value: "#FFFFFF" }
    });

    name = "dropdowns";
    displayName = "Period selectors";
    displayNameKey = "Obj_Dropdowns";
    slices: FormattingSettingsSlice[] = [
        this.showLabel, this.label,
        this.border, this.bg, this.text, this.radius,
        this.fontFamily, this.fontSize, this.fontBold, this.fontItalic,
        this.padV, this.padH,
        this.menuHoverBg, this.menuSelectedBg, this.menuSelectedText
    ];
}

class NumberFormatCard extends FormattingSettingsCard {
    unit = new formattingSettings.AutoDropdown({
        name: "unit",
        displayName: "Units",
        displayNameKey: "Prop_Unit",
        value: "1"
    });
    decimals = new formattingSettings.NumUpDown({
        name: "decimals",
        displayName: "Decimals",
        displayNameKey: "Prop_Decimals",
        value: 0,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 4, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name = "numberFormat";
    displayName = "Number format";
    displayNameKey = "Obj_NumberFormat";
    slices: FormattingSettingsSlice[] = [this.unit, this.decimals];
}

/**
 * Data labels card — per-series, deeply customisable value labels with an
 * automatic collision-avoidance layout (above → below → right → left →
 * diagonals) plus a global X/Y offset per series for manual fine-tuning.
 *
 * Features richer than the native Power BI line-chart labels:
 *   - per-series enable, colour, font size, bold/italic, bg + bg opacity,
 *   - per-series position preset AND global X/Y offset,
 *   - shared: font family, border (colour/width/radius), padding,
 *     density (all / first-last / every-N / endpoints-only),
 *     leader lines (colour / width / dash),
 *     auto collision-avoidance (can be disabled),
 *     format override (e.g. "#,##0.0 k€") and decimals override.
 */
class DataLabelsCard extends FormattingSettingsCard {
    // --- Series A (per-series independence) ---
    showA = new formattingSettings.ToggleSwitch({
        name: "showA", displayNameKey: "Prop_DLShowA",
        displayName: "Show Series A labels", value: false
    });
    positionA = new formattingSettings.AutoDropdown({
        name: "positionA", displayNameKey: "Prop_DLPositionA",
        displayName: "Series A position", value: "auto"
    });
    colorA = new formattingSettings.ColorPicker({
        name: "colorA", displayNameKey: "Prop_DLColorA",
        displayName: "Series A text color", value: { value: "#0E1336" }
    });
    fontSizeA = new formattingSettings.NumUpDown({
        name: "fontSizeA", displayNameKey: "Prop_DLFontSizeA",
        displayName: "Series A font size", value: 11,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 24, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    boldA = new formattingSettings.ToggleSwitch({
        name: "boldA", displayNameKey: "Prop_DLBoldA",
        displayName: "Series A bold", value: true
    });
    italicA = new formattingSettings.ToggleSwitch({
        name: "italicA", displayNameKey: "Prop_DLItalicA",
        displayName: "Series A italic", value: false
    });
    bgColorA = new formattingSettings.ColorPicker({
        name: "bgColorA", displayNameKey: "Prop_DLBgColorA",
        displayName: "Series A background", value: { value: "#FFFFFF" }
    });
    bgOpacityA = new formattingSettings.Slider({
        name: "bgOpacityA", displayNameKey: "Prop_DLBgOpacityA",
        displayName: "Series A background opacity", value: 85,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 100, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    offsetXA = new formattingSettings.Slider({
        name: "offsetXA", displayNameKey: "Prop_DLOffsetXA",
        displayName: "Series A X offset", value: 0,
        options: {
            minValue: { value: -60, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 60, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    offsetYA = new formattingSettings.Slider({
        name: "offsetYA", displayNameKey: "Prop_DLOffsetYA",
        displayName: "Series A Y offset", value: 0,
        options: {
            minValue: { value: -60, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 60, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    // --- Series F (same set, independent) ---
    showF = new formattingSettings.ToggleSwitch({
        name: "showF", displayNameKey: "Prop_DLShowF",
        displayName: "Show Series B labels", value: false
    });
    positionF = new formattingSettings.AutoDropdown({
        name: "positionF", displayNameKey: "Prop_DLPositionF",
        displayName: "Series B position", value: "auto"
    });
    colorF = new formattingSettings.ColorPicker({
        name: "colorF", displayNameKey: "Prop_DLColorF",
        displayName: "Series B text color", value: { value: "#0E1336" }
    });
    fontSizeF = new formattingSettings.NumUpDown({
        name: "fontSizeF", displayNameKey: "Prop_DLFontSizeF",
        displayName: "Series B font size", value: 11,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 24, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    boldF = new formattingSettings.ToggleSwitch({
        name: "boldF", displayNameKey: "Prop_DLBoldF",
        displayName: "Series B bold", value: true
    });
    italicF = new formattingSettings.ToggleSwitch({
        name: "italicF", displayNameKey: "Prop_DLItalicF",
        displayName: "Series B italic", value: false
    });
    bgColorF = new formattingSettings.ColorPicker({
        name: "bgColorF", displayNameKey: "Prop_DLBgColorF",
        displayName: "Series B background", value: { value: "#FFFFFF" }
    });
    bgOpacityF = new formattingSettings.Slider({
        name: "bgOpacityF", displayNameKey: "Prop_DLBgOpacityF",
        displayName: "Series B background opacity", value: 85,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 100, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    offsetXF = new formattingSettings.Slider({
        name: "offsetXF", displayNameKey: "Prop_DLOffsetXF",
        displayName: "Series B X offset", value: 0,
        options: {
            minValue: { value: -60, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 60, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    offsetYF = new formattingSettings.Slider({
        name: "offsetYF", displayNameKey: "Prop_DLOffsetYF",
        displayName: "Series B Y offset", value: 0,
        options: {
            minValue: { value: -60, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 60, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    // --- Shared (typography, box, density, leaders, layout) ---
    fontFamily = new formattingSettings.FontPicker({
        name: "fontFamily", displayNameKey: "Prop_FontFamily",
        displayName: "Font family", value: DEFAULT_FONT
    });
    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor", displayNameKey: "Prop_DLBorderColor",
        displayName: "Border color", value: { value: "#DCDCEA" }
    });
    borderWidth = new formattingSettings.Slider({
        name: "borderWidth", displayNameKey: "Prop_DLBorderWidth",
        displayName: "Border width", value: 0,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 4, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    borderRadius = new formattingSettings.Slider({
        name: "borderRadius", displayNameKey: "Prop_DLBorderRadius",
        displayName: "Border radius", value: 4,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 12, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    padH = new formattingSettings.Slider({
        name: "padH", displayNameKey: "Prop_DLPadH",
        displayName: "Horizontal padding", value: 6,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 16, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    padV = new formattingSettings.Slider({
        name: "padV", displayNameKey: "Prop_DLPadV",
        displayName: "Vertical padding", value: 3,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 16, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    density = new formattingSettings.AutoDropdown({
        name: "density", displayNameKey: "Prop_DLDensity",
        displayName: "Density", value: "all"
    });
    everyN = new formattingSettings.Slider({
        name: "everyN", displayNameKey: "Prop_DLEveryN",
        displayName: "Every N points", value: 2,
        options: {
            minValue: { value: 2, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 10, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    avoidCollision = new formattingSettings.ToggleSwitch({
        name: "avoidCollision", displayNameKey: "Prop_DLAvoidCollision",
        displayName: "Auto collision avoidance", value: true
    });
    showLeader = new formattingSettings.ToggleSwitch({
        name: "showLeader", displayNameKey: "Prop_DLShowLeader",
        displayName: "Show leader lines", value: true
    });
    leaderColor = new formattingSettings.ColorPicker({
        name: "leaderColor", displayNameKey: "Prop_DLLeaderColor",
        displayName: "Leader color", value: { value: "#B8B8C8" }
    });
    leaderWidth = new formattingSettings.Slider({
        name: "leaderWidth", displayNameKey: "Prop_DLLeaderWidth",
        displayName: "Leader width", value: 1,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 3, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    leaderDash = new formattingSettings.AutoDropdown({
        name: "leaderDash", displayNameKey: "Prop_DLLeaderDash",
        displayName: "Leader style", value: "dotted"
    });
    formatOverride = new formattingSettings.TextInput({
        name: "formatOverride", displayNameKey: "Prop_DLFormatOverride",
        displayName: "Format override", value: "",
        placeholder: "e.g. #,##0.0 k€"
    });
    decimalsOverride = new formattingSettings.NumUpDown({
        name: "decimalsOverride", displayNameKey: "Prop_DLDecimalsOverride",
        displayName: "Decimals override", value: -1,
        options: {
            minValue: { value: -1, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 4, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name = "dataLabels";
    displayName = "Data labels";
    displayNameKey = "Obj_DataLabels";
    slices: FormattingSettingsSlice[] = [
        this.showA, this.positionA, this.colorA, this.fontSizeA,
        this.boldA, this.italicA, this.bgColorA, this.bgOpacityA,
        this.offsetXA, this.offsetYA,
        this.showF, this.positionF, this.colorF, this.fontSizeF,
        this.boldF, this.italicF, this.bgColorF, this.bgOpacityF,
        this.offsetXF, this.offsetYF,
        this.fontFamily,
        this.borderColor, this.borderWidth, this.borderRadius,
        this.padH, this.padV,
        this.density, this.everyN,
        this.avoidCollision,
        this.showLeader, this.leaderColor, this.leaderWidth, this.leaderDash,
        this.formatOverride, this.decimalsOverride
    ];
}

class AnimationsCard extends FormattingSettingsCard {
    enabled = new formattingSettings.ToggleSwitch({
        name: "enabled",
        displayName: "Enabled",
        displayNameKey: "Prop_AnimEnabled",
        value: true
    });
    duration = new formattingSettings.Slider({
        name: "duration",
        displayName: "Duration (ms)",
        displayNameKey: "Prop_AnimDuration",
        value: 1400,
        options: {
            minValue: { value: 200, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 3500, type: powerbi.visuals.ValidatorType.Max }
        }
    });
    easing = new formattingSettings.AutoDropdown({
        name: "easing",
        displayName: "Easing",
        displayNameKey: "Prop_AnimEasing",
        value: "polyOut"
    });
    shimmer = new formattingSettings.ToggleSwitch({
        name: "shimmer",
        displayName: "Shimmer sweep",
        displayNameKey: "Prop_AnimShimmer",
        value: true
    });
    markerStagger = new formattingSettings.Slider({
        name: "markerStagger",
        displayName: "Marker stagger (ms)",
        displayNameKey: "Prop_AnimStagger",
        value: 120,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 400, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name = "animations";
    displayName = "Animations";
    displayNameKey = "Obj_Animations";
    topLevelSlice = this.enabled;
    slices: FormattingSettingsSlice[] = [this.duration, this.easing, this.shimmer, this.markerStagger];
}

export class VisualSettings extends FormattingSettingsModel {
    title = new TitleCard();
    series = new SeriesCard();
    legend = new LegendCard();
    axes = new AxesCard();
    tooltipStyle = new TooltipCard();
    comparison = new ComparisonCard();
    markers = new MarkersCard();
    panel = new PanelCard();
    toggle = new ToggleCard();
    dropdowns = new DropdownsCard();
    numberFormat = new NumberFormatCard();
    dataLabels = new DataLabelsCard();
    animations = new AnimationsCard();

    cards = [
        this.title, this.series, this.legend, this.axes, this.tooltipStyle,
        this.comparison, this.markers, this.panel, this.toggle, this.dropdowns,
        this.numberFormat, this.dataLabels, this.animations
    ];
}
