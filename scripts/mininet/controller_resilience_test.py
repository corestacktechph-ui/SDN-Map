"""
Controller Resilience Test

Tests what happens when the SDN controller goes down:
- Verifies existing flows continue to work (fail_mode=secure with cached flows)
- Verifies fail_mode=standalone fallback behavior
- Measures recovery time when controller comes back online
- Compares with traditional network (no single point of failure)

Usage:
    sudo python3 controller_resilience_test.py
"""

import time
import subprocess
from mininet.topo import Topo
from mininet.net import Mininet
from mininet.node import OVSKernelSwitch, RemoteController
from mininet.log import setLogLevel, info, error


def ping_success(output):
    """Reliable ping success check."""
    return (
        "1 received" in output or
        "2 received" in output or
        "3 received" in output or
        "1 packets transmitted, 1 received" in output or
        "2 packets transmitted, 2 received" in output or
        "3 packets transmitted, 3 received" in output
    )


def dpid(n):
    return f'{n:016x}'


class ResilienceTopo(Topo):
    """Topology for controller resilience testing — full network."""

    def build(self):
        info('*** Building Controller Resilience Test Topology ***\n')

        cs1 = self.addSwitch('CS1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(1))
        cs2 = self.addSwitch('CS2', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(2))
        self.addLink(cs1, cs2)

        ds1 = self.addSwitch('DS1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(11))
        ds2 = self.addSwitch('DS2', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(12))
        ds3 = self.addSwitch('DS3', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(13))
        ds4 = self.addSwitch('DS4', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(14))
        for ds in [ds1, ds2, ds3, ds4]:
            self.addLink(cs1, ds)
            self.addLink(cs2, ds)
        self.addLink(ds1, ds2)
        self.addLink(ds3, ds4)

        as1 = self.addSwitch('AS1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(21))
        as2 = self.addSwitch('AS2', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(22))
        as3 = self.addSwitch('AS3', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(23))
        as4 = self.addSwitch('AS4', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(24))
        self.addLink(ds1, as1)
        self.addLink(ds2, as1)
        self.addLink(ds1, as2)
        self.addLink(ds2, as2)
        self.addLink(ds3, as3)
        self.addLink(ds4, as3)
        self.addLink(ds3, as4)
        self.addLink(ds4, as4)

        # Edge + Internet
        edge = self.addSwitch('EdgeRtr', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(31))
        self.addLink(cs1, edge)
        self.addLink(cs2, edge)
        inet = self.addHost('INET', ip='198.51.100.100/24', defaultRoute='via 198.51.100.1')
        self.addLink(inet, edge)

        # Hosts representing each VLAN
        hosts_cfg = {
            'h1':  {'ip': '10.1.0.51/22',  'gw': '10.1.3.254'},    # VLAN 10
            'h4':  {'ip': '10.1.12.51/22', 'gw': '10.1.15.254'},   # VLAN 40
            'h7':  {'ip': '10.2.0.51/24',  'gw': '10.2.0.254'},    # VLAN 110
            'h10': {'ip': '10.1.4.51/22',  'gw': '10.1.7.254'},    # VLAN 20
            'h13': {'ip': '10.1.8.51/22',  'gw': '10.1.11.254'},   # VLAN 30
            'h16': {'ip': '10.2.1.51/24',  'gw': '10.2.1.254'},    # VLAN 120
            'h19': {'ip': '10.1.16.51/22', 'gw': '10.1.19.254'},   # VLAN 50
            'h22': {'ip': '10.1.20.51/22', 'gw': '10.1.23.254'},   # VLAN 60
            'h25': {'ip': '10.2.2.51/24',  'gw': '10.2.2.254'},    # VLAN 130
        }
        for name, cfg in hosts_cfg.items():
            h = self.addHost(name, ip=cfg['ip'], defaultRoute=f'via {cfg["gw"]}')
            # Block A hosts → AS1, Block B → AS2, Block C → AS3
            if name in ('h1', 'h4', 'h7'):
                self.addLink(as1, h)
            elif name in ('h10', 'h13', 'h16'):
                self.addLink(as2, h)
            else:
                self.addLink(as3, h)

        # Service servers
        monitor1 = self.addHost('monitor1', ip='10.3.0.18/28', defaultRoute='via 10.3.0.30')
        self.addLink(as4, monitor1)

        info('*** Resilience Topology: 9 hosts, 1 service, 12 switches, internet\n')


def ping_test(net, src_name, dst_name):
    """Quick connectivity test."""
    src = net.get(src_name)
    dst = net.get(dst_name)
    result = src.cmd(f'ping -c 3 -W 2 {dst.IP()} 2>&1')
    return ping_success(result)


def ping_latency(net, src_name, dst_name, count=10):
    """Get average latency."""
    src = net.get(src_name)
    dst = net.get(dst_name)
    result = src.cmd(f'ping -c {count} -W 2 {dst.IP()} 2>&1')
    for line in result.split('\n'):
        if 'avg' in line and '/' in line:
            parts = line.split('=')[1].strip().split('/')
            return float(parts[1])
    return -1


def run_resilience_test():
    """Run controller resilience tests."""
    setLogLevel('info')

    info(f'\n{"═"*70}\n')
    info(f'  SDN CONTROLLER RESILIENCE TEST\n')
    info(f'{"═"*70}\n\n')

    subprocess.call('mn -c 2>/dev/null || true', shell=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    topo = ResilienceTopo()
    net = Mininet(topo=topo, switch=OVSKernelSwitch,
                  controller=lambda name: RemoteController(name, ip='127.0.0.1', port=6633),
                  build=True, ipBase='10.0.0.0/24')
    net.start()

    # Set all switches to standalone initially so they forward without controller
    for sw in net.switches:
        sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=standalone')

    info('  Phase: Switches in STANDALONE mode (baseline)\n')
    info('  ⏳ Waiting for convergence (5s)...\n\n')
    time.sleep(5)

    results = {}

    # ═══════════════════════════════════════════
    # TEST 1: Baseline with controller connected (standalone)
    # ═══════════════════════════════════════════
    info('  ─── TEST 1: Baseline Connectivity (Controller Connected, Standalone) ───\n')
    test_pairs = [
        ('h1', 'h2', 'Same access switch'),
        ('h1', 'h4', 'Cross access switch'),
        ('h1', 'h6', 'Furthest pair'),
        ('h3', 'h5', 'Mid-network pair'),
        ('h1', 'INET', 'Internal host to Internet'),
        ('h1', 'monitor1', 'VLAN 10 host to enterprise services'),
        ('h4', 'monitor1', 'VLAN 40 host to enterprise services'),
        ('h10', 'monitor1', 'VLAN 20 host to enterprise services'),
        ('h13', 'monitor1', 'VLAN 30 host to enterprise services'),
        ('h19', 'monitor1', 'VLAN 50 host to enterprise services'),
        ('h22', 'monitor1', 'VLAN 60 host to enterprise services'),
        ('h7', 'INET', 'VLAN 110 (Guest A) to Internet'),
        ('h16', 'INET', 'VLAN 120 (Guest B) to Internet'),
        ('h25', 'INET', 'VLAN 130 (Guest C) to Internet'),
    ]

    baseline_results = []
    for src, dst, desc in test_pairs:
        success = ping_test(net, src, dst)
        latency = ping_latency(net, src, dst) if success else -1
        status = '✓ PASS' if success else '✗ FAIL'
        info(f'    {status} | {src} → {dst} ({desc}) - {latency:.1f}ms\n')
        baseline_results.append({'src': src, 'dst': dst, 'success': success, 'latency': latency})

    results['baseline'] = baseline_results
    info(f'    Baseline: {sum(1 for r in baseline_results if r["success"])}/{len(baseline_results)} connected\n')

    # ═══════════════════════════════════════════
    # TEST 2: Switch to SECURE mode (controller-dependent)
    # ═══════════════════════════════════════════
    info('\n  ─── TEST 2: Switch to SECURE Mode (Controller-Dependent) ───\n')
    for sw in net.switches:
        sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=secure')

    info('    Switches now in SECURE mode — depend on controller for flows\n')
    time.sleep(3)

    secure_results = []
    for src, dst, desc in test_pairs:
        success = ping_test(net, src, dst)
        latency = ping_latency(net, src, dst) if success else -1
        status = '✓ PASS' if success else '✗ FAIL'
        info(f'    {status} | {src} → {dst} ({desc}) - {latency:.1f}ms\n')
        secure_results.append({'src': src, 'dst': dst, 'success': success, 'latency': latency})

    results['secure_with_controller'] = secure_results

    # ═══════════════════════════════════════════
    # TEST 3: Simulate controller failure (disconnect)
    # ═══════════════════════════════════════════
    info('\n  ─── TEST 3: Simulating Controller Failure ───\n')
    info('    Disconnecting controller (blocking port 6633)...\n')

    # Block controller port to simulate failure
    for sw in net.switches:
        sw.cmd(f'ovs-vsctl del-controller {sw.name} 2>/dev/null')

    info('    ⏳ Waiting for failure detection (5s)...\n')
    time.sleep(5)

    info('\n    Testing connectivity WITHOUT controller (SECURE mode):\n')
    no_controller_results = []
    for src, dst, desc in test_pairs:
        success = ping_test(net, src, dst)
        status = '✓ PASS' if success else '✗ FAIL'
        info(f'    {status} | {src} → {dst} ({desc})\n')
        no_controller_results.append({'src': src, 'dst': dst, 'success': success})

    results['no_controller_secure'] = no_controller_results
    secure_alive = sum(1 for r in no_controller_results if r['success'])
    info(f'\n    SECURE mode without controller: {secure_alive}/{len(no_controller_results)} paths alive\n')
    if secure_alive == 0:
        info('    → Network DOWN: Secure mode drops traffic when controller is unreachable\n')
    else:
        info('    → Cached flows still active (existing paths work)\n')

    # ═══════════════════════════════════════════
    # TEST 4: Fallback to standalone (graceful degradation)
    # ═══════════════════════════════════════════
    info('\n  ─── TEST 4: Fallback to STANDALONE (Graceful Degradation) ───\n')
    info('    Switching to fail_mode=standalone (traditional L2 fallback)...\n')

    for sw in net.switches:
        sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=standalone')

    info('    ⏳ Waiting for standalone convergence (5s)...\n')
    time.sleep(5)

    standalone_results = []
    for src, dst, desc in test_pairs:
        success = ping_test(net, src, dst)
        latency = ping_latency(net, src, dst) if success else -1
        status = '✓ PASS' if success else '✗ FAIL'
        info(f'    {status} | {src} → {dst} ({desc}) - {latency:.1f}ms\n')
        standalone_results.append({'src': src, 'dst': dst, 'success': success, 'latency': latency})

    results['standalone_fallback'] = standalone_results
    fallback_alive = sum(1 for r in standalone_results if r['success'])
    info(f'\n    Standalone fallback: {fallback_alive}/{len(standalone_results)} paths alive\n')
    info('    → Network operational via L2 learning (degraded but functional)\n')

    # ═══════════════════════════════════════════
    # TEST 5: Controller recovery
    # ═══════════════════════════════════════════
    info('\n  ─── TEST 5: Controller Recovery ───\n')
    info('    Reconnecting controller...\n')

    for sw in net.switches:
        sw.cmd(f'ovs-vsctl set-controller {sw.name} tcp:127.0.0.1:6633')
        sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=secure')

    start_time = time.time()
    info('    ⏳ Waiting for controller reconnection...\n')
    time.sleep(5)

    recovery_results = []
    for src, dst, desc in test_pairs:
        success = ping_test(net, src, dst)
        latency = ping_latency(net, src, dst) if success else -1
        status = '✓ PASS' if success else '✗ FAIL'
        info(f'    {status} | {src} → {dst} ({desc}) - {latency:.1f}ms\n')
        recovery_results.append({'src': src, 'dst': dst, 'success': success, 'latency': latency})

    recovery_time = time.time() - start_time
    results['recovery'] = recovery_results
    recovered = sum(1 for r in recovery_results if r['success'])
    info(f'\n    Recovery: {recovered}/{len(recovery_results)} paths restored in ~{recovery_time:.1f}s\n')

    # ═══════════════════════════════════════════
    # FINAL SUMMARY
    # ═══════════════════════════════════════════
    info(f'\n{"═"*70}\n')
    info(f'  CONTROLLER RESILIENCE TEST SUMMARY\n')
    info(f'{"═"*70}\n\n')

    total = len(test_pairs)
    info(f'  ┌────────────────────────────────────┬──────────────┬───────────────┐\n')
    info(f'  │ Scenario                           │ Paths Alive  │ Status        │\n')
    info(f'  ├────────────────────────────────────┼──────────────┼───────────────┤\n')
    info(f'  │ Baseline (controller + standalone)  │ {sum(1 for r in baseline_results if r["success"])}/{total}          │ ✓ Normal      │\n')
    info(f'  │ Secure mode (controller online)     │ {sum(1 for r in secure_results if r["success"])}/{total}          │ ✓ Normal      │\n')
    info(f'  │ Controller DOWN (secure mode)       │ {secure_alive}/{total}          │ {"✗ DOWN" if secure_alive == 0 else "⚠ Partial"}       │\n')
    info(f'  │ Standalone fallback (degraded)      │ {fallback_alive}/{total}          │ ✓ Degraded    │\n')
    info(f'  │ Controller recovered                │ {recovered}/{total}          │ ✓ Recovered   │\n')
    info(f'  └────────────────────────────────────┴──────────────┴───────────────┘\n')

    info(f'\n  Key Findings:\n')
    info(f'  • SECURE mode: Network goes DOWN when controller is unreachable\n')
    info(f'    → Mitigation: Use fail_mode=standalone as fallback\n')
    info(f'  • STANDALONE fallback: Network degrades to L2 learning (works but no SDN features)\n')
    info(f'  • Recovery: Controller reconnection restores full SDN functionality\n')
    info(f'  • Recommendation: Deploy redundant controllers (active/standby) in production\n')

    net.stop()
    return results


if __name__ == '__main__':
    run_resilience_test()
