# Finish the Next 14 -> 15 migration locally (PowerShell version).
#
# Equivalent of scripts/finish-next15-migration.sh for Windows users who
# don't have bash. Applies the same transformations: codemod for async
# params/cookies/headers, then `await createClient()` on every server-side
# caller.
#
# Idempotent: safe to run multiple times.
#
# Usage (in PowerShell from the project root):
#   PS> .\scripts\finish-next15-migration.ps1
#
# If PowerShell blocks execution, run once per session:
#   PS> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

$ErrorActionPreference = 'Stop'

# Move to project root regardless of where the script was invoked from.
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "==> Running Next.js codemod for async params / cookies / headers" -ForegroundColor Cyan
# --yes auto-accepts npx package install. --force lets it proceed despite a
# dirty git tree (we want that — we're about to mutate files).
& npx --yes "@next/codemod@canary" next-async-request-api . --force
if ($LASTEXITCODE -ne 0) { throw "codemod failed (exit $LASTEXITCODE)" }

Write-Host "==> Adding await to server-side createClient() calls" -ForegroundColor Cyan

# Only files that import from @/lib/supabase/server need the cascade.
$serverFiles = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx -File |
  Where-Object {
    # Skip the server.ts module itself (it's where createClient is defined).
    -not ($_.FullName -replace '\\','/' -like '*src/lib/supabase/server.ts') -and
    (Select-String -Path $_.FullName -Pattern "from '@/lib/supabase/server'" -Quiet)
  }

foreach ($file in $serverFiles) {
  $content = Get-Content -Raw -LiteralPath $file.FullName

  # The two patterns the bash sed handles. Anchored with `= ` to avoid
  # rewriting unrelated mentions of createClient (like in a comment or a
  # `function createClient` declaration).
  $updated = $content `
    -replace '= createClient\(\);', '= await createClient();' `
    -replace '= createServerClient\(\);', '= await createServerClient();'

  if ($updated -ne $content) {
    Set-Content -LiteralPath $file.FullName -Value $updated -NoNewline
    Write-Host "    rewrote $($file.FullName.Replace($projectRoot + '\', ''))"
  }
}

Write-Host "==> Running typecheck" -ForegroundColor Cyan
& npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "typecheck failed (exit $LASTEXITCODE)" }

Write-Host "==> Running tests" -ForegroundColor Cyan
& npm test
if ($LASTEXITCODE -ne 0) { throw "tests failed (exit $LASTEXITCODE)" }

Write-Host ""
Write-Host "Migration complete. Run 'npm run dev'." -ForegroundColor Green
