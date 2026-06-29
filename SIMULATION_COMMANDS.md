# SDN Migration Simulation — Command Reference

Complete guide for running all Mininet simulations in this project.

---

## Prerequisites

### Docker Environment
```bash
# Verify Docker is running
docker ps

# Required containers (should already be running):
# - amira-sdn-network (Mininet with OVS)
# - amira-ryu-controller (Ryu SDN Controller)
```

### Access the Mininet Container
```bash
docker exec -it amira-sdn-network bash
```

### Cleanup Before Running Any Simulation
```bash
mn -c
```

---

## 1. Traditional Network Topology (HND)

Runs the full hierarchical enterprise network in standalone (L2 learning) mode with STP.

```bash
# Run with interactive CLI
sudo python3 /tmp/traditional_topology.py

# Run without CLI (headless)
sudo python3 /tmp/traditional_topology.py --no-cli

# Run with DHCP enabled
sudo python3 /tmp/traditional_topology.py --dhcp
```

**Inside the CLI:**
```
pingall                          # Test all-to-all connectivity
h1 ping h10                      # Ping between specific hosts
h1 ping 10.3.0.1                 # Ping ERP server
dpctl dump-flows                 # Show switch flow tables
nodes                            # List all nodes
links                            # List all links
exit                             # Stop simulation
```

---

## 2. SDN Network Topology (Ryu Controller)

Runs the full hierarchical network in OpenFlow 1.3 mode with Ryu controller managing all switches.

```bash
# Run with interactive CLI
sudo python3 /tmp/sdn_topology.py

# Run without CLI (headless)
sudo python3 /tmp/sdn_topology.py --no-cli

# Run with DHCP enabled
sudo python3 /tmp/sdn_topology.py --dhcp
```

**Inside the CLI:**
```
pingall                          # Test all-to-all connectivity
dpctl dump-flows                 # Show OpenFlow flow entries
sh ovs-ofctl dump-flows CS1      # Show flows on specific switch
sh ovs-ofctl dump-ports CS1      # Show port statistics
h1 ping h19                      # Cross-block connectivity test
exit                             # Stop simulation
```

---

## 3. 6-Phase Migration Simulation

Demonstrates the phased migration from Traditional HND to full SDN.

### Run Individual Phases
```bash
# Phase 0: Baseline Traditional (all switches standalone)
sudo python3 /tmp/migration_phases.py --phase 0

# Phase 1: Controller Deployed (monitor-only, no forwarding change)
sudo python3 /tmp/migration_phases.py --phase 1

# Phase 2: Block C Pilot (DS_C1, DS_C2, AS_C1 → SDN)
sudo python3 /tmp/migration_phases.py --phase 2

# Phase 3: Blocks A & B Migrated (+ Block C)
sudo python3 /tmp/migration_phases.py --phase 3

# Phase 4: Services Block Migrated (+ A, B, C)
sudo python3 /tmp/migration_phases.py --phase 4

# Phase 5: Core Migrated (FULL SDN FABRIC)
sudo python3 /tmp/migration_phases.py --phase 5
```

### Run All Phases Sequentially (Automated)
```bash
sudo python3 /tmp/migration_phases.py --all --no-cli
```

### Phase Breakdown

| Phase | SDN Switches | Traditional Switches |
|-------|-------------|---------------------|
| 0 | None | All 16 |
| 1 | None (controller observing) | All 16 |
| 2 | DS_C1, DS_C2, AS_C1 | 13 remaining |
| 3 | + DS_A1, DS_A2, AS_A1, DS_B1, DS_B2, AS_B1 | 7 remaining |
| 4 | + DS_S1, DS_S2, AS_S1 | 4 remaining (core + internet) |
| 5 | All 16 | None |

---

## 4. Failover Testing

Tests network resilience by simulating link failures for both Traditional and SDN.

### Run Both Modes (Recommended)
```bash
sudo python3 /tmp/failover_testing.py --mode both
```

### Run Traditional (HND) Failover Only
```bash
sudo python3 /tmp/failover_testing.py --mode traditional
```

### Run SDN Failover Only
```bash
sudo python3 /tmp/failover_testing.py --mode sdn
```

### Test Scenarios

**Test 1 — Core Switch Failover (CS1 → CS2):**
- All links on CS1 are brought down
- Traffic must reroute through CS2
- Verifies cross-block connectivity survives

**Test 2 — Access-Distribution Failover (AS_A1-DS_A1 → AS_A1-DS_A2):**
- Link between AS_A1 and DS_A1 is brought down
- Block A hosts must remain reachable via AS_A1-DS_A2
- Verifies redundant uplink design works

---

## 5. Quick Demo Commands (Copy-Paste Ready)

### From Host Machine (macOS)

```bash
# Copy scripts to container
docker cp scripts/mininet/migration_phases.py amira-sdn-network:/tmp/
docker cp scripts/mininet/failover_testing.py amira-sdn-network:/tmp/
docker cp scripts/mininet/traditional_topology.py amira-sdn-network:/tmp/
docker cp scripts/mininet/sdn_topology.py amira-sdn-network:/tmp/

# Run migration simulation (all phases, no CLI)
docker exec amira-sdn-network python3 /tmp/migration_phases.py --all --no-cli

# Run failover testing (both modes)
docker exec amira-sdn-network python3 /tmp/failover_testing.py --mode both

# Run single phase with CLI access
docker exec -it amira-sdn-network python3 /tmp/migration_phases.py --phase 0

# Run traditional topology with CLI
docker exec -it amira-sdn-network python3 /tmp/traditional_topology.py
```

### Inside Container (Interactive)

```bash
# Enter container
docker exec -it amira-sdn-network bash

# Clean up previous runs
mn -c

# Start OVS if needed
ovsdb-server --remote=punix:/var/run/openvswitch/db.sock --pidfile --detach
ovs-vswitchd --pidfile --detach

# Run any simulation
python3 /tmp/migration_phases.py --phase 5
python3 /tmp/failover_testing.py --mode both
python3 /tmp/traditional_topology.py
python3 /tmp/sdn_topology.py
```

---

## 6. Network Topology Overview

```
                    ┌──────────┐
                    │   INET   │
                    └────┬─────┘
                         │
                    ┌────┴─────┐
                    │   ISP    │
                    └────┬─────┘
                         │
                    ┌────┴─────┐
                    │ EdgeRtr  │
                    └──┬───┬───┘
                       │   │
              ┌────────┘   └────────┐
              │                     │
         ┌────┴────┐          ┌────┴────┐
         │   CS1   │──────────│   CS2   │        ← Core Layer
         └─┬─┬─┬─┬─┘          └─┬─┬─┬─┬─┘
           │ │ │ │               │ │ │ │
     ┌─────┘ │ │ └─────┐  ┌─────┘ │ │ └─────┐
     │       │ │       │  │       │ │       │
  ┌──┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐                ← Distribution Layer
  │DS_A1├─┤DS_A2│ │DS_B1├─┤DS_B2│
  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘
     │       │       │       │
     └───┬───┘       └───┬───┘
         │               │
    ┌────┴────┐     ┌────┴────┐
    │  AS_A1  │     │  AS_B1  │                    ← Access Layer
    └────┬────┘     └────┬────┘
         │               │
   h1-h9 (Block A)  h10-h18 (Block B)


  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
  │DS_C1 ├─┤DS_C2 │ │DS_S1 ├─┤DS_S2 │
  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘
     └───┬───┘       └───┬───┘
         │               │
    ┌────┴────┐     ┌────┴────┐
    │  AS_C1  │     │  AS_S1  │
    └────┬────┘     └────┬────┘
         │               │
  h19-h27 (Block C)  Services (ERP, HR, IT, VoIP, DHCP, Monitor)
```

---

## 7. Troubleshooting

| Issue | Solution |
|-------|----------|
| `mn -c` hangs | `pkill -9 python3; pkill -9 ovs-vswitchd` then restart OVS |
| OVS not running | `ovsdb-server --pidfile --detach; ovs-vswitchd --pidfile --detach` |
| Switches won't start | Run `mn -c` first to clean up previous bridges |
| SDN test fails | Ensure Ryu controller is running on port 6633 |
| Permission denied | Use `sudo` or run inside privileged container |
| Container not found | Check `docker ps` — container may have stopped |

---

## 8. Expected Results Summary

| Simulation | Expected Outcome |
|-----------|-----------------|
| Migration (all phases) | ✓ All 6 phases pass connectivity tests |
| Failover — Core (HND) | ✓ 5/5 paths survive CS1 failure |
| Failover — Core (SDN) | ✓ 5/5 paths survive CS1 failure |
| Failover — Access (HND) | ✓ 5/5 paths survive DS_A1 link failure |
| Failover — Access (SDN) | ✓ 5/5 paths survive DS_A1 link failure |
