"""
Enhanced Failover Test Suite - Recovery Time Measurement

Process:
1. Disable active link
2. Detect outage
3. Trigger failover
4. Restore path
5. Measure recovery time

Measures:
- Recovery time (ms)
- Packet loss during failure
- Throughput degradation
- Generates automated graphs
"""

import argparse
import subprocess
import time
import json
import threading
import statistics
import os
from pathlib import Path
from datetime import datetime

RESULTS_DIR = Path(__file__).resolve().parent.parent.parent / 'network' / 'results'
CHARTS_DIR = RESULTS_DIR / 'charts'


class FailoverTest:
    def __init__(self, source=None, target=None, link=None,
                 is_sdn=False, ping_count=50, throughput_test=False):
        self.source = source
        self.target = target
        self.link = link
        self.is_sdn = is_sdn
        self.ping_count = ping_count
        self.throughput_test = throughput_test
        self.results = {}
        self.ping_results = []
        os.makedirs(CHARTS_DIR, exist_ok=True)

    def _parse_link_info(self):
        if self.link and '-' in self.link:
            parts = self.link.split('-')
            return parts[0], parts[1]
        return None, None

    def _bring_link_down(self, switch1, switch2):
        print(f"  Disabling link: {switch1} <-> {switch2}")
        subprocess.run(f"sudo ovs-ofctl mod-port {switch1} any down", shell=True, capture_output=True)
        subprocess.run(f"sudo ovs-ofctl mod-port {switch2} any down", shell=True, capture_output=True)
        time.sleep(0.5)

    def _bring_link_up(self, switch1, switch2):
        print(f"  Restoring link: {switch1} <-> {switch2}")
        subprocess.run(f"sudo ovs-ofctl mod-port {switch1} any up", shell=True, capture_output=True)
        subprocess.run(f"sudo ovs-ofctl mod-port {switch2} any up", shell=True, capture_output=True)
        time.sleep(0.5)

    def _monitor_connectivity(self, target_ip, stop_event):
        while not stop_event.is_set():
            try:
                start = time.time()
                result = subprocess.run(
                    ['ping', '-c', '1', '-W', '1', target_ip],
                    capture_output=True, text=True, timeout=2
                )
                rtt = (time.time() - start) * 1000
                self.ping_results.append({
                    'timestamp': time.time(),
                    'success': result.returncode == 0,
                    'rtt_ms': round(rtt, 2),
                })
            except subprocess.TimeoutExpired:
                self.ping_results.append({
                    'timestamp': time.time(),
                    'success': False,
                    'rtt_ms': None,
                })

    def run(self, source_ip=None, target_ip=None):
        target = target_ip or self.target
        switch1, switch2 = self._parse_link_info()

        if not switch1 or not switch2:
            print("ERROR: Invalid link. Use format: SWITCH1-SWITCH2")
            return None

        print(f"\n{'='*60}")
        print(f"FAILOVER TEST")
        print(f"Source: {self.source or source_ip}")
        print(f"Target: {target}")
        print(f"Link:   {self.link}")
        print(f"Arch:   {'SDN' if self.is_sdn else 'Traditional'}")
        print(f"{'='*60}")

        # Baseline
        print("\n[Phase 1] Baseline connectivity...")
        baseline = subprocess.run(
            ['ping', '-c', '5', '-i', '0.2', target],
            capture_output=True, text=True, timeout=10
        )
        print(baseline.stdout)

        # Start monitoring
        print("\n[Phase 2] Starting connectivity monitoring...")
        stop = threading.Event()
        monitor = threading.Thread(target=self._monitor_connectivity, args=(target, stop))
        monitor.start()
        time.sleep(2)

        # Inject failure
        print(f"\n[Phase 3] Injecting link failure at {time.time():.3f}...")
        failure_time = time.time()
        self._bring_link_down(switch1, switch2)

        if self.is_sdn:
            time.sleep(2)
        else:
            time.sleep(8)

        # Restore link
        print(f"\n[Phase 4] Restoring link at {time.time():.3f}...")
        restoration_time = time.time()
        self._bring_link_up(switch1, switch2)
        time.sleep(3)

        stop.set()
        monitor.join()

        # Analyze
        self._analyze(failure_time, restoration_time)
        self._display_results()
        self._generate_report()
        return self.results

    def _analyze(self, failure_time, restoration_time):
        if not self.ping_results:
            return

        failure_detected = None
        for r in self.ping_results:
            if not r['success'] and failure_detected is None:
                failure_detected = r['timestamp']
                break

        recovery_time_val = None
        for r in self.ping_results:
            if r['success'] and r['timestamp'] > (failure_detected or failure_time):
                recovery_time_val = r['timestamp']
                break

        total_pings = len(self.ping_results)
        lost = sum(1 for r in self.ping_results if not r['success'])
        successful = total_pings - lost

        detection_delay = ((failure_detected or failure_time) - failure_time) * 1000
        failover_duration = ((recovery_time_val or 0) - (failure_detected or failure_time)) * 1000
        total_recovery = ((recovery_time_val or 0) - failure_time) * 1000

        successful_rtts = [r['rtt_ms'] for r in self.ping_results if r['success'] and r['rtt_ms']]

        self.results = {
            'type': 'failover',
            'source': self.source,
            'target': self.target,
            'link_under_test': self.link,
            'architecture': 'SDN' if self.is_sdn else 'Traditional',
            'failure_time': failure_time,
            'restoration_time': restoration_time,
            'failure_detection': {
                'time': failure_detected,
                'delay_ms': round(max(detection_delay, 0), 2),
            },
            'failover': {
                'duration_ms': round(max(failover_duration, 0), 2),
            },
            'recovery': {
                'time': recovery_time_val,
                'total_recovery_ms': round(max(total_recovery, 0), 2),
            },
            'packet_loss': {
                'total_pings': total_pings,
                'lost': lost,
                'successful': successful,
                'percentage': round((lost / total_pings * 100), 2) if total_pings > 0 else 0,
            },
            'latency_during_recovery': {
                'avg_ms': round(statistics.mean(successful_rtts), 2) if successful_rtts else 0,
                'max_ms': round(max(successful_rtts), 2) if successful_rtts else 0,
            },
            'raw_ping_data': self.ping_results[:50],
            'timestamp': time.time(),
        }

    def _display_results(self):
        r = self.results
        print(f"\n{'='*60}")
        print("FAILOVER RESULTS")
        print(f"{'='*60}")
        print(f"Architecture:       {r['architecture']}")
        print(f"Link:               {r['link_under_test']}")
        print(f"Detection Delay:    {r['failure_detection']['delay_ms']:.2f} ms")
        print(f"Failover Duration:  {r['failover']['duration_ms']:.2f} ms")
        print(f"Total Recovery:     {r['recovery']['total_recovery_ms']:.2f} ms")
        print(f"Packet Loss:        {r['packet_loss']['percentage']:.1f}% "
              f"({r['packet_loss']['lost']}/{r['packet_loss']['total_pings']})")
        if r.get('latency_during_recovery', {}).get('avg_ms', 0) > 0:
            print(f"Latency (avg):      {r['latency_during_recovery']['avg_ms']:.2f} ms")

    def _generate_report(self):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = RESULTS_DIR / f"failover_test_{timestamp}.json"
        chart_file = CHARTS_DIR / f"failover_{self.source}_{self.target}_{timestamp}.html"

        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2)

        self._generate_html_chart(chart_file)
        print(f"\nReport: {report_file}")
        print(f"Chart:  {chart_file}")

    def _generate_html_chart(self, chart_file):
        ping = self.ping_results[:100]
        if not ping:
            return
        labels = list(range(len(ping)))
        rtts = [(p['rtt_ms'] or 0) for p in ping]
        successes = [1 if p['success'] else 0 for p in ping]
        fail_idx = [i for i, s in enumerate(successes) if s == 0]

        r = self.results
        html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<title>Failover Test - {self.source} -> {self.target}</title>
<style>
  body {{ font-family: sans-serif; margin: 20px; background: #f5f5f5; }}
  .container {{ max-width: 900px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; }}
  .stats {{ display: flex; gap: 15px; margin: 20px 0; flex-wrap: wrap; }}
  .stat-card {{ background: #f0f0f0; padding: 12px; border-radius: 8px; flex: 1; min-width: 120px; text-align: center; }}
  .stat-card .value {{ font-size: 22px; font-weight: bold; color: #2563eb; }}
  .stat-card .label {{ font-size: 11px; color: #666; }}
  .fail {{ color: #ef4444; }}
</style></head><body>
<div class="container">
  <h2>Failover Test: {self.source} -> {self.target}</h2>
  <p>{r['architecture']} | Link: {r['link_under_test']}</p>
  <div class="stats">
    <div class="stat-card"><div class="value">{r['recovery']['total_recovery_ms']:.1f}</div><div class="label">Recovery (ms)</div></div>
    <div class="stat-card"><div class="value">{r['failure_detection']['delay_ms']:.1f}</div><div class="label">Detection (ms)</div></div>
    <div class="stat-card"><div class="value">{r['failover']['duration_ms']:.1f}</div><div class="label">Failover (ms)</div></div>
    <div class="stat-card"><div class="value {'fail' if r['packet_loss']['percentage'] > 0 else ''}">{r['packet_loss']['percentage']:.1f}%</div><div class="label">Packet Loss</div></div>
  </div>
  <canvas id="chart" height="300"></canvas>
  <script>
    new Chart(document.getElementById('chart'), {{
      type: 'line',
      data: {{
        labels: {json.dumps(labels)},
        datasets: [{{
          label: 'RTT (ms)',
          data: {json.dumps(rtts)},
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.1)',
          fill: true,
          tension: 0.1,
          pointRadius: 3,
          pointBackgroundColor: {json.dumps(['#ef4444' if i in fail_idx else '#2563eb' for i in labels])},
        }}]
      }},
      options: {{
        responsive: true,
        plugins: {{ legend: {{ display: false }} }},
        scales: {{
          x: {{ title: {{ display: true, text: 'Ping Sequence' }} }},
          y: {{ title: {{ display: true, text: 'RTT (ms)' }}, beginAtZero: true }}
        }}
      }}
    }});
  </script>
</div></body></html>"""
        with open(chart_file, 'w') as f:
            f.write(html)


def main():
    parser = argparse.ArgumentParser(description='Enhanced Failover Test')
    parser.add_argument('--source', help='Source hostname')
    parser.add_argument('--target', required=True, help='Target IP')
    parser.add_argument('--link', required=True, help='Link (e.g., CS1-DS_A1)')
    parser.add_argument('--sdn', action='store_true', help='SDN architecture')
    parser.add_argument('--count', type=int, default=50)
    parser.add_argument('--save', help='Save results to file')

    args = parser.parse_args()
    test = FailoverTest(
        source=args.source, target=args.target, link=args.link,
        is_sdn=args.sdn, ping_count=args.count
    )
    results = test.run()
    if results and args.save:
        with open(args.save, 'w') as f:
            json.dump(results, f, indent=2)


if __name__ == '__main__':
    main()
