"""
Connectivity Validation Test — Host-to-Host, Host-to-Internet, Host-to-Service (ACL)

Complete connectivity validation for both Traditional and SDN architectures.
Tests all three required connectivity categories with ACL enforcement.

Usage:
    sudo python3 connectivity_validation_test.py --mode traditional
    sudo python3 connectivity_validation_test.py --mode sdn
    sudo python3 connectivity_validation_test.py --mode both
"""

import argparse
import time
import subprocess
from mininet.topo import Topo
from mininet.net import Mininet
from mininet.node import OVSKernelSwitch, RemoteController
from mininet.log import setLogLevel, info, error


def ping_success(output):
    return ("1 received" in output or "2 received" in output or "3 received" in output)


def dpid(n):
    return f'{n:016x}'


VLAN_CONFIG = {
    10: {'gw': '10.1.3.254', 'pool': '10.1.0.', 'mask': '/22', 'name': 'Finance'},
    20: {'gw': '10.1.7.254', 'pool': '10.1.4.', 'mask': '/22', 'name': 'HR'},
    30: {'gw': '10.1.11.254', 'pool': '10.1.8.', 'mask': '/22', 'name': 'IT'},
    40: {'gw': '10.1.15.254', 'pool': '10.1.12.', 'mask': '/22', 'name': 'Compliance'},
    50: {'gw': '10.1.19.254', 'pool': '10.1.16.', 'mask': '/22', 'name': 'Corporate'},
    60: {'gw': '10.1.23.254', 'pool': '10.1.20.', 'mask': '/22', 'name': 'Training'},
    110: {'gw': '10.2.0.254', 'pool': '10.2.0.', 'mask': '/24', 'name': 'Guest A'},
    120: {'gw': '10.2.1.254', 'pool': '10.2.1.', 'mask': '/24', 'name': 'Guest B'},
    130: {'gw': '10.2.2.254', 'pool': '10.2.2.', 'mask': '/24', 'name': 'Guest C'},
}

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

SERVICE_CONFIG = {
    'erp1': {'ip': '10.3.0.1/28', 'name': 'ERP Server'},
    'hr1': {'ip': '10.3.0.17/28', 'name': 'HR Server'},
    'monitor1': {'ip': '10.3.0.18/28', 'name': 'Monitoring Server'},
    'it1': {'ip': '10.3.0.33/28', 'name': 'IT Server'},
    'voip1': {'ip': '10.3.0.49/28', 'name': 'VoIP Server'},
    'dhcp1': {'ip': '10.3.0.50/28', 'name': 'DHCP Server'},
}


class ConnectivityTopo(Topo):
    def build(self):
        switches = {}
        for name, did in SWITCH_DPIDS.items():
            switches[name] = self.addSwitch(name, cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=did)

        # Core
        self.addLink(switches['CS1'], switches['CS2'])
        for ds in ['DS_A1', 'DS_A2', 'DS_B1', 'DS_B2', 'DS_C1', 'DS_C2', 'DS_S1', 'DS_S2']:
            self.addLink(switches['CS1'], switches[ds])
            self.addLink(switches['CS2'], switches[ds])

        # Distribution pairs
        for a, b in [('DS_A1', 'DS_A2'), ('DS_B1', 'DS_B2'), ('DS_C1', 'DS_C2'), ('DS_S1', 'DS_S2')]:
            self.addLink(switches[a], switches[b])

        # Distribution to Access
        for ds1, ds2, access in [('DS_A1', 'DS_A2', 'AS_A1'), ('DS_B1', 'DS_B2', 'AS_B1'),
                                  ('DS_C1', 'DS_C2', 'AS_C1'), ('DS_S1', 'DS_S2', 'AS_S1')]:
            self.addLink(switches[ds1], switches[access])
            self.addLink(switches[ds2], switches[access])

        # Internet path
        inet = self.addHost('INET', ip='198.51.100.100/24', defaultRoute='via 198.51.100.1')
        self.addLink(switches['ISP'], inet)
        self.addLink(switches['ISP'], switches['EdgeRtr'])
        self.addLink(switches['EdgeRtr'], switches['CS1'])
        self.addLink(switches['EdgeRtr'], switches['CS2'])

        # Services
        for name, cfg in SERVICE_CONFIG.items():
            h = self.addHost(name, ip=cfg['ip'])
            self.addLink(switches['AS_S1'], h)

        # 27 User Hosts
        for hostname, vlan in sorted(HOST_VLAN.items()):
            vcfg = VLAN_CONFIG[vlan]
            idx = int(hostname[1:])
            ip = f'{vcfg["pool"]}{50 + idx}{vcfg["mask"]}'
            h = self.addHost(hostname, ip=ip, defaultRoute=f'via {vcfg["gw"]}')
            self.addLink(switches[HOST_ACCESS[hostname]], h)


def test_connectivity(net, src_name, dst_name, description, expected=True):
    """Test connectivity and return result."""
    src = net.get(src_name)
    dst = net.get(dst_name)
    if not src or not dst:
        info(f'    ✗ {src_name} → {dst_name} ({description}): HOST NOT FOUND\n')
        return False

    result = src.cmd(f'ping -c 3 -W 2 {dst.IP()} 2>&1')
    success = ping_success(result)

    if expected:
        status = '✓ PASS' if success else '✗ FAIL'
    else:
        status = '✓ BLOCKED (correct)' if not success else '⚠ ALLOWED (should be blocked)'

    info(f'    {status} | {src_name} → {dst_name} ({description})\n')
    return success if expected else not success


def run_connectivity_test(mode):
    """Run complete connectivity validation."""
    info(f'\n{"═"*70}\n')
    info(f'  CONNECTIVITY VALIDATION TEST — {mode.upper()}\n')
    info(f'{"═"*70}\n\n')

    subprocess.call('mn -c 2>/dev/null || true', shell=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    topo = ConnectivityTopo()

    if mode == 'sdn':
        net = Mininet(topo=topo, switch=OVSKernelSwitch,
                      controller=lambda name: RemoteController(name, ip='127.0.0.1', port=6633),
                      build=True, ipBase='10.0.0.0/8')
    else:
        net = Mininet(topo=topo, switch=OVSKernelSwitch, controller=None,
                      build=True, ipBase='10.0.0.0/8')

    net.start()

    for sw in net.switches:
        if mode == 'traditional':
            sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=standalone')
            sw.cmd(f'ovs-vsctl set bridge {sw.name} stp_enable=true')
        else:
            sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=secure')

    wait = 15 if mode == 'traditional' else 5
    info(f'  ⏳ Waiting for convergence ({wait}s)...\n')
    time.sleep(wait)

    results = {'host_to_host': [], 'host_to_internet': [], 'host_to_service': [], 'acl_validation': []}

    # ══════════════════════════════════════════════
    # TEST 1: HOST-TO-HOST CONNECTIVITY
    # ══════════════════════════════════════════════
    info(f'\n  {"─"*60}\n')
    info(f'  TEST 1: HOST-TO-HOST CONNECTIVITY\n')
    info(f'  {"─"*60}\n')

    h2h_tests = [
        ('h1', 'h2', 'Same VLAN (VLAN 10 Finance, Block A)', True),
        ('h10', 'h11', 'Same VLAN (VLAN 20 HR, Block B)', True),
        ('h19', 'h20', 'Same VLAN (VLAN 50 Corporate, Block C)', True),
        ('h4', 'h5', 'Same VLAN (VLAN 40 Compliance, Block A)', True),
        ('h22', 'h23', 'Same VLAN (VLAN 60 Training, Block C)', True),
        ('h1', 'h10', 'Cross-block (Block A → Block B via core)', True),
        ('h1', 'h19', 'Cross-block (Block A → Block C via core)', True),
        ('h10', 'h19', 'Cross-block (Block B → Block C via core)', True),
        ('h7', 'h8', 'Guest same-VLAN (Guest A, VLAN 110)', True),
        ('h16', 'h17', 'Guest same-VLAN (Guest B, VLAN 120)', True),
    ]

    for src, dst, desc, expected in h2h_tests:
        ok = test_connectivity(net, src, dst, desc, expected)
        results['host_to_host'].append(ok)

    h2h_passed = sum(results['host_to_host'])
    info(f'\n    Host-to-Host: {h2h_passed}/{len(h2h_tests)} passed\n')

    # ══════════════════════════════════════════════
    # TEST 2: HOST-TO-INTERNET
    # ══════════════════════════════════════════════
    info(f'\n  {"─"*60}\n')
    info(f'  TEST 2: HOST-TO-INTERNET CONNECTIVITY\n')
    info(f'  {"─"*60}\n')

    inet_tests = [
        ('h1', 'INET', 'VLAN 10 (Finance) → Internet', True),
        ('h10', 'INET', 'VLAN 20 (HR) → Internet', True),
        ('h13', 'INET', 'VLAN 30 (IT) → Internet', True),
        ('h19', 'INET', 'VLAN 50 (Corporate) → Internet', True),
        ('h7', 'INET', 'Guest A (VLAN 110) → Internet', True),
        ('h16', 'INET', 'Guest B (VLAN 120) → Internet', True),
    ]

    for src, dst, desc, expected in inet_tests:
        ok = test_connectivity(net, src, dst, desc, expected)
        results['host_to_internet'].append(ok)

    inet_passed = sum(results['host_to_internet'])
    info(f'\n    Host-to-Internet: {inet_passed}/{len(inet_tests)} passed\n')

    # ══════════════════════════════════════════════
    # TEST 3: HOST-TO-SERVICE (ACL VALIDATION)
    # ══════════════════════════════════════════════
    info(f'\n  {"─"*60}\n')
    info(f'  TEST 3: HOST-TO-SERVICE (ACL VALIDATION)\n')
    info(f'  {"─"*60}\n')

    info('\n  ── Allowed Access (should PASS) ──\n')
    service_allow_tests = [
        ('h1', 'erp1', 'Finance (VLAN 10) → ERP Server ✓', True),
        ('h4', 'erp1', 'Compliance (VLAN 40) → ERP Server ✓', True),
        ('h10', 'hr1', 'HR (VLAN 20) → HR Server ✓', True),
        ('h13', 'it1', 'IT (VLAN 30) → IT Server ✓', True),
        ('h19', 'voip1', 'Corporate (VLAN 50) → VoIP Server ✓', True),
        ('h22', 'voip1', 'Training (VLAN 60) → VoIP Server ✓', True),
    ]

    for src, dst, desc, expected in service_allow_tests:
        ok = test_connectivity(net, src, dst, desc, expected)
        results['host_to_service'].append(ok)

    info('\n  ── Denied Access (should be BLOCKED) ──\n')
    service_deny_tests = [
        ('h7', 'erp1', 'Guest A (VLAN 110) → ERP Server ✗ (ACL deny)', False),
        ('h16', 'hr1', 'Guest B (VLAN 120) → HR Server ✗ (ACL deny)', False),
        ('h25', 'it1', 'Guest C (VLAN 130) → IT Server ✗ (ACL deny)', False),
        ('h7', 'voip1', 'Guest A → VoIP ✗ (ACL deny)', False),
    ]

    for src, dst, desc, expected in service_deny_tests:
        ok = test_connectivity(net, src, dst, desc, expected)
        results['acl_validation'].append(ok)

    svc_passed = sum(results['host_to_service'])
    acl_passed = sum(results['acl_validation'])
    info(f'\n    Service Access (allowed): {svc_passed}/{len(service_allow_tests)} passed\n')
    info(f'    ACL Enforcement (denied): {acl_passed}/{len(service_deny_tests)} correctly blocked\n')

    if mode == 'traditional':
        info(f'\n    ⚠ Note: Traditional standalone OVS does NOT enforce ACLs at L2.\n')
        info(f'      Cross-VLAN blocking requires L3 ACLs on routers (not available in Mininet standalone).\n')
        info(f'      In production: iptables/ACLs are configured per-device.\n')

    # ══════════════════════════════════════════════
    # FINAL SUMMARY
    # ══════════════════════════════════════════════
    info(f'\n  {"═"*60}\n')
    info(f'  CONNECTIVITY VALIDATION SUMMARY — {mode.upper()}\n')
    info(f'  {"═"*60}\n')
    total_pass = h2h_passed + inet_passed + svc_passed + acl_passed
    total_tests = len(h2h_tests) + len(inet_tests) + len(service_allow_tests) + len(service_deny_tests)
    info(f'    Host-to-Host:     {h2h_passed}/{len(h2h_tests)}\n')
    info(f'    Host-to-Internet: {inet_passed}/{len(inet_tests)}\n')
    info(f'    Host-to-Service:  {svc_passed}/{len(service_allow_tests)}\n')
    info(f'    ACL Enforcement:  {acl_passed}/{len(service_deny_tests)}\n')
    info(f'    ────────────────────────────\n')
    info(f'    TOTAL:            {total_pass}/{total_tests}\n')

    net.stop()
    return {
        'host_to_host': {'passed': h2h_passed, 'total': len(h2h_tests)},
        'host_to_internet': {'passed': inet_passed, 'total': len(inet_tests)},
        'host_to_service': {'passed': svc_passed, 'total': len(service_allow_tests)},
        'acl_enforcement': {'passed': acl_passed, 'total': len(service_deny_tests)},
        'total': {'passed': total_pass, 'total': total_tests},
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Connectivity Validation Test')
    parser.add_argument('--mode', choices=['traditional', 'sdn', 'both'], default='both')
    args = parser.parse_args()

    setLogLevel('info')
    trad_results = None
    sdn_results = None

    if args.mode in ('traditional', 'both'):
        trad_results = run_connectivity_test('traditional')

    if args.mode in ('sdn', 'both'):
        sdn_results = run_connectivity_test('sdn')

    if args.mode == 'both' and trad_results and sdn_results:
        info(f'\n{"═"*70}\n')
        info(f'  CONNECTIVITY COMPARISON\n')
        info(f'{"═"*70}\n')
        info(f'  ┌───────────────────────┬─────────────────┬─────────────────┐\n')
        info(f'  │ Category              │ Traditional     │ SDN             │\n')
        info(f'  ├───────────────────────┼─────────────────┼─────────────────┤\n')
        info(f'  │ Host-to-Host          │ {trad_results["host_to_host"]["passed"]}/{trad_results["host_to_host"]["total"]:>13} │ {sdn_results["host_to_host"]["passed"]}/{sdn_results["host_to_host"]["total"]:>13} │\n')
        info(f'  │ Host-to-Internet      │ {trad_results["host_to_internet"]["passed"]}/{trad_results["host_to_internet"]["total"]:>13} │ {sdn_results["host_to_internet"]["passed"]}/{sdn_results["host_to_internet"]["total"]:>13} │\n')
        info(f'  │ Host-to-Service       │ {trad_results["host_to_service"]["passed"]}/{trad_results["host_to_service"]["total"]:>13} │ {sdn_results["host_to_service"]["passed"]}/{sdn_results["host_to_service"]["total"]:>13} │\n')
        info(f'  │ ACL Enforcement       │ {trad_results["acl_enforcement"]["passed"]}/{trad_results["acl_enforcement"]["total"]:>13} │ {sdn_results["acl_enforcement"]["passed"]}/{sdn_results["acl_enforcement"]["total"]:>13} │\n')
        info(f'  └───────────────────────┴─────────────────┴─────────────────┘\n')

    info(f'\n{"═"*70}\n')
    info(f'  CONNECTIVITY VALIDATION COMPLETE\n')
    info(f'{"═"*70}\n')
