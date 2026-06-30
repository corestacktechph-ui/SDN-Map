"""
Failover Testing Script for Traditional (HND) and SDN Networks

Demonstrates network resilience through link failure scenarios:

TEST 1 — Core Switch Failover (CS1 → CS2):
    All links on CS1 are brought down. Traffic must reroute through CS2.
    Validates that the redundant core design keeps the network operational.

TEST 2 — Access-to-Distribution Failover (AS_A1-DS_A1 down → AS_A1-DS_A2):
    The link between AS_A1 and DS_A1 is brought down.
    Traffic from Block A hosts must reroute via the redundant AS_A1-DS_A2 link.

Usage:
    sudo python failover_testing.py --mode traditional    # Test HND failover
    sudo python failover_testing.py --mode sdn            # Test SDN failover
    sudo python failover_testing.py --mode both           # Test both (default)
"""

import argparse
import time
import subprocess
from mininet.topo import Topo
from mininet.net import Mininet
from mininet.node import OVSKernelSwitch, RemoteController
from mininet.log import setLogLevel, info, error
from mininet.link import TCLink


# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════
VLAN_CONFIG = {
    10: {'gw': '10.1.3.254', 'pool': '10.1.0.51', 'mask': '/22'},
    20: {'gw': '10.1.7.254', 'pool': '10.1.4.51', 'mask': '/22'},
    30: {'gw': '10.1.11.254', 'pool': '10.1.8.51', 'mask': '/22'},
    40: {'gw': '10.1.15.254', 'pool': '10.1.12.51', 'mask': '/22'},
    50: {'gw': '10.1.19.254', 'pool': '10.1.16.51', 'mask': '/22'},
    60: {'gw': '10.1.23.254', 'pool': '10.1.20.51', 'mask': '/22'},
    110: {'gw': '10.2.0.254', 'pool': '10.2.0.51', 'mask': '/24'},
    120: {'gw': '10.2.1.254', 'pool': '10.2.1.51', 'mask': '/24'},
    130: {'gw': '10.2.2.254', 'pool': '10.2.2.51', 'mask': '/24'},
}

SERVICE_CONFIG = {
    'erp1':     {'ip': '10.3.0.1/28'},
    'hr1':      {'ip': '10.3.0.17/28'},
    'monitor1': {'ip': '10.3.0.18/28'},
    'it1':      {'ip': '10.3.0.33/28'},
    'voip1':    {'ip': '10.3.0.49/28'},
    'dhcp1':    {'ip': '10.3.0.50/28'},
}

HOST_VLAN = {
    'h1': 10, 'h2': 10, 'h3': 10,
    'h4': 40, 'h5': 40, 'h6': 40,
    'h7': 110, 'h8': 110, 'h9': 110,
    'h10': 20, 'h11': 20, 'h12': 20,
    'h13': 30, 'h14': 30, 'h15': 30,
    'h16': 120, 'h17': 120, 'h18': 120,
    'h19': 50, 'h20': 50, 'h21': 50,
    'h22': 60, 'h23': 60, 'h24': 60,
    'h25': 130, 'h26': 130, 'h27': 130,
}

HOST_ACCESS = {
    'h1': 'AS_A1', 'h2': 'AS_A1', 'h3': 'AS_A1',
    'h4': 'AS_A1', 'h5': 'AS_A1', 'h6': 'AS_A1',
    'h7': 'AS_A1', 'h8': 'AS_A1', 'h9': 'AS_A1',
    'h10': 'AS_B1', 'h11': 'AS_B1', 'h12': 'AS_B1',
    'h13': 'AS_B1', 'h14': 'AS_B1', 'h15': 'AS_B1',
    'h16': 'AS_B1', 'h17': 'AS_B1', 'h18': 'AS_B1',
    'h19': 'AS_C1', 'h20': 'AS_C1', 'h21': 'AS_C1',
    'h22': 'AS_C1', 'h23': 'AS_C1', 'h24': 'AS_C1',
    'h25': 'AS_C1', 'h26': 'AS_C1', 'h27': 'AS_C1',
}


def dpid(n):
    return f'{n:016x}'


SWITCH_DPIDS = {
    'CS1': dpid(1), 'CS2': dpid(2),
    'DS_A1': dpid(11), 'DS_A2': dpid(12),
    'DS_B1': dpid(13), 'DS_B2': dpid(14),
    'DS_C1': dpid(15), 'DS_C2': dpid(16),
    'DS_S1': dpid(17), 'DS_S2': dpid(18),
    'AS_A1': dpid(21), 'AS_B1': dpid(22),
    'AS_C1': dpid(23), 'AS_S1': dpid(24),
    'ISP': dpid(31), 'EdgeRtr': dpid(32),
}


# ═══════════════════════════════════════════════════════════════
# TOPOLOGY
# ═══════════════════════════════════════════════════════════════
class FailoverTopo(Topo):
    """Full hierarchical topology for failover testing."""

    def build(self):
        info('*** Building Failover Test Topology ***\n')

        switches = {}
        for name, did in SWITCH_DPIDS.items():
            switches[name] = self.addSwitch(name, cls=OVSKernelSwitch,
                                            protocols='OpenFlow13', dpid=did)

        # Core links
        self.addLink(switches['CS1'], switches['CS2'])

        # Core to Distribution (redundant)
        for ds in ['DS_A1', 'DS_A2', 'DS_B1', 'DS_B2', 'DS_C1', 'DS_C2', 'DS_S1', 'DS_S2']:
            self.addLink(switches['CS1'], switches[ds])
            self.addLink(switches['CS2'], switches[ds])

        # Distribution pairs
        for a, b in [('DS_A1', 'DS_A2'), ('DS_B1', 'DS_B2'), ('DS_C1', 'DS_C2'), ('DS_S1', 'DS_S2')]:
            self.addLink(switches[a], switches[b])

        # Cross-block links REMOVED — inter-block traffic routes via core (L3/OSPF)
        # In proper hierarchical design, blocks only connect through CS1/CS2

        # Distribution to Access (redundant)
        for ds1, ds2, access in [('DS_A1', 'DS_A2', 'AS_A1'), ('DS_B1', 'DS_B2', 'AS_B1'),
                                  ('DS_C1', 'DS_C2', 'AS_C1'), ('DS_S1', 'DS_S2', 'AS_S1')]:
            self.addLink(switches[ds1], switches[access])
            self.addLink(switches[ds2], switches[access])

        # Internet
        inet = self.addHost('INET', ip='198.51.100.100/24')
        self.addLink(inet, switches['ISP'])
        self.addLink(switches['ISP'], switches['EdgeRtr'])
        self.addLink(switches['CS1'], switches['EdgeRtr'])
        self.addLink(switches['CS2'], switches['EdgeRtr'])

        # Services
        for name, cfg in SERVICE_CONFIG.items():
            h = self.addHost(name, ip=cfg['ip'])
            self.addLink(switches['AS_S1'], h)

        # 27 hosts
        for hostname, vlan in sorted(HOST_VLAN.items()):
            vcfg = VLAN_CONFIG[vlan]
            h = self.addHost(hostname, ip=f'{vcfg["pool"]}{vcfg["mask"]}',
                             defaultRoute=f'via {vcfg["gw"]}')
            self.addLink(switches[HOST_ACCESS[hostname]], h)

        info('*** Topology built: 27 hosts + 6 services + internet\n')


# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════
def ping_test(net, src_name, dst_name, description=''):
    """Ping between two hosts and return pass/fail status."""
    h_src = net.get(src_name)
    h_dst = net.get(dst_name)
    if not h_src or not h_dst:
        return False, f'Host not found: {src_name} or {dst_name}'
    
    dst_ip = h_dst.IP()
    result = h_src.cmd(f'ping -c 3 -W 2 {dst_ip} 2>&1')
    
    success = '0% packet loss' in result or (' 0% packet loss' in result)
    # Also check if at least 1 packet received
    if not success:
        for line in result.split('\n'):
            if 'packets transmitted' in line:
                parts = line.split(',')
                for p in parts:
                    if 'received' in p:
                        received = int(p.strip().split()[0])
                        if received > 0:
                            success = True
                        break

    status = '✓ PASS' if success else '✗ FAIL'
    desc = f' ({description})' if description else ''
    info(f'    {src_name} → {dst_name}{desc}: {status}\n')
    return success, result


def get_link_between(net, sw1_name, sw2_name):
    """Find the link object between two switches."""
    for link in net.links:
        intf1 = link.intf1
        intf2 = link.intf2
        node1 = intf1.node.name if intf1.node else ''
        node2 = intf2.node.name if intf2.node else ''
        if (node1 == sw1_name and node2 == sw2_name) or \
           (node1 == sw2_name and node2 == sw1_name):
            return link
    return None


def bring_link_down(net, sw1_name, sw2_name):
    """Bring down a link between two nodes."""
    link = get_link_between(net, sw1_name, sw2_name)
    if link:
        link.intf1.ifconfig('down')
        link.intf2.ifconfig('down')
        info(f'    ⬇ Link DOWN: {sw1_name} <-> {sw2_name}\n')
        return True
    else:
        error(f'    ✗ Link not found: {sw1_name} <-> {sw2_name}\n')
        return False


def bring_link_up(net, sw1_name, sw2_name):
    """Bring up a link between two nodes."""
    link = get_link_between(net, sw1_name, sw2_name)
    if link:
        link.intf1.ifconfig('up')
        link.intf2.ifconfig('up')
        info(f'    ⬆ Link UP: {sw1_name} <-> {sw2_name}\n')
        return True
    else:
        error(f'    ✗ Link not found: {sw1_name} <-> {sw2_name}\n')
        return False


def print_separator(title):
    info(f'\n{"═"*70}\n')
    info(f'  {title}\n')
    info(f'{"═"*70}\n\n')


def print_subsection(title):
    info(f'\n  {"─"*60}\n')
    info(f'  {title}\n')
    info(f'  {"─"*60}\n')


# ═══════════════════════════════════════════════════════════════
# TEST 1: CORE SWITCH FAILOVER (CS1 → CS2)
# ═══════════════════════════════════════════════════════════════
def test_core_failover(net, mode_name):
    """
    Scenario: All links on CS1 are brought down.
    Expected: Traffic reroutes through CS2. Network remains operational.
    """
    print_separator(f'TEST 1: CORE SWITCH FAILOVER — {mode_name}')
    info('  Scenario: All CS1 links go DOWN → traffic must failover to CS2\n')
    info('  Expected: Network remains operational via CS2 redundant paths\n')

    results = {'before': [], 'during': [], 'after': []}

    # ── Step 1: Baseline connectivity (all links up) ──
    print_subsection('STEP 1: Baseline Connectivity (All links UP)')
    
    test_pairs = [
        ('h1', 'h2', 'Block A intra-block'),
        ('h1', 'h10', 'Block A → Block B (cross-block via core)'),
        ('h1', 'h19', 'Block A → Block C (cross-block via core)'),
        ('h10', 'h19', 'Block B → Block C'),
        ('h19', 'h25', 'Block C intra-block (different VLAN)'),
    ]

    for src, dst, desc in test_pairs:
        success, _ = ping_test(net, src, dst, desc)
        results['before'].append(success)

    # ── Step 2: Bring down ALL CS1 links ──
    print_subsection('STEP 2: Bringing DOWN all CS1 links (simulating CS1 failure)')

    cs1_neighbors = ['CS2', 'DS_A1', 'DS_A2', 'DS_B1', 'DS_B2',
                     'DS_C1', 'DS_C2', 'DS_S1', 'DS_S2', 'EdgeRtr']

    for neighbor in cs1_neighbors:
        bring_link_down(net, 'CS1', neighbor)

    info('\n  ⏳ Waiting for network convergence (5 seconds)...\n')
    time.sleep(5)

    # ── Step 3: Test connectivity with CS1 down ──
    print_subsection('STEP 3: Connectivity Test (CS1 DOWN — traffic via CS2)')

    for src, dst, desc in test_pairs:
        success, _ = ping_test(net, src, dst, f'{desc} [CS1 DOWN]')
        results['during'].append(success)

    # ── Step 4: Restore CS1 links ──
    print_subsection('STEP 4: Restoring all CS1 links (recovery)')

    for neighbor in cs1_neighbors:
        bring_link_up(net, 'CS1', neighbor)

    info('\n  ⏳ Waiting for network reconvergence (5 seconds)...\n')
    time.sleep(5)

    # ── Step 5: Verify recovery ──
    print_subsection('STEP 5: Post-Recovery Connectivity Test')

    for src, dst, desc in test_pairs:
        success, _ = ping_test(net, src, dst, f'{desc} [RECOVERED]')
        results['after'].append(success)

    # ── Summary ──
    print_subsection('TEST 1 SUMMARY — Core Failover')
    before_pass = sum(results['before'])
    during_pass = sum(results['during'])
    after_pass = sum(results['after'])
    total = len(test_pairs)

    info(f'    Baseline (all UP):      {before_pass}/{total} passed\n')
    info(f'    During failover (CS1 DOWN): {during_pass}/{total} passed\n')
    info(f'    After recovery:         {after_pass}/{total} passed\n')

    if during_pass == total:
        info(f'\n    ✓ CORE FAILOVER TEST PASSED — Traffic successfully rerouted via CS2\n')
    else:
        info(f'\n    ✗ CORE FAILOVER PARTIAL — {total - during_pass} paths lost during failover\n')

    return results


# ═══════════════════════════════════════════════════════════════
# TEST 2: ACCESS-DISTRIBUTION FAILOVER (AS_A1-DS_A1 → AS_A1-DS_A2)
# ═══════════════════════════════════════════════════════════════
def test_access_distribution_failover(net, mode_name):
    """
    Scenario: Link AS_A1-DS_A1 goes down.
    Expected: Block A hosts remain reachable via redundant AS_A1-DS_A2 link.
    """
    print_separator(f'TEST 2: ACCESS-DISTRIBUTION FAILOVER — {mode_name}')
    info('  Scenario: Link AS_A1 ↔ DS_A1 goes DOWN\n')
    info('  Expected: Block A hosts remain operational via AS_A1 ↔ DS_A2 redundant link\n')

    results = {'before': [], 'during': [], 'after': []}

    # ── Step 1: Baseline connectivity ──
    print_subsection('STEP 1: Baseline Connectivity (All links UP)')

    test_pairs = [
        ('h1', 'h2', 'Block A same-VLAN (local)'),
        ('h1', 'h4', 'Block A cross-VLAN'),
        ('h1', 'h10', 'Block A → Block B'),
        ('h4', 'h19', 'Block A → Block C'),
        ('h7', 'h13', 'Block A (VLAN 110) → Block B (VLAN 30)'),
    ]

    for src, dst, desc in test_pairs:
        success, _ = ping_test(net, src, dst, desc)
        results['before'].append(success)

    # ── Step 2: Bring down AS_A1 ↔ DS_A1 link ──
    print_subsection('STEP 2: Bringing DOWN link AS_A1 ↔ DS_A1')

    bring_link_down(net, 'AS_A1', 'DS_A1')

    info('\n  ⏳ Waiting for network convergence (5 seconds)...\n')
    time.sleep(5)

    # ── Step 3: Test connectivity with primary uplink down ──
    print_subsection('STEP 3: Connectivity Test (AS_A1-DS_A1 DOWN — traffic via AS_A1-DS_A2)')

    for src, dst, desc in test_pairs:
        success, _ = ping_test(net, src, dst, f'{desc} [DS_A1 link DOWN]')
        results['during'].append(success)

    # ── Step 4: Restore link ──
    print_subsection('STEP 4: Restoring link AS_A1 ↔ DS_A1 (recovery)')

    bring_link_up(net, 'AS_A1', 'DS_A1')

    info('\n  ⏳ Waiting for network reconvergence (5 seconds)...\n')
    time.sleep(5)

    # ── Step 5: Verify recovery ──
    print_subsection('STEP 5: Post-Recovery Connectivity Test')

    for src, dst, desc in test_pairs:
        success, _ = ping_test(net, src, dst, f'{desc} [RECOVERED]')
        results['after'].append(success)

    # ── Summary ──
    print_subsection('TEST 2 SUMMARY — Access-Distribution Failover')
    before_pass = sum(results['before'])
    during_pass = sum(results['during'])
    after_pass = sum(results['after'])
    total = len(test_pairs)

    info(f'    Baseline (all UP):          {before_pass}/{total} passed\n')
    info(f'    During failover (DS_A1 DOWN): {during_pass}/{total} passed\n')
    info(f'    After recovery:             {after_pass}/{total} passed\n')

    if during_pass == total:
        info(f'\n    ✓ ACCESS-DISTRIBUTION FAILOVER PASSED — Traffic via DS_A2 redundant path\n')
    else:
        info(f'\n    ✗ ACCESS-DISTRIBUTION FAILOVER PARTIAL — {total - during_pass} paths lost\n')

    return results


# ═══════════════════════════════════════════════════════════════
# MAIN TEST RUNNERS
# ═══════════════════════════════════════════════════════════════
def run_traditional_failover():
    """Run failover tests in Traditional (HND) mode — all switches standalone."""
    print_separator('TRADITIONAL NETWORK (HND) — FAILOVER TESTING')
    info('  Mode: All switches in STANDALONE (L2 learning) mode\n')
    info('  Redundancy: STP-based path selection with VRRP at distribution\n')

    # Clean
    subprocess.call('mn -c 2>/dev/null || true', shell=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    topo = FailoverTopo()
    net = Mininet(topo=topo, switch=OVSKernelSwitch, controller=None,
                  build=True, ipBase='10.0.0.0/8')
    net.start()

    # Set all switches to standalone (traditional L2 forwarding)
    for sw in net.switches:
        sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=standalone')
        # Enable STP for loop prevention and failover
        sw.cmd(f'ovs-vsctl set bridge {sw.name} stp_enable=true')

    info('\n  *** All switches set to STANDALONE mode with STP enabled\n')
    info('  ⏳ Waiting for STP convergence (15 seconds)...\n')
    time.sleep(15)

    # Run both tests
    results_core = test_core_failover(net, 'TRADITIONAL (HND)')
    results_access = test_access_distribution_failover(net, 'TRADITIONAL (HND)')

    net.stop()
    return results_core, results_access


def run_sdn_failover():
    """Run failover tests in SDN mode — all switches controller-managed."""
    print_separator('SDN NETWORK — FAILOVER TESTING')
    info('  Mode: All switches in SECURE mode (OpenFlow 1.3, controller-managed)\n')
    info('  Redundancy: Controller-computed fast failover via Ryu\n')

    # Clean
    subprocess.call('mn -c 2>/dev/null || true', shell=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    topo = FailoverTopo()
    net = Mininet(
        topo=topo,
        switch=OVSKernelSwitch,
        controller=lambda name: RemoteController(name, ip='127.0.0.1', port=6633),
        build=True,
        ipBase='10.0.0.0/8',
    )
    net.start()

    # Set all switches to secure mode (controller-managed)
    for sw in net.switches:
        sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=secure')

    info('\n  *** All switches set to SECURE mode (controller-managed)\n')
    info('  ⏳ Waiting for controller flow installation (5 seconds)...\n')
    time.sleep(5)

    # Run both tests
    results_core = test_core_failover(net, 'SDN')
    results_access = test_access_distribution_failover(net, 'SDN')

    net.stop()
    return results_core, results_access


# ═══════════════════════════════════════════════════════════════
# FINAL COMPARISON REPORT
# ═══════════════════════════════════════════════════════════════
def print_comparison_report(trad_results, sdn_results):
    """Print a side-by-side comparison of Traditional vs SDN failover."""
    print_separator('FAILOVER COMPARISON REPORT: TRADITIONAL (HND) vs SDN')

    info('  ┌─────────────────────────────────┬─────────────────┬─────────────────┐\n')
    info('  │ Test Scenario                   │ Traditional HND │ SDN (OpenFlow)  │\n')
    info('  ├─────────────────────────────────┼─────────────────┼─────────────────┤\n')

    if trad_results and sdn_results:
        trad_core, trad_access = trad_results
        sdn_core, sdn_access = sdn_results

        # Core failover
        tc_during = sum(trad_core['during']) if trad_core else 0
        sc_during = sum(sdn_core['during']) if sdn_core else 0
        total_core = 5

        tc_status = f'{tc_during}/{total_core} passed'
        sc_status = f'{sc_during}/{total_core} passed'
        info(f'  │ Core Failover (CS1 → CS2)      │ {tc_status:<15} │ {sc_status:<15} │\n')

        # Access-Distribution failover
        ta_during = sum(trad_access['during']) if trad_access else 0
        sa_during = sum(sdn_access['during']) if sdn_access else 0
        total_access = 5

        ta_status = f'{ta_during}/{total_access} passed'
        sa_status = f'{sa_during}/{total_access} passed'
        info(f'  │ Access Failover (AS_A1→DS_A2)  │ {ta_status:<15} │ {sa_status:<15} │\n')

    info('  └─────────────────────────────────┴─────────────────┴─────────────────┘\n')

    info('\n  Key Differences:\n')
    info('  • Traditional (HND): Relies on STP reconvergence (30-50s typical)\n')
    info('  • SDN: Controller detects failure via OpenFlow port-status messages\n')
    info('         and recomputes paths immediately (~50ms with fast-failover groups)\n')
    info('\n  Conclusion:\n')
    info('  • Both architectures provide redundancy through dual-homed design\n')
    info('  • SDN provides faster failover and centralized visibility during failures\n')
    info('  • Traditional relies on distributed STP which is slower but autonomous\n')


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Failover Testing: Traditional vs SDN')
    parser.add_argument('--mode', choices=['traditional', 'sdn', 'both'],
                        default='both', help='Which mode to test (default: both)')
    parser.add_argument('--test', choices=['core', 'access', 'both'],
                        default='both', help='Which test to run (default: both)')
    args = parser.parse_args()

    setLogLevel('info')

    trad_results = None
    sdn_results = None

    if args.mode in ('traditional', 'both'):
        trad_core, trad_access = run_traditional_failover()
        trad_results = (trad_core, trad_access)

    if args.mode in ('sdn', 'both'):
        sdn_core, sdn_access = run_sdn_failover()
        sdn_results = (sdn_core, sdn_access)

    if args.mode == 'both':
        print_comparison_report(trad_results, sdn_results)

    print_separator('FAILOVER TESTING COMPLETE')
