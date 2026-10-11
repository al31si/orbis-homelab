# Usage providers

A usage provider shows how much of a **weekly quota** is left, for example for an AI subscription. It appears in Activity (and enables that page). Orbis Homelab does not know any vendor: it reads a small JSON document from a file or a URL, and something of yours writes it.

```yaml
# config.yaml
sources:
  usage:
    - id: assistant
      label: Assistant
      parser: weekly-quota
      file: /data/assistant-usage.json # or: url: http://nas:8080/assistant-usage.json
      maxAgeMinutes: 30
      hint: Schedule the usage writer, see docs/usage-providers.md
```

One entry per tracked subscription. Keys are in the [configuration reference](configuration.md#sourcesusage).

## The `weekly-quota` document

```json
{
  "weekly_remaining_percent": 72.5,
  "weekly_resets_at": "2026-01-12T08:00:00+00:00",
  "plan": "plus",
  "updated_at": "2026-01-08T10:15:00+00:00"
}
```

| Field                      | Required             | Meaning                                                                    |
| -------------------------- | -------------------- | -------------------------------------------------------------------------- |
| `weekly_remaining_percent` | yes                  | Remaining share of the weekly quota, 0-100 (values outside are clamped)    |
| `weekly_resets_at`         | yes                  | ISO-8601 time at which the weekly window resets                            |
| `plan`                     | no                   | Name of the subscription plan, shown as a badge. `null` or absent hides it |
| `updated_at`               | with `maxAgeMinutes` | ISO-8601 time the document was written                                     |

A document without the weekly window is an error (shown on the card), never a guessed value.

## Freshness and states

- **`maxAgeMinutes`**: when set, the document must carry `updated_at`, and data older than that is reported as **stalled**: the writer has stopped. Set it to a few times the writer's period (the writer runs every 5 minutes, so 30 is a reasonable value).
- **Pending**: while a `file` source does not exist yet, the card is "pending" and shows `hint` instead of an error. This is the state of a fresh install before the writer is set up.
- **Error**: an unreadable URL, invalid JSON or a missing weekly window.
- `intervalSeconds` (default 300, minimum 30) is how often Orbis Homelab re-reads the source.

## Writing the document

Any script that runs where it can obtain the numbers and writes the file atomically (write to a temporary file, then rename) will do. For a `file` source, write into a directory mounted into the container (for example `./data`) and make the file readable by uid 1000. For a `url` source, serve the file with any static web server on your network.

The repository contains one optional, advanced writer for a Claude Code subscription: [`contrib/claude-usage`](../contrib/claude-usage/README.md). It uses the vendor's undocumented endpoints and needs a one-time login on the host; read its README before using it. Writers for other providers are welcome as contributions in `contrib/`.
