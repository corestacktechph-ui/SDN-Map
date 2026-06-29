# Mininet Simulation Demo Script
## Para sa Client Meeting — Taglish Walkthrough

---

## HOW TO ACCESS

```bash
multipass shell sdn-vm
```

Once inside the VM, lahat ng commands below ay doon irurun.

---

## DEMO 1 — TRADITIONAL NETWORK (HND) BASELINE

### Sasabihin:

"Ito ang traditional hierarchical network natin — 14 switches, 33 hosts,
9 VLANs, 6 service servers. Lahat ng switches ay standalone — walang
controller, sarili nilang forwarding decisions."

### Command:

```bash
sudo python3 /home/ubuntu/run_demo.py
```

### Expected Output:

```
============================================================
  SDN MIGRATION ANALYSIS PLATFORM - NETWORK SIMULATION
============================================================
[*] Starting network...
[OK] 14 switches, 33 hosts, 62 links

============================================================
  CONNECTIVITY TESTS
============================================================
  h1       -> h2       | VLAN 10 Finance      | PASS
  h4       -> h5       | VLAN 40 Compliance   | PASS
  h10      -> h11      | VLAN 20 HR           | PASS
  h13      -> h14      | VLAN 30 IT           | PASS
  h19      -> h20      | VLAN 50 Corporate    | PASS
  h22      -> h23      | VLAN 60 Training     | PASS
  h7       -> h8       | VLAN 110 Guest A     | PASS
  h16      -> h17      | VLAN 120 Guest B     | PASS
  h25      -> h26      | VLAN 130 Guest C     | PASS
  hr1      -> monitor1 | Services (HR subnet) | PASS
  voip1    -> dhcp1    | Services             | PASS

  Result: 11/11 passed
```

### Sasabihin after:

"Lahat ng same-subnet hosts ay nakakapag-communicate. Ito ang baseline —
gumagana ang network. Pero ang cross-subnet communication ay kailangan ng
routing. Sa traditional, OSPF ang nag-ha-handle nito. Sa SDN, ang controller."

---

## DEMO 2 — 6-PHASE MIGRATION

### Sasabihin:

"Ngayon ipapakita ko ang step-by-step migration. Magsisimula tayo sa
Phase 0 — pure traditional. Tapos unti-unti nating ililipat ang bawat
block sa SDN. Sa bawat phase, pinapatunayan natin na gumagana pa rin
ang network — walang disruption."

### Phase 0 — Baseline:

```bash
sudo python3 /home/ubuntu/migration_phases.py --phase 0
```

Sasabihin: "Phase 0 — lahat ng switches ay traditional. Standalone mode.
Type 'pingall' para makita na gumagana."

Sa Mininet CLI:
```
mininet> h1 ping -c 2 h2
mininet> h19 ping -c 2 h20
mininet> exit
```

### Phase 1 — Controller Deployed (Monitor-Only):

```bash
sudo python3 /home/ubuntu/migration_phases.py --phase 1
```

Sasabihin: "Phase 1 — ni-deploy na natin ang Ryu Controller. Pero
monitor-only lang siya — nakikinig, hindi nagba-block. Lahat ng switches
ay standalone pa rin. Zero impact sa production."

```
mininet> h1 ping -c 2 h2
mininet> exit
```

### Phase 2 — Block C Pilot:

```bash
sudo python3 /home/ubuntu/migration_phases.py --phase 2
```

Sasabihin: "Phase 2 — Block C (Corporate Affairs at Training) ang pilot.
DS_C1, DS_C2, at AS_C1 ay naka-OpenFlow na — ang controller ang nag-manage
ng forwarding nila. Pero ang rest ng network — Block A, B, Services, Core —
traditional pa rin. Kung may pumalya sa Block C, hindi maaapektuhan ang iba."

```
mininet> h19 ping -c 2 h20
mininet> h1 ping -c 2 h2
mininet> exit
```

### Phase 3 — Blocks A & B:

```bash
sudo python3 /home/ubuntu/migration_phases.py --phase 3
```

Sasabihin: "Phase 3 — na-validate na ang Block C, kaya ni-expand na ang SDN
sa Block A (Finance, Compliance) at Block B (HR, IT). Mga 70-80% na ng campus
ang nasa SDN. Core ay traditional pa rin — stable."

```
mininet> h1 ping -c 2 h2
mininet> h10 ping -c 2 h11
mininet> h19 ping -c 2 h20
mininet> exit
```

### Phase 4 — Services Block:

```bash
sudo python3 /home/ubuntu/migration_phases.py --phase 4
```

Sasabihin: "Phase 4 — Services Block na. ERP, HR server, IT server, VoIP,
DHCP — lahat na-migrate. Ang centralized ACL enforcement ay active na —
ang controller ang nagde-decide kung sino ang may access sa ano."

```
mininet> voip1 ping -c 2 dhcp1
mininet> exit
```

### Phase 5 — Core Migration (Full SDN):

```bash
sudo python3 /home/ubuntu/migration_phases.py --phase 5
```

Sasabihin: "Phase 5 — ang final step. CS1 at CS2 — ang core switches —
ay na-migrate na rin. Ngayon, lahat ng 14 switches ay nasa ilalim ng
controller management. Full SDN fabric na. Ang buong network ay
controller-managed — centralized, consistent, automated."

```
mininet> pingall
mininet> exit
```

---

## DEMO 3 — MANAGEABILITY COMPARISON (Add VLAN)

### Sasabihin:

"Ngayon ipapakita ko ang pinakamalaking advantage ng SDN sa operations —
ang manageability. Kung gusto nating mag-add ng bagong VLAN..."

### Traditional (HND) way:

```bash
# Ipakita ang dami ng steps
echo "=== TRADITIONAL: Add VLAN 140 ==="
echo "Step 1: SSH to CS1... configure VLAN 140"
echo "Step 2: SSH to CS2... configure VLAN 140"
echo "Step 3: SSH to DS_A1... configure VLAN 140"
echo "Step 4: SSH to DS_A2... configure VLAN 140"
echo "... repeat for ALL 14 switches ..."
echo "Total: 14 SSH sessions, ~15-20 minutes"
```

### SDN way:

```bash
# One API call
curl -X POST http://localhost:8080/api/vlan \
  -H "Content-Type: application/json" \
  -d '{"vlan_id": 140, "vn_name": "VN_NEWDEPT", "vrf": "VRF_USERS"}'
```

Sasabihin: "Isang command. Isang API call. Ang controller ang nag-push
ng config sa lahat ng 14 switches automatically. 2-3 minutes vs 15-20
minutes. 85% faster. At consistent — walang chance ng typo o misconfiguration."

---

## DEMO 4 — SHOW SDN CONTROLLER FUNCTIONS

### Sasabihin:

"Ipapakita ko kung ano ang ginagawa ng Ryu Controller sa background."

### Controller REST API:

```bash
# Topology
curl -s http://localhost:8080/api/topology | python3 -m json.tool

# Stats
curl -s http://localhost:8080/api/stats | python3 -m json.tool

# QoS (6 queues)
curl -s http://localhost:8080/api/qos | python3 -m json.tool

# Virtual Network Mapping
curl -s http://localhost:8080/api/vn | python3 -m json.tool

# VRF Configuration
curl -s http://localhost:8080/api/vrf | python3 -m json.tool

# ACL Rules
curl -s http://localhost:8080/api/acl | python3 -m json.tool
```

---

## DEMO 5 — PERFORMANCE COMPARISON (Optional, if time allows)

### Sa Mininet CLI (HND topology):

```bash
# Latency test
mininet> h1 ping -c 20 h2

# Throughput test (start iperf server on h2, client on h1)
mininet> h2 iperf3 -s &
mininet> h1 iperf3 -c 10.1.0.52 -t 10
```

### Sa SDN topology (same tests):

```bash
mininet> h1 ping -c 20 h2
mininet> h2 iperf3 -s &
mininet> h1 iperf3 -c 10.1.0.52 -t 10
```

Sasabihin: "Compare ang latency at throughput — makikita na mas mababa
ang latency sa SDN dahil sa flow-based forwarding."

---

## QUICK REFERENCE — Commands Cheat Sheet

```bash
# Access VM
multipass shell sdn-vm

# Quick demo (11/11 connectivity test)
sudo python3 /home/ubuntu/run_demo.py

# Migration phases
sudo python3 /home/ubuntu/migration_phases.py --phase 0   # Baseline
sudo python3 /home/ubuntu/migration_phases.py --phase 1   # Controller
sudo python3 /home/ubuntu/migration_phases.py --phase 2   # Block C pilot
sudo python3 /home/ubuntu/migration_phases.py --phase 3   # Blocks A & B
sudo python3 /home/ubuntu/migration_phases.py --phase 4   # Services
sudo python3 /home/ubuntu/migration_phases.py --phase 5   # Core (full SDN)

# Manageability demo
bash /home/ubuntu/manageability_demo.sh

# Start Ryu controller (for API demo)
ryu-manager --observe-links --ofp-tcp-listen-port 6633 /home/ubuntu/sdn_controller.py &

# Controller API endpoints
curl http://localhost:8080/api/stats
curl http://localhost:8080/api/topology
curl http://localhost:8080/api/qos
curl http://localhost:8080/api/vn
curl http://localhost:8080/api/vrf
curl http://localhost:8080/api/acl
```

---

## TIPS FOR DEMO

1. Before the meeting, run `multipass shell sdn-vm` and do one quick
   `sudo python3 /home/ubuntu/run_demo.py` to warm up the VM.

2. Keep the terminal visible alongside the browser (dashboard at localhost:3000).

3. Kung mag-hang ang Mininet (rare), type `sudo mn -c` to clean up then retry.

4. Kung tanungin "bakit 11/11 lang ang test?" — explain na same-subnet
   tests lang ang ginagawa dahil walang router sa standalone mode. Cross-subnet
   requires either OSPF (traditional) or controller (SDN) — which is exactly
   the point ng comparison.

5. Kung tanungin "paano ang cross-subnet?" — show Phase 5 with controller
   where the Ryu handles the routing decisions via flow rules.
