/**
 * Copies a handle's follower history to a new handle (e.g. after a Bluesky
 * handle change or a Mastodon server move). Rows with 0 or missing followers
 * are skipped, and dates that already exist under the new handle are not overwritten.
 *
 * Dry run by default; add --apply to write.
 *
 *   npx tsx scripts/migrate-handle.mts --social Mastodon \
 *     --from qoto.org/@Blenster --to social.cleverlibre.org/@Blenster [--delete-source] [--apply]
 */
import { getPartitionKey } from "../src/socials.mjs";
import {
  batchWrite,
  deleteRequest,
  parseArgs,
  putRequest,
  queryAll,
} from "./dynamo.mjs";

const { values } = parseArgs({
  options: {
    social: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
    "delete-source": { type: "boolean", default: false },
    apply: { type: "boolean", default: false },
  },
});

const { social, from, to, apply } = values;
const deleteSource = values["delete-source"];

if (!social || !from || !to) {
  console.error(
    "Usage: migrate-handle.mts --social <Bluesky|Mastodon> --from <old handle> --to <new handle> [--delete-source] [--apply]"
  );
  process.exit(1);
}

const source = await queryAll(social, from);
const existing = new Set((await queryAll(social, to)).map((i) => i.sk));

const toCopy = source.filter((i) => (i.followers ?? 0) > 0 && !existing.has(i.sk));
const skippedBad = source.filter((i) => !((i.followers ?? 0) > 0)).length;
const skippedExisting = source.filter(
  (i) => (i.followers ?? 0) > 0 && existing.has(i.sk)
).length;

const dates = toCopy.map((i) => i.sk).sort();
console.log(`${social}: ${from} -> ${to}`);
console.log(`  source rows:                  ${source.length}`);
console.log(`  to copy:                      ${toCopy.length} (${dates[0] ?? "-"} .. ${dates.at(-1) ?? "-"})`);
console.log(`  skipped (0 / missing):        ${skippedBad}`);
console.log(`  skipped (already at target):  ${skippedExisting}`);
console.log(`  rows already at target:       ${existing.size}`);
if (deleteSource) console.log(`  source rows to delete:        ${source.length}`);

if (!apply) {
  console.log("\nDry run. Re-run with --apply to write.");
  process.exit(0);
}

await batchWrite(
  toCopy.map((item) =>
    putRequest({ ...item, handle: to, pk: getPartitionKey(social, to) })
  )
);
console.log(`Copied ${toCopy.length} rows.`);

if (deleteSource) {
  await batchWrite(source.map(deleteRequest));
  console.log(`Deleted ${source.length} source rows.`);
}
