/**
 * Fetches JSON and returns undefined (with a logged reason) on any failure:
 * network errors, non-2xx responses, redirects to another host, or non-JSON bodies.
 */
export async function fetchJson<T>(url: string, label: string): Promise<T | undefined> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    console.error(`[${label}] network error fetching ${url}:`, error);
    return undefined;
  }

  if (response.redirected) {
    const from = new URL(url).host;
    const to = new URL(response.url).host;
    if (from !== to) {
      console.warn(
        `[${label}] ${from} redirected to ${response.url}; the server may have moved.`
      );
    }
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(
      `[${label}] HTTP ${response.status} from ${response.url}: ${body.slice(0, 200)}`
    );
    return undefined;
  }

  try {
    return (await response.json()) as T;
  } catch {
    console.error(
      `[${label}] response from ${response.url} was not JSON (content-type: ${response.headers.get("content-type")})`
    );
    return undefined;
  }
}

export function asCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
