import { useCallback, useEffect, useMemo, useState } from "react";

export type ParamPatch = Record<string, string | number | boolean | null | undefined>;

/** Encodes like URLSearchParams but keeps handle punctuation (/ @ ; :) readable. */
function serialize(params: URLSearchParams) {
  return [...params]
    .map(([k, v]) => {
      const value = encodeURIComponent(v)
        .replaceAll("%2F", "/")
        .replaceAll("%40", "@")
        .replaceAll("%3B", ";")
        .replaceAll("%3A", ":")
        .replaceAll("%2C", ",");
      return `${encodeURIComponent(k)}=${value}`;
    })
    .join("&");
}

/**
 * Query-string state, so every view is shareable. `update` merges a patch;
 * null / undefined / "" removes a key.
 */
export function useUrlParams() {
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const onPop = () => setSearch(window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const params = useMemo(() => new URLSearchParams(search), [search]);

  const update = useCallback((patch: ParamPatch, options?: { push?: boolean }) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    const query = serialize(next);
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    if (options?.push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
    setSearch(window.location.search);
  }, []);

  return [params, update] as const;
}
