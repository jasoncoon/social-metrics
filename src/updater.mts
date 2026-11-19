import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getBlueskyProfileFollowerCount } from "./bluesky.mjs";
import { getMastodonProfileFollowerCount } from "./mastodon.mjs";
import {
  type DbSocialMetricItem,
  getPartitionKey,
  type SocialMetricItem,
  socials,
  TableName,
} from "./socials.mjs";

const dynamoDbClient = new DynamoDBClient();
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient);

export const handler = async () => {
  const date = new Date().toISOString().substring(0, 10); // "2025-01-24"
  const failures: string[] = [];

  for (const { social, handles } of socials) {
    let i = 1;

    for (const handle of handles) {
      console.log(
        `Getting ${social} profile ${i++} of ${handles.length}: ${handle}`
      );

      const followers =
        social === "Bluesky"
          ? await getBlueskyProfileFollowerCount(handle)
          : await getMastodonProfileFollowerCount(handle);

      // Don't record a 0 or blank when the fetch failed: a missing day is
      // shown as a gap, whereas a 0 shows up as a false drop.
      if (followers === undefined) {
        failures.push(`${social} ${handle}`);
        continue;
      }

      const item: SocialMetricItem = {
        social,
        handle,
        date,
        followers,
      };

      const dbItem: DbSocialMetricItem = {
        ...item,
        pk: getPartitionKey(social, handle),
        sk: date,
      };

      await saveItem(dbItem);
    }
  }

  if (failures.length) {
    // Single greppable line for a CloudWatch metric filter / alarm.
    console.error(
      `SOCIAL_METRICS_FETCH_FAILURES count=${failures.length}: ${failures.join(", ")}`
    );
  }

  return { date, failures };
};

async function saveItem(item: DbSocialMetricItem) {
  await dynamoDbDocumentClient.send(
    new PutCommand({
      TableName,
      Item: item,
    })
  );
}
