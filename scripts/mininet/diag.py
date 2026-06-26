#!/usr/bin/env python3
"""Quick diagnostic to test Mininet connectivity."""
import sys
from mininet.net import Mininet
from mininet.node import OVSSwitch

# Connect to the running Mininet instance
net = Mininet(topo=None, switch=OVSSwitch, build=False)

# Check h1's IP
h1 = net.get('h1')
print("=== h1 interfaces ===")
print(h1.cmd('ip addr show'))
print("=== h1 routing table ===")
print(h1.cmd('ip route show'))
print("=== ping h1 -> ERPSrv (10.1.91.10) ===")
print(h1.cmd('ping -c 2 -W 2 10.1.91.10'))

print("=== ping h1 -> DHCPSrv ===")
dhcp = net.get('DHCPSrv')
print(h1.cmd(f'ping -c 2 -W 2 {dhcp.IP()}'))

print("=== ARP table on h1 ===")
print(h1.cmd('ip neigh show'))

print("=== OVS flows on CS1 ===")
cs1 = net.get('CS1')
print(cs1.cmd('ovs-ofctl dump-flows CS1 2>/dev/null'))

net.stop()
