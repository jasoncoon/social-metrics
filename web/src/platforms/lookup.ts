import type { Profile, ProfileResult } from "../types";

/**
 * Fetches JSON from a public profile API, classifying failures:
 * - `notFound`: the server answered with one of `notFoundStatuses` (it says there's no such account).
 * - `unavailable`: anything else — network errors, CORS blocks (some servers reject
 *   browser requests, e.g. chaos.social answers 418 without CORS headers),
 *   rate limits, 5xx, or a non-JSON body.
 */
export async function lookupJson<T>(
  url: string,
  notFoundStatuses: readonly number[],
  label: string
): Promise<{ data: T } | { error: "notFound" | "unavailable" }> {
  try {
    const response = await fetch(url);
    if (notFoundStatuses.includes(response.status)) return { error: "notFound" };
    if (!response.ok) {
      console.error(`[${label}] HTTP ${response.status} from ${url}`);
      return { error: "unavailable" };
    }
    return { data: (await response.json()) as T };
  } catch (error) {
    // A CORS rejection also lands here, as a TypeError with no status.
    console.error(`[${label}] couldn't fetch ${url}:`, error);
    return { error: "unavailable" };
  }
}

/** The profile from a lookup result, if it succeeded. */
export function profileOf(result: ProfileResult | undefined): Profile | undefined {
  return result && "profile" in result ? result.profile : undefined;
}
