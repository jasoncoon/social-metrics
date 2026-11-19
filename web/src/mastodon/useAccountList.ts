import { fetchMastodonAccount, type MastodonAccount, toProfile } from "../platforms/mastodon";
import type { Profile, ProfileError } from "../types";
import { useEffect, useRef, useState } from "react";

export interface AccountListState<T> {
  handle: string;
  profile?: Profile;
  /** Set when the account lookup failed. */
  profileError?: ProfileError;
  items: T[];
  status: string;
  loading: boolean;
  error?: string;
}

/**
 * Looks up an account, then streams a paged list for it (followers, posts, ...).
 * Aborts when the handle changes, the page unmounts, or `stop` is called.
 */
export function useAccountList<T>(
  handle: string,
  load: (
    server: string,
    account: MastodonAccount,
    push: (items: T[]) => void,
    setStatus: (status: string) => void,
    signal: AbortSignal
  ) => Promise<void>
) {
  const [state, setState] = useState<AccountListState<T>>({ handle, items: [], status: "", loading: !!handle });
  const controller = useRef<AbortController | undefined>(undefined);

  if (state.handle !== handle) setState({ handle, items: [], status: "", loading: !!handle });

  useEffect(() => {
    if (!handle) return;
    const abort = new AbortController();
    controller.current = abort;
    const set = (patch: Partial<AccountListState<T>>) =>
      !abort.signal.aborted && setState((s) => (s.handle === handle ? { ...s, ...patch } : s));

    (async () => {
      set({ status: "Getting profile…" });
      const result = await fetchMastodonAccount(handle);
      if ("error" in result) {
        set({ profileError: result.error, loading: false, status: "" });
        return;
      }
      set({ profile: toProfile(handle, result.account) });
      await load(
        result.server,
        result.account,
        (items) =>
          !abort.signal.aborted &&
          setState((s) => (s.handle === handle ? { ...s, items: [...s.items, ...items] } : s)),
        (status) => set({ status }),
        abort.signal
      );
      set({ loading: false, status: "" });
    })().catch((error: unknown) => {
      if (abort.signal.aborted) return;
      console.error(error);
      set({ loading: false, status: "", error: String(error) });
    });

    return () => abort.abort();
    // `load` is a module-level function in each page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  const stop = () => {
    controller.current?.abort();
    setState((s) => ({ ...s, loading: false, status: "" }));
  };

  return { ...state, stop };
}
