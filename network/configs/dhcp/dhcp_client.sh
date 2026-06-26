#!/bin/bash
# =============================================================================
# DHCP Client Manager
# Manages DHCP client configuration on Mininet hosts.
# Provides reliable IP acquisition with fallback and retry logic.
# =============================================================================

set -euo pipefail

LEASE_FILE="/tmp/dhcp_client_leases"
STATUS_FILE="/tmp/dhcp_client_status"
PID_FILE="/tmp/dhcp_client.pid"
LOG_FILE="/tmp/dhcp_client.log"

RETRY_COUNT=5
RETRY_DELAY=3
DHCP_TIMEOUT=10

log_info()  { echo "[INFO]  $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"; }
log_ok()    { echo "[OK]    $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"; }
log_warn()  { echo "[WARN]  $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"; }
log_error() { echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"; }

release_interface() {
    local iface="$1"
    if command -v dhclient &>/dev/null; then
        dhclient -r "$iface" 2>/dev/null || true
    fi
    if command -v udhcpc &>/dev/null; then
        pkill -f "udhcpc.*$iface" 2>/dev/null || true
    fi
    ip addr flush dev "$iface" 2>/dev/null || true
    log_info "Released IP on $iface"
}

acquire_dhcp_dhclient() {
    local iface="$1"
    local timeout="$2"
    timeout "$timeout" dhclient -v -1 -q "$iface" 2>&1 | tail -5 >> "$LOG_FILE"
    return ${PIPESTATUS[0]}
}

acquire_dhcp_udhcpc() {
    local iface="$1"
    local timeout="$2"
    timeout "$timeout" udhcpc -i "$iface" -f -q -n 2>&1 | tail -5 >> "$LOG_FILE"
    return ${PIPESTATUS[0]}
}

acquire_dhcp_busybox() {
    local iface="$1"
    local timeout="$2"
    timeout "$timeout" udhcpc -i "$iface" -n 2>&1 | tail -3 >> "$LOG_FILE"
    return ${PIPESTATUS[0]}
}

get_ip_address() {
    local iface="$1"
    ip -4 addr show "$iface" 2>/dev/null | grep -oP 'inet \K[\d.]+' || echo ""
}

request_ip() {
    local iface="${1:-eth0}"
    local dhcp_server="${2:-10.0.5.10}"

    log_info "Requesting IP on $iface from DHCP server $dhcp_server..."

    release_interface "$iface"

    local success=0
    for attempt in $(seq 1 "$RETRY_COUNT"); do
        log_info "DHCP attempt $attempt/$RETRY_COUNT on $iface..."

        if command -v dhclient &>/dev/null; then
            acquire_dhcp_dhclient "$iface" "$DHCP_TIMEOUT" && { success=1; break; }
        elif command -v udhcpc &>/dev/null; then
            acquire_dhcp_udhcpc "$iface" "$DHCP_TIMEOUT" && { success=1; break; }
        else
            log_error "No DHCP client found (dhclient or udhcpc required)"
            return 1
        fi

        if [ "$attempt" -lt "$RETRY_COUNT" ]; then
            log_warn "DHCP attempt $attempt failed, retrying in ${RETRY_DELAY}s..."
            sleep "$RETRY_DELAY"
        fi
    done

    if [ "$success" -eq 1 ]; then
        local ip
        ip=$(get_ip_address "$iface")
        if [ -n "$ip" ]; then
            log_ok "DHCP successful: $iface -> $ip"
            echo "$(date '+%Y-%m-%d %H:%M:%S') $iface $ip" >> "$LEASE_FILE"
            echo "$ip" > "$STATUS_FILE"
            return 0
        fi
    fi

    log_error "DHCP failed after $RETRY_COUNT attempts on $iface"
    return 1
}

renew_lease() {
    local iface="${1:-eth0}"
    log_info "Renewing DHCP lease on $iface..."
    if command -v dhclient &>/dev/null; then
        dhclient -v -1 -r "$iface" 2>/dev/null || true
        dhclient -v -1 -q "$iface" 2>&1 | tail -3 >> "$LOG_FILE"
    else
        request_ip "$iface"
    fi
    local ip
    ip=$(get_ip_address "$iface")
    log_info "Renewed IP: ${ip:-failed}"
}

release_ip() {
    local iface="${1:-eth0}"
    log_info "Releasing IP on $iface..."
    release_interface "$iface"
    log_ok "IP released on $iface"
}

status_client() {
    local iface="${1:-eth0}"
    echo ""
    echo "=============================================="
    echo "  DHCP Client Status"
    echo "=============================================="
    local ip
    ip=$(get_ip_address "$iface")
    if [ -n "$ip" ]; then
        echo "  Interface:    $iface"
        echo "  IP Address:   $ip"
        echo "  DHCP Server:  10.0.5.10"
        echo "  Status:       ACTIVE"

        local gateway
        gateway=$(ip route | grep default | grep "$iface" | awk '{print $3}' || echo "none")
        echo "  Gateway:      $gateway"

        local dns
        dns=$(grep "nameserver" /etc/resolv.conf 2>/dev/null | awk '{print $2}' | tr '\n' ' ' || echo "none")
        echo "  DNS:          $dns"
    else
        echo "  Interface:    $iface"
        echo "  IP Address:   NONE"
        echo -e "  Status:       INACTIVE"
    fi
    echo "=============================================="
}

verify_connectivity() {
    local gateway="${1:-10.0.5.1}"
    local target="${2:-10.0.5.10}"

    log_info "Verifying network connectivity..."
    local failures=0

    if ping -c 2 -W 1 "$gateway" &>/dev/null; then
        log_ok "Gateway $gateway is reachable"
    else
        log_error "Gateway $gateway is NOT reachable"
        failures=$((failures + 1))
    fi

    if ping -c 2 -W 1 "$target" &>/dev/null; then
        log_ok "DHCP server $target is reachable"
    else
        log_error "DHCP server $target is NOT reachable"
        failures=$((failures + 1))
    fi

    if [ "$failures" -eq 0 ]; then
        log_ok "Connectivity verified"
        return 0
    else
        log_warn "Connectivity issues detected"
        return 1
    fi
}

case "${1:-status}" in
    request)
        request_ip "${2:-eth0}" "${3:-10.0.5.10}"
        ;;
    renew)
        renew_lease "${2:-eth0}"
        ;;
    release)
        release_ip "${2:-eth0}"
        ;;
    status)
        status_client "${2:-eth0}"
        ;;
    verify)
        verify_connectivity "${2:-10.0.5.1}" "${3:-10.0.5.10}"
        ;;
    *)
        echo "Usage: $0 {request|renew|release|status|verify} [interface]"
        exit 1
        ;;
esac
