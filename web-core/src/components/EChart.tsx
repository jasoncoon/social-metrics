import { LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { type CSSProperties, useEffect, useRef } from "react";

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export type EChartsOption = echarts.EChartsCoreOption;

/** Event name -> handler. Handlers may change between renders. */
export type EChartEvents = Record<string, (params: Record<string, unknown>) => void>;

export type EChartsInstance = echarts.ECharts;

/**
 * Minimal ECharts wrapper. Series are replaced on update while zoom state is
 * kept. Legend selection is expected to be controlled through `option`.
 */
export function EChart({
  option,
  style,
  events,
  onReady,
}: {
  option: EChartsOption;
  style?: CSSProperties;
  events?: EChartEvents;
  /** Called once with the instance (for low-level handlers); may return a cleanup. */
  onReady?: (chart: echarts.ECharts) => void | (() => void);
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | undefined>(undefined);
  const latest = useRef({ option, events, onReady });

  useEffect(() => {
    latest.current = { option, events, onReady };
  });

  useEffect(() => {
    const element = ref.current!;
    const instance = echarts.init(element, null, { renderer: "canvas" });
    chart.current = instance;
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(element);

    const names = Object.keys(latest.current.events ?? {});
    for (const name of names) {
      instance.on(name, (params) => {
        latest.current.events?.[name]?.(params as Record<string, unknown>);
        if (name === "legendselectchanged") {
          // Legend selection is controlled: undo ECharts' own toggle; the
          // handler's state change re-applies the right selection.
          instance.setOption({ legend: latest.current.option.legend });
        }
      });
    }

    instance.setOption(latest.current.option);
    const cleanup = latest.current.onReady?.(instance);

    return () => {
      cleanup?.();
      observer.disconnect();
      instance.dispose();
      chart.current = undefined;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, { replaceMerge: ["series"] });
  }, [option]);

  return <div ref={ref} style={style} />;
}
