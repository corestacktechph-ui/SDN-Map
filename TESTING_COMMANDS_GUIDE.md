# COMPLETE TESTING COMMANDS GUIDE
# SDN Migration Thesis — Presentation Testing

> **BASAHIN MUNA ITO BAGO MAG-TEST:**
> Lahat ng commands dito ay COPY-PASTE READY. Sunud-sunurin mo lang.
> Ang tests ay nasa Docker containers na running na sa machine mo.

---

## ════════════════════════════════════════════════════════════
## STEP 0: PAANO PUMASOK SA CONTAINERS
## ════════════════════════════════════════════════════════════

Buksan ang Terminal app sa Mac mo. May 3 Docker containers ka:

| Container Name | Purpose | Command to Enter |
|---|---|---|
| `amira-traditional-network` | Traditional HND topology tests | `docker exec -it amira-traditional-network bash` |
| `amira-sdn-network` | SDN topology tests | `docker exec -it amira-sdn-network bash` |
| `amira-ryu-controller` | Ryu SDN Controller | `docker exec -it amira-ryu-controller bash` |

### Para sa HND tests (Part 1-3), paste ito:
```bash
docker exec -it amira-traditional-network bash
```

Makikita mo: `root@colima:/workspace#` — ito ang prompt mo sa loob.

### Para sa SDN tests (Part 5-7), paste ito:
```bash
docker exec -it amira-sdn-network bash
```

### Para lumabas sa container:
```bash
exit
```

---

## ════════════════════════════════════════════════════════════
## PART 1: HND (TRADITIONAL NETWORK) TESTING
## ════════════════════════════════════════════════════════════

### ─── 1.1 START THE TRADITIONAL TOPOLOGY ───

**Ano ito:** Nagse-setup ng buong enterprise network simulation sa Mininet.
Gumagawa ng 27 user hosts, 16 switches (Core/Distribution/Access layers),
6 service servers, Internet simulation, NAT, at DHCP.

**Saan i-run:** Sa `amira-traditional-network` container.

**Paste ito:**
```bash
python3 scripts/mininet/traditional_topology.py
```

**Ano mangyayari:**
- Mag-build ng topology (~10 seconds)
- Mag-start lahat ng switches at hosts
- Mag-configure ng VRRP, DHCP, NAT, internet routes
- Mag-run ng baseline diagnostics
- Lalabas ang `mininet>` prompt — dito ka mag-type ng test commands

**Expected output:**
```
*** Building Traditional Hierarchical Topology (Expanded) ***
*** Topology built: 27 hosts, 9 VLANs, Internet simulation, full services
*** Starting 16 switches
*** Switches set to standalone mode (L2 forwarding enabled)
*** Traditional Network started (Expanded Topology)
*** Network ready. Tests available:
mininet>
```

**IMPORTANT:** Lahat ng commands na may `mininet>` prefix sa guide na ito
ay i-type/paste mo sa `mininet>` prompt (wag isama ang "mininet>" part).

---

### ─── 1.2 HND: TOPOLOGY VERIFICATION ───

**Ano ito:** Pinapatunayan na tama ang topology — lahat ng switches at
hosts ay connected properly sa hierarchical design.

**Paste sa `mininet>` prompt:**

```
net
```
↑ Shows lahat ng nodes at connections. Makikita mo ang 27 hosts, 16 switches.

```
nodes
```
↑ Lists all network nodes

```
links
```
↑ Shows all physical links between switches/hosts

```
dump
```
↑ Shows detailed info: IPs, interfaces, PIDs ng lahat ng nodes

**Expected output (sample from `net`):**
```
h1 h1-eth0:AS_A1-eth10
CS1 lo:  CS1-eth1:CS2-eth1 CS1-eth2:DS_A1-eth1 ...
```

---

### ─── 1.3 HND: VLAN SEGMENTATION / CONFIGURATION ───

**Ano ito:** Pinapatunayan na ang VLAN segmentation ay tama — hosts sa
same VLAN ay magka-communicate, hosts sa iba't ibang VLAN ay isolated.

**Network Architecture:**
- Block A (AS_A1): VLAN 10 (Finance), VLAN 40 (Compliance), VLAN 110 (Guest A)
- Block B (AS_B1): VLAN 20 (HR), VLAN 30 (IT), VLAN 120 (Guest B)
- Block C (AS_C1): VLAN 50 (Corporate), VLAN 60 (Executive), VLAN 130 (Guest C)
- Services (AS_S1): VLAN 91-94 (ERP, HR, IT, VoIP servers)

**Paste sa `mininet>` prompt (isa-isa):**

**Same VLAN test (SHOULD PASS — same subnet):**
```
h1 ping -c 3 h2
```
↑ h1 at h2 = both VLAN 10 (Finance), same switch AS_A1. Should get replies.

```
h10 ping -c 3 h11
```
↑ h10 at h11 = both VLAN 20 (HR), same switch AS_B1. Should get replies.

```
h19 ping -c 3 h20
```
↑ h19 at h20 = both VLAN 50 (Corporate), same switch AS_C1. Should get replies.

**Cross-VLAN test (shows traditional limitation — no L2 isolation):**
```
h1 ping -c 3 h4
```
↑ VLAN 10 → VLAN 40 (different departments, same switch). In traditional
  standalone mode, this will PASS because flat L2 — no VLAN enforcement.
  This is the weakness ng Traditional na i-demonstrate mo.

```
h7 ping -c 3 h1
```
↑ Guest (VLAN 110) → Finance (VLAN 10). In traditional, this PASSES — walang
  guest isolation. SDN fixes this.

**AUTOMATED FULL VLAN TEST (exit mininet first: type `exit`):**
```bash
mn -c
python3 scripts/mininet/vlan_isolation_test.py --mode traditional
```
↑ Runs 4 test groups: Same-VLAN, Cross-VLAN, Service ACL, Guest Isolation.
  Shows traditional has NO enforcement. Output includes comparison table.

---

### ─── 1.4 HND: ROUTING CONFIGURATION & OSPF NEIGHBOR ───

**Ano ito:** Pinapatunayan na OSPF dynamic routing ay running at may
adjacencies between Core at Distribution switches. Ito ang nagpa-papasa
ng traffic between different VLANs through L3 routing.

**IMPORTANT:** Kailangan ng ROUTED topology para dito (may FRR/OSPF).
Kung naka-start ka ng basic topology, exit muna then run:

```bash
mn -c
python3 scripts/mininet/traditional_topology_routed.py
```

**Paste sa `mininet>` prompt:**

```
CS1 vtysh -c "show ip ospf neighbor"
```
↑ Shows OSPF neighbors ng Core Switch 1. Expected: DS_A1, DS_A2, DS_B1, DS_B2,
  DS_C1, DS_C2, DS_S1, DS_S2, EdgeRtr as neighbors in FULL state.

```
CS2 vtysh -c "show ip ospf neighbor"
```
↑ Shows OSPF neighbors ng Core Switch 2. Should mirror CS1.

```
CS1 vtysh -c "show ip route ospf"
```
↑ Shows all routes na natutunan through OSPF. Expected: routes to all VLAN
  subnets (10.1.0.0/22, 10.1.4.0/22, etc.) via distribution switches.

```
DS_A1 vtysh -c "show ip ospf interface brief"
```
↑ Shows OSPF-enabled interfaces sa Distribution Switch A1.

```
CS1 vtysh -c "show ip ospf database"
```
↑ Shows the full OSPF Link State Database — all LSAs in the network.

```
CS1 vtysh -c "show ip route"
```
↑ Shows complete routing table (OSPF + connected + static routes).

**Expected OSPF neighbor output:**
```
Neighbor ID     State    Dead Time  Address         Interface
10.x.x.x       Full/DR  00:00:38   10.x.x.x       CS1-ethX
```

---

### ─── 1.5 HND: VRRP REDUNDANCY CONFIGURATION ───

**Ano ito:** Pinapatunayan na VRRP (Virtual Router Redundancy Protocol) ay
configured sa distribution layer. Ibig sabihin, kung mag-fail ang isang
distribution switch, yung backup switch ay mag-take over ng gateway IP.

**Paste sa `mininet>` prompt:**

```
h1 ping -c 3 10.1.3.254
```
↑ Ping ang VRRP Virtual IP (VIP) para sa Block A gateway.
  Ito ang shared gateway ng VLAN 10/40/110. Kahit mag-die ang DS_A1,
  DS_A2 ang mag-take over nito.

```
h10 ping -c 3 10.1.7.254
```
↑ Ping VRRP VIP para sa Block B gateway (VLAN 20/30/120).

```
h19 ping -c 3 10.1.19.254
```
↑ Ping VRRP VIP para sa Block C gateway (VLAN 50/60/130).

```
h1 ping -c 3 10.3.0.14
```
↑ Ping VRRP VIP para sa Services block gateway.

**Check VRRP status (if keepalived logs exist):**
```
DS_A1 cat /tmp/keepalived_DS_A1.log 2>/dev/null || echo "No VRRP log"
```

```
DS_A2 cat /tmp/keepalived_DS_A2.log 2>/dev/null || echo "No VRRP log"
```

**What to explain sa presentation:**
- DS_A1 = MASTER (priority 150), DS_A2 = BACKUP (priority 100)
- If DS_A1 fails, DS_A2 takes over the VIP within 3 seconds
- In traditional, VRRP kailangan i-configure per-switch pair manually
- In SDN, controller handles failover instantly via flow reroute

---

### ─── 1.6 HND: ACL CONFIGURATION ───

**Ano ito:** Tests kung ang Access Control Lists ay enforced. Sa enterprise
network, hindi lahat ng department ay may access sa lahat ng services.

**ACL Rules ng network mo:**

| Service | IP | Allowed VLANs | Blocked |
|---|---|---|---|
| ERP (erp1) | 10.3.0.1 | VLAN 10 only (Finance) | Everyone else |
| HR (hr1) | 10.3.0.17 | VLANs 10-60 (all users) | Guests (110,120,130) |
| Monitor (monitor1) | 10.3.0.18 | VLANs 10-60 | Guests |
| IT (it1) | 10.3.0.33 | VLANs 30,40 only (IT/Compliance) | Everyone else |
| VoIP (voip1) | 10.3.0.49 | VLANs 10-60 | Guests |
| DHCP (dhcp1) | 10.3.0.50 | VLANs 10-60 | Guests |

**Paste sa `mininet>` prompt — ALLOWED ACCESS (should get reply):**

```
h1 ping -c 3 10.3.0.1
```
↑ Finance (VLAN 10) → ERP — **ALLOWED** ✓

```
h1 ping -c 3 10.3.0.17
```
↑ Finance (VLAN 10) → HR — **ALLOWED** ✓

```
h13 ping -c 3 10.3.0.33
```
↑ IT (VLAN 30) → IT Server — **ALLOWED** ✓

```
h4 ping -c 3 10.3.0.33
```
↑ Compliance (VLAN 40) → IT Server — **ALLOWED** ✓

```
h19 ping -c 3 10.3.0.49
```
↑ Corporate (VLAN 50) → VoIP — **ALLOWED** ✓

**BLOCKED ACCESS (should NOT get reply in SDN; traditional has no enforcement):**

```
h10 ping -c 3 10.3.0.1
```
↑ HR (VLAN 20) → ERP — **SHOULD BE BLOCKED** (only VLAN 10 allowed)

```
h7 ping -c 3 10.3.0.17
```
↑ Guest A (VLAN 110) → HR — **SHOULD BE BLOCKED** (guests can't reach internal)

```
h10 ping -c 3 10.3.0.33
```
↑ HR (VLAN 20) → IT Server — **SHOULD BE BLOCKED** (only VLANs 30,40)

```
h25 ping -c 3 10.3.0.18
```
↑ Guest C (VLAN 130) → Monitor — **SHOULD BE BLOCKED**

**NOTE para sa presentation:** Sa Traditional network, lahat ng blocked tests
ay PAPASA (reply) kasi walang ACL enforcement sa L2 standalone mode.
Ito ang weakness — kailangan manual per-switch ACL config (tedious).
Sa SDN, controller enforces ACL via flow rules — automatic drop.

**AUTOMATED COMPLETE ACL TEST:**
```
py execfile('scripts/tests/HNDValidationS_ACL.py')
```
↑ Runs ALL validation tests: OSPF, VRRP, Host Connectivity, Service Ports,
  Internet, at ACL enforcement (9 test cases). Outputs PASS/FAIL per test.

---

### ─── 1.7 HND: CONNECTIVITY VALIDATION ───

#### HOST-TO-HOST

**Ano ito:** Basic L3 reachability between hosts across different blocks.
Proves na ang routing (OSPF) ay working between VLANs/blocks.

```
h1 ping -c 5 h10
```
↑ Block A (Finance, 10.1.0.51) → Block B (HR, 10.1.4.51)
  Crosses: AS_A1 → DS_A1 → CS1 → DS_B1 → AS_B1

```
h1 ping -c 5 h19
```
↑ Block A (Finance) → Block C (Corporate, 10.1.16.51)
  Longest path: AS_A1 → DS_A1 → CS1 → DS_C1 → AS_C1

```
h10 ping -c 5 h22
```
↑ Block B (HR) → Block C (Executive, 10.1.20.51)

```
h13 ping -c 5 h4
```
↑ Block B (IT) → Block A (Compliance)

```
h1 ping -c 5 h2
```
↑ Same VLAN, same switch (fastest — no routing needed)

**Test ALL hosts (takes ~2 minutes):**
```
pingall
```
↑ Tests every host pair. Output shows connectivity matrix.

#### HOST-TO-INTERNET

**Ano ito:** Tests kung ang hosts ay nakakarating sa Internet simulation
(198.51.100.100) through NAT sa EdgeRtr.

```
h1 ping -c 5 198.51.100.100
```
↑ Finance user → Internet (through NAT)

```
h7 ping -c 5 198.51.100.100
```
↑ Guest A → Internet (guests should have internet access)

```
h13 ping -c 5 198.51.100.100
```
↑ IT → Internet

```
h16 ping -c 5 198.51.100.100
```
↑ Guest B → Internet

```
h25 ping -c 5 198.51.100.100
```
↑ Guest C → Internet

```
h19 ping -c 5 198.51.100.100
```
↑ Corporate → Internet

#### HOST-TO-SERVICE (ACL VALIDATION)

**Automated full service test:**
```
py execfile('scripts/tests/servicetest.py')
```
↑ Tests application-level connectivity:
  - ERP: HTTP (port 80), HTTPS (port 443)
  - HR: HTTPS (port 443)
  - Monitor: HTTP (port 80), iperf3 (port 5201)
  - IT: HTTP (port 80), SNMP (port 161 UDP)
  - VoIP: SIP (port 5060 UDP)
  - INET: HTTPS (port 443) from permitted VLANs

**Automated COMPLETE validation (BEST FOR DEMO):**
```
py execfile('scripts/tests/HNDValidationS_ACL.py')
```
↑ Runs EVERYTHING: OSPF check, VRRP check, service processes,
  host-to-host, service ports, internet, ACL enforcement.
  Outputs summary with PASS/FAIL count.

---

## ════════════════════════════════════════════════════════════
## PART 2: BASELINE PERFORMANCE TESTS
## ════════════════════════════════════════════════════════════

**IMPORTANT:** May 2 ways mag-run ng performance tests:
1. **From `mininet>` prompt** — while topology is running (manual tests)
2. **From container shell** — scripts na auto-create own topology

Para sa Option 2, exit muna ang mininet (`exit` command), then run
`mn -c` para linisin.

---

### ─── 2.1 LATENCY (20-Ping RTT Measurement) ───

**Ano ito:** Measures Round-Trip Time (RTT) — kung gaano kabilis ang
packet na marating ang destination at bumalik. 20 pings para sa
statistical reliability. Gets min/avg/max/stddev.

**Option A — From `mininet>` prompt (comprehensive, all hosts):**
```
py execfile('scripts/tests/latencytest.py')
```
↑ Runs 20-ping test from ALL 27 hosts to:
  - INET (198.51.100.100) — measures NAT latency
  - Services (based on ACL rules — only tests ALLOWED paths)
  Outputs average RTT per host, identifies slow paths.

**Option B — Manual spot checks from `mininet>`:**
```
h1 ping -c 20 -i 0.2 10.3.0.1
```
↑ 20 pings, 200ms interval, h1→ERP. Look at the last line for stats:
  `rtt min/avg/max/mdev = 0.045/0.067/0.102/0.015 ms`

```
h1 ping -c 20 -i 0.2 198.51.100.100
```
↑ h1→Internet (through EdgeRtr NAT)

```
h1 ping -c 20 -i 0.2 h10
```
↑ h1→h10 (cross-block latency)

**Option C — Standalone script (from container shell, NOT mininet):**
```bash
python3 scripts/tests/ping_test.py --target 10.3.0.1 --count 20
```
↑ Generates HTML chart sa `network/results/charts/`

```bash
python3 scripts/tests/ping_test.py --target 198.51.100.100 --count 20
```

**Metric to record:** Average RTT (ms) — lower is better.
- Same VLAN: ~0.03-0.1 ms
- Cross-block: ~0.1-0.5 ms
- To Internet: ~0.5-2 ms

---

### ─── 2.2 THROUGHPUT (iperf3 Bandwidth Test) ───

**Ano ito:** Measures maximum data transfer rate (Mbps/Gbps) between hosts.
Uses iperf3 TCP at UDP. Tests at 3 load levels: Low (100Mbps), Moderate
(500Mbps), High (1Gbps).

**Option A — Manual from `mininet>` (step by step):**

**Step 1: Start iperf3 server sa destination host:**
```
monitor1 iperf3 -s -D
```
↑ Start iperf3 server on Monitor node (background daemon mode).
  -s = server mode, -D = daemonize (runs in background)

**Step 2: Run throughput test from client:**
```
h1 iperf3 -c 10.3.0.18 -t 10
```
↑ TCP throughput test, 10 seconds. Shows bandwidth in Mbits/sec.
  Expected: 1-10 Gbps (Mininet virtual links are fast)

```
h1 iperf3 -c 10.3.0.18 -t 10 -P 4
```
↑ 4 parallel TCP streams (simulates moderate office load).
  -P 4 = 4 parallel connections

```
h1 iperf3 -c 10.3.0.18 -t 10 -P 8 -b 1G
```
↑ 8 parallel streams, 1 Gbps target (high load stress test).
  -b 1G = target bandwidth of 1 Gigabit/sec

**Step 3: Kill server after:**
```
monitor1 pkill iperf3
```

**Option B — Automated (from container shell, creates own topology):**
```bash
mn -c
python3 scripts/mininet/load_testing.py --mode traditional
```
↑ Tests Low/Moderate/High loads across 5 traffic patterns:
  - Intra-VLAN (same block)
  - Inter-VLAN (same block, different subnet)
  - Cross-block (through core switches)
  - Host to service
  - Concurrent multi-flow (5 simultaneous streams — stress test)

**Metrics to record:**
- Bandwidth (Mbits/sec) — higher is better
- Retransmissions — lower is better (TCP only)
- Lost packets — for UDP

---

### ─── 2.3 PACKET LOSS ───

**Ano ito:** Percentage ng packets na hindi nakarating sa destination.
Critical metric para sa VoIP at video — even 1% loss degrades quality.

**From `mininet>` prompt:**
```
h1 ping -c 100 -i 0.1 10.3.0.1
```
↑ 100 rapid pings (100ms interval) to ERP server.
  Last line shows: `100 packets transmitted, X received, Y% packet loss`
  Record the Y% value.

```
h1 ping -c 100 -i 0.1 198.51.100.100
```
↑ 100 rapid pings to Internet.

```
h1 ping -c 100 -i 0.1 h10
```
↑ 100 rapid pings cross-block.

**Shortcut (just see the summary):**
```
h1 ping -c 100 -i 0.1 10.3.0.1 | tail -3
```
↑ Only shows the last 3 lines (summary + rtt stats).

**Metric to record:** Packet Loss % — should be 0% for good network.
- 0% = Excellent
- <1% = Acceptable for data
- >1% = VoIP/video degradation
- >5% = Noticeable issues

---

### ─── 2.4 JITTER (Latency Variation) ───

**Ano ito:** Jitter = variation sa delay between consecutive packets.
Critical para sa VoIP/video. High jitter = choppy audio/video.
Measured via iperf3 UDP mode.

**From `mininet>` prompt:**

**Step 1: Start iperf3 server sa VoIP node:**
```
voip1 iperf3 -s -D
```

**Step 2: Run UDP jitter test (simulates VoIP traffic):**
```
h1 iperf3 -c 10.3.0.49 -u -b 1M -t 30
```
↑ -u = UDP mode
  -b 1M = 1 Mbps bandwidth (typical VoIP bitrate)
  -t 30 = 30 seconds duration
  
  Output shows: Jitter (ms), Lost/Total Datagrams, Loss %

**Step 3: Kill server:**
```
voip1 pkill iperf3
```

**Standalone jitter test (from container shell):**
```bash
python3 scripts/tests/jitter_test.py --target 10.3.0.49 --duration 30
```
↑ Full jitter test with min/avg/max/stddev calculation.
  Generates HTML chart sa `network/results/charts/`.

**Metric to record:** Jitter (ms) — lower is better.
- <1 ms = Excellent (VoIP-ready)
- 1-5 ms = Good
- 5-20 ms = Acceptable
- >30 ms = VoIP degradation
- >50 ms = Unacceptable for real-time

---

### ─── 2.5 RECOVERY TIME (Failover) ───

**Ano ito:** Measures kung gaano katagal bago mag-recover ang network
after a link/switch failure. Important para sa high-availability.

**Automated (from container shell — creates own topology):**
```bash
mn -c
python3 scripts/mininet/failover_testing.py --mode traditional
```
↑ Runs 4 failover scenarios:
  1. Core switch failover (CS1 dies → traffic reroutes via CS2)
  2. Access-to-Distribution link failure (AS_A1-DS_A1 → AS_A1-DS_A2)
  3. Distribution switch failure (DS_A1 dies → DS_A2 takes over)
  4. All-access failover test
  
  Measures: Recovery time in milliseconds, packets lost during failover.

**Standalone recovery measurement:**
```bash
python3 scripts/tests/failover_test.py --target 10.3.0.1
```
↑ Measures detection delay, failover duration, total recovery time.
  Generates HTML chart.

**Metric to record:** Recovery Time (ms)
- Traditional: ~3-10 seconds (VRRP/STP reconvergence)
- SDN: ~50-500 ms (controller reroute)

---

## ════════════════════════════════════════════════════════════
## PART 3: BASELINE MANAGEABILITY
## ════════════════════════════════════════════════════════════

### ─── 3.1 CONFIGURATION TIME — Add VLAN 70 to Block A ───

**Ano ito:** Dini-demonstrate kung gaano kahirap at katagal mag-add ng
bagong VLAN sa traditional network. Kailangan i-SSH ang BAWAT switch
at manually configure. 16 switches = 16 separate SSH sessions.

**From container shell (NOT mininet):**
```bash
bash scripts/demo/manageability_demo.sh
```

**Ano ang ginagawa nito:**
1. Simulates SSH-ing into 16 switches one by one
2. Shows the commands needed per switch:
   - Create VLAN 70
   - Name it (Engineering)
   - Create SVI (interface vlan 70)
   - Assign IP address
   - Add OSPF network statement
   - Configure VRRP instance
   - Write memory
3. Then shows SDN equivalent: 1 API call

**Expected output (summary):**
```
┌────────────────┬──────────────┬──────────────┐
│ Metric         │ Traditional  │ SDN          │
├────────────────┼──────────────┼──────────────┤
│ Time           │ 15-20 min    │ 2-3 min      │
│ Steps          │ 16 × SSH     │ 1 API call   │
│ Risk           │ High (typos) │ Low          │
│ Consistency    │ Manual check │ Guaranteed   │
│ Audit trail    │ None         │ Logged       │
│ Rollback       │ Manual       │ 1 API call   │
└────────────────┴──────────────┴──────────────┘
  Improvement: 85-87% faster configuration time
```

**Key point para sa presentation:**
Traditional = 16 SSH sessions × 7 commands each = 112 total commands, 15-20 minutes
SDN = 1 curl command, 2-3 minutes, zero chance of typo inconsistency

---

## ════════════════════════════════════════════════════════════
## PART 4: MIGRATION PHASES
## ════════════════════════════════════════════════════════════

**Ano ito:** Simulates ang phased migration from Traditional → SDN.
6 phases, bawat phase may connectivity validation para patunayan na
walang service disruption habang nag-migrate.

**Saan i-run:** Container shell (either traditional or sdn container).

---

### ─── 4.1 RUN ALL MIGRATION PHASES (Best for Demo) ───

```bash
mn -c
python3 scripts/mininet/migration_phases.py --all
```
↑ Runs Phase 0 through Phase 5 sequentially. Each phase:
  - Changes switch configurations
  - Validates connectivity (h1→h10, h1→INET, h1→services)
  - Reports PASS/FAIL
  Takes ~5-10 minutes total.

---

### ─── 4.2 RUN SPECIFIC PHASES (for detailed demo) ───

**Phase 0 — Baseline (100% Traditional):**
```bash
mn -c
python3 scripts/mininet/migration_phases.py --phase 0
```
↑ All switches in standalone mode. No controller.
  Validates: all connectivity works without SDN.

**Phase 1 — Controller Introduced (Monitor Only):**
```bash
mn -c
python3 scripts/mininet/migration_phases.py --phase 1
```
↑ Ryu controller is connected but only observing (no flow rules pushed).
  Switches still in standalone mode. Controller learns topology.
  Validates: connectivity unchanged (non-disruptive introduction).

**Phase 2 — Block C Pilot:**
```bash
mn -c
python3 scripts/mininet/migration_phases.py --phase 2
```
↑ Block C switches (DS_C1, DS_C2, AS_C1) migrated to OpenFlow (secure mode).
  Controller now controls Block C. Blocks A & B remain traditional.
  Validates: Block C hosts can still reach all services.

**Phase 3 — Blocks A & B Migrated:**
```bash
mn -c
python3 scripts/mininet/migration_phases.py --phase 3
```
↑ All user blocks now SDN-controlled. Only core/services still traditional.
  Validates: all user hosts maintain connectivity.

**Phase 4 — Services Block Migrated:**
```bash
mn -c
python3 scripts/mininet/migration_phases.py --phase 4
```
↑ Service switches (DS_S1, DS_S2, AS_S1) also SDN-controlled.
  ACL enforcement now active via controller.
  Validates: allowed access works, blocked access fails.

**Phase 5 — Core Migrated (Full SDN):**
```bash
mn -c
python3 scripts/mininet/migration_phases.py --phase 5
```
↑ Core switches (CS1, CS2, EdgeRtr, ISP) migrated. 100% SDN.
  Full centralized control. All policies via controller.
  Validates: complete connectivity + ACL + QoS.

---

### ─── 4.3 VALIDATE CONTROLLER IS RUNNING ───

**From a separate Mac terminal (NOT inside a container):**
```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/stats/switches
```
↑ Returns list of connected switch DPIDs. If empty [], controller has no switches.

```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/stats | python3 -m json.tool
```
↑ Shows: switch count, total flows, VN mappings, VRFs, QoS queues, ACL rules.

---

### ─── 4.4 OPENFLOW SWITCH REGISTRATION ───

**From `mininet>` prompt (after starting SDN topology):**
```
sh ovs-vsctl show
```
↑ Shows all OVS bridges, their OpenFlow controller connection (tcp:127.0.0.1:6633),
  protocols (OpenFlow13), and fail_mode (secure).

```
sh ovs-ofctl dump-flows CS1 -O OpenFlow13 | wc -l
```
↑ Count of flow rules on Core Switch 1.

```
sh ovs-ofctl dump-flows CS1 -O OpenFlow13 | head -20
```
↑ First 20 flow rules on CS1.

---

## ════════════════════════════════════════════════════════════
## PART 5: SDN TESTING
## ════════════════════════════════════════════════════════════

**IMPORTANT:** Para sa SDN tests, gamitin ang `amira-sdn-network` container:
```bash
docker exec -it amira-sdn-network bash
```

**Make sure Ryu controller is running** (check from Mac terminal):
```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/stats
```

---

### ─── 5.1 START SDN TOPOLOGY ───

**Paste sa `amira-sdn-network` container:**
```bash
python3 scripts/mininet/sdn_topology.py
```

**Ano mangyayari:**
- Builds same topology as traditional (27 hosts, 16 switches)
- BUT all switches connect to Ryu controller (127.0.0.1:6633)
- Switches use OpenFlow 1.3 protocol
- fail_mode = secure (if controller dies, packets are DROPPED — not forwarded blindly)
- Controller installs flow rules for: forwarding, ACL, QoS
- Lalabas ang `mininet>` prompt

**Expected output:**
```
*** SDN Network started with Ryu Controller (127.0.0.1:6633)
*** Network ready. SDN tests available:
mininet>
```

---

### ─── 5.2 SDN: TOPOLOGY — UNDERLAY & OVERLAY ───

**Ano ito:** Shows na ang controller ay aware ng physical topology (underlay)
at ang logical network segmentation (overlay — VNs, VRFs).

**Underlay (Physical Topology Discovery via LLDP):**

From Mac terminal (REST API):
```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/topology | python3 -m json.tool
```
↑ Shows: all switches, all links (src_dpid → dst_dpid, ports), total flows.

**From `mininet>` prompt:**
```
sh ovs-vsctl show
```
↑ Physical switch topology — bridges, ports, controller connections.

**Overlay (Virtual Network Mapping):**
```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/vn | python3 -m json.tool
```
↑ Shows VLAN → Virtual Network name mapping:
  VLAN 10 → VN_FINANCE, VLAN 20 → VN_HR, VLAN 30 → VN_IT, etc.

```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/vrf | python3 -m json.tool
```
↑ Shows VRF isolation:
  VRF_USERS: [VN_FINANCE, VN_HR, VN_IT, VN_COMPLIANCE, VN_CORPORATE, VN_TRAINING]
  VRF_GUEST: [VN_GUESTA, VN_GUESTB, VN_GUESTC]
  VRF_SERVICES: [VN_ERP, VN_HR_SVC, VN_IT_SVC, VN_COLLAB]
  VRF_MGMT: [VN_MGMT]

---

### ─── 5.3 SDN: CONTROLLER ───

**Controller Stats:**
```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/stats | python3 -m json.tool
```
↑ Output:
```json
{
  "switches": 16,
  "total_flows": 245,
  "vn_mappings": 14,
  "vrfs": ["VRF_USERS", "VRF_GUEST", "VRF_SERVICES", "VRF_MGMT"],
  "qos_queues": 6,
  "acl_rules": 6
}
```

**Controller Topology Discovery (switches discovered via LLDP):**
```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/topology | python3 -m json.tool
```

---

### ─── 5.4 SDN: OPENFLOW SWITCH REGISTRATION ───

**From `mininet>` prompt:**

```
sh ovs-vsctl show
```
↑ Each switch shows: `Controller "tcp:127.0.0.1:6633"` and `is_connected: true`

```
sh ovs-ofctl dump-flows CS1 -O OpenFlow13
```
↑ ALL flow rules sa Core Switch 1. Each rule has:
  - priority: urgency (higher = matched first)
  - match: criteria (eth_type, ipv4_src, ipv4_dst, dl_vlan, etc.)
  - actions: what to do (output:port, set_queue, drop)
  - packet_count, byte_count: traffic stats

```
sh ovs-ofctl dump-flows DS_A1 -O OpenFlow13
```
↑ Flow rules sa Distribution Switch A1.

```
sh ovs-ofctl dump-flows AS_A1 -O OpenFlow13
```
↑ Flow rules sa Access Switch A1 (host-facing).

```
sh ovs-ofctl dump-ports-desc CS1 -O OpenFlow13
```
↑ Port descriptions — shows interface names, MAC addresses, speeds.

```
sh ovs-ofctl dump-aggregate CS1 -O OpenFlow13
```
↑ Aggregate stats: total flow count, total packet count, total byte count.

---

### ─── 5.5 SDN: VLAN TO VN MAPPING ───

**Ano ito:** Sa SDN, traditional VLANs ay mapped to Virtual Networks (VNs).
This is the overlay abstraction — controller thinks in VNs, not VLANs.

**REST API (from Mac terminal):**
```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/vn | python3 -m json.tool
```
↑ Output:
```json
{
  "10": "VN_FINANCE",
  "20": "VN_HR",
  "30": "VN_IT",
  "40": "VN_COMPLIANCE",
  "50": "VN_CORPORATE",
  "60": "VN_TRAINING",
  "110": "VN_GUESTA",
  "120": "VN_GUESTB",
  "130": "VN_GUESTC",
  "91": "VN_ERP",
  "92": "VN_HR_SVC",
  "93": "VN_IT_SVC",
  "94": "VN_COLLAB",
  "5": "VN_MGMT"
}
```

**Verify sa flow rules (from `mininet>`):**
```
sh ovs-ofctl dump-flows AS_A1 -O OpenFlow13 | grep "dl_vlan"
```
↑ Shows flow rules that match on VLAN tags (if VLAN tagging is used).

---

### ─── 5.6 SDN: VRF CONFIGURATION ───

**Ano ito:** VRFs provide L3 isolation — traffic sa VRF_USERS cannot
reach VRF_GUEST directly, at VRF_GUEST cannot reach VRF_SERVICES.

```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/vrf | python3 -m json.tool
```
↑ Output:
```json
{
  "VRF_USERS": ["VN_FINANCE", "VN_COMPLIANCE", "VN_HR", "VN_IT", "VN_CORPORATE", "VN_TRAINING"],
  "VRF_GUEST": ["VN_GUESTA", "VN_GUESTB", "VN_GUESTC"],
  "VRF_SERVICES": ["VN_ERP", "VN_HR_SVC", "VN_IT_SVC", "VN_COLLAB"],
  "VRF_MGMT": ["VN_MGMT"]
}
```

**Inter-VRF Policy (enforced by controller):**
- VRF_USERS → VRF_SERVICES: ALLOW_SELECTIVE (subject to ACL rules)
- VRF_GUEST → VRF_SERVICES: DENY_ALL
- VRF_GUEST → VRF_USERS: DENY_ALL
- VRF_GUEST → INTERNET: ALLOW

---

### ─── 5.7 SDN: OPENFLOW FLOW TABLES ───

**Ano ito:** The actual forwarding rules na naka-install sa switches.
Ito ang "brain" ng SDN — lahat ng decisions ay encoded as flow rules.

**From `mininet>` prompt:**

**All switches:**
```
sh ovs-ofctl dump-flows CS1 -O OpenFlow13
```
```
sh ovs-ofctl dump-flows CS2 -O OpenFlow13
```
```
sh ovs-ofctl dump-flows DS_A1 -O OpenFlow13
```
```
sh ovs-ofctl dump-flows DS_B1 -O OpenFlow13
```
```
sh ovs-ofctl dump-flows DS_C1 -O OpenFlow13
```
```
sh ovs-ofctl dump-flows DS_S1 -O OpenFlow13
```
```
sh ovs-ofctl dump-flows AS_A1 -O OpenFlow13
```
```
sh ovs-ofctl dump-flows AS_B1 -O OpenFlow13
```
```
sh ovs-ofctl dump-flows AS_C1 -O OpenFlow13
```
```
sh ovs-ofctl dump-flows AS_S1 -O OpenFlow13
```

**Count total flows per switch:**
```
sh ovs-ofctl dump-flows CS1 -O OpenFlow13 | wc -l
```

**Look for specific rule types:**
```
sh ovs-ofctl dump-flows CS1 -O OpenFlow13 | grep "priority=100"
```
↑ Shows ACL DROP rules (priority 100 = deny rules)

```
sh ovs-ofctl dump-flows CS1 -O OpenFlow13 | grep "actions=drop"
```
↑ Shows all DROP actions (blocked traffic)

```
sh ovs-ofctl dump-flows CS1 -O OpenFlow13 | grep "set_queue"
```
↑ Shows QoS rules (traffic assigned to specific queues)

---

### ─── 5.8 SDN: ACL POLICY ───

**Ano ito:** Sa SDN, ACL ay enforced via OpenFlow DROP rules.
Controller installs priority=100 drop flows for blocked traffic.
No packet ever reaches the destination — dropped at first switch.

**Automated VLAN isolation + ACL test:**
```bash
mn -c
python3 scripts/mininet/vlan_isolation_test.py --mode sdn
```
↑ Tests same groups as traditional, but now SDN ENFORCES isolation:
  - Cross-VLAN: BLOCKED by flow rules ✓
  - Guest → Internal: BLOCKED ✓
  - Unauthorized service access: BLOCKED ✓

**Manual ACL verification from `mininet>`:**

```
h1 ping -c 3 10.3.0.1
```
↑ Finance → ERP = **PASS** (VLAN 10 allowed by controller ACL)

```
h10 ping -c 3 10.3.0.1
```
↑ HR → ERP = **BLOCKED** (controller installs DROP flow, 0 packets arrive)

```
h7 ping -c 3 10.3.0.17
```
↑ Guest → HR = **BLOCKED** (VRF_GUEST → VRF_SERVICES = DENY_ALL)

```
h13 ping -c 3 10.3.0.33
```
↑ IT → IT Server = **PASS** (VLAN 30 allowed)

```
h25 ping -c 3 10.3.0.49
```
↑ Guest C → VoIP = **BLOCKED**

**View the ACL rules on controller:**
```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/acl | python3 -m json.tool
```
↑ Shows all 6 ACL rules with allowed_vlans, ports, descriptions.

---

### ─── 5.9 SDN: QoS POLICY ───

**Ano ito:** SDN controller assigns traffic to 6 priority queues based
on source/destination. VoIP gets highest priority, guests get lowest.
Under congestion, VoIP maintains low latency while bulk traffic degrades.

**6-Queue Model:**
| Queue | Priority | Traffic Type | Bandwidth % |
|-------|----------|---|---|
| 1 | Highest | VoIP/Collaboration (VLAN 94) | 20% |
| 2 | High | ERP (VLAN 91) | 20% |
| 3 | Medium | HR Services (VLAN 92) | 15% |
| 4 | Medium | IT Services (VLAN 93) | 15% |
| 5 | Normal | All Users (VLANs 10-60) | 25% |
| 6 | Lowest | Guests (VLANs 110-130) | 5% |

**View QoS config:**
```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/qos | python3 -m json.tool
```

**Run QoS comparison test (from container shell):**
```bash
mn -c
python3 scripts/mininet/qos_traffic_test.py --mode both
```
↑ Tests VoIP latency before, during, and after congestion.
  Traditional: VoIP degrades equally with bulk traffic (best-effort).
  SDN: VoIP stays low-latency even under bulk congestion (priority queue).

**Expected comparison output:**
```
┌──────────────────────────┬─────────────────┬─────────────────┐
│ Metric                   │ Traditional     │ SDN (QoS)       │
├──────────────────────────┼─────────────────┼─────────────────┤
│ VoIP Baseline Latency    │      0.05 ms    │      0.05 ms    │
│ VoIP Congested Latency   │      5.20 ms    │      0.12 ms    │
│ VoIP Packet Loss         │      3.2 %      │      0.0 %      │
│ Video Congested Latency  │      4.80 ms    │      0.30 ms    │
└──────────────────────────┴─────────────────┴─────────────────┘
```

---

### ─── 5.10 SDN: CONNECTIVITY VALIDATION ───

**Same tests as traditional — proves SDN maintains full connectivity
for ALLOWED traffic while blocking unauthorized access.**

#### Host-to-Host (from `mininet>`):
```
h1 ping -c 5 h10
```
↑ Finance → HR (allowed — both in VRF_USERS)

```
h1 ping -c 5 h19
```
↑ Finance → Corporate (allowed)

```
h10 ping -c 5 h22
```
↑ HR → Executive (allowed)

#### Host-to-Internet:
```
h1 ping -c 5 198.51.100.100
```
↑ User → Internet (allowed)

```
h7 ping -c 5 198.51.100.100
```
↑ Guest → Internet (allowed — VRF_GUEST → INTERNET = ALLOW)

#### Host-to-Service (ACL enforced):
```
py execfile('scripts/tests/HNDValidationS_ACL.py')
```
↑ Full validation suite — should show SDN enforcing ACLs properly.

---

## ════════════════════════════════════════════════════════════
## PART 6: SDN PERFORMANCE TESTS
## ════════════════════════════════════════════════════════════

**Same metrics as Part 2 but now measured on SDN topology.
Goal: prove SDN performance is equal or better than traditional.**

---

### ─── 6.1 SDN LATENCY ───

**From `mininet>` (SDN topology running):**
```
py execfile('scripts/tests/latencytest.py')
```
↑ Same 20-ping test, now measures SDN forwarding latency.
  First packet may be slightly slower (controller lookup) but subsequent
  packets are fast (flow rule installed, no controller involvement).

**Manual:**
```
h1 ping -c 20 -i 0.2 10.3.0.1
```
```
h1 ping -c 20 -i 0.2 198.51.100.100
```

---

### ─── 6.2 SDN THROUGHPUT ───

**Automated comparison (from container shell):**
```bash
mn -c
python3 scripts/mininet/load_testing.py --mode both
```
↑ Runs Traditional then SDN, outputs side-by-side throughput comparison.

**Manual from `mininet>` (SDN topology):**
```
monitor1 iperf3 -s -D
h1 iperf3 -c 10.3.0.18 -t 30 -P 8
```

---

### ─── 6.3 SDN PACKET LOSS ───

```
h1 ping -c 100 -i 0.1 10.3.0.1 | tail -3
```
```
h1 ping -c 100 -i 0.1 198.51.100.100 | tail -3
```

---

### ─── 6.4 SDN JITTER ───

```
voip1 iperf3 -s -D
h1 iperf3 -c 10.3.0.49 -u -b 1M -t 30
voip1 pkill iperf3
```

---

### ─── 6.5 SDN RECOVERY TIME ───

**From container shell:**
```bash
mn -c
python3 scripts/mininet/failover_testing.py --mode sdn
```
↑ SDN recovery is faster because controller detects link failure via
  OpenFlow PortStatus message and immediately reroutes (no STP convergence).

**Controller resilience test (what if controller dies?):**
```bash
mn -c
python3 scripts/mininet/controller_resilience_test.py
```
↑ Tests: fail_mode=secure behavior (existing flows work, no new flows),
  fail_mode=standalone fallback, controller recovery.

---

## ════════════════════════════════════════════════════════════
## PART 7: SDN MANAGEABILITY TEST
## ════════════════════════════════════════════════════════════

### ─── 7.1 Add VLAN 70 to Block A — SDN (One API Call) ───

**Ano ito:** Demonstrates ang SDN advantage — adding a VLAN requires
only ONE API call. Controller automatically pushes config to ALL 16 switches.

**From Mac terminal:**
```bash
docker exec amira-ryu-controller curl -X POST http://localhost:8080/api/vlan \
  -H "Content-Type: application/json" \
  -d '{"vlan_id": 70, "vn_name": "VN_ENGINEERING", "vrf": "VRF_USERS"}'
```

**Expected response:**
```json
{
  "status": "success",
  "message": "VLAN 70 (VN_ENGINEERING) added to VRF_USERS. Pushed to 16 switches.",
  "switches_configured": 16
}
```

**Verify na na-add:**
```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/vn | python3 -m json.tool
```
↑ Should now include `"70": "VN_ENGINEERING"` in the list.

**Verify sa flow rules (from `mininet>`):**
```
sh ovs-ofctl dump-flows AS_A1 -O OpenFlow13 | grep "dl_vlan=70"
```

**Key comparison for presentation:**
- Traditional: 16 SSH sessions × 7 commands = 112 commands, 15-20 minutes
- SDN: 1 curl command, instant push to all switches, 2-3 minutes total
- Improvement: **85-87% faster**, zero risk of inconsistency

---

## ════════════════════════════════════════════════════════════
## PART 8: COMPARISON TESTS (--mode both)
## ════════════════════════════════════════════════════════════

**Ano ito:** THESE ARE THE BEST SCRIPTS FOR YOUR DEFENSE PRESENTATION.
Each script runs Traditional first, then SDN, at outputs a side-by-side
comparison table. Perfect for showing improvement.

**Saan i-run:** Container shell (after exiting mininet if open).
Always run `mn -c` between tests to clean up.

---

### ─── 8.1 VLAN ISOLATION COMPARISON ───
```bash
mn -c
python3 scripts/mininet/vlan_isolation_test.py --mode both
```
↑ Shows: Traditional has NO isolation. SDN enforces segmentation.
  Output includes comparison table at the end.

---

### ─── 8.2 QoS COMPARISON ───
```bash
mn -c
python3 scripts/mininet/qos_traffic_test.py --mode both
```
↑ Shows: Traditional treats all traffic equally (VoIP degrades under load).
  SDN prioritizes VoIP (maintains low latency even with bulk congestion).

---

### ─── 8.3 FAILOVER COMPARISON ───
```bash
mn -c
python3 scripts/mininet/failover_testing.py --mode both
```
↑ Shows: Traditional needs ~3-10s (STP/VRRP convergence).
  SDN recovers in ~50-500ms (controller reroute).

---

### ─── 8.4 LOAD/THROUGHPUT COMPARISON ───
```bash
mn -c
python3 scripts/mininet/load_testing.py --mode both
```
↑ Shows: throughput at Low/Moderate/High loads for both networks.
  SDN maintains consistent performance under stress.

---

### ─── 8.5 SCALABILITY COMPARISON ───
```bash
mn -c
python3 scripts/mininet/scalability_test.py --mode both
```
↑ Shows: how performance degrades as hosts increase (10→20→30→50).
  Traditional degrades due to STP. SDN maintains through controller paths.

---

### ─── 8.6 MANAGEABILITY COMPARISON ───
```bash
bash scripts/demo/manageability_demo.sh
```
↑ Shows: Traditional 16×SSH vs SDN 1 API call.

---

### ─── 8.7 FULL MIGRATION (All 6 Phases) ───
```bash
mn -c
python3 scripts/mininet/migration_phases.py --all
```
↑ Shows: successful migration without service disruption.

---

## ════════════════════════════════════════════════════════════
## PART 9: RUN EVERYTHING (FULL AUTOMATED SUITE)
## ════════════════════════════════════════════════════════════

**One command to rule them all:**
```bash
bash scripts/run_all_tests.sh
```
↑ Runs ALL tests in sequence:
  1. VLAN Isolation (both)
  2. QoS (both)
  3. Failover (both)
  4. Load Testing (both)
  5. Scalability (both)
  6. Migration Phases (all)
  7. Manageability Demo

  Total time: ~30-45 minutes.
  Saves complete log to: `/workspace/network/results/tests/full_test_run_YYYYMMDD.log`

---

## ════════════════════════════════════════════════════════════
## PART 10: CLEANUP & TROUBLESHOOTING
## ════════════════════════════════════════════════════════════

### Cleanup between tests:
```bash
mn -c
```
↑ ALWAYS run this before starting a new topology. Cleans Mininet state.

```bash
pkill -f iperf3
pkill -f keepalived
pkill -f dnsmasq
```
↑ Kill leftover background processes.

### If OVS is not running:
```bash
ovs-vswitchd --detach --log-file=/var/log/openvswitch/ovs-vswitchd.log --pidfile=/var/run/openvswitch/ovs-vswitchd.pid
```

### If topology won't start:
```bash
mn -c
sleep 2
python3 scripts/mininet/traditional_topology.py
```

### Check container status (from Mac terminal):
```bash
docker ps
```
↑ Should show 4 containers: amira-traditional-network, amira-sdn-network,
  amira-ryu-controller, amira-network-monitor — all "Up X days".

### Restart a container:
```bash
docker restart amira-traditional-network
docker restart amira-ryu-controller
```

---

## ════════════════════════════════════════════════════════════
## APPENDIX A: NETWORK IP REFERENCE
## ════════════════════════════════════════════════════════════

### Host IPs (by Block and VLAN)

#### Block A — Access Switch AS_A1
| Host | VLAN | Department | IP Address | Gateway (VRRP VIP) |
|------|------|-----------|------------|-------------------|
| h1 | 10 | Finance | 10.1.0.51/22 | 10.1.3.254 |
| h2 | 10 | Finance | 10.1.0.51/22 | 10.1.3.254 |
| h3 | 10 | Finance | 10.1.0.51/22 | 10.1.3.254 |
| h4 | 40 | Compliance | 10.1.12.51/22 | 10.1.15.254 |
| h5 | 40 | Compliance | 10.1.12.51/22 | 10.1.15.254 |
| h6 | 40 | Compliance | 10.1.12.51/22 | 10.1.15.254 |
| h7 | 110 | Guest A | 10.2.0.51/24 | 10.2.0.254 |
| h8 | 110 | Guest A | 10.2.0.51/24 | 10.2.0.254 |
| h9 | 110 | Guest A | 10.2.0.51/24 | 10.2.0.254 |

#### Block B — Access Switch AS_B1
| Host | VLAN | Department | IP Address | Gateway (VRRP VIP) |
|------|------|-----------|------------|-------------------|
| h10 | 20 | HR | 10.1.4.51/22 | 10.1.7.254 |
| h11 | 20 | HR | 10.1.4.51/22 | 10.1.7.254 |
| h12 | 20 | HR | 10.1.4.51/22 | 10.1.7.254 |
| h13 | 30 | IT | 10.1.8.51/22 | 10.1.11.254 |
| h14 | 30 | IT | 10.1.8.51/22 | 10.1.11.254 |
| h15 | 30 | IT | 10.1.8.51/22 | 10.1.11.254 |
| h16 | 120 | Guest B | 10.2.1.51/24 | 10.2.1.254 |
| h17 | 120 | Guest B | 10.2.1.51/24 | 10.2.1.254 |
| h18 | 120 | Guest B | 10.2.1.51/24 | 10.2.1.254 |

#### Block C — Access Switch AS_C1
| Host | VLAN | Department | IP Address | Gateway (VRRP VIP) |
|------|------|-----------|------------|-------------------|
| h19 | 50 | Corporate | 10.1.16.51/22 | 10.1.19.254 |
| h20 | 50 | Corporate | 10.1.16.51/22 | 10.1.19.254 |
| h21 | 50 | Corporate | 10.1.16.51/22 | 10.1.19.254 |
| h22 | 60 | Executive | 10.1.20.51/22 | 10.1.23.254 |
| h23 | 60 | Executive | 10.1.20.51/22 | 10.1.23.254 |
| h24 | 60 | Executive | 10.1.20.51/22 | 10.1.23.254 |
| h25 | 130 | Guest C | 10.2.2.51/24 | 10.2.2.254 |
| h26 | 130 | Guest C | 10.2.2.51/24 | 10.2.2.254 |
| h27 | 130 | Guest C | 10.2.2.51/24 | 10.2.2.254 |

### Service Servers — Access Switch AS_S1

| Service | IP | VLAN | Ports | Allowed VLANs | Description |
|---------|------|------|-------|---------------|---|
| erp1 | 10.3.0.1/28 | 91 | 80, 443 | VLAN 10 only | ERP — Finance only |
| hr1 | 10.3.0.17/28 | 92 | 443 | VLANs 10-60 | HR Server |
| monitor1 | 10.3.0.18/28 | 92 | 80, 5201 | VLANs 10-60 | Monitoring + iperf3 |
| it1 | 10.3.0.33/28 | 93 | 80, 161(UDP) | VLANs 30,40 | IT Server |
| voip1 | 10.3.0.49/28 | 94 | 5060(UDP) | VLANs 10-60 | VoIP / SIP |
| dhcp1 | 10.3.0.50/28 | 94 | 67,68(UDP) | VLANs 10-60 | DHCP |

### Internet Simulation

| Node | IP | Role |
|------|------|------|
| INET | 198.51.100.100/24 | Internet host (ping target) |
| ISP | (switch) | ISP router |
| EdgeRtr | 198.51.100.1 | Edge router with NAT |

### Switch Hierarchy

| Layer | Switches | DPID | Role |
|-------|----------|------|------|
| Core | CS1, CS2 | 1, 2 | OSPF backbone, inter-block routing |
| Distribution A | DS_A1, DS_A2 | 11, 12 | Block A gateway, VRRP pair |
| Distribution B | DS_B1, DS_B2 | 13, 14 | Block B gateway, VRRP pair |
| Distribution C | DS_C1, DS_C2 | 15, 16 | Block C gateway, VRRP pair |
| Distribution S | DS_S1, DS_S2 | 17, 18 | Services gateway, VRRP pair |
| Access A | AS_A1 | 21 | Block A hosts (h1-h9) |
| Access B | AS_B1 | 22 | Block B hosts (h10-h18) |
| Access C | AS_C1 | 23 | Block C hosts (h19-h27) |
| Access S | AS_S1 | 24 | Service servers |
| Edge | ISP, EdgeRtr | 31, 32 | Internet connectivity |

---

## ════════════════════════════════════════════════════════════
## APPENDIX B: ACL RULES CHEAT SHEET
## ════════════════════════════════════════════════════════════

### Complete ACL Test Matrix

| # | Source Host | Source VLAN | Target Service | Target IP | Expected (Traditional) | Expected (SDN) | Reason |
|---|---|---|---|---|---|---|---|
| 1 | h1 | 10 (Finance) | erp1 | 10.3.0.1 | ✓ PASS | ✓ PASS | VLAN 10 allowed |
| 2 | h10 | 20 (HR) | erp1 | 10.3.0.1 | ✓ PASS (no ACL!) | ✗ BLOCKED | Only VLAN 10 |
| 3 | h13 | 30 (IT) | erp1 | 10.3.0.1 | ✓ PASS (no ACL!) | ✗ BLOCKED | Only VLAN 10 |
| 4 | h1 | 10 (Finance) | hr1 | 10.3.0.17 | ✓ PASS | ✓ PASS | VLANs 10-60 |
| 5 | h7 | 110 (Guest) | hr1 | 10.3.0.17 | ✓ PASS (no ACL!) | ✗ BLOCKED | Guests denied |
| 6 | h13 | 30 (IT) | it1 | 10.3.0.33 | ✓ PASS | ✓ PASS | VLANs 30,40 |
| 7 | h4 | 40 (Compliance) | it1 | 10.3.0.33 | ✓ PASS | ✓ PASS | VLANs 30,40 |
| 8 | h10 | 20 (HR) | it1 | 10.3.0.33 | ✓ PASS (no ACL!) | ✗ BLOCKED | Only 30,40 |
| 9 | h19 | 50 (Corporate) | voip1 | 10.3.0.49 | ✓ PASS | ✓ PASS | VLANs 10-60 |
| 10 | h25 | 130 (Guest C) | monitor1 | 10.3.0.18 | ✓ PASS (no ACL!) | ✗ BLOCKED | Guests denied |
| 11 | h7 | 110 (Guest A) | INET | 198.51.100.100 | ✓ PASS | ✓ PASS | Guests get internet |
| 12 | h16 | 120 (Guest B) | erp1 | 10.3.0.1 | ✓ PASS (no ACL!) | ✗ BLOCKED | Only VLAN 10 |

**Key Insight para sa Presentation:**
- Traditional: ALL traffic passes (no enforcement) — tests 2,3,5,8,10,12 all PASS
- SDN: Blocked traffic is DROPPED by controller — security enforced centrally
- Traditional requires manual ACL on EVERY switch (error-prone, inconsistent)
- SDN = one ACL definition, controller pushes to all switches automatically

---

## ════════════════════════════════════════════════════════════
## APPENDIX C: SDN CONTROLLER REST API ENDPOINTS
## ════════════════════════════════════════════════════════════

All endpoints are on the Ryu controller (port 8080).
Access from Mac terminal using:
```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/ENDPOINT | python3 -m json.tool
```

| Endpoint | Method | Description | Usage |
|----------|--------|-------------|-------|
| `/api/stats` | GET | Controller statistics | Switch count, flows, VN mappings |
| `/api/topology` | GET | Physical topology | Switches, links, ports |
| `/api/vn` | GET | VLAN → VN mapping | 14 mappings |
| `/api/vrf` | GET | VRF configuration | 4 VRFs with member VNs |
| `/api/acl` | GET | ACL rules | 6 service protection rules |
| `/api/qos` | GET | QoS queue config | 6 priority queues |
| `/api/vlan` | POST | Add new VLAN | Manageability demo |
| `/stats/switches` | GET | Switch DPID list | Healthcheck |

**Example API calls:**

```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/stats | python3 -m json.tool
```

```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/topology | python3 -m json.tool
```

```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/vn | python3 -m json.tool
```

```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/vrf | python3 -m json.tool
```

```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/acl | python3 -m json.tool
```

```bash
docker exec amira-ryu-controller curl -s http://localhost:8080/api/qos | python3 -m json.tool
```

```bash
docker exec amira-ryu-controller curl -X POST http://localhost:8080/api/vlan -H "Content-Type: application/json" -d '{"vlan_id": 70, "vn_name": "VN_ENGINEERING", "vrf": "VRF_USERS"}'
```

---

## ════════════════════════════════════════════════════════════
## APPENDIX D: QUICK REFERENCE TABLE
## ════════════════════════════════════════════════════════════

| # | Presentation Slide | What to Run | Where | Time |
|---|---|---|---|---|
| 1 | HND Topology | `python3 scripts/mininet/traditional_topology.py` | traditional container | 15s |
| 2 | HND OSPF+VRRP | `python3 scripts/mininet/traditional_topology_routed.py` | traditional container | 30s |
| 3 | VLAN Segmentation | `python3 scripts/mininet/vlan_isolation_test.py --mode traditional` | container shell | 2min |
| 4 | ACL Validation | `py execfile('scripts/tests/HNDValidationS_ACL.py')` | mininet> prompt | 1min |
| 5 | Connectivity | `pingall` then `py execfile('scripts/tests/latencytest.py')` | mininet> prompt | 3min |
| 6 | Latency | `py execfile('scripts/tests/latencytest.py')` | mininet> prompt | 2min |
| 7 | Throughput | `python3 scripts/mininet/load_testing.py --mode both` | container shell | 5min |
| 8 | Jitter | `python3 scripts/tests/jitter_test.py --target 10.3.0.49` | container shell | 1min |
| 9 | Recovery Time | `python3 scripts/mininet/failover_testing.py --mode both` | container shell | 5min |
| 10 | Manageability | `bash scripts/demo/manageability_demo.sh` | container shell | 1min |
| 11 | Migration | `python3 scripts/mininet/migration_phases.py --all` | container shell | 8min |
| 12 | SDN Topology | `python3 scripts/mininet/sdn_topology.py` | sdn container | 15s |
| 13 | SDN Controller | `curl http://localhost:8080/api/stats` | ryu container | 1s |
| 14 | SDN QoS | `python3 scripts/mininet/qos_traffic_test.py --mode both` | container shell | 5min |
| 15 | SDN ACL | `python3 scripts/mininet/vlan_isolation_test.py --mode sdn` | container shell | 2min |
| 16 | Controller Resilience | `python3 scripts/mininet/controller_resilience_test.py` | sdn container | 3min |
| 17 | Scalability | `python3 scripts/mininet/scalability_test.py --mode both` | container shell | 5min |
| 18 | SDN Manageability | `curl -X POST http://localhost:8080/api/vlan ...` | Mac terminal | 5s |
| 19 | FULL SUITE | `bash scripts/run_all_tests.sh` | container shell | 30min |

---

**END OF GUIDE**

> Tip: Para sa defense, run the `--mode both` comparison tests (Part 8).
> These produce the side-by-side tables na pinaka-impressive for panelists.
> Focus on: VLAN isolation, QoS, Failover, at Manageability — these show
> the biggest difference between Traditional and SDN.
