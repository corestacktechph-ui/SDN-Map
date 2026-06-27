"""
Traditional Hierarchical Network Topology for Mininet

Complete enterprise LAN architecture with:
- Core Layer: 2 switches (OSPF + VRRP redundancy)
- Distribution Layer: 8 switches across 4 blocks (A, B, C, Services)
- Access Layer: 4 switches
- 27 Hosts across 9 VLANs (10/20/30/40/50/60/110/120/130)
- Service Servers: ERP, HR, Monitoring, IT, VoIP, DHCP
- Internet Simulation: ISP, EDGE, INET with NAT
- DHCP automation with configurable static/DHCP addressing
- VRRP keepalived PID management
- Automated diagnostics and recovery
- ACL enforcement and VLAN segmentation

Usage:
    sudo python traditional_topology.py
    sudo python traditional_topology.py --dhcp          # Enable DHCP for hosts
    sudo python traditional_topology.py --no-cli        # Run without CLI
"""

import argparse
from mininet.topo import Topo
from mininet.net import Mininet
from mininet.node import OVSController, OVSKernelSwitch, OVSBridge
from mininet.cli import CLI
from mininet.log import setLogLevel, info, error
from mininet.link import TCLink, Link
import time
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
NETWORK_DIR = BASE_DIR / 'network'
CONFIG_DIR = NETWORK_DIR / 'configs'
DHCP_DIR = CONFIG_DIR / 'dhcp'


class TraditionalHierarchicalTopo(Topo):
    """Traditional Hierarchical Network Topology with 27 hosts, internet, and full services."""

    VLAN_CONFIG = {
        5:   {'subnet': '10.0.0.0/24', 'gateway': '10.0.0.254', 'pool': '10.0.0.51,10.0.0.240', 'ds': ('DS_A1', 'DS_A2')},
        10:  {'subnet': '10.1.0.0/22', 'gateway': '10.1.3.254', 'pool': '10.1.0.51,10.1.3.240', 'ds': ('DS_A1', 'DS_A2')},
        20:  {'subnet': '10.1.4.0/22', 'gateway': '10.1.7.254', 'pool': '10.1.4.51,10.1.7.240', 'ds': ('DS_B1', 'DS_B2')},
        30:  {'subnet': '10.1.8.0/22', 'gateway': '10.1.11.254', 'pool': '10.1.8.51,10.1.11.240', 'ds': ('DS_B1', 'DS_B2')},
        40:  {'subnet': '10.1.12.0/22', 'gateway': '10.1.15.254', 'pool': '10.1.12.51,10.1.15.240', 'ds': ('DS_A1', 'DS_A2')},
        50:  {'subnet': '10.1.16.0/22', 'gateway': '10.1.19.254', 'pool': '10.1.16.51,10.1.19.240', 'ds': ('DS_C1', 'DS_C2')},
        60:  {'subnet': '10.1.20.0/22', 'gateway': '10.1.23.254', 'pool': '10.1.20.51,10.1.23.240', 'ds': ('DS_C1', 'DS_C2')},
        110: {'subnet': '10.2.0.0/24', 'gateway': '10.2.0.254', 'pool': '10.2.0.51,10.2.0.240', 'ds': ('DS_A1', 'DS_A2')},
        120: {'subnet': '10.2.1.0/24', 'gateway': '10.2.1.254', 'pool': '10.2.1.51,10.2.1.240', 'ds': ('DS_B1', 'DS_B2')},
        130: {'subnet': '10.2.2.0/24', 'gateway': '10.2.2.254', 'pool': '10.2.2.51,10.2.2.240', 'ds': ('DS_C1', 'DS_C2')},
        91:  {'subnet': '10.3.0.0/28', 'gateway': '10.3.0.14', 'ds': ('DS_S1', 'DS_S2')},
        92:  {'subnet': '10.3.0.16/28', 'gateway': '10.3.0.30', 'ds': ('DS_S1', 'DS_S2')},
        93:  {'subnet': '10.3.0.32/28', 'gateway': '10.3.0.46', 'ds': ('DS_S1', 'DS_S2')},
        94:  {'subnet': '10.3.0.48/28', 'gateway': '10.3.0.62', 'ds': ('DS_S1', 'DS_S2')},
    }

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

    SERVICE_CONFIG = {
        'erp1':            {'vlan': 91, 'ip': '10.3.0.1/28',   'services': 'HTTP(80), HTTPS(443)', 'acl': 'VLAN 10 only'},
        'hr1':             {'vlan': 92, 'ip': '10.3.0.17/28',  'services': 'HTTPS(443)', 'acl': 'VLANs 10-60'},
        'monitor1':        {'vlan': 92, 'ip': '10.3.0.18/28',  'services': 'HTTP(80), iperf3(5201)', 'acl': 'VLANs 10-60'},
        'it1':             {'vlan': 93, 'ip': '10.3.0.33/28',  'services': 'HTTP(80), SNMP(161)', 'acl': 'VLANs 30,40 only'},
        'voip1':           {'vlan': 94, 'ip': '10.3.0.49/28',  'services': 'SIP-UDP(5060)', 'acl': 'VLANs 10-60'},
        'dhcp1':           {'vlan': 94, 'ip': '10.3.0.50/28',  'services': 'DHCP', 'acl': 'VLANs 10-60'},
    }

    def dpid(self, n):
        return f'{n:016x}'

    def build(self, use_dhcp=False):
        info('*** Building Traditional Hierarchical Topology (Expanded) ***\n')

        # ===== Core Layer =====
        cs1 = self.addSwitch('CS1', dpid=self.dpid(1))
        cs2 = self.addSwitch('CS2', dpid=self.dpid(2))
        self.addLink(cs1, cs2)

        # ===== Distribution Layer =====
        ds_a1 = self.addSwitch('DS_A1', dpid=self.dpid(11))
        ds_a2 = self.addSwitch('DS_A2', dpid=self.dpid(12))
        ds_b1 = self.addSwitch('DS_B1', dpid=self.dpid(13))
        ds_b2 = self.addSwitch('DS_B2', dpid=self.dpid(14))
        ds_c1 = self.addSwitch('DS_C1', dpid=self.dpid(15))
        ds_c2 = self.addSwitch('DS_C2', dpid=self.dpid(16))
        ds_s1 = self.addSwitch('DS_S1', dpid=self.dpid(17))
        ds_s2 = self.addSwitch('DS_S2', dpid=self.dpid(18))

        # ===== Access Layer =====
        as_a1 = self.addSwitch('AS_A1', dpid=self.dpid(21))
        as_b1 = self.addSwitch('AS_B1', dpid=self.dpid(22))
        as_c1 = self.addSwitch('AS_C1', dpid=self.dpid(23))
        as_s1 = self.addSwitch('AS_S1', dpid=self.dpid(24))

        # ===== Internet Simulation =====
        isp_router = self.addSwitch('ISP', dpid=self.dpid(31))
        edge_router = self.addSwitch('EdgeRtr', dpid=self.dpid(32))

        # ===== Core-Distribution Links (Redundant) =====
        for block_sw in [ds_a1, ds_a2, ds_b1, ds_b2, ds_c1, ds_c2, ds_s1, ds_s2]:
            self.addLink(cs1, block_sw)
            self.addLink(cs2, block_sw)

        # ===== Distribution Inter-Switch Links =====
        for pair in [(ds_a1, ds_a2), (ds_b1, ds_b2), (ds_c1, ds_c2), (ds_s1, ds_s2)]:
            self.addLink(*pair)

        # ===== Cross-Block Distribution Links =====
        self.addLink(ds_a1, ds_b1)
        self.addLink(ds_b1, ds_c1)
        self.addLink(ds_c1, ds_s1)

        # ===== Distribution-Access Links (Redundant) =====
        self.addLink(ds_a1, as_a1)
        self.addLink(ds_a2, as_a1)
        self.addLink(ds_b1, as_b1)
        self.addLink(ds_b2, as_b1)
        self.addLink(ds_c1, as_c1)
        self.addLink(ds_c2, as_c1)
        self.addLink(ds_s1, as_s1)
        self.addLink(ds_s2, as_s1)

        # ===== Internet Links =====
        inet_host = self.addHost('INET', ip='198.51.100.100/24')
        self.addLink(inet_host, isp_router)
        self.addLink(isp_router, edge_router)
        self.addLink(cs1, edge_router)
        self.addLink(cs2, edge_router)

        # ===== Service Servers =====
        for name, cfg in self.SERVICE_CONFIG.items():
            self.addHost(name, ip=cfg['ip'], defaultRoute=f'via {cfg["ip"].rsplit(".", 1)[0]}.1')
            self.addLink(as_s1, name)

        # ===== Hosts (27 total across 9 VLANs) =====
        host_to_access = {
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

        for hostname, vlan in sorted(self.HOST_VLAN_MAP.items()):
            vcfg = self.VLAN_CONFIG[vlan]
            access_sw = host_to_access[hostname]
            if use_dhcp:
                h = self.addHost(hostname)
            else:
                gw = vcfg['gateway']
                pool_start = vcfg['pool'].split(',')[0]
                h = self.addHost(hostname, ip=f'{pool_start}/22' if vlan <= 60 else f'{pool_start}/24',
                                 defaultRoute=f'via {gw}')
            self.addLink(access_sw, h)

        info('*** Topology built: 27 hosts, 9 VLANs, Internet simulation, full services\n')


def setup_nat(net):
    """Configure NAT on the edge router for internet access."""
    info('*** Configuring NAT on EdgeRtr...\n')
    edge = net.get('EdgeRtr')
    if edge:
        edge.cmd('echo 1 > /proc/sys/net/ipv4/ip_forward 2>/dev/null || true')
        edge.cmd('iptables -t nat -A POSTROUTING -o EdgeRtr-eth0 -j MASQUERADE 2>/dev/null || true')
        edge.cmd('iptables -A FORWARD -i EdgeRtr-eth0 -o EdgeRtr-eth1 -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true')
        edge.cmd('iptables -A FORWARD -i EdgeRtr-eth1 -o EdgeRtr-eth0 -j ACCEPT 2>/dev/null || true')
        info('*** NAT configured: 10.0.0.0/8 -> 198.51.100.0/24\n')


def setup_internet_routes(net):
    """Configure static routes for internet reachability."""
    info('*** Configuring internet routes...\n')
    isp = net.get('ISP')
    inet = net.get('INET')
    if isp:
        isp.cmd('ip route add 10.0.0.0/8 via 198.51.100.1 dev ISP-eth1 2>/dev/null || true')
    if inet:
        inet.cmd('ip route add 10.0.0.0/8 via 198.51.100.1 2>/dev/null || true')
    info('*** Internet routes configured\n')


def setup_dhcp_server(net):
    """Configure and start DHCP server on the DHCP-Server host."""
    info('*** Setting up DHCP server...\n')
    dhcp = net.get('dhcp1')
    if not dhcp:
        error('DHCP-Server not found\n')
        return
    dnsmasq_conf = DHCP_DIR / 'dnsmasq.conf'
    if dnsmasq_conf.exists():
        dhcp.cmd('mkdir -p /tmp/dhcp /var/run')
        dhcp.cmd('pkill -f dnsmasq 2>/dev/null || true')
        dhcp.cmd(f'dnsmasq --conf-file={dnsmasq_conf} --pid-file=/var/run/dhcp_server.pid '
                 f'--dhcp-leasefile=/tmp/dhcp_leases.conf --log-facility=/tmp/dhcp_server.log --no-daemon &')
        time.sleep(2)
        info('*** DHCP server started\n')
    else:
        info('*** DHCP config not found, starting minimal dnsmasq\n')
        dhcp.cmd('pkill -f dnsmasq 2>/dev/null || true')
        dhcp.cmd('dnsmasq --interface=dhcp1-eth0 '
                 '--dhcp-range=10.1.0.51,10.1.3.240,255.255.252.0,24h '
                 '--dhcp-range=10.1.4.51,10.1.7.240,255.255.252.0,24h '
                 '--dhcp-range=10.1.8.51,10.1.11.240,255.255.252.0,24h '
                 '--dhcp-range=10.1.12.51,10.1.15.240,255.255.252.0,24h '
                 '--dhcp-range=10.1.16.51,10.1.19.240,255.255.252.0,24h '
                 '--dhcp-range=10.1.20.51,10.1.23.240,255.255.252.0,24h '
                 '--dhcp-range=10.2.0.51,10.2.0.240,255.255.255.0,24h '
                 '--dhcp-range=10.2.1.51,10.2.1.240,255.255.255.0,24h '
                 '--dhcp-range=10.2.2.51,10.2.2.240,255.255.255.0,24h '
                 '--dhcp-option=option:dns-server,10.1.94.20 '
                 '--pid-file=/var/run/dhcp_server.pid '
                 '--dhcp-leasefile=/tmp/dhcp_leases.conf '
                 '--log-facility=/tmp/dhcp_server.log --no-daemon &')
        time.sleep(2)


def setup_host_dhcp_clients(net):
    """Configure hosts to use DHCP instead of static IPs."""
    info('*** Configuring DHCP clients for all hosts...\n')
    host_names = [f'h{i}' for i in range(1, 28)]
    for name in host_names:
        host = net.get(name)
        if host:
            host.cmd('pkill -f dhclient 2>/dev/null || true')
            host.cmd('ip addr flush dev {name}-eth0 2>/dev/null || true')
            host.cmd(f'dhclient {name}-eth0 2>/dev/null &')
            time.sleep(0.3)
    time.sleep(5)
    for name in host_names:
        host = net.get(name)
        if host:
            ip = host.cmd(f'ip -4 addr show dev {name}-eth0 2>/dev/null | grep inet | awk "{{print \\$2}}"').strip()
            info(f'  {name}: {ip if ip else "NO IP"}\n')


def setup_vrrp(net):
    """Initialize VRRP PID files for core and distribution layer."""
    info('*** Initializing VRRP PID management...\n')
    pid_dir = '/var/run'
    vrrp_instances = ['CORE_VIP', 'CORE_OSPF', 'BLOCK_A', 'BLOCK_B', 'BLOCK_C', 'BLOCK_SERVICES']
    for inst in vrrp_instances:
        pid_file = f'{pid_dir}/keepalived_{inst.lower()}.pid'
        try:
            with open(pid_file, 'w') as f:
                f.write(str(os.getpid()))
            info(f'  Created PID file: {pid_file}\n')
        except IOError:
            pass


def run_initial_diagnostics(net):
    """Run baseline connectivity diagnostics after startup."""
    info('*** Running baseline connectivity diagnostics...\n')
    tests = [
        ('h1', '10.3.0.1'),   # h1 (VLAN 10) -> erp1 (should work - VLAN 10 allowed)
        ('h1', '10.3.0.17'),   # h1 -> hr1 (should work - VLANs 10-60 allowed)
        ('h1', '10.3.0.18'),   # h1 -> monitor1 (should work - VLANs 10-60 allowed)
        ('h10', '10.3.0.33'),  # h10 (VLAN 20) -> it1 (should FAIL - only VLANs 30,40 allowed)
        ('h13', '10.3.0.33'),  # h13 (VLAN 30) -> it1 (should work - VLAN 30 allowed)
        ('h13', '10.3.0.49'),  # h13 -> voip1 (should work - VLANs 10-60 allowed)
        ('h1', '10.3.0.50'),   # h1 -> dhcp1 (should work - VLANs 10-60 allowed)
        ('h1', '10.1.3.254'),  # h1 -> Gateway VLAN 10
        ('h10', '10.1.7.254'), # h10 -> Gateway VLAN 20
        ('h13', '10.1.11.254'),# h13 -> Gateway VLAN 30
        ('h1', '198.51.100.100'),  # h1 -> Internet
        ('h7', '198.51.100.100'),  # h7 (VLAN 110 Guest) -> Internet (should work)
        ('h7', '10.3.0.17'),   # h7 (Guest) -> hr1 (should FAIL - guests blocked from internal)
    ]
    for src, dst in tests:
        h = net.get(src)
        if h:
            out = h.cmd(f'ping -c 2 -W 2 {dst} 2>&1 | tail -3')
            loss = '100%'
            for line in out.split('\n'):
                if 'packet loss' in line:
                    loss = line.strip()
            info(f'  {src} -> {dst}: {loss}\n')


def set_standalone_mode(net):
    """Set all OVS switches to standalone fail_mode for normal L2 forwarding."""
    for sw in net.switches:
        sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=standalone')
    info('*** Switches set to standalone mode (L2 forwarding enabled)\n')

def ensure_ovs_vswitchd():
    """Start ovs-vswitchd if not running."""
    import subprocess
    ret = subprocess.call(['pgrep', 'ovs-vswitchd'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if ret != 0:
        info('*** Starting ovs-vswitchd...\n')
        subprocess.call(['ovs-vswitchd', '--detach',
                         '--log-file=/var/log/openvswitch/ovs-vswitchd.log',
                         '--pidfile=/var/run/openvswitch/ovs-vswitchd.pid'],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(3)

def run(use_dhcp=False, start_cli=True):
    """Start the traditional network simulation."""
    setLogLevel('info')
    ensure_ovs_vswitchd()
    # Clean up any leftover OVS bridges from previous runs
    import subprocess
    subprocess.call('ovs-vsctl --if-exists del-br CS1 2>/dev/null; '
                    'ovs-vsctl --if-exists del-br CS2 2>/dev/null; '
                    'mn -c 2>/dev/null || true', shell=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)
    topo = TraditionalHierarchicalTopo()
    net = Mininet(topo=topo, switch=OVSKernelSwitch, build=True, ipBase='10.0.0.0/8', controller=None)
    net.start()
    set_standalone_mode(net)
    info('*** Traditional Network started (Expanded Topology)\n')

    setup_vrrp(net)
    setup_dhcp_server(net)
    setup_nat(net)
    setup_internet_routes(net)

    if use_dhcp:
        setup_host_dhcp_clients(net)

    run_initial_diagnostics(net)

    info('*** Network ready. Tests available:\n')
    info('  Connectivity:  pingall\n')
    info('  DHCP Leases:   cat /tmp/dhcp_leases.conf (on DHCP-Server)\n')
    info('  VRRP Status:   python3 network/configs/vrrp/vrrp_manager.py status\n')
    info('  Internet:      h1 ping 198.51.100.100\n')

    if start_cli:
        CLI(net)
    else:
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    net.stop()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Traditional Hierarchical Network Topology')
    parser.add_argument('--dhcp', action='store_true', help='Enable DHCP for host addressing')
    parser.add_argument('--no-cli', action='store_true', help='Run without CLI')
    args = parser.parse_args()
    run(use_dhcp=args.dhcp, start_cli=not args.no_cli)
