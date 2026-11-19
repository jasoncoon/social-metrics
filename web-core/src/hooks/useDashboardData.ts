import { useEffect, useState } from "react";
import { getFollowerHistory, mapLimit } from "../api/socialMetrics";
import type { MetricPoint, Platform, Profile } from "../types";

const CONCURRENCY = 6;

export interface DashboardData {
  /** undefined = still loading, null = failed. */
  profiles: ReadonlyMap<string, Profile | null>;
  histories: ReadonlyMap<string, MetricPoint[]>;
  done: number;
  total: number;
  loading: boolean;
}

/**
 * Loads each handle's live profile and follower history in parallel
 * (a few at a time), publishing results as they arrive.
 */
export function useDashboardData(platform: Platform, handles: readonly string[]): DashboardData {
  const key = handles.join(";");
  const [state, setState] = useState<DashboardData & { key: string }>(() => empty(key, handles.length));

  // Reset synchronously when the handle list changes (no flash of stale data).
  if (state.key !== key) setState(empty(key, handles.length));

  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split(";") : [];

    const tick = (fn: (s: DashboardData & { key: string }) => Partial<DashboardData>) =>
      setState((s) => {
        if (cancelled || s.key !== key) return s;
        const patch = fn(s);
        const done = s.done + 1;
        return { ...s, ...patch, done, loading: done < s.total };
      });

    void mapLimit(list, CONCURRENCY, async (handle) => {
      const profile = await platform.getProfile(handle);
      tick((s) => ({ profiles: new Map(s.profiles).set(handle, profile ?? null) }));
    });
    void mapLimit(list, CONCURRENCY, async (handle) => {
      const history = await getFollowerHistory(platform.name, handle);
      tick((s) => ({ histories: new Map(s.histories).set(handle, history) }));
    });

    return () => {
      cancelled = true;
    };
  }, [key, platform]);

  return state;
}

function empty(key: string, count: number): DashboardData & { key: string } {
  return {
    key,
    profiles: new Map(),
    histories: new Map(),
    done: 0,
    total: count * 2,
    loading: count > 0,
  };
}
