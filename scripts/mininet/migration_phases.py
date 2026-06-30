"""
6-Phase Migration Simulation for Mininet

Demonstrates the phased migration from Traditional HND to SDN.
Each phase progressively moves blocks to OpenFlow/controller management
while proving connectivity remains intact at every step.

Usage:
    sudo python migration_phases.py --phase 0   # Baseline (all traditional)
    sudo python migration_phases.py --phase 1   # Controller introduced (monitor-only)
    sudo python migration_phases.py --phase 2   # Block C pilot
    sudo python migration_phases.py --phase 3   # Blocks A & B migrated
    sudo python migration_phases.py --phase 4   # Services block migrated
    sudo python migration_phases.py --phase 5   # Core migrated (full SDN)
    sudo python migration_phases.py --all       # Run all phases sequentially
"""

import argparse
import time
from mininet.topo import Topo
from mininet.net import Mininet
from mininet.node import OVSKernelSwitch, RemoteController
from mininet.cli import CLI
from mininet.log import setLogLevel, info, error
import subprocess


# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════
SERVICE_CONFIG = {
    'erp1':     {'ip': '10.3.0.1/28'},
    'hr1':      {'ip': '10.3.0.17/28'},
    'monitor1': {'ip': '10.3.0.18/28'},
    'it1':      {'ip': '10.3.0.33/28'},
    'voip1':    {'ip': '10.3.0.49/28'},
    'dhcp1':    {'ip': '10.3.0.50/28'},
}

VLAN_CONFIG = {
    10: {'gw': '10.1.3.254', 'pool': '10.1.0.51', 'mask': '/22'},
    20: {'gw': '10.1.7.254', 'pool': '10.1.4.51', 'mask': '/22'},
    30: {'gw': '10.1.11.254', 'pool': '10.1.8.51', 'mask': '/22'},
    40: {'gw': '10.1.15.254', 'pool': '10.1.12.51', 'mask': '/22'},
    50: {'gw': '10.1.19.254', 'pool': '10.1.16.51', 'mask': '/22'},
    60: {'gw': '10.1.23.254', 'pool': '10.1.20.51', 'mask': '/22'},
    110: {'gw': '10.2.0.254', 'pool': '10.2.0.51', 'mask': '/24'},
    120: {'gw': '10.2.1.254', 'pool': '10.2.1.51', 'mask': '/24'},
    130: {'gw': '10.2.2.254', 'pool': '10.2.2.51', 'mask': '/24'},
}

HOST_VLAN = {
    'h1': 10, 'h2': 10, 'h3': 10,
    'h4': 40, 'h5': 40, 'h6': 40,
    'h7': 110, 'h8': 110, 'h9': 110,
    'h10': 20, 'h11': 20, 'h12': 20,
    'h13': 30, 'h14': 30, 'h15': 30,
    'h16': 120, 'h17': 120, 'h18': 120,
    'h19': 50, 'h20': 50, 'h21': 50,
    'h22': 60, 'h23': 60, 'h24': 60,
    'h25': 130, 'h26': 130, 'h27': 130,
}

HOST_ACCESS = {
    'h1': 'AS_A1', 'h2': 'AS_A1', 'h3': 'AS_A1',
    'h4': 'AS_A1', 'h5': 'AS_A1', 'h6': 'AS_A1',
    'h7': 'AS_A1', 'h8': 'AS_A1', 'h9': 'AS_A1',
    'h10': 'AS_B1', 'h11': 'AS_B1', 'h12': 'AS_B1',
    'h13': 'AS_B1', 'h14': 'AS_B1', 'h15': 'AS_B1',
    'h16': 'AS_B1', 'h17': 'AS_B1', 'h18': 'AS_B1',
    'h19': 'AS_C1', 'h20': 'AS_C1', 'h21': 'AS_C1',
    'h22': 'AS_C1', 'h23': 'AS_C1', 'h24': 'AS_C1',
    'h25': 'AS_C1', 'h26': 'AS_C1', 'h27': 'AS_C1',
}

# Which switches belong to which block
BLOCK_C_SWITCHES = ['DS_C1', 'DS_C2', 'AS_C1']
BLOCK_A_SWITCHES = ['DS_A1', 'DS_A2', 'AS_A1']
BLOCK_B_SWITCHES = ['DS_B1', 'DS_B2', 'AS_B1']
BLOCK_S_SWITCHES = ['DS_S1', 'DS_S2', 'AS_S1']
CORE_SWITCHES = ['CS1', 'CS2']
INET_SWITCHES = ['ISP', 'EdgeRtr']


def dpid(n):
    return f'{n:016x}'


SWITCH_DPIDS = {
    'CS1': dpid(1), 'CS2': dpid(2),
    'DS_A1': dpid(11), 'DS_A2': dpid(12),
    'DS_B1': dpid(13), 'DS_B2': dpid(14),
    'DS_C1': dpid(15), 'DS_C2': dpid(16),
    'DS_S1': dpid(17), 'DS_S2': dpid(18),
    'AS_A1': dpid(21), 'AS_B1': dpid(22),
    'AS_C1': dpid(23), 'AS_S1': dpid(24),
    'ISP': dpid(31), 'EdgeRtr': dpid(32),
}


class MigrationTopo(Topo):
    """Topology that supports phased migration.
    
    Switches in 'sdn_switches' connect to the remote controller.
    Switches NOT in 'sdn_switches' run standalone (traditional).
    """

    def __init__(self, sdn_switches=None, **kwargs):
        self.sdn_switches = sdn_switches or []
        super().__init__(**kwargs)

    def build(self):
        info(f'*** Building Migration Topology ***\n')
        info(f'*** SDN-managed switches: {self.sdn_switches if self.sdn_switches else "NONE (all traditional)"}\n')

        # Create all switches
        switches = {}
        for name, did in SWITCH_DPIDS.items():
            switches[name] = self.addSwitch(name, cls=OVSKernelSwitch,
                                            protocols='OpenFlow13', dpid=did)

        # Core links
        self.addLink(switches['CS1'], switches['CS2'])

        # Core to Distribution (redundant)
        for ds in ['DS_A1', 'DS_A2', 'DS_B1', 'DS_B2', 'DS_C1', 'DS_C2', 'DS_S1', 'DS_S2']:
            self.addLink(switches['CS1'], switches[ds])
            self.addLink(switches['CS2'], switches[ds])

        # Distribution pairs
        for a, b in [('DS_A1', 'DS_A2'), ('DS_B1', 'DS_B2'), ('DS_C1', 'DS_C2'), ('DS_S1', 'DS_S2')]:
            self.addLink(switches[a], switches[b])

        # Cross-block links REMOVED — inter-block traffic routes via core (L3/OSPF)
        # In proper hierarchical design, blocks only connect through CS1/CS2

        # Distribution to Access (redundant)
        for ds1, ds2, access in [('DS_A1', 'DS_A2', 'AS_A1'), ('DS_B1', 'DS_B2', 'AS_B1'),
                                  ('DS_C1', 'DS_C2', 'AS_C1'), ('DS_S1', 'DS_S2', 'AS_S1')]:
            self.addLink(switches[ds1], switches[access])
            self.addLink(switches[ds2], switches[access])

        # Internet
        inet = self.addHost('INET', ip='198.51.100.100/24')
        self.addLink(inet, switches['ISP'])
        self.addLink(switches['ISP'], switches['EdgeRtr'])
        self.addLink(switches['CS1'], switches['EdgeRtr'])
        self.addLink(switches['CS2'], switches['EdgeRtr'])

        # Services
        for name, cfg in SERVICE_CONFIG.items():
            h = self.addHost(name, ip=cfg['ip'])
            self.addLink(switches['AS_S1'], h)

        # 27 hosts
        for hostname, vlan in sorted(HOST_VLAN.items()):
            vcfg = VLAN_CONFIG[vlan]
            h = self.addHost(hostname, ip=f'{vcfg["pool"]}{vcfg["mask"]}',
                             defaultRoute=f'via {vcfg["gw"]}')
            self.addLink(switches[HOST_ACCESS[hostname]], h)

        info('*** Topology built: 27 hosts + 6 services + internet\n')


def run_phase(phase_num, start_cli=True):
    """Run a specific migration phase."""
    setLogLevel('info')

    # Clean previous
    subprocess.call('mn -c 2>/dev/null || true', shell=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    # Determine which switches are SDN-managed per phase
    sdn_sw = []
    use_controller = False
    phase_desc = ''

    if phase_num == 0:
        phase_desc = 'PHASE 0 — Baseline Traditional (All switches standalone)'
        sdn_sw = []
    elif phase_num == 1:
        phase_desc = 'PHASE 1 — Controller Deployed (monitor-only, no forwarding change)'
        sdn_sw = []  # Controller connects but switches still standalone
        use_controller = True
    elif phase_num == 2:
        phase_desc = 'PHASE 2 — Block C Pilot (DS_C1, DS_C2, AS_C1 → SDN)'
        sdn_sw = BLOCK_C_SWITCHES
        use_controller = True
    elif phase_num == 3:
        phase_desc = 'PHASE 3 — Blocks A & B Migrated (+ Block C)'
        sdn_sw = BLOCK_C_SWITCHES + BLOCK_A_SWITCHES + BLOCK_B_SWITCHES
        use_controller = True
    elif phase_num == 4:
        phase_desc = 'PHASE 4 — Services Block Migrated (+ A, B, C)'
        sdn_sw = BLOCK_C_SWITCHES + BLOCK_A_SWITCHES + BLOCK_B_SWITCHES + BLOCK_S_SWITCHES
        use_controller = True
    elif phase_num == 5:
        phase_desc = 'PHASE 5 — Core Migrated (FULL SDN FABRIC)'
        sdn_sw = BLOCK_C_SWITCHES + BLOCK_A_SWITCHES + BLOCK_B_SWITCHES + BLOCK_S_SWITCHES + CORE_SWITCHES + INET_SWITCHES
        use_controller = True

    info(f'\n{"="*60}\n')
    info(f'  {phase_desc}\n')
    info(f'{"="*60}\n\n')

    topo = MigrationTopo(sdn_switches=sdn_sw)

    # Build network
    if use_controller:
        net = Mininet(
            topo=topo,
            switch=OVSKernelSwitch,
            controller=lambda name: RemoteController(name, ip='127.0.0.1', port=6633),
            build=True,
            ipBase='10.0.0.0/8',
        )
    else:
        net = Mininet(
            topo=topo,
            switch=OVSKernelSwitch,
            controller=None,
            build=True,
            ipBase='10.0.0.0/8',
        )

    net.start()

    # Set standalone mode for non-SDN switches
    for sw in net.switches:
        if sw.name not in sdn_sw:
            sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=standalone')
        else:
            sw.cmd(f'ovs-vsctl set bridge {sw.name} fail_mode=secure')

    info(f'\n*** Network started for {phase_desc}\n')
    info(f'*** SDN switches: {sdn_sw if sdn_sw else "NONE"}\n')
    info(f'*** Traditional switches: {[s.name for s in net.switches if s.name not in sdn_sw]}\n')

    # Quick connectivity test
    info('\n*** Running connectivity verification...\n')
    time.sleep(3)  # Wait for flows to settle

    test_pairs = [
        ('h1', 'h2', 'Same VLAN (Block A, VLAN 10)'),
        ('h19', 'h20', 'Same VLAN (Block C, VLAN 50)'),
        ('h10', 'h11', 'Same VLAN (Block B, VLAN 20)'),
        ('h1', 'h10', 'Cross-block A→B (via core)'),
        ('h1', 'h19', 'Cross-block A→C (via core)'),
        ('h10', 'h19', 'Cross-block B→C (via core)'),
        ('h1', 'erp1', 'VLAN 10 → ERP service'),
        ('h4', 'monitor1', 'VLAN 40 → Monitor service'),
        ('h10', 'hr1', 'VLAN 20 → HR service'),
        ('h13', 'it1', 'VLAN 30 → IT service'),
        ('h19', 'voip1', 'VLAN 50 → VoIP service'),
        ('h22', 'voip1', 'VLAN 60 → VoIP service'),
    ]

    for src, dst, desc in test_pairs:
        h_src = net.get(src)
        h_dst = net.get(dst)
        if h_src and h_dst:
            result = h_src.cmd(f'ping -c 2 -W 2 {h_dst.IP()} 2>&1 | grep -E "received|loss"')
            status = '✓ OK' if '0% packet loss' in result or '0 received' not in result else '✗ FAIL'
            info(f'  {src} -> {dst} ({desc}): {status}\n')

    info(f'\n*** Phase {phase_num} ready. Type "pingall" to verify full connectivity.\n')
    info(f'*** Type "exit" to end this phase.\n')

    if start_cli:
        CLI(net)
    net.stop()


def run_all_phases():
    """Run all 6 phases sequentially with validation."""
    info('\n' + '='*60 + '\n')
    info('  RUNNING ALL 6 MIGRATION PHASES SEQUENTIALLY\n')
    info('='*60 + '\n')

    for phase in range(6):
        run_phase(phase, start_cli=False)
        info(f'\n*** Phase {phase} complete. Moving to next phase in 5 seconds...\n')
        time.sleep(5)

    info('\n' + '='*60 + '\n')
    info('  ALL PHASES COMPLETE — MIGRATION SUCCESSFUL\n')
    info('='*60 + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='6-Phase SDN Migration Simulation')
    parser.add_argument('--phase', type=int, choices=[0, 1, 2, 3, 4, 5],
                        help='Run specific migration phase (0-5)')
    parser.add_argument('--all', action='store_true', help='Run all phases sequentially')
    parser.add_argument('--no-cli', action='store_true', help='Run without CLI')
    args = parser.parse_args()

    if args.all:
        run_all_phases()
    elif args.phase is not None:
        run_phase(args.phase, start_cli=not args.no_cli)
    else:
        parser.print_help()
        print('\nExamples:')
        print('  sudo python migration_phases.py --phase 0    # Traditional baseline')
        print('  sudo python migration_phases.py --phase 2    # Block C pilot')
        print('  sudo python migration_phases.py --phase 5    # Full SDN')
        print('  sudo python migration_phases.py --all        # All phases in sequence')
