import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DbSocialMetricItem, SocialMetricItem, socials } from "./socials.mjs";

interface Event {
  queryStringParameters?: {
    social?: string;
    handle?: string;
    nextPageKey?: string;
    limit?: string;
  };
}

export const handler = async (event?: Event) => {
  console.log({ event });

  const queryStringParameters = event?.queryStringParameters;

  if (!queryStringParameters) {
    return createResponse(400, {
      message: "query string paramters are required",
    });
  }

  const {
    social: socialName,
    handle,
    nextPageKey,
    limit: limitString,
  } = queryStringParameters;

  const social = socials.find((s) => s.social === socialName);
  if (!social) {
    return createResponse(400, {
      message: `Unsupported social query string paramter: ${socialName}`,
    });
  }

  if (!handle) {
    return createResponse(400, {
      message: "handle query string paramter is required",
    });
  }

  if (!social.handles.includes(handle)) {
    return createResponse(404, {
      message: `Unsupported social query string paramter: ${socialName}`,
    });
  }

  const limit: number | undefined = limitString?.length
    ? Number.parseInt(limitString)
    : undefined;

  const dynamoDbClient = new DynamoDBClient();
  const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient);
  const TableName = "social-metrics";

  const response = await dynamoDbDocumentClient.send(
    new QueryCommand({
      TableName,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: {
        "#pk": "pk",
      },
      ExpressionAttributeValues: {
        ":pk": `SocialMetric|${socialName}|${handle}`,
      },
      ExclusiveStartKey: getExclusiveStartKey(nextPageKey),
      Limit: limit,
    })
  );

  const items = response.Items?.map<SocialMetricItem>((dbItem) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pk, sk, ...item } = dbItem as DbSocialMetricItem;
    return item;
  });

  return {
    Items: items,
    LastEvaluatedKey: response.LastEvaluatedKey,
  };

  function createResponse(statusCode: number, body: unknown) {
    return {
      statusCode,
      body: JSON.stringify(body),
    };
  }

  function getExclusiveStartKey(nextPageKey?: string) {
    return nextPageKey
      ? JSON.parse(Buffer.from(nextPageKey, "base64url").toString())
      : undefined;
  }
};
