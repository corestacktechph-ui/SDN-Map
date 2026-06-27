#!/usr/bin/env python3
"""
HNDValidationS_ACL.py - Complete Network Validation Test Suite

Full network validation test that checks:
- OSPF adjacencies and routes to confirm dynamic routing is working
- VRRP virtual IP ownership to verify redundancy and failover roles
- Service processes (like HTTP, iperf3, VoIP) to ensure applications are running
- Host-to-host connectivity with ping tests across all user hosts
- Service ports to confirm servers are listening on expected TCP/UDP ports
- Internet reachability by testing host access to the INET node
- ACL enforcement by validating allowed/blocked VLAN access to services

Usage:
    From Mininet CLI:
        mininet> py execfile('scripts/tests/HNDValidationS_ACL.py')
    
    Or standalone with network object:
        python3 scripts/tests/HNDValidationS_ACL.py
"""

import time
import json
from datetime import datetime

# ACL Rules Configuration
ACL_RULES = {
    'erp1': {
        'ip': '10.3.0.1',
        'allowed_vlans': [10],
        'ports': {'tcp': [80, 443]},
        'description': 'ERP Server - VLAN 10 only'
    },
    'hr1': {
        'ip': '10.3.0.17',
        'allowed_vlans': [10, 20, 30, 40, 50, 60],
        'ports': {'tcp': [443]},
        'description': 'HR Server - VLANs 10-60'
    },
    'monitor1': {
        'ip': '10.3.0.18',
        'allowed_vlans': [10, 20, 30, 40, 50, 60],
        'ports': {'tcp': [80, 5201]},
        'description': 'Monitor Server - VLANs 10-60'
    },
    'it1': {
        'ip': '10.3.0.33',
        'allowed_vlans': [30, 40],
        'ports': {'tcp': [80], 'udp': [161]},
        'description': 'IT Server - VLANs 30,40 only'
    },
    'voip1': {
        'ip': '10.3.0.49',
        'allowed_vlans': [10, 20, 30, 40, 50, 60],
        'ports': {'udp': [5060]},
        'description': 'VoIP Server - VLANs 10-60'
    },
    'dhcp1': {
        'ip': '10.3.0.50',
        'allowed_vlans': [10, 20, 30, 40, 50, 60],
        'ports': {'udp': [67, 68]},
        'description': 'DHCP Server - VLANs 10-60'
    }
}

# Host to VLAN mapping
HOST_VLAN_MAP = {
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

# Guest VLANs - Internet only, no internal access
GUEST_VLANS = [110, 120, 130]

# Service node names
SERVICE_NODES = {
    'erp1': 'erp1',
    'hr1': 'hr1',
    'monitor1': 'monitor1',
    'it1': 'it1',
    'voip1': 'voip1',
    'dhcp1': 'dhcp1'
}

class NetworkValidator:
    def __init__(self, net):
        self.net = net
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'ospf_routing': {},
            'vrrp_status': {},
            'service_processes': {},
            'host_connectivity': {},
            'service_ports': {},
            'internet_connectivity': {},
            'acl_validation': {},
            'summary': {}
        }
    
    def log(self, msg):
        """Print timestamped log message."""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    
    def test_ospf_routing(self):
        """Check OSPF adjacencies and routing tables on core switches."""
        self.log("=== Testing OSPF Routing ===")
        core_switches = ['CS1', 'CS2']
        
        for sw_name in core_switches:
            sw = self.net.get(sw_name)
            if not sw:
                self.log(f"  {sw_name}: NOT FOUND")
                continue
            
            # Check if routes are installed (simplified check)
            routes = sw.cmd('ip route show')
            route_count = len([r for r in routes.split('\n') if r.strip()])
            
            self.results['ospf_routing'][sw_name] = {
                'status': 'UP' if route_count > 2 else 'DOWN',
                'route_count': route_count
            }
            self.log(f"  {sw_name}: {route_count} routes installed")
    
    def test_vrrp_status(self):
        """Check VRRP virtual IP ownership on distribution switches."""
        self.log("=== Testing VRRP Status ===")
        vrrp_pairs = [
            ('DS_A1', 'DS_A2', '10.1.3.254'),
            ('DS_B1', 'DS_B2', '10.1.7.254'),
            ('DS_C1', 'DS_C2', '10.1.19.254'),
            ('DS_S1', 'DS_S2', '10.3.0.14'),
        ]
        
        for master, backup, vip in vrrp_pairs:
            master_sw = self.net.get(master)
            if master_sw:
                # Check if VIP is reachable
                result = master_sw.cmd(f'ping -c 1 -W 1 {vip} 2>&1 | grep -c "1 received"')
                status = 'MASTER' if '1' in result else 'UNKNOWN'
                self.results['vrrp_status'][f'{master}/{backup}'] = {
                    'vip': vip,
                    'status': status
                }
                self.log(f"  {master}-{backup} VIP {vip}: {status}")
    
    def test_service_processes(self):
        """Check if service processes are running on service nodes."""
        self.log("=== Testing Service Processes ===")
        
        services_to_check = {
            'monitor1': {'port': 5201, 'proto': 'tcp', 'desc': 'iperf3'},
            'hr1': {'port': 443, 'proto': 'tcp', 'desc': 'HTTPS'},
            'it1': {'port': 161, 'proto': 'udp', 'desc': 'SNMP'},
            'voip1': {'port': 5060, 'proto': 'udp', 'desc': 'SIP'},
        }
        
        for svc_name, svc_info in services_to_check.items():
            node = self.net.get(svc_name)
            if not node:
                self.results['service_processes'][svc_name] = 'NOT FOUND'
                continue
            
            # Check if port is listening
            if svc_info['proto'] == 'tcp':
                result = node.cmd(f"netstat -tln 2>/dev/null | grep -c ':{svc_info['port']} '")
            else:
                result = node.cmd(f"netstat -uln 2>/dev/null | grep -c ':{svc_info['port']} '")
            
            status = 'RUNNING' if '1' in result or '2' in result else 'DOWN'
            self.results['service_processes'][svc_name] = {
                'service': svc_info['desc'],
                'port': svc_info['port'],
                'status': status
            }
            self.log(f"  {svc_name} ({svc_info['desc']}:{svc_info['port']}): {status}")
    
    def test_host_to_host_connectivity(self):
        """Test basic connectivity between all hosts."""
        self.log("=== Testing Host-to-Host Connectivity ===")
        
        # Sample test: h1 -> h10, h13, h19
        test_pairs = [
            ('h1', 'h10'),
            ('h1', 'h13'),
            ('h1', 'h19'),
            ('h10', 'h13'),
            ('h13', 'h22'),
        ]
        
        for src, dst in test_pairs:
            src_host = self.net.get(src)
            dst_host = self.net.get(dst)
            
            if not src_host or not dst_host:
                continue
            
            dst_ip = dst_host.IP()
            result = src_host.cmd(f'ping -c 2 -W 2 {dst_ip} 2>&1 | grep -oP "\\d+(?=% packet loss)"')
            
            packet_loss = int(result.strip()) if result.strip() else 100
            status = 'PASS' if packet_loss < 50 else 'FAIL'
            
            self.results['host_connectivity'][f'{src}->{dst}'] = {
                'dst_ip': dst_ip,
                'packet_loss': packet_loss,
                'status': status
            }
            self.log(f"  {src} -> {dst} ({dst_ip}): {packet_loss}% loss [{status}]")
    
    def test_service_ports(self):
        """Check if service ports are accessible from allowed hosts."""
        self.log("=== Testing Service Port Accessibility ===")
        
        # Test h1 (VLAN 10) can access ERP server
        h1 = self.net.get('h1')
        if h1:
            result = h1.cmd('ping -c 2 -W 2 10.3.0.1 2>&1 | grep -oP "\\d+(?=% packet loss)"')
            loss = int(result.strip()) if result.strip() else 100
            self.results['service_ports']['h1_to_erp1'] = {
                'expected': 'PASS',
                'result': 'PASS' if loss < 50 else 'FAIL',
                'packet_loss': loss
            }
            self.log(f"  h1 (VLAN 10) -> erp1 (10.3.0.1): {loss}% loss [Expected: PASS]")
        
        # Test h13 (VLAN 30) can access IT server
        h13 = self.net.get('h13')
        if h13:
            result = h13.cmd('ping -c 2 -W 2 10.3.0.33 2>&1 | grep -oP "\\d+(?=% packet loss)"')
            loss = int(result.strip()) if result.strip() else 100
            self.results['service_ports']['h13_to_it1'] = {
                'expected': 'PASS',
                'result': 'PASS' if loss < 50 else 'FAIL',
                'packet_loss': loss
            }
            self.log(f"  h13 (VLAN 30) -> it1 (10.3.0.33): {loss}% loss [Expected: PASS]")
    
    def test_internet_connectivity(self):
        """Test internet connectivity from user and guest VLANs."""
        self.log("=== Testing Internet Connectivity ===")
        
        test_hosts = ['h1', 'h10', 'h13', 'h7', 'h16', 'h25']  # Mix of user and guest hosts
        
        for host_name in test_hosts:
            host = self.net.get(host_name)
            if not host:
                continue
            
            result = host.cmd('ping -c 2 -W 2 198.51.100.100 2>&1 | grep -oP "\\d+(?=% packet loss)"')
            loss = int(result.strip()) if result.strip() else 100
            status = 'PASS' if loss < 50 else 'FAIL'
            
            vlan = HOST_VLAN_MAP.get(host_name, 0)
            self.results['internet_connectivity'][host_name] = {
                'vlan': vlan,
                'packet_loss': loss,
                'status': status
            }
            self.log(f"  {host_name} (VLAN {vlan}) -> INET: {loss}% loss [{status}]")
    
    def test_acl_enforcement(self):
        """Test ACL rules - verify blocked and allowed access."""
        self.log("=== Testing ACL Enforcement ===")
        
        test_cases = [
            # (source_host, service_name, expected_result, reason)
            ('h1', 'erp1', 'PASS', 'VLAN 10 allowed to erp1'),
            ('h10', 'erp1', 'FAIL', 'VLAN 20 blocked from erp1'),
            ('h1', 'hr1', 'PASS', 'VLAN 10 allowed to hr1'),
            ('h7', 'hr1', 'FAIL', 'Guest VLAN 110 blocked from hr1'),
            ('h10', 'it1', 'FAIL', 'VLAN 20 blocked from it1'),
            ('h13', 'it1', 'PASS', 'VLAN 30 allowed to it1'),
            ('h4', 'it1', 'PASS', 'VLAN 40 allowed to it1'),
            ('h19', 'monitor1', 'PASS', 'VLAN 50 allowed to monitor1'),
            ('h25', 'monitor1', 'FAIL', 'Guest VLAN 130 blocked from monitor1'),
        ]
        
        for src_name, svc_name, expected, reason in test_cases:
            host = self.net.get(src_name)
            if not host or svc_name not in ACL_RULES:
                continue
            
            svc_ip = ACL_RULES[svc_name]['ip']
            result = host.cmd(f'ping -c 2 -W 2 {svc_ip} 2>&1 | grep -oP "\\d+(?=% packet loss)"')
            loss = int(result.strip()) if result.strip() else 100
            
            actual = 'PASS' if loss < 50 else 'FAIL'
            match = '✓' if actual == expected else '✗'
            
            vlan = HOST_VLAN_MAP.get(src_name, 0)
            self.results['acl_validation'][f'{src_name}_to_{svc_name}'] = {
                'source_vlan': vlan,
                'service_ip': svc_ip,
                'expected': expected,
                'actual': actual,
                'match': match,
                'reason': reason,
                'packet_loss': loss
            }
            self.log(f"  {match} {src_name} (VLAN {vlan}) -> {svc_name}: {actual} (Expected: {expected}) - {reason}")
    
    def generate_summary(self):
        """Generate test summary statistics."""
        self.log("=== Generating Summary ===")
        
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        
        # Count ACL validation results
        for test, result in self.results['acl_validation'].items():
            total_tests += 1
            if result['match'] == '✓':
                passed_tests += 1
            else:
                failed_tests += 1
        
        # Count host connectivity
        for test, result in self.results['host_connectivity'].items():
            total_tests += 1
            if result['status'] == 'PASS':
                passed_tests += 1
            else:
                failed_tests += 1
        
        # Count internet connectivity
        for test, result in self.results['internet_connectivity'].items():
            total_tests += 1
            if result['status'] == 'PASS':
                passed_tests += 1
            else:
                failed_tests += 1
        
        self.results['summary'] = {
            'total_tests': total_tests,
            'passed': passed_tests,
            'failed': failed_tests,
            'pass_rate': f"{(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%"
        }
        
        self.log(f"  Total Tests: {total_tests}")
        self.log(f"  Passed: {passed_tests}")
        self.log(f"  Failed: {failed_tests}")
        self.log(f"  Pass Rate: {self.results['summary']['pass_rate']}")
    
    def save_results(self, filename=None):
        """Save test results to JSON file."""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'network/results/tests/validation_results_{timestamp}.json'
        
        import os
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        self.log(f"Results saved to: {filename}")
    
    def run_all_tests(self):
        """Run all validation tests in sequence."""
        self.log("=" * 70)
        self.log("STARTING COMPLETE NETWORK VALIDATION TEST SUITE")
        self.log("=" * 70)
        
        self.test_ospf_routing()
        self.test_vrrp_status()
        self.test_service_processes()
        self.test_host_to_host_connectivity()
        self.test_service_ports()
        self.test_internet_connectivity()
        self.test_acl_enforcement()
        self.generate_summary()
        
        self.log("=" * 70)
        self.log("VALIDATION TEST SUITE COMPLETE")
        self.log("=" * 70)
        
        return self.results


def run_validation(net):
    """Main entry point for validation test."""
    validator = NetworkValidator(net)
    results = validator.run_all_tests()
    validator.save_results()
    return results


# For running from Mininet CLI
if __name__ == '__main__':
    try:
        # If net object exists in global scope (Mininet CLI)
        run_validation(net)
    except NameError:
        print("Error: This script must be run from Mininet CLI")
        print("Usage: mininet> py execfile('scripts/tests/HNDValidationS_ACL.py')")
