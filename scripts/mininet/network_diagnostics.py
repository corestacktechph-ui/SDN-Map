"""
Network Diagnostics & Automated Recovery System

Provides comprehensive troubleshooting and self-healing capabilities:
- Connectivity health checks across all layers
- Service state verification (DHCP, VRRP, OVS)
- Automated recovery with escalation
- Incident logging and reporting
- Performance baseline comparison
"""

import os
import sys
import time
import json
import socket
import subprocess
import threading
import logging
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger(__name__)

RESULTS_DIR = Path("results/diagnostics")
CONFIGS_DIR = Path("configs")
DHCP_CONFIG_DIR = CONFIGS_DIR / "dhcp"
VRRP_CONFIG_DIR = CONFIGS_DIR / "vrrp"

LOSS_THRESHOLD = 20.0
LATENCY_THRESHOLD = 100.0
SERVICE_RESTART_DELAY = 2
MAX_RECOVERY_ATTEMPTS = 3
CONSECUTIVE_FAILURE_LIMIT = 5


@dataclass
class DiagnosticResult:
    check_name: str
    status: str
    details: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    recovery_attempted: bool = False
    recovery_success: bool = False


@dataclass
class Incident:
    incident_id: str
    severity: str
    component: str
    description: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    resolved: bool = False
    resolved_at: Optional[str] = None
    recovery_actions: List[str] = field(default_factory=list)


class DiagnosticsEngine:
    """
    Core diagnostics engine that runs health checks and triggers recovery.
    """

    def __init__(self):
        self.results: List[DiagnosticResult] = []
        self.incidents: List[Incident] = []
        self.consecutive_failures: Dict[str, int] = {}
        self._recovery_lock = threading.Lock()
        self._incident_counter = 0
        os.makedirs(RESULTS_DIR, exist_ok=True)

    def _run_cmd(self, cmd: List[str], timeout: int = 10) -> Tuple[int, str, str]:
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=timeout
            )
            return result.returncode, result.stdout.strip(), result.stderr.strip()
        except subprocess.TimeoutExpired:
            return -1, "", "Command timed out"
        except FileNotFoundError:
            return -2, "", "Command not found"
        except Exception as e:
            return -3, "", str(e)

    def _ping_check(self, target: str, count: int = 4) -> Tuple[bool, float, float]:
        rc, out, err = self._run_cmd(["ping", "-c", str(count), "-W", "2", target], timeout=15)
        if rc != 0:
            return False, 100.0, 100.0
        loss = 100.0
        avg_latency = 0.0
        for line in out.split('\n'):
            if "packet loss" in line:
                import re
                m = re.search(r'(\d+\.?\d*)% packet loss', line)
                if m:
                    loss = float(m.group(1))
            if "rtt min/avg/max/mdev" in line:
                import re
                m = re.search(r'[\d.]+/([\d.]+)/[\d.]+/[\d.]+', line)
                if m:
                    avg_latency = float(m.group(1))
        return loss < LOSS_THRESHOLD, loss, avg_latency

    def _check_ovs_status(self) -> bool:
        rc, out, err = self._run_cmd(["ovs-vsctl", "show"], timeout=5)
        return rc == 0

    def _check_dhcp_service(self) -> bool:
        rc, out, err = self._run_cmd(["pgrep", "-f", "dnsmasq"], timeout=5)
        return rc == 0

    def _check_vrrp_pid_file(self, instance_name: str) -> bool:
        pid_file = Path(f"/var/run/keepalived_{instance_name.lower()}.pid")
        if not pid_file.exists():
            return False
        try:
            pid = int(pid_file.read_text().strip())
            rc, _, _ = self._run_cmd(["kill", "-0", str(pid)], timeout=3)
            return rc == 0
        except (ValueError, IOError):
            return False

    def _restart_dhcp(self) -> bool:
        logger.info("Attempting DHCP server restart...")
        self._run_cmd(["pkill", "-f", "dnsmasq"], timeout=5)
        time.sleep(SERVICE_RESTART_DELAY)
        dhcp_script = DHCP_CONFIG_DIR / "dhcp_server.sh"
        if dhcp_script.exists():
            rc, _, _ = self._run_cmd(["bash", str(dhcp_script), "start"], timeout=10)
            return rc == 0
        rc, _, _ = self._run_cmd([
            "dnsmasq",
            "--conf-file", str(DHCP_CONFIG_DIR / "dnsmasq.conf"),
            "--pid-file", "/var/run/dhcp_server.pid",
        ], timeout=10)
        return rc == 0

    def _restart_vrrp(self, instance_name: str) -> bool:
        logger.info(f"Attempting VRRP restart for {instance_name}...")
        pid_file = Path(f"/var/run/keepalived_{instance_name.lower()}.pid")
        if pid_file.exists():
            try:
                pid = int(pid_file.read_text().strip())
                self._run_cmd(["kill", str(pid)], timeout=5)
            except (ValueError, IOError):
                pass
        time.sleep(SERVICE_RESTART_DELAY)
        rc, _, _ = self._run_cmd([
            "python3", str(VRRP_CONFIG_DIR / "vrrp_manager.py"),
            "start", "--instance", instance_name
        ], timeout=10)
        return rc == 0

    def _restart_ovs(self) -> bool:
        logger.info("Attempting OVS restart...")
        self._run_cmd(["systemctl", "restart", "openvswitch-switch"], timeout=15)
        time.sleep(SERVICE_RESTART_DELAY)
        return self._check_ovs_status()

    def _create_incident(self, severity: str, component: str, description: str) -> Incident:
        self._incident_counter += 1
        incident = Incident(
            incident_id=f"INC-{self._incident_counter:04d}",
            severity=severity,
            component=component,
            description=description,
        )
        self.incidents.append(incident)
        logger.warning(f"Incident created: {incident.incident_id} [{severity}] {component} - {description}")
        return incident

    def _resolve_incident(self, incident: Incident):
        incident.resolved = True
        incident.resolved_at = datetime.now().isoformat()
        logger.info(f"Incident resolved: {incident.incident_id}")

    def check_core_reachability(self) -> DiagnosticResult:
        targets = {"CS1": "10.0.255.1", "CS2": "10.0.255.2"}
        failures = []
        latencies = []
        for name, ip in targets.items():
            ok, loss, latency = self._ping_check(ip)
            if not ok:
                failures.append(f"{name} ({loss:.1f}% loss)")
            latencies.append(latency)
        if not failures:
            return DiagnosticResult(
                "Core Reachability", "PASS",
                f"All core switches reachable (avg latency: {sum(latencies)/len(latencies):.1f}ms)"
            )
        return DiagnosticResult(
            "Core Reachability", "FAIL",
            f"Core unreachable: {', '.join(failures)}"
        )

    def check_distribution_reachability(self) -> DiagnosticResult:
        blocks = {
            "Block A (DS_A1)": "10.0.10.1",
            "Block B (DS_B1)": "10.0.20.1",
            "Block C (DS_C1)": "10.0.30.1",
            "Services (DS_S1)": "10.0.40.1",
        }
        failures = []
        for name, ip in blocks.items():
            ok, loss, _ = self._ping_check(ip)
            if not ok:
                failures.append(f"{name} ({loss:.1f}% loss)")
        if not failures:
            return DiagnosticResult(
                "Distribution Reachability", "PASS",
                "All distribution switches reachable"
            )
        return DiagnosticResult(
            "Distribution Reachability", "FAIL",
            f"Distribution unreachable: {', '.join(failures)}"
        )

    def check_server_reachability(self) -> DiagnosticResult:
        servers = {
            "ERP-Server": "10.0.91.10",
            "HR-Server": "10.0.92.10",
            "DHCP-Server": "10.0.5.10",
            "Monitoring-Server": "10.0.93.10",
        }
        failures = []
        for name, ip in servers.items():
            ok, loss, latency = self._ping_check(ip)
            if not ok:
                failures.append(f"{name} ({loss:.1f}% loss)")
        if not failures:
            return DiagnosticResult(
                "Server Reachability", "PASS",
                "All infrastructure servers reachable"
            )
        return DiagnosticResult(
            "Server Reachability", "FAIL",
            f"Servers unreachable: {', '.join(failures)}"
        )

    def check_vlan_gateways(self) -> DiagnosticResult:
        gateways = {
            "VLAN 10": "10.0.10.1",
            "VLAN 20": "10.0.20.1",
            "VLAN 30": "10.0.30.1",
            "VLAN 40": "10.0.40.1",
            "VLAN 50": "10.0.50.1",
            "VLAN 60": "10.0.60.1",
        }
        failures = []
        for vlan, gw in gateways.items():
            ok, loss, _ = self._ping_check(gw, count=2)
            if not ok:
                failures.append(f"{vlan} ({gw})")
        if not failures:
            return DiagnosticResult(
                "VLAN Gateways", "PASS",
                "All VLAN gateways are responsive"
            )
        return DiagnosticResult(
            "VLAN Gateways", "WARN",
            f"Gateway issues: {', '.join(failures)}"
        )

    def check_dhcp_service(self) -> DiagnosticResult:
        running = self._check_dhcp_service()
        if running:
            return DiagnosticResult(
                "DHCP Service", "PASS",
                "DHCP server (dnsmasq) is running"
            )
        return DiagnosticResult(
            "DHCP Service", "FAIL",
            "DHCP server is not running"
        )

    def check_vrrp_instances(self) -> DiagnosticResult:
        instances = ["CORE_VIP", "CORE_OSPF", "BLOCK_A", "BLOCK_B", "BLOCK_C", "BLOCK_SERVICES"]
        failures = []
        for inst in instances:
            if not self._check_vrrp_pid_file(inst):
                failures.append(inst)
        if not failures:
            return DiagnosticResult(
                "VRRP Instances", "PASS",
                f"All {len(instances)} VRRP instances have valid PID files"
            )
        return DiagnosticResult(
            "VRRP Instances", "WARN",
            f"Missing/invalid PID files: {', '.join(failures)}"
        )

    def check_link_redundancy(self) -> DiagnosticResult:
        rc1, _, _ = self._run_cmd(["ovs-ofctl", "show", "CS1"], timeout=5)
        rc2, _, _ = self._run_cmd(["ovs-ofctl", "show", "CS2"], timeout=5)
        if rc1 == 0 and rc2 == 0:
            return DiagnosticResult(
                "Link Redundancy", "PASS",
                "Core switches CS1 and CS2 are operational"
            )
        failed = []
        if rc1 != 0:
            failed.append("CS1")
        if rc2 != 0:
            failed.append("CS2")
        return DiagnosticResult(
            "Link Redundancy", "WARN",
            f"Redundancy degraded: {', '.join(failed)} not responding"
        )

    def check_ospf_status(self) -> DiagnosticResult:
        rc, out, err = self._run_cmd(["ovs-appctl", "-t", "ovs-vswitchd", "list-dbs"], timeout=5)
        if rc == 0 and "Open_vSwitch" in out:
            return DiagnosticResult(
                "OVS/OSPF Status", "PASS",
                "OVS vswitchd is running and responsive"
            )
        return DiagnosticResult(
            "OVS/OSPF Status", "FAIL",
            f"OVS vswitchd not responding: {err[:100]}"
        )

    def run_all_checks(self) -> List[DiagnosticResult]:
        logger.info("Running comprehensive network diagnostics...")
        checks = [
            self.check_core_reachability,
            self.check_distribution_reachability,
            self.check_server_reachability,
            self.check_vlan_gateways,
            self.check_dhcp_service,
            self.check_vrrp_instances,
            self.check_link_redundancy,
            self.check_ospf_status,
        ]
        self.results = []
        for check in checks:
            result = check()
            self.results.append(result)
            logger.info(f"  [{result.status}] {result.check_name}: {result.details[:60]}")
        return self.results

    def analyze_incidents(self) -> List[Incident]:
        for result in self.results:
            if result.status == "FAIL":
                key = result.check_name
                self.consecutive_failures[key] = self.consecutive_failures.get(key, 0) + 1
                if self.consecutive_failures[key] >= 3:
                    self._create_incident(
                        "CRITICAL", result.check_name,
                        f"Repeated failures ({self.consecutive_failures[key]} consecutive): {result.details}"
                    )
                elif self.consecutive_failures[key] == 1:
                    self._create_incident(
                        "WARNING", result.check_name,
                        result.details
                    )
            else:
                key = result.check_name
                if self.consecutive_failures.get(key, 0) > 0:
                    logger.info(f"Check {key} recovered after {self.consecutive_failures[key]} failures")
                self.consecutive_failures[key] = 0
        return self.incidents

    def recover(self) -> Dict[str, Any]:
        recovery_log = {
            "timestamp": datetime.now().isoformat(),
            "attempts": [],
            "total_recovered": 0,
            "total_failed": 0,
        }

        for result in self.results:
            if result.status != "FAIL":
                continue

            for attempt in range(1, MAX_RECOVERY_ATTEMPTS + 1):
                logger.info(f"Recovery attempt {attempt}/{MAX_RECOVERY_ATTEMPTS} for {result.check_name}")
                success = False

                if "DHCP" in result.check_name:
                    success = self._restart_dhcp()
                elif "VRRP" in result.check_name:
                    success = self._restart_vrrp("CORE_VIP")
                    if not success:
                        success = self._restart_vrrp("BLOCK_A")
                elif "OSPF" in result.check_name or "OVS" in result.check_name:
                    success = self._restart_ovs()
                elif "Reachability" in result.check_name or "Gateway" in result.check_name:
                    success = self._restart_ovs()
                    if not success:
                        time.sleep(2)
                        success = self._restart_ovs()
                else:
                    success = self._restart_ovs()

                recovery_log["attempts"].append({
                    "check": result.check_name,
                    "attempt": attempt,
                    "success": success,
                })

                if success:
                    result.recovery_attempted = True
                    result.recovery_success = True
                    recovery_log["total_recovered"] += 1
                    logger.info(f"Recovery successful for {result.check_name}")
                    for incident in reversed(self.incidents):
                        if incident.component == result.check_name and not incident.resolved:
                            incident.recovery_actions.append(f"Recovery attempt {attempt}: {'success' if success else 'failed'}")
                            if success:
                                self._resolve_incident(incident)
                    break
                else:
                    result.recovery_attempted = True
                    result.recovery_success = False
                    logger.warning(f"Recovery attempt {attempt} failed for {result.check_name}")
                    time.sleep(SERVICE_RESTART_DELAY * attempt)
            else:
                recovery_log["total_failed"] += 1
                self._create_incident(
                    "CRITICAL", result.check_name,
                    f"Recovery failed after {MAX_RECOVERY_ATTEMPTS} attempts"
                )

        return recovery_log

    def save_report(self, filename: Optional[str] = None):
        if filename is None:
            filename = RESULTS_DIR / f"diagnostics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_checks": len(self.results),
                "passed": sum(1 for r in self.results if r.status == "PASS"),
                "warnings": sum(1 for r in self.results if r.status == "WARN"),
                "failed": sum(1 for r in self.results if r.status == "FAIL"),
                "incidents": len(self.incidents),
                "open_incidents": sum(1 for i in self.incidents if not i.resolved),
            },
            "checks": [asdict(r) for r in self.results],
            "incidents": [asdict(i) for i in self.incidents],
        }
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        logger.info(f"Diagnostics report saved to {filename}")
        return report


class ContinuousMonitor:
    """
    Background monitor that runs periodic diagnostics and recovery.
    """

    def __init__(self, interval: int = 30):
        self.interval = interval
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self.engine = DiagnosticsEngine()
        self._cycle_count = 0

    def start(self):
        self._running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()
        logger.info(f"Continuous monitoring started (interval: {self.interval}s)")

    def stop(self):
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        logger.info("Continuous monitoring stopped")

    def _monitor_loop(self):
        while self._running:
            self._cycle_count += 1
            logger.info(f"--- Diagnostic cycle #{self._cycle_count} ---")
            try:
                self.engine = DiagnosticsEngine()
                self.engine.run_all_checks()
                self.engine.analyze_incidents()
                if any(r.status == "FAIL" for r in self.engine.results):
                    recovery = self.engine.recover()
                    logger.info(f"Recovery: {recovery['total_recovered']} fixed, {recovery['total_failed']} failed")
                self.engine.save_report()
            except Exception as e:
                logger.error(f"Diagnostic cycle failed: {e}")
            logger.info(f"--- Cycle #{self._cycle_count} complete, next in {self.interval}s ---")
            time.sleep(self.interval)

    def get_summary(self) -> Dict:
        return {
            "running": self._running,
            "cycle_count": self._cycle_count,
            "interval": self.interval,
            "last_incidents": len(self.engine.incidents),
        }


def cli():
    parser = argparse.ArgumentParser(description="Network Diagnostics & Recovery")
    parser.add_argument("action", choices=["check", "recover", "monitor", "report"])
    parser.add_argument("--interval", type=int, default=30, help="Monitor interval in seconds")
    parser.add_argument("--output", help="Report output path")

    args = parser.parse_args()

    engine = DiagnosticsEngine()

    if args.action == "check":
        results = engine.run_all_checks()
        print(f"\n{'='*60}")
        print(f"DIAGNOSTIC RESULTS")
        print(f"{'='*60}")
        for r in results:
            status_icon = "+" if r.status == "PASS" else ("~" if r.status == "WARN" else "-")
            print(f"  [{status_icon}] {r.check_name:<30} {r.status:<6} {r.details[:50]}")
        print(f"{'='*60}")
        print(f"Total: {len(results)} | Passed: {sum(1 for r in results if r.status == 'PASS')} | Warnings: {sum(1 for r in results if r.status == 'WARN')} | Failed: {sum(1 for r in results if r.status == 'FAIL')}")

    elif args.action == "recover":
        results = engine.run_all_checks()
        engine.analyze_incidents()
        recovery = engine.recover()
        print(f"Recovery complete: {recovery['total_recovered']} fixed, {recovery['total_failed']} failed")

    elif args.action == "monitor":
        monitor = ContinuousMonitor(interval=args.interval)
        monitor.start()
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            monitor.stop()

    elif args.action == "report":
        engine.run_all_checks()
        engine.analyze_incidents()
        report = engine.save_report(args.output)
        summary = report["summary"]
        print(f"Report saved: {summary['total_checks']} checks, {summary['passed']} passed, {summary['failed']} failed, {summary['open_incidents']} open incidents")


if __name__ == "__main__":
    cli()
