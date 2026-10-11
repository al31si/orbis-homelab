# Backup and restore

An instance is three things. Back up all of them; the image can always be pulled again.

| What           | Contains                                        | Why it matters                                      |
| -------------- | ----------------------------------------------- | --------------------------------------------------- |
| `config/`      | `config.yaml`, `services.yaml`, `branding/`     | Your whole setup                                    |
| `.env`         | Secrets (API keys, tokens)                      | Not recoverable from anywhere else but the services |
| `data/`        | Alert state, Web Push keys and subscriptions    | See below                                           |
| `extensions/`  | Extensions you installed (if any)               | Your own code                                       |
| `compose.yaml` | Your Compose file, with any network attachments | Reaching the monitored services                     |

Treat the backup like a password store: `.env` and `data/` contain secrets. Keep file permissions (`tar` preserves them) and store the archive encrypted or on a protected volume.

## Back up

Configuration is read at startup and `data/` is small, so a running instance can be copied:

```sh
cd /path/to/orbis-homelab
tar czf orbis-homelab-backup-$(date +%F).tar.gz compose.yaml config .env data extensions 2>/dev/null
```

`extensions` is omitted from the list when you do not use any (remove it from the command to avoid the warning).

For a perfectly consistent copy of `data/`, stop the container first (`docker compose stop`) and start it again afterwards.

## Restore

1. On the new host, install Docker and create the directory.
2. Unpack the backup there, preserving permissions:

   ```sh
   tar xzf orbis-homelab-backup-YYYY-MM-DD.tar.gz
   sudo chown -R 1000:1000 data
   chmod 600 .env
   ```

3. Start it: `docker compose up -d`.
4. Check `docker compose ps` and the Diagnostics page.

If the new host uses other Docker network names or addresses, adjust `compose.yaml` (networks) and the URLs in `config/` accordingly. A rebuilt instance needs no other step: there is no database to migrate.

## What happens to push notifications

Web Push uses a VAPID key pair generated on the first start with push enabled. It is stored in `data/vapid.json` (the private key is a secret) and the device subscriptions in `data/push.json`. Every device subscription is bound to the **public key** of that pair.

- **Restore `data/`**: the keys and the subscriptions come back; devices keep receiving notifications.
- **Lose `data/` (or restore without it)**: a new key pair is generated. The subscriptions of your devices were made with the old public key, so push services reject deliveries to them: each device must open the app and turn notifications off and on again in Settings.
- **Moving to a new HTTPS address**: subscriptions belong to the origin of the app. Devices must open the new address (iOS: install the app again) and re-subscribe, whatever the backup.

The alert history in `data/` also resets if it is lost: the app starts with an empty event log and raises current problems as new alerts.

## Test your backup

Restoring into a scratch directory with a different published port (`'3200:3100'`) and opening it is a five-minute test. Do it once.
