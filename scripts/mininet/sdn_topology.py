"""
SDN Network Topology for Mininet with Ryu Controller

SDN-enabled enterprise hierarchical LAN architecture with:
- Core Layer: 2 OpenFlow switches (Ryu-controlled forwarding)
- Distribution Layer: 8 switches across 4 blocks
- Access Layer: 4 switches
- 27 Hosts across 9 VLANs (10/20/30/40/50/60/110/120/130)
- Service Servers: ERP, HR, Monitoring, IT, VoIP, DHCP
- Internet Simulation: ISP, EDGE, INET with NAT
- Ryu Controller: path computation, fast failover, flow management, QoS
- DHCP automation, diagnostics, and recovery

Usage:
    sudo python sdn_topology.py
    sudo python sdn_topology.py --dhcp          # Enable DHCP for hosts
    sudo python sdn_topology.py --no-cli        # Run without CLI
"""

import argparse
from mininet.topo import Topo
from mininet.net import Mininet
from mininet.node import RemoteController, OVSKernelSwitch
from mininet.cli import CLI
from mininet.log import setLogLevel, info, error
from mininet.link import TCLink
import time
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
NETWORK_DIR = BASE_DIR / 'network'
CONFIG_DIR = NETWORK_DIR / 'configs'
DHCP_DIR = CONFIG_DIR / 'dhcp'


class SDNHierarchicalTopo(Topo):
    """SDN-enabled Hierarchical Network Topology (expanded)."""

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
        info('*** Building SDN Hierarchical Topology (Expanded) ***\n')

        cs1 = self.addSwitch('CS1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(1))
        cs2 = self.addSwitch('CS2', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(2))
        self.addLink(cs1, cs2)

        ds_a1 = self.addSwitch('DS_A1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(11))
        ds_a2 = self.addSwitch('DS_A2', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(12))
        ds_b1 = self.addSwitch('DS_B1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(13))
        ds_b2 = self.addSwitch('DS_B2', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(14))
        ds_c1 = self.addSwitch('DS_C1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(15))
        ds_c2 = self.addSwitch('DS_C2', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(16))
        ds_s1 = self.addSwitch('DS_S1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(17))
        ds_s2 = self.addSwitch('DS_S2', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(18))

        as_a1 = self.addSwitch('AS_A1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(21))
        as_b1 = self.addSwitch('AS_B1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(22))
        as_c1 = self.addSwitch('AS_C1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(23))
        as_s1 = self.addSwitch('AS_S1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(24))

        for block_sw in [ds_a1, ds_a2, ds_b1, ds_b2, ds_c1, ds_c2, ds_s1, ds_s2]:
            self.addLink(cs1, block_sw)
            self.addLink(cs2, block_sw)

        for pair in [(ds_a1, ds_a2), (ds_b1, ds_b2), (ds_c1, ds_c2), (ds_s1, ds_s2)]:
            self.addLink(*pair)

        self.addLink(ds_a1, ds_b1)
        self.addLink(ds_b1, ds_c1)
        self.addLink(ds_c1, ds_s1)

        self.addLink(ds_a1, as_a1)
        self.addLink(ds_a2, as_a1)
        self.addLink(ds_b1, as_b1)
        self.addLink(ds_b2, as_b1)
        self.addLink(ds_c1, as_c1)
        self.addLink(ds_c2, as_c1)
        self.addLink(ds_s1, as_s1)
        self.addLink(ds_s2, as_s1)

        # Internet simulation
        inet_host = self.addHost('INET', ip='198.51.100.100/24')
        isp_router = self.addSwitch('ISP', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(31))
        edge_router = self.addSwitch('Router-Edge', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=self.dpid(32))

        self.addLink(inet_host, isp_router)
        self.addLink(isp_router, edge_router)
        self.addLink(cs1, edge_router)
        self.addLink(cs2, edge_router)

        # Service servers
        for name, cfg in self.SERVICE_CONFIG.items():
            self.addHost(name, ip=cfg['ip'], defaultRoute=f'via {cfg["ip"].rsplit(".", 1)[0]}.1')
            self.addLink(as_s1, name)

        # 27 hosts — host_to_access maps to switch NAME strings (not variables)
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

        info('*** SDN Topology built: 27 hosts, 9 VLANs, Internet simulation\n')


def setup_nat(net):
    info('*** Configuring NAT on Router-Edge...\n')
    edge = net.get('Router-Edge')
    if edge:
        edge.cmd('echo 1 > /proc/sys/net/ipv4/ip_forward 2>/dev/null || true')
        edge.cmd('iptables -t nat -A POSTROUTING -o Router-Edge-eth0 -j MASQUERADE 2>/dev/null || true')
        edge.cmd('iptables -A FORWARD -i Router-Edge-eth0 -o Router-Edge-eth1 -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true')
        edge.cmd('iptables -A FORWARD -i Router-Edge-eth1 -o Router-Edge-eth0 -j ACCEPT 2>/dev/null || true')
        info('*** NAT configured\n')


def setup_internet_routes(net):
    info('*** Configuring internet routes...\n')
    isp = net.get('ISP')
    inet = net.get('INET')
    if isp:
        isp.cmd('ip route add 10.0.0.0/8 via 198.51.100.1 dev ISP-eth1 2>/dev/null || true')
    if inet:
        inet.cmd('ip route add 10.0.0.0/8 via 198.51.100.1 2>/dev/null || true')
    info('*** Internet routes configured\n')


def setup_dhcp_server(net):
    info('*** Setting up DHCP server...\n')
    dhcp = net.get('DHCP-Server')
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
        dhcp.cmd('pkill -f dnsmasq 2>/dev/null || true')
        dhcp.cmd('dnsmasq --interface=DHCP-Server-eth0 '
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
    info('*** Configuring DHCP clients for all hosts...\n')
    for i in range(1, 28):
        name = f'h{i}'
        host = net.get(name)
        if host:
            host.cmd(f'pkill -f dhclient 2>/dev/null || true')
            host.cmd(f'ip addr flush dev {name}-eth0 2>/dev/null || true')
            host.cmd(f'dhclient {name}-eth0 2>/dev/null &')
            time.sleep(0.3)
    time.sleep(5)
    for i in range(1, 28):
        name = f'h{i}'
        host = net.get(name)
        if host:
            ip = host.cmd(f'ip -4 addr show dev {name}-eth0 2>/dev/null | grep inet | awk "{{print \\$2}}"').strip()
            info(f'  {name}: {ip if ip else "NO IP"}\n')


def run_initial_diagnostics(net):
    info('*** Running baseline connectivity diagnostics...\n')
    tests = [
        ('h1', '10.3.0.10'),   # h1 (VLAN 10) -> erp1 (should work - VLAN 10 allowed)
        ('h1', '10.3.0.20'),   # h1 -> hr1 (should work - VLANs 10-60 allowed)
        ('h1', '10.3.0.21'),   # h1 -> monitor1 (should work - VLANs 10-60 allowed)
        ('h10', '10.3.0.40'),  # h10 (VLAN 20) -> it1 (should FAIL - only VLANs 30,40 allowed)
        ('h13', '10.3.0.40'),  # h13 (VLAN 30) -> it1 (should work - VLAN 30 allowed)
        ('h13', '10.3.0.50'),  # h13 -> voip1 (should work - VLANs 10-60 allowed)
        ('h1', '10.3.0.51'),   # h1 -> dhcp1 (should work - VLANs 10-60 allowed)
        ('h1', '10.1.3.254'),  # h1 -> Gateway VLAN 10
        ('h10', '10.1.7.254'), # h10 -> Gateway VLAN 20
        ('h13', '10.1.11.254'),# h13 -> Gateway VLAN 30
        ('h1', '198.51.100.100'),  # h1 -> Internet
        ('h7', '198.51.100.100'),  # h7 (VLAN 110 Guest) -> Internet (should work)
        ('h7', '10.3.0.20'),   # h7 (Guest) -> hr1 (should FAIL - guests blocked from internal)
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


def run(use_dhcp=False, start_cli=True):
    """Start the SDN network simulation with Ryu controller."""
    setLogLevel('info')
    import subprocess
    subprocess.call('mn -c 2>/dev/null || true', shell=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)
    topo = SDNHierarchicalTopo()
    net = Mininet(
        topo=topo,
        switch=OVSKernelSwitch,
        controller=lambda name: RemoteController(name, ip='127.0.0.1', port=6633, protocols='OpenFlow13'),
        build=True,
        ipBase='10.0.0.0/8',
    )
    net.start()
    info('*** SDN Network started with Ryu Controller (127.0.0.1:6633)\n')

    setup_dhcp_server(net)
    setup_nat(net)
    setup_internet_routes(net)

    if use_dhcp:
        setup_host_dhcp_clients(net)

    run_initial_diagnostics(net)

    info('*** Network ready. SDN tests available:\n')
    info('  Flows:  dpctl dump-flows\n')
    info('  Connectivity: pingall\n')

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
    parser = argparse.ArgumentParser(description='SDN Hierarchical Network Topology')
    parser.add_argument('--dhcp', action='store_true', help='Enable DHCP for host addressing')
    parser.add_argument('--no-cli', action='store_true', help='Run without CLI')
    args = parser.parse_args()
    run(use_dhcp=args.dhcp, start_cli=not args.no_cli)
