# SMART report format

The Storage page can show the health of your physical disks. Orbis Homelab does not talk to disks: it reads a **JSON report** that something else produces, from a file or a URL. Any script, in any language, on any machine, can write it; Orbis Homelab only defines the format.

```yaml
# config.yaml
sources:
  storage:
    smart:
      type: report-json
      file: /data/smart-report.json # or: url: http://nas:8080/smart-report.json
      disks:
        disk1: /mnt/disk1 # label in the report -> mount point of its filesystem
```

Use `file` for something written on the Docker host into the directory you mount at `/data` (or any other mount), or `url` for a report served by another host. `disks` is optional: it links each disk to a volume so that its usage is shown next to its SMART data (the mount point must be one reported by the [system provider](configuration.md#sourcessystem)).

## Format

A single JSON object. Every field is optional on input, but a missing field is shown as unknown, never as healthy.

| Field                    | Type                              | Meaning                                                                                                                                                   |
| ------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`                 | `"OK"`, `"WARNING"`, `"CRITICAL"` | Overall result. Anything else (or a missing value) is treated as `OK`: always write it                                                                    |
| `checked_at`             | ISO-8601 timestamp                | When the report was produced. A report older than `alerts.thresholds.smartStaleSeconds` (45 minutes by default) is stale; a missing value counts as stale |
| `temperature_warn_c`     | number                            | Warning temperature in °C, used to rate disk temperatures in the interface. Default `50`                                                                  |
| `temperature_critical_c` | number                            | Critical temperature in °C. Default `55`                                                                                                                  |
| `disks`                  | array of disk objects             | One entry per disk                                                                                                                                        |

Disk object:

| Field            | Type                                    | Meaning                                                                                          |
| ---------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `label`          | string                                  | Name of the disk; the key used by `smart.disks` in `config.yaml`                                 |
| `device`         | string                                  | Device node, for example `/dev/sda`                                                              |
| `model`          | string                                  | Model name                                                                                       |
| `serial`         | string                                  | Serial number. Only the **last four characters** are shown and the rest never leaves the backend |
| `smart`          | `"PASSED"`, `"FAILED"`, `"UNAVAILABLE"` | SMART overall health. Anything else is shown as unavailable                                      |
| `temperature_c`  | number or `null`                        | Current temperature in °C                                                                        |
| `reallocated`    | integer                                 | Reallocated sector count (SMART attribute 5)                                                     |
| `pending`        | integer                                 | Pending sector count (attribute 197)                                                             |
| `uncorrectable`  | integer                                 | Offline uncorrectable count (attribute 198)                                                      |
| `power_on_hours` | integer or `null`                       | Power-on time in hours                                                                           |
| `smart_errors`   | integer                                 | Entries in the SMART error log                                                                   |
| `status`         | `"OK"`, `"WARNING"`, `"CRITICAL"`       | Verdict for this disk, decided by your script. Anything else is treated as `OK`                  |
| `message`        | string                                  | Short reason for a non-OK status, shown to the user                                              |

Orbis Homelab raises an alert for every disk whose `status` is not `OK`, for a stale report and for a report that cannot be read. The thresholds that decide `OK`, `WARNING` and `CRITICAL` are yours to define in the script.

### Historical uncorrectable sectors

After a completed repair, attribute 198 can keep a non-zero value as history. If a disk has `uncorrectable > 0`, `pending` = 0, `smart` = `"PASSED"`, `smart_errors` = 0 and a `message` containing the words `offline-uncorrectable historical`, Orbis Homelab treats the counter as historical: the disk is shown as OK with a note, and a report whose only warnings are of this kind is shown as OK. Without that explicit message the counter is a normal warning.

## Example

```json
{
  "status": "WARNING",
  "checked_at": "2026-01-08T10:15:00+00:00",
  "temperature_warn_c": 50,
  "temperature_critical_c": 55,
  "disks": [
    {
      "label": "disk1",
      "device": "/dev/sda",
      "model": "Example Disk 4TB",
      "serial": "EX0000000001",
      "smart": "PASSED",
      "temperature_c": 36,
      "reallocated": 0,
      "pending": 0,
      "uncorrectable": 0,
      "power_on_hours": 12345,
      "smart_errors": 0,
      "status": "OK",
      "message": ""
    },
    {
      "label": "disk2",
      "device": "/dev/sdb",
      "model": "Example Disk 4TB",
      "serial": "EX0000000002",
      "smart": "PASSED",
      "temperature_c": 52,
      "reallocated": 8,
      "pending": 0,
      "uncorrectable": 0,
      "power_on_hours": 40210,
      "smart_errors": 0,
      "status": "WARNING",
      "message": "reallocated sectors present"
    }
  ]
}
```

## Producing the report

[`contrib/smart-report/smart-report.sh`](../contrib/smart-report/smart-report.sh) is a small reference implementation based on [smartmontools](https://www.smartmontools.org/) (7.0 or newer, for `smartctl -j`) and `jq`. It needs root to read the disks, so run it on the host, not in the Orbis Homelab container:

```sh
sudo ./smart-report.sh /path/to/orbis-homelab/data/smart-report.json disk1=/dev/sda disk2=/dev/sdb
```

Schedule it more often than the stale threshold, for example every 15 minutes (`/etc/cron.d/orbis-homelab-smart`):

```cron
*/15 * * * * root /usr/local/bin/smart-report.sh /path/to/orbis-homelab/data/smart-report.json disk1=/dev/sda disk2=/dev/sdb
```

The script writes the file atomically and uses `smartctl -n standby,0`, so it never wakes a sleeping disk (a sleeping disk reports `UNAVAILABLE` for that run). Adapt the rules to your hardware: SATA behind a USB bridge may need `-d sat`, NVMe drives report different attributes, and vendors differ in what attribute 5, 197 and 198 mean. If you run something else (a NAS vendor's tool, a Prometheus exporter, a different language), it is enough to emit the JSON above.

The file is read by the Orbis Homelab container as uid 1000: make sure it is world-readable (`chmod 644`) or owned by that user.
