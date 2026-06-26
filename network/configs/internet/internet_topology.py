"""
Internet Simulation Module

Provides internet simulation nodes and connectivity for the Mininet topology:
- ISP: Internet Service Provider router
- EDGE: Edge router with NAT
- INET: External internet host

This module is imported by the main topology scripts.
"""

from mininet.topo import Topo
from mininet.log import info


INTERNET_SUBNET = '198.51.100.0/24'
INET_IP = '198.51.100.100/24'
ISP_IP = '198.51.100.1/24'


def add_internet_simulation(topo):
    """
    Add internet simulation nodes to an existing topology.
    Returns (inet_host, isp_router, edge_router) for external configuration.
    """
    inet_host = topo.addHost('INET', ip=INET_IP, defaultRoute='via 198.51.100.1')
    isp_router = topo.addSwitch('ISP')
    edge_router = topo.addSwitch('Router-Edge')

    topo.addLink(inet_host, isp_router, bw=10000, delay='10ms')
    topo.addLink(isp_router, edge_router, bw=10000, delay='5ms')

    return inet_host, isp_router, edge_router


def setup_internet_nat(net):
    """Configure NAT on the edge router for internet access."""
    edge = net.get('Router-Edge')
    if not edge:
        return

    edge.cmd('echo 1 > /proc/sys/net/ipv4/ip_forward 2>/dev/null || true')
    edge.cmd('iptables -t nat -A POSTROUTING -o Router-Edge-eth0 -j MASQUERADE 2>/dev/null || true')
    edge.cmd('iptables -A FORWARD -i Router-Edge-eth0 -o Router-Edge-eth1 '
             '-m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true')
    edge.cmd('iptables -A FORWARD -i Router-Edge-eth1 -o Router-Edge-eth0 -j ACCEPT 2>/dev/null || true')
    info('*** Internet NAT configured\n')


def setup_internet_routes(net):
    """Configure static routes for internet reachability."""
    isp = net.get('ISP')
    inet = net.get('INET')

    if isp:
        isp.cmd('ip route add 10.0.0.0/8 via 198.51.100.1 dev ISP-eth1 2>/dev/null || true')
    if inet:
        inet.cmd('ip route add 10.0.0.0/8 via 198.51.100.1 2>/dev/null || true')

    info('*** Internet routes configured\n')


def internet_connectivity_tests(net):
    """Run internet connectivity validation tests."""
    results = {}
    test_hosts = ['h1', 'h10', 'h13']

    for host_name in test_hosts:
        host = net.get(host_name)
        if not host:
            continue

        result = host.cmd('ping -c 4 -W 2 198.51.100.100 2>&1')
        loss = '100%'
        avg_rtt = 0
        for line in result.split('\n'):
            if 'packet loss' in line:
                loss = line.strip()
            if 'rtt min/avg/max/mdev' in line:
                parts = line.split('=')[1].strip().split('/')
                avg_rtt = float(parts[1])

        results[host_name] = {
            'packet_loss': loss,
            'avg_rtt_ms': avg_rtt,
        }
        info(f'  {host_name} -> INET: loss={loss}, avg_rtt={avg_rtt}ms\n')

    return results
