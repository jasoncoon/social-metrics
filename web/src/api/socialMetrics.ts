import { cleanFollowers } from "../data/series";
import type { MetricPoint, SocialName } from "../types";

/**
 * The API only allows CORS from https://jasoncoon.github.io, so local dev/preview
 * goes through a same-origin Vite proxy (see web/vite.config.ts).
 */
const API = ["localhost", "127.0.0.1"].includes(globalThis.location?.hostname)
  ? "/social-metrics-api/query"
  : "https://social-metrics.evilgeniuslabs.org/query";

interface ApiItem {
  date: string;
  followers?: number | null;
}

/**
 * Daily follower history for a tracked handle, sorted by date.
 * 0 / missing values (failed collector runs) become null so they draw as gaps.
 * Returns [] for untracked handles or errors.
 */
export async function getFollowerHistory(
  social: SocialName,
  handle: string
): Promise<MetricPoint[]> {
  const items: ApiItem[] = [];
  let nextPageKey: string | undefined;
  try {
    do {
      const params = new URLSearchParams({ social, handle });
      if (nextPageKey) params.set("nextPageKey", nextPageKey);
      const response = await fetch(`${API}?${params}`);
      if (!response.ok) return [];
      const body = (await response.json()) as {
        Items?: ApiItem[];
        LastEvaluatedKey?: unknown;
      };
      items.push(...(body.Items ?? []));
      nextPageKey = body.LastEvaluatedKey
        ? btoa(JSON.stringify(body.LastEvaluatedKey))
            .replaceAll("+", "-")
            .replaceAll("/", "_")
            .replace(/=+$/, "")
        : undefined;
    } while (nextPageKey);
  } catch (error) {
    console.error(`error getting follower history for ${handle}:`, error);
    return [];
  }

  return items
    .map((i) => ({ date: i.date, followers: cleanFollowers(i.followers) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Runs `fn` over `items` with at most `limit` in flight. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Parses the max_id from a Mastodon `Link` pagination header. */
export function parseNextMaxId(linkHeader: string | null): string | undefined {
  const next = linkHeader?.split(",").find((l) => l.includes('rel="next"'));
  const url = next?.match(/<([^>]+)>/)?.[1];
  return url ? (new URL(url).searchParams.get("max_id") ?? undefined) : undefined;
}
