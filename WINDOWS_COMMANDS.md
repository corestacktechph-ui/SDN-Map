# SDN Migration Testing — Windows Commands
# Para sa client na naka-Windows PowerShell

---

## PREREQUISITE: Docker Desktop must be installed and running on Windows
## Download: https://www.docker.com/products/docker-desktop/

---

## STEP 1: Start the Docker containers (ONE TIME ONLY)

Open PowerShell as Administrator, then navigate to the project folder:

```powershell
cd C:\Project\sdn\sdn-map
```

Start all containers:
```powershell
docker-compose up -d
```

Wait ~30 seconds for all containers to start. Verify:
```powershell
docker ps
```
You should see: `amira-traditional-network`, `amira-sdn-network`, `amira-ryu-controller`, `amira-network-monitor`

---

## STEP 2: Enter the Traditional Network Container

```powershell
docker exec -it amira-traditional-network bash
```

You'll see: `root@colima:/workspace#` — you're now inside Linux.

---

## STEP 3: Run Tests (inside the container)

### 3.1 — Start Traditional Topology
```bash
python3 scripts/mininet/traditional_topology.py
```
Wait for `mininet>` prompt.

### 3.2 — Topology Verification
```
net
nodes
links
```

### 3.3 — VLAN Segmentation Test
```
h1 ping -c 3 h2
h1 ping -c 3 h4
h7 ping -c 3 h1
```

### 3.4 — OSPF Routing (use routed topology instead)
Exit first:
```
exit
```
Then:
```bash
mn -c
python3 scripts/mininet/traditional_topology_routed.py
```
At `mininet>`:
```
CS1 vtysh --vty_socket /tmp/frr_CS1 -c "show ip ospf"
CS1 vtysh --vty_socket /tmp/frr_CS1 -c "show ip ospf neighbor"
CS1 vtysh --vty_socket /tmp/frr_CS1 -c "show ip route"
```

### 3.5 — VRRP Check
```
DS_A1 ip addr show da1-as | grep inet
h1 ping -c 3 10.1.3.254
h10 ping -c 3 10.1.7.254
```

### 3.6 — ACL Validation
```
h1 ping -c 3 10.3.0.1
h10 ping -c 3 10.3.0.1
h7 ping -c 3 10.3.0.17
h13 ping -c 3 10.3.0.33
py execfile('scripts/tests/HNDValidationS_ACL.py')
```

### 3.7 — Connectivity
```
h1 ping -c 5 h10
h1 ping -c 5 198.51.100.100
h1 ping -c 5 10.3.0.1
py execfile('scripts/tests/servicetest.py')
```

### 3.8 — Performance: Latency
```
h1 ping -c 20 -i 0.2 10.3.0.1
h1 ping -c 20 -i 0.2 198.51.100.100
py execfile('scripts/tests/latencytest.py')
```

### 3.9 — Performance: Throughput
```
monitor1 iperf3 -s -D
h1 iperf3 -c 10.3.0.18 -t 10
h1 iperf3 -c 10.3.0.18 -t 10 -P 4
h1 iperf3 -c 10.3.0.18 -t 10 -P 8 -b 1G
monitor1 pkill iperf3
```

### 3.10 — Performance: Packet Loss
```
h1 ping -c 100 -i 0.1 10.3.0.1 | tail -3
h1 ping -c 100 -i 0.1 198.51.100.100 | tail -3
```

### 3.11 — Performance: Jitter
```
voip1 iperf3 -s -D
h1 iperf3 -c 10.3.0.49 -u -b 1M -t 30
voip1 pkill iperf3
```

### 3.12 — Performance: Recovery Time
Exit mininet first:
```
exit
```
Then:
```bash
mn -c
python3 scripts/mininet/failover_testing.py --mode traditional
```

### 3.13 — Manageability Demo
```bash
bash scripts/demo/manageability_demo.sh
```

---

## STEP 4: Migration Phases

```bash
mn -c
python3 scripts/mininet/migration_phases.py --all
```

---

## STEP 5: SDN Testing

### Open a NEW PowerShell window and enter SDN container:
```powershell
docker exec -it amira-sdn-network bash
```

### Start SDN Topology:
```bash
python3 scripts/mininet/sdn_topology.py
```

### At `mininet>` prompt:
```
sh ovs-vsctl show
sh ovs-ofctl dump-flows CS1 -O OpenFlow13
sh ovs-ofctl dump-flows CS1 -O OpenFlow13 | grep "actions=drop"
sh ovs-ofctl dump-flows CS1 -O OpenFlow13 | grep "set_queue"
h1 ping -c 3 10.3.0.1
h10 ping -c 3 10.3.0.1
h7 ping -c 3 10.3.0.17
h1 ping -c 5 h10
h1 ping -c 5 198.51.100.100
```

### SDN Performance:
```
h1 ping -c 20 -i 0.2 10.3.0.1
monitor1 iperf3 -s -D
h1 iperf3 -c 10.3.0.18 -t 10 -P 8
monitor1 pkill iperf3
h1 ping -c 100 -i 0.1 10.3.0.1 | tail -3
voip1 iperf3 -s -D
h1 iperf3 -c 10.3.0.49 -u -b 1M -t 30
voip1 pkill iperf3
```

### SDN Recovery:
```
exit
```
```bash
mn -c
python3 scripts/mininet/failover_testing.py --mode sdn
```

---

## STEP 6: Controller REST API (from PowerShell — NOT inside container)

Open a NEW PowerShell window (don't exit containers):

```powershell
docker exec amira-ryu-controller curl -s http://localhost:8080/api/stats
docker exec amira-ryu-controller curl -s http://localhost:8080/api/topology
docker exec amira-ryu-controller curl -s http://localhost:8080/api/vn
docker exec amira-ryu-controller curl -s http://localhost:8080/api/vrf
docker exec amira-ryu-controller curl -s http://localhost:8080/api/acl
docker exec amira-ryu-controller curl -s http://localhost:8080/api/qos
```

### Add VLAN 70 (Manageability Test — 1 API call):
```powershell
docker exec amira-ryu-controller curl -X POST http://localhost:8080/api/vlan -H "Content-Type: application/json" -d "{\"vlan_id\": 70, \"vn_name\": \"VN_ENGINEERING\", \"vrf\": \"VRF_USERS\"}"
```

### Verify:
```powershell
docker exec amira-ryu-controller curl -s http://localhost:8080/api/vn
```

---

## STEP 7: Comparison Tests (Best for Demo)

Enter either container:
```powershell
docker exec -it amira-traditional-network bash
```

Then run any comparison (Traditional vs SDN side-by-side):
```bash
mn -c
python3 scripts/mininet/vlan_isolation_test.py --mode both
```

```bash
mn -c
python3 scripts/mininet/qos_traffic_test.py --mode both
```

```bash
mn -c
python3 scripts/mininet/failover_testing.py --mode both
```

```bash
mn -c
python3 scripts/mininet/load_testing.py --mode both
```

```bash
mn -c
python3 scripts/mininet/scalability_test.py --mode both
```

---

## STEP 8: Web Dashboard

Open browser:
```
https://sdn-map.vercel.app
```
Login: `admin@amira-capstone.com` / `admin123`

---

## STEP 9: Cleanup

Exit all containers:
```bash
exit
```

Stop containers (from PowerShell):
```powershell
docker-compose down
```

---

## QUICK TROUBLESHOOTING

### "docker: command not found"
→ Install Docker Desktop: https://www.docker.com/products/docker-desktop/

### "Error: container not found"
→ Run: `docker-compose up -d` first

### "mn -c" hangs
→ Wait 10 seconds. QEMU emulation is slow on Windows.

### Topology takes forever to start
→ Normal. The Mininet image runs under QEMU (x86 emulation).
  Budget 2-3 minutes for topology startup. Start BEFORE presenting.

### "Cannot connect to Docker daemon"
→ Open Docker Desktop app first. Make sure the whale icon is in taskbar.

### PowerShell says "not recognized as cmdlet"
→ You're typing Linux commands in PowerShell. Enter the container first:
   `docker exec -it amira-traditional-network bash`

---

## NOTES FOR CLIENT

1. All commands after `docker exec -it ... bash` are LINUX commands (type inside the container)
2. PowerShell commands are only for: `docker exec`, `docker-compose`, `docker ps`
3. The `mininet>` prompt is INSIDE the container — type ping/iperf commands there
4. Start topologies BEFORE the meeting (they take 2-3 min to initialize)
5. The web dashboard works independently — no Docker needed to view it
