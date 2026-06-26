#!/bin/sh
for br in $(ovs-vsctl list-br 2>/dev/null); do
  ovs-vsctl del-br "$br" 2>/dev/null
done
ip link | grep -oP '^\d+: \K[^@: ]+(?=:)' | grep -E '^(CS|AS|DS|Edge|ISP)' | while read iface; do
  ip link delete "$iface" 2>/dev/null
done
echo "Remaining:"
ip link | grep -c -E '^(CS|AS|DS|Edge|ISP)'
