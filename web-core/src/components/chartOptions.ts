import type { YMode } from "../data/series";
import { colors, formatAxisCount, formatCount, formatSigned } from "../theme";
import type { EChartsOption } from "./EChart";

export interface ChartSeries {
  handle: string;
  label: string;
  values: (number | null)[];
  /** Categorical color; undefined = muted context line. */
  color?: string;
  /** Hidden series stay in the legend (inactive) so they can be clicked back on. Default true. */
  visible?: boolean;
}

export interface ChartOptionInput {
  dates: string[];
  series: ChartSeries[];
  mode: YMode;
  /** Small-multiple panel: no legend, zoom or end labels; tighter grid. */
  compact?: boolean;
  /** Label of the series under the pointer (read when the tooltip renders). */
  hovered?: () => string | undefined;
  /** Phone-width chart: no end labels (they'd eat the plot width). */
  narrow?: boolean;
  /**
   * Touch device: no drag-to-pan inside the plot, so a swipe scrolls the page
   * instead of getting stuck in the chart. The slider below still zooms.
   */
  touch?: boolean;
}

export function formatValue(mode: YMode, v: number) {
  if (mode === "percent") return `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(1)}%`;
  if (mode === "change") return formatSigned(v);
  return formatCount(v);
}

function formatAxis(mode: YMode, v: number) {
  if (mode === "percent") return `${v > 0 ? "+" : ""}${v}%`;
  if (mode === "change") return `${v > 0 ? "+" : ""}${formatAxisCount(v)}`;
  return formatAxisCount(v);
}

function dateLabel(date: string, withYear: boolean) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: withYear ? "2-digit" : undefined,
    timeZone: "UTC",
  });
}

const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");

interface TooltipParam {
  seriesName: string;
  value: number | null;
  marker: string;
  axisValue: string;
}

export function followersChartOption({
  dates,
  series,
  mode,
  compact = false,
  hovered,
  narrow = false,
  touch = false,
}: ChartOptionInput): EChartsOption {
  const shown = series.filter((s) => s.visible !== false);
  const colored = shown.filter((s) => s.color);
  const permanentLabels = !compact && !narrow && colored.length > 0 && colored.length <= 4;
  const withYear = dates.length > 330;

  // Draw context lines first so colored lines sit on top.
  const ordered = [...series.filter((s) => !s.color), ...series.filter((s) => s.color)];

  return {
    backgroundColor: "transparent",
    animationDuration: 300,
    textStyle: { fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
    legend:
      compact || series.length < 2
        ? { show: false }
        : {
            type: "scroll",
            top: 0,
            left: 0,
            right: 0,
            icon: "roundRect",
            itemWidth: 14,
            itemHeight: 4,
            itemGap: 14,
            textStyle: { color: colors.textSecondary },
            inactiveColor: "#55544f",
            pageTextStyle: { color: colors.textMuted },
            pageIconColor: colors.textSecondary,
            pageIconInactiveColor: colors.axis,
            data: [...series.filter((s) => s.color), ...series.filter((s) => !s.color)].map((s) => s.label),
            selected: Object.fromEntries(series.map((s) => [s.label, s.visible !== false])),
          },
    grid: compact
      ? { left: 8, right: 12, top: 8, bottom: 4, containLabel: true }
      : { left: narrow ? 0 : 8, right: permanentLabels ? 110 : narrow ? 4 : 24, top: series.length < 2 ? 16 : 44, bottom: 56, containLabel: true },
    tooltip: {
      trigger: "axis",
      backgroundColor: colors.elevated,
      borderColor: colors.axis,
      textStyle: { color: colors.textPrimary, fontSize: 12 },
      axisPointer: { type: "line", lineStyle: { color: colors.textMuted, width: 1 } },
      confine: true,
      formatter: (raw: unknown) => {
        const all = raw as TooltipParam[];
        const focus = hovered?.();
        const params = all
          .filter((p) => p.value !== null && p.value !== undefined)
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        const row = (p: TooltipParam, strong = false) =>
          `<div style="display:flex;justify-content:space-between;gap:16px;${strong ? "font-weight:600;font-size:13px" : ""}">` +
          `<span>${p.marker}${escape(p.seriesName)}</span>` +
          `<span style="font-variant-numeric:tabular-nums">${formatValue(mode, p.value!)}</span></div>`;
        const focused = params.find((p) => p.seriesName === focus);
        const rest = params.filter((p) => p !== focused);
        const head = `<div style="color:${colors.textSecondary};margin-bottom:4px">${dateLabel(all[0]?.axisValue ?? "", true)}</div>`;
        if (!params.length) return `${head}<span style="color:${colors.textMuted}">No data</span>`;
        return (
          head +
          (focused
            ? `${row(focused, true)}<div style="border-top:1px solid ${colors.axis};margin:4px 0"></div>`
            : "") +
          rest.map((p) => row(p)).join("")
        );
      },
    },
    xAxis: {
      type: "category",
      data: dates,
      boundaryGap: false,
      axisLine: { lineStyle: { color: colors.axis } },
      axisTick: { show: false },
      axisLabel: {
        color: colors.textMuted,
        hideOverlap: true,
        // Keep the end labels inside the plot; centered, they hang past its edges
        // and containLabel shrinks the plot (and the zoom slider) to make room.
        alignMinLabel: "left",
        alignMaxLabel: "right",
        // Always label the first and last dates; an inner label gives way instead.
        showMinLabel: true,
        showMaxLabel: true,
        formatter: (d: string) => dateLabel(d, withYear),
      },
    },
    yAxis: {
      type: mode === "log" ? "log" : "value",
      scale: mode === "absolute" || mode === "log",
      splitNumber: compact ? 3 : undefined,
      axisLine: { show: false },
      axisLabel: { color: colors.textMuted, formatter: (v: number) => formatAxis(mode, v) },
      splitLine: { lineStyle: { color: colors.grid, width: 1 } },
    },
    dataZoom: compact
      ? []
      : [
          ...(touch ? [] : [{ type: "inside" }]),
          {
            type: "slider",
            height: touch ? 24 : 18,
            bottom: 8,
            borderColor: colors.axis,
            backgroundColor: "transparent",
            fillerColor: "rgba(57,135,229,0.15)",
            handleStyle: { color: colors.textSecondary, borderColor: colors.axis },
            moveHandleStyle: { color: colors.axis },
            textStyle: { color: colors.textMuted },
            dataBackground: {
              lineStyle: { color: colors.textMuted, opacity: 0.5 },
              areaStyle: { color: colors.axis, opacity: 0.3 },
            },
            labelFormatter: (_: number, d: string) => dateLabel(d, true),
          },
        ],
    series: ordered.map((s) => ({
      type: "line",
      id: s.handle,
      name: s.label,
      data: s.values,
      // Missing days are gaps, never bridged.
      connectNulls: false,
      showSymbol: false,
      symbol: "circle",
      z: s.color ? 3 : 2,
      color: s.color ?? colors.context,
      lineStyle: {
        width: s.color ? 2 : 1.25,
        opacity: s.color ? 1 : 0.7,
        cap: "round",
        join: "round",
      },
      // Direct end labels only when a few colored lines can't pile up.
      endLabel:
        permanentLabels && s.color
          ? { show: true, formatter: s.label, distance: 6, color: colors.textSecondary }
          : undefined,
      emphasis: {
        focus: "series",
        lineStyle: { width: 3, color: s.color ?? colors.textPrimary, opacity: 1 },
      },
      blur: { lineStyle: { opacity: 0.12 }, itemStyle: { opacity: 0.12 } },
    })),
  };
}
