import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  type BatchWriteCommandInput,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { setTimeout } from "node:timers/promises";
import { parseArgs } from "node:util";
import {
  type DbSocialMetricItem,
  getPartitionKey,
  TableName,
} from "../src/socials.mjs";

export const db = DynamoDBDocumentClient.from(new DynamoDBClient());

export { parseArgs, TableName };

export async function queryAll(social: string, handle: string) {
  const items: DbSocialMetricItem[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const response = await db.send(
      new QueryCommand({
        TableName,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: { "#pk": "pk" },
        ExpressionAttributeValues: { ":pk": getPartitionKey(social, handle) },
        ExclusiveStartKey,
      })
    );
    items.push(...((response.Items ?? []) as DbSocialMetricItem[]));
    ExclusiveStartKey = response.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

type WriteRequest = NonNullable<
  BatchWriteCommandInput["RequestItems"]
>[string][number];

/** Batch-writes requests 25 at a time, retrying unprocessed items with backoff. */
export async function batchWrite(requests: WriteRequest[]) {
  for (let i = 0; i < requests.length; i += 25) {
    let pending: WriteRequest[] = requests.slice(i, i + 25);
    for (let attempt = 0; pending.length; attempt++) {
      if (attempt > 0) await setTimeout(Math.min(2 ** attempt * 100, 5000));
      if (attempt > 8) throw new Error("Too many unprocessed items, giving up");
      const response = await db.send(
        new BatchWriteCommand({ RequestItems: { [TableName]: pending } })
      );
      pending = (response.UnprocessedItems?.[TableName] ?? []) as WriteRequest[];
    }
  }
}

export const putRequest = (Item: DbSocialMetricItem): WriteRequest => ({
  PutRequest: { Item },
});

export const deleteRequest = (item: DbSocialMetricItem): WriteRequest => ({
  DeleteRequest: { Key: { pk: item.pk, sk: item.sk } },
});
