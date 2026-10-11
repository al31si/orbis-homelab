# Claude Code usage writer

Optional, advanced helper that produces the JSON document read by a [`weekly-quota` usage provider](../../docs/usage-providers.md) for a Claude Code subscription. Orbis Homelab never talks to the vendor itself: this script runs on the Docker host and only writes a small file.

> The script uses the same OAuth endpoints as the Claude Code CLI. They are not a documented public API and may change or stop working without notice. Use it at your own risk; any other script that writes the same JSON works equally well.

## What it does

1. Reads the OAuth credentials from `<config-dir>/.credentials.json` (created by `claude auth login`).
2. Refreshes the access token shortly before it expires and writes the rotated credentials back atomically (mode `0600`).
3. Reads the weekly usage window and writes this file (mode `0644`, atomically):

   ```json
   {
     "weekly_remaining_percent": 72.5,
     "weekly_resets_at": "2026-01-12T08:00:00+00:00",
     "plan": "max",
     "updated_at": "2026-01-08T10:15:00+00:00"
   }
   ```

Nothing secret is printed or written to the output. On any failure the previous output is kept and the exit code is `1`, so Orbis Homelab reports the data as stalled once it is older than `maxAgeMinutes`.

Requirements: Python 3.10 or newer, no extra packages.

## Setup

Use a dedicated credentials directory, not your everyday Claude Code one: the script rotates the refresh token in it.

```sh
mkdir -p ~/orbis-homelab/claude-credentials
CLAUDE_CONFIG_DIR=~/orbis-homelab/claude-credentials claude auth login
```

Test it once:

```sh
./update-claude-usage.py \
  --config-dir ~/orbis-homelab/claude-credentials \
  --output ~/orbis-homelab/data/claude-usage.json
```

Both options can come from the environment instead: `CLAUDE_CONFIG_DIR` and `CLAUDE_USAGE_OUTPUT`.

Schedule it every five minutes with cron (`crontab -e`):

```cron
*/5 * * * * /path/to/update-claude-usage.py --config-dir /path/to/claude-credentials --output /path/to/orbis-homelab/data/claude-usage.json
```

The output file must live in the directory mounted at `/data` in the container (or any other directory you mount). Then declare it in `config/config.yaml`, with the path as seen from inside the container:

```yaml
sources:
  usage:
    - id: claude
      label: Claude Code
      parser: weekly-quota
      file: /data/claude-usage.json
      maxAgeMinutes: 30
      hint: Schedule contrib/claude-usage/update-claude-usage.py on the host
```

Until the file exists the Activity page shows the `hint` instead of an error.
