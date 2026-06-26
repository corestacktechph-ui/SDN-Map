#!/bin/bash
# =============================================================================
# VRRP Health Check Script - Core Layer
# Checks core switch health for VRRP state decisions.
# Returns 0 (healthy) or 1 (unhealthy).
# =============================================================================

set -euo pipefail

LOG_FILE="/tmp/vrrp_health_core.log"

log_check() {
    local status="$1"
    local msg="$2"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$status] $msg" >> "$LOG_FILE"
}

check_core_health() {
    local failures=0
    local total_checks=4

    # Check 1: Basic system health
    if [ -f /proc/uptime ]; then
        log_check "OK" "System is up"
    else
        log_check "FAIL" "System health check failed"
        failures=$((failures + 1))
    fi

    # Check 2: OVS switch daemon
    if command -v ovs-vsctl &>/dev/null && ovs-vsctl show &>/dev/null; then
        log_check "OK" "OVS daemon is running"
    else
        log_check "FAIL" "OVS daemon is not responding"
        failures=$((failures + 1))
    fi

    # Check 3: Interface link state (at least one interface up)
    local link_up=0
    for iface in /sys/class/net/*/carrier; do
        if [ -f "$iface" ] && [ "$(cat "$iface")" = "1" ]; then
            link_up=$((link_up + 1))
        fi
    done
    if [ "$link_up" -ge 2 ]; then
        log_check "OK" "Links up: $link_up"
    else
        log_check "FAIL" "Insufficient links up: $link_up"
        failures=$((failures + 1))
    fi

    # Check 4: Memory pressure
    if [ -f /proc/meminfo ]; then
        local mem_free
        mem_free=$(awk '/MemFree/ {print $2}' /proc/meminfo)
        if [ "${mem_free:-0}" -lt 1024 ]; then
            log_check "FAIL" "Critically low memory: ${mem_free}kB"
            failures=$((failures + 1))
        fi
    fi

    if [ "$failures" -eq 0 ]; then
        log_check "PASS" "All health checks passed ($total_checks/$total_checks)"
        return 0
    else
        log_check "DEGRADED" "Failed $failures/$total_checks health checks"
        return 1
    fi
}

check_core_health
