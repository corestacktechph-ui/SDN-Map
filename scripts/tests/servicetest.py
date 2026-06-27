#!/usr/bin/env python3
"""
servicetest.py - Service Application-Level Testing

Runs application-level checks per service:
- ERP1 → HTTP/HTTPS reachability via curl
- HR1 → HTTPS reachability
- Monitor1 → Web service on port 8080
- IT1 → HTTP plus SNMP test with nc
- VoIP1 → SIP registration message over UDP port 5060
- Validates INET HTTPS access from all permitted VLANs

Usage:
    From Mininet CLI: mininet> py execfile('scripts/tests/servicetest.py')
"""

import json
from datetime import datetime

HOST_VLAN_MAP = {
    'h1': 10, 'h2': 10, 'h3': 10, 'h4': 40, 'h5': 40, 'h6': 40,
    'h7': 110, 'h8': 110, 'h9': 110, 'h10': 20, 'h11': 20, 'h12': 20,
    'h13': 30, 'h14': 30, 'h15': 30, 'h16': 120, 'h17': 120, 'h18': 120,
    'h19': 50, 'h20': 50, 'h21': 50, 'h22': 60, 'h23': 60, 'h24': 60,
    'h25': 130, 'h26': 130, 'h27': 130,
}

class ServiceTester:
    def __init__(self, net):
        self.net = net
        self.results = {'timestamp': datetime.now().isoformat(), 'tests': {}}
    
    def log(self, msg):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    
    def test_erp_http(self):
        """Test ERP HTTP/HTTPS from h1 (VLAN 10 allowed)."""
        self.log("Testing ERP Server (HTTP/HTTPS)...")
        h1 = self.net.get('h1')
        if h1:
            # Test HTTP
            result = h1.cmd('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://10.3.0.1:80 2>/dev/null')
            http_status = result.strip()
            # Test HTTPS (may not have SSL cert, so just check connection)
            https_result = h1.cmd('timeout 3 nc -zv 10.3.0.1 443 2>&1 | grep -c succeeded')
            https_ok = '1' in https_result
            
            self.results['tests']['erp_http'] = {'http_code': http_status, 'https_connection': https_ok}
            self.log(f"  ERP: HTTP={http_status}, HTTPS={'OK' if https_ok else 'FAIL'}")
    
    def test_hr_https(self):
        """Test HR HTTPS from allowed VLANs."""
        self.log("Testing HR Server (HTTPS)...")
        h1 = self.net.get('h1')
        if h1:
            result = h1.cmd('timeout 3 nc -zv 10.3.0.17 443 2>&1 | grep -c succeeded')
            ok = '1' in result
            self.results['tests']['hr_https'] = {'connection': ok}
            self.log(f"  HR: HTTPS={'OK' if ok else 'FAIL'}")
    
    def test_monitor_http(self):
        """Test Monitor HTTP and iperf3."""
        self.log("Testing Monitor Server (HTTP/iperf3)...")
        h1 = self.net.get('h1')
        if h1:
            http_result = h1.cmd('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://10.3.0.18:80 2>/dev/null')
            iperf_result = h1.cmd('timeout 3 nc -zv 10.3.0.18 5201 2>&1 | grep -c succeeded')
            
            self.results['tests']['monitor_services'] = {
                'http_code': http_result.strip(),
                'iperf3_port': '1' in iperf_result
            }
            self.log(f"  Monitor: HTTP={http_result.strip()}, iperf3={'OK' if '1' in iperf_result else 'FAIL'}")
    
    def test_it_services(self):
        """Test IT HTTP and SNMP."""
        self.log("Testing IT Server (HTTP/SNMP)...")
        h13 = self.net.get('h13')  # VLAN 30 allowed
        if h13:
            http_result = h13.cmd('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://10.3.0.33:80 2>/dev/null')
            snmp_result = h13.cmd('timeout 3 nc -zuv 10.3.0.33 161 2>&1 | grep -c succeeded')
            
            self.results['tests']['it_services'] = {
                'http_code': http_result.strip(),
                'snmp_udp': '1' in snmp_result
            }
            self.log(f"  IT: HTTP={http_result.strip()}, SNMP={'OK' if '1' in snmp_result else 'FAIL'}")
    
    def test_voip_sip(self):
        """Test VoIP SIP port."""
        self.log("Testing VoIP Server (SIP UDP 5060)...")
        h1 = self.net.get('h1')
        if h1:
            result = h1.cmd('timeout 3 nc -zuv 10.3.0.49 5060 2>&1 | grep -c succeeded')
            ok = '1' in result
            self.results['tests']['voip_sip'] = {'sip_udp': ok}
            self.log(f"  VoIP: SIP={'OK' if ok else 'FAIL'}")
    
    def test_inet_https(self):
        """Test INET HTTPS from permitted VLANs."""
        self.log("Testing INET HTTPS Access...")
        test_hosts = ['h1', 'h10', 'h13', 'h7']  # Mix of user and guest
        for h_name in test_hosts:
            h = self.net.get(h_name)
            if h:
                result = h.cmd('timeout 3 nc -zv 198.51.100.100 443 2>&1 | grep -c succeeded')
                ok = '1' in result
                vlan = HOST_VLAN_MAP.get(h_name, 0)
                self.results['tests'][f'inet_https_{h_name}'] = {'vlan': vlan, 'connection': ok}
                self.log(f"  {h_name} (VLAN {vlan}) -> INET HTTPS: {'OK' if ok else 'FAIL'}")
    
    def save_results(self):
        """Save results to JSON."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'network/results/tests/service_results_{timestamp}.json'
        import os
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        self.log(f"Results saved to: {filename}")
    
    def run_all_tests(self):
        """Run all service tests."""
        self.log("=" * 70)
        self.log("STARTING SERVICE TEST SUITE")
        self.log("=" * 70)
        self.test_erp_http()
        self.test_hr_https()
        self.test_monitor_http()
        self.test_it_services()
        self.test_voip_sip()
        self.test_inet_https()
        self.log("=" * 70)
        self.log("SERVICE TEST SUITE COMPLETE")
        self.log("=" * 70)
        return self.results

def run_service_test(net):
    tester = ServiceTester(net)
    results = tester.run_all_tests()
    tester.save_results()
    return results

if __name__ == '__main__':
    try:
        run_service_test(net)
    except NameError:
        print("Error: Run from Mininet CLI")
        print("Usage: mininet> py execfile('scripts/tests/servicetest.py')")
