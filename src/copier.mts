import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DbSocialMetricItem } from "./socials.mjs";

const dynamoDbClient = new DynamoDBClient();
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient);
const TableName = "social-metrics";

export const handler = async () => {
  const social = 'Bluesky';
  const from = 'blenster.bsky.social';
  const to = 'blenster.com'

  const response = await dynamoDbDocumentClient.send(
    new QueryCommand({
      TableName,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: {
        "#pk": "pk",
      },
      ExpressionAttributeValues: {
        ":pk": `SocialMetric|${social}|${from}`,
      }
    })
  );

  for (const item of (response.Items ?? []) as DbSocialMetricItem[]) {
    item.pk = `SocialMetric|${social}|${to}`;
    item.handle = to;
    await saveItem(item);
  }
};

async function saveItem(item: DbSocialMetricItem) {
  await dynamoDbDocumentClient.send(
    new PutCommand({
      TableName,
      Item: item,
    })
  );
}
