"""
Enhanced UDP Jitter Test Suite - Using iPerf3 UDP Mode

Measures:
- Jitter (ms) - min/avg/max/stddev
- Packet loss (%)
- Generates jitter-over-time graphs
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


class JitterTest:
    def __init__(self, source=None, target=None, duration=30, packet_size=64):
        self.source = source
        self.target = target
        self.duration = duration
        self.packet_size = packet_size
        self.results = {}
        os.makedirs(CHARTS_DIR, exist_ok=True)

    def run(self):
        cmd = [
            'iperf3', '-c', self.target, '-u',
            '-t', str(self.duration),
            '-b', '1M',
            '-l', str(self.packet_size),
            '-J'
        ]
        print(f"\n{'='*60}")
        print(f"JITTER TEST: {self.source} -> {self.target}")
        print(f"Duration: {self.duration}s, Packet Size: {self.packet_size}B")
        print(f"{'='*60}\n")

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=self.duration + 10)
            if result.returncode == 0:
                self._parse_results(result.stdout)
            else:
                print(f"iPerf3 error: {result.stderr}")
            self._display_results()
            self._generate_report()
            return self.results
        except Exception as e:
            print(f"ERROR: {e}")
            return None

    def _parse_results(self, output):
        try:
            data = json.loads(output)
            end = data.get('end', {})
            streams = end.get('streams', [])

            total_jitter = 0
            total_loss = 0
            total_packets = 0
            stream_count = 0

            for stream in streams:
                udp = stream.get('udp', {})
                if udp:
                    total_jitter += udp.get('jitter_ms', 0)
                    total_loss += udp.get('lost_packets', 0)
                    total_packets += udp.get('total_packets', 0)
                    stream_count += 1

            intervals = data.get('intervals', [])
            jitter_over_time = []
            for interval in intervals:
                for s in interval.get('streams', []):
                    udp_int = s.get('udp', {})
                    if udp_int:
                        jitter_over_time.append(udp_int.get('jitter_ms', 0))

            avg_jitter = total_jitter / stream_count if stream_count > 0 else 0
            packet_loss_pct = round(
                (total_loss / total_packets * 100) if total_packets > 0 else 0, 2
            )

            self.results = {
                'type': 'jitter',
                'source': self.source,
                'target': self.target,
                'duration': self.duration,
                'jitter': {
                    'average_ms': round(avg_jitter, 3),
                    'min_ms': round(min(jitter_over_time), 3) if jitter_over_time else 0,
                    'max_ms': round(max(jitter_over_time), 3) if jitter_over_time else 0,
                    'std_dev_ms': round(
                        statistics.stdev(jitter_over_time), 3
                    ) if len(jitter_over_time) > 1 else 0,
                },
                'packet_loss': {
                    'percentage': packet_loss_pct,
                    'lost': total_loss,
                    'total': total_packets,
                },
                'jitter_over_time': jitter_over_time[:100],
                'timestamp': time.time(),
            }
        except json.JSONDecodeError:
            self._parse_text_output(output)

    def _parse_text_output(self, output):
        m = re.search(r'(\d+\.?\d*)\s*ms\s+(\d+)\/(\d+)\s+\(([\d.]+)%\)', output)
        if m:
            self.results = {
                'type': 'jitter',
                'source': self.source,
                'target': self.target,
                'jitter': {'average_ms': float(m.group(1))},
                'packet_loss': {
                    'percentage': float(m.group(4)),
                    'lost': int(m.group(2)),
                    'total': int(m.group(3)),
                },
                'jitter_over_time': [],
                'timestamp': time.time(),
            }

    def _display_results(self):
        j = self.results.get('jitter', {})
        p = self.results.get('packet_loss', {})
        print(f"\n--- Jitter Results ---")
        print(f"Jitter: avg={j.get('average_ms', 0):.3f}ms, "
              f"min={j.get('min_ms', 0):.3f}ms, max={j.get('max_ms', 0):.3f}ms")
        print(f"Packet Loss: {p.get('percentage', 0):.2f}% "
              f"({p.get('lost', 0)}/{p.get('total', 0)})")

    def _generate_report(self):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = RESULTS_DIR / f"jitter_test_{timestamp}.json"
        chart_file = CHARTS_DIR / f"jitter_{self.source}_{self.target}_{timestamp}.html"

        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        self._generate_html_chart(chart_file)
        print(f"Report: {report_file}")
        print(f"Chart:  {chart_file}")

    def _generate_html_chart(self, chart_file):
        jitter_data = self.results.get('jitter_over_time', [])
        if not jitter_data:
            return
        labels = list(range(1, len(jitter_data) + 1))
        avg_val = statistics.mean(jitter_data)

        html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<title>Jitter Test - {self.source} -> {self.target}</title>
<style>
  body {{ font-family: sans-serif; margin: 20px; background: #f5f5f5; }}
  .container {{ max-width: 900px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; }}
  .stats {{ display: flex; gap: 20px; margin: 20px 0; }}
  .stat-card {{ background: #f0f0f0; padding: 15px; border-radius: 8px; flex: 1; text-align: center; }}
  .stat-card .value {{ font-size: 24px; font-weight: bold; color: #2563eb; }}
  .stat-card .label {{ font-size: 12px; color: #666; }}
</style></head><body>
<div class="container">
  <h2>Jitter Test: {self.source} -> {self.target}</h2>
  <p>UDP Stream | {self.duration}s Duration</p>
  <div class="stats">
    <div class="stat-card"><div class="value">{self.results['jitter']['min_ms']:.2f}</div><div class="label">Min (ms)</div></div>
    <div class="stat-card"><div class="value">{avg_val:.2f}</div><div class="label">Avg (ms)</div></div>
    <div class="stat-card"><div class="value">{self.results['jitter']['max_ms']:.2f}</div><div class="label">Max (ms)</div></div>
    <div class="stat-card"><div class="value">{self.results['packet_loss']['percentage']:.1f}%</div><div class="label">Packet Loss</div></div>
  </div>
  <canvas id="chart" height="300"></canvas>
  <script>
    new Chart(document.getElementById('chart'), {{
      type: 'line',
      data: {{
        labels: {json.dumps(labels)},
        datasets: [{{
          label: 'Jitter (ms)',
          data: {json.dumps(jitter_data)},
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        }}]
      }},
      options: {{
        responsive: true,
        scales: {{
          x: {{ title: {{ display: true, text: 'Time Interval' }} }},
          y: {{ title: {{ display: true, text: 'Jitter (ms)' }}, beginAtZero: true }}
        }}
      }}
    }});
  </script>
</div></body></html>"""
        with open(chart_file, 'w') as f:
            f.write(html)


def main():
    parser = argparse.ArgumentParser(description='Enhanced UDP Jitter Test')
    parser.add_argument('--source', help='Source hostname')
    parser.add_argument('--target', required=True, help='Target hostname or IP')
    parser.add_argument('--duration', type=int, default=30)
    parser.add_argument('--save', help='Save results to file')

    args = parser.parse_args()
    test = JitterTest(source=args.source, target=args.target, duration=args.duration)
    results = test.run()
    if results and args.save:
        with open(args.save, 'w') as f:
            json.dump(results, f, indent=2)


if __name__ == '__main__':
    main()
