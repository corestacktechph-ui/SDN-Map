#!/bin/bash
# =============================================================================
# VRRP Notify Script - Master State
# Called when a VRRP instance transitions to MASTER state.
# Records the transition and updates PID file.
# =============================================================================

set -euo pipefail

LOG_FILE="/tmp/vrrp_notify.log"
STATE_DIR="/tmp/vrrp_states"
PID_DIR="/var/run"

log_event() {
    local msg="$(date '+%Y-%m-%d %H:%M:%S') - MASTER - $1 - $2"
    echo "$msg" >> "$LOG_FILE"
    echo "$msg"
}

notify_master() {
    local instance_name="$1"
    local virtual_ip="$2"
    local priority="$3"

    mkdir -p "$STATE_DIR" "$PID_DIR"

    log_event "$instance_name" "Transitioned to MASTER (priority: $priority, VIP: $virtual_ip)"

    # Write or update PID file for this VRRP instance
    local pid_file="${PID_DIR}/keepalived_${instance_name,,}.pid"
    echo "$$" > "$pid_file"
    log_event "$instance_name" "PID file updated: $pid_file -> $$"

    # Update state file
    local state_file="${STATE_DIR}/${instance_name,,}_state.json"
    cat > "$state_file" <<EOF
{
  "instance": "$instance_name",
  "state": "MASTER",
  "virtual_ip": "$virtual_ip",
  "priority": $priority,
  "pid": $$,
  "timestamp": "$(date -Iseconds)"
}
EOF
    log_event "$instance_name" "State file updated: $state_file"

    # Attempt to add virtual IP if not present
    if [ -n "$virtual_ip" ]; then
        local interface
        interface=$(ip route get "$virtual_ip" 2>/dev/null | head -1 | awk '{print $5}' || echo "eth0")
        ip addr add "$virtual_ip/24" dev "$interface" 2>/dev/null || true
        log_event "$instance_name" "Virtual IP $virtual_ip configured on $interface"
    fi
}

case "${1:-}" in
    master)
        notify_master "${2:-unknown}" "${3:-}" "${4:-100}"
        ;;
    *)
        echo "Usage: $0 master <instance_name> [virtual_ip] [priority]"
        exit 1
        ;;
esac
