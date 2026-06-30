"""
Performance Baseline Test — Complete Latency, Throughput, Packet Loss, Jitter, Recovery Time

Runs all 5 performance metrics for both Traditional and SDN architectures.
Results are posted to the dashboard API.

Usage:
    sudo python3 performance_baseline_test.py --mode traditional
    sudo python3 performance_baseline_test.py --mode sdn
    sudo python3 performance_baseline_test.py --mode both
"""

import argparse
import time
import json
import subprocess
from mininet.topo import Topo
from mininet.net import Mininet
from mininet.node import OVSKernelSwitch, RemoteController
from mininet.log import setLogLevel, info, error
from mininet.link import TCLink


def ping_success(output):
    return ("1 received" in output or "2 received" in output or "3 received" in output)


def dpid(n):
    return f'{n:016x}'


VLAN_CONFIG = {
    10: {'gw': '10.1.3.254', 'pool': '10.1.0.', 'mask': '/22'},
    20: {'gw': '10.1.7.254', 'pool': '10.1.4.', 'mask': '/22'},
    30: {'gw': '10.1.11.254', 'pool': '10.1.8.', 'mask': '/22'},
    40: {'gw': '10.1.15.254', 'pool': '10.1.12.', 'mask': '/22'},
    50: {'gw': '10.1.19.254', 'pool': '10.1.16.', 'mask': '/22'},
    60: {'gw': '10.1.23.254', 'pool': '10.1.20.', 'mask': '/22'},
}

SERVICE_CONFIG = {
    'erp1': {'ip': '10.3.0.1/28'},
    'hr1': {'ip': '10.3.0.17/28'},
    'it1': {'ip': '10.3.0.33/28'},
    'voip1': {'ip': '10.3.0.49/28'},
}

SWITCH_DPIDS = {
    'CS1': dpid(1), 'CS2': dpid(2),
    'DS_A1': dpid(11), 'DS_A2': dpid(12),
    'DS_B1': dpid(13), 'DS_B2': dpid(14),
    'DS_C1': dpid(15), 'DS_C2': dpid(16),
    'DS_S1': dpid(17), 'DS_S2': dpid(18),
    'AS_A1': dpid(21), 'AS_B1': dpid(22),
    'AS_C1': dpid(23), 'AS_S1': dpid(24),
}


class PerformanceTopo(Topo):
    def build(self):
        switches = {}
        for name, did in SWITCH_DPIDS.items():
            switches[name] = self.addSwitch(name, cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=did)

        # Core links
        self.addLink(switches['CS1'], switches['CS2'], cls=TCLink, bw=1000)
        for ds in ['DS_A1', 'DS_A2', 'DS_B1', 'DS_B2', 'DS_C1', 'DS_C2', 'DS_S1', 'DS_S2']:
            self.addLink(switches['CS1'], switches[ds], cls=TCLink, bw=1000)
            self.addLink(switches['CS2'], switches[ds], cls=TCLink, bw=1000)

        # Distribution pairs
        for a, b in [('DS_A1', 'DS_A2'), ('DS_B1', 'DS_B2'), ('DS_C1', 'DS_C2'), ('DS_S1', 'DS_S2')]:
            self.addLink(switches[a], switches[b])

        # Distribution to Access
        for ds1, ds2, access in [('DS_A1', 'DS_A2', 'AS_A1'), ('DS_B1', 'DS_B2', 'AS_B1'),
                                  ('DS_C1', 'DS_C2', 'AS_C1'), ('DS_S1', 'DS_S2', 'AS_S1')]:
            self.addLink(switches[ds1], switches[access])
            self.addLink(switches[ds2], switches[access])

        # Hosts (3 per VLAN, 6 VLANs = 18 user hosts)
        host_idx = 1
        host_access = {'AS_A1': [10, 40], 'AS_B1': [20, 30], 'AS_C1': [50, 60]}
        for access_sw, vlans in host_access.items():
            for vlan in vlans:
                for i in range(3):
                    ip = f'{VLAN_CONFIG[vlan]["pool"]}{50 + host_idx}'
                    h = self.addHost(f'h{host_idx}', ip=f'{ip}{VLAN_CONFIG[vlan]["mask"]}',
                                     defaultRoute=f'via {VLAN_CONFIG[vlan]["gw"]}')
                    self.addLink(switches[access_sw], h)
                    host_idx += 1

        # Services
        for name, cfg in SERVICE_CONFIG.items():
            h = self.addHost(name, ip=cfg['ip'])
            self.addLink(switches['AS_S1'], h)


def ping_latency(net, src_name, dst_name, count=20):
    """Ping and get latency stats."""
    src = net.get(src_name)
    dst = net.get(dst_name)
    if not src or not dst:
        return {'avg': 0, 'min': 0, 'max': 0, 'loss': 100, 'jitter': 0}

    result = src.cmd(f'ping -c {count} -i 0.2 {dst.IP()} 2>&1')
    stats = {'avg': 0, 'min': 0, 'max': 0, 'loss': 100, 'jitter': 0}

    for line in result.split('\n'):
        if 'rtt min/avg/max' in line or 'round-trip min/avg/max' in line:
            parts = line.split('=')[1].strip().split('/')
            stats['min'] = float(parts[0])
            stats['avg'] = float(parts[1])
            stats['max'] = float(parts[2].split()[0])
            if len(parts) > 3:
                stats['jitter'] = float(parts[3].split()[0])
            else:
                stats['jitter'] = stats['max'] - stats['min']
        if 'packet loss' in line:
            for part in line.split(','):
                if 'packet loss' in part:
                    stats['loss'] = float(part.strip().split('%')[0].split()[-1])
    return stats


def iperf_throughput(net, src_name, dst_name, duration=10):
    """Run iperf3 TCP throughput test."""
    src = net.get(src_name)
    dst = net.get(dst_name)
    if not src or not dst:
        return {'bps': 0, 'mbps': 0}

    # Start server
    dst.cmd('iperf3 -s -p 5201 -D 2>/dev/null')
    time.sleep(1)

    # Run client
    result = src.cmd(f'iperf3 -c {dst.IP()} -p 5201 -t {duration} -J 2>/dev/null')
    dst.cmd('pkill -f "iperf3 -s" 2>/dev/null')

    try:
        data = json.loads(result)
        bps = data.get('end', {}).get('sum_sent', {}).get('bits_per_second', 0)
        return {'bps': bps, 'mbps': round(bps / 1_000_000, 2)}
    except (json.JSONDecodeError, KeyError):
        return {'bps': 0, 'mbps': 0}


def failover_recovery(net, mode):
    """Measure failover recovery time by bringing down CS1."""
    info('\n  ── Failover Recovery Time Test ──\n')

    # Baseline ping
    h1 = net.get('h1')
    h10 = net.get('h10')
    baseline = h1.cmd(f'ping -c 3 -W 2 {h10.IP()} 2>&1')
    if not ping_success(baseline):
        return {'recovery_ms': 0, 'paths_survived': 0}

    # Bring down CS1 links
    cs1_links = []
    for link in net.links:
        n1 = link.intf1.node.name if link.intf1.node else ''
        n2 = link.intf2.node.name if link.intf2.node else ''
        if n1 == 'CS1' or n2 == 'CS1':
            cs1_links.append(link)

    start_time = time.time()
    for link in cs1_links:
        link.intf1.ifconfig('down')
        link.intf2.ifconfig('down')

    # Wait for convergence and measure
    recovered = False
    recovery_time = 0
    for attempt in range(30):
        time.sleep(1)
        result = h1.cmd(f'ping -c 1 -W 1 {h10.IP()} 2>&1')
        if ping_success(result):
            recovery_time = (time.time() - start_time) * 1000
            recovered = True
            break

    # Restore links
    for link in cs1_links:
        link.intf1.ifconfig('up')
        link.intf2.ifconfig('up')
    time.sleep(3)

    # Count surviving paths
    test_pairs = [('h1', 'h10'), ('h1', 'h13'), ('h4', 'h16'), ('h7', 'h19'), ('h10', 'h22')]
    paths_ok = 0
    for src, dst in test_pairs:
        s = net.get(src)
        d = net.get(dst)
        r = s.cmd(f'ping -c 2 -W 2 {d.IP()} 2>&1')
        if ping_success(r):
            paths_ok += 1

    return {'recovery_ms': round(recovery_time, 1), 'paths_survived': paths_ok, 'total_paths': 5}


def run_performance_test(mode):
    """Run complete performance baseline test."""
    info(f'\n{"═"*70}\n')
    info(f'  PERFORMANCE BASELINE TEST — {mode.upper()}\n')
    info(f'{"═"*70}\n\n')

    subprocess.call('mn -c 2>/dev/null || true', shell=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    topo = PerformanceTopo()

    if mode == 'sdn':
        net = Mininet(topo=topo, switch=OVSKernelSwitch,
                      controller=lambda name: RemoteController(name, ip='127.0.0.1', port=6633),
                      link=TCLink, build=True, ipBase='10.0.0.0/8')
    else:
        net = Mininet(topo=topo, switch=OVSKernelSwitch, controller=None,
                      link=TCLink, build=True, ipBase='10.0.0.0/8')

    net.start()

    for sw in net.switches:
        if mode == 'traditional':
            sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=standalone')
            sw.cmd(f'ovs-vsctl set bridge {sw.name} stp_enable=true')
        else:
            sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=secure')

    wait_time = 15 if mode == 'traditional' else 5
    info(f'  ⏳ Waiting for convergence ({wait_time}s)...\n')
    time.sleep(wait_time)

    results = {}

    # ── 1. Latency Test (20 pings across multiple paths) ──
    info('\n  ── TEST 1: Latency ──\n')
    latency_tests = [
        ('h1', 'h2', 'Intra-VLAN (Block A)'),
        ('h1', 'h10', 'Cross-block (A→B via core)'),
        ('h1', 'h13', 'Cross-block (A→C via core)'),
        ('h1', 'erp1', 'Host to Service (ERP)'),
        ('h10', 'voip1', 'Host to Service (VoIP)'),
    ]

    latencies = []
    for src, dst, desc in latency_tests:
        stats = ping_latency(net, src, dst, count=20)
        latencies.append(stats['avg'])
        info(f'    {src} → {dst} ({desc}): avg={stats["avg"]:.2f}ms, loss={stats["loss"]:.1f}%\n')

    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    results['latency'] = {'avg': round(avg_latency, 2), 'min': round(min(latencies), 2), 'max': round(max(latencies), 2)}
    info(f'    ▸ Average Latency: {avg_latency:.2f} ms\n')

    # ── 2. Throughput Test (iperf3) ──
    info('\n  ── TEST 2: Throughput ──\n')
    throughput_tests = [
        ('h1', 'h10', 'Cross-block'),
        ('h1', 'erp1', 'Host to Service'),
        ('h10', 'h13', 'Intra-block different VLAN'),
    ]

    throughputs = []
    for src, dst, desc in throughput_tests:
        tp = iperf_throughput(net, src, dst, duration=5)
        throughputs.append(tp['mbps'])
        info(f'    {src} → {dst} ({desc}): {tp["mbps"]} Mbps\n')

    avg_throughput = sum(throughputs) / len(throughputs) if throughputs else 0
    results['throughput'] = {'avg': round(avg_throughput, 2)}
    info(f'    ▸ Average Throughput: {avg_throughput:.2f} Mbps\n')

    # ── 3. Packet Loss Test ──
    info('\n  ── TEST 3: Packet Loss ──\n')
    losses = []
    for src, dst, desc in latency_tests:
        stats = ping_latency(net, src, dst, count=50)
        losses.append(stats['loss'])
        info(f'    {src} → {dst}: {stats["loss"]:.2f}% loss\n')

    avg_loss = sum(losses) / len(losses) if losses else 0
    results['packet_loss'] = {'avg': round(avg_loss, 3)}
    info(f'    ▸ Average Packet Loss: {avg_loss:.3f}%\n')

    # ── 4. Jitter Test ──
    info('\n  ── TEST 4: Jitter ──\n')
    jitters = []
    for src, dst, desc in latency_tests:
        stats = ping_latency(net, src, dst, count=30)
        jitters.append(stats['jitter'])
        info(f'    {src} → {dst}: jitter={stats["jitter"]:.2f}ms\n')

    avg_jitter = sum(jitters) / len(jitters) if jitters else 0
    results['jitter'] = {'avg': round(avg_jitter, 2)}
    info(f'    ▸ Average Jitter: {avg_jitter:.2f} ms\n')

    # ── 5. Recovery Time Test ──
    info('\n  ── TEST 5: Failover Recovery Time ──\n')
    recovery = failover_recovery(net, mode)
    results['recovery'] = recovery
    info(f'    ▸ Recovery Time: {recovery["recovery_ms"]} ms\n')
    info(f'    ▸ Paths Survived: {recovery["paths_survived"]}/{recovery["total_paths"]}\n')

    # ── Summary ──
    info(f'\n  {"─"*60}\n')
    info(f'  PERFORMANCE BASELINE SUMMARY — {mode.upper()}\n')
    info(f'  {"─"*60}\n')
    info(f'    Average Latency:     {results["latency"]["avg"]} ms\n')
    info(f'    Average Throughput:  {results["throughput"]["avg"]} Mbps\n')
    info(f'    Average Packet Loss: {results["packet_loss"]["avg"]}%\n')
    info(f'    Average Jitter:      {results["jitter"]["avg"]} ms\n')
    info(f'    Recovery Time:       {results["recovery"]["recovery_ms"]} ms\n')

    net.stop()
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Performance Baseline Test')
    parser.add_argument('--mode', choices=['traditional', 'sdn', 'both'], default='both')
    args = parser.parse_args()

    setLogLevel('info')
    trad_results = None
    sdn_results = None

    if args.mode in ('traditional', 'both'):
        trad_results = run_performance_test('traditional')

    if args.mode in ('sdn', 'both'):
        sdn_results = run_performance_test('sdn')

    # Comparison
    if args.mode == 'both' and trad_results and sdn_results:
        info(f'\n{"═"*70}\n')
        info(f'  PERFORMANCE COMPARISON: TRADITIONAL vs SDN\n')
        info(f'{"═"*70}\n')
        info(f'  ┌────────────────────┬─────────────────┬─────────────────┐\n')
        info(f'  │ Metric             │ Traditional     │ SDN             │\n')
        info(f'  ├────────────────────┼─────────────────┼─────────────────┤\n')
        info(f'  │ Latency (ms)       │ {trad_results["latency"]["avg"]:>15} │ {sdn_results["latency"]["avg"]:>15} │\n')
        info(f'  │ Throughput (Mbps)  │ {trad_results["throughput"]["avg"]:>15} │ {sdn_results["throughput"]["avg"]:>15} │\n')
        info(f'  │ Packet Loss (%)    │ {trad_results["packet_loss"]["avg"]:>15} │ {sdn_results["packet_loss"]["avg"]:>15} │\n')
        info(f'  │ Jitter (ms)        │ {trad_results["jitter"]["avg"]:>15} │ {sdn_results["jitter"]["avg"]:>15} │\n')
        info(f'  │ Recovery (ms)      │ {trad_results["recovery"]["recovery_ms"]:>15} │ {sdn_results["recovery"]["recovery_ms"]:>15} │\n')
        info(f'  └────────────────────┴─────────────────┴─────────────────┘\n')

    # Post results to dashboard
    try:
        from post_results import post_comparison, post_results as post_r

        def build_metrics(r):
            return [
                {"metric": "Average Latency", "value": r["latency"]["avg"], "unit": "ms",
                 "min": r["latency"]["min"], "max": r["latency"]["max"], "sampleSize": 5},
                {"metric": "Throughput", "value": r["throughput"]["avg"], "unit": "Mbps", "sampleSize": 3},
                {"metric": "Packet Loss", "value": r["packet_loss"]["avg"], "unit": "%", "sampleSize": 5},
                {"metric": "Jitter", "value": r["jitter"]["avg"], "unit": "ms", "sampleSize": 5},
                {"metric": "Recovery Time", "value": r["recovery"]["recovery_ms"], "unit": "ms", "sampleSize": 1},
            ]

        if args.mode == 'both' and trad_results and sdn_results:
            post_comparison("ping", build_metrics(trad_results), build_metrics(sdn_results),
                          script_name="performance_baseline_test.py")
        elif trad_results:
            post_r("ping", "TRADITIONAL", build_metrics(trad_results), script_name="performance_baseline_test.py")
        elif sdn_results:
            post_r("ping", "SDN", build_metrics(sdn_results), script_name="performance_baseline_test.py")
    except ImportError:
        pass
    except Exception as e:
        info(f'\n  ⚠ Could not post results: {e}\n')

    info(f'\n{"═"*70}\n')
    info(f'  PERFORMANCE BASELINE TEST COMPLETE\n')
    info(f'{"═"*70}\n')
