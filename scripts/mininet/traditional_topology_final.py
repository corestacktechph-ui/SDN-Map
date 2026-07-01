"""
Traditional Hierarchical Network with OSPF + VRRP + ACL Enforcement

Extends traditional_topology_routed3.py by adding iptables-based ACL rules
on distribution routers to enforce service access control:
- erp1: only VLAN 10 (Finance) permitted
- hr1/monitor1: VLANs 10-60 (all corporate) permitted, guests blocked
- it1: only VLAN 30 (IT) and VLAN 40 (Compliance) permitted
- voip1/dhcp1: VLANs 10-60 permitted, guests blocked
- Guest VLANs (110/120/130): internet only, NO internal access

Usage:
    sudo python3 traditional_topology_final.py
    sudo python3 traditional_topology_final.py --no-cli
"""

import argparse
import time
import os
import subprocess
from mininet.topo import Topo
from mininet.net import Mininet
from mininet.node import Node, OVSKernelSwitch
from mininet.cli import CLI
from mininet.log import setLogLevel, info, error
from mininet.link import TCLink

# Import topology and config from routed3
from traditional_topology_routed3 import (
    LinuxRouter, RoutedTraditionalTopo,
    P2P_LINKS, VLAN_SVIS, VRRP_INSTANCES, UPLINK_INTERFACES,
    OSPF_CONFIG, HOST_CONFIG, SERVICE_CONFIG,
    configure_p2p_addresses, configure_vlan_svis,
    configure_vrrp_keepalived, start_ospf,
    configure_edge_routing, ping_success,
)


# ═══════════════════════════════════════════════════════════════
# ACL DEFINITIONS
# ═══════════════════════════════════════════════════════════════

# Corporate VLAN subnets (VLANs 10-60)
CORPORATE_SUBNETS = [
    '10.1.0.0/22',   # VLAN 10 - Finance
    '10.1.4.0/22',   # VLAN 20 - HR
    '10.1.8.0/22',   # VLAN 30 - IT
    '10.1.12.0/22',  # VLAN 40 - Compliance
    '10.1.16.0/22',  # VLAN 50 - Corporate
    '10.1.20.0/22',  # VLAN 60 - Training
]

# Guest VLAN subnets
GUEST_SUBNETS = [
    '10.2.0.0/24',   # VLAN 110 - Guest A
    '10.2.1.0/24',   # VLAN 120 - Guest B
    '10.2.2.0/24',   # VLAN 130 - Guest C
]

# Service ACL rules: (server_ip, allowed_source_subnets)
SERVICE_ACLS = {
    # erp1: only VLAN 10 (Finance) permitted
    '10.3.0.1': {
        'name': 'erp1',
        'allowed': ['10.1.0.0/22'],
    },
    # hr1: VLANs 10-60 permitted
    '10.3.0.17': {
        'name': 'hr1',
        'allowed': CORPORATE_SUBNETS,
    },
    # monitor1: VLANs 10-60 permitted
    '10.3.0.18': {
        'name': 'monitor1',
        'allowed': CORPORATE_SUBNETS,
    },
    # it1: only VLAN 30 (IT) and VLAN 40 (Compliance)
    '10.3.0.33': {
        'name': 'it1',
        'allowed': ['10.1.8.0/22', '10.1.12.0/22'],
    },
    # voip1: VLANs 10-60 permitted
    '10.3.0.49': {
        'name': 'voip1',
        'allowed': CORPORATE_SUBNETS,
    },
    # dhcp1: VLANs 10-60 permitted
    '10.3.0.50': {
        'name': 'dhcp1',
        'allowed': CORPORATE_SUBNETS,
    },
}


# ═══════════════════════════════════════════════════════════════
# ACL ENFORCEMENT VIA IPTABLES
# ═══════════════════════════════════════════════════════════════
def apply_service_acls(net):
    """Apply iptables ACL rules on DS_S1 and DS_S2 for service access control."""
    info('*** Applying Service ACL rules on DS_S1/DS_S2 ***\n')

    for router_name in ['DS_S1', 'DS_S2']:
        router = net.get(router_name)
        if not router:
            continue

        # Flush existing FORWARD rules (keep NAT intact)
        router.cmd('iptables -F FORWARD')

        # Allow established/related connections
        router.cmd('iptables -A FORWARD -m state '
                   '--state ESTABLISHED,RELATED -j ACCEPT')

        # Apply per-service ACLs
        for server_ip, acl in SERVICE_ACLS.items():
            svc_name = acl['name']
            allowed = acl['allowed']

            # ACCEPT from allowed subnets
            for subnet in allowed:
                router.cmd(f'iptables -A FORWARD -s {subnet} '
                           f'-d {server_ip} -j ACCEPT')

            # DROP all other traffic to this service
            router.cmd(f'iptables -A FORWARD -d {server_ip} -j DROP')
            info(f'  {router_name}: {svc_name} ({server_ip}) — '
                 f'{len(allowed)} subnets allowed\n')

        # Allow all other forwarding (non-service traffic)
        router.cmd('iptables -A FORWARD -j ACCEPT')

    info('  Service ACLs applied on DS_S1 and DS_S2\n')


def apply_guest_isolation_acls(net):
    """Apply iptables on user-block distribution routers to isolate guests."""
    info('*** Applying Guest Isolation ACLs on user-block routers ***\n')

    user_block_routers = ['DS_A1', 'DS_A2', 'DS_B1', 'DS_B2',
                          'DS_C1', 'DS_C2']

    for router_name in user_block_routers:
        router = net.get(router_name)
        if not router:
            continue

        # Flush existing FORWARD rules
        router.cmd('iptables -F FORWARD')

        # Allow established/related
        router.cmd('iptables -A FORWARD -m state '
                   '--state ESTABLISHED,RELATED -j ACCEPT')

        # Block guest subnets from reaching internal networks
        for guest_net in GUEST_SUBNETS:
            # Block guest → internal user subnets (10.1.x.x)
            router.cmd(f'iptables -A FORWARD -s {guest_net} '
                       f'-d 10.1.0.0/16 -j DROP')
            # Block guest → service subnets (10.3.x.x)
            router.cmd(f'iptables -A FORWARD -s {guest_net} '
                       f'-d 10.3.0.0/16 -j DROP')

        # Allow guest → internet (198.51.100.0/24 via EDGE NAT)
        for guest_net in GUEST_SUBNETS:
            router.cmd(f'iptables -A FORWARD -s {guest_net} '
                       f'-d 198.51.100.0/24 -j ACCEPT')

        # Allow all other traffic (corporate inter-VLAN)
        router.cmd('iptables -A FORWARD -j ACCEPT')

        info(f'  {router_name}: guest isolation rules applied\n')

    info('  Guest isolation ACLs applied on all user-block routers\n')


def run_acl_diagnostics(net):
    """Run ACL enforcement tests to verify access control."""
    info('\n*** Running ACL Enforcement Diagnostics ***\n')
    info('─' * 60 + '\n')

    tests = [
        # (src, dst_ip, description, should_pass)
        # ERP access
        ('h1',  '10.3.0.1',  'h1 (VLAN 10/Finance) → erp1', True),
        ('h10', '10.3.0.1',  'h10 (VLAN 20/HR) → erp1', False),
        ('h13', '10.3.0.1',  'h13 (VLAN 30/IT) → erp1', False),
        ('h7',  '10.3.0.1',  'h7 (Guest A) → erp1', False),
        # IT service access
        ('h13', '10.3.0.33', 'h13 (VLAN 30/IT) → it1', True),
        ('h4',  '10.3.0.33', 'h4 (VLAN 40/Compliance) → it1', True),
        ('h1',  '10.3.0.33', 'h1 (VLAN 10/Finance) → it1', False),
        ('h10', '10.3.0.33', 'h10 (VLAN 20/HR) → it1', False),
        ('h7',  '10.3.0.33', 'h7 (Guest A) → it1', False),
        # HR service access
        ('h10', '10.3.0.17', 'h10 (VLAN 20/HR) → hr1', True),
        ('h1',  '10.3.0.17', 'h1 (VLAN 10/Finance) → hr1', True),
        ('h19', '10.3.0.17', 'h19 (VLAN 50/Corporate) → hr1', True),
        ('h7',  '10.3.0.17', 'h7 (Guest A) → hr1', False),
        # VoIP access
        ('h19', '10.3.0.49', 'h19 (VLAN 50/Corporate) → voip1', True),
        ('h7',  '10.3.0.49', 'h7 (Guest A) → voip1', False),
        # Guest isolation
        ('h7',  '10.1.0.51', 'h7 (Guest A) → h1 (internal)', False),
        ('h16', '10.1.8.51', 'h16 (Guest B) → h13 (internal)', False),
        # Guest internet (should work)
        ('h7',  '198.51.100.100', 'h7 (Guest A) → INET', True),
        # Corporate inter-VLAN (should work)
        ('h1',  '10.1.4.51', 'h1 (VLAN 10) → h10 (VLAN 20)', True),
        ('h13', '10.1.16.51', 'h13 (VLAN 30) → h19 (VLAN 50)', True),
    ]

    passed = 0
    failed = 0
    for src, dst_ip, desc, should_pass in tests:
        h_src = net.get(src)
        if not h_src:
            info(f'  ? {desc} — source not found\n')
            continue

        result = h_src.cmd(f'ping -c 1 -W 2 {dst_ip} 2>&1')
        actual_pass = ping_success(result)

        if actual_pass == should_pass:
            status = '✓ PASS'
            passed += 1
        else:
            status = '✗ FAIL'
            failed += 1

        expected = 'ALLOW' if should_pass else 'BLOCK'
        actual = 'reachable' if actual_pass else 'blocked'
        info(f'  {status} | {desc} | expected:{expected} actual:{actual}\n')

    info('─' * 60 + '\n')
    info(f'  ACL Results: {passed} passed, {failed} failed '
         f'(total {passed + failed})\n')
    return passed, failed


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
def run(start_cli=True):
    """Start the full traditional network with OSPF + VRRP + ACLs."""
    setLogLevel('info')

    # Clean previous
    subprocess.call('mn -c 2>/dev/null || true', shell=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.call('pkill -f keepalived 2>/dev/null || true', shell=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    info('\n' + '═' * 70 + '\n')
    info('  TRADITIONAL NETWORK — FINAL (OSPF + VRRP + ACL Enforcement)\n')
    info('═' * 70 + '\n\n')

    topo = RoutedTraditionalTopo()
    net = Mininet(topo=topo, controller=None, link=TCLink)
    net.start()

    # Step 1: Assign /30 P2P addresses
    configure_p2p_addresses(net)

    # Step 2: Configure VLAN SVIs on distribution
    configure_vlan_svis(net)

    # Step 3: Configure edge routing + NAT
    configure_edge_routing(net)

    # Step 4: Start OSPF on all routers
    start_ospf(net)

    # Step 5: Start keepalived VRRP
    time.sleep(5)
    configure_vrrp_keepalived(net)

    # Wait for OSPF convergence
    info('\n*** Waiting for OSPF convergence (30 seconds)...\n')
    time.sleep(30)

    # Step 6: Apply ACL rules (after routing converges)
    info('\n')
    apply_service_acls(net)
    apply_guest_isolation_acls(net)

    # Step 7: Run ACL diagnostics
    run_acl_diagnostics(net)

    info('\n*** Traditional Network FINAL ready ***\n')
    info('  OSPF: 11 routers with full mesh routing\n')
    info('  VRRP: 13 per-VLAN VIPs (keepalived)\n')
    info('  ACLs: Service access control + guest isolation\n')
    info('\n  Useful commands:\n')
    info('    DS_S1 iptables -L FORWARD -n -v  (service ACLs)\n')
    info('    DS_A1 iptables -L FORWARD -n -v  (guest isolation)\n')
    info('    h1 ping 10.3.0.1   (Finance → ERP: should work)\n')
    info('    h10 ping 10.3.0.1  (HR → ERP: should be blocked)\n')
    info('    h7 ping 10.1.0.51  (Guest → internal: blocked)\n')
    info('    h7 ping 198.51.100.100  (Guest → internet: works)\n')

    # Notify web dashboard that simulation is running — update device statuses
    try:
        import sys as _sys
        import os as _os
        _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
        from post_results import post_device_status, post_alert, TRADITIONAL_DEVICES
        post_device_status("TRADITIONAL", TRADITIONAL_DEVICES, status="ONLINE")
        post_alert(
            title="Traditional Network Simulation Started",
            message="traditional_topology_final.py is running — OSPF + VRRP + ACL enforcement active. All 14 switches and 6 servers online.",
            severity="INFO",
            source="mininet"
        )
    except Exception:
        pass  # Dashboard update optional — simulation continues regardless

    if start_cli:
        CLI(net)

    # Notify web dashboard that simulation stopped
    try:
        from post_results import reset_devices, post_alert
        reset_devices("TRADITIONAL")
        post_alert(
            title="Traditional Network Simulation Stopped",
            message="traditional_topology_final.py has exited. All devices set to OFFLINE.",
            severity="INFO",
            source="mininet"
        )
    except Exception:
        pass

    net.stop()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Traditional Network FINAL (OSPF + VRRP + ACL)')
    parser.add_argument('--no-cli', action='store_true',
                        help='Run without interactive CLI')
    args = parser.parse_args()
    run(start_cli=not args.no_cli)
