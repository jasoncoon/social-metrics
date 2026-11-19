import type { MetricPoint } from "../types";

export type RangeValue = number | "all";
export type YMode = "absolute" | "change" | "percent" | "log";

export const RANGE_PRESETS: RangeValue[] = [7, 30, 90, 365, "all"];

export function rangeTitle(range: RangeValue) {
  return range === "all" ? "All time" : range === 365 ? "1 year" : `${range} days`;
}

/**
 * A follower count of 0 or a missing value means the collector failed that day
 * (none of the tracked accounts actually have 0 followers), so treat it as a gap.
 */
export function cleanFollowers(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** Adds days to a YYYY-MM-DD date (UTC). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
  );
}

/** Every day from start to end inclusive. */
export function dateSpan(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) dates.push(d);
  return dates;
}

export type Histories = ReadonlyMap<string, readonly MetricPoint[]>;

export function dataBounds(histories: Histories): { first?: string; last?: string } {
  let first: string | undefined;
  let last: string | undefined;
  for (const points of histories.values()) {
    for (const p of points) {
      if (p.followers === null) continue;
      if (!first || p.date < first) first = p.date;
      if (!last || p.date > last) last = p.date;
    }
  }
  return { first, last };
}

export function rangeStart(range: RangeValue, end: string, first: string): string {
  if (range === "all") return first;
  const start = addDays(end, -range);
  return start < first ? first : start;
}

export interface AlignedSeries {
  dates: string[];
  /** One value per date per handle; null = gap. */
  values: Map<string, (number | null)[]>;
}

/**
 * Puts every handle on the same continuous daily axis so that missing days
 * (no row at all) also show as gaps rather than being silently bridged.
 */
export function alignSeries(
  histories: Histories,
  handles: readonly string[],
  start: string,
  end: string
): AlignedSeries {
  const dates = dateSpan(start, end);
  const values = new Map<string, (number | null)[]>();
  for (const handle of handles) {
    const byDate = new Map(
      (histories.get(handle) ?? []).map((p) => [p.date, p.followers] as const)
    );
    values.set(handle, dates.map((d) => byDate.get(d) ?? null));
  }
  return { dates, values };
}

export const firstValue = (values: readonly (number | null)[]) =>
  values.find((v): v is number => v !== null);

export const lastValue = (values: readonly (number | null)[]) =>
  values.findLast((v): v is number => v !== null);

/**
 * Rescales a series for comparison. "change" and "percent" are relative to the
 * first non-gap value in the range, so very different account sizes become comparable.
 */
export function transformSeries(
  values: readonly (number | null)[],
  mode: YMode
): (number | null)[] {
  if (mode === "absolute" || mode === "log") return [...values];
  const base = firstValue(values);
  if (base === undefined) return values.map(() => null);
  return values.map((v) => {
    if (v === null) return null;
    if (mode === "change") return v - base;
    return Math.round((v / base - 1) * 10_000) / 100;
  });
}
