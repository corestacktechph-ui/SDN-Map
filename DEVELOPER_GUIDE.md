# Developer Guide — How to Run the System & Mininet Simulations

Step-by-step guide for setting up the SDN Migration Analysis Platform from scratch.

---

## Prerequisites

Before starting, make sure you have these installed:

| Tool | Version | Check Command |
|------|---------|---------------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Docker | 24+ | `docker --version` |
| Docker Compose | 2+ | `docker compose version` |
| Git | Any | `git --version` |

---

## Part 1: Running the Web Application

### Step 1 — Clone the Repository

```bash
git clone https://github.com/corestacktechph-ui/SDN-Map.git
cd SDN-Map
```

### Step 2 — Install Dependencies

```bash
npm install
```

### Step 3 — Configure Environment

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Make sure it contains:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_WS_URL="http://localhost:3001"
```

### Step 4 — Setup the Database

```bash
# Generate Prisma client
npm run db:generate

# Create/push database schema
npm run db:push

# Seed initial data (topology, devices, VLANs, users)
npm run db:seed
```

### Step 5 — Start the Development Server

```bash
npm run dev
```

The app is now running at **http://localhost:3000**

### Step 6 — Start the WebSocket Server (for real-time metrics)

Open a second terminal:

```bash
node server/index.js
```

This starts the real-time monitoring server on port 3001.

### Step 7 — Login

Default credentials after seeding:

| Email | Password | Role |
|-------|----------|------|
| admin@amira.com | admin123 | ADMIN |
| researcher@amira.com | research123 | RESEARCHER |

---

## Part 2: Running Mininet Simulations

### Option A — Using the Existing Docker Container (Recommended)

If the containers are already running:

```bash
# Check running containers
docker ps

# You should see: amira-sdn-network (or amira-mininet)
```

#### Copy simulation scripts to the container:

```bash
docker cp scripts/mininet/migration_phases.py amira-sdn-network:/tmp/
docker cp scripts/mininet/failover_testing.py amira-sdn-network:/tmp/
docker cp scripts/mininet/qos_traffic_test.py amira-sdn-network:/tmp/
docker cp scripts/mininet/vlan_isolation_test.py amira-sdn-network:/tmp/
docker cp scripts/mininet/controller_resilience_test.py amira-sdn-network:/tmp/
docker cp scripts/mininet/scalability_test.py amira-sdn-network:/tmp/
docker cp scripts/mininet/traditional_topology.py amira-sdn-network:/tmp/
docker cp scripts/mininet/sdn_topology.py amira-sdn-network:/tmp/
```

#### Run simulations:

```bash
# 6-Phase Migration (all phases, automated)
docker exec amira-sdn-network python3 /tmp/migration_phases.py --all --no-cli

# Failover Testing (both Traditional and SDN)
docker exec amira-sdn-network python3 /tmp/failover_testing.py --mode both

# VLAN Isolation Test
docker exec amira-sdn-network python3 /tmp/vlan_isolation_test.py --mode traditional

# QoS Traffic Prioritization
docker exec amira-sdn-network python3 /tmp/qos_traffic_test.py --mode both

# Controller Resilience
docker exec amira-sdn-network python3 /tmp/controller_resilience_test.py

# Scalability Test
docker exec amira-sdn-network python3 /tmp/scalability_test.py --mode traditional
```

### Option B — Start Fresh with Docker Compose

If no containers are running:

```bash
# Start all services
docker compose up -d

# Wait for services to be healthy
docker compose ps

# The Mininet container needs privileged mode (already configured in docker-compose.yml)
```

### Option C — Interactive Mode (with Mininet CLI)

For hands-on exploration with the Mininet CLI:

```bash
# Enter the container
docker exec -it amira-sdn-network bash

# Clean up any previous run
mn -c

# Start OVS if needed
ovsdb-server --remote=punix:/var/run/openvswitch/db.sock --pidfile --detach
ovs-vswitchd --pidfile --detach

# Run a topology with interactive CLI
python3 /tmp/migration_phases.py --phase 0

# Inside the Mininet CLI:
mininet> pingall
mininet> h1 ping h10
mininet> nodes
mininet> links
mininet> dpctl dump-flows
mininet> exit
```

---

## Part 3: Simulation Details

### 3.1 — 6-Phase Migration Simulation

Demonstrates the phased migration from Traditional to Full SDN.

```bash
# Run a single phase
docker exec amira-sdn-network python3 /tmp/migration_phases.py --phase 0   # Baseline
docker exec amira-sdn-network python3 /tmp/migration_phases.py --phase 2   # Block C pilot
docker exec amira-sdn-network python3 /tmp/migration_phases.py --phase 5   # Full SDN

# Run all phases sequentially
docker exec amira-sdn-network python3 /tmp/migration_phases.py --all --no-cli
```

**What happens in each phase:**

| Phase | What migrates | SDN Switches |
|-------|--------------|--------------|
| 0 | Nothing (baseline) | 0 |
| 1 | Controller deployed (monitor-only) | 0 |
| 2 | Block C pilot | 3 (DS_C1, DS_C2, AS_C1) |
| 3 | Blocks A + B | 9 |
| 4 | Services block | 12 |
| 5 | Core (full SDN) | All 16 |

**Expected output:**
```
✓ h1 -> h2 (Same VLAN (Block A)): ✓ OK
✓ h19 -> h20 (Same VLAN (Block C)): ✓ OK
✓ h10 -> h11 (Same VLAN (Block B)): ✓ OK
ALL PHASES COMPLETE — MIGRATION SUCCESSFUL
```

---

### 3.2 — Failover Testing

Tests network resilience when links fail.

```bash
docker exec amira-sdn-network python3 /tmp/failover_testing.py --mode both
```

**Test 1 — Core Failover (CS1 → CS2):**
- Brings down ALL CS1 links (10 links)
- Verifies traffic reroutes via CS2
- Expected: 5/5 paths survive

**Test 2 — Access-Distribution Failover (AS_A1-DS_A1 → AS_A1-DS_A2):**
- Brings down the AS_A1 ↔ DS_A1 link
- Verifies Block A hosts still reachable via DS_A2
- Expected: 5/5 paths survive

**Expected output:**
```
  Baseline (all UP):      5/5 passed
  During failover (CS1 DOWN): 5/5 passed
  After recovery:         5/5 passed
  ✓ CORE FAILOVER TEST PASSED
```

---

### 3.3 — VLAN Isolation Test

Proves that traditional has NO segmentation vs SDN's flow-based isolation.

```bash
docker exec amira-sdn-network python3 /tmp/vlan_isolation_test.py --mode traditional
```

**What it tests:**
- Same-VLAN communication (should pass)
- Cross-VLAN isolation (should be blocked in SDN)
- Guest → Internal access (should be blocked)
- Service ACL enforcement

**Expected output (Traditional):**
```
⚠ WARN | Guest → ERP (SHOULD BE BLOCKED) → Connected (no ACL in traditional standalone)
⚠ WARN | Guest A → Finance host → Connected (guests NOT isolated in traditional)
ℹ Traditional Limitation: Standalone OVS does NOT enforce VLAN isolation at L2
```

---

### 3.4 — QoS Traffic Prioritization

Compares how VoIP quality holds up under congestion.

```bash
docker exec amira-sdn-network python3 /tmp/qos_traffic_test.py --mode both
```

**What it does:**
1. Measures VoIP baseline latency
2. Starts a TCP flood (congestion)
3. Measures VoIP latency during congestion
4. Measures video streaming during congestion
5. Measures recovery after congestion stops

---

### 3.5 — Controller Resilience

Tests what happens when the SDN controller goes down.

```bash
docker exec amira-sdn-network python3 /tmp/controller_resilience_test.py
```

**Scenarios:**
1. Baseline (standalone mode) → Network works
2. Secure mode (controller managing) → Network works
3. Controller disconnected (secure mode) → Cached flows or DOWN
4. Standalone fallback → Network degrades to L2
5. Controller recovers → Full SDN restored

---

### 3.6 — Scalability Test

Tests performance as hosts increase from 10 to 50.

```bash
docker exec amira-sdn-network python3 /tmp/scalability_test.py --mode traditional
```

**Measures at each scale (10, 20, 30, 50 hosts):**
- Average latency
- Connectivity rate
- Convergence time

---

## Part 4: Troubleshooting

### "mn -c" hangs or timeout

```bash
docker exec amira-sdn-network bash -c "pkill -9 python3; pkill -9 ovs-vswitchd; sleep 1"
docker exec amira-sdn-network bash -c "ovsdb-server --pidfile --detach; ovs-vswitchd --pidfile --detach"
docker exec amira-sdn-network mn -c
```

### OVS not running inside container

```bash
docker exec amira-sdn-network bash -c "\
  ovsdb-server --remote=punix:/var/run/openvswitch/db.sock --pidfile --detach && \
  ovs-vswitchd --pidfile --detach && \
  ovs-vsctl show"
```

### Container not found

```bash
# Check what's running
docker ps -a

# If container is stopped, restart it
docker start amira-sdn-network

# If it doesn't exist, create from docker-compose
docker compose up -d mininet
```

### SDN tests fail (no controller)

The SDN tests that use `--mode sdn` need a controller on port 6633. In our setup, the switches use `fail_mode=secure` with a remote controller reference, but the actual Ryu controller container (`amira-ryu-controller`) handles this.

```bash
# Check if Ryu is running
docker ps | grep ryu

# If not running
docker start amira-ryu-controller
```

### Database errors

```bash
# Reset the database
npx prisma db push --force-reset
npm run db:seed
```

### Port conflicts

| Port | Service |
|------|---------|
| 3000 | Next.js app |
| 3001 | WebSocket server |
| 5432 | PostgreSQL |
| 6633 | Ryu OpenFlow |
| 8080 | Ryu REST API |

```bash
# Kill process on a port (macOS)
lsof -ti:3000 | xargs kill -9
```

---

## Part 5: Development Workflow

### Adding a new simulation script

1. Create script in `scripts/mininet/`
2. Follow the pattern from existing scripts (argparse, `--mode`, `--no-cli`)
3. Copy to container: `docker cp scripts/mininet/your_script.py amira-sdn-network:/tmp/`
4. Test: `docker exec amira-sdn-network python3 /tmp/your_script.py`
5. Update `SIMULATION_COMMANDS.md`

### Adding a new API endpoint

1. Create file in `src/app/api/your-route/route.ts`
2. Import Prisma client: `import { prisma } from '@/lib/prisma'`
3. Export `GET`, `POST`, `PUT`, or `DELETE` functions
4. Add service function in `src/services/`
5. Add React Query hook in `src/hooks/`

### Adding a new dashboard page

1. Create `src/app/dashboard/your-page/page.tsx`
2. Mark as `'use client'` for interactive components
3. Import hooks from `@/hooks`
4. Add navigation link in the sidebar layout

### Running the full stack locally

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
node server/index.js
```

Terminal 3 (simulations):
```bash
docker exec amira-sdn-network python3 /tmp/migration_phases.py --all --no-cli
```

---

## Part 6: Useful Mininet CLI Commands

When running in interactive mode (`--phase X` without `--no-cli`):

| Command | Description |
|---------|-------------|
| `pingall` | Test all-to-all connectivity |
| `h1 ping h10` | Ping between two hosts |
| `h1 ping -c 5 10.3.0.1` | Ping a server IP |
| `iperf h1 h10` | Bandwidth test |
| `nodes` | List all nodes |
| `links` | List all links |
| `net` | Show network info |
| `dump` | Show all node info |
| `dpctl dump-flows` | Show OpenFlow flows |
| `sh ovs-vsctl show` | Show OVS config |
| `sh ovs-ofctl dump-flows CS1` | Flows on specific switch |
| `sh ovs-ofctl dump-ports CS1` | Port stats |
| `link CS1 DS_A1 down` | Bring a link down |
| `link CS1 DS_A1 up` | Bring a link up |
| `xterm h1` | Open terminal for a host |
| `exit` | Stop simulation |

---

## Quick Reference — Copy-Paste One-Liners

```bash
# Full simulation run (copy all scripts + run migration + failover)
docker cp scripts/mininet/ amira-sdn-network:/tmp/scripts/ && \
docker exec amira-sdn-network python3 /tmp/scripts/migration_phases.py --all --no-cli && \
docker exec amira-sdn-network python3 /tmp/scripts/failover_testing.py --mode both

# Quick demo for defense presentation
docker exec amira-sdn-network python3 /tmp/migration_phases.py --phase 0 --no-cli && \
docker exec amira-sdn-network python3 /tmp/migration_phases.py --phase 5 --no-cli && \
docker exec amira-sdn-network python3 /tmp/failover_testing.py --mode both

# Check if everything is running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```
