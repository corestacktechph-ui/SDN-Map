#!/bin/bash
# Setup script for GitHub Codespaces / devcontainer
# Installs Mininet, OVS, FRR, keepalived

set -e

echo "========================================"
echo "  SDN-MAP Environment Setup"
echo "========================================"

apt-get update -qq

# Core networking tools
apt-get install -y -qq \
  mininet \
  openvswitch-switch \
  openvswitch-testcontroller \
  frr \
  keepalived \
  iptables \
  iproute2 \
  iputils-ping \
  iperf3 \
  net-tools \
  tcpdump \
  python3 \
  python3-pip \
  python3-mininet \
  curl \
  git

# Enable OSPF in FRR
sed -i 's/ospfd=no/ospfd=yes/' /etc/frr/daemons
sed -i 's/zebra=no/zebra=yes/' /etc/frr/daemons

# Start OVS
service openvswitch-switch start || true

# Python dependencies
pip3 install -q matplotlib numpy requests

echo ""
echo "========================================"
echo "  Setup complete!"
echo "  Run: cd scripts/mininet"
echo "  Then: sudo python3 migration_phases.py --all"
echo "========================================"
