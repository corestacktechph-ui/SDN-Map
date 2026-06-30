"""
Full Testing Presentation Script — Run ALL tests in presentation order

Executes the complete testing sequence matching the defense presentation outline:

1. HND (Traditional):
   - Topology, VLAN, Routing, VRRP, ACL
   - Connectivity Validation (H2H, H2Internet, H2Service+ACL)
   - Performance Baseline (Latency, Throughput, Packet Loss, Jitter, Recovery)
   - Manageability (Add VLAN 70 timing)

2. Migration Phases (6 phases)

3. SDN:
   - Controller, OpenFlow Registration, VN Mapping, VRF, Flow Tables, ACL, QoS
   - Connectivity Validation
   - Performance Test
   - Manageability Test

Usage:
    sudo python3 run_full_presentation.py
    sudo python3 run_full_presentation.py --section hnd
    sudo python3 run_full_presentation.py --section migration
    sudo python3 run_full_presentation.py --section sdn
    sudo python3 run_full_presentation.py --section all
"""

import argparse
import subprocess
import sys
import time
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def run_script(script_name, args_str=''):
    """Run a Mininet script and return exit code."""
    cmd = f'python3 {os.path.join(SCRIPT_DIR, script_name)} {args_str}'
    print(f'\n{"▓"*70}')
    print(f'  RUNNING: {script_name} {args_str}')
    print(f'{"▓"*70}\n')
    result = subprocess.call(cmd, shell=True)
    time.sleep(3)  # Cool-down between tests
    return result


def section_hnd():
    """Section 1: Traditional (HND) Testing."""
    print(f'\n{"█"*70}')
    print(f'  SECTION 1: TRADITIONAL NETWORK (HND)')
    print(f'{"█"*70}\n')

    # 1a. Topology + VLAN + VRRP + OSPF (shown in traditional_topology.py)
    print('\n  ▶ 1a. Traditional Topology (VLAN, Routing, VRRP, ACL config)\n')
    run_script('traditional_topology.py', '--no-cli')

    # 1b. Connectivity Validation
    print('\n  ▶ 1b. Connectivity Validation (Host-to-Host, Internet, Service+ACL)\n')
    run_script('connectivity_validation_test.py', '--mode traditional')

    # 1c. Performance Baseline
    print('\n  ▶ 1c. Performance Baseline (Latency, Throughput, Packet Loss, Jitter, Recovery)\n')
    run_script('performance_baseline_test.py', '--mode traditional')

    # 1d. Manageability
    print('\n  ▶ 1d. Manageability Test (Add VLAN 70 — CLI per-device)\n')
    run_script('manageability_test.py', '--mode traditional')


def section_migration():
    """Section 2: Migration Phases."""
    print(f'\n{"█"*70}')
    print(f'  SECTION 2: MIGRATION PHASES (Traditional → SDN)')
    print(f'{"█"*70}\n')

    run_script('migration_phases.py', '--all --no-cli')


def section_sdn():
    """Section 3: SDN Testing."""
    print(f'\n{"█"*70}')
    print(f'  SECTION 3: SDN NETWORK')
    print(f'{"█"*70}\n')

    # 3a. SDN Verification (Controller, OpenFlow, VN, VRF, Flows, ACL, QoS)
    print('\n  ▶ 3a. SDN Verification (Controller, OpenFlow, VN Mapping, VRF, ACL, QoS)\n')
    run_script('sdn_verification_test.py')

    # 3b. Connectivity Validation (SDN)
    print('\n  ▶ 3b. Connectivity Validation — SDN\n')
    run_script('connectivity_validation_test.py', '--mode sdn')

    # 3c. Performance Test (SDN)
    print('\n  ▶ 3c. Performance Test — SDN\n')
    run_script('performance_baseline_test.py', '--mode sdn')

    # 3d. QoS Traffic Prioritization
    print('\n  ▶ 3d. QoS Traffic Prioritization\n')
    run_script('qos_traffic_test.py', '--mode sdn')

    # 3e. Manageability (SDN)
    print('\n  ▶ 3e. Manageability Test — SDN (Add VLAN 70 via controller)\n')
    run_script('manageability_test.py', '--mode sdn')

    # 3f. Failover (SDN)
    print('\n  ▶ 3f. Failover Test — SDN\n')
    run_script('failover_testing.py', '--mode sdn')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Full Presentation Test Runner')
    parser.add_argument('--section', choices=['hnd', 'migration', 'sdn', 'all'], default='all',
                        help='Which section to run (default: all)')
    args = parser.parse_args()

    print(f'\n{"═"*70}')
    print(f'  SDN MIGRATION ANALYSIS PLATFORM — FULL TESTING PRESENTATION')
    print(f'  Running: {args.section.upper()}')
    print(f'{"═"*70}\n')

    start_time = time.time()

    if args.section in ('hnd', 'all'):
        section_hnd()

    if args.section in ('migration', 'all'):
        section_migration()

    if args.section in ('sdn', 'all'):
        section_sdn()

    elapsed = time.time() - start_time
    minutes = int(elapsed // 60)
    seconds = int(elapsed % 60)

    print(f'\n{"═"*70}')
    print(f'  ALL TESTS COMPLETE')
    print(f'  Total Runtime: {minutes}m {seconds}s')
    print(f'{"═"*70}\n')
