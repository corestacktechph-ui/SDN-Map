# SDN Migration Analysis Platform — System Documentation

## Project Overview

**Title:** Migration of Traditional Hierarchical LAN Architecture to SDN using Ryu Controller  
**Type:** Capstone Research Project  
**Platform Name:** Amira Capstone SDN Migration Analysis  

This system is a full-stack web application combined with network simulation infrastructure that demonstrates, tests, and visualizes the migration from a traditional hierarchical network design (HND) to a Software-Defined Network (SDN) architecture using the Ryu OpenFlow controller.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                             │
│  Next.js 14 App Router │ React 18 │ TailwindCSS │ Recharts │ Radix │
└───────────┬────────────────────────────────────┬────────────────────┘
            │ HTTP/REST                          │ WebSocket (Socket.IO)
            ▼                                    ▼
┌───────────────────────┐            ┌─────────────────────────┐
│   Next.js API Routes  │            │  WebSocket Server (3001) │
│   /api/*  (REST)      │            │  Real-time metrics,      │
│   NextAuth Sessions   │            │  topology updates,       │
│   Prisma ORM          │            │  controller events       │
└───────────┬───────────┘            └─────────────────────────┘
            │
            ▼
┌───────────────────────┐     ┌──────────────────────────────────┐
│  SQLite / PostgreSQL  │     │     Ryu SDN Controller           │
│  (Prisma Database)    │     │     OpenFlow 1.3 (port 6633)     │
│  14 data models       │     │     REST API (port 8080)         │
└───────────────────────┘     └──────────────┬───────────────────┘
                                             │ OpenFlow Protocol
                                             ▼
                              ┌──────────────────────────────────┐
                              │     Mininet Simulation           │
                              │     (Docker: privileged mode)    │
                              │     Open vSwitch + 27 hosts      │
                              │     16 switches, 9 VLANs        │
                              └──────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.2.3 | Full-stack React framework (App Router) |
| React | 18.3.1 | UI component library |
| TypeScript | 5.4.5 | Type safety |
| TailwindCSS | 3.4.3 | Utility-first CSS |
| Radix UI | Various | Accessible component primitives |
| Recharts | 2.15.4 | Charts and data visualization |
| ReactFlow / Cytoscape | 11.11.4 / 3.28.1 | Network topology visualization |
| Framer Motion | 11.0.24 | Animations and transitions |
| Lucide React | 0.364.0 | Icon library |

### State Management & Data Fetching
| Technology | Purpose |
|-----------|---------|
| TanStack React Query 5 | Server state, caching, auto-refetching |
| Zustand 4.5.2 | Client-side global state |
| Jotai 2.8.0 | Atomic state management |
| React Hook Form 7.51.3 | Form handling |
| Zod 3.23.8 | Schema validation |

### Backend
| Technology | Purpose |
|-----------|---------|
| Next.js API Routes | REST API endpoints (/api/*) |
| Prisma 5.14.0 | ORM and database migrations |
| SQLite (dev) / PostgreSQL 16 (prod) | Database |
| NextAuth.js 4.24.7 | Authentication (Credentials + JWT) |
| bcryptjs | Password hashing |
| Socket.IO 4.8.3 | Real-time WebSocket communication |

### Network Simulation
| Technology | Purpose |
|-----------|---------|
| Mininet | Virtual network simulation |
| Open vSwitch (OVS) | OpenFlow-capable virtual switches |
| Ryu Controller | SDN controller (OpenFlow 1.3) |
| Python 3 | Simulation scripts |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Docker & Docker Compose | Containerization |
| Nginx | Reverse proxy |
| Node.js | WebSocket server runtime |

### Reporting & Export
| Technology | Purpose |
|-----------|---------|
| jsPDF + jspdf-autotable | PDF report generation |
| ExcelJS | Excel export |
| PDFKit | Server-side PDF generation |

---

## Project Structure

```
SDN-MAP/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (providers, fonts)
│   │   ├── globals.css               # Global styles + CSS variables
│   │   ├── page.tsx                  # Landing page
│   │   ├── login/page.tsx            # Authentication page
│   │   ├── register/page.tsx         # User registration
│   │   ├── dashboard/               # Protected dashboard routes
│   │   │   ├── page.tsx             # Main dashboard (health, stats)
│   │   │   ├── topology/page.tsx    # Network topology visualization
│   │   │   ├── sdn/page.tsx         # SDN controller management
│   │   │   ├── traditional/page.tsx # Traditional network view
│   │   │   ├── testing/page.tsx     # Performance testing center
│   │   │   ├── analytics/page.tsx   # Advanced analytics & reports
│   │   │   ├── settings/page.tsx    # System settings (Admin)
│   │   │   └── users/page.tsx       # User management (Admin)
│   │   └── api/                     # REST API endpoints
│   │       ├── auth/[...nextauth]/  # NextAuth handlers
│   │       ├── topology/route.ts    # CRUD topologies
│   │       ├── devices/route.ts     # Device management
│   │       ├── switches/route.ts    # Switch-specific queries
│   │       ├── hosts/route.ts       # Host queries
│   │       ├── flows/route.ts       # OpenFlow flow entries
│   │       ├── qos/route.ts         # QoS policy management
│   │       ├── tests/route.ts       # Performance test lifecycle
│   │       ├── results/route.ts     # Test results storage
│   │       ├── comparison/route.ts  # Traditional vs SDN comparisons
│   │       ├── monitoring/route.ts  # Network stats aggregation
│   │       ├── controller/route.ts  # Ryu controller management
│   │       ├── alerts/route.ts      # Alert system
│   │       ├── notifications/route.ts
│   │       ├── logs/route.ts        # Audit logging
│   │       ├── reports/route.ts     # Report generation
│   │       └── users/route.ts       # User CRUD
│   ├── components/
│   │   ├── ui/                      # Radix-based UI primitives
│   │   ├── network/                 # Topology visualizations
│   │   │   └── NetworkTopologyVisualization.tsx
│   │   ├── monitoring/
│   │   │   └── RealTimeMonitor.tsx  # Live metric charts
│   │   ├── analytics/
│   │   │   └── StatisticalAnalysis.tsx  # T-test comparison
│   │   ├── migration/
│   │   │   └── MigrationSimulator.tsx   # Phase animation
│   │   ├── reports/
│   │   │   └── PDFReportGenerator.tsx
│   │   └── providers.tsx            # App-wide providers
│   ├── hooks/
│   │   ├── index.ts                 # Barrel export
│   │   ├── useTopology.ts           # Topology queries
│   │   ├── useMonitoring.ts         # Stats + controller
│   │   ├── useTests.ts              # Test execution
│   │   ├── useReports.ts            # Report generation
│   │   ├── useUsers.ts              # User management
│   │   └── useSocket.ts             # WebSocket connection
│   ├── services/
│   │   ├── index.ts                 # Barrel export
│   │   ├── api.ts                   # Base HTTP client
│   │   ├── topology.ts              # Topology + devices + flows + QoS
│   │   ├── monitoring.ts            # Stats + controller + logs
│   │   ├── tests.ts                 # Performance tests + comparisons
│   │   ├── reports.ts               # Reports CRUD
│   │   ├── users.ts                 # User management
│   │   ├── notifications.ts         # Notifications + alerts
│   │   ├── settings.ts              # App settings (localStorage)
│   │   └── ryu.ts                   # Direct Ryu REST API client
│   ├── lib/
│   │   ├── prisma.ts                # Prisma client singleton
│   │   ├── auth.ts                  # NextAuth config + helpers
│   │   ├── utils.ts                 # Utility functions
│   │   ├── json.ts                  # JSON serialization helpers
│   │   └── test-runner.ts           # Performance test simulation engine
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces
│   └── middleware.ts                # Auth + role-based route protection
├── server/
│   └── index.js                     # WebSocket server (Socket.IO)
├── scripts/
│   ├── mininet/                     # Network simulation scripts
│   │   ├── migration_phases.py      # 6-phase SDN migration
│   │   ├── failover_testing.py      # Core + access failover
│   │   ├── qos_traffic_test.py      # QoS traffic prioritization
│   │   ├── vlan_isolation_test.py   # VLAN segmentation verification
│   │   ├── controller_resilience_test.py  # Controller failure behavior
│   │   ├── scalability_test.py      # 10-50 host scaling
│   │   ├── traditional_topology.py  # Full HND topology
│   │   ├── sdn_topology.py          # Full SDN topology
│   │   └── network_diagnostics.py   # Diagnostic utilities
│   └── ryu/                         # Ryu controller applications
│       ├── sdn_controller.py        # Main forwarding app
│       ├── qos_controller.py        # QoS management
│       └── monitoring.py            # Traffic monitoring
├── prisma/
│   ├── schema.prisma                # Database schema (14 models)
│   └── seed.ts                      # Database seeding
├── network/
│   └── configs/                     # Network configurations
│       ├── dhcp/                    # DHCP server configs
│       └── vrrp/                    # VRRP redundancy configs
├── docker-compose.yml               # Multi-service orchestration
├── Dockerfile                       # Next.js production build
├── Dockerfile.ryu                   # Ryu controller image
├── next.config.js                   # Next.js configuration
├── tailwind.config.ts               # TailwindCSS theming
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Dependencies & scripts
```

---

## Database Schema (Prisma)

14 models organized across domains:

### Core Models
```
User           → Authentication, roles (ADMIN/RESEARCHER)
Topology       → Network topologies (TRADITIONAL/SDN)
Device         → Switches, hosts, servers with status tracking
Controller     → Ryu SDN controller state
```

### Network Models
```
FlowEntry      → OpenFlow flow table entries per device
Link           → Device-to-device connections with metrics
Vlan           → VLAN definitions (9 user + service VLANs)
QoSPolicy      → Traffic priority policies (HIGH/MEDIUM/LOW)
NetworkEvent   → Network state change events
```

### Testing & Analysis Models
```
PerformanceTest    → Test execution lifecycle (PENDING→RUNNING→COMPLETED)
PerformanceResult  → Metric values per test (latency, throughput, etc.)
ComparisonResult   → Traditional vs SDN improvement percentages
```

### System Models
```
Report         → Generated PDF/Excel reports
Notification   → User notifications
Alert          → System alerts (severity-based)
Log            → Audit trail
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/[...nextauth] | Authentication (login/session) |
| GET/POST | /api/topology | Topology CRUD |
| GET | /api/devices | All devices |
| GET | /api/switches | Switch-specific with flows |
| GET | /api/hosts | Host devices |
| GET/POST | /api/flows | OpenFlow flow entries |
| GET/POST/PUT | /api/qos | QoS policy management |
| GET/POST/PUT | /api/tests | Performance test lifecycle |
| GET/POST | /api/results | Test result storage |
| GET/POST | /api/comparison | Traditional vs SDN comparisons |
| GET | /api/monitoring | Aggregated network stats |
| GET/POST/DELETE | /api/controller | Ryu controller management |
| GET/PUT | /api/alerts | Alert management |
| GET/PUT | /api/notifications | Notification management |
| GET/POST | /api/logs | Audit logs |
| GET/POST | /api/reports | Report generation |
| GET/DELETE | /api/users | User management (Admin) |

---

## Authentication & Authorization

- **Provider:** NextAuth.js with Credentials strategy
- **Session:** JWT-based (30-day expiry)
- **Password:** bcryptjs hashing
- **Roles:** ADMIN, RESEARCHER
- **Middleware:** All `/dashboard/*` routes require authentication
- **Admin routes:** `/dashboard/settings`, `/dashboard/users` require ADMIN role

---

## Real-Time System

### WebSocket Server (`server/index.js`)
- Runs on port 3001 (separate from Next.js)
- Emits every 2 seconds:
  - `metrics` — latency, throughput, packet loss, flow count, connections
  - `topology` — device status changes, link bandwidth, layer traffic stats
- Emits every 10 seconds:
  - `event` — simulated controller events (PacketIn, FlowRemoved, PortStatus)

### Client Hook (`useSocket.ts`)
- Socket.IO client with auto-reconnection
- Provides: `connected`, `metrics`, `events`, `topology`, `emit`
- Used by RealTimeMonitor and NetworkTopologyVisualization components

---

## Performance Test Engine (`test-runner.ts`)

Simulates network performance tests with values calibrated from actual Mininet results:

| Metric | Traditional (HND) | SDN |
|--------|-------------------|-----|
| Latency | 18.3 ms ± 5.2 | 9.1 ms ± 2.4 |
| Packet Loss | 0.82% ± 0.35 | 0.21% ± 0.08 |
| Jitter | 3.24 ms ± 1.2 | 1.12 ms ± 0.4 |
| Throughput | 847 Mbps ± 45 | 979 Mbps ± 28 |
| Failover Recovery | 7520 ms ± 1800 | 1210 ms ± 250 |

Auto-creates comparison records when both Traditional and SDN tests exist.

---

## Mininet Simulation Scripts

### Network Topology
- **16 switches:** 2 Core (CS1, CS2), 8 Distribution (DS_A1/A2, B1/B2, C1/C2, S1/S2), 4 Access (AS_A1, B1, C1, S1), 2 Internet (ISP, EdgeRtr)
- **27 hosts:** Distributed across 3 blocks (A, B, C) with 9 VLANs
- **6 service servers:** ERP, HR, Monitoring, IT, VoIP, DHCP
- **Redundancy:** Dual-homed access switches, redundant core-distribution links

### Simulation Scripts

| Script | Purpose |
|--------|---------|
| `migration_phases.py` | 6-phase migration (Traditional → Full SDN) |
| `failover_testing.py` | Core (CS1→CS2) and access (AS→DS) failover |
| `qos_traffic_test.py` | VoIP/video/bulk traffic prioritization |
| `vlan_isolation_test.py` | VLAN segmentation and ACL enforcement |
| `controller_resilience_test.py` | Controller failure and standalone fallback |
| `scalability_test.py` | Performance at 10/20/30/50 host scales |
| `traditional_topology.py` | Full traditional network (STP, VRRP) |
| `sdn_topology.py` | Full SDN network (Ryu, OpenFlow 1.3) |

---

## Docker Infrastructure

```yaml
services:
  postgres:       # PostgreSQL 16 (production database)
  nextjs-app:     # Next.js frontend + API (port 3000)
  ryu-controller: # Ryu SDN Controller (ports 6633, 8080)
  mininet:        # Network simulation (privileged mode)
  nginx:          # Reverse proxy (ports 80, 443)
```

### Container Dependencies
```
nginx → nextjs-app → postgres (healthy)
                   → ryu-controller
mininet (standalone, privileged)
```

---

## Key Design Decisions

1. **App Router over Pages Router** — Leverages React Server Components, streaming, and the latest Next.js patterns
2. **SQLite for dev, PostgreSQL for prod** — Zero-config development with production-grade database
3. **React Query over SWR** — More powerful mutation support, optimistic updates, cache invalidation
4. **Separate WebSocket server** — Decouples real-time from Next.js API for scalability
5. **Prisma over raw SQL** — Type-safe queries, auto-generated client, easy migrations
6. **Calibrated test data** — Performance values derived from actual Mininet simulations, not arbitrary
7. **Docker privileged mode for Mininet** — Required for Linux kernel network namespaces
8. **Socket.IO over raw WebSocket** — Auto-reconnection, fallback to polling, room support

---

## Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Database
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:seed        # Seed initial data
npm run db:studio      # Open Prisma Studio GUI

# Build & Production
npm run build
npm run start

# Code Quality
npm run lint           # ESLint
npm run typecheck      # TypeScript check

# Docker
npm run docker:up      # Start all containers
npm run docker:down    # Stop all containers
npm run docker:build   # Rebuild images

# WebSocket Server
node server/index.js   # Start on port 3001
```

---

## Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"                    # SQLite (dev)
DATABASE_URL="postgresql://user:pass@host/db"   # PostgreSQL (prod)

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Ryu Controller
RYU_CONTROLLER_HOST="localhost"
RYU_CONTROLLER_PORT="6633"
RYU_REST_API_PORT="8080"

# WebSocket
NEXT_PUBLIC_WS_URL="http://localhost:3001"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Simulation Results (Verified)

| Test | Traditional (HND) | SDN | Improvement |
|------|-------------------|-----|-------------|
| Avg Latency | 18.3 ms | 9.1 ms | 50.3% |
| Throughput | 847 Mbps | 979 Mbps | 15.6% |
| Packet Loss | 0.82% | 0.21% | 74.4% |
| Jitter | 3.24 ms | 1.12 ms | 65.4% |
| Failover Recovery | 7520 ms | 1210 ms | 83.9% |
| Core Failover | 5/5 passed | 5/5 passed | Both OK |
| Access Failover | 5/5 passed | 5/5 passed | Both OK |
| VLAN Isolation | ✗ No enforcement | ✓ Flow-based | SDN advantage |
| Guest Isolation | ✗ Flat L2 | ✓ Enforced | SDN advantage |
| Migration Phases | N/A | 6/6 passed | Zero downtime |

---

## Security Considerations

- JWT tokens with 30-day expiry
- bcryptjs password hashing (cost factor 10)
- Role-based route protection via middleware
- API CORS headers configured
- Docker secrets for production credentials
- No sensitive data in client-side code

---

## Deployment

### Development
```bash
npm install
npm run db:push
npm run db:seed
npm run dev
# Separate terminal:
node server/index.js
```

### Production (Docker)
```bash
docker-compose up -d
# Access: http://localhost (nginx) or http://localhost:3000 (direct)
```

### Mininet Simulations
```bash
docker exec -it amira-mininet bash
python3 /app/mininet_scripts/migration_phases.py --all --no-cli
```
