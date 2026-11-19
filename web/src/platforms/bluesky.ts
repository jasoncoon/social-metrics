import handles from "../../../src/handles.json";
import { escapeText } from "../html";
import type { Platform, ProfileResult } from "../types";
import { lookupJson } from "./lookup";

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

export async function getBlueskyProfile(handle: string): Promise<ProfileResult> {
  // The AppView answers 400 for unknown, deactivated or taken-down actors.
  const result = await lookupJson<BlueskyApiProfile>(
    `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`,
    [400, 404],
    `Bluesky ${handle}`
  );
  if ("error" in result) return result;
  const p = result.data;
  return {
    profile: {
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
    },
  };
}

export const bluesky: Platform = {
  name: "Bluesky",
  title: "Bluesky Metrics",
  repoUrl: "https://github.com/jasoncoon/social-metrics",
  otherApp: { name: "Mastodon Metrics", url: "../masto/" },
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
