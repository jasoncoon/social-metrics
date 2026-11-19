import { asCount, fetchJson } from "./fetchJson.mjs";

export interface MastodonProfile {
  followers_count?: number;
}

export function parseMastodonHandle(handle: string) {
  const [server, rawUsername] = handle.trim().replace(/^https?:\/\//, "").split("/");
  const username = rawUsername?.replace(/^@/, "");
  return { server, username };
}

/** Returns undefined if the count can't be fetched (never 0 as a stand-in for an error). */
export async function getMastodonProfileFollowerCount(
  handle: string
): Promise<number | undefined> {
  const { server, username } = parseMastodonHandle(handle);
  if (!server || !username) {
    console.error(`[Mastodon ${handle}] can't parse handle`);
    return undefined;
  }

  const profile = await fetchJson<MastodonProfile>(
    `https://${server}/api/v1/accounts/lookup?acct=${encodeURIComponent(username)}`,
    `Mastodon ${handle}`
  );
  return asCount(profile?.followers_count);
}

// const example = {
//   id: "109265523157271278",
//   username: "jasoncoon",
//   acct: "jasoncoon",
//   display_name: "Jason Coon",
//   locked: false,
//   bot: false,
//   discoverable: true,
//   indexable: true,
//   group: false,
//   created_at: "2022-10-31T00:00:00.000Z",
//   note: '\u003cp\u003eHand-crafted bits, atoms, and photons. Father, husband, maker. He/Him - \u003ca href="https://evilgeniuslabs.org" target="_blank" rel="nofollow noopener noreferrer" translate="no"\u003e\u003cspan class="invisible"\u003ehttps://\u003c/span\u003e\u003cspan class=""\u003eevilgeniuslabs.org\u003c/span\u003e\u003cspan class="invisible"\u003e\u003c/span\u003e\u003c/a\u003e\u003c/p\u003e',
//   url: "https://leds.social/@jasoncoon",
//   uri: "https://leds.social/users/jasoncoon",
//   avatar:
//     "https://cdn.masto.host/ledssocial/accounts/avatars/109/265/523/157/271/278/original/73d136e73fda8750.jpeg",
//   avatar_static:
//     "https://cdn.masto.host/ledssocial/accounts/avatars/109/265/523/157/271/278/original/73d136e73fda8750.jpeg",
//   header:
//     "https://cdn.masto.host/ledssocial/accounts/headers/109/265/523/157/271/278/original/d1203b9b17533e26.jpeg",
//   header_static:
//     "https://cdn.masto.host/ledssocial/accounts/headers/109/265/523/157/271/278/original/d1203b9b17533e26.jpeg",
//   followers_count: 1871,
//   following_count: 305,
//   statuses_count: 1870,
//   last_status_at: "2025-01-25",
//   hide_collections: false,
//   noindex: false,
//   emojis: [],
//   roles: [
//     {
//       id: "1",
//       name: "Moderator",
//       color: "",
//     },
//   ],
//   fields: [
//     {
//       name: "Site",
//       value:
//         '\u003ca href="https://evilgeniuslabs.org" target="_blank" rel="nofollow noopener noreferrer me" translate="no"\u003e\u003cspan class="invisible"\u003ehttps://\u003c/span\u003e\u003cspan class=""\u003eevilgeniuslabs.org\u003c/span\u003e\u003cspan class="invisible"\u003e\u003c/span\u003e\u003c/a\u003e',
//       verified_at: "2022-11-05T21:43:59.821+00:00",
//     },
//     {
//       name: "Store",
//       value:
//         '\u003ca href="https://tindie.com/stores/jasoncoon" target="_blank" rel="nofollow noopener noreferrer me" translate="no"\u003e\u003cspan class="invisible"\u003ehttps://\u003c/span\u003e\u003cspan class=""\u003etindie.com/stores/jasoncoon\u003c/span\u003e\u003cspan class="invisible"\u003e\u003c/span\u003e\u003c/a\u003e',
//       verified_at: "2023-03-24T20:30:42.231+00:00",
//     },
//     {
//       name: "GitHub",
//       value:
//         '\u003ca href="https://github.com/jasoncoon" target="_blank" rel="nofollow noopener noreferrer me" translate="no"\u003e\u003cspan class="invisible"\u003ehttps://\u003c/span\u003e\u003cspan class=""\u003egithub.com/jasoncoon\u003c/span\u003e\u003cspan class="invisible"\u003e\u003c/span\u003e\u003c/a\u003e',
//       verified_at: "2022-11-10T04:03:49.691+00:00",
//     },
//   ],
// };
