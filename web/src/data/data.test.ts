import { describe, expect, it } from "vitest";
import { parseNextMaxId } from "../api/socialMetrics";
import type { MetricPoint } from "../types";
import {
  addDays,
  alignSeries,
  cleanFollowers,
  dataBounds,
  dateSpan,
  rangeStart,
  transformSeries,
} from "./series";
import { combined, deltaOver, headlines, pickColored, rankMovers, summarize } from "./summary";

const h = (pairs: [string, number | null][]): MetricPoint[] =>
  pairs.map(([date, followers]) => ({ date, followers }));

describe("cleanFollowers", () => {
  it("turns 0, missing and junk into gaps", () => {
    expect(cleanFollowers(0)).toBeNull();
    expect(cleanFollowers(undefined)).toBeNull();
    expect(cleanFollowers(null)).toBeNull();
    expect(cleanFollowers(Number.NaN)).toBeNull();
    expect(cleanFollowers("12")).toBeNull();
    expect(cleanFollowers(1499)).toBe(1499);
  });
});

describe("dates", () => {
  it("adds days across month/year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("spans inclusive ranges", () => {
    expect(dateSpan("2026-07-30", "2026-08-02")).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
  });
  it("clamps range start to the first data date", () => {
    expect(rangeStart(30, "2026-11-18", "2026-11-01")).toBe("2026-11-01");
    expect(rangeStart(7, "2026-11-18", "2025-01-01")).toBe("2026-11-11");
    expect(rangeStart("all", "2026-11-18", "2025-01-23")).toBe("2025-01-23");
  });
});

describe("alignSeries", () => {
  const histories = new Map([
    ["a", h([["2026-07-15", 100], ["2026-07-17", null], ["2026-07-18", 104]])],
    ["b", h([["2026-07-16", 50]])],
  ]);

  it("puts all handles on one daily axis, with missing days as null", () => {
    const aligned = alignSeries(histories, ["a", "b"], "2026-07-15", "2026-07-18");
    expect(aligned.dates).toHaveLength(4);
    expect(aligned.values.get("a")).toEqual([100, null, null, 104]);
    expect(aligned.values.get("b")).toEqual([null, 50, null, null]);
  });

  it("ignores gaps when finding data bounds", () => {
    expect(dataBounds(histories)).toEqual({ first: "2026-07-15", last: "2026-07-18" });
  });
});

describe("transformSeries", () => {
  const values = [null, 200, null, 210, 190];
  it("absolute and log pass through", () => {
    expect(transformSeries(values, "absolute")).toEqual(values);
    expect(transformSeries(values, "log")).toEqual(values);
  });
  it("change is relative to the first non-gap value", () => {
    expect(transformSeries(values, "change")).toEqual([null, 0, null, 10, -10]);
  });
  it("percent is relative to the first non-gap value", () => {
    expect(transformSeries(values, "percent")).toEqual([null, 0, null, 5, -5]);
  });
  it("all-gap series stays all gaps", () => {
    expect(transformSeries([null, null], "percent")).toEqual([null, null]);
  });
});

describe("deltaOver", () => {
  const history = h([
    ["2026-11-01", 1000],
    ["2026-11-10", 1050],
    ["2026-11-11", null],
    ["2026-11-17", 1080],
    ["2026-11-18", 1100],
  ]);
  const latest = { date: "2026-11-18", followers: 1100 };

  it("computes 1-day change", () => {
    expect(deltaOver(history, latest, 1)).toEqual({ abs: 20, pct: 20 / 1080 });
  });
  it("falls back to an earlier point within the window", () => {
    // 7 days back is 11-11 (a gap) -> uses 11-10.
    expect(deltaOver(history, latest, 7)?.abs).toBe(50);
  });
  it("refuses a base that is too far back", () => {
    const sparse = h([["2026-10-01", 900], ["2026-11-18", 1100]]);
    expect(deltaOver(sparse, latest, 1)).toBeUndefined();
  });
});

describe("summarize + headlines", () => {
  // Blenster-like case: big account, collector failed (0 -> null) since 07-17.
  const histories = new Map([
    ["big", h([["2026-07-10", 1500], ["2026-07-16", 1499], ["2026-07-17", null], ["2026-07-20", null]])],
    ["mid", h([["2026-07-10", 400], ["2026-07-13", 420], ["2026-07-20", 460]])],
    ["small", h([["2026-07-10", 40], ["2026-07-13", 50], ["2026-07-20", 60]])],
  ]);
  const aligned = alignSeries(histories, ["big", "mid", "small"], "2026-07-10", "2026-07-20");
  const summaries = summarize(histories, aligned, "2026-07-20");
  const byHandle = new Map(summaries.map((s) => [s.handle, s]));

  it("does not treat zeros as a drop", () => {
    const big = byHandle.get("big")!;
    expect(big.latest).toEqual({ date: "2026-07-16", followers: 1499 });
    expect(big.inRange).toEqual({ abs: -1, pct: -1 / 1500 });
    expect(big.staleSince).toBe("2026-07-16");
  });

  it("counts gaps after the first data point", () => {
    expect(byHandle.get("mid")!.gaps).toBe(8);
    expect(byHandle.get("big")!.gaps).toBe(9);
  });

  it("ranks by latest value", () => {
    expect(byHandle.get("big")!.rank).toBe(1);
    expect(byHandle.get("small")!.rank).toBe(3);
    expect(rankMovers(summaries)).toEqual([]);
  });

  it("picks colored profiles by preset, in handle order, skipping stale ones", () => {
    const handles = ["big", "mid", "small"];
    expect(pickColored(summaries, handles, "largest", 2)).toEqual(["mid", "small"]); // big is stale
    expect(pickColored(summaries, handles, "movers", 1)).toEqual(["mid"]); // +60 vs +20
    expect(pickColored(summaries, handles, "growth", 1)).toEqual(["small"]); // +50% vs +15%
  });

  it("skips stale profiles and picks winners by abs and pct", () => {
    const hl = new Map(headlines(summaries).map((x) => [x.key, x]));
    expect(hl.get("gain")?.handle).toBe("mid"); // +60 vs +20 over the range
    expect(hl.get("growth")?.handle).toBe("small"); // +50% vs +15%
    expect(hl.has("drop")).toBe(false);
  });

  it("totals all profiles over the range", () => {
    // big 1500 -> 1499, mid 400 -> 460, small 40 -> 60
    expect(combined(summaries)).toEqual({ total: 2019, delta: { abs: 79, pct: 79 / 1940 } });
  });
});

describe("parseNextMaxId", () => {
  it("reads max_id from the rel=next link only", () => {
    const link =
      '<https://leds.social/api/v1/accounts/1/followers?limit=80&max_id=7777>; rel="next", ' +
      '<https://leds.social/api/v1/accounts/1/followers?limit=80&since_id=9999>; rel="prev"';
    expect(parseNextMaxId(link)).toBe("7777");
    expect(parseNextMaxId(null)).toBeUndefined();
  });
});
