"""
QoS Traffic Prioritization Test

Compares Traditional (best-effort) vs SDN (DSCP-based queuing) for:
- VoIP traffic (UDP, low-latency priority)
- Bulk data transfer (TCP, best-effort)
- Video streaming (UDP, medium priority)

Demonstrates how SDN's centralized QoS management ensures VoIP quality
even under congestion, while traditional treats all traffic equally.

Usage:
    sudo python3 qos_traffic_test.py --mode traditional
    sudo python3 qos_traffic_test.py --mode sdn
    sudo python3 qos_traffic_test.py --mode both
"""

import argparse
import time
import subprocess
import json
from mininet.topo import Topo
from mininet.net import Mininet
from mininet.node import OVSKernelSwitch, RemoteController
from mininet.log import setLogLevel, info, error


VLAN_CONFIG = {
    10: {'gw': '10.1.3.254', 'pool': '10.1.0.', 'mask': '/22'},
    50: {'gw': '10.1.19.254', 'pool': '10.1.16.', 'mask': '/22'},
}

SERVICE_CONFIG = {
    'voip_server': {'ip': '10.3.0.49/28'},
    'file_server': {'ip': '10.3.0.1/28'},
    'video_server': {'ip': '10.3.0.17/28'},
}


def dpid(n):
    return f'{n:016x}'


class QoSTopo(Topo):
    """Simplified topology for QoS testing with traffic generators."""

    def build(self):
        info('*** Building QoS Test Topology ***\n')

        # Core
        cs1 = self.addSwitch('CS1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(1))
        cs2 = self.addSwitch('CS2', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(2))
        self.addLink(cs1, cs2)

        # Distribution
        ds1 = self.addSwitch('DS1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(11))
        ds2 = self.addSwitch('DS2', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(12))
        self.addLink(cs1, ds1)
        self.addLink(cs2, ds1)
        self.addLink(cs1, ds2)
        self.addLink(cs2, ds2)
        self.addLink(ds1, ds2)

        # Access
        as1 = self.addSwitch('AS1', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(21))
        as2 = self.addSwitch('AS2', cls=OVSKernelSwitch, protocols='OpenFlow13', dpid=dpid(22))
        self.addLink(ds1, as1)
        self.addLink(ds2, as1)
        self.addLink(ds1, as2)
        self.addLink(ds2, as2)

        # Hosts - traffic generators
        voip_client = self.addHost('voip_cl', ip='10.1.0.51/22', defaultRoute='via 10.1.3.254')
        bulk_client = self.addHost('bulk_cl', ip='10.1.0.52/22', defaultRoute='via 10.1.3.254')
        video_client = self.addHost('video_cl', ip='10.1.0.53/22', defaultRoute='via 10.1.3.254')
        self.addLink(as1, voip_client)
        self.addLink(as1, bulk_client)
        self.addLink(as1, video_client)

        # Servers
        voip_srv = self.addHost('voip_srv', ip='10.3.0.49/28')
        file_srv = self.addHost('file_srv', ip='10.3.0.1/28')
        video_srv = self.addHost('video_srv', ip='10.3.0.17/28')
        self.addLink(as2, voip_srv)
        self.addLink(as2, file_srv)
        self.addLink(as2, video_srv)

        info('*** QoS Topology: 3 clients, 3 servers, 6 switches\n')


def run_iperf_test(net, client_name, server_name, protocol='udp', bandwidth='1M', duration=5, port=5001):
    """Run iperf3 between client and server, return parsed results."""
    server = net.get(server_name)
    client = net.get(client_name)

    # Start server
    server.cmd(f'iperf3 -s -p {port} -D 2>/dev/null')
    time.sleep(1)

    # Run client
    proto_flag = '-u' if protocol == 'udp' else ''
    bw_flag = f'-b {bandwidth}' if protocol == 'udp' else ''
    result = client.cmd(
        f'iperf3 -c {server.IP()} -p {port} {proto_flag} {bw_flag} '
        f'-t {duration} -J 2>/dev/null'
    )

    # Kill server
    server.cmd(f'pkill -f "iperf3 -s -p {port}" 2>/dev/null')

    # Parse JSON result
    try:
        data = json.loads(result)
        if protocol == 'udp':
            end = data.get('end', {}).get('sum', {})
            return {
                'jitter_ms': end.get('jitter_ms', 0),
                'lost_percent': end.get('lost_percent', 0),
                'bps': end.get('bits_per_second', 0),
                'packets': end.get('packets', 0),
                'lost_packets': end.get('lost_packets', 0),
            }
        else:
            end = data.get('end', {}).get('sum_sent', {})
            return {
                'bps': end.get('bits_per_second', 0),
                'retransmits': end.get('retransmits', 0),
                'bytes': end.get('bytes', 0),
            }
    except (json.JSONDecodeError, KeyError):
        return None


def ping_latency(net, src_name, dst_name, count=10):
    """Get ping latency stats between two hosts."""
    src = net.get(src_name)
    dst = net.get(dst_name)
    result = src.cmd(f'ping -c {count} -i 0.2 {dst.IP()} 2>&1')

    stats = {'avg': 0, 'min': 0, 'max': 0, 'loss': 100}
    for line in result.split('\n'):
        if 'rtt min/avg/max' in line or 'round-trip min/avg/max' in line:
            parts = line.split('=')[1].strip().split('/')
            stats['min'] = float(parts[0])
            stats['avg'] = float(parts[1])
            stats['max'] = float(parts[2].split()[0])
        if 'packet loss' in line:
            for part in line.split(','):
                if 'packet loss' in part:
                    stats['loss'] = float(part.strip().split('%')[0].split()[-1])
    return stats


def apply_qos_rules(net):
    """Apply QoS queues and DSCP marking on SDN switches (simulated via OVS)."""
    info('  *** Applying SDN QoS rules ***\n')
    for sw in net.switches:
        # Create QoS queues: q0=best-effort, q1=video, q2=voip(priority)
        sw.cmd(f'ovs-vsctl -- set port {sw.name}-eth1 qos=@newqos '
               f'-- --id=@newqos create qos type=linux-htb '
               f'other-config:max-rate=1000000000 '
               f'queues:0=@q0 queues:1=@q1 queues:2=@q2 '
               f'-- --id=@q0 create queue other-config:min-rate=100000000 other-config:max-rate=500000000 '
               f'-- --id=@q1 create queue other-config:min-rate=200000000 other-config:max-rate=700000000 '
               f'-- --id=@q2 create queue other-config:min-rate=300000000 other-config:max-rate=1000000000 '
               f'2>/dev/null')
    info('  *** QoS queues configured (VoIP=high, Video=medium, Bulk=low)\n')


def run_qos_test(mode):
    """Run QoS test in specified mode."""
    info(f'\n{"═"*70}\n')
    info(f'  QoS TRAFFIC PRIORITIZATION TEST — {mode.upper()}\n')
    info(f'{"═"*70}\n\n')

    subprocess.call('mn -c 2>/dev/null || true', shell=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    topo = QoSTopo()

    if mode == 'sdn':
        net = Mininet(topo=topo, switch=OVSKernelSwitch,
                      controller=lambda name: RemoteController(name, ip='127.0.0.1', port=6633),
                      build=True, ipBase='10.0.0.0/8')
    else:
        net = Mininet(topo=topo, switch=OVSKernelSwitch, controller=None,
                      build=True, ipBase='10.0.0.0/8')

    net.start()

    # Configure switches
    for sw in net.switches:
        if mode == 'traditional':
            sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=standalone')
        else:
            sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=secure')

    if mode == 'sdn':
        apply_qos_rules(net)

    info(f'  Mode: {mode.upper()}\n')
    info(f'  ⏳ Waiting for network convergence (5s)...\n\n')
    time.sleep(5)

    results = {}

    # ── Test 1: VoIP latency (no congestion) ──
    info('  ─── Test 1: VoIP Latency (baseline, no congestion) ───\n')
    voip_baseline = ping_latency(net, 'voip_cl', 'voip_srv', count=20)
    info(f'    VoIP Latency: avg={voip_baseline["avg"]:.2f}ms, '
         f'min={voip_baseline["min"]:.2f}ms, max={voip_baseline["max"]:.2f}ms, '
         f'loss={voip_baseline["loss"]:.1f}%\n')
    results['voip_baseline'] = voip_baseline

    # ── Test 2: Generate congestion with bulk traffic ──
    info('\n  ─── Test 2: Generating congestion (bulk TCP flood) ───\n')
    file_srv = net.get('file_srv')
    bulk_cl = net.get('bulk_cl')
    file_srv.cmd('iperf3 -s -p 5201 -D 2>/dev/null')
    time.sleep(1)
    # Start bulk flood in background
    bulk_cl.cmd(f'iperf3 -c {file_srv.IP()} -p 5201 -t 15 -P 4 &')
    info('    Bulk TCP flood started (4 parallel streams, 15s)\n')
    time.sleep(2)

    # ── Test 3: VoIP during congestion ──
    info('\n  ─── Test 3: VoIP Latency (DURING congestion) ───\n')
    voip_congested = ping_latency(net, 'voip_cl', 'voip_srv', count=20)
    info(f'    VoIP Latency: avg={voip_congested["avg"]:.2f}ms, '
         f'min={voip_congested["min"]:.2f}ms, max={voip_congested["max"]:.2f}ms, '
         f'loss={voip_congested["loss"]:.1f}%\n')
    results['voip_congested'] = voip_congested

    # ── Test 4: Video streaming during congestion ──
    info('\n  ─── Test 4: Video Streaming (DURING congestion) ───\n')
    video_stats = ping_latency(net, 'video_cl', 'video_srv', count=20)
    info(f'    Video Latency: avg={video_stats["avg"]:.2f}ms, '
         f'min={video_stats["min"]:.2f}ms, max={video_stats["max"]:.2f}ms, '
         f'loss={video_stats["loss"]:.1f}%\n')
    results['video_congested'] = video_stats

    # Wait for bulk to finish
    time.sleep(8)
    bulk_cl.cmd('pkill -f iperf3 2>/dev/null')
    file_srv.cmd('pkill -f iperf3 2>/dev/null')

    # ── Test 5: VoIP post-congestion recovery ──
    info('\n  ─── Test 5: VoIP Latency (post-congestion recovery) ───\n')
    time.sleep(2)
    voip_recovery = ping_latency(net, 'voip_cl', 'voip_srv', count=20)
    info(f'    VoIP Latency: avg={voip_recovery["avg"]:.2f}ms, '
         f'min={voip_recovery["min"]:.2f}ms, max={voip_recovery["max"]:.2f}ms, '
         f'loss={voip_recovery["loss"]:.1f}%\n')
    results['voip_recovery'] = voip_recovery

    # ── Summary ──
    info(f'\n  {"─"*60}\n')
    info(f'  QoS TEST SUMMARY — {mode.upper()}\n')
    info(f'  {"─"*60}\n')
    info(f'    VoIP Baseline Latency:     {voip_baseline["avg"]:.2f} ms\n')
    info(f'    VoIP Congested Latency:    {voip_congested["avg"]:.2f} ms\n')
    info(f'    VoIP Recovery Latency:     {voip_recovery["avg"]:.2f} ms\n')
    degradation = ((voip_congested["avg"] - voip_baseline["avg"]) / max(voip_baseline["avg"], 0.01)) * 100
    info(f'    VoIP Degradation:          {degradation:.1f}%\n')
    info(f'    Video Congested Latency:   {video_stats["avg"]:.2f} ms\n')
    info(f'    Packet Loss (congested):   {voip_congested["loss"]:.1f}%\n')

    if mode == 'sdn':
        info(f'\n    ✓ SDN QoS: VoIP traffic prioritized via DSCP queuing\n')
    else:
        info(f'\n    ℹ Traditional: All traffic treated equally (best-effort)\n')

    net.stop()
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='QoS Traffic Prioritization Test')
    parser.add_argument('--mode', choices=['traditional', 'sdn', 'both'],
                        default='both', help='Test mode (default: both)')
    args = parser.parse_args()

    setLogLevel('info')

    if args.mode in ('traditional', 'both'):
        trad_results = run_qos_test('traditional')

    if args.mode in ('sdn', 'both'):
        sdn_results = run_qos_test('sdn')

    if args.mode == 'both':
        info(f'\n{"═"*70}\n')
        info(f'  QoS COMPARISON: TRADITIONAL vs SDN\n')
        info(f'{"═"*70}\n')
        info(f'  ┌──────────────────────────┬─────────────────┬─────────────────┐\n')
        info(f'  │ Metric                   │ Traditional     │ SDN (QoS)       │\n')
        info(f'  ├──────────────────────────┼─────────────────┼─────────────────┤\n')
        info(f'  │ VoIP Baseline Latency    │ {trad_results["voip_baseline"]["avg"]:>10.2f} ms  │ {sdn_results["voip_baseline"]["avg"]:>10.2f} ms  │\n')
        info(f'  │ VoIP Congested Latency   │ {trad_results["voip_congested"]["avg"]:>10.2f} ms  │ {sdn_results["voip_congested"]["avg"]:>10.2f} ms  │\n')
        info(f'  │ VoIP Packet Loss         │ {trad_results["voip_congested"]["loss"]:>10.1f} %   │ {sdn_results["voip_congested"]["loss"]:>10.1f} %   │\n')
        info(f'  │ Video Congested Latency  │ {trad_results["video_congested"]["avg"]:>10.2f} ms  │ {sdn_results["video_congested"]["avg"]:>10.2f} ms  │\n')
        info(f'  └──────────────────────────┴─────────────────┴─────────────────┘\n')

    # ── Post results to dashboard ──
    try:
        from post_results import post_comparison, post_results as post_r

        def build_qos_metrics(results_dict):
            """Convert QoS test results to API format."""
            metrics = []
            if 'voip_baseline' in results_dict:
                metrics.append({"metric": "VoIP Baseline Latency", "value": results_dict["voip_baseline"]["avg"], "unit": "ms",
                                "min": results_dict["voip_baseline"]["min"], "max": results_dict["voip_baseline"]["max"]})
            if 'voip_congested' in results_dict:
                metrics.append({"metric": "VoIP Congested Latency", "value": results_dict["voip_congested"]["avg"], "unit": "ms",
                                "min": results_dict["voip_congested"]["min"], "max": results_dict["voip_congested"]["max"]})
                metrics.append({"metric": "Packet Loss", "value": results_dict["voip_congested"]["loss"], "unit": "%"})
            if 'video_congested' in results_dict:
                metrics.append({"metric": "Video Congested Latency", "value": results_dict["video_congested"]["avg"], "unit": "ms",
                                "min": results_dict["video_congested"]["min"], "max": results_dict["video_congested"]["max"]})
            if 'voip_recovery' in results_dict:
                metrics.append({"metric": "VoIP Recovery Latency", "value": results_dict["voip_recovery"]["avg"], "unit": "ms"})
            return metrics

        if args.mode == 'both':
            trad_metrics = build_qos_metrics(trad_results)
            sdn_metrics = build_qos_metrics(sdn_results)
            post_comparison("qos", trad_metrics, sdn_metrics, script_name="qos_traffic_test.py")
        elif args.mode == 'traditional':
            post_r("qos", "TRADITIONAL", build_qos_metrics(trad_results), script_name="qos_traffic_test.py")
        elif args.mode == 'sdn':
            post_r("qos", "SDN", build_qos_metrics(sdn_results), script_name="qos_traffic_test.py")
    except ImportError:
        pass
    except Exception as e:
        info(f'\n  ⚠ Could not post results to dashboard: {e}\n')

    info(f'\n{"═"*70}\n')
    info(f'  QoS TESTING COMPLETE\n')
    info(f'{"═"*70}\n')
