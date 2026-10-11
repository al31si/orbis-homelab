#!/usr/bin/env python3
"""Write the Claude Code weekly usage window to a JSON file read by Orbis Homelab.

Optional, advanced helper for a `weekly-quota` usage provider (docs/usage-providers.md). It runs
on the host (cron or a systemd timer, every 5 minutes), so the OAuth token never enters the
Orbis Homelab container.

Login once, keeping the credentials in a directory of your choice:
    CLAUDE_CONFIG_DIR=/path/to/credentials claude auth login

Then schedule, for example:
    */5 * * * * /path/to/update-claude-usage.py --config-dir /path/to/credentials --output /path/to/orbis-homelab/data/claude-usage.json

and declare the file in config.yaml (as seen from inside the container):
    sources:
      usage:
        - { id: claude, label: Claude Code, parser: weekly-quota,
            file: /data/claude-usage.json, maxAgeMinutes: 30 }

Only the weekly window is written. The access token lives ~8 h: it is refreshed shortly before
expiry and the rotated credentials are written back atomically (0600). Nothing secret is printed
or written to the output file. On any failure the previous output is kept and the exit code is 1;
Orbis Homelab reports data older than `maxAgeMinutes` as stalled.

The endpoints below are those used by the Claude Code CLI; they are not a documented public API
and may change without notice.
"""
import argparse
import json
import os
import sys
import tempfile
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

TOKEN_URL = "https://platform.claude.com/v1/oauth/token"
USAGE_URL = "https://api.anthropic.com/api/oauth/usage"
CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
REFRESH_MARGIN_S = 30 * 60
TIMEOUT = 15


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "--config-dir",
        type=Path,
        default=os.environ.get("CLAUDE_CONFIG_DIR"),
        required="CLAUDE_CONFIG_DIR" not in os.environ,
        help="directory holding .credentials.json (env CLAUDE_CONFIG_DIR); use a dedicated one",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=os.environ.get("CLAUDE_USAGE_OUTPUT"),
        required="CLAUDE_USAGE_OUTPUT" not in os.environ,
        help="JSON file to write (env CLAUDE_USAGE_OUTPUT); must be readable by Orbis Homelab",
    )
    return parser.parse_args()


def fail(message: str) -> None:
    print(f"Claude usage updater: {message}", file=sys.stderr)
    sys.exit(1)


def request(url: str, *, body: dict | None = None, headers: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={"User-Agent": "orbis-usage-writer", "Content-Type": "application/json", **(headers or {})},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            return json.load(res)
    except urllib.error.HTTPError as err:
        fail(f"{url.split('/')[2]} answered HTTP {err.code}")
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
        fail(f"{url.split('/')[2]} unreachable: {type(err).__name__}")
    raise AssertionError("unreachable")


def write_atomic(path: Path, content: str, mode: int) -> None:
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name + ".")
    try:
        with os.fdopen(fd, "w") as fh:
            fh.write(content)
        os.chmod(tmp, mode)
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


def load_credentials(credentials: Path) -> tuple[dict, dict]:
    try:
        raw = json.loads(credentials.read_text())
    except (OSError, json.JSONDecodeError):
        fail("credentials unreadable: run the login (see the top of this file)")
    oauth = raw.get("claudeAiOauth")
    if not isinstance(oauth, dict) or "accessToken" not in oauth or "refreshToken" not in oauth:
        fail("credentials file has no claudeAiOauth block")
    return raw, oauth


def refresh_if_needed(credentials: Path, raw: dict, oauth: dict) -> str:
    if oauth.get("expiresAt", 0) / 1000 - time.time() > REFRESH_MARGIN_S:
        return oauth["accessToken"]
    token = request(
        TOKEN_URL,
        body={"grant_type": "refresh_token", "refresh_token": oauth["refreshToken"], "client_id": CLIENT_ID},
    )
    access, expires_in = token.get("access_token"), token.get("expires_in")
    if not access or not isinstance(expires_in, (int, float)):
        fail("refresh response is missing fields")
    oauth["accessToken"] = access
    oauth["expiresAt"] = int((time.time() + expires_in) * 1000)
    # Refresh tokens rotate: persist the new one before doing anything else.
    if token.get("refresh_token"):
        oauth["refreshToken"] = token["refresh_token"]
    raw["claudeAiOauth"] = oauth
    write_atomic(credentials, json.dumps(raw), 0o600)
    return access


def main() -> None:
    args = parse_args()
    credentials = Path(args.config_dir) / ".credentials.json"
    raw, oauth = load_credentials(credentials)
    access = refresh_if_needed(credentials, raw, oauth)
    usage = request(
        USAGE_URL,
        headers={"Authorization": f"Bearer {access}", "anthropic-beta": "oauth-2025-04-20"},
    )
    weekly = usage.get("seven_day")
    if not isinstance(weekly, dict) or weekly.get("utilization") is None or not weekly.get("resets_at"):
        fail("usage response has no seven_day window")

    output = {
        "weekly_remaining_percent": round(max(0.0, min(100.0, 100.0 - float(weekly["utilization"]))), 1),
        "weekly_resets_at": weekly["resets_at"],
        "plan": oauth.get("subscriptionType"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    write_atomic(Path(args.output), json.dumps(output, indent=2) + "\n", 0o644)


if __name__ == "__main__":
    main()
