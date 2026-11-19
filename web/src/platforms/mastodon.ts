import handles from "../../../src/handles.json";
import { sanitizeHtml } from "../html";
import type { Platform, Profile, ProfileError } from "../types";
import { lookupJson } from "./lookup";

/** The subset of a Mastodon Account entity that the apps use. */
export interface MastodonAccount {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  url: string;
  avatar: string;
  avatar_static: string;
  header: string;
  note: string;
  created_at: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
}

/**
 * Handles are kept as entered (minus protocol), because the metrics API is keyed
 * by the exact string, e.g. both "chaos.social/@alexglow" and "chaos.social/ishotjr" exist.
 */
export function normalizeMastodonHandle(input: string) {
  return input.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function parseMastodonHandle(handle: string) {
  const [server = "", rawUsername = ""] = normalizeMastodonHandle(handle).split("/");
  return { server, username: rawUsername.replace(/^@/, "") };
}

/** Looks up an account on its server, saying why when that fails. */
export async function fetchMastodonAccount(
  handle: string
): Promise<{ server: string; account: MastodonAccount } | { error: ProfileError }> {
  const { server, username } = parseMastodonHandle(handle);
  if (!server || !username) return { error: "notFound" };
  // 404 = no such account; 410 = gone (deleted or suspended).
  const result = await lookupJson<MastodonAccount>(
    `https://${server}/api/v1/accounts/lookup?acct=${encodeURIComponent(username)}`,
    [404, 410],
    `Mastodon ${handle}`
  );
  return "error" in result ? result : { server, account: result.data };
}

export function toProfile(handle: string, a: MastodonAccount): Profile {
  return {
    id: a.id,
    handle,
    displayName: a.display_name || a.username,
    avatar: a.avatar,
    // Accounts without a header get Mastodon's blank placeholder image.
    banner: a.header && !a.header.endsWith("/missing.png") ? a.header : undefined,
    descriptionHtml: sanitizeHtml(a.note),
    followers: a.followers_count,
    following: a.following_count,
    posts: a.statuses_count,
    createdAt: a.created_at,
    url: a.url,
  };
}

export const mastodon: Platform = {
  name: "Mastodon",
  title: "Mastodon Metrics",
  repoUrl: "https://github.com/jasoncoon/social-metrics",
  otherApp: { name: "Bluesky Metrics", url: "../bsky/" },
  pages: [
    { key: "dashboard", label: "Dashboard", href: "./" },
    { key: "profile", label: "Profile", href: "./profile.html" },
    { key: "followers", label: "Followers", href: "./followers.html" },
    { key: "posts", label: "Top posts", href: "./posts.html" },
  ],
  defaultHandles: handles.Mastodon,
  handleExamples: ["https://leds.social/@jasoncoon", "leds.social/@jasoncoon", "leds.social/jasoncoon"],
  normalizeHandle: normalizeMastodonHandle,
  shortLabel: (handle) => parseMastodonHandle(handle).username,
  getProfile: async (handle) => {
    const result = await fetchMastodonAccount(handle);
    return "error" in result ? result : { profile: toProfile(handle, result.account) };
  },
  extraProfileLinks: (handle) => [
    { key: "followers", label: "Followers", href: `./followers.html?handle=${encodeURIComponent(handle)}` },
    { key: "posts", label: "Top posts", href: `./posts.html?handle=${encodeURIComponent(handle)}` },
  ],
};
