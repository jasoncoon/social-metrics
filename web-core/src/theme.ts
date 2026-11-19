import { theme, type ThemeConfig } from "antd";

/**
 * Dark palette. Chart colors come from the dataviz reference palette's dark
 * column, validated (CVD + contrast) against the #1a1a19 chart surface.
 */
export const colors = {
  page: "#0d0d0d",
  surface: "#1a1a19",
  elevated: "#232321",
  textPrimary: "#f0efec",
  textSecondary: "#c3c2b7",
  textMuted: "#898781",
  grid: "#2c2c2a",
  axis: "#383835",
  /** Status colors for delta arrows (icons only; the numbers stay in text ink). */
  up: "#0ca30c",
  down: "#d03b3b",
  /** Context lines for profiles that aren't highlighted. */
  context: "#5a5955",
  /** Categorical slots, in fixed order. Never cycled: max 8 colored series. */
  series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"],
} as const;

export const MAX_HIGHLIGHTS = colors.series.length;

export const themeConfig: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: colors.series[0],
    colorInfo: colors.series[0],
    colorSuccess: colors.up,
    colorError: "#d03b3b",
    colorWarning: "#fab219",
    colorBgLayout: colors.page,
    colorBgContainer: colors.surface,
    colorBgElevated: colors.elevated,
    colorText: colors.textPrimary,
    colorTextSecondary: colors.textSecondary,
    colorTextTertiary: colors.textMuted,
    colorBorder: colors.axis,
    colorBorderSecondary: colors.grid,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    Layout: { headerBg: colors.surface, bodyBg: colors.page, headerPadding: "0 16px" },
    Menu: { darkItemBg: colors.surface, itemBg: colors.surface },
    Table: { headerBg: colors.elevated, stickyScrollBarBg: colors.axis },
  },
};

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat();

export const formatCount = (n: number) => full.format(n);
export const formatAxisCount = (n: number) => (Math.abs(n) >= 10_000 ? compact.format(n) : full.format(n));
export const formatSigned = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${full.format(Math.abs(n))}`;
/** Signed percent; small changes get an extra decimal so they don't read as "−0.0%". */
export const formatPct = (fraction: number) => {
  const pct = Math.abs(fraction * 100);
  const sign = fraction > 0 ? "+" : fraction < 0 ? "−" : "±";
  return `${sign}${pct.toFixed(pct > 0 && pct < 1 ? 2 : 1)}%`;
};
