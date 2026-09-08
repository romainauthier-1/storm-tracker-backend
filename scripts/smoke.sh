#!/usr/bin/env bash
# Smoke test — security-focused. Needs a running server (BASE_URL, default
# http://localhost:3000) already wired to a migrated database.
#
#   BASE_URL=http://localhost:3000 bash scripts/smoke.sh
set -u

BASE_URL="${BASE_URL:-http://localhost:3000}"
pass=0
fail=0

check() {
	local label="$1" expected="$2" actual="$3"
	if [ "$expected" = "$actual" ]; then
		echo "  ok   $label"
		pass=$((pass + 1))
	else
		echo "  FAIL $label (attendu $expected, obtenu $actual)"
		fail=$((fail + 1))
	fi
}

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "BASE_URL = $BASE_URL"

# 0. Serveur joignable — sinon inutile de continuer
root_code="$(code "$BASE_URL/")"
if [ "$root_code" = "000" ]; then
	echo "  FAIL serveur injoignable sur $BASE_URL"
	exit 1
fi

# 1. Racine vivante
check "GET / => 200" 200 "$root_code"

# 2. Route inconnue => 404 JSON
check "GET /nope => 404" 404 "$(code "$BASE_URL/nope")"

# 3. :id non entier rejeté (pas d'injection possible via params)
check "PATCH /dogs/update/abc => 400" 400 \
	"$(code -X PATCH "$BASE_URL/dogs/update/abc" -H 'Content-Type: application/json' -d '{}')"
check "DELETE /dogs/1;DROP => 400" 400 \
	"$(code -X DELETE "$BASE_URL/dogs/1;DROP%20TABLE%20dogs")"

# 4. Colonne hors whitelist rejetée (pas de mass-assignment / injection de colonne)
check "PATCH /humans/update/1 {password} => 400" 400 \
	"$(code -X PATCH "$BASE_URL/humans/update/1" -H 'Content-Type: application/json' -d '{"password":"x"}')"
check "PATCH /dogs/update/1 {\"a=b\":1} => 400" 400 \
	"$(code -X PATCH "$BASE_URL/dogs/update/1" -H 'Content-Type: application/json' -d '{"name = evil":1}')"

# 5. Mauvais identifiants => 401 (et pas 200)
check "POST /humans/signin (bidon) => 401" 401 \
	"$(code -X POST "$BASE_URL/humans/signin" -H 'Content-Type: application/json' -d '{"email":"nobody@example.com","password":"wrong"}')"

# 6. Pas de hash de mot de passe dans les réponses
humans_body="$(curl -s "$BASE_URL/humans")"
if echo "$humans_body" | grep -qi '"password"'; then
	echo "  FAIL GET /humans ne doit pas exposer password"
	fail=$((fail + 1))
else
	echo "  ok   GET /humans sans password"
	pass=$((pass + 1))
fi

# 7. Les erreurs ne fuient pas le détail Postgres
err_body="$(curl -s -X POST "$BASE_URL/walks" -H 'Content-Type: application/json' -d '{"date":"2026-01-01","walked_dog":999999,"walking_human":999999}')"
if echo "$err_body" | grep -qiE 'relation|column|violates|syntax error|constraint "'; then
	echo "  FAIL POST /walks fuite un message Postgres : $err_body"
	fail=$((fail + 1))
else
	echo "  ok   POST /walks (FK absente) sans fuite Postgres"
	pass=$((pass + 1))
fi

# 8. En-tête CORS renvoyé pour une requête portant un Origin
if curl -s -D - -o /dev/null -H 'Origin: http://example.test' "$BASE_URL/" \
	| grep -qi '^access-control-allow-origin:'; then
	echo "  ok   en-tête CORS présent (avec Origin)"
	pass=$((pass + 1))
else
	echo "  FAIL en-tête CORS absent"
	fail=$((fail + 1))
fi

# 9. /health public => 200 et db ok
health_body="$(curl -s "$BASE_URL/health")"
check "GET /health => 200" 200 "$(code "$BASE_URL/health")"
if echo "$health_body" | grep -q '"db":"ok"'; then
	echo "  ok   /health db:ok"
	pass=$((pass + 1))
else
	echo "  FAIL /health db pas ok : $health_body"
	fail=$((fail + 1))
fi

# 10. /status sans token => 401 (ou 503 si STATUS_TOKEN non configuré)
status_code="$(code "$BASE_URL/status")"
if [ "$status_code" = "401" ] || [ "$status_code" = "503" ]; then
	echo "  ok   GET /status sans token => $status_code"
	pass=$((pass + 1))
else
	echo "  FAIL GET /status sans token => $status_code (attendu 401 ou 503)"
	fail=$((fail + 1))
fi

# 11. /status/data avec token (si STATUS_TOKEN fourni à ce script)
if [ -n "${STATUS_TOKEN:-}" ]; then
	check "GET /status/data?token=... => 200" 200 \
		"$(code "$BASE_URL/status/data?token=$STATUS_TOKEN")"
	check "GET /status/data?token=faux => 401" 401 \
		"$(code "$BASE_URL/status/data?token=faux")"
fi

echo
echo "$pass ok / $fail fail"
[ "$fail" -eq 0 ]
