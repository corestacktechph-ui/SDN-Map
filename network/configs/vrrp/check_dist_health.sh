#!/bin/bash
# =============================================================================
# VRRP Health Check Script - Distribution Layer
# Checks distribution switch health for VRRP state decisions.
# Returns 0 (healthy) or 1 (unhealthy).
# =============================================================================

set -euo pipefail

LOG_FILE="/tmp/vrrp_health_dist.log"

log_check() {
    local status="$1"
    local msg="$2"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$status] $msg" >> "$LOG_FILE"
}

check_dist_health() {
    local failures=0
    local total_checks=3

    # Check 1: OVS reachability
    if command -v ovs-vsctl &>/dev/null && ovs-vsctl show &>/dev/null 2>&1; then
        log_check "OK" "OVS is reachable"
    else
        log_check "FAIL" "OVS is not responding"
        failures=$((failures + 1))
    fi

    # Check 2: Core layer reachability
    if ping -c 1 -W 1 10.0.255.1 &>/dev/null; then
        log_check "OK" "Core layer is reachable"
    else
        log_check "FAIL" "Core layer is not reachable"
        failures=$((failures + 1))
    fi

    # Check 3: Local interfaces
    local link_up=0
    for iface in /sys/class/net/*/carrier; do
        if [ -f "$iface" ] && [ "$(cat "$iface")" = "1" ]; then
            link_up=$((link_up + 1))
        fi
    done
    if [ "$link_up" -ge 1 ]; then
        log_check "OK" "Links up: $link_up"
    else
        log_check "FAIL" "No active links"
        failures=$((failures + 1))
    fi

    if [ "$failures" -eq 0 ]; then
        log_check "PASS" "All health checks passed ($total_checks/$total_checks)"
        return 0
    else
        log_check "DEGRADED" "Failed $failures/$total_checks health checks"
        return 1
    fi
}

check_dist_health
