/**
 * Finds rows whose followers value is missing or 0 (failed fetches recorded by
 * older versions of the updater) and deletes them. A backup JSON of the deleted
 * rows is written to ./backups first.
 *
 * Dry run by default; add --apply to delete.
 *
 *   npx tsx scripts/clean-bad-rows.mts [--apply]
 */
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { mkdir, writeFile } from "node:fs/promises";
import type { DbSocialMetricItem } from "../src/socials.mjs";
import { batchWrite, db, deleteRequest, parseArgs, TableName } from "./dynamo.mjs";

const { values } = parseArgs({
  options: { apply: { type: "boolean", default: false } },
});

const bad: DbSocialMetricItem[] = [];
let ExclusiveStartKey: Record<string, unknown> | undefined;
do {
  const response = await db.send(
    new ScanCommand({
      TableName,
      FilterExpression:
        "begins_with(pk, :prefix) AND (attribute_not_exists(followers) OR followers = :zero)",
      ExpressionAttributeValues: { ":prefix": "SocialMetric|", ":zero": 0 },
      ExclusiveStartKey,
    })
  );
  bad.push(...((response.Items ?? []) as DbSocialMetricItem[]));
  ExclusiveStartKey = response.LastEvaluatedKey;
} while (ExclusiveStartKey);

const byHandle = new Map<string, string[]>();
for (const item of bad) {
  const key = `${item.social} ${item.handle}`;
  byHandle.set(key, [...(byHandle.get(key) ?? []), item.sk]);
}

console.log(`Found ${bad.length} rows with 0 / missing followers:`);
for (const [key, dates] of [...byHandle].sort()) {
  dates.sort();
  const preview =
    dates.length > 4 ? `${dates.slice(0, 2).join(", ")} … ${dates.at(-1)}` : dates.join(", ");
  console.log(`  ${key.padEnd(48)} ${String(dates.length).padStart(4)}  ${preview}`);
}

if (!values.apply) {
  console.log("\nDry run. Re-run with --apply to delete (a backup is written first).");
  process.exit(0);
}

if (bad.length) {
  await mkdir("backups", { recursive: true });
  const file = `backups/bad-rows-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(file, JSON.stringify(bad, null, 2));
  console.log(`Backup written to ${file}`);

  await batchWrite(bad.map(deleteRequest));
}
console.log(`Deleted ${bad.length} rows.`);
