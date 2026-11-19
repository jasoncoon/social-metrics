import { useCallback, useSyncExternalStore } from "react";

/** Live result of a CSS media query (read synchronously, so the first render is already right). */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** Phone-sized viewport (below antd's `md` breakpoint). */
export const useIsMobile = () => useMediaQuery("(max-width: 767.98px)");

/** Primary pointer is a finger: no hover, so pointing a line means tapping it. */
export const useIsTouch = () => useMediaQuery("(hover: none) and (pointer: coarse)");
