#!/bin/bash
# =============================================================================
# DHCP Server Manager
# Manages the dnsmasq DHCP server lifecycle within Mininet topology.
# Features: start, stop, restart, status, lease monitoring, health checks
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/dnsmasq.conf"
LEASE_FILE="/tmp/dhcp_leases.conf"
PID_FILE="/tmp/dhcp_server.pid"
LOG_FILE="/tmp/dhcp_server.log"
HEALTH_LOG="/tmp/dhcp_health.log"
BACKUP_DIR="${SCRIPT_DIR}/backups"

DHCP_SERVER_IP="10.0.5.10"
DHCP_SERVER_HOST="DHCP-Server"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

check_prerequisites() {
    local missing=0
    for cmd in dnsmasq pgrep pkill; do
        if ! command -v "$cmd" &>/dev/null; then
            log_error "Required command not found: $cmd"
            missing=1
        fi
    done
    if [ "$missing" -eq 1 ]; then
        log_error "Install missing dependencies and retry."
        exit 1
    fi
}

check_dhcp_server() {
    local pid
    if [ -f "$PID_FILE" ]; then
        pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            echo "$pid"
            return 0
        fi
    fi
    pid=$(pgrep -f "dnsmasq.*${CONFIG_FILE}" 2>/dev/null || true)
    if [ -n "$pid" ]; then
        echo "$pid" > "$PID_FILE"
        log_info "Recovered PID $pid from process table"
        echo "$pid"
        return 0
    fi
    return 1
}

validate_config() {
    log_info "Validating DHCP configuration..."
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        return 1
    fi
    dnsmasq --test --conf-file="$CONFIG_FILE" 2>>"$LOG_FILE"
    if [ $? -eq 0 ]; then
        log_ok "DHCP configuration is valid"
        return 0
    else
        log_error "DHCP configuration validation failed"
        return 1
    fi
}

start_dhcp() {
    log_info "Starting DHCP server on $DHCP_SERVER_HOST..."

    if check_dhcp_server > /dev/null; then
        log_warn "DHCP server is already running (PID: $(cat "$PID_FILE"))"
        return 0
    fi

    validate_config || return 1

    mkdir -p "$BACKUP_DIR"

    dnsmasq \
        --conf-file="$CONFIG_FILE" \
        --pid-file="$PID_FILE" \
        --log-facility="$LOG_FILE" \
        --dhcp-leasefile="$LEASE_FILE" \
        --no-daemon &

    local pid=$!
    sleep 2

    if kill -0 "$pid" 2>/dev/null; then
        echo "$pid" > "$PID_FILE"
        log_ok "DHCP server started (PID: $pid)"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Started PID $pid" >> "$HEALTH_LOG"
        return 0
    else
        log_error "Failed to start DHCP server"
        tail -5 "$LOG_FILE"
        return 1
    fi
}

stop_dhcp() {
    log_info "Stopping DHCP server..."

    local pid
    if pid=$(check_dhcp_server); then
        kill "$pid" 2>/dev/null || true
        sleep 1
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
        log_ok "DHCP server stopped (was PID: $pid)"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Stopped" >> "$HEALTH_LOG"
    else
        log_warn "DHCP server is not running"
    fi
}

restart_dhcp() {
    log_info "Restarting DHCP server..."
    stop_dhcp
    sleep 1
    start_dhcp
}

status_dhcp() {
    echo ""
    echo "=============================================="
    echo "  DHCP Server Status"
    echo "=============================================="

    if pid=$(check_dhcp_server); then
        echo -e "  Status:       ${GREEN}Running${NC}"
        echo "  PID:          $pid"
        echo "  Config:       $CONFIG_FILE"
        echo "  Lease File:   $LEASE_FILE"
        echo "  Log File:     $LOG_FILE"

        local uptime
        if [ -f "$PID_FILE" ]; then
            uptime=$(ps -o etime= -p "$pid" 2>/dev/null || echo "unknown")
            echo "  Uptime:       $uptime"
        fi

        local lease_count=0
        if [ -f "$LEASE_FILE" ]; then
            lease_count=$(grep -c "^[0-9]" "$LEASE_FILE" 2>/dev/null || echo "0")
        fi
        echo "  Active Leases: $lease_count"
    else
        echo -e "  Status:       ${RED}Stopped${NC}"
    fi
    echo "=============================================="
}

show_leases() {
    echo ""
    echo "=============================================="
    echo "  DHCP Lease Table"
    echo "=============================================="
    if [ -f "$LEASE_FILE" ]; then
        printf "%-20s %-18s %-20s %s\n" "Hostname" "IP Address" "MAC Address" "Expires"
        echo "----------------------------------------------------------------"
        while IFS= read -r line; do
            local expiry=$(echo "$line" | awk '{print $1}')
            local mac=$(echo "$line" | awk '{print $2}')
            local ip=$(echo "$line" | awk '{print $3}')
            local hostname=$(echo "$line" | awk '{print $4}')
            if [ -n "$ip" ]; then
                printf "%-20s %-18s %-20s %s\n" "$hostname" "$ip" "$mac" "$expiry"
            fi
        done < "$LEASE_FILE"
    else
        log_warn "No lease file found"
    fi
    echo "=============================================="
}

health_check() {
    log_info "Running DHCP health check..."
    local issues=0

    if ! check_dhcp_server > /dev/null; then
        log_error "DHCP server process is not running"
        issues=$((issues + 1))
        log_info "Attempting automatic recovery..."
        start_dhcp
        sleep 2
    fi

    if [ ! -f "$LEASE_FILE" ]; then
        log_warn "Lease file does not exist (normal if no leases assigned yet)"
    fi

    if ping -c 1 -W 1 "$DHCP_SERVER_IP" &>/dev/null; then
        log_ok "DHCP server is reachable at $DHCP_SERVER_IP"
    else
        log_error "DHCP server is NOT reachable at $DHCP_SERVER_IP"
        issues=$((issues + 1))
    fi

    if dnsmasq --test --conf-file="$CONFIG_FILE" &>/dev/null; then
        log_ok "Configuration is valid"
    else
        log_error "Configuration has errors"
        issues=$((issues + 1))
    fi

    echo "$(date '+%Y-%m-%d %H:%M:%S') - Health check: $issues issues found" >> "$HEALTH_LOG"

    if [ "$issues" -eq 0 ]; then
        log_ok "DHCP health check passed"
        return 0
    else
        log_warn "DHCP health check found $issues issue(s)"
        return 1
    fi
}

backup_config() {
    mkdir -p "$BACKUP_DIR"
    local backup_file="${BACKUP_DIR}/dnsmasq.conf.$(date '+%Y%m%d%H%M%S')"
    cp "$CONFIG_FILE" "$backup_file"
    log_ok "Configuration backed up to $backup_file"
}

monitor_loop() {
    log_info "Starting DHCP monitoring loop (interval: ${1:-30}s)..."
    local interval=${1:-30}
    while true; do
        if ! check_dhcp_server > /dev/null; then
            log_warn "DHCP server died! Attempting restart..."
            start_dhcp
        fi
        sleep "$interval"
    done
}

case "${1:-status}" in
    start)
        start_dhcp
        ;;
    stop)
        stop_dhcp
        ;;
    restart)
        restart_dhcp
        ;;
    status)
        status_dhcp
        ;;
    leases)
        show_leases
        ;;
    health)
        health_check
        ;;
    validate)
        validate_config
        ;;
    backup)
        backup_config
        ;;
    monitor)
        monitor_loop "${2:-30}"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|leases|health|validate|backup|monitor}"
        exit 1
        ;;
esac
