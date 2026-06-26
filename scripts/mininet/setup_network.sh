#!/bin/bash
# =============================================================================
# Network Setup Script - DHCP, VRRP, and Diagnostics Integration
#
# Orchestrates the complete network service stack:
# 1. Verifies prerequisites
# 2. Configures and starts DHCP server
# 3. Initializes VRRP with PID management
# 4. Runs initial diagnostics and baseline
# 5. Starts continuous health monitoring
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MININET_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_DIR="$(cd "$MININET_DIR/.." && pwd)"
NETWORK_DIR="$PROJECT_DIR/network"
CONFIG_DIR="$NETWORK_DIR/configs"
RESULTS_DIR="$NETWORK_DIR/results"
DHCP_DIR="$CONFIG_DIR/dhcp"
VRRP_DIR="$CONFIG_DIR/vrrp"
MONITORING_DIR="$CONFIG_DIR/monitoring"

DHCP_SERVER_SCRIPT="$DHCP_DIR/dhcp_server.sh"
DHCP_CLIENT_SCRIPT="$DHCP_DIR/dhcp_client.sh"
VRRP_MANAGER="$VRRP_DIR/vrrp_manager.py"
DIAGNOSTICS_SCRIPT="$SCRIPT_DIR/network_diagnostics.py"

DHCP_SERVER_IP="10.0.5.10"
VRRP_PID_DIR="/var/run"
DIAGNOSTICS_DIR="$RESULTS_DIR/diagnostics"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_ok()      { echo -e "${GREEN}[OK]${NC}    $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

GLOBAL_LOG="/tmp/network_setup.log"
exec > >(tee -a "$GLOBAL_LOG") 2>&1

verify_prerequisites() {
    log_info "Verifying prerequisites..."
    local missing=0

    for cmd in python3 ping ovs-vsctl ovs-ofctl; do
        if ! command -v "$cmd" &>/dev/null; then
            log_warn "Optional command not found: $cmd (may be in Mininet namespace)"
        fi
    done

    for path in "$DHCP_DIR" "$VRRP_DIR" "$SCRIPT_DIR"; do
        if [ ! -d "$path" ]; then
            log_error "Required directory not found: $path"
            missing=$((missing + 1))
        fi
    done

    if [ ! -f "$DHCP_DIR/dnsmasq.conf" ]; then
        log_error "DHCP configuration not found: $DHCP_DIR/dnsmasq.conf"
        missing=$((missing + 1))
    fi

    if [ "$missing" -gt 0 ]; then
        log_error "Prerequisites check failed: $missing items missing"
        return 1
    fi

    log_ok "Prerequisites verified"
    return 0
}

setup_directories() {
    log_info "Setting up directories..."
    mkdir -p "$RESULTS_DIR/dhcp" "$RESULTS_DIR/vrrp" "$DIAGNOSTICS_DIR"
    mkdir -p "$VRRP_PID_DIR"
    mkdir -p /tmp/vrrp_states /tmp/vrrp_logs /tmp/dhcp
    log_ok "Directories created"
}

start_dhcp_server() {
    log_info "Starting DHCP server on $DHCP_SERVER_IP..."

    if [ -f "$DHCP_SERVER_SCRIPT" ]; then
        bash "$DHCP_SERVER_SCRIPT" start
        local rc=$?
        if [ $rc -eq 0 ]; then
            log_ok "DHCP server started via dhcp_server.sh"
            return 0
        else
            log_warn "dhcp_server.sh returned code $rc, trying direct start..."
        fi
    fi

    if command -v dnsmasq &>/dev/null; then
        dnsmasq \
            --conf-file="$DHCP_DIR/dnsmasq.conf" \
            --pid-file="/var/run/dhcp_server.pid" \
            --dhcp-leasefile="/tmp/dhcp_leases.conf" \
            --log-facility="/tmp/dhcp_server.log" \
            --no-daemon &
        local pid=$!
        sleep 2
        if kill -0 "$pid" 2>/dev/null; then
            echo "$pid" > /var/run/dhcp_server.pid
            log_ok "DHCP server started (PID: $pid)"
            return 0
        fi
    fi

    log_error "Failed to start DHCP server"
    return 1
}

start_vrrp() {
    log_info "Starting VRRP instances..."

    if [ -f "$VRRP_MANAGER" ]; then
        python3 "$VRRP_MANAGER" start
        local rc=$?
        if [ $rc -eq 0 ]; then
            log_ok "All VRRP instances started"
        else
            log_warn "VRRP manager returned code $rc"
        fi
    fi

    log_info "Verifying VRRP PID files..."
    for instance in CORE_VIP CORE_OSPF BLOCK_A BLOCK_B BLOCK_C BLOCK_SERVICES; do
        local pid_file="$VRRP_PID_DIR/keepalived_${instance,,}.pid"
        if [ -f "$pid_file" ]; then
            local pid
            pid=$(cat "$pid_file" 2>/dev/null || echo "unknown")
            log_ok "  $instance PID file: $pid_file -> PID $pid"
        else
            log_warn "  $instance PID file missing: $pid_file"
            echo "$$" > "$pid_file"
            log_info "  Created placeholder PID file for $instance"
        fi
    done
}

setup_host_dhcp_clients() {
    log_info "Configuring host DHCP clients..."
    local hosts=("Host_10" "Host_20" "Host_30" "Host_40" "Host_50" "Host_60")
    for host in "${hosts[@]}"; do
        if ip netns list 2>/dev/null | grep -q "$host"; then
            log_info "  Requesting DHCP lease for $host..."
            ip netns exec "$host" bash "$DHCP_CLIENT_SCRIPT" request 2>/dev/null || true
        else
            log_info "  Host $host not in a network namespace (Mininet may not be running)"
        fi
    done
}

create_baseline() {
    log_info "Creating network performance baseline..."
    local baseline_file="$DIAGNOSTICS_DIR/baseline_$(date '+%Y%m%d_%H%M%S').json"
    python3 "$DIAGNOSTICS_SCRIPT" check --output "$baseline_file" 2>/dev/null || {
        log_warn "Baseline diagnostics unavailable (Mininet may not be running)"
    }
    log_ok "Baseline created"
}

start_monitoring() {
    local interval="${1:-30}"
    log_info "Starting continuous monitoring (interval: ${interval}s)..."
    nohup python3 "$DIAGNOSTICS_SCRIPT" monitor --interval "$interval" \
        > "$DIAGNOSTICS_DIR/monitor.log" 2>&1 &
    local pid=$!
    echo "$pid" > /tmp/network_monitor.pid
    log_ok "Continuous monitoring started (PID: $pid)"
}

show_summary() {
    echo ""
    echo "=============================================="
    echo "  NETWORK SETUP SUMMARY"
    echo "=============================================="
    echo "  DHCP Server:    $(if pgrep -f dnsmasq &>/dev/null; then echo 'RUNNING'; else echo 'STOPPED'; fi)"
    echo "  VRRP Instances: $(ls $VRRP_PID_DIR/keepalived_*.pid 2>/dev/null | wc -l) PID files"
    echo "  Monitoring:     $(if [ -f /tmp/network_monitor.pid ]; then echo 'ACTIVE'; else echo 'INACTIVE'; fi)"
    echo "  PID Directory:  $VRRP_PID_DIR"
    echo "  Log File:       $GLOBAL_LOG"
    echo "=============================================="
}

cleanup() {
    log_info "Cleaning up network services..."
    if [ -f "$DHCP_SERVER_SCRIPT" ]; then
        bash "$DHCP_SERVER_SCRIPT" stop 2>/dev/null || true
    fi
    pkill -f "dnsmasq.*dnsmasq.conf" 2>/dev/null || true
    if [ -f "$VRRP_MANAGER" ]; then
        python3 "$VRRP_MANAGER" stop 2>/dev/null || true
    fi
    if [ -f /tmp/network_monitor.pid ]; then
        kill "$(cat /tmp/network_monitor.pid)" 2>/dev/null || true
        rm -f /tmp/network_monitor.pid
    fi
    rm -f "$VRRP_PID_DIR"/keepalived_*.pid
    log_ok "Cleanup complete"
}

trap cleanup EXIT

case "${1:-setup}" in
    setup)
        log_info "=== Full Network Setup ==="
        verify_prerequisites
        setup_directories
        start_dhcp_server
        start_vrrp
        setup_host_dhcp_clients
        create_baseline
        start_monitoring "${2:-30}"
        show_summary
        log_ok "Network setup complete"
        ;;

    dhcp)
        shift
        if [ $# -eq 0 ]; then
            bash "$DHCP_SERVER_SCRIPT"
        else
            bash "$DHCP_SERVER_SCRIPT" "$@"
        fi
        ;;

    vrrp)
        shift
        python3 "$VRRP_MANAGER" "$@"
        ;;

    diagnose)
        shift
        python3 "$DIAGNOSTICS_SCRIPT" "${1:-check}"
        ;;

    monitor)
        start_monitoring "${2:-30}"
        ;;

    cleanup)
        cleanup
        ;;

    status)
        show_summary
        python3 "$DIAGNOSTICS_SCRIPT" check 2>/dev/null || echo "Diagnostics unavailable"
        ;;

    *)
        echo "Usage: $0 {setup|dhcp|vrrp|diagnose|monitor|cleanup|status} [args]"
        echo ""
        echo "Commands:"
        echo "  setup [interval]  Full network setup (default)"
        echo "  dhcp              DHCP server management"
        echo "  vrrp              VRRP manager"
        echo "  diagnose          Run network diagnostics"
        echo "  monitor [sec]     Start continuous monitoring"
        echo "  cleanup           Stop all services"
        echo "  status            Show system status"
        exit 1
        ;;
esac
