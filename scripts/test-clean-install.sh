#!/usr/bin/env bash
# End-to-end test of a clean install: starts the image the way a new user would (hardened
# container, minimal configuration, no secrets, no data sources) next to a stub web server and
# checks what the app serves. Needs only Docker (with the Compose plugin) and curl.
#
#   scripts/test-clean-install.sh              build the image from this checkout and test it
#   IMAGE=ghcr.io/al31si/orbis-homelab:1.2.3 scripts/test-clean-install.sh   test an existing image
#
# The project name and host port are unique per run and everything is removed at the end.
set -uo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PROJECT="orbis-homelab-clean-$$-$(date +%s)"
COMPOSE=(docker compose -p "$PROJECT" -f "$ROOT/test/clean-install/compose.yaml")

for tool in docker curl; do
  command -v "$tool" >/dev/null 2>&1 || { echo "FAIL: $tool is required" >&2; exit 2; }
done
docker compose version >/dev/null 2>&1 || { echo "FAIL: the Docker Compose plugin is required" >&2; exit 2; }

PASSED=()
FAILED=()
LOGS_ON_EXIT=0

cleanup() {
  if [ "$LOGS_ON_EXIT" = 1 ]; then
    echo "--- orbis logs ---" >&2
    "${COMPOSE[@]}" logs --no-color orbis >&2 2>&1 || true
  fi
  "${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

record() { # record <name> <status>
  if [ "$2" = 0 ]; then PASSED+=("$1"); echo "  ok   $1"; else FAILED+=("$1"); echo "  FAIL $1"; fi
}

# check <name> <command...>: passes when the command exits 0.
check() {
  local name=$1
  shift
  "$@" >/dev/null 2>&1
  record "$name" $?
}

fatal() {
  echo "FAIL: $*" >&2
  LOGS_ON_EXIT=1
  exit 1
}

# --- start ------------------------------------------------------------------------------------
echo "Starting project $PROJECT"
if [ -n "${IMAGE:-}" ]; then
  "${COMPOSE[@]}" up -d --no-build || fatal "docker compose up failed"
else
  "${COMPOSE[@]}" up -d --build || fatal "docker compose up --build failed"
fi

CID=$("${COMPOSE[@]}" ps -q orbis)
[ -n "$CID" ] || fatal "the app container was not created"
ADDRESS=$("${COMPOSE[@]}" port orbis 3100) || fatal "no published port"
BASE="http://127.0.0.1:${ADDRESS##*:}"

echo "Waiting for the container to become healthy ($BASE)"
status=starting
for _ in $(seq 1 60); do
  status=$(docker inspect -f '{{if .State.Running}}{{.State.Health.Status}}{{else}}exited{{end}}' "$CID" 2>/dev/null || echo gone)
  [ "$status" = healthy ] && break
  [ "$status" = exited ] || [ "$status" = gone ] || [ "$status" = unhealthy ] && break
  sleep 2
done
[ "$status" = healthy ] || fatal "container is $status, not healthy"

# --- helpers ----------------------------------------------------------------------------------
get() { curl -fsS --max-time 10 "$BASE$1"; }
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE$1"; }

# json <path> <expression>: GET the path and evaluate the JavaScript expression on the parsed
# body `d`. Runs inside the container under test, so the host needs no JSON tooling.
json() {
  get "$1" | "${COMPOSE[@]}" exec -T orbis node -e '
    let s = "";
    process.stdin.on("data", (c) => (s += c)).on("end", () => {
      const d = JSON.parse(s);
      process.exit(eval(process.argv[1]) === true ? 0 : 1);
    });' "$2"
}

# --- assertions -------------------------------------------------------------------------------
echo "Checking"

check "GET /api/health answers { ok: true }" json /api/health 'd.ok === true'

INDEX=$(get /) || INDEX=""
check "/ is HTML with the custom name" grep -q "Clean Install Check" <<<"$INDEX"
check "/ declares lang=\"en\"" grep -q '<html lang="en"' <<<"$INDEX"
check "/ has no unreplaced %% token" bash -c '! grep -q "%%" <<<"$1"' _ "$INDEX"
check "/ embeds the boot configuration" grep -q 'name="orbis-boot"' <<<"$INDEX"

check "/manifest.webmanifest is valid JSON with the custom name, standalone" \
  json /manifest.webmanifest 'd.name === "Clean Install Check" && d.display === "standalone"'

SW=$(get /sw.js) || SW=""
check "/sw.js is JavaScript" bash -c 'curl -fsSI --max-time 10 "$1/sw.js" | grep -qi "^content-type:.*javascript"' _ "$BASE"
check "/sw.js carries the instance cache prefix" grep -Eq 'cachePrefix"?[: ]+"clean-check-"' <<<"$SW"
# The marker comment stays (it makes the template checkable); the default object must be gone.
check "/sw.js instance object is the rendered JSON" \
  grep -q '__SW_INSTANCE__\*/ {"cachePrefix":"clean-check-"' <<<"$SW"

check "/api/session: every feature is off" \
  json /api/session 'Object.values(d.features).length > 0 && Object.values(d.features).every((v) => v === false)'
check "/api/session: custom name, language, limited access, no extensions" \
  json /api/session 'd.app.name === "Clean Install Check" && d.app.language === "en" && d.access === "limited" && d.extensions.length === 0'
for path in system containers storage activity; do
  check "GET /api/$path is 404 (feature off)" test "$(code "/api/$path")" = 404
done

# Probes and the alert evaluation run asynchronously (a service is flagged after two failed
# probes, alerts are evaluated every 15 s): wait for the expected state to settle.
settled=1
for _ in $(seq 1 45); do
  if json /api/overview 'd.data !== null && d.data.services.up === 1 && d.data.services.down === 1 && d.data.alerts.length === 1'; then
    settled=0
    break
  fi
  sleep 2
done
record "probes settle: one service up, one down, one alert" "$settled"

check "/api/overview: 3 services (1 up, 1 down, 1 not monitored)" json /api/overview '
  const s = d.data.services;
  s.total === 3 && s.up === 1 && s.down === 1 && s.degraded === 0 && s.unknown === 0 && s.unmonitored === 1'
check "/api/overview: no system, no storage" json /api/overview 'd.data.system === null && d.data.storage === null'
check "/api/overview: only the down service raises an alert" json /api/overview '
  d.data.alerts.length === 1 && d.data.alerts[0].serviceId === "stub-down" && d.data.alerts[0].source === "service"'
check "/api/overview: no alert about absent integrations or sources" json /api/overview '
  d.data.alerts.every((a) => a.source === "service")'
check "/api/services: expected state per service" json /api/services '
  const by = Object.fromEntries(d.data.map((s) => [s.id, s]));
  by["stub-ok"].state === "up" && by["stub-ok"].monitored === true &&
  by["stub-down"].state === "down" && by["stub-down"].monitored === true &&
  by["no-probe"].monitored === false && by["no-probe"].probe === null'
check "/api/diagnostics: the only source is the probes" json /api/diagnostics '
  d.sources.length === 1 && d.sources[0].id === "probes" && d.sources[0].ok === true &&
  d.extensions.length === 0 && d.push.enabled === false'

# Startup must be quiet about everything that is not configured. A failing probe may be logged;
# an error is not acceptable, and neither is a warning that names an absent feature.
LOGS=$("${COMPOSE[@]}" logs --no-color orbis 2>&1)
LEVEL='"level":("?(error|fatal|50|60)"?)'
FEATURE='glances|system|storage|smart|usage|push|vapid|integration|extension|activity|secret|api[_ ]?key|token|not configured|unconfigured'
check "logs: no error-level line" bash -c '! grep -Eiq "$1" <<<"$2"' _ "$LEVEL" "$LOGS"
check "logs: no warning about an unconfigured feature" \
  bash -c '! grep -Ei "warn|\"level\":\"?(warn|40)\"?" <<<"$2" | grep -Eiq "$1"' _ "$FEATURE" "$LOGS"

# --- container hardening ----------------------------------------------------------------------
check "container root filesystem is read-only" \
  test "$(docker inspect -f '{{.HostConfig.ReadonlyRootfs}}' "$CID")" = true
check "container drops all capabilities and forbids new privileges" bash -c '
  docker inspect -f "{{.HostConfig.CapDrop}} {{.HostConfig.SecurityOpt}}" "$1" | grep -q "ALL" &&
  docker inspect -f "{{.HostConfig.CapDrop}} {{.HostConfig.SecurityOpt}}" "$1" | grep -q "no-new-privileges"' _ "$CID"
check "container runs as a non-root user" bash -c '[ "$("${@}" id -u)" != 0 ]' _ "${COMPOSE[@]}" exec -T orbis
check "the image carries the licence and the third-party notices" \
  "${COMPOSE[@]}" exec -T orbis sh -c 'test -s /app/LICENSE && test -s /app/THIRD_PARTY_NOTICES.md'
check "the application directory is not writable" \
  bash -c '! "${@}" touch /app/probe-write' _ "${COMPOSE[@]}" exec -T orbis
check "/data is writable" "${COMPOSE[@]}" exec -T orbis sh -c 'touch /data/.w && rm /data/.w'

# --- the recommended install: the shipped compose.yaml and example files, twice -----------------
# Two folders made exactly like the Quick Start (compose.yaml, config.example.yaml,
# services.example.yaml, .env.example, ORBIS_VERSION) and started together. Proves the files
# work as shipped, that the result is `limited`, and that two installs coexist without a fixed
# project or container name. Both folders are called `orbis-homelab` (what the Quick Start
# creates), in different parents: Compose derives the project name from the folder name, so the
# second one sets COMPOSE_PROJECT_NAME, as docs/install.md says. Only the image is swapped for
# the one under test.
echo "Checking the recommended install (two folders)"
# The first project is done: release its network first, a Docker host with many networks may have
# no free address pool left.
"${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1
QS_DIR=$(mktemp -d)
QS_IMAGE=${IMAGE:-orbis-clean-install:local}
QS_PROJECTS=()
QS_NET_OFFSET=0
qs_cleanup() {
  for dir in "${QS_PROJECTS[@]}"; do
    (cd "$dir" && docker compose down -v --remove-orphans >/dev/null 2>&1) || true
  done
  rm -rf "$QS_DIR"
}
trap 'qs_cleanup; cleanup' EXIT

qs_install() { # qs_install <slot> <host-port-or-0> <version> [project-name]
  local dir="$QS_DIR/$1/orbis-homelab"
  mkdir -p "$dir/config" "$dir/data"
  cp "$ROOT/compose.yaml" "$dir/compose.yaml"
  cp "$ROOT/config.example.yaml" "$dir/config/config.yaml"
  cp "$ROOT/services.example.yaml" "$dir/config/services.yaml"
  cp "$ROOT/.env.example" "$dir/.env"
  printf 'ORBIS_VERSION=%s\nORBIS_PORT=%s\n' "$3" "$2" >>"$dir/.env"
  [ -z "${4:-}" ] || printf 'COMPOSE_PROJECT_NAME=%s\n' "$4" >>"$dir/.env"
  chmod 777 "$dir/data" # the container runs as uid 1000; the test user may not be that uid
  # Besides the image, the override gives the network a tiny explicit subnet: the test must not
  # depend on how many default address pools the Docker host still has free.
  printf 'services:\n  orbis:\n    image: %s\nnetworks:\n  default:\n    ipam:\n      config:\n        - subnet: 10.251.%s.0/29\n' \
    "$QS_IMAGE" "$((RANDOM % 120 + 1 + QS_NET_OFFSET))" >"$dir/override.yaml"
  QS_NET_OFFSET=$((QS_NET_OFFSET + 120))
  QS_PROJECTS+=("$dir")
}
qs() { local dir="$QS_DIR/$1/orbis-homelab"; shift; (cd "$dir" && docker compose -f compose.yaml -f override.yaml "$@"); }

qs_install a 0 9.9.1
sed -i '/^ORBIS_VERSION=/d;/^ORBIS_PORT=/d' "$QS_DIR/a/orbis-homelab/.env"
qs_install b 0 9.9.2 orbis-homelab-b
check "compose.yaml refuses to start without ORBIS_VERSION" bash -c '
  cd "$1/a/orbis-homelab" && ! docker compose config >/dev/null 2>&1 &&
  docker compose config 2>&1 | grep -q ORBIS_VERSION' _ "$QS_DIR"
printf 'ORBIS_VERSION=9.9.1\nORBIS_PORT=0\n' >>"$QS_DIR/a/orbis-homelab/.env"
qs a up -d --no-build >"$QS_DIR/up-a.log" 2>&1; qs_a=$?
qs b up -d --no-build >"$QS_DIR/up-b.log" 2>&1; qs_b=$?
[ $((qs_a + qs_b)) = 0 ] || cat "$QS_DIR"/up-*.log >&2
record "both installs start side by side" $((qs_a + qs_b))

QS_A=$(qs a ps -q orbis); QS_B=$(qs b ps -q orbis)
check "same-named folders: distinct containers named after the project, not a fixed name" bash -c '
  [ -n "$1" ] && [ -n "$2" ] && [ "$1" != "$2" ] &&
  a=$(docker inspect -f "{{.Name}}" "$1") && b=$(docker inspect -f "{{.Name}}" "$2") &&
  [ "$a" = /orbis-homelab-orbis-1 ] && [ "$b" = /orbis-homelab-b-orbis-1 ]' _ "$QS_A" "$QS_B"
# The hazard the documentation warns about: without COMPOSE_PROJECT_NAME the second folder would
# get the project name of the first (same folder name) and Compose would treat them as one install.
check "without COMPOSE_PROJECT_NAME a same-named folder gets the same project name (documented)" bash -c '
  cd "$1/b/orbis-homelab" && sed -i "/^COMPOSE_PROJECT_NAME=/d" .env &&
  [ "$(docker compose config | sed -n "s/^name: //p")" = orbis-homelab ] &&
  printf "COMPOSE_PROJECT_NAME=orbis-homelab-b\n" >> .env' _ "$QS_DIR"

for name in a b; do
  cid=$(qs "$name" ps -q orbis)
  port=$(qs "$name" port orbis 3100 | sed 's/.*://')
  for _ in $(seq 1 60); do
    st=$(docker inspect -f '{{if .State.Running}}{{.State.Health.Status}}{{else}}exited{{end}}' "$cid" 2>/dev/null || echo gone)
    [ "$st" = healthy ] && break
    [ "$st" = exited ] || [ "$st" = gone ] || [ "$st" = unhealthy ] && break
    sleep 2
  done
  check "install-$name becomes healthy with the shipped files" test "$st" = healthy
  qs_json() { # qs_json <path> <expression> [curl args...]
    local path=$1 expr=$2
    shift 2
    curl -fsS --max-time 10 "$@" "http://127.0.0.1:$port$path" |
      docker exec -i "$cid" node -e '
        let s = ""; process.stdin.on("data", (c) => (s += c)).on("end", () => {
          const d = JSON.parse(s); process.exit(eval(process.argv[1]) === true ? 0 : 1); });' "$expr"
  }
  check "install-$name is safe by default: access limited, accessMode limited, no push" \
    qs_json /api/session 'd.access === "limited" && d.accessMode === "limited" && d.features.push === false'
  check "install-$name stays limited when the request claims an identity or a trusted source" \
    qs_json /api/session 'd.access === "limited"' \
      -H 'Tailscale-User-Login: alice@example.com' -H 'Remote-User: alice' -H 'X-Forwarded-For: 127.0.0.1'
  check "install-$name does not expose push or private data to a limited visitor" bash -c '
    [ "$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST -H "Content-Type: application/json" -H "Origin: http://127.0.0.1:$1" -d "{}" "http://127.0.0.1:$1/api/push/subscribe")" != 200 ]' _ "$port"
done

# --- result -----------------------------------------------------------------------------------
echo
echo "Passed: ${#PASSED[@]}   Failed: ${#FAILED[@]}"
if [ "${#FAILED[@]}" -gt 0 ]; then
  printf 'FAIL: %s\n' "${FAILED[@]}"
  LOGS_ON_EXIT=1
  echo "RESULT: FAIL"
  exit 1
fi
echo "RESULT: PASS"
