#!/usr/bin/env bash
# Smoke test prod Storm Tracker. Délègue à scripts/smoke.sh.
#
#   PROD_URL=https://<projet>.vercel.app STATUS_TOKEN=<jeton> \
#     bash .claude/skills/deploy/smoke.sh
set -u

# Renseigner l'URL prod ici une fois connue, pour ne plus la passer en env.
PROD_URL="${PROD_URL:-}"

if [ -z "$PROD_URL" ]; then
	echo "PROD_URL non défini (URL du déploiement Vercel)."
	exit 2
fi

HERE="$(cd "$(dirname "$0")/../../.." && pwd)"
BASE_URL="$PROD_URL" exec bash "$HERE/scripts/smoke.sh"
