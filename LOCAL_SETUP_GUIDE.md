# SDN Migration Analysis Platform — Complete Client Guide

Full guide covering: what the system is, how to install it, how to use it, how to run simulations, and what results to expect.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Requirements](#2-requirements)
3. [Downloads & Installation](#3-downloads--installation)
4. [Clone the Repository](#4-clone-the-repository)
5. [Environment Configuration](#5-environment-configuration)
6. [Web Application Setup](#6-web-application-setup)
7. [Docker Services Setup (Mininet + Ryu)](#7-docker-services-setup-mininet--ryu)
8. [Running Mininet Simulations](#8-running-mininet-simulations)
9. [How to Use the Platform (User Guide)](#9-how-to-use-the-platform-user-guide)
10. [Expected Simulation Results](#10-expected-simulation-results)
11. [Login Credentials](#11-login-credentials)
12. [Verification Checklist](#12-verification-checklist)
13. [System Architecture & Data Flow](#13-system-architecture--data-flow)
14. [Known Limitations](#14-known-limitations)
15. [Demo / Presentation Script](#15-demo--presentation-script)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. System Overview

### What is this?

The **SDN Migration Analysis Platform** is a web-based application that compares **Traditional Hierarchical LAN Architecture** vs **Software-Defined Networking (SDN)** using real network simulations. It answers the question: *"Is SDN better than traditional networking, and by how much?"*

### What does it do?

| Feature | Description |
|---------|-------------|
| **Network Simulation** | Runs real network topologies (27 hosts, 14 VLANs, 16 switches) in Mininet |
| **Performance Testing** | Measures latency, throughput, packet loss, jitter, failover time |
| **Statistical Comparison** | T-tests with p-values proving SDN is significantly better |
| **Topology Visualization** | Interactive network maps (Traditional vs SDN side-by-side) |
| **Manageability Analysis** | Compares config time: VLAN creation, ACL changes, routing updates |
| **Migration Model** | 6-phase migration plan with timeline and cost savings |
| **Decision Support** | AI-assisted recommendation engine (migrate, hybrid, or stay) |
| **Readiness Assessment** | Scores an organization's SDN readiness (1-100%) |
| **Report Generation** | Export findings as PDF, Excel, or CSV |

### Key Findings (Summary)

| Metric | Traditional | SDN | Improvement |
|--------|-------------|-----|-------------|
| Average Latency | 22.5 ms | 11 ms | **49% lower** |
| Throughput | 850 Mbps | 975 Mbps | **15% higher** |
| Packet Loss | 0.75% | 0.2% | **73% lower** |
| Failover Time | 17.5 sec | 2 sec | **89% faster** |
| VLAN Add Time | 17.5 min | 2.5 min | **86% faster** |
| ACL Config Time | 25 min | 6.5 min | **74% faster** |

All results are statistically significant (p < 0.05).

### Tech Stack

- **Frontend:** Next.js 14, React 18, TailwindCSS, Recharts, ReactFlow
- **Backend:** Next.js API Routes, Prisma ORM, PostgreSQL (Supabase)
- **Auth:** NextAuth.js with role-based access (Admin, Researcher, Panel)
- **Network:** Mininet + Open vSwitch + Ryu Controller (OpenFlow 1.3)
- **Infrastructure:** Docker, Docker Compose

---

## 2. Requirements

### Minimum System Specs

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 8 GB | 16 GB |
| Disk Space | 10 GB free | 20 GB free |
| OS | Windows 10/11, macOS 12+, Ubuntu 20.04+ | Any |
| Internet | Required for initial setup | — |

### Software to Install

| Software | Version | Required For |
|----------|---------|--------------|
| Node.js | 18 or higher | Web application |
| Git | Any | Clone the repo |
| Docker Desktop | Latest | Mininet, Ryu Controller, PostgreSQL |

---

## 3. Downloads & Installation

### Step 2.1 — Install Node.js

Download from: **https://nodejs.org** (choose LTS version)

After installation, verify:
```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
```

### Step 2.2 — Install Git

Download from: **https://git-scm.com/downloads**

After installation, verify:
```bash
git --version
```

### Step 2.3 — Install Docker Desktop

Download from: **https://www.docker.com/products/docker-desktop**

**Important notes per OS:**

| OS | Notes |
|----|-------|
| **Windows** | Enable WSL 2 backend during installation. Go to Settings → General → check "Use the WSL 2 based engine" |
| **macOS** | Choose the correct chip (Apple Silicon or Intel). Allow Docker in System Settings → Privacy & Security |
| **Linux** | Install Docker Engine + Docker Compose plugin. Add your user to the `docker` group |

After installation, verify:
```bash
docker --version           # Should show 24.x or higher
docker compose version     # Should show v2.x or higher
```

> **Windows Users:** Make sure Docker Desktop is running (you'll see the whale icon in the system tray) before proceeding.

---

## 4. Clone the Repository

```bash
git clone https://github.com/corestacktechph-ui/SDN-Map.git
cd SDN-Map
```

---

## 5. Environment Configuration

Create the environment file:

```bash
cp .env.example .env.local
```

Then open `.env.local` and set these values:

```env
# Database (Supabase Cloud — no local DB install needed)
DATABASE_URL="postgresql://postgres.rlultndwlfqqpcdfvvmb:Carlpogi%401029@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.rlultndwlfqqpcdfvvmb:Carlpogi%401029@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-key-sdn-map-2024"
JWT_SECRET="your-jwt-secret-change-in-production"

# App URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Ryu Controller (Docker container)
RYU_CONTROLLER_HOST="localhost"
RYU_CONTROLLER_PORT=6633
RYU_REST_API_PORT=8080

# WebSocket
SOCKET_PORT=3001
MONITORING_INTERVAL=1000
```

> **Note:** The database is hosted on Supabase (cloud). No need to install PostgreSQL locally.

---

## 6. Web Application Setup

### Step 5.1 — Install Dependencies

```bash
npm install
```

This will take 2-3 minutes on first run. It also auto-runs `prisma generate`.

### Step 5.2 — Generate Prisma Client

```bash
npm run db:generate
```

### Step 5.3 — Push Database Schema (first time only)

```bash
npm run db:push
```

### Step 5.4 — Seed the Database (first time only)

```bash
npm run db:seed
```

This creates:
- 3 user accounts (Admin, Researcher, Panel)
- Network topologies (Traditional + SDN)
- 42 network devices
- 14 VLANs
- Ryu controller config

### Step 5.5 — Start the Web Application

```bash
npm run dev
```

The app is now running at: **http://localhost:3000**

### Step 5.6 — Start WebSocket Server (separate terminal)

Open a **new terminal window**, navigate to the project folder, then:

```bash
node server/index.js
```

This starts real-time monitoring on port 3001.

---

## 7. Docker Services Setup (Mininet + Ryu)

### Step 6.1 — Make sure Docker Desktop is running

Check the Docker icon in your system tray/menu bar. It should be green/running.

### Step 6.2 — Start all Docker containers

```bash
docker compose up -d
```

This will:
- Pull the Mininet image (`iwaseyusuke/mininet:latest`)
- Build the Ryu controller image from `Dockerfile.ryu`
- Start the following containers:

| Container | Port | Purpose |
|-----------|------|---------|
| `amira-mininet` | — | Mininet simulation environment |
| `amira-ryu` | 6633, 8080 | Ryu SDN Controller |
| `amira-postgres` | 5432 | PostgreSQL (if using local DB) |
| `amira-nextjs` | 3000 | Web app (Docker version) |
| `amira-nginx` | 80, 443 | Reverse proxy |

> **First time:** The Ryu controller image build will take 3-5 minutes. Subsequent starts are instant.

### Step 6.3 — Verify containers are running

```bash
docker ps
```

You should see all containers with status "Up":
```
NAMES            STATUS
amira-mininet    Up
amira-ryu        Up
amira-postgres   Up (healthy)
amira-nextjs     Up
amira-nginx      Up
```

### Step 6.4 — Initialize Open vSwitch inside Mininet

```bash
docker exec amira-mininet bash -c "ovsdb-server --remote=punix:/var/run/openvswitch/db.sock --pidfile --detach && ovs-vswitchd --pidfile --detach"
```

---

## 8. Running Mininet Simulations

### Step 7.1 — Copy simulation scripts to the container

```bash
docker cp scripts/mininet/ amira-mininet:/tmp/scripts/
```

### Step 7.2 — Available Simulations

| Simulation | Command | Description |
|------------|---------|-------------|
| **6-Phase Migration** | `docker exec amira-mininet python3 /tmp/scripts/migration_phases.py --all --no-cli` | Full Traditional → SDN migration |
| **Failover Testing** | `docker exec amira-mininet python3 /tmp/scripts/failover_testing.py --mode both` | Network resilience tests |
| **VLAN Isolation** | `docker exec amira-mininet python3 /tmp/scripts/vlan_isolation_test.py --mode traditional` | VLAN segmentation tests |
| **QoS Traffic** | `docker exec amira-mininet python3 /tmp/scripts/qos_traffic_test.py --mode both` | Traffic prioritization |
| **Controller Resilience** | `docker exec amira-mininet python3 /tmp/scripts/controller_resilience_test.py` | SDN controller failure recovery |
| **Scalability** | `docker exec amira-mininet python3 /tmp/scripts/scalability_test.py --mode traditional` | Performance at scale (10-50 hosts) |
| **Load Testing** | `docker exec amira-mininet python3 /tmp/scripts/load_testing.py` | Stress testing |
| **Traditional Topology** | `docker exec amira-mininet python3 /tmp/scripts/traditional_topology.py` | Traditional LAN topology |
| **SDN Topology** | `docker exec amira-mininet python3 /tmp/scripts/sdn_topology.py` | SDN-managed topology |

### Step 7.3 — Quick Demo Run (recommended first test)

```bash
# Run full migration simulation
docker exec amira-mininet python3 /tmp/scripts/migration_phases.py --all --no-cli

# Run failover test
docker exec amira-mininet python3 /tmp/scripts/failover_testing.py --mode both
```

### Step 7.4 — Interactive Mininet CLI (optional)

```bash
# Enter the Mininet container
docker exec -it amira-mininet bash

# Clean any previous runs
mn -c

# Run a specific phase interactively
python3 /tmp/scripts/migration_phases.py --phase 0

# Inside Mininet CLI:
# pingall          - Test all connections
# h1 ping h10     - Ping between hosts
# nodes            - List all nodes
# links            - List all links
# exit             - Stop simulation
```

---

## 9. How to Use the Platform (User Guide)

After logging in at http://localhost:3000, here's what each page does and how to use it:

### Dashboard (Home)

**URL:** `/dashboard`

What you see:
- Total devices, switches, hosts, VLANs count
- Network health score (circular gauge)
- Controller status (connected/disconnected)
- Recent test results summary
- Quick navigation cards to other pages

### Topology Visualization

**URL:** `/dashboard/topology`

What you can do:
- View the full network map (interactive, drag/zoom)
- Click on any device to see its details (IP, MAC, VLAN, connections)
- Toggle between Traditional and SDN views
- See link status (up/down) in real-time

### Traditional Network View

**URL:** `/dashboard/traditional`

Shows the traditional HND architecture:
- 3-tier hierarchy: Core → Distribution → Access
- OSPF routing, VRRP redundancy, STP loop prevention
- Per-device configuration details

### SDN Network View

**URL:** `/dashboard/sdn`

Shows the SDN architecture:
- Ryu controller status and connected switches
- OpenFlow flow table entries
- Centralized policy management
- Real-time flow statistics

### Testing Center

**URL:** `/dashboard/testing`

How to run a test:
1. Click "New Test" or "Run Test"
2. Select test type (Latency, Throughput, Failover, etc.)
3. Choose architecture (Traditional, SDN, or Both)
4. Click "Execute"
5. Wait for results (10-30 seconds)
6. View results in the table below

### Analytics & Statistical Analysis

**URL:** `/dashboard/analytics`

What you see:
- Bar charts: Traditional vs SDN for each metric
- Radar chart: Overall capability comparison
- T-test results with p-values
- Confidence intervals
- Statistical significance indicators (✓ or ✗)

### Manageability Comparison

**URL:** `/dashboard/manageability`

Shows operational time comparisons:
- VLAN creation time
- ACL update time
- Routing changes
- QoS configuration
- Overall management overhead

### Migration Model

**URL:** `/dashboard/migration`

Interactive 6-phase migration plan:
- Phase 0: Assessment
- Phase 1: Controller Deployment
- Phase 2: Underlay Migration
- Phase 3: Overlay Migration
- Phase 4: Service Migration
- Phase 5: Optimization

### Readiness Assessment

**URL:** `/dashboard/readiness`

Interactive scoring tool:
1. Answer 6 questions (scale 1-5 each)
2. System calculates weighted readiness score
3. Shows strengths, weaknesses, and action plan
4. Score determines: Ready / Partially Ready / Not Ready

### Decision Support Engine

**URL:** `/dashboard/decision-support`

Data-driven recommendation tool:
1. Reviews 8 weighted criteria
2. Produces one of three recommendations:
   - **Full SDN Migration**
   - **Hybrid Approach**
   - **Stay Traditional**
3. Shows confidence level and factor breakdown

### Reports

**URL:** `/dashboard/reports`

Export options:
- **PDF** — Formatted report with charts (for thesis/presentation)
- **Excel** — Raw data tables (for further analysis)
- **CSV** — Simple export

### System Logs & Alerts

**URL:** `/dashboard/logs` and `/dashboard/alerts`

- Audit trail of all actions taken in the system
- Alert history for network events
- Filterable by date, user, action type

---

## 10. Expected Simulation Results

### Migration Phases (migration_phases.py --all --no-cli)

Expected output:
```
============================================================
  PHASE 0 — BASELINE (Traditional)
============================================================
[*] Starting traditional network...
[OK] 16 switches, 27 hosts created

Testing connectivity:
✓ h1 -> h2 (Same VLAN - Block A): OK
✓ h10 -> h11 (Same VLAN - Block B): OK
✓ h19 -> h20 (Same VLAN - Block C): OK

============================================================
  PHASE 2 — BLOCK C PILOT (3 SDN switches)
============================================================
[*] Converting DS_C1, DS_C2, AS_C1 to OpenFlow...
[OK] Connectivity maintained during migration

============================================================
  PHASE 5 — FULL SDN (All 16 switches)
============================================================
[*] All switches now SDN-managed
[OK] Full connectivity verified

ALL PHASES COMPLETE — MIGRATION SUCCESSFUL
```

### Failover Testing (failover_testing.py --mode both)

Expected output:
```
============================================================
  FAILOVER TEST — CORE SWITCH FAILURE
============================================================
  Baseline (all links UP):        5/5 passed
  During failover (CS1 DOWN):     5/5 passed
  After recovery (CS1 restored):  5/5 passed

  Traditional recovery time: ~15-30 seconds (OSPF reconvergence)
  SDN recovery time: ~1-3 seconds (controller reroutes instantly)

  ✓ CORE FAILOVER TEST PASSED
```

### VLAN Isolation (vlan_isolation_test.py)

Expected output:
```
============================================================
  VLAN ISOLATION TEST
============================================================
  Same-VLAN (h1 → h2):          ✓ Connected (correct)
  Cross-VLAN (h1 → h10):        ✗ Blocked (correct in SDN)
  Guest → Internal (h7 → h1):   ✗ Blocked (correct in SDN)

  Traditional: ⚠ Cross-VLAN NOT blocked (no L3 ACL in standalone OVS)
  SDN: ✓ Cross-VLAN properly blocked by flow rules
```

### QoS Traffic Test (qos_traffic_test.py --mode both)

Expected output:
```
============================================================
  QoS TRAFFIC PRIORITIZATION TEST
============================================================
  VoIP baseline latency:         2.1 ms
  VoIP during congestion (Trad): 45.3 ms (degraded)
  VoIP during congestion (SDN):  5.8 ms (prioritized)

  SDN QoS maintains VoIP quality under congestion ✓
```

### Scalability Test (scalability_test.py)

Expected output:
```
============================================================
  SCALABILITY TEST
============================================================
  10 hosts:  avg latency 8.2ms,  100% connectivity
  20 hosts:  avg latency 12.5ms, 100% connectivity
  30 hosts:  avg latency 18.1ms, 100% connectivity
  50 hosts:  avg latency 25.7ms, 98% connectivity

  Conclusion: Network scales linearly up to 50 hosts
```

> **Note:** Actual numbers may vary slightly between runs. The trends and pass/fail results should remain consistent.

Once the app is running at http://localhost:3000:

| Email | Password | Role | Access |
|-------|----------|------|--------|
| admin@amira-capstone.com | admin123 | ADMIN | Full access — settings, users, all features |
| researcher@amira-capstone.com | researcher123 | RESEARCHER | Dashboard, testing, analytics, reports |
| panel@amira-capstone.com | panel123 | PANEL | Dashboard, testing, analytics (read-focused) |

---

## 12. Verification Checklist

After setup, verify each component:

- [ ] **Web App** — http://localhost:3000 loads the login page
- [ ] **Login** — Can login with admin@amira-capstone.com / admin123
- [ ] **Dashboard** — Shows network devices and topology
- [ ] **Docker** — `docker ps` shows all containers running
- [ ] **Mininet** — Migration simulation runs without errors
- [ ] **Ryu Controller** — http://localhost:8080 responds (Ryu REST API)

---

## 16. Troubleshooting

### Docker Desktop won't start (Windows)

1. Open PowerShell as Administrator
2. Run: `wsl --update`
3. Run: `wsl --set-default-version 2`
4. Restart Docker Desktop

### `npm install` fails

```bash
# Clear npm cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Docker build fails for Ryu controller

```bash
# Rebuild without cache
docker compose build --no-cache ryu-controller
docker compose up -d
```

### Mininet container exits immediately

```bash
# Check logs
docker logs amira-mininet

# Restart with privileged mode (already in docker-compose.yml)
docker compose up -d mininet
```

### "OVS not running" inside Mininet container

```bash
docker exec amira-mininet bash -c "\
  ovsdb-server --remote=punix:/var/run/openvswitch/db.sock --pidfile --detach && \
  ovs-vswitchd --pidfile --detach && \
  ovs-vsctl show"
```

### Port already in use

```bash
# macOS/Linux — find and kill process on port
lsof -ti:3000 | xargs kill -9
lsof -ti:6633 | xargs kill -9

# Windows — find and kill process on port
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### Database connection error

- Check internet connection (database is on Supabase cloud)
- Verify `.env.local` has correct DATABASE_URL
- If Supabase project is paused, go to https://supabase.com/dashboard and restore it

### "mn -c" hangs

```bash
docker exec amira-mininet bash -c "pkill -9 python3; pkill -9 ovs-vswitchd; sleep 1"
docker exec amira-mininet bash -c "ovsdb-server --pidfile --detach; ovs-vswitchd --pidfile --detach"
docker exec amira-mininet mn -c
```

---

## Quick Reference — Full Startup Sequence

Every time you want to run the system:

```bash
# 1. Start Docker Desktop (if not running)

# 2. Start Docker containers
docker compose up -d

# 3. Start web app (Terminal 1)
npm run dev

# 4. Start WebSocket server (Terminal 2)
node server/index.js

# 5. Copy and run simulations (Terminal 3)
docker cp scripts/mininet/ amira-mininet:/tmp/scripts/
docker exec amira-mininet python3 /tmp/scripts/migration_phases.py --all --no-cli
```

---

## Stopping Everything

```bash
# Stop web app: Ctrl+C in the terminal running npm run dev
# Stop WebSocket: Ctrl+C in the terminal running node server/index.js

# Stop Docker containers
docker compose down

# Stop Docker containers AND remove data volumes (full reset)
docker compose down -v
```

---

## Folder Structure (Key Files)

```
SDN-Map/
├── src/                        # Next.js web application source
│   ├── app/                    # Pages and API routes
│   ├── components/             # React components
│   ├── hooks/                  # Custom React hooks
│   └── services/               # API service functions
├── scripts/
│   ├── mininet/                # Mininet simulation scripts
│   │   ├── migration_phases.py     # 6-phase migration
│   │   ├── failover_testing.py     # Failover tests
│   │   ├── qos_traffic_test.py     # QoS tests
│   │   ├── vlan_isolation_test.py  # VLAN tests
│   │   ├── scalability_test.py     # Scalability tests
│   │   ├── load_testing.py         # Load tests
│   │   ├── traditional_topology.py # Traditional network
│   │   └── sdn_topology.py         # SDN network
│   └── ryu/                    # Ryu controller apps
│       ├── sdn_controller.py       # Main SDN controller
│       ├── qos_controller.py       # QoS management
│       └── monitoring.py           # Network monitoring
├── prisma/                     # Database schema and seed
├── server/                     # WebSocket server
├── docker-compose.yml          # All Docker services
├── Dockerfile                  # Web app container
├── Dockerfile.ryu              # Ryu controller container
├── .env.local                  # Environment variables
└── package.json                # Dependencies
```
