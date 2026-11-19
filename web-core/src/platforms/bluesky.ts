import handles from "../../../src/handles.json";
import { escapeText } from "../html";
import type { Platform, Profile } from "../types";

interface BlueskyApiProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  banner?: string;
  description?: string;
  createdAt: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
}

export function normalizeBlueskyHandle(input: string) {
  return input
    .trim()
    .replace(/^https?:\/\/bsky\.app\/profile\//, "")
    .replace(/^@/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

export async function getBlueskyProfile(handle: string): Promise<Profile | undefined> {
  try {
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`
    );
    if (!response.ok) return undefined;
    const p = (await response.json()) as BlueskyApiProfile;
    return {
      id: p.did,
      handle: p.handle,
      displayName: p.displayName || p.handle,
      avatar: p.avatar,
      banner: p.banner,
      descriptionHtml: escapeText(p.description ?? "").replaceAll("\n", "<br>"),
      followers: p.followersCount ?? 0,
      following: p.followsCount ?? 0,
      posts: p.postsCount ?? 0,
      createdAt: p.createdAt,
      url: `https://bsky.app/profile/${p.handle}`,
    };
  } catch (error) {
    console.error(`error getting Bluesky profile ${handle}:`, error);
    return undefined;
  }
}

export const bluesky: Platform = {
  name: "Bluesky",
  title: "Bluesky Metrics",
  repoUrl: "https://github.com/jasoncoon/bsky-metrics",
  otherApp: { name: "Mastodon Metrics", url: "https://jasoncoon.github.io/masto-metrics/" },
  pages: [
    { key: "dashboard", label: "Dashboard", href: "./" },
    { key: "profile", label: "Profile", href: "./profile.html" },
  ],
  defaultHandles: handles.Bluesky,
  handleExamples: ["evilgeniuslabs.org", "jasoncoon.bsky.social", "https://bsky.app/profile/evilgeniuslabs.org"],
  normalizeHandle: normalizeBlueskyHandle,
  shortLabel: (handle) => handle.replace(/\.bsky\.social$/, ""),
  getProfile: getBlueskyProfile,
};
