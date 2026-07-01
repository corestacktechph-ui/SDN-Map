"""
Comprehensive Network Validation Script

Tests OSPF, VRRP, connectivity, NAT, and ACL enforcement
for the traditional hierarchical network topology.

Run inside the Mininet container after the topology is started:
    sudo python3 network_validation.py

Requires the network (traditional_topology_final.py) to be running.
"""

import subprocess
import sys
import time
import re


# ═══════════════════════════════════════════════════════════════
# TEST FRAMEWORK
# ═══════════════════════════════════════════════════════════════
class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []

    def add(self, category, test_name, passed, detail=''):
        self.results.append({
            'category': category,
            'name': test_name,
            'passed': passed,
            'detail': detail,
        })
        if passed:
            self.passed += 1
        else:
            self.failed += 1

    def print_summary(self):
        print('\n' + '═' * 70)
        print('  NETWORK VALIDATION SUMMARY')
        print('═' * 70)
        total = self.passed + self.failed
        pct = (self.passed / total * 100) if total > 0 else 0
        print(f'\n  Total: {total} tests')
        print(f'  Passed: {self.passed} ({pct:.1f}%)')
        print(f'  Failed: {self.failed}')
        print('\n' + '─' * 70)

        # Print failures
        failures = [r for r in self.results if not r['passed']]
        if failures:
            print('  FAILURES:')
            for r in failures:
                print(f"    ✗ [{r['category']}] {r['name']}")
                if r['detail']:
                    print(f"      → {r['detail']}")
            print()

        # Print pass summary by category
        categories = {}
        for r in self.results:
            cat = r['category']
            categories.setdefault(cat, {'passed': 0, 'failed': 0})
            if r['passed']:
                categories[cat]['passed'] += 1
            else:
                categories[cat]['failed'] += 1

        print('  BY CATEGORY:')
        for cat, counts in categories.items():
            total_cat = counts['passed'] + counts['failed']
            status = '✓' if counts['failed'] == 0 else '✗'
            print(f'    {status} {cat}: '
                  f'{counts["passed"]}/{total_cat} passed')
        print('═' * 70 + '\n')


results = TestResult()


# ═══════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════
def mn_cmd(node, command):
    """Execute a command on a Mininet node via mnexec or namespace."""
    # Try using mininet's py interface via CLI pipe
    try:
        result = subprocess.run(
            ['mnexec', '-a', node, command],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout + result.stderr
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    # Fallback: use ip netns or direct pid-based execution
    try:
        # Find the PID of the node
        pid_result = subprocess.run(
            ['pgrep', '-f', f'mininet:{node}'],
            capture_output=True, text=True, timeout=5
        )
        if pid_result.stdout.strip():
            pid = pid_result.stdout.strip().split('\n')[0]
            result = subprocess.run(
                ['nsenter', '-t', pid, '-n', '--', 'bash', '-c', command],
                capture_output=True, text=True, timeout=10
            )
            return result.stdout + result.stderr
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    # Last fallback: use the mininet CLI m command
    try:
        result = subprocess.run(
            ['bash', '-c', f'echo "{node} {command}" | '
             f'mnexec -a {node} bash -c "{command}"'],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout + result.stderr
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return ''


def ping_test(src_node, dst_ip, count=2, timeout=3):
    """Ping from src_node to dst_ip, returns True if successful."""
    output = mn_cmd(src_node, f'ping -c {count} -W {timeout} {dst_ip}')
    return (
        '1 received' in output or
        '2 received' in output or
        '1 packets transmitted, 1 received' in output or
        '2 packets transmitted, 2 received' in output
    )


def get_ospf_neighbors(router_name):
    """Get OSPF neighbor count from FRR vtysh."""
    output = mn_cmd(router_name,
                    f'vtysh --vty_socket /tmp/frr_{router_name} '
                    f'-c "show ip ospf neighbor"')
    # Count lines with "Full" state
    full_count = len(re.findall(r'Full', output))
    return full_count, output


def get_interface_ips(node, interface):
    """Get IP addresses on an interface."""
    output = mn_cmd(node, f'ip addr show {interface}')
    ips = re.findall(r'inet (\d+\.\d+\.\d+\.\d+)/\d+', output)
    return ips


# ═══════════════════════════════════════════════════════════════
# TEST 1: OSPF NEIGHBOR VERIFICATION
# ═══════════════════════════════════════════════════════════════
def test_ospf_neighbors():
    """Verify OSPF adjacencies are formed on core/distribution routers."""
    print('\n' + '─' * 70)
    print('  TEST 1: OSPF Neighbor Verification')
    print('─' * 70)

    # Expected minimum neighbor counts per router
    expected = {
        'CS1': 10,   # CS2 + 8 DS + EDGE
        'CS2': 10,   # CS1 + 8 DS + EDGE
        'DS_A1': 3,  # CS1, CS2, DS_A2
        'DS_A2': 3,  # CS1, CS2, DS_A1
        'DS_B1': 3,
        'DS_B2': 3,
        'DS_C1': 3,
        'DS_C2': 3,
        'DS_S1': 3,
        'DS_S2': 3,
        'EDGE': 2,   # CS1, CS2
    }

    for router_name, min_neighbors in expected.items():
        count, output = get_ospf_neighbors(router_name)
        passed = count >= min_neighbors
        detail = (f'found {count} Full neighbors '
                  f'(expected >= {min_neighbors})')
        results.add('OSPF', f'{router_name} neighbors', passed, detail)
        status = '✓' if passed else '✗'
        print(f'  {status} {router_name}: {detail}')

    print()


# ═══════════════════════════════════════════════════════════════
# TEST 2: VRRP VERIFICATION
# ═══════════════════════════════════════════════════════════════
def test_vrrp():
    """Verify keepalived VIPs are assigned to master routers."""
    print('\n' + '─' * 70)
    print('  TEST 2: VRRP / keepalived Verification')
    print('─' * 70)

    # Check VIP presence on master routers
    vip_checks = [
        ('DS_A1', 'da1-as', '10.1.3.254', 'VLAN 10 VIP'),
        ('DS_A1', 'da1-as', '10.1.15.254', 'VLAN 40 VIP'),
        ('DS_A1', 'da1-as', '10.2.0.254', 'VLAN 110 VIP'),
        ('DS_B1', 'db1-as', '10.1.7.254', 'VLAN 20 VIP'),
        ('DS_B1', 'db1-as', '10.1.11.254', 'VLAN 30 VIP'),
        ('DS_B1', 'db1-as', '10.2.1.254', 'VLAN 120 VIP'),
        ('DS_C1', 'dc1-as', '10.1.19.254', 'VLAN 50 VIP'),
        ('DS_C1', 'dc1-as', '10.1.23.254', 'VLAN 60 VIP'),
        ('DS_C1', 'dc1-as', '10.2.2.254', 'VLAN 130 VIP'),
        ('DS_S1', 'ds1-as', '10.3.0.14', 'VLAN 91 VIP'),
        ('DS_S1', 'ds1-as', '10.3.0.30', 'VLAN 92 VIP'),
        ('DS_S1', 'ds1-as', '10.3.0.46', 'VLAN 93 VIP'),
        ('DS_S1', 'ds1-as', '10.3.0.62', 'VLAN 94 VIP'),
    ]

    for router, intf, expected_vip, desc in vip_checks:
        ips = get_interface_ips(router, intf)
        passed = expected_vip in ips
        detail = f'VIP {expected_vip} {"found" if passed else "NOT found"} on {intf}'
        results.add('VRRP', f'{router} {desc}', passed, detail)
        status = '✓' if passed else '✗'
        print(f'  {status} {router} {desc}: {detail}')

    # Simulate master failure test (optional — check backup takes over)
    print('\n  --- VRRP Failover Test (DS_A1 uplink down) ---')
    # Bring down DS_A1 uplink to simulate failure
    mn_cmd('DS_A1', 'ip link set da1-cs1 down')
    mn_cmd('DS_A1', 'ip link set da1-cs2 down')
    time.sleep(5)  # Wait for keepalived to detect failure

    # Check if DS_A2 acquired the VIP
    ips_backup = get_interface_ips('DS_A2', 'da2-as')
    failover_ok = '10.1.3.254' in ips_backup
    results.add('VRRP', 'DS_A1→DS_A2 failover (VLAN 10)', failover_ok,
                f'VIP on DS_A2: {"yes" if failover_ok else "no"}')
    status = '✓' if failover_ok else '✗'
    print(f'  {status} Failover: VLAN 10 VIP moved to DS_A2: '
          f'{"yes" if failover_ok else "no"}')

    # Restore uplinks
    mn_cmd('DS_A1', 'ip link set da1-cs1 up')
    mn_cmd('DS_A1', 'ip link set da1-cs2 up')
    time.sleep(5)
    print()


# ═══════════════════════════════════════════════════════════════
# TEST 3: HOST-TO-HOST CONNECTIVITY
# ═══════════════════════════════════════════════════════════════
def test_host_connectivity():
    """Test host-to-host connectivity (same VLAN, cross-VLAN, cross-block)."""
    print('\n' + '─' * 70)
    print('  TEST 3: Host-to-Host Connectivity')
    print('─' * 70)

    connectivity_tests = [
        # Same VLAN
        ('h1', '10.1.0.52', 'Same VLAN 10 (h1→h2)'),
        ('h10', '10.1.4.52', 'Same VLAN 20 (h10→h11)'),
        ('h19', '10.1.16.52', 'Same VLAN 50 (h19→h20)'),
        # Cross-VLAN same block
        ('h1', '10.1.12.51', 'Cross-VLAN Block A (VLAN10→VLAN40)'),
        ('h10', '10.1.8.51', 'Cross-VLAN Block B (VLAN20→VLAN30)'),
        ('h19', '10.1.20.51', 'Cross-VLAN Block C (VLAN50→VLAN60)'),
        # Cross-block
        ('h1', '10.1.4.51', 'Cross-block A→B (h1→h10)'),
        ('h1', '10.1.16.51', 'Cross-block A→C (h1→h19)'),
        ('h10', '10.1.16.51', 'Cross-block B→C (h10→h19)'),
        ('h13', '10.1.20.51', 'Cross-block B→C (h13→h22)'),
    ]

    for src, dst_ip, desc in connectivity_tests:
        passed = ping_test(src, dst_ip)
        results.add('Connectivity', desc, passed,
                    'reachable' if passed else 'unreachable')
        status = '✓' if passed else '✗'
        print(f'  {status} {desc}')

    print()


# ═══════════════════════════════════════════════════════════════
# TEST 4: INTERNET / NAT CONNECTIVITY
# ═══════════════════════════════════════════════════════════════
def test_internet_connectivity():
    """Test that hosts (user and guest) can reach the internet."""
    print('\n' + '─' * 70)
    print('  TEST 4: Internet / NAT Connectivity')
    print('─' * 70)

    inet_ip = '198.51.100.100'

    internet_tests = [
        # User hosts → internet
        ('h1', inet_ip, 'h1 (VLAN 10/Finance) → INET'),
        ('h10', inet_ip, 'h10 (VLAN 20/HR) → INET'),
        ('h13', inet_ip, 'h13 (VLAN 30/IT) → INET'),
        ('h19', inet_ip, 'h19 (VLAN 50/Corporate) → INET'),
        # Guest hosts → internet (should still work)
        ('h7', inet_ip, 'h7 (Guest A) → INET'),
        ('h16', inet_ip, 'h16 (Guest B) → INET'),
        ('h25', inet_ip, 'h25 (Guest C) → INET'),
    ]

    for src, dst_ip, desc in internet_tests:
        passed = ping_test(src, dst_ip)
        results.add('Internet/NAT', desc, passed,
                    'reachable' if passed else 'unreachable')
        status = '✓' if passed else '✗'
        print(f'  {status} {desc}')

    print()


# ═══════════════════════════════════════════════════════════════
# TEST 5: ACL ENFORCEMENT (Services + Guest Isolation)
# ═══════════════════════════════════════════════════════════════
def test_acl_enforcement():
    """Test ACL rules for service access and guest isolation."""
    print('\n' + '─' * 70)
    print('  TEST 5: ACL Enforcement (Service Access + Guest Isolation)')
    print('─' * 70)

    acl_tests = [
        # ERP (10.3.0.1) — only VLAN 10 permitted
        ('h1',  '10.3.0.1',  True,  'h1 (VLAN 10/Finance) → erp1: SHOULD PASS'),
        ('h10', '10.3.0.1',  False, 'h10 (VLAN 20/HR) → erp1: SHOULD FAIL'),
        ('h13', '10.3.0.1',  False, 'h13 (VLAN 30/IT) → erp1: SHOULD FAIL'),
        ('h7',  '10.3.0.1',  False, 'h7 (Guest A) → erp1: SHOULD FAIL'),

        # IT service (10.3.0.33) — only VLAN 30 and 40
        ('h13', '10.3.0.33', True,  'h13 (VLAN 30/IT) → it1: SHOULD PASS'),
        ('h4',  '10.3.0.33', True,  'h4 (VLAN 40/Compliance) → it1: SHOULD PASS'),
        ('h1',  '10.3.0.33', False, 'h1 (VLAN 10/Finance) → it1: SHOULD FAIL'),
        ('h10', '10.3.0.33', False, 'h10 (VLAN 20/HR) → it1: SHOULD FAIL'),
        ('h7',  '10.3.0.33', False, 'h7 (Guest A) → it1: SHOULD FAIL'),

        # HR service (10.3.0.17) — VLANs 10-60 permitted
        ('h10', '10.3.0.17', True,  'h10 (VLAN 20/HR) → hr1: SHOULD PASS'),
        ('h1',  '10.3.0.17', True,  'h1 (VLAN 10/Finance) → hr1: SHOULD PASS'),
        ('h19', '10.3.0.17', True,  'h19 (VLAN 50/Corporate) → hr1: SHOULD PASS'),
        ('h7',  '10.3.0.17', False, 'h7 (Guest A) → hr1: SHOULD FAIL'),
        ('h16', '10.3.0.17', False, 'h16 (Guest B) → hr1: SHOULD FAIL'),

        # Monitor service (10.3.0.18) — VLANs 10-60 permitted
        ('h22', '10.3.0.18', True,  'h22 (VLAN 60/Training) → monitor1: SHOULD PASS'),
        ('h25', '10.3.0.18', False, 'h25 (Guest C) → monitor1: SHOULD FAIL'),

        # VoIP (10.3.0.49) — VLANs 10-60 permitted
        ('h19', '10.3.0.49', True,  'h19 (VLAN 50/Corporate) → voip1: SHOULD PASS'),
        ('h7',  '10.3.0.49', False, 'h7 (Guest A) → voip1: SHOULD FAIL'),

        # Guest isolation — no access to internal hosts
        ('h7',  '10.1.0.51', False, 'h7 (Guest A) → h1 (internal): SHOULD FAIL'),
        ('h16', '10.1.8.51', False, 'h16 (Guest B) → h13 (internal): SHOULD FAIL'),
        ('h25', '10.1.16.51', False, 'h25 (Guest C) → h19 (internal): SHOULD FAIL'),

        # Guest internet — should still work
        ('h7',  '198.51.100.100', True, 'h7 (Guest A) → INET: SHOULD PASS'),
        ('h16', '198.51.100.100', True, 'h16 (Guest B) → INET: SHOULD PASS'),
        ('h25', '198.51.100.100', True, 'h25 (Guest C) → INET: SHOULD PASS'),
    ]

    for src, dst_ip, should_pass, desc in acl_tests:
        actual_pass = ping_test(src, dst_ip, count=1, timeout=2)

        if actual_pass == should_pass:
            passed = True
            detail = 'correct'
        else:
            passed = False
            expected = 'ALLOW' if should_pass else 'BLOCK'
            actual = 'reachable' if actual_pass else 'blocked'
            detail = f'expected {expected}, got {actual}'

        results.add('ACL', desc, passed, detail)
        status = '✓' if passed else '✗'
        print(f'  {status} {desc}')
        if not passed:
            print(f'      → {detail}')

    print()


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
def main():
    """Run all network validation tests."""
    print('\n' + '═' * 70)
    print('  COMPREHENSIVE NETWORK VALIDATION')
    print('  Traditional Hierarchical Network (OSPF + VRRP + ACL)')
    print('═' * 70)
    print(f'\n  Started at: {time.strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'  Waiting 5s for network to stabilize...\n')
    time.sleep(5)

    # Run all test categories
    test_ospf_neighbors()
    test_vrrp()
    test_host_connectivity()
    test_internet_connectivity()
    test_acl_enforcement()

    # Print summary
    results.print_summary()

    # Exit with appropriate code
    sys.exit(0 if results.failed == 0 else 1)


if __name__ == '__main__':
    main()
