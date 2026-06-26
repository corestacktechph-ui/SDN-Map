#!/usr/bin/env python3
"""
latencytest.py - Comprehensive Latency Testing Script

Executes 20-ping tests from each host to INET to measure NAT latency.
Runs host-to-service latency tests only for VLANs allowed by ACL rules, skipping blocked flows.
Extracts the average round-trip time (RTT) from ping output to quantify latency.

Usage:
    From Mininet CLI:
        mininet> py execfile('scripts/tests/latencytest.py')
    
    Or standalone:
        python3 scripts/tests/latencytest.py
"""

import time
import json
import re
from datetime import datetime

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

# ACL Rules - Service access permissions
ACL_RULES = {
    'erp1': {
        'ip': '10.3.0.10',
        'allowed_vlans': [10],
        'description': 'ERP Server - VLAN 10 only'
    },
    'hr1': {
        'ip': '10.3.0.20',
        'allowed_vlans': [10, 20, 30, 40, 50, 60],
        'description': 'HR Server - VLANs 10-60'
    },
    'monitor1': {
        'ip': '10.3.0.21',
        'allowed_vlans': [10, 20, 30, 40, 50, 60],
        'description': 'Monitor Server - VLANs 10-60'
    },
    'it1': {
        'ip': '10.3.0.40',
        'allowed_vlans': [30, 40],
        'description': 'IT Server - VLANs 30,40 only'
    },
    'voip1': {
        'ip': '10.3.0.50',
        'allowed_vlans': [10, 20, 30, 40, 50, 60],
        'description': 'VoIP Server - VLANs 10-60'
    },
    'dhcp1': {
        'ip': '10.3.0.51',
        'allowed_vlans': [10, 20, 30, 40, 50, 60],
        'description': 'DHCP Server - VLANs 10-60'
    }
}

INET_IP = '198.51.100.100'


class LatencyTester:
    def __init__(self, net):
        self.net = net
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'inet_latency': {},
            'service_latency': {},
            'summary': {}
        }
    
    def log(self, msg):
        """Print timestamped log message."""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    
    def extract_avg_rtt(self, ping_output):
        """Extract average RTT from ping output."""
        # Look for pattern like: rtt min/avg/max/mdev = 0.123/0.456/0.789/0.012 ms
        match = re.search(r'rtt min/avg/max/mdev = [\d.]+/([\d.]+)/[\d.]+/[\d.]+ ms', ping_output)
        if match:
            return float(match.group(1))
        
        # Alternative pattern: avg = X ms
        match = re.search(r'avg[=\s]+([\d.]+)\s*ms', ping_output, re.IGNORECASE)
        if match:
            return float(match.group(1))
        
        return None
    
    def test_inet_latency(self):
        """Test latency from all hosts to INET (20 pings each)."""
        self.log("=" * 70)
        self.log("TESTING INTERNET LATENCY (NAT)")
        self.log("=" * 70)
        
        for host_name in sorted(HOST_VLAN_MAP.keys()):
            host = self.net.get(host_name)
            if not host:
                self.log(f"  {host_name}: NOT FOUND")
                continue
            
            vlan = HOST_VLAN_MAP[host_name]
            self.log(f"  Testing {host_name} (VLAN {vlan}) -> INET ({INET_IP})...")
            
            # Execute 20 pings
            ping_cmd = f'ping -c 20 -W 2 {INET_IP}'
            output = host.cmd(ping_cmd)
            
            # Extract statistics
            avg_rtt = self.extract_avg_rtt(output)
            
            # Extract packet loss
            loss_match = re.search(r'(\d+)% packet loss', output)
            packet_loss = int(loss_match.group(1)) if loss_match else 100
            
            # Extract packets transmitted/received
            packets_match = re.search(r'(\d+) packets transmitted, (\d+) received', output)
            transmitted = int(packets_match.group(1)) if packets_match else 20
            received = int(packets_match.group(2)) if packets_match else 0
            
            status = 'PASS' if packet_loss < 50 and avg_rtt else 'FAIL'
            
            self.results['inet_latency'][host_name] = {
                'vlan': vlan,
                'destination': INET_IP,
                'packets_sent': transmitted,
                'packets_received': received,
                'packet_loss': packet_loss,
                'avg_rtt_ms': avg_rtt,
                'status': status
            }
            
            if avg_rtt:
                self.log(f"    ✓ {host_name}: {avg_rtt:.3f} ms avg, {packet_loss}% loss [{status}]")
            else:
                self.log(f"    ✗ {host_name}: FAILED - {packet_loss}% loss [{status}]")
    
    def test_service_latency(self):
        """Test latency from hosts to services (only ACL-allowed connections)."""
        self.log("=" * 70)
        self.log("TESTING SERVICE LATENCY (ACL-AWARE)")
        self.log("=" * 70)
        
        # Test each host against each service
        for host_name in sorted(HOST_VLAN_MAP.keys()):
            host = self.net.get(host_name)
            if not host:
                continue
            
            host_vlan = HOST_VLAN_MAP[host_name]
            
            for service_name, acl_info in ACL_RULES.items():
                service_ip = acl_info['ip']
                allowed_vlans = acl_info['allowed_vlans']
                
                test_key = f'{host_name}_to_{service_name}'
                
                # Check if this host's VLAN is allowed to access this service
                if host_vlan not in allowed_vlans:
                    # Skip this test - ACL blocks this connection
                    self.results['service_latency'][test_key] = {
                        'source': host_name,
                        'source_vlan': host_vlan,
                        'destination': service_name,
                        'destination_ip': service_ip,
                        'acl_status': 'BLOCKED',
                        'skipped': True
                    }
                    self.log(f"  ⊘ {host_name} (VLAN {host_vlan}) -> {service_name}: SKIPPED (ACL blocks)")
                    continue
                
                # ACL allows - perform latency test
                self.log(f"  Testing {host_name} (VLAN {host_vlan}) -> {service_name} ({service_ip})...")
                
                # Execute 20 pings
                ping_cmd = f'ping -c 20 -W 2 {service_ip}'
                output = host.cmd(ping_cmd)
                
                # Extract statistics
                avg_rtt = self.extract_avg_rtt(output)
                
                # Extract packet loss
                loss_match = re.search(r'(\d+)% packet loss', output)
                packet_loss = int(loss_match.group(1)) if loss_match else 100
                
                # Extract packets transmitted/received
                packets_match = re.search(r'(\d+) packets transmitted, (\d+) received', output)
                transmitted = int(packets_match.group(1)) if packets_match else 20
                received = int(packets_match.group(2)) if packets_match else 0
                
                status = 'PASS' if packet_loss < 50 and avg_rtt else 'FAIL'
                
                self.results['service_latency'][test_key] = {
                    'source': host_name,
                    'source_vlan': host_vlan,
                    'destination': service_name,
                    'destination_ip': service_ip,
                    'acl_status': 'ALLOWED',
                    'packets_sent': transmitted,
                    'packets_received': received,
                    'packet_loss': packet_loss,
                    'avg_rtt_ms': avg_rtt,
                    'status': status,
                    'skipped': False
                }
                
                if avg_rtt:
                    self.log(f"    ✓ {host_name} -> {service_name}: {avg_rtt:.3f} ms avg, {packet_loss}% loss [{status}]")
                else:
                    self.log(f"    ✗ {host_name} -> {service_name}: FAILED - {packet_loss}% loss [{status}]")
    
    def generate_summary(self):
        """Generate summary statistics."""
        self.log("=" * 70)
        self.log("LATENCY TEST SUMMARY")
        self.log("=" * 70)
        
        # INET latency summary
        inet_rtts = [r['avg_rtt_ms'] for r in self.results['inet_latency'].values() if r.get('avg_rtt_ms')]
        if inet_rtts:
            inet_avg = sum(inet_rtts) / len(inet_rtts)
            inet_min = min(inet_rtts)
            inet_max = max(inet_rtts)
            self.log(f"  Internet Latency:")
            self.log(f"    Average: {inet_avg:.3f} ms")
            self.log(f"    Min: {inet_min:.3f} ms")
            self.log(f"    Max: {inet_max:.3f} ms")
            self.log(f"    Samples: {len(inet_rtts)}")
        else:
            inet_avg = inet_min = inet_max = None
            self.log(f"  Internet Latency: NO DATA")
        
        # Service latency summary
        service_rtts = [r['avg_rtt_ms'] for r in self.results['service_latency'].values() 
                       if r.get('avg_rtt_ms') and not r.get('skipped')]
        if service_rtts:
            svc_avg = sum(service_rtts) / len(service_rtts)
            svc_min = min(service_rtts)
            svc_max = max(service_rtts)
            self.log(f"  Service Latency:")
            self.log(f"    Average: {svc_avg:.3f} ms")
            self.log(f"    Min: {svc_min:.3f} ms")
            self.log(f"    Max: {svc_max:.3f} ms")
            self.log(f"    Samples: {len(service_rtts)}")
        else:
            svc_avg = svc_min = svc_max = None
            self.log(f"  Service Latency: NO DATA")
        
        # Count tests
        total_inet = len(self.results['inet_latency'])
        passed_inet = sum(1 for r in self.results['inet_latency'].values() if r['status'] == 'PASS')
        
        total_service = len([r for r in self.results['service_latency'].values() if not r.get('skipped')])
        passed_service = sum(1 for r in self.results['service_latency'].values() 
                            if r.get('status') == 'PASS' and not r.get('skipped'))
        
        skipped_service = sum(1 for r in self.results['service_latency'].values() if r.get('skipped'))
        
        self.log(f"  Test Results:")
        self.log(f"    Internet: {passed_inet}/{total_inet} passed")
        self.log(f"    Services: {passed_service}/{total_service} passed ({skipped_service} skipped by ACL)")
        
        self.results['summary'] = {
            'inet_latency': {
                'avg_ms': inet_avg,
                'min_ms': inet_min,
                'max_ms': inet_max,
                'samples': len(inet_rtts) if inet_rtts else 0,
                'tests_passed': passed_inet,
                'tests_total': total_inet
            },
            'service_latency': {
                'avg_ms': svc_avg,
                'min_ms': svc_min,
                'max_ms': svc_max,
                'samples': len(service_rtts) if service_rtts else 0,
                'tests_passed': passed_service,
                'tests_total': total_service,
                'tests_skipped_acl': skipped_service
            }
        }
    
    def save_results(self, filename=None):
        """Save test results to JSON file."""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'network/results/tests/latency_results_{timestamp}.json'
        
        import os
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        self.log(f"Results saved to: {filename}")
    
    def run_all_tests(self):
        """Run all latency tests."""
        self.log("=" * 70)
        self.log("STARTING LATENCY TEST SUITE")
        self.log("=" * 70)
        
        self.test_inet_latency()
        self.test_service_latency()
        self.generate_summary()
        
        self.log("=" * 70)
        self.log("LATENCY TEST SUITE COMPLETE")
        self.log("=" * 70)
        
        return self.results


def run_latency_test(net):
    """Main entry point for latency test."""
    tester = LatencyTester(net)
    results = tester.run_all_tests()
    tester.save_results()
    return results


# For running from Mininet CLI
if __name__ == '__main__':
    try:
        # If net object exists in global scope (Mininet CLI)
        run_latency_test(net)
    except NameError:
        print("Error: This script must be run from Mininet CLI")
        print("Usage: mininet> py execfile('scripts/tests/latencytest.py')")
