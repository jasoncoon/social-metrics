import { Flex, Segmented, Tooltip, Typography } from "antd";
import type { ReactNode } from "react";
import { RANGE_PRESETS, type RangeValue, rangeTitle, type YMode } from "../data/series";
import type { ColorPreset } from "../data/summary";
import { useIsMobile } from "../hooks/useMediaQuery";
import { MAX_HIGHLIGHTS } from "../theme";

export type ChartView = "combined" | "grid";

export interface ChartSettings {
  mode: YMode;
  range: RangeValue;
  view: ChartView;
  /** Draw profiles that aren't in color as gray context lines. */
  showOthers: boolean;
  /** Which profiles get one of the colors (custom = picked by clicking). */
  colorBy: ColorBy;
}

export type ColorBy = ColorPreset | "custom";

/** Compact range label for phones, e.g. "30d", "1y". */
const shortRangeTitle = (r: RangeValue) => (r === "all" ? "All" : r === 365 ? "1y" : `${r}d`);

/** Page-level date range: drives the summary cards, chart and table. */
export function RangePicker({ value, onChange }: { value: RangeValue; onChange: (range: RangeValue) => void }) {
  const mobile = useIsMobile();
  // A legacy ?days=N that isn't a preset gets its own option.
  const ranges = RANGE_PRESETS.includes(value)
    ? RANGE_PRESETS
    : [...RANGE_PRESETS.slice(0, -1), value, "all" as const].sort((a, b) =>
        a === "all" ? 1 : b === "all" ? -1 : (a as number) - (b as number)
      );
  return (
    <Segmented<RangeValue>
      aria-label="Date range"
      value={value}
      onChange={onChange}
      options={ranges.map((r) => ({
        value: r,
        label: mobile ? <span aria-label={rangeTitle(r)}>{shortRangeTitle(r)}</span> : rangeTitle(r),
      }))}
    />
  );
}

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Flex vertical gap={4}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Typography.Text>
      {children}
    </Flex>
  );
}

export function ChartControls({
  settings,
  onChange,
}: {
  settings: ChartSettings;
  onChange: (patch: Partial<ChartSettings>) => void;
}) {
  const mobile = useIsMobile();
  return (
    <Flex wrap gap={mobile ? "8px 16px" : "12px 24px"} align="flex-end" style={{ marginBottom: 12 }}>
      <Control label="Scale">
        <Segmented<YMode>
          value={settings.mode}
          onChange={(mode) => onChange({ mode })}
          options={[
            { value: "percent", label: <Tooltip title="Percent change since the start of the range">% change</Tooltip> },
            { value: "change", label: <Tooltip title="Followers gained or lost since the start of the range">Change</Tooltip> },
            { value: "absolute", label: "Followers" },
            { value: "log", label: <Tooltip title="Follower counts on a log scale">Log</Tooltip> },
          ]}
        />
      </Control>
      <Control label="View">
        <Segmented<ChartView>
          value={settings.view}
          onChange={(view) => onChange({ view })}
          options={[
            { value: "combined", label: "One chart" },
            { value: "grid", label: "Small multiples" },
          ]}
        />
      </Control>
      {settings.view === "combined" && (
        <Control label={`Color (top ${MAX_HIGHLIGHTS})`}>
          <Segmented<ColorBy>
            value={settings.colorBy}
            onChange={(colorBy) => onChange({ colorBy })}
            options={[
              {
                value: "movers",
                label: <Tooltip title="Most followers gained or lost over the range">{mobile ? "Movers" : "Biggest movers"}</Tooltip>,
              },
              {
                value: "growth",
                label: <Tooltip title="Highest % change over the range">{mobile ? "Growth" : "Fastest growth"}</Tooltip>,
              },
              { value: "largest", label: <Tooltip title="Most followers">Largest</Tooltip> },
              ...(settings.colorBy === "custom"
                ? [
                    {
                      value: "custom" as const,
                      label: (
                        <Tooltip title="Picked by clicking lines or legend names. Choose a preset to reset.">
                          Custom
                        </Tooltip>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Control>
      )}
      {settings.view === "combined" && (
        <Control label="Other profiles">
          <Segmented<"hidden" | "gray">
            value={settings.showOthers ? "gray" : "hidden"}
            onChange={(v) => onChange({ showOthers: v === "gray" })}
            options={[
              { value: "gray", label: <Tooltip title="Show profiles that aren't in color as thin gray lines, for context">Gray</Tooltip> },
              { value: "hidden", label: "Hidden" },
            ]}
          />
        </Control>
      )}
    </Flex>
  );
}
