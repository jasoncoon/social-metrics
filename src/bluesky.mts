import { asCount, fetchJson } from "./fetchJson.mjs";

export interface BlueskyProfile {
  followersCount?: number;
}

/** Returns undefined if the count can't be fetched (never 0 as a stand-in for an error). */
export async function getBlueskyProfileFollowerCount(
  handle: string
): Promise<number | undefined> {
  const profile = await fetchJson<BlueskyProfile>(
    `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`,
    `Bluesky ${handle}`
  );
  return asCount(profile?.followersCount);
}

// const example = {
//   did: "did:plc:tajcrjc2hb727vkpnebspnk7",
//   handle: "evilgeniuslabs.org",
//   displayName: "Jason Coon",
//   avatar:
//     "https://cdn.bsky.app/img/avatar/plain/did:plc:tajcrjc2hb727vkpnebspnk7/bafkreicblk3zu4mxmmgkb2ukgvuvld2pg556vinpg2mtfej4gcvn5g56xa@jpeg",
//   associated: {
//     lists: 0,
//     feedgens: 0,
//     starterPacks: 0,
//     labeler: false,
//   },
//   labels: [],
//   createdAt: "2023-07-06T14:48:33.789Z",
//   description:
//     "Hand-crafted bits, atoms, and photons. Father, husband, maker. He/Him - https://evilgeniuslabs.org",
//   indexedAt: "2024-11-06T19:50:08.483Z",
//   banner:
//     "https://cdn.bsky.app/img/banner/plain/did:plc:tajcrjc2hb727vkpnebspnk7/bafkreiasylwiuskgpj326tq2dhc3yjinqtkhf5sysyazxe2y26qiurtfmm@jpeg",
//   followersCount: 952,
//   followsCount: 189,
//   postsCount: 133,
//   pinnedPost: {
//     cid: "bafyreicoe372pekhme54wi7ukawvygc6rdivcimk4vg4fvoky6vdhjvgqe",
//     uri: "at://did:plc:tajcrjc2hb727vkpnebspnk7/app.bsky.feed.post/3l6uukxruwu26",
//   },
// };
