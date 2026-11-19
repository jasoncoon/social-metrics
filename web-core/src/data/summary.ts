import type { MetricPoint } from "../types";
import {
  addDays,
  type AlignedSeries,
  firstValue,
  type Histories,
  lastValue,
} from "./series";

export interface Delta {
  abs: number;
  /** Fractional change, e.g. 0.031 = +3.1%. */
  pct: number;
}

export interface ProfileSummary {
  handle: string;
  latest?: { date: string; followers: number };
  d1?: Delta;
  d7?: Delta;
  d30?: Delta;
  /** Change over the selected range (first to last value in range). */
  inRange?: Delta;
  /** Days with no data in range since this handle's first data point. */
  gaps: number;
  /** Set when the newest data point is 3+ days older than the newest data overall. */
  staleSince?: string;
  sparkline: (number | null)[];
  rank?: number;
  rankAtStart?: number;
  /** Positive = moved up. */
  rankChange?: number;
}

/** Last non-gap point on or before `date`. History must be sorted by date. */
export function pointOnOrBefore(
  history: readonly MetricPoint[],
  date: string
): { date: string; followers: number } | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    const p = history[i]!;
    if (p.date <= date && p.followers !== null) {
      return { date: p.date, followers: p.followers };
    }
  }
  return undefined;
}

const makeDelta = (from: number, to: number): Delta => ({
  abs: to - from,
  pct: (to - from) / from,
});

/**
 * Change over the last `days` days. The base is the value `days` before the
 * latest point, or the closest earlier value no more than `days` further back,
 * so a missing day doesn't silently stretch "1 day" into "1 month".
 */
export function deltaOver(
  history: readonly MetricPoint[],
  latest: { date: string; followers: number },
  days: number
): Delta | undefined {
  const target = addDays(latest.date, -days);
  const base = pointOnOrBefore(history, target);
  if (!base || base.date < addDays(target, -days)) return undefined;
  return makeDelta(base.followers, latest.followers);
}

function ranks(values: Map<string, number | undefined>) {
  const sorted = [...values]
    .filter((e): e is [string, number] => e[1] !== undefined)
    .sort((a, b) => b[1] - a[1]);
  return new Map(sorted.map(([handle], i) => [handle, i + 1]));
}

export function summarize(
  histories: Histories,
  aligned: AlignedSeries,
  dataEnd: string
): ProfileSummary[] {
  const start = aligned.dates[0];
  const summaries: ProfileSummary[] = [];

  for (const [handle, values] of aligned.values) {
    const history = histories.get(handle) ?? [];
    const latest = pointOnOrBefore(history, dataEnd);
    const firstIndex = values.findIndex((v) => v !== null);
    const first = firstValue(values);
    const last = lastValue(values);

    summaries.push({
      handle,
      latest,
      d1: latest && deltaOver(history, latest, 1),
      d7: latest && deltaOver(history, latest, 7),
      d30: latest && deltaOver(history, latest, 30),
      inRange:
        first !== undefined && last !== undefined ? makeDelta(first, last) : undefined,
      gaps:
        firstIndex < 0 ? 0 : values.slice(firstIndex).filter((v) => v === null).length,
      staleSince:
        latest && latest.date <= addDays(dataEnd, -3) ? latest.date : undefined,
      sparkline: values,
    });
  }

  const now = ranks(new Map(summaries.map((s) => [s.handle, s.latest?.followers])));
  const then = ranks(
    new Map(
      summaries.map((s) => [
        s.handle,
        start ? pointOnOrBefore(histories.get(s.handle) ?? [], start)?.followers : undefined,
      ])
    )
  );
  for (const s of summaries) {
    s.rank = now.get(s.handle);
    s.rankAtStart = then.get(s.handle);
    if (s.rank !== undefined && s.rankAtStart !== undefined) {
      s.rankChange = s.rankAtStart - s.rank;
    }
  }

  return summaries;
}

export interface Headline {
  key: string;
  title: string;
  handle: string;
  delta: Delta;
  measure: "abs" | "pct";
}

function best(
  summaries: readonly ProfileSummary[],
  pick: (s: ProfileSummary) => Delta | undefined,
  measure: "abs" | "pct",
  direction: 1 | -1
) {
  let winner: { handle: string; delta: Delta } | undefined;
  for (const s of summaries) {
    if (s.staleSince) continue;
    const delta = pick(s);
    if (!delta) continue;
    if (!winner || direction * (delta[measure] - winner.delta[measure]) > 0) {
      winner = { handle: s.handle, delta };
    }
  }
  return winner && direction * winner.delta[measure] > 0 ? winner : undefined;
}

/** Top movers over the selected range (stale profiles are skipped). */
export function headlines(summaries: readonly ProfileSummary[]): Headline[] {
  const specs: [string, string, "abs" | "pct", 1 | -1][] = [
    ["gain", "Most new followers", "abs", 1],
    ["growth", "Fastest growth", "pct", 1],
    ["drop", "Biggest drop", "abs", -1],
  ];
  return specs.flatMap(([key, title, measure, direction]) => {
    const w = best(summaries, (s) => s.inRange, measure, direction);
    return w ? [{ key, title, measure, ...w }] : [];
  });
}

/** All profiles together: followers at the end of the range and the net change over it. */
export function combined(summaries: readonly ProfileSummary[]) {
  let start = 0;
  let end = 0;
  for (const s of summaries) {
    const first = firstValue(s.sparkline);
    const last = lastValue(s.sparkline);
    if (first === undefined || last === undefined) continue;
    start += first;
    end += last;
  }
  return start > 0 ? { total: end, delta: makeDelta(start, end) } : undefined;
}

export function rankMovers(summaries: readonly ProfileSummary[]) {
  return summaries
    .filter((s) => s.rankChange)
    .sort(
      (a, b) =>
        Math.abs(b.rankChange!) - Math.abs(a.rankChange!) || a.rank! - b.rank!
    );
}

export type ColorPreset = "movers" | "growth" | "largest";

const presetScore: Record<ColorPreset, (s: ProfileSummary) => number | undefined> = {
  /** Most followers gained or lost over the range. */
  movers: (s) => (s.inRange ? Math.abs(s.inRange.abs) : undefined),
  /** Highest % change over the range. */
  growth: (s) => s.inRange?.pct,
  /** Most followers now. */
  largest: (s) => s.latest?.followers,
};

/**
 * The top `count` profiles for a preset (skipping ones with no recent data),
 * returned in handle-list order so each keeps a stable color slot.
 */
export function pickColored(
  summaries: readonly ProfileSummary[],
  handles: readonly string[],
  preset: ColorPreset,
  count: number
): string[] {
  const score = presetScore[preset];
  const top = new Set(
    summaries
      .filter((s) => !s.staleSince && score(s) !== undefined)
      .sort((a, b) => score(b)! - score(a)!)
      .slice(0, count)
      .map((s) => s.handle)
  );
  return handles.filter((h) => top.has(h));
}
