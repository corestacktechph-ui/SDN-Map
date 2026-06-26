#!/bin/bash
# =============================================================================
# NAT Configuration Script
# Configures Network Address Translation on the edge router.
# =============================================================================

set -euo pipefail

EDGE_INTERNAL="Router-Edge-eth1"
EDGE_EXTERNAL="Router-Edge-eth0"
INTERNAL_NET="10.0.0.0/8"

log_info()  { echo "[INFO]  $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_ok()    { echo "[OK]    $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

enable_ip_forward() {
    echo 1 > /proc/sys/net/ipv4/ip_forward 2>/dev/null || true
    sysctl -w net.ipv4.ip_forward=1 2>/dev/null || true
    log_ok "IP forwarding enabled"
}

configure_nat() {
    # Masquerade internal traffic to external interface
    iptables -t nat -A POSTROUTING -o "$EDGE_EXTERNAL" -j MASQUERADE 2>/dev/null || true

    # Allow established/related traffic back in
    iptables -A FORWARD -i "$EDGE_EXTERNAL" -o "$EDGE_INTERNAL" \
        -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true

    # Allow outbound traffic from internal
    iptables -A FORWARD -i "$EDGE_INTERNAL" -o "$EDGE_EXTERNAL" -j ACCEPT 2>/dev/null || true

    log_ok "NAT configured: $INTERNAL_NET -> $EDGE_EXTERNAL"
}

configure_firewall() {
    # Default policies
    iptables -P FORWARD DROP 2>/dev/null || true
    iptables -P INPUT DROP 2>/dev/null || true

    # Allow loopback
    iptables -A INPUT -i lo -j ACCEPT 2>/dev/null || true

    # Allow SSH and management
    iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true

    # Allow internal traffic
    iptables -A FORWARD -s "$INTERNAL_NET" -j ACCEPT 2>/dev/null || true

    log_ok "Firewall rules applied"
}

flush_rules() {
    iptables -t nat -F 2>/dev/null || true
    iptables -F 2>/dev/null || true
    log_ok "All NAT/firewall rules flushed"
}

case "${1:-setup}" in
    setup)
        log_info "Configuring NAT..."
        enable_ip_forward
        configure_nat
        configure_firewall
        log_ok "NAT setup complete"
        ;;
    flush)
        flush_rules
        ;;
    status)
        echo "=== NAT Rules ==="
        iptables -t nat -L -n -v 2>/dev/null || echo "Not available"
        echo ""
        echo "=== Forward Rules ==="
        iptables -L FORWARD -n -v 2>/dev/null || echo "Not available"
        echo ""
        echo "=== IP Forward ==="
        cat /proc/sys/net/ipv4/ip_forward 2>/dev/null || echo "unknown"
        ;;
    *)
        echo "Usage: $0 {setup|flush|status}"
        exit 1
        ;;
esac
