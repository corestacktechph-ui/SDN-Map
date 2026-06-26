"""
Chart Generator for Research Outputs

Generates comprehensive comparison charts between Traditional and SDN architectures
for all performance metrics. Produces HTML + Chart.js visualizations suitable
for inclusion in thesis documents.
"""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List

RESULTS_DIR = Path(__file__).resolve().parent.parent.parent / 'network' / 'results'
CHARTS_DIR = RESULTS_DIR / 'charts'
RESEARCH_DIR = RESULTS_DIR / 'research'


class ResearchChartGenerator:
    def __init__(self):
        os.makedirs(CHARTS_DIR, exist_ok=True)
        os.makedirs(RESEARCH_DIR, exist_ok=True)

    def generate_comparison_chart(self, data: Dict, filename: str = 'comparison_chart.html'):
        labels = data.get('labels', [])
        trad = data.get('traditional', [])
        sdn_vals = data.get('sdn', [])
        improvement = data.get('improvement', [])

        html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<title>Traditional vs SDN - Performance Comparison</title>
<style>
  body {{ font-family: 'Times New Roman', serif; margin: 30px; background: #fff; }}
  .container {{ max-width: 1000px; margin: auto; }}
  h1 {{ color: #1a365d; text-align: center; }}
  .chart-box {{ margin: 40px 0; }}
  .improvement {{ color: #059669; font-weight: bold; text-align: center; font-size: 18px; }}
</style></head><body>
<div class="container">
  <h1>Performance Comparison: Traditional vs SDN</h1>
  <div class="chart-box">
    <canvas id="mainChart" height="350"></canvas>
  </div>
  <div class="improvement">Average Improvement: {statistics.mean(improvement):.1f}% across all metrics</div>
  <div class="chart-box">
    <canvas id="improvementChart" height="250"></canvas>
  </div>
  <script>
    new Chart(document.getElementById('mainChart'), {{
      type: 'bar',
      data: {{
        labels: {json.dumps(labels)},
        datasets: [
          {{ label: 'Traditional', data: {json.dumps(trad)}, backgroundColor: '#94a3b8', borderRadius: 4 }},
          {{ label: 'SDN', data: {json.dumps(sdn_vals)}, backgroundColor: '#2563eb', borderRadius: 4 }}
        ]
      }},
      options: {{
        responsive: true,
        plugins: {{ legend: {{ position: 'top' }} }},
        scales: {{
          x: {{ title: {{ display: true, text: 'Metric' }} }},
          y: {{ title: {{ display: true, text: 'Value' }}, beginAtZero: true }}
        }}
      }}
    }});
    new Chart(document.getElementById('improvementChart'), {{
      type: 'bar',
      data: {{
        labels: {json.dumps(labels)},
        datasets: [{{
          label: 'Improvement (%)',
          data: {json.dumps(improvement)},
          backgroundColor: {json.dumps(['#059669' if i > 0 else '#dc2626' for i in improvement])},
          borderRadius: 4,
        }}]
      }},
      options: {{
        responsive: true,
        plugins: {{ legend: {{ display: false }} }},
        scales: {{
          x: {{ title: {{ display: true, text: 'Metric' }} }},
          y: {{ title: {{ display: true, text: 'Improvement (%)' }} }}
        }}
      }}
    }});
  </script>
</div></body></html>"""

        filepath = CHARTS_DIR / filename
        with open(filepath, 'w') as f:
            f.write(html)
        print(f"Chart generated: {filepath}")
        return str(filepath)

    def generate_radar_chart(self, data: Dict, filename: str = 'radar_comparison.html'):
        labels = data.get('labels', [])
        trad = data.get('traditional', [])
        sdn_vals = data.get('sdn', [])

        if not labels or not trad or not sdn_vals:
            return None

        max_val = max(max(trad), max(sdn_vals)) * 1.2
        trad_normalized = [v / max_val * 100 for v in trad]
        sdn_normalized = [v / max_val * 100 for v in sdn_normalized if sdn_normalized] if False else [v / max_val * 100 for v in sdn_vals]

        html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<title>Radar Comparison - Traditional vs SDN</title>
<style>
  body {{ font-family: 'Times New Roman', serif; margin: 30px; background: #fff; text-align: center; }}
  .container {{ max-width: 700px; margin: auto; }}
  h1 {{ color: #1a365d; }}
</style></head><body>
<div class="container">
  <h1>Architectural Performance Radar</h1>
  <canvas id="radarChart" height="600"></canvas>
  <script>
    new Chart(document.getElementById('radarChart'), {{
      type: 'radar',
      data: {{
        labels: {json.dumps(labels)},
        datasets: [
          {{ label: 'Traditional', data: {json.dumps(trad)}, borderColor: '#94a3b8', backgroundColor: 'rgba(148,163,184,0.2)', pointBackgroundColor: '#94a3b8' }},
          {{ label: 'SDN', data: {json.dumps(sdn_vals)}, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.2)', pointBackgroundColor: '#2563eb' }}
        ]
      }},
      options: {{
        responsive: true,
        scales: {{ r: {{ beginAtZero: true }} }}
      }}
    }});
  </script>
</div></body></html>"""

        filepath = CHARTS_DIR / filename
        with open(filepath, 'w') as f:
            f.write(html)
        print(f"Radar chart: {filepath}")
        return str(filepath)

    def generate_latency_distribution(self, latencies: List[float], source: str, target: str,
                                       filename: str = 'latency_distribution.html'):
        if not latencies:
            return None

        bins = [0, 5, 10, 15, 20, 30, 40, 50, 100]
        labels = [f'{bins[i]}-{bins[i+1]}' for i in range(len(bins)-1)]
        counts = [sum(1 for l in latencies if bins[i] <= l < bins[i+1]) for i in range(len(bins)-1)]

        html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<title>Latency Distribution - {source} -> {target}</title>
<style>
  body {{ font-family: 'Times New Roman', serif; margin: 30px; }}
  .container {{ max-width: 800px; margin: auto; }}
</style></head><body>
<div class="container">
  <h2>Latency Distribution: {source} -> {target}</h2>
  <canvas id="histogram" height="300"></canvas>
  <script>
    new Chart(document.getElementById('histogram'), {{
      type: 'bar',
      data: {{
        labels: {json.dumps(labels)},
        datasets: [{{ label: 'Frequency', data: {json.dumps(counts)}, backgroundColor: '#2563eb', borderRadius: 3 }}]
      }},
      options: {{
        responsive: true,
        scales: {{
          x: {{ title: {{ display: true, text: 'RTT Range (ms)' }} }},
          y: {{ title: {{ display: true, text: 'Count' }}, beginAtZero: true }}
        }}
      }}
    }});
  </script>
</div></body></html>"""

        filepath = CHARTS_DIR / filename
        with open(filepath, 'w') as f:
            f.write(html)
        return str(filepath)

    def generate_all_charts(self, comparison_data: Dict):
        self.generate_comparison_chart(comparison_data)
        self.generate_radar_chart(comparison_data)


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Research Chart Generator')
    parser.add_argument('--data', help='Comparison data JSON file')

    args = parser.parse_args()
    generator = ResearchChartGenerator()

    data_file = args.data or (RESEARCH_DIR / 'comparison_chart_data.json')
    if os.path.exists(data_file):
        with open(data_file) as f:
            data = json.load(f)
    else:
        from comparison_matrix import ComparisonMatrix
        matrix = ComparisonMatrix()
        matrix.set_expected_values()
        data = matrix.generate_chart_data()
        with open(data_file, 'w') as f:
            json.dump(data, f, indent=2)

    generator.generate_all_charts(data)
    print("All research charts generated")


if __name__ == '__main__':
    import statistics
    main()
