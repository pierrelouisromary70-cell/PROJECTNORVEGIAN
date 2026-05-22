#!/usr/bin/env bash
# Finish the Next 14 -> 15 migration locally.
#
# The foundation files (package.json, supabase/server.ts, i18n/request.ts,
# layouts) were pushed in the upgrade commit. This script applies the
# remaining mechanical transformations: async params/searchParams on every
# page, async cookies()/headers() on the 5 API routes that use them, and
# `await createClient()` on every server-side caller.
#
# Idempotent: safe to run multiple times.
#
# Usage: bash scripts/finish-next15-migration.sh

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Running Next.js codemod for async params / cookies / headers"
npx --yes @next/codemod@canary next-async-request-api . --force

echo "==> Adding await to server-side createClient() calls"
# 18 server-side callers — only the ones importing from @/lib/supabase/server.
SERVER_FILES=$(grep -rl "from '@/lib/supabase/server'" src/ || true)
for f in $SERVER_FILES; do
  # Skip the server.ts module itself.
  case "$f" in
    *src/lib/supabase/server.ts) continue ;;
  esac
  # Replace `= createClient();` -> `= await createClient();`
  # Also handles the `as createServerClient` alias in account/delete/route.ts.
  sed -i.bak \
    -e 's|= createClient();|= await createClient();|g' \
    -e 's|= createServerClient();|= await createServerClient();|g' \
    "$f"
  rm -f "${f}.bak"
done

echo "==> Running typecheck"
npm run typecheck

echo "==> Running tests"
npm test

echo
echo "Migration complete. Next 15 build should now pass. Run 'npm run dev'."
