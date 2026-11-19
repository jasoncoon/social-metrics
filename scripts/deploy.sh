#!/bin/sh
# Deploys the social-metrics Lambdas (created in the AWS console, us-east-1):
#   social-metrics-updater  <- src/updater.mts  (EventBridge Scheduler "social-metrics-daily", 00:00 + 12:00 UTC)
#   social-metrics-query    <- src/query.mts    (API Gateway c2bg4srhg1, GET /query)
#
# Each function's zip is the contents of dist/ with its entry file renamed to
# index.mjs (handler: index.handler). No node_modules: the Node.js runtime
# already includes the AWS SDK v3.
#
# Usage: npm run deploy            (uses your default AWS profile)
#        AWS_PROFILE=other npm run deploy
set -eu
cd "$(dirname "$0")/.."

npm run build

for fn in updater query; do
  dir=$(mktemp -d)
  cp dist/*.mjs dist/*.json "$dir/"
  rm -f "$dir/copier.mjs"
  mv "$dir/$fn.mjs" "$dir/index.mjs"
  (cd "$dir" && zip -q -r "$dir.zip" .)
  echo "Deploying social-metrics-$fn ($(ls "$dir" | tr '\n' ' '))"
  aws lambda update-function-code \
    --region us-east-1 \
    --function-name "social-metrics-$fn" \
    --zip-file "fileb://$dir.zip" \
    --query '[FunctionName,LastModified,CodeSize]' \
    --output text
  rm -rf "$dir" "$dir.zip"
done
