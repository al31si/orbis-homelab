#!/usr/bin/env bash
# Writes an Orbis Homelab SMART report. Needs smartmontools 7+ (smartctl -j) and jq; run as root.
# Usage: smart-report.sh /path/to/data/smart-report.json label=/dev/sdX [label=/dev/sdY ...]
set -u

OUTPUT=$1
shift
TEMP_WARN=50
TEMP_CRIT=55

disks='[]'
overall=OK
for spec in "$@"; do
  label=${spec%%=*}
  device=${spec#*=}
  # -n standby,0 never wakes a sleeping disk (the reading is then UNAVAILABLE).
  data=$(smartctl -n standby,0 -j -i -H -A -l error "$device" 2>/dev/null || true)
  [ -n "$data" ] || data='{}'

  disk=$(jq -c --arg label "$label" --arg device "$device" \
    --argjson warn "$TEMP_WARN" --argjson crit "$TEMP_CRIT" '
    def attr($id): ([.ata_smart_attributes.table[]? | select(.id == $id)][0].raw.value // 0);
    {
      label: $label,
      device: $device,
      model: (.model_name // .model_family // "N/A"),
      serial: (.serial_number // ""),
      smart: (if .smart_status.passed == true then "PASSED"
              elif .smart_status.passed == false then "FAILED" else "UNAVAILABLE" end),
      temperature_c: (.temperature.current // null),
      reallocated: attr(5),
      pending: attr(197),
      uncorrectable: attr(198),
      power_on_hours: (.power_on_time.hours // null),
      smart_errors: (.ata_smart_error_log.summary.count // 0)
    }
    | . + (
        if .smart != "PASSED" then {status: "CRITICAL", message: "SMART health: \(.smart)"}
        elif .pending > 0 then {status: "CRITICAL", message: "pending sectors"}
        elif .temperature_c != null and .temperature_c >= $crit then {status: "CRITICAL", message: "temperature too high"}
        elif .uncorrectable > 0 or .reallocated > 0 then {status: "WARNING", message: "reallocated or uncorrectable sectors"}
        elif .temperature_c != null and .temperature_c >= $warn then {status: "WARNING", message: "temperature high"}
        else {status: "OK", message: ""} end)
  ' <<<"$data")

  disks=$(jq -c --argjson disk "$disk" '. + [$disk]' <<<"$disks")
done

report=$(jq -c --arg checked_at "$(date -Iseconds)" \
  --argjson warn "$TEMP_WARN" --argjson crit "$TEMP_CRIT" '
  {
    status: (if any(.[]; .status == "CRITICAL") then "CRITICAL"
             elif any(.[]; .status == "WARNING") then "WARNING" else "OK" end),
    checked_at: $checked_at,
    temperature_warn_c: $warn,
    temperature_critical_c: $crit,
    disks: .
  }' <<<"$disks")

# Write atomically: Orbis Homelab never sees a half-written file.
printf '%s\n' "$report" | jq . >"$OUTPUT.tmp" && mv "$OUTPUT.tmp" "$OUTPUT"
