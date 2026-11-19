export type SocialName = "Bluesky" | "Mastodon";

/** A profile normalized across networks. */
export interface Profile {
  handle: string;
  displayName: string;
  avatar?: string;
  banner?: string;
  /** Sanitized HTML (Mastodon notes are HTML; Bluesky descriptions are escaped text). */
  descriptionHtml: string;
  followers: number;
  following: number;
  posts: number;
  createdAt: string;
  url: string;
  /** Network-specific account id (Mastodon numeric id, Bluesky DID). */
  id: string;
}

/**
 * Why a live profile lookup failed: the server says there's no such account,
 * or it couldn't be reached from the browser (network error, CORS block, rate limit, 5xx).
 */
export type ProfileError = "notFound" | "unavailable";

export type ProfileResult = { profile: Profile } | { error: ProfileError };

/** One day's follower count. `null` means no usable data that day (shown as a gap). */
export interface MetricPoint {
  date: string;
  followers: number | null;
}

export interface NavPage {
  key: string;
  label: string;
  href: string;
}

export interface Platform {
  name: SocialName;
  title: string;
  repoUrl: string;
  otherApp: { name: string; url: string };
  pages: NavPage[];
  defaultHandles: string[];
  /** Examples shown under the handles input. */
  handleExamples: string[];
  /** Canonical form used as the key for the metrics API and the URL. */
  normalizeHandle(input: string): string;
  /** Compact label for chart legends. */
  shortLabel(handle: string): string;
  getProfile(handle: string): Promise<ProfileResult>;
  /** Extra per-profile links (e.g. Mastodon followers / posts pages). */
  extraProfileLinks?: (handle: string) => NavPage[];
}
