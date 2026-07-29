#!/bin/bash
# Strip trailing newlines from ANEC's Vercel production environment variables.
#
# WHY
# 26 of 47 production env values have a literal newline baked into them. The
# damage that causes:
#   NODE_ENV="production\n"        -> ENV.isProduction is FALSE in production
#   VITE_SUPABASE_URL="...\n"      -> every new candidate photo_url is corrupted
#   OPENROUTER_API_KEY="...\n"     -> "Authorization: Bearer <key>\n" is an
#                                     invalid HTTP header, so Node's fetch
#                                     rejects it before the request is sent.
#                                     This is why the AI layer has produced
#                                     nothing for five months.
#
# SAFETY
# * Env var changes do NOT affect the currently running deployment. They apply
#   on the next build, so there is no window where production breaks.
# * Values are read fresh from Vercel (never from a stale local snapshot).
# * Each value is written to a private temp file, so the shell never expands or
#   logs a secret.
# * Vars whose entire value is just a newline are SKIPPED and reported — turning
#   those into "" vs deleting them is a judgement call, not something to guess.
# * A verification pass at the end confirms every variable still exists.
#
# USAGE
#   bash scripts-fix-env-newlines.sh          # apply
#   bash scripts-fix-env-newlines.sh --dry-run   # show what would change
set -uo pipefail

cd "$(dirname "$0")" || exit 1
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

command -v vercel >/dev/null || { echo "vercel CLI not found"; exit 1; }
vercel whoami >/dev/null 2>&1 || { echo "Not logged in. Run: vercel login"; exit 1; }

WORK="$(mktemp -d)"
chmod 700 "$WORK"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT INT TERM

echo "Pulling current production values..."
vercel env pull "$WORK/prod.env" --environment=production --yes >/dev/null 2>&1 \
  || { echo "Failed to pull env"; exit 1; }

python3 - "$WORK/prod.env" "$WORK" <<'PY'
import re, sys, pathlib
raw = open(sys.argv[1], encoding="utf-8", errors="replace").read()
work = pathlib.Path(sys.argv[2])

def unescape(v):
    return v.replace('\\n', '\n').replace('\\r', '\r').replace('\\"', '"').replace('\\\\', '\\')

fix, empty = [], []
for k, v in re.findall(r'^([A-Z0-9_]+)="((?:[^"\\]|\\.)*)"', raw, re.M):
    if '\\n' not in v and '\\r' not in v:
        continue
    val = unescape(v)
    # LLM_MODEL had an inline "# or any OpenRouter model" saved as part of the value.
    if '#' in val:
        val = val.split('#', 1)[0]
    val = val.strip()
    if not val:
        empty.append(k)
        continue
    (work / f"val_{k}").write_text(val, encoding="utf-8")
    fix.append(k)

(work / "_fix").write_text("\n".join(fix), encoding="utf-8")
(work / "_empty").write_text("\n".join(empty), encoding="utf-8")
print(f"  {len(fix)} to fix, {len(empty)} skipped (value is only a newline)")
PY

FIX_LIST=$(cat "$WORK/_fix")
EMPTY_LIST=$(cat "$WORK/_empty")

if [ -z "$FIX_LIST" ]; then
  echo "Nothing to fix — all values are already clean."
  exit 0
fi

if [ "$DRY_RUN" = "1" ]; then
  echo; echo "Would rewrite:"; echo "$FIX_LIST" | sed 's/^/  /'
  [ -n "$EMPTY_LIST" ] && { echo; echo "Would SKIP (newline-only):"; echo "$EMPTY_LIST" | sed 's/^/  /'; }
  exit 0
fi

echo
ok=0; fail=0; failed_names=""
for name in $FIX_LIST; do
  if vercel env rm "$name" production --yes >/dev/null 2>&1 \
     && vercel env add "$name" production < "$WORK/val_$name" >/dev/null 2>&1; then
    printf "  ok   %s\n" "$name"; ok=$((ok+1))
  else
    printf "  FAIL %s\n" "$name"; fail=$((fail+1)); failed_names="$failed_names $name"
  fi
done

echo
echo "rewritten=$ok failed=$fail"

# Verification: every variable that existed before must still exist.
echo
echo "Verifying..."
CURRENT=$(vercel env ls production 2>/dev/null | awk '{print $1}')
missing=""
for name in $FIX_LIST; do
  echo "$CURRENT" | grep -qx "$name" || missing="$missing $name"
done

if [ -n "$missing" ]; then
  echo "  *** MISSING AFTER UPDATE:$missing"
  echo "  *** Re-add these in the Vercel dashboard before your next deploy."
  exit 1
fi
echo "  all $ok variables present and clean."

if [ -n "$EMPTY_LIST" ]; then
  echo
  echo "Skipped (entire value was a newline — decide: delete, or set to empty?):"
  echo "$EMPTY_LIST" | sed 's/^/  /'
fi

echo
echo "Env vars apply on the NEXT build. Redeploy to pick them up:"
echo "  vercel --prod --yes"
