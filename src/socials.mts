import handles from "./handles.json" with { type: "json" };

export type SocialName = "Bluesky" | "Mastodon";

interface Social {
  social: SocialName;
  handles: string[];
}

export interface SocialMetricItem {
  social: string;
  handle: string;
  date: string;
  followers?: number;
}

export interface DbSocialMetricItem extends SocialMetricItem {
  pk: string;
  sk: string;
}

export const TableName = "social-metrics";

export function getPartitionKey(social: string, handle: string) {
  return `SocialMetric|${social}|${handle}`;
}

/** The single list of tracked handles lives in handles.json (also used by the web apps). */
export const socials: Social[] = [
  { social: "Bluesky", handles: handles.Bluesky },
  { social: "Mastodon", handles: handles.Mastodon },
];
