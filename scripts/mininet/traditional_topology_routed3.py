"""
Traditional Hierarchical Network Topology with OSPF Routing & Proper VRRP (keepalived)

Full Layer 3 routed enterprise network with real keepalived VRRP:
- Core Layer: CS1, CS2 (OSPF Area 0 backbone)
- Distribution Layer: DS_A1/A2, DS_B1/B2, DS_C1/C2, DS_S1/S2 (Linux routers, FRR OSPF)
- Access Layer: AS_A1, AS_B1, AS_C1, AS_S1 (OVS standalone)
- Edge Router: OSPF default-information originate + NAT
- All inter-switch links use /30 point-to-point addressing (172.16.x.x)
- VRRP per-VLAN using keepalived with uplink tracking
- 27 hosts across 9 VLANs + 6 service servers + INET

Requires: FRR (Free Range Routing), keepalived installed in the Mininet environment

Usage:
    sudo python3 traditional_topology_routed3.py
    sudo python3 traditional_topology_routed3.py --no-cli
"""

import argparse
import time
import os
import subprocess
from mininet.topo import Topo
from mininet.net import Mininet
from mininet.node import Node, OVSKernelSwitch
from mininet.cli import CLI
from mininet.log import setLogLevel, info, error
from mininet.link import TCLink


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


# ═══════════════════════════════════════════════════════════════
# LINUX ROUTER NODE (runs FRR for OSPF)
# ═══════════════════════════════════════════════════════════════
class LinuxRouter(Node):
    """A Node configured as a Linux IP router with FRR."""

    def config(self, **params):
        super().config(**params)
        self.cmd('sysctl -w net.ipv4.ip_forward=1')
        self.cmd('sysctl -w net.ipv4.conf.all.rp_filter=0')
        self.cmd('sysctl -w net.ipv4.conf.default.rp_filter=0')

    def terminate(self):
        self.cmd('pkill -f zebra 2>/dev/null')
        self.cmd('pkill -f ospfd 2>/dev/null')
        self.cmd('pkill -f keepalived 2>/dev/null')
        super().terminate()


# ═══════════════════════════════════════════════════════════════
# POINT-TO-POINT LINK ADDRESSING (/30 subnets)
# ═══════════════════════════════════════════════════════════════
P2P_LINKS = {
    # Core interconnect
    'cs1-cs2':   ('172.16.0.1/30',   'CS1', 'CS2',   '172.16.0.2/30',   'cs2-cs1'),
    # Block A uplinks
    'da1-peer':  ('172.16.1.1/30',   'DS_A1', 'DS_A2', '172.16.1.2/30', 'da2-peer'),
    'cs1-da1':   ('172.16.1.5/30',   'CS1', 'DS_A1',  '172.16.1.6/30',  'da1-cs1'),
    'cs2-da1':   ('172.16.1.9/30',   'CS2', 'DS_A1',  '172.16.1.10/30', 'da1-cs2'),
    'cs1-da2':   ('172.16.1.13/30',  'CS1', 'DS_A2',  '172.16.1.14/30', 'da2-cs1'),
    'cs2-da2':   ('172.16.1.17/30',  'CS2', 'DS_A2',  '172.16.1.18/30', 'da2-cs2'),
    # Block B uplinks
    'db1-peer':  ('172.16.2.1/30',   'DS_B1', 'DS_B2', '172.16.2.2/30', 'db2-peer'),
    'cs1-db1':   ('172.16.2.5/30',   'CS1', 'DS_B1',  '172.16.2.6/30',  'db1-cs1'),
    'cs2-db1':   ('172.16.2.9/30',   'CS2', 'DS_B1',  '172.16.2.10/30', 'db1-cs2'),
    'cs1-db2':   ('172.16.2.13/30',  'CS1', 'DS_B2',  '172.16.2.14/30', 'db2-cs1'),
    'cs2-db2':   ('172.16.2.17/30',  'CS2', 'DS_B2',  '172.16.2.18/30', 'db2-cs2'),
    # Block C uplinks
    'dc1-peer':  ('172.16.3.1/30',   'DS_C1', 'DS_C2', '172.16.3.2/30', 'dc2-peer'),
    'cs1-dc1':   ('172.16.3.5/30',   'CS1', 'DS_C1',  '172.16.3.6/30',  'dc1-cs1'),
    'cs2-dc1':   ('172.16.3.9/30',   'CS2', 'DS_C1',  '172.16.3.10/30', 'dc1-cs2'),
    'cs1-dc2':   ('172.16.3.13/30',  'CS1', 'DS_C2',  '172.16.3.14/30', 'dc2-cs1'),
    'cs2-dc2':   ('172.16.3.17/30',  'CS2', 'DS_C2',  '172.16.3.18/30', 'dc2-cs2'),
    # Services uplinks
    'ds1-peer':  ('172.16.4.1/30',   'DS_S1', 'DS_S2', '172.16.4.2/30', 'ds2-peer'),
    'cs1-ds1':   ('172.16.4.5/30',   'CS1', 'DS_S1',  '172.16.4.6/30',  'ds1-cs1'),
    'cs2-ds1':   ('172.16.4.9/30',   'CS2', 'DS_S1',  '172.16.4.10/30', 'ds1-cs2'),
    'cs1-ds2':   ('172.16.4.13/30',  'CS1', 'DS_S2',  '172.16.4.14/30', 'ds2-cs1'),
    'cs2-ds2':   ('172.16.4.17/30',  'CS2', 'DS_S2',  '172.16.4.18/30', 'ds2-cs2'),
    # Edge links
    'edge-cs1':  ('172.16.255.1/30', 'EDGE', 'CS1',   '172.16.255.2/30', 'cs1-edge'),
    'edge-cs2':  ('172.16.255.5/30', 'EDGE', 'CS2',   '172.16.255.6/30', 'cs2-edge'),
}


# ═══════════════════════════════════════════════════════════════
# VLAN SVI (Gateway) ADDRESSES on Distribution Switches
# ═══════════════════════════════════════════════════════════════
VLAN_SVIS = {
    'DS_A1': {
        'vlan10': '10.1.3.252/22',
        'vlan40': '10.1.15.252/22',
        'vlan110': '10.2.0.252/24',
    },
    'DS_A2': {
        'vlan10': '10.1.3.253/22',
        'vlan40': '10.1.15.253/22',
        'vlan110': '10.2.0.253/24',
    },
    'DS_B1': {
        'vlan20': '10.1.7.252/22',
        'vlan30': '10.1.11.252/22',
        'vlan120': '10.2.1.252/24',
    },
    'DS_B2': {
        'vlan20': '10.1.7.253/22',
        'vlan30': '10.1.11.253/22',
        'vlan120': '10.2.1.253/24',
    },
    'DS_C1': {
        'vlan50': '10.1.19.252/22',
        'vlan60': '10.1.23.252/22',
        'vlan130': '10.2.2.252/24',
    },
    'DS_C2': {
        'vlan50': '10.1.19.253/22',
        'vlan60': '10.1.23.253/22',
        'vlan130': '10.2.2.253/24',
    },
    'DS_S1': {
        'vlan91': '10.3.0.12/28',
        'vlan92': '10.3.0.28/28',
        'vlan93': '10.3.0.44/28',
        'vlan94': '10.3.0.60/28',
    },
    'DS_S2': {
        'vlan91': '10.3.0.13/28',
        'vlan92': '10.3.0.29/28',
        'vlan93': '10.3.0.45/28',
        'vlan94': '10.3.0.61/28',
    },
}


# VRRP VIP definitions: (master, backup, master_intf, backup_intf, vip_cidr, vrid)
VRRP_INSTANCES = [
    # Block A
    ('DS_A1', 'DS_A2', 'da1-as', 'da2-as', '10.1.3.254/22', 10),
    ('DS_A1', 'DS_A2', 'da1-as', 'da2-as', '10.1.15.254/22', 40),
    ('DS_A1', 'DS_A2', 'da1-as', 'da2-as', '10.2.0.254/24', 110),
    # Block B
    ('DS_B1', 'DS_B2', 'db1-as', 'db2-as', '10.1.7.254/22', 20),
    ('DS_B1', 'DS_B2', 'db1-as', 'db2-as', '10.1.11.254/22', 30),
    ('DS_B1', 'DS_B2', 'db1-as', 'db2-as', '10.2.1.254/24', 120),
    # Block C
    ('DS_C1', 'DS_C2', 'dc1-as', 'dc2-as', '10.1.19.254/22', 50),
    ('DS_C1', 'DS_C2', 'dc1-as', 'dc2-as', '10.1.23.254/22', 60),
    ('DS_C1', 'DS_C2', 'dc1-as', 'dc2-as', '10.2.2.254/24', 130),
    # Services
    ('DS_S1', 'DS_S2', 'ds1-as', 'ds2-as', '10.3.0.14/28', 91),
    ('DS_S1', 'DS_S2', 'ds1-as', 'ds2-as', '10.3.0.30/28', 92),
    ('DS_S1', 'DS_S2', 'ds1-as', 'ds2-as', '10.3.0.46/28', 93),
    ('DS_S1', 'DS_S2', 'ds1-as', 'ds2-as', '10.3.0.62/28', 94),
]

# Uplink interfaces to track per distribution switch (for VRRP failover)
UPLINK_INTERFACES = {
    'DS_A1': ['da1-cs1', 'da1-cs2'],
    'DS_A2': ['da2-cs1', 'da2-cs2'],
    'DS_B1': ['db1-cs1', 'db1-cs2'],
    'DS_B2': ['db2-cs1', 'db2-cs2'],
    'DS_C1': ['dc1-cs1', 'dc1-cs2'],
    'DS_C2': ['dc2-cs1', 'dc2-cs2'],
    'DS_S1': ['ds1-cs1', 'ds1-cs2'],
    'DS_S2': ['ds2-cs1', 'ds2-cs2'],
}


# OSPF config per router
OSPF_CONFIG = {
    'CS1': {'router_id': '1.1.1.1', 'interfaces': ['cs1-cs2', 'cs1-da1', 'cs1-da2', 'cs1-db1', 'cs1-db2', 'cs1-dc1', 'cs1-dc2', 'cs1-ds1', 'cs1-ds2', 'cs1-edge']},
    'CS2': {'router_id': '2.2.2.2', 'interfaces': ['cs2-cs1', 'cs2-da1', 'cs2-da2', 'cs2-db1', 'cs2-db2', 'cs2-dc1', 'cs2-dc2', 'cs2-ds1', 'cs2-ds2', 'cs2-edge']},
    'DS_A1': {'router_id': '3.3.3.1', 'interfaces': ['da1-peer', 'da1-cs1', 'da1-cs2']},
    'DS_A2': {'router_id': '3.3.3.2', 'interfaces': ['da2-peer', 'da2-cs1', 'da2-cs2']},
    'DS_B1': {'router_id': '4.4.4.1', 'interfaces': ['db1-peer', 'db1-cs1', 'db1-cs2']},
    'DS_B2': {'router_id': '4.4.4.2', 'interfaces': ['db2-peer', 'db2-cs1', 'db2-cs2']},
    'DS_C1': {'router_id': '5.5.5.1', 'interfaces': ['dc1-peer', 'dc1-cs1', 'dc1-cs2']},
    'DS_C2': {'router_id': '5.5.5.2', 'interfaces': ['dc2-peer', 'dc2-cs1', 'dc2-cs2']},
    'DS_S1': {'router_id': '6.6.6.1', 'interfaces': ['ds1-peer', 'ds1-cs1', 'ds1-cs2']},
    'DS_S2': {'router_id': '6.6.6.2', 'interfaces': ['ds2-peer', 'ds2-cs1', 'ds2-cs2']},
    'EDGE': {'router_id': '7.7.7.7', 'interfaces': ['edge-cs1', 'edge-cs2']},
}


# Host definitions
HOST_CONFIG = {
    'h1':  {'ip': '10.1.0.51/22',  'gw': '10.1.3.254',  'access': 'AS_A1'},
    'h2':  {'ip': '10.1.0.52/22',  'gw': '10.1.3.254',  'access': 'AS_A1'},
    'h3':  {'ip': '10.1.0.53/22',  'gw': '10.1.3.254',  'access': 'AS_A1'},
    'h4':  {'ip': '10.1.12.51/22', 'gw': '10.1.15.254', 'access': 'AS_A1'},
    'h5':  {'ip': '10.1.12.52/22', 'gw': '10.1.15.254', 'access': 'AS_A1'},
    'h6':  {'ip': '10.1.12.53/22', 'gw': '10.1.15.254', 'access': 'AS_A1'},
    'h7':  {'ip': '10.2.0.51/24',  'gw': '10.2.0.254',  'access': 'AS_A1'},
    'h8':  {'ip': '10.2.0.52/24',  'gw': '10.2.0.254',  'access': 'AS_A1'},
    'h9':  {'ip': '10.2.0.53/24',  'gw': '10.2.0.254',  'access': 'AS_A1'},
    'h10': {'ip': '10.1.4.51/22',  'gw': '10.1.7.254',  'access': 'AS_B1'},
    'h11': {'ip': '10.1.4.52/22',  'gw': '10.1.7.254',  'access': 'AS_B1'},
    'h12': {'ip': '10.1.4.53/22',  'gw': '10.1.7.254',  'access': 'AS_B1'},
    'h13': {'ip': '10.1.8.51/22',  'gw': '10.1.11.254', 'access': 'AS_B1'},
    'h14': {'ip': '10.1.8.52/22',  'gw': '10.1.11.254', 'access': 'AS_B1'},
    'h15': {'ip': '10.1.8.53/22',  'gw': '10.1.11.254', 'access': 'AS_B1'},
    'h16': {'ip': '10.2.1.51/24',  'gw': '10.2.1.254',  'access': 'AS_B1'},
    'h17': {'ip': '10.2.1.52/24',  'gw': '10.2.1.254',  'access': 'AS_B1'},
    'h18': {'ip': '10.2.1.53/24',  'gw': '10.2.1.254',  'access': 'AS_B1'},
    'h19': {'ip': '10.1.16.51/22', 'gw': '10.1.19.254', 'access': 'AS_C1'},
    'h20': {'ip': '10.1.16.52/22', 'gw': '10.1.19.254', 'access': 'AS_C1'},
    'h21': {'ip': '10.1.16.53/22', 'gw': '10.1.19.254', 'access': 'AS_C1'},
    'h22': {'ip': '10.1.20.51/22', 'gw': '10.1.23.254', 'access': 'AS_C1'},
    'h23': {'ip': '10.1.20.52/22', 'gw': '10.1.23.254', 'access': 'AS_C1'},
    'h24': {'ip': '10.1.20.53/22', 'gw': '10.1.23.254', 'access': 'AS_C1'},
    'h25': {'ip': '10.2.2.51/24',  'gw': '10.2.2.254',  'access': 'AS_C1'},
    'h26': {'ip': '10.2.2.52/24',  'gw': '10.2.2.254',  'access': 'AS_C1'},
    'h27': {'ip': '10.2.2.53/24',  'gw': '10.2.2.254',  'access': 'AS_C1'},
}

SERVICE_CONFIG = {
    'erp1':     {'ip': '10.3.0.1/28',  'gw': '10.3.0.14'},
    'hr1':      {'ip': '10.3.0.17/28', 'gw': '10.3.0.30'},
    'monitor1': {'ip': '10.3.0.18/28', 'gw': '10.3.0.30'},
    'it1':      {'ip': '10.3.0.33/28', 'gw': '10.3.0.46'},
    'voip1':    {'ip': '10.3.0.49/28', 'gw': '10.3.0.62'},
    'dhcp1':    {'ip': '10.3.0.50/28', 'gw': '10.3.0.62'},
}


# ═══════════════════════════════════════════════════════════════
# TOPOLOGY BUILDER
# ═══════════════════════════════════════════════════════════════
class RoutedTraditionalTopo(Topo):
    """Routed hierarchical topology with named interfaces."""

    def build(self):
        info('*** Building Routed Traditional Topology (v3) ***\n')

        # Core + Distribution + Edge as Linux Routers (run FRR)
        routers = {}
        for name in ['CS1', 'CS2', 'DS_A1', 'DS_A2', 'DS_B1', 'DS_B2',
                     'DS_C1', 'DS_C2', 'DS_S1', 'DS_S2', 'EDGE']:
            routers[name] = self.addNode(name, cls=LinuxRouter, ip=None)

        # Access switches (L2 only — OVS in standalone mode)
        switches = {}
        for name in ['AS_A1', 'AS_B1', 'AS_C1', 'AS_S1']:
            switches[name] = self.addSwitch(name, failMode='standalone')

        # ── Point-to-point links between routers ──
        intf_count = {}
        for name in routers:
            intf_count[name] = 0

        def add_routed_link(nodeA_name, nodeB_name, intfA_name, intfB_name):
            intf_count[nodeA_name] += 1
            intf_count[nodeB_name] += 1
            self.addLink(
                routers[nodeA_name], routers[nodeB_name],
                intfName1=intfA_name, intfName2=intfB_name,
                params1={'ip': None}, params2={'ip': None}
            )

        # Core interconnect
        add_routed_link('CS1', 'CS2', 'cs1-cs2', 'cs2-cs1')
        # Block A
        add_routed_link('DS_A1', 'DS_A2', 'da1-peer', 'da2-peer')
        add_routed_link('CS1', 'DS_A1', 'cs1-da1', 'da1-cs1')
        add_routed_link('CS2', 'DS_A1', 'cs2-da1', 'da1-cs2')
        add_routed_link('CS1', 'DS_A2', 'cs1-da2', 'da2-cs1')
        add_routed_link('CS2', 'DS_A2', 'cs2-da2', 'da2-cs2')
        # Block B
        add_routed_link('DS_B1', 'DS_B2', 'db1-peer', 'db2-peer')
        add_routed_link('CS1', 'DS_B1', 'cs1-db1', 'db1-cs1')
        add_routed_link('CS2', 'DS_B1', 'cs2-db1', 'db1-cs2')
        add_routed_link('CS1', 'DS_B2', 'cs1-db2', 'db2-cs1')
        add_routed_link('CS2', 'DS_B2', 'cs2-db2', 'db2-cs2')
        # Block C
        add_routed_link('DS_C1', 'DS_C2', 'dc1-peer', 'dc2-peer')
        add_routed_link('CS1', 'DS_C1', 'cs1-dc1', 'dc1-cs1')
        add_routed_link('CS2', 'DS_C1', 'cs2-dc1', 'dc1-cs2')
        add_routed_link('CS1', 'DS_C2', 'cs1-dc2', 'dc2-cs1')
        add_routed_link('CS2', 'DS_C2', 'cs2-dc2', 'dc2-cs2')
        # Services
        add_routed_link('DS_S1', 'DS_S2', 'ds1-peer', 'ds2-peer')
        add_routed_link('CS1', 'DS_S1', 'cs1-ds1', 'ds1-cs1')
        add_routed_link('CS2', 'DS_S1', 'cs2-ds1', 'ds1-cs2')
        add_routed_link('CS1', 'DS_S2', 'cs1-ds2', 'ds2-cs1')
        add_routed_link('CS2', 'DS_S2', 'cs2-ds2', 'ds2-cs2')
        # Edge
        add_routed_link('EDGE', 'CS1', 'edge-cs1', 'cs1-edge')
        add_routed_link('EDGE', 'CS2', 'edge-cs2', 'cs2-edge')

        # ── Distribution to Access links ──
        self.addLink(routers['DS_A1'], switches['AS_A1'],
                     intfName1='da1-as', params1={'ip': None})
        self.addLink(routers['DS_A2'], switches['AS_A1'],
                     intfName1='da2-as', params1={'ip': None})
        self.addLink(routers['DS_B1'], switches['AS_B1'],
                     intfName1='db1-as', params1={'ip': None})
        self.addLink(routers['DS_B2'], switches['AS_B1'],
                     intfName1='db2-as', params1={'ip': None})
        self.addLink(routers['DS_C1'], switches['AS_C1'],
                     intfName1='dc1-as', params1={'ip': None})
        self.addLink(routers['DS_C2'], switches['AS_C1'],
                     intfName1='dc2-as', params1={'ip': None})
        self.addLink(routers['DS_S1'], switches['AS_S1'],
                     intfName1='ds1-as', params1={'ip': None})
        self.addLink(routers['DS_S2'], switches['AS_S1'],
                     intfName1='ds2-as', params1={'ip': None})

        # ── Edge WAN link ──
        inet = self.addHost('INET', ip='198.51.100.100/24',
                            defaultRoute='via 198.51.100.1')
        self.addLink(inet, routers['EDGE'], intfName2='edge-wan',
                     params2={'ip': '198.51.100.1/24'})

        # ── Hosts ──
        for name, cfg in HOST_CONFIG.items():
            h = self.addHost(name, ip=cfg['ip'],
                             defaultRoute=f'via {cfg["gw"]}')
            self.addLink(h, switches[cfg['access']])

        # ── Services ──
        for name, cfg in SERVICE_CONFIG.items():
            h = self.addHost(name, ip=cfg['ip'],
                             defaultRoute=f'via {cfg["gw"]}')
            self.addLink(h, switches['AS_S1'])

        info('*** Topology built: 11 routers, 4 switches, 27 hosts, '
             '6 services, 1 internet\n')


# ═══════════════════════════════════════════════════════════════
# NETWORK CONFIGURATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════
def configure_p2p_addresses(net):
    """Assign /30 IPs to all point-to-point interfaces."""
    info('*** Configuring point-to-point link addresses ***\n')
    for intf_name, (ip, nodeA, nodeB, ip_b, intf_b) in P2P_LINKS.items():
        nodeA_obj = net.get(nodeA)
        nodeB_obj = net.get(nodeB)
        if nodeA_obj:
            nodeA_obj.cmd(f'ip addr add {ip} dev {intf_name} 2>/dev/null')
            nodeA_obj.cmd(f'ip link set {intf_name} up')
        if nodeB_obj:
            nodeB_obj.cmd(f'ip addr add {ip_b} dev {intf_b} 2>/dev/null')
            nodeB_obj.cmd(f'ip link set {intf_b} up')


def configure_vlan_svis(net):
    """Create VLAN SVIs on distribution routers (gateway interfaces)."""
    info('*** Configuring VLAN SVIs on distribution routers ***\n')
    short_map = {
        'DS_A1': 'da1', 'DS_A2': 'da2',
        'DS_B1': 'db1', 'DS_B2': 'db2',
        'DS_C1': 'dc1', 'DS_C2': 'dc2',
        'DS_S1': 'ds1', 'DS_S2': 'ds2',
    }
    for router_name, svis in VLAN_SVIS.items():
        router = net.get(router_name)
        if not router:
            continue
        as_intf = f'{short_map[router_name]}-as'
        router.cmd(f'ip link set {as_intf} up')
        for svi_name, ip in svis.items():
            router.cmd(f'ip addr add {ip} dev {as_intf} 2>/dev/null')
        info(f'  {router_name}: {len(svis)} SVIs on {as_intf}\n')


def generate_keepalived_conf(router_name, role, intf, instances):
    """Generate keepalived.conf content for a distribution router.

    Args:
        router_name: e.g. 'DS_A1'
        role: 'MASTER' or 'BACKUP'
        intf: interface name for VIPs (e.g. 'da1-as')
        instances: list of (vip_cidr, vrid) tuples for this router
    """
    priority = 100 if role == 'MASTER' else 90
    uplinks = UPLINK_INTERFACES.get(router_name, [])

    conf_lines = [
        f'! keepalived configuration for {router_name} ({role})',
        'global_defs {',
        f'   router_id {router_name}',
        '   vrrp_version 2',
        '}',
        '',
    ]

    # Track script for uplink monitoring
    conf_lines += [
        'vrrp_script chk_uplinks {',
        f'   script "/bin/bash -c \'for i in {" ".join(uplinks)}; '
        f'do ip link show $i | grep -q UP || exit 1; done\'"',
        '   interval 2',
        '   weight -20',
        '   fall 2',
        '   rise 2',
        '}',
        '',
    ]

    for vip_cidr, vrid in instances:
        vip_addr = vip_cidr.split('/')[0]
        vip_mask = vip_cidr.split('/')[1]
        instance_name = f'VLAN_{vrid}'

        conf_lines += [
            f'vrrp_instance {instance_name} {{',
            f'    state {role}',
            f'    interface {intf}',
            f'    virtual_router_id {vrid}',
            f'    priority {priority}',
            '    advert_int 1',
            '    authentication {',
            '        auth_type PASS',
            f'        auth_pass vlan{vrid}',
            '    }',
            '    track_script {',
            '        chk_uplinks',
            '    }',
            '    virtual_ipaddress {',
            f'        {vip_addr}/{vip_mask}',
            '    }',
            '}',
            '',
        ]

    return '\n'.join(conf_lines)


def configure_vrrp_keepalived(net):
    """Configure and start keepalived VRRP on all distribution pairs."""
    info('*** Configuring VRRP with keepalived ***\n')

    short_map = {
        'DS_A1': 'da1', 'DS_A2': 'da2',
        'DS_B1': 'db1', 'DS_B2': 'db2',
        'DS_C1': 'dc1', 'DS_C2': 'dc2',
        'DS_S1': 'ds1', 'DS_S2': 'ds2',
    }

    # Group VRRP instances by master/backup router
    router_instances = {}  # router_name -> [(vip_cidr, vrid), ...]
    for master, backup, m_intf, b_intf, vip_cidr, vrid in VRRP_INSTANCES:
        router_instances.setdefault(master, {'intf': m_intf, 'role': 'MASTER', 'vips': []})
        router_instances[master]['vips'].append((vip_cidr, vrid))
        router_instances.setdefault(backup, {'intf': b_intf, 'role': 'BACKUP', 'vips': []})
        router_instances[backup]['vips'].append((vip_cidr, vrid))

    for router_name, cfg in router_instances.items():
        router = net.get(router_name)
        if not router:
            continue

        intf = cfg['intf']
        role = cfg['role']
        instances = cfg['vips']

        # Generate keepalived config
        conf_content = generate_keepalived_conf(router_name, role, intf, instances)

        # Write config file
        conf_path = f'/tmp/keepalived_{router_name}.conf'
        pid_path = f'/tmp/keepalived_{router_name}.pid'
        log_path = f'/tmp/keepalived_{router_name}.log'

        router.cmd(f"cat > {conf_path} << 'KEEPALIVED_EOF'\n{conf_content}KEEPALIVED_EOF")

        # Start keepalived with separate pid and log
        router.cmd(f'keepalived -f {conf_path} '
                   f'-p {pid_path} '
                   f'--log-file={log_path} '
                   f'-D 2>/dev/null &')

        info(f'  [{role}] {router_name}: keepalived started '
             f'({len(instances)} VIPs on {intf})\n')

    info(f'  VRRP: {len(VRRP_INSTANCES)} virtual IPs managed by keepalived\n')


def start_ospf(net):
    """Start FRR OSPF on all routers with point-to-point links."""
    info('*** Starting OSPF (FRR) on all routers ***\n')

    for router_name, cfg in OSPF_CONFIG.items():
        router = net.get(router_name)
        if not router:
            continue

        router_id = cfg['router_id']
        interfaces = cfg['interfaces']

        # Create FRR config directory
        conf_dir = f'/tmp/frr_{router_name}'
        router.cmd(f'rm -rf {conf_dir} 2>/dev/null')
        router.cmd(f'mkdir -p {conf_dir}')
        router.cmd(f'chown frr:frr {conf_dir} 2>/dev/null')

        # Build zebra.conf
        zebra_conf = f'hostname {router_name}\nlog file {conf_dir}/zebra.log\n'
        router.cmd(f"cat > {conf_dir}/zebra.conf << 'EOF'\n{zebra_conf}EOF")
        router.cmd(f'chown frr:frr {conf_dir}/zebra.conf 2>/dev/null')

        # Build ospfd.conf
        ospf_lines = [
            f'hostname {router_name}',
            f'log file {conf_dir}/ospfd.log',
            '!',
        ]

        # Configure each interface as point-to-point with fast timers
        for intf in interfaces:
            ospf_lines.append(f'interface {intf}')
            ospf_lines.append(f' ip ospf network point-to-point')
            ospf_lines.append(f' ip ospf hello-interval 2')
            ospf_lines.append(f' ip ospf dead-interval 8')
            ospf_lines.append('!')

        # OSPF router config
        ospf_lines.append('router ospf')
        ospf_lines.append(f' ospf router-id {router_id}')
        ospf_lines.append(' redistribute connected')

        # Network statements for P2P interfaces
        added_networks = set()
        for intf in interfaces:
            ip_str = None
            if intf in P2P_LINKS:
                ip_str = P2P_LINKS[intf][0]
            else:
                for key, val in P2P_LINKS.items():
                    if val[4] == intf:
                        ip_str = val[3]
                        break
            if ip_str:
                ip_only = ip_str.split('/')[0]
                parts = ip_only.split('.')
                last_octet = int(parts[3])
                net_octet = last_octet & 0xFC
                network = f'{parts[0]}.{parts[1]}.{parts[2]}.{net_octet}/30'
                if network not in added_networks:
                    ospf_lines.append(f' network {network} area 0.0.0.0')
                    added_networks.add(network)

        # Add VLAN networks as passive interfaces
        if router_name in VLAN_SVIS:
            for svi_name, ip in VLAN_SVIS[router_name].items():
                ip_only = ip.split('/')[0]
                mask = ip.split('/')[1]
                parts = ip_only.split('.')
                if mask == '22':
                    net_third = int(parts[2]) & 0xFC
                    network = f'{parts[0]}.{parts[1]}.{net_third}.0/22'
                elif mask == '24':
                    network = f'{parts[0]}.{parts[1]}.{parts[2]}.0/24'
                elif mask == '28':
                    net_last = int(parts[3]) & 0xF0
                    network = f'{parts[0]}.{parts[1]}.{parts[2]}.{net_last}/28'
                else:
                    network = f'{ip_only}/{mask}'
                if network not in added_networks:
                    ospf_lines.append(f' network {network} area 0.0.0.0')
                    added_networks.add(network)

        # Default route origination for EDGE
        if router_name == 'EDGE':
            ospf_lines.append(' default-information originate always')

        ospf_lines.append('!')
        ospf_conf = '\n'.join(ospf_lines) + '\n'
        router.cmd(f"cat > {conf_dir}/ospfd.conf << 'EOF'\n{ospf_conf}EOF")
        router.cmd(f'chown frr:frr {conf_dir}/ospfd.conf 2>/dev/null')

        # Start zebra
        router.cmd(f'/usr/lib/frr/zebra -f {conf_dir}/zebra.conf -d -u frr -g frr '
                   f'-z {conf_dir}/zebra.sock -i {conf_dir}/zebra.pid '
                   f'--vty_socket {conf_dir} '
                   f'--log file:{conf_dir}/zebra.log 2>/dev/null')
        time.sleep(1.5)

        # Start ospfd
        router.cmd(f'/usr/lib/frr/ospfd -f {conf_dir}/ospfd.conf -d -u frr -g frr '
                   f'-z {conf_dir}/zebra.sock -i {conf_dir}/ospfd.pid '
                   f'--vty_socket {conf_dir} '
                   f'--log file:{conf_dir}/ospfd.log 2>/dev/null')

        info(f'  [OSPF] Started on {router_name} (router-id {router_id})\n')

    info('*** OSPF started on all 11 routers\n')


def configure_edge_routing(net):
    """Configure default route and NAT on edge router."""
    info('*** Configuring EDGE router (default route + NAT) ***\n')
    edge = net.get('EDGE')
    if edge:
        edge.cmd('ip route add default via 198.51.100.254 dev edge-wan 2>/dev/null')
        edge.cmd('iptables -t nat -A POSTROUTING -o edge-wan -j MASQUERADE')
        edge.cmd('iptables -A FORWARD -i edge-wan -m state '
                 '--state ESTABLISHED,RELATED -j ACCEPT')
        edge.cmd('iptables -A FORWARD -o edge-wan -j ACCEPT')
    inet = net.get('INET')
    if inet:
        inet.cmd('ip route add 10.0.0.0/8 via 198.51.100.1')
        inet.cmd('ip route add 172.16.0.0/12 via 198.51.100.1')


def run_diagnostics(net):
    """Run connectivity tests after OSPF convergence."""
    info('\n*** Running connectivity diagnostics ***\n')

    tests = [
        ('h1', 'h2', 'Same subnet (VLAN 10)'),
        ('h1', 'h4', 'Cross-VLAN same block (10→40)'),
        ('h1', 'h10', 'Cross-block (A→B)'),
        ('h1', 'h19', 'Cross-block (A→C)'),
        ('h10', 'h19', 'Cross-block (B→C)'),
        ('h1', 'erp1', 'Host → ERP service'),
        ('h13', 'it1', 'IT host → IT service'),
        ('h19', 'voip1', 'Corporate → VoIP'),
        ('h7', 'INET', 'Guest → Internet'),
    ]

    passed = 0
    for src, dst, desc in tests:
        h_src = net.get(src)
        h_dst = net.get(dst)
        if h_src and h_dst:
            result = h_src.cmd(f'ping -c 2 -W 3 {h_dst.IP()} 2>&1')
            ok = ping_success(result)
            status = '✓' if ok else '✗'
            if ok:
                passed += 1
            info(f'  {status} {src} → {dst} ({desc})\n')

    info(f'\n  Results: {passed}/{len(tests)} connectivity tests passed\n')

    # Show OSPF neighbor status on CS1
    info('\n*** OSPF Neighbor Summary (CS1) ***\n')
    cs1 = net.get('CS1')
    if cs1:
        output = cs1.cmd('vtysh --vty_socket /tmp/frr_CS1 '
                         '-c "show ip ospf neighbor" 2>/dev/null')
        info(f'{output}\n')

    # Show keepalived VIP status
    info('*** VRRP VIP Status ***\n')
    for router_name in ['DS_A1', 'DS_B1', 'DS_C1', 'DS_S1']:
        router = net.get(router_name)
        if router:
            short_map = {'DS_A1': 'da1', 'DS_B1': 'db1',
                         'DS_C1': 'dc1', 'DS_S1': 'ds1'}
            intf = f'{short_map[router_name]}-as'
            output = router.cmd(f'ip addr show {intf} | grep "inet "')
            info(f'  {router_name} ({intf}): {output.strip()}\n')

    return passed


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
def run(start_cli=True):
    """Start the routed traditional network with proper keepalived VRRP."""
    setLogLevel('info')

    # Clean previous
    subprocess.call('mn -c 2>/dev/null || true', shell=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.call('pkill -f keepalived 2>/dev/null || true', shell=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    info('\n' + '═' * 70 + '\n')
    info('  TRADITIONAL ROUTED NETWORK v3 (OSPF + Proper keepalived VRRP)\n')
    info('═' * 70 + '\n\n')

    topo = RoutedTraditionalTopo()
    net = Mininet(topo=topo, controller=None, link=TCLink)
    net.start()

    # Step 1: Assign /30 P2P addresses
    configure_p2p_addresses(net)

    # Step 2: Configure VLAN SVIs on distribution
    configure_vlan_svis(net)

    # Step 3: Configure edge routing + NAT
    configure_edge_routing(net)

    # Step 4: Start OSPF on all routers
    start_ospf(net)

    # Step 5: Start keepalived VRRP (after OSPF so interfaces are up)
    time.sleep(5)
    configure_vrrp_keepalived(net)

    # Wait for OSPF convergence
    info('\n*** Waiting for OSPF convergence (30 seconds)...\n')
    time.sleep(30)

    # Step 6: Diagnostics
    run_diagnostics(net)

    info('\n*** Routed Traditional Network v3 ready ***\n')
    info('  OSPF: 11 routers with point-to-point adjacencies\n')
    info('  VRRP: 13 per-VLAN VIPs managed by keepalived\n')
    info('  Failover: uplink tracking decreases priority on failure\n')
    info('\n  Useful commands:\n')
    info('    CS1 vtysh --vty_socket /tmp/frr_CS1 -c "show ip ospf neighbor"\n')
    info('    CS1 vtysh --vty_socket /tmp/frr_CS1 -c "show ip route"\n')
    info('    DS_A1 cat /tmp/keepalived_DS_A1.log\n')
    info('    DS_A1 ip addr show da1-as\n')
    info('    h1 traceroute 10.1.4.51\n')

    if start_cli:
        CLI(net)
    net.stop()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Traditional Routed Network v3 (OSPF + Proper keepalived VRRP)')
    parser.add_argument('--no-cli', action='store_true',
                        help='Run without interactive CLI')
    args = parser.parse_args()
    run(start_cli=not args.no_cli)
