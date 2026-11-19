import { EditOutlined } from "@ant-design/icons";
import { App, Button, Card, Drawer, Empty, Flex, Spin } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell, PageTitle } from "../components/AppShell";
import { ChartControls, type ChartSettings, type ChartView, RangePicker } from "../components/ChartControls";
import { FollowersChart, SmallMultiples } from "../components/FollowersChart";
import { HandlesForm } from "../components/HandlesForm";
import { Headlines } from "../components/Headlines";
import { LoadingStatus } from "../components/LoadingStatus";
import { SummaryTable } from "../components/SummaryTable";
import { alignSeries, dataBounds, type RangeValue, rangeStart, rangeTitle, type YMode } from "../data/series";
import { type ColorPreset, combined, headlines, pickColored, rankMovers, summarize } from "../data/summary";
import { useDashboardData } from "../hooks/useDashboardData";
import { type ParamPatch, useUrlParams } from "../hooks/useUrlParams";
import { colors, MAX_HIGHLIGHTS } from "../theme";
import type { Platform } from "../types";

const MODES: YMode[] = ["percent", "change", "absolute", "log"];
const COLOR_PRESETS: ColorPreset[] = ["movers", "growth", "largest"];

export function parseRange(params: URLSearchParams, fallback: RangeValue): RangeValue {
  const raw = params.get("range") ?? params.get("days"); // `days` = legacy param
  if (raw === "all") return "all";
  const n = Number.parseInt(raw ?? "", 10);
  return n > 0 ? n : fallback;
}


export const profileHref = (handle: string) => `./profile.html?handle=${encodeURIComponent(handle)}`;

export function DashboardPage({ platform }: { platform: Platform }) {
  const [params, update] = useUrlParams();
  const [editing, setEditing] = useState(false);
  const { message } = App.useApp();

  // Old bsky-metrics links were /?username=<handle> for a single profile.
  const legacyUsername = params.get("username");
  useEffect(() => {
    if (legacyUsername) window.location.replace(profileHref(legacyUsername));
  }, [legacyUsername]);

  const handlesParam = params.get("handles");
  const handles = useMemo(() => {
    const list = handlesParam
      ? handlesParam.split(";").map(platform.normalizeHandle).filter(Boolean)
      : platform.defaultHandles;
    return [...new Set(list)];
  }, [handlesParam, platform]);

  const scale = params.get("scale") as YMode | null;
  const mode: YMode = scale && MODES.includes(scale) ? scale : "percent";
  const range = parseRange(params, 30);
  const view: ChartView = params.get("view") === "grid" ? "grid" : "combined";
  const showOthers = params.get("others") !== "hidden";
  const hlParam = params.get("hl");
  const colorParam = params.get("color") as ColorPreset | null;
  const colorPreset: ColorPreset = colorParam && COLOR_PRESETS.includes(colorParam) ? colorParam : "movers";

  const data = useDashboardData(platform, handles);
  const model = useMemo(() => {
    const { first, last } = dataBounds(data.histories);
    if (!first || !last) return undefined;
    const aligned = alignSeries(data.histories, handles, rangeStart(range, last, first), last);
    const summaries = summarize(data.histories, aligned, last);
    return { aligned, summaries, summaryMap: new Map(summaries.map((s) => [s.handle, s])) };
  }, [data.histories, handles, range]);

  const aligned = model?.aligned;
  const summaries = useMemo(() => model?.summaries ?? [], [model]);
  const summaryMap = useMemo(() => model?.summaryMap ?? new Map(), [model]);

  // Largest followers first: legend, small multiples and table all share this order.
  const ordered = useMemo(() => {
    const size = (h: string) => summaryMap.get(h)?.latest?.followers ?? data.profiles.get(h)?.followers ?? 0;
    return [...handles].sort((a, b) => size(b) - size(a));
  }, [handles, summaryMap, data.profiles]);

  // Which profiles get a color: a preset's top 8, or slots picked by clicking
  // (the `hl` param, where an empty entry is a free slot so colors don't shift).
  const highlights = useMemo(() => {
    if (hlParam !== null) {
      return hlParam
        .split(";")
        .slice(0, MAX_HIGHLIGHTS)
        .map((h) => (handles.includes(h) ? h : ""));
    }
    return pickColored(summaries, handles, colorPreset, MAX_HIGHLIGHTS);
  }, [hlParam, summaries, handles, colorPreset]);

  const colorFor = useCallback(
    (handle: string) => {
      const slot = highlights.indexOf(handle);
      return slot >= 0 ? colors.series[slot] : undefined;
    },
    [highlights]
  );
  const labelFor = useCallback((handle: string) => platform.shortLabel(handle), [platform]);

  const settings: ChartSettings = {
    mode,
    range,
    view,
    showOthers,
    colorBy: hlParam !== null ? "custom" : colorPreset,
  };

  const onChange = (patch: Partial<ChartSettings>) => {
    const p: ParamPatch = {};
    if (patch.mode) p.scale = patch.mode === "percent" ? null : patch.mode;
    if (patch.range !== undefined) {
      p.range = patch.range === 30 ? null : patch.range;
      p.days = null;
    }
    if (patch.view) p.view = patch.view === "combined" ? null : patch.view;
    if (patch.showOthers !== undefined) p.others = patch.showOthers ? null : "hidden";
    if (patch.colorBy && patch.colorBy !== "custom") {
      p.color = patch.colorBy === "movers" ? null : patch.colorBy;
      p.hl = null;
    }
    update(p);
  };

  const setHighlights = (slots: string[]) => {
    const trimmed = [...slots];
    while (trimmed.length && !trimmed.at(-1)) trimmed.pop();
    update({ hl: trimmed.length ? trimmed.join(";") : ";" }); // ";" = explicitly none
  };

  // Legend click: add a profile to the first free color slot, or remove it.
  const toggleHighlight = (handle: string) => {
    const slots = [...highlights];
    const slot = slots.indexOf(handle);
    if (slot >= 0) slots[slot] = "";
    else {
      const free = slots.indexOf("");
      if (free >= 0) slots[free] = handle;
      else if (slots.length < MAX_HIGHLIGHTS) slots.push(handle);
      else {
        void message.info(`Up to ${MAX_HIGHLIGHTS} profiles can be in color at once. Click a colored name to remove it first.`);
        return;
      }
    }
    setHighlights(slots);
  };

  const applyHandles = (next: string[]) => {
    const isDefault = next.join(";") === platform.defaultHandles.join(";");
    update({ handles: isDefault ? null : next.join(";"), hl: null }, { push: true });
    setEditing(false);
  };

  const title = rangeTitle(range);

  return (
    <AppShell platform={platform} current="dashboard" title="Follower comparison">
      <PageTitle
        extra={
          <Flex gap={12} wrap align="center">
            <RangePicker value={range} onChange={(r) => onChange({ range: r })} />
            <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
              Edit profiles ({handles.length})
            </Button>
          </Flex>
        }
      >
        Follower comparison
      </PageTitle>

      <LoadingStatus done={data.done} total={data.total} label="Loading profiles and history" />

      {summaries.length > 0 && (
        <Headlines
          items={headlines(summaries)}
          total={combined(summaries)}
          movers={rankMovers(summaries)}
          stale={summaries.filter((s) => s.staleSince)}
          summaries={summaryMap}
          labelFor={labelFor}
          hrefFor={profileHref}
          rangeLabel={title}
        />
      )}

      <Card style={{ marginBottom: 16 }}>
        <ChartControls settings={settings} onChange={onChange} />
        {!aligned ? (
          data.loading ? (
            <Spin style={{ display: "block", padding: 80 }} />
          ) : (
            <Empty description="No follower history for these profiles" />
          )
        ) : view === "combined" ? (
          <FollowersChart
            aligned={aligned}
            handles={ordered}
            labelFor={labelFor}
            colorFor={colorFor}
            mode={mode}
            showOthers={showOthers}
            onToggle={toggleHighlight}
            summaries={summaryMap}
          />
        ) : (
          <SmallMultiples
            aligned={aligned}
            handles={ordered}
            labelFor={labelFor}
            mode={mode}
            summaries={summaryMap}
            hrefFor={profileHref}
          />
        )}
      </Card>

      <Card title="All profiles">
        <SummaryTable
          summaries={summaries.length ? summaries : handles.map((handle) => ({ handle, gaps: 0, sparkline: [] }))}
          profiles={data.profiles}
          rangeLabel={title}
          labelFor={labelFor}
          colorFor={view === "combined" ? colorFor : () => undefined}
          hrefFor={profileHref}
        />
      </Card>

      <Drawer title="Profiles" open={editing} onClose={() => setEditing(false)} size={520}>
        <HandlesForm
          key={handles.join(";")}
          handles={handles}
          defaults={platform.defaultHandles}
          examples={platform.handleExamples}
          normalize={platform.normalizeHandle}
          onApply={applyHandles}
        />
      </Drawer>
    </AppShell>
  );
}
