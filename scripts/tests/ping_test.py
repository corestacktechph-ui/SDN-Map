"""
Enhanced Ping Test Suite - 20 ICMP Requests with Graph Generation

Measures:
- Average/Minimum/Maximum RTT
- Packet loss
- Jitter
- Generates automated graphs
"""

import argparse
import subprocess
import re
import time
import json
import statistics
import os
from pathlib import Path
from datetime import datetime

RESULTS_DIR = Path(__file__).resolve().parent.parent.parent / 'network' / 'results'
CHARTS_DIR = RESULTS_DIR / 'charts'


class PingTest:
    def __init__(self, source=None, target=None, count=20, interval=0.2):
        self.source = source
        self.target = target
        self.count = count
        self.interval = interval
        self.results = {}
        os.makedirs(CHARTS_DIR, exist_ok=True)

    def run(self, source_ip=None, target_ip=None):
        target = target_ip or self.target
        cmd = ['ping', '-c', str(self.count), '-i', str(self.interval), target]

        print(f"\n{'='*60}")
        print(f"LATENCY TEST: {self.source or source_ip} -> {target}")
        print(f"Requests: {self.count}, Interval: {self.interval}s")
        print(f"{'='*60}\n")

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            self._parse_results(result.stdout, result.returncode)
            self._display_results()
            self._generate_report()
            return self.results
        except subprocess.TimeoutExpired:
            print("ERROR: Ping test timed out")
            return None
        except Exception as e:
            print(f"ERROR: {e}")
            return None

    def _parse_results(self, output, returncode):
        latencies = []
        for line in output.split('\n'):
            m = re.search(r'time=(\d+\.?\d*)\s*ms', line)
            if m:
                latencies.append(float(m.group(1)))

        stats_m = re.search(r'(\d+) packets transmitted, (\d+) (received|packets received)', output)
        if stats_m:
            transmitted = int(stats_m.group(1))
            received = int(stats_m.group(2))
        else:
            transmitted = self.count
            received = 0

        rtt_m = re.search(r'rtt min/avg/max/mdev = ([\d.]+)/([\d.]+)/([\d.]+)/([\d.]+)', output)
        if rtt_m:
            rtt_min = float(rtt_m.group(1))
            rtt_avg = float(rtt_m.group(2))
            rtt_max = float(rtt_m.group(3))
            rtt_mdev = float(rtt_m.group(4))
        elif latencies:
            rtt_min = min(latencies)
            rtt_avg = statistics.mean(latencies)
            rtt_max = max(latencies)
            rtt_mdev = statistics.stdev(latencies) if len(latencies) > 1 else 0
        else:
            rtt_min = rtt_avg = rtt_max = rtt_mdev = 0

        if len(latencies) > 1:
            diffs = [abs(latencies[i] - latencies[i-1]) for i in range(1, len(latencies))]
            jitter = statistics.mean(diffs)
        else:
            jitter = 0

        packet_loss = ((transmitted - received) / transmitted) * 100 if transmitted > 0 else 100

        self.results = {
            'type': 'latency',
            'source': self.source,
            'target': self.target,
            'transmitted': transmitted,
            'received': received,
            'packet_loss': round(packet_loss, 2),
            'latency': {
                'min': round(rtt_min, 2),
                'avg': round(rtt_avg, 2),
                'max': round(rtt_max, 2),
                'mdev': round(rtt_mdev, 2),
            },
            'jitter': round(jitter, 2),
            'raw_latencies': latencies,
            'timestamp': time.time(),
        }

    def _display_results(self):
        r = self.results
        print(f"\n--- Latency Results ---")
        print(f"Transmitted: {r['transmitted']}, Received: {r['received']}, Loss: {r['packet_loss']}%")
        if r['latency']['avg'] > 0:
            print(f"RTT (ms): min={r['latency']['min']:.3f}, avg={r['latency']['avg']:.3f}, "
                  f"max={r['latency']['max']:.3f}, mdev={r['latency']['mdev']:.3f}")
        print(f"Jitter: {r['jitter']:.3f} ms")

    def _generate_report(self):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = RESULTS_DIR / f"ping_test_{timestamp}.json"
        chart_file = CHARTS_DIR / f"latency_{self.source}_{self.target}_{timestamp}.html"

        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2)

        self._generate_html_chart(chart_file)
        print(f"Report: {report_file}")
        print(f"Chart:  {chart_file}")

    def _generate_html_chart(self, chart_file):
        latencies = self.results.get('raw_latencies', [])
        if not latencies:
            return
        labels = list(range(1, len(latencies) + 1))
        avg_val = statistics.mean(latencies)
        min_val = min(latencies)
        max_val = max(latencies)

        html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<title>Latency Test - {self.source} -> {self.target}</title>
<style>
  body {{ font-family: sans-serif; margin: 20px; background: #f5f5f5; }}
  .container {{ max-width: 900px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; }}
  h2 {{ color: #333; }}
  .stats {{ display: flex; gap: 20px; margin: 20px 0; }}
  .stat-card {{ background: #f0f0f0; padding: 15px; border-radius: 8px; flex: 1; text-align: center; }}
  .stat-card .value {{ font-size: 24px; font-weight: bold; color: #2563eb; }}
  .stat-card .label {{ font-size: 12px; color: #666; }}
</style></head><body>
<div class="container">
  <h2>Latency Test: {self.source} -> {self.target}</h2>
  <p>20 ICMP Requests | {self.results['packet_loss']}% Packet Loss</p>
  <div class="stats">
    <div class="stat-card"><div class="value">{min_val:.2f}</div><div class="label">Min RTT (ms)</div></div>
    <div class="stat-card"><div class="value">{avg_val:.2f}</div><div class="label">Avg RTT (ms)</div></div>
    <div class="stat-card"><div class="value">{max_val:.2f}</div><div class="label">Max RTT (ms)</div></div>
    <div class="stat-card"><div class="value">{self.results['jitter']:.2f}</div><div class="label">Jitter (ms)</div></div>
  </div>
  <canvas id="chart" height="300"></canvas>
  <script>
    new Chart(document.getElementById('chart'), {{
      type: 'line',
      data: {{
        labels: {json.dumps(labels)},
        datasets: [{{
          label: 'RTT (ms)',
          data: {json.dumps(latencies)},
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
        }}]
      }},
      options: {{
        responsive: true,
        plugins: {{ legend: {{ display: false }} }},
        scales: {{
          x: {{ title: {{ display: true, text: 'Packet Number' }} }},
          y: {{ title: {{ display: true, text: 'RTT (ms)' }}, beginAtZero: true }}
        }}
      }}
    }});
  </script>
</div></body></html>"""
        with open(chart_file, 'w') as f:
            f.write(html)

    def save_results(self, filename):
        with open(filename, 'w') as f:
            f.write(json.dumps(self.results, indent=2))
        print(f"Results saved to {filename}")


def main():
    parser = argparse.ArgumentParser(description='Enhanced Latency Test (20 ICMP)')
    parser.add_argument('--source', help='Source hostname')
    parser.add_argument('--target', required=True, help='Target hostname or IP')
    parser.add_argument('--count', type=int, default=20, help='Number of pings')
    parser.add_argument('--save', help='Save results to file')

    args = parser.parse_args()
    test = PingTest(source=args.source, target=args.target, count=args.count)
    results = test.run()
    if results and args.save:
        test.save_results(args.save)


if __name__ == '__main__':
    main()
