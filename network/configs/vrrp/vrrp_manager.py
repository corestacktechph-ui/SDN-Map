"""
VRRP Manager for Mininet Network Simulation

Manages VRRP (Virtual Router Redundancy Protocol) state across
core and distribution layer switches in the Mininet topology.

Key features:
- Simulates keepalived VRRP state machine
- Ensures consistent PID file generation
- Monitors VRRP peer health
- Handles master/backup transitions
- Integrates with Mininet switch namespaces
"""

import os
import sys
import time
import json
import signal
import logging
import subprocess
import threading
import socket
import struct
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Tuple

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

VRRP_PID_DIR = "/var/run"
VRRP_STATE_DIR = "/tmp/vrrp_states"
VRRP_LOG_DIR = "/tmp/vrrp_logs"


class VRRPInstance:
    """
    Represents a single VRRP instance for a virtual router.
    Manages state transitions, PID files, and health monitoring.
    """

    # VRRP states
    INIT = "INIT"
    MASTER = "MASTER"
    BACKUP = "BACKUP"
    FAULT = "FAULT"

    def __init__(
        self,
        name: str,
        interface: str,
        virtual_router_id: int,
        priority: int,
        virtual_ip: str,
        virtual_ip_prefix: int = 24,
        advert_int: int = 1,
        preempt: bool = True,
        auth_pass: str = "",
    ):
        self.name = name
        self.interface = interface
        self.virtual_router_id = virtual_router_id
        self.priority = priority
        self.virtual_ip = virtual_ip
        self.virtual_ip_prefix = virtual_ip_prefix
        self.advert_int = advert_int
        self.preempt = preempt
        self.auth_pass = auth_pass

        self.state = self.INIT
        self.master_priority = 0
        self.master_adver_int = 0
        self.skew_time = (256 - self.priority) / 256
        self.master_down_interval = (3 * self.advert_int) + self.skew_time
        self.last_advert_received: Optional[float] = None

        self._pid_file = os.path.join(VRRP_PID_DIR, f"keepalived_{self.name.lower()}.pid")
        self._state_file = os.path.join(VRRP_STATE_DIR, f"{self.name.lower()}_state.json")
        self._running = False
        self._monitor_thread: Optional[threading.Thread] = None
        self._advert_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._peer_ip: Optional[str] = None
        self._interface_ip: Optional[str] = None

    def _ensure_dirs(self):
        os.makedirs(VRRP_PID_DIR, exist_ok=True)
        os.makedirs(VRRP_STATE_DIR, exist_ok=True)
        os.makedirs(VRRP_LOG_DIR, exist_ok=True)

    def _write_pid_file(self) -> bool:
        try:
            pid = os.getpid()
            with open(self._pid_file, 'w') as f:
                f.write(str(pid))
            logger.info(f"PID file written: {self._pid_file} -> {pid}")
            return True
        except IOError as e:
            logger.error(f"Failed to write PID file {self._pid_file}: {e}")
            return False

    def _remove_pid_file(self):
        try:
            if os.path.exists(self._pid_file):
                os.remove(self._pid_file)
                logger.info(f"PID file removed: {self._pid_file}")
        except IOError as e:
            logger.error(f"Failed to remove PID file: {e}")

    def _verify_pid_file(self) -> bool:
        try:
            if not os.path.exists(self._pid_file):
                logger.warning(f"PID file missing: {self._pid_file}")
                return False
            with open(self._pid_file, 'r') as f:
                pid_str = f.read().strip()
            if not pid_str.isdigit():
                logger.warning(f"Invalid PID in file {self._pid_file}: {pid_str}")
                return False
            pid = int(pid_str)
            if pid == os.getpid():
                return True
            try:
                os.kill(pid, 0)
                logger.warning(f"PID {pid} exists but belongs to different process")
                return False
            except OSError:
                logger.warning(f"Stale PID file: {pid} no longer exists")
                return False
        except IOError:
            return False

    def _save_state(self):
        state_data = {
            "name": self.name,
            "state": self.state,
            "priority": self.priority,
            "virtual_router_id": self.virtual_router_id,
            "virtual_ip": self.virtual_ip,
            "interface": self.interface,
            "pid": os.getpid(),
            "timestamp": datetime.now().isoformat(),
            "master_priority": self.master_priority,
            "last_advert_received": self.last_advert_received,
        }
        try:
            with open(self._state_file, 'w') as f:
                json.dump(state_data, f, indent=2)
        except IOError as e:
            logger.error(f"Failed to save state: {e}")

    def _transition_to(self, new_state: str):
        with self._lock:
            old_state = self.state
            if old_state == new_state:
                return
            self.state = new_state
            logger.info(f"VRRP [{self.name}] state transition: {old_state} -> {new_state}")
            self._save_state()
            self._on_state_change(old_state, new_state)

    def _on_state_change(self, old_state: str, new_state: str):
        """Handle VRRP state transitions - add/remove virtual IP."""
        if new_state == self.MASTER:
            self._add_virtual_ip()
        elif old_state == self.MASTER:
            self._remove_virtual_ip()

    def _add_virtual_ip(self) -> bool:
        """Add virtual IP to the interface."""
        try:
            result = subprocess.run(
                ["ip", "addr", "add", f"{self.virtual_ip}/{self.virtual_ip_prefix}",
                 "dev", self.interface, "label", f"{self.interface}:vip{self.virtual_router_id}"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0 or "File exists" in result.stderr:
                logger.info(f"Virtual IP {self.virtual_ip}/{self.virtual_ip_prefix} added to {self.interface}")
                return True
            else:
                logger.error(f"Failed to add virtual IP: {result.stderr}")
                return False
        except subprocess.TimeoutExpired:
            logger.error("Timeout adding virtual IP")
            return False

    def _remove_virtual_ip(self) -> bool:
        """Remove virtual IP from the interface."""
        try:
            result = subprocess.run(
                ["ip", "addr", "del", f"{self.virtual_ip}/{self.virtual_ip_prefix}",
                 "dev", self.interface],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0 or "Cannot assign" in result.stderr:
                logger.info(f"Virtual IP {self.virtual_ip} removed from {self.interface}")
                return True
            else:
                logger.error(f"Failed to remove virtual IP: {result.stderr}")
                return False
        except subprocess.TimeoutExpired:
            logger.error("Timeout removing virtual IP")
            return False

    def send_advertisement(self):
        """Send VRRP advertisement packet."""
        if self.state != self.MASTER:
            return
        try:
            logger.debug(f"VRRP advertisement sent from {self.name} (priority {self.priority})")
        except Exception as e:
            logger.error(f"Failed to send advertisement: {e}")

    def _monitor_loop(self):
        """Background monitoring loop for VRRP state maintenance."""
        while self._running:
            time.sleep(self.advert_int)
            try:
                if self.state == self.MASTER:
                    self.send_advertisement()
                elif self.state == self.BACKUP:
                    if self.last_advert_received:
                        elapsed = time.time() - self.last_advert_received
                        if elapsed > self.master_down_interval:
                            logger.info(f"Master down timer expired for {self.name}")
                            self._transition_to(self.MASTER)
            except Exception as e:
                logger.error(f"Monitor loop error: {e}")
                self._transition_to(self.FAULT)

    def start(self) -> bool:
        """Start the VRRP instance."""
        self._ensure_dirs()

        if not self._write_pid_file():
            return False

        self._running = True

        self._transition_to(self.BACKUP)

        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()

        if self.priority >= 200:
            time.sleep(0.1)
            self._transition_to(self.MASTER)

        logger.info(f"VRRP instance {self.name} started (state: {self.state})")
        return True

    def stop(self):
        """Stop the VRRP instance."""
        self._running = False

        if self.state == self.MASTER:
            self._remove_virtual_ip()

        self._transition_to(self.INIT)
        self._remove_pid_file()

        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=2)

        logger.info(f"VRRP instance {self.name} stopped")

    def get_status(self) -> Dict:
        """Get current VRRP instance status."""
        pid_valid = self._verify_pid_file()
        return {
            "name": self.name,
            "state": self.state,
            "priority": self.priority,
            "virtual_router_id": self.virtual_router_id,
            "virtual_ip": self.virtual_ip,
            "interface": self.interface,
            "pid_file": self._pid_file,
            "pid_valid": pid_valid,
            "process_id": os.getpid(),
            "uptime": time.time(),
            "last_advert_received": self.last_advert_received,
            "master_priority": self.master_priority,
        }


class VRRPManager:
    """
    Manages multiple VRRP instances across network switches.
    Provides centralized control and monitoring.
    """

    def __init__(self):
        self.instances: Dict[str, VRRPInstance] = {}
        self._running = False
        self._health_thread: Optional[threading.Thread] = None

    def add_instance(self, instance: VRRPInstance) -> bool:
        """Register a VRRP instance."""
        if instance.name in self.instances:
            logger.warning(f"VRRP instance {instance.name} already exists")
            return False
        self.instances[instance.name] = instance
        logger.info(f"VRRP instance {instance.name} registered")
        return True

    def start_instance(self, name: str) -> bool:
        """Start a specific VRRP instance."""
        if name not in self.instances:
            logger.error(f"VRRP instance {name} not found")
            return False
        return self.instances[name].start()

    def stop_instance(self, name: str):
        """Stop a specific VRRP instance."""
        if name in self.instances:
            self.instances[name].stop()

    def start_all(self) -> int:
        """Start all registered VRRP instances."""
        started = 0
        for name, instance in self.instances.items():
            if instance.start():
                started += 1
        self._running = True
        self._health_thread = threading.Thread(target=self._health_loop, daemon=True)
        self._health_thread.start()
        return started

    def stop_all(self):
        """Stop all VRRP instances."""
        self._running = False
        for name, instance in self.instances.items():
            instance.stop()
        if self._health_thread and self._health_thread.is_alive():
            self._health_thread.join(timeout=3)

    def get_status(self, name: Optional[str] = None) -> Dict:
        """Get VRRP status for all or a specific instance."""
        if name:
            if name in self.instances:
                return self.instances[name].get_status()
            return {"error": f"Instance {name} not found"}
        return {
            name: inst.get_status()
            for name, inst in self.instances.items()
        }

    def _health_loop(self):
        """Background health monitoring for all VRRP instances."""
        while self._running:
            for name, instance in self.instances.items():
                status = instance.get_status()
                if status["state"] == VRRPInstance.FAULT:
                    logger.warning(f"VRRP instance {name} in FAULT state, attempting recovery")
                    instance.stop()
                    time.sleep(1)
                    instance.start()
            time.sleep(10)

    def check_all_pid_files(self) -> Dict[str, bool]:
        """Verify PID file integrity for all instances."""
        return {
            name: inst._verify_pid_file()
            for name, inst in self.instances.items()
        }

    def repair_pid_files(self) -> int:
        """Repair missing or invalid PID files."""
        repaired = 0
        for name, instance in self.instances.items():
            if not instance._verify_pid_file():
                if instance._write_pid_file():
                    logger.info(f"Repaired PID file for {name}")
                    repaired += 1
        return repaired

    def get_status_summary(self) -> Dict:
        """Get a summary of all VRRP instances."""
        total = len(self.instances)
        master = sum(1 for i in self.instances.values() if i.state == VRRPInstance.MASTER)
        backup = sum(1 for i in self.instances.values() if i.state == VRRPInstance.BACKUP)
        fault = sum(1 for i in self.instances.values() if i.state == VRRPInstance.FAULT)
        init = sum(1 for i in self.instances.values() if i.state == VRRPInstance.INIT)
        pid_ok = sum(1 for n, i in self.instances.items() if i._verify_pid_file())

        return {
            "total_instances": total,
            "master": master,
            "backup": backup,
            "fault": fault,
            "init": init,
            "pid_files_ok": pid_ok,
            "pid_files_total": total,
            "timestamp": datetime.now().isoformat(),
        }


def create_default_instances(architecture: str = "traditional") -> VRRPManager:
    """
    Create default VRRP instances for the enterprise topology.
    """
    manager = VRRPManager()

    # Core Layer VRRP instances
    core_instances = [
        VRRPInstance(
            name="CORE_VIP",
            interface="CS1-eth0" if architecture == "traditional" else "CS1-eth0",
            virtual_router_id=51,
            priority=200,
            virtual_ip="10.0.255.1",
            auth_pass="amira_core_vrrp",
        ),
        VRRPInstance(
            name="CORE_OSPF",
            interface="CS1-eth0" if architecture == "traditional" else "CS1-eth0",
            virtual_router_id=52,
            priority=200,
            virtual_ip="10.0.255.2",
            auth_pass="amira_ospf_vrrp",
        ),
    ]

    # Distribution Layer VRRP instances
    dist_instances = [
        VRRPInstance(
            name="BLOCK_A",
            interface="DS_A1-eth0",
            virtual_router_id=10,
            priority=200,
            virtual_ip="10.0.10.1",
        ),
        VRRPInstance(
            name="BLOCK_B",
            interface="DS_B1-eth0",
            virtual_router_id=20,
            priority=200,
            virtual_ip="10.0.20.1",
        ),
        VRRPInstance(
            name="BLOCK_C",
            interface="DS_C1-eth0",
            virtual_router_id=30,
            priority=200,
            virtual_ip="10.0.30.1",
        ),
        VRRPInstance(
            name="BLOCK_SERVICES",
            interface="DS_S1-eth0",
            virtual_router_id=40,
            priority=200,
            virtual_ip="10.0.40.1",
        ),
    ]

    for inst in core_instances + dist_instances:
        manager.add_instance(inst)

    return manager


def main():
    """CLI entry point for VRRP Manager."""
    import argparse

    parser = argparse.ArgumentParser(description="VRRP Manager for Mininet Simulation")
    parser.add_argument("action", choices=["start", "stop", "status", "check-pids", "repair-pids", "summary"])
    parser.add_argument("--instance", help="Specific VRRP instance name")
    parser.add_argument("--architecture", choices=["traditional", "sdn"], default="traditional")

    args = parser.parse_args()

    manager = create_default_instances(args.architecture)

    if args.action == "start":
        if args.instance:
            if manager.start_instance(args.instance):
                print(f"Started VRRP instance: {args.instance}")
            else:
                print(f"Failed to start VRRP instance: {args.instance}")
        else:
            count = manager.start_all()
            print(f"Started {count} VRRP instances")

    elif args.action == "stop":
        if args.instance:
            manager.stop_instance(args.instance)
            print(f"Stopped VRRP instance: {args.instance}")
        else:
            manager.stop_all()
            print("Stopped all VRRP instances")

    elif args.action == "status":
        status = manager.get_status(args.instance)
        print(json.dumps(status, indent=2))

    elif args.action == "check-pids":
        pid_status = manager.check_all_pid_files()
        for name, ok in pid_status.items():
            status_str = "OK" if ok else "MISSING/INVALID"
            print(f"  {name}: {status_str}")

    elif args.action == "repair-pids":
        count = manager.repair_pid_files()
        print(f"Repaired {count} PID file(s)")

    elif args.action == "summary":
        summary = manager.get_status_summary()
        print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
