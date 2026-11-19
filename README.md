# Social Metrics

Collects a daily follower count for a list of Bluesky and Mastodon profiles into DynamoDB
(table `social-metrics`), and serves the history to
[bsky-metrics](https://jasoncoon.github.io/bsky-metrics/) and
[masto-metrics](https://jasoncoon.github.io/masto-metrics/).

- `src/handles.json`: the tracked profiles (also the default list in both web apps).
- `src/updater.mts`: Lambda that records today's count for each handle. When a fetch fails it
  records nothing (so the apps show a gap) and logs a line starting `SOCIAL_METRICS_FETCH_FAILURES`
  (good for a CloudWatch metric filter or alarm).
- `src/query.mts`: Lambda behind `https://social-metrics.evilgeniuslabs.org/query?social=…&handle=…`.
- `web-core/`: shared React code for the two web apps (see their READMEs).

```sh
npm install
npm test           # type-check + lint
npm run build      # dist/ (includes handles.json)
```

## Deploy

The Lambdas were created in the AWS console (us-east-1, Node.js 22):

| Function | Source | Trigger |
|---|---|---|
| `social-metrics-updater` | `src/updater.mts` | EventBridge Scheduler `social-metrics-daily`, `cron(0 0,12 * * ? *)` UTC |
| `social-metrics-query` | `src/query.mts` | API Gateway `c2bg4srhg1`, `GET /query` (custom domain `social-metrics.evilgeniuslabs.org`) |
| `social-metrics-copier` | `src/copier.mts` | none (one-off, superseded by `scripts/migrate-handle.mts`) |

Each zip is the contents of `dist/` with the function's entry file renamed to `index.mjs`
(handler `index.handler`); no `node_modules`, since the runtime includes the AWS SDK.

```sh
npm run deploy     # build, zip and update-function-code for the updater and query functions
aws lambda invoke --function-name social-metrics-updater /dev/stdout   # optional: run it now
```

## When a profile moves or changes handle

1. Update `src/handles.json` and deploy the updater.
2. Copy the old history to the new handle (run locally with AWS credentials; dry run unless `--apply`):

   ```sh
   npm run migrate-handle -- --social Mastodon --from qoto.org/@Blenster --to social.cleverlibre.org/@Blenster
   npm run migrate-handle -- --social Mastodon --from qoto.org/@Blenster --to social.cleverlibre.org/@Blenster --delete-source --apply

   npm run migrate-handle -- --social Bluesky --from architeuthisflux.bsky.social --to jumperless.org
   npm run migrate-handle -- --social Bluesky --from architeuthisflux.bsky.social --to jumperless.org --delete-source --apply
   ```

## Cleaning up failed days

Older versions of the updater stored 0 or a blank value when a fetch failed. To find and delete
those rows (a backup JSON is written to `backups/` first):

```sh
npm run clean-bad-rows            # dry run: lists what would be deleted
npm run clean-bad-rows -- --apply
```
