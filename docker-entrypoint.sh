#!/bin/sh
# Apply any pending schema migrations before serving traffic.
#
# The database lives in a volume that outlives the container, so an image upgrade ships new
# migrations without them having been applied yet. Running them here makes deploying a new
# version a plain restart. `migrate deploy` is repeatable and never resets data.
set -e

# Reaches for the local binary rather than corepack/pnpm: this must succeed even when the
# container has no outbound network.
echo "applying database migrations…"
node_modules/.bin/prisma migrate deploy

exec "$@"
