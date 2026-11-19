import { Card, Flex, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { type AlignedSeries, transformSeries, type YMode } from "../data/series";
import type { ProfileSummary } from "../data/summary";
import { useIsMobile, useIsTouch } from "../hooks/useMediaQuery";
import { colors, formatCount } from "../theme";
import { followersChartOption } from "./chartOptions";
import { DeltaText } from "./DeltaText";
import { EChart, type EChartsInstance } from "./EChart";

interface CommonProps {
  aligned: AlignedSeries;
  /** Handles in display order. */
  handles: readonly string[];
  labelFor: (handle: string) => string;
  mode: YMode;
}

interface HitSeries {
  label: string;
  values: (number | null)[];
}

/**
 * Mutable chart-side state (hovered line, lines that can be hovered), read by
 * ECharts handlers and the tooltip formatter outside React's render.
 */
function createHoverState() {
  let label: string | undefined;
  let series: HitSeries[] = [];
  let onClick: ((label: string) => void) | undefined;
  return {
    click: (l: string) => onClick?.(l),
    setOnClick: (fn: typeof onClick) => {
      onClick = fn;
    },
    get: () => label,
    set: (l: string | undefined) => {
      label = l;
    },
    series: () => series,
    setSeries: (s: HitSeries[]) => {
      series = s;
    },
  };
}
type HoverState = ReturnType<typeof createHoverState>;

/** Max vertical distance (px) from the pointer to a line for it to count as hovered. */
const HIT_DISTANCE = 28;

interface ZrPointerEvent {
  offsetX: number;
  offsetY: number;
  /** The native DOM event behind the zrender event. */
  event?: { type?: string };
}

/**
 * Highlights the line nearest the pointer (vertically, at the hovered date),
 * so you don't have to land exactly on a 2px line.
 *
 * Clicking the highlighted line toggles its color. On touch there is no hover,
 * so the first tap on a line only identifies it; tapping it again toggles it.
 */
function attachNearestHover(
  chart: EChartsInstance,
  state: HoverState,
  onHover: (label: string | undefined) => void
) {
  const zr = chart.getZr();
  const set = (label: string | undefined, x?: number, y?: number) => {
    if (label === state.get()) return;
    chart.dispatchAction({ type: "downplay" });
    state.set(label);
    if (label) chart.dispatchAction({ type: "highlight", seriesName: label });
    onHover(label);
    // Re-render the tooltip so the hovered line is listed first.
    if (x !== undefined && y !== undefined) chart.dispatchAction({ type: "showTip", x, y });
  };
  // Line that was highlighted when the current touch began.
  let beforeTouch: string | undefined;
  const onMove = (e: ZrPointerEvent) => {
    if (e.event?.type === "touchstart") beforeTouch = state.get();
    const point = [e.offsetX, e.offsetY];
    if (!chart.containPixel({ gridIndex: 0 }, point)) return set(undefined);
    const [x] = chart.convertFromPixel({ gridIndex: 0 }, point) as number[];
    const index = Math.round(x ?? -1);
    let best: string | undefined;
    let bestDistance = HIT_DISTANCE;
    for (const s of state.series()) {
      const value = s.values[index];
      if (value === null || value === undefined) continue;
      const [, y] = chart.convertToPixel({ gridIndex: 0 }, [index, value]) as number[];
      const distance = Math.abs((y ?? Infinity) - e.offsetY);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = s.label;
      }
    }
    set(best, e.offsetX, e.offsetY);
  };
  const onOut = () => set(undefined);
  const onClick = (e: ZrPointerEvent) => {
    const label = state.get();
    if (!label) return;
    if (e.event?.type?.startsWith("touch") && label !== beforeTouch) return;
    state.click(label);
  };
  zr.on("mousemove", onMove);
  zr.on("globalout", onOut);
  zr.on("click", onClick);
  return () => {
    zr.off("mousemove", onMove);
    zr.off("globalout", onOut);
    zr.off("click", onClick);
  };
}

export function FollowersChart({
  aligned,
  handles,
  labelFor,
  colorFor,
  mode,
  showOthers = true,
  onToggle,
  summaries,
  height = 560,
}: CommonProps & {
  colorFor: (handle: string) => string | undefined;
  /** Draw profiles without a color as gray context lines (otherwise hidden). */
  showOthers?: boolean;
  /** Legend click: color / uncolor a profile. */
  onToggle?: (handle: string) => void;
  /** Used for the hover readout. */
  summaries?: ReadonlyMap<string, ProfileSummary>;
  height?: number;
}) {
  const [hovered, setHovered] = useState<string>();
  const [hoverState] = useState(createHoverState);
  const narrow = useIsMobile();
  const touch = useIsTouch();

  const byLabel = useMemo(() => new Map(handles.map((h) => [labelFor(h), h])), [handles, labelFor]);

  const { option, hitSeries } = useMemo(() => {
    const series = handles.map((handle) => {
      const color = colorFor(handle);
      return {
        handle,
        label: labelFor(handle),
        color,
        visible: !!color || showOthers,
        values: transformSeries(aligned.values.get(handle) ?? [], mode),
      };
    });
    return {
      option: followersChartOption({
        dates: aligned.dates,
        mode,
        hovered: hoverState.get,
        narrow,
        touch,
        series,
      }),
      hitSeries: series.filter((s) => s.visible),
    };
  }, [aligned, handles, labelFor, colorFor, mode, showOthers, hoverState, narrow, touch]);

  useEffect(() => hoverState.setSeries(hitSeries), [hoverState, hitSeries]);
  useEffect(
    () =>
      hoverState.setOnClick((label) => {
        const handle = byLabel.get(label);
        if (handle) onToggle?.(handle);
      }),
    [hoverState, byLabel, onToggle]
  );

  const events = {
    // Hovering a legend item emphasizes its line. (Highlights dispatched by
    // the nearest-line logic carry seriesName, not name, so they're ignored here.)
    highlight: (p: Record<string, unknown>) => {
      if (typeof p.name === "string" && byLabel.has(p.name)) {
        hoverState.set(p.name);
        setHovered(p.name);
      }
    },
    downplay: (p: Record<string, unknown>) => {
      if (typeof p.name === "string") {
        hoverState.set(undefined);
        setHovered(undefined);
      }
    },
    legendselectchanged: (p: Record<string, unknown>) => {
      const handle = byLabel.get(p.name as string);
      if (handle) onToggle?.(handle);
    },
  };

  const hoveredHandle = hovered ? byLabel.get(hovered) : undefined;
  const summary = hoveredHandle ? summaries?.get(hoveredHandle) : undefined;
  const hoveredColor = hoveredHandle ? colorFor(hoveredHandle) : undefined;

  return (
    <>
      <Flex align="center" wrap gap="0 10px" style={{ minHeight: 28, marginBottom: 4 }} aria-live="polite">
        {hoveredHandle ? (
          <>
            <span
              style={{
                width: 14,
                height: 4,
                borderRadius: 2,
                background: hoveredColor ?? colors.textSecondary,
              }}
            />
            <Typography.Text strong style={{ fontSize: 15 }}>
              {hovered}
            </Typography.Text>
            {summary?.latest && (
              <Typography.Text type="secondary">{formatCount(summary.latest.followers)} followers</Typography.Text>
            )}
            {summary?.inRange && <DeltaText delta={summary.inRange} primary={mode === "percent" ? "pct" : "abs"} />}
          </>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {handles.length < 2
              ? touch
                ? "Tap the chart to see values."
                : "Point at the chart to see values."
              : touch
                ? `Tap a line to identify it, and tap it again (or a legend name) to add or remove its color (up to ${colors.series.length} at once).`
                : `Point at a line to identify it. Click a line or a legend name to add or remove its color (up to ${colors.series.length} at once).`}
          </Typography.Text>
        )}
      </Flex>
      <EChart
        option={option}
        events={events}
        onReady={(chart) => attachNearestHover(chart, hoverState, setHovered)}
        style={{ width: "100%", height: narrow ? Math.min(height, 420) : height, cursor: hovered ? "pointer" : undefined }}
      />
    </>
  );
}

/** One small chart per profile, each with its own y-axis, so small accounts' trends are visible. */
export function SmallMultiples({
  aligned,
  handles,
  labelFor,
  mode,
  summaries,
  hrefFor,
}: CommonProps & {
  summaries: ReadonlyMap<string, ProfileSummary>;
  hrefFor: (handle: string) => string;
}) {
  const panelMode: YMode = mode === "log" ? "absolute" : mode;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
        gap: 12,
      }}
    >
      {handles.map((handle) => {
        const s = summaries.get(handle);
        return (
          <Card key={handle} size="small" styles={{ body: { padding: "8px 8px 4px" } }}>
            <Flex justify="space-between" align="baseline" gap={8} style={{ padding: "0 4px" }}>
              <a href={hrefFor(handle)} style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {labelFor(handle)}
              </a>
              <Typography.Text type="secondary" style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                {s?.latest ? formatCount(s.latest.followers) : "–"}
              </Typography.Text>
            </Flex>
            <div style={{ padding: "0 4px", fontSize: 12 }}>
              <DeltaText delta={s?.inRange} primary={panelMode === "percent" ? "pct" : "abs"} />
            </div>
            <MiniChart
              dates={aligned.dates}
              values={aligned.values.get(handle) ?? []}
              label={labelFor(handle)}
              handle={handle}
              mode={panelMode}
            />
          </Card>
        );
      })}
    </div>
  );
}

function MiniChart({
  dates,
  values,
  label,
  handle,
  mode,
}: {
  dates: string[];
  values: (number | null)[];
  label: string;
  handle: string;
  mode: YMode;
}) {
  const option = useMemo(
    () =>
      followersChartOption({
        dates,
        mode,
        compact: true,
        series: [{ handle, label, color: colors.series[0], values: transformSeries(values, mode) }],
      }),
    [dates, values, label, handle, mode]
  );
  return <EChart option={option} style={{ width: "100%", height: 140 }} />;
}
