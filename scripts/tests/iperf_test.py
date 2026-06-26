"""
Enhanced iPerf3 Throughput Test Suite - Multi-Scenario

Scenarios:
- Low Load:    1 stream, 100Mbps target
- Moderate:    4 streams, 500Mbps target
- High Load:   8 streams, 1Gbps target

Collects: TCP throughput, UDP throughput, average bandwidth, retransmissions
"""

import argparse
import subprocess
import json as json_lib
import time
import statistics
import os
from pathlib import Path
from datetime import datetime

RESULTS_DIR = Path(__file__).resolve().parent.parent.parent / 'network' / 'results'
CHARTS_DIR = RESULTS_DIR / 'charts'


class IperfTest:
    SCENARIOS = {
        'low':      {'parallel': 1, 'bandwidth': '100M', 'label': 'Low Load (1 stream, 100Mbps)'},
        'moderate': {'parallel': 4, 'bandwidth': '500M', 'label': 'Moderate Load (4 streams, 500Mbps)'},
        'high':     {'parallel': 8, 'bandwidth': '1G',   'label': 'High Load (8 streams, 1Gbps)'},
    }

    def __init__(self, target=None, duration=30, protocol='tcp'):
        self.target = target
        self.duration = duration
        self.protocol = protocol
        self.all_results = {}

    def start_server(self, port=5201):
        subprocess.run(['iperf3', '-s', '-p', str(port), '-D'], capture_output=True, timeout=5)
        print(f"iPerf3 server started on port {port}")

    def stop_server(self):
        subprocess.run(['pkill', '-f', 'iperf3'], capture_output=True)

    def run_scenario(self, scenario_name, reverse=False):
        scenario = self.SCENARIOS[scenario_name]
        direction = "download" if reverse else "upload"
        cmd = [
            'iperf3', '-c', self.target,
            '-t', str(self.duration),
            '-P', str(scenario['parallel']),
            '-J'
        ]
        if self.protocol == 'udp':
            cmd.extend(['-u', '-b', scenario['bandwidth']])
        else:
            cmd.extend(['-w', '256K'])

        if reverse:
            cmd.append('-R')

        print(f"\n  [{scenario_name.upper()}] {scenario['label']} ({direction})...")
        try:
            result = subprocess.run(cmd, capture_output=True, text=True,
                                    timeout=self.duration + 15)
            if result.returncode == 0:
                data = json_lib.loads(result.stdout)
                return self._parse_json(data, scenario_name, direction)
            else:
                print(f"  ERROR: {result.stderr[:100]}")
                return None
        except Exception as e:
            print(f"  ERROR: {e}")
            return None

    def _parse_json(self, data, scenario, direction):
        end = data.get('end', {})
        streams = end.get('streams', [])

        total_bps = 0
        total_retrans = 0
        total_jitter = 0
        total_loss = 0
        total_packets = 0

        for stream in streams:
            udp = stream.get('udp', {})
            tcp = stream.get('tcp', {})

            if self.protocol == 'udp':
                total_bps += udp.get('bits_per_second', 0)
                total_jitter += udp.get('jitter_ms', 0)
                total_loss += udp.get('lost_packets', 0)
                total_packets += udp.get('total_packets', 0)
            else:
                total_bps += tcp.get('bits_per_second', 0)
                total_retrans += tcp.get('retransmits', 0)

        throughput_mbps = round(total_bps / 1_000_000, 2)
        result = {
            'scenario': scenario,
            'direction': direction,
            'throughput_mbps': throughput_mbps,
            'protocol': self.protocol,
        }

        if self.protocol == 'tcp':
            result['retransmits'] = total_retrans
        else:
            pkt_loss = round((total_loss / total_packets * 100) if total_packets > 0 else 0, 2)
            result['jitter_ms'] = round(total_jitter, 2)
            result['packet_loss'] = pkt_loss

        self.all_results[f"{direction}_{scenario}"] = result
        print(f"    Throughput: {throughput_mbps} Mbps")
        return result

    def run_all(self):
        print(f"\n{'='*60}")
        print(f"THROUGHPUT TEST: -> {self.target}")
        print(f"Protocol: {self.protocol.upper()}, Duration: {self.duration}s")
        print(f"{'='*60}")

        for scenario in ['low', 'moderate', 'high']:
            self.run_scenario(scenario, reverse=False)
            if self.protocol == 'tcp':
                self.run_scenario(scenario, reverse=True)

        self._generate_report()
        return self.all_results

    def _generate_report(self):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = RESULTS_DIR / f"iperf_test_{timestamp}.json"
        chart_file = CHARTS_DIR / f"throughput_{self.target}_{timestamp}.html"

        report = {
            'type': 'throughput',
            'target': self.target,
            'protocol': self.protocol,
            'duration': self.duration,
            'scenarios': self.all_results,
            'timestamp': time.time(),
        }
        with open(report_file, 'w') as f:
            json_lib.dump(report, f, indent=2)

        self._generate_html_chart(chart_file)
        print(f"\nReport: {report_file}")
        print(f"Chart:  {chart_file}")

    def _generate_html_chart(self, chart_file):
        scenarios_list = ['low', 'moderate', 'high']
        upload_data = []
        download_data = []
        for s in scenarios_list:
            up = self.all_results.get(f'upload_{s}', {})
            down = self.all_results.get(f'download_{s}', {})
            upload_data.append(up.get('throughput_mbps', 0))
            download_data.append(down.get('throughput_mbps', 0))

        labels = ['Low Load', 'Moderate Load', 'High Load']
        html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<title>Throughput Test - {self.target}</title>
<style>
  body {{ font-family: sans-serif; margin: 20px; background: #f5f5f5; }}
  .container {{ max-width: 900px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; }}
  h2 {{ color: #333; }}
</style></head><body>
<div class="container">
  <h2>Throughput Test: {self.target}</h2>
  <p>Protocol: {self.protocol.upper()} | Duration: {self.duration}s</p>
  <canvas id="chart" height="300"></canvas>
  <script>
    new Chart(document.getElementById('chart'), {{
      type: 'bar',
      data: {{
        labels: {json_lib.dumps(labels)},
        datasets: [
          {{ label: 'Upload (Mbps)', data: {json_lib.dumps(upload_data)}, backgroundColor: '#2563eb' }},
          {{ label: 'Download (Mbps)', data: {json_lib.dumps(download_data)}, backgroundColor: '#10b981' }}
        ]
      }},
      options: {{
        responsive: true,
        scales: {{
          x: {{ title: {{ display: true, text: 'Scenario' }} }},
          y: {{ title: {{ display: true, text: 'Throughput (Mbps)' }}, beginAtZero: true }}
        }}
      }}
    }});
  </script>
</div></body></html>"""
        with open(chart_file, 'w') as f:
            f.write(html)


def main():
    parser = argparse.ArgumentParser(description='Enhanced Throughput Test')
    parser.add_argument('--target', required=True, help='Target host IP')
    parser.add_argument('--duration', type=int, default=30)
    parser.add_argument('--protocol', choices=['tcp', 'udp'], default='tcp')
    parser.add_argument('--mode', choices=['server', 'client'], default='client')

    args = parser.parse_args()
    test = IperfTest(target=args.target, duration=args.duration, protocol=args.protocol)

    if args.mode == 'server':
        test.start_server()
        input("Press Enter to stop server...")
        test.stop_server()
    else:
        test.run_all()


if __name__ == '__main__':
    main()
