# 📘 COMPLETE TECHNICAL DOCUMENTATION

**SDN Migration Analysis Platform**  
**Version:** 1.0.0  
**Date:** June 25, 2026  
**Author:** Amira Capstone Research Team

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Installation & Setup](#installation--setup)
5. [Database Schema](#database-schema)
6. [API Documentation](#api-documentation)
7. [Frontend Components](#frontend-components)
8. [Network Simulation](#network-simulation)
9. [Test Scripts](#test-scripts)
10. [Authentication & Security](#authentication--security)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)
13. [Development Guidelines](#development-guidelines)
14. [Performance Optimization](#performance-optimization)
15. [Testing Strategy](#testing-strategy)

---

## 1. SYSTEM OVERVIEW

### 1.1 Purpose

The SDN Migration Analysis Platform is a comprehensive web-based system designed to:
- Compare Traditional Hierarchical LAN with Software-Defined Networking (SDN)
- Provide real-time network visualization and monitoring
- Execute automated performance tests
- Generate statistical analysis and reports
- Support academic research and thesis defense

### 1.2 Key Features

**Network Simulation:**
- Traditional network with OSPF + VRRP
- SDN network with Ryu Controller
- 27 hosts across 14 VLANs
- 6 service servers with ACL enforcement

**Testing Framework:**
- OSPF/VRRP validation
- Latency testing (20-ping tests)
- Service availability checks
- ACL enforcement validation
- Throughput measurement
- Jitter analysis

**Web Interface:**
- Interactive network topology visualization (ReactFlow)
- Real-time monitoring dashboard
- Statistical analysis with T-tests and p-values
- PDF report generation
- Dark mode theme
- User authentication and role-based access

### 1.3 System Requirements

**Hardware:**
- CPU: 4+ cores recommended
- RAM: 8GB minimum, 16GB recommended
- Storage: 20GB free space
- Network: Internet connection for package installation

**Software:**
- OS: Ubuntu 22.04+ (for Mininet) or Windows 10+ (with Docker)
- Node.js: 18.x or higher
- Python: 3.8 or higher
- Docker: 20.10+ (optional, for containerized deployment)

---

## 2. ARCHITECTURE

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  Web Browser (Chrome, Firefox, Edge)                    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS/HTTP
                       ▼
┌─────────────────────────────────────────────────────────┐
│                PRESENTATION LAYER                        │
│  Next.js 14 + React 18 + TypeScript                     │
│  - Server-Side Rendering (SSR)                          │
│  - Static Site Generation (SSG)                         │
│  - Client-Side Rendering (CSR)                          │
└──────────────────────┬──────────────────────────────────┘
                       │ Internal API Calls
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  API LAYER                               │
│  Next.js Route Handlers (App Router)                    │
│  - RESTful API endpoints                                │
│  - JSON responses                                       │
│  - NextAuth.js middleware                               │
└──────────────────────┬──────────────────────────────────┘
                       │ Prisma Client
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  DATA LAYER                              │
│  SQLite Database + Prisma ORM                           │
│  - User management                                      │
│  - Test results storage                                 │
│  - Network topology data                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              NETWORK SIMULATION LAYER                    │
│  Mininet + Open vSwitch + Ryu Controller                │
│  - Virtual network topology                             │
│  - Test script execution                                │
│  - Performance measurement                              │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Application Architecture (MVC Pattern)

```
MODEL (Data Layer)
├── Prisma Schema (prisma/schema.prisma)
├── Database Models: User, Topology, Test, Result, etc.
└── Business Logic in API routes

VIEW (Presentation Layer)
├── React Components (src/components/)
├── Page Components (src/app/)
├── UI Components (ShadCN UI)
└── Styling (Tailwind CSS)

CONTROLLER (API Layer)
├── API Routes (src/app/api/)
├── Request Handlers
├── Response Formatters
└── Middleware (Authentication, Validation)
```

### 2.3 Data Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  React   │────▶│   API    │────▶│ Database │
│  Action  │     │Component │     │  Route   │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                       │                 │                 │
                       │                 │                 │
                       ▼                 ▼                 ▼
                 UI Updates        Business Logic    Data Storage
                 Re-render         Validation        Persistence
```

### 2.4 Component Hierarchy

```
App (Root)
│
├── Layout
│   ├── Header (Navigation, User Menu)
│   ├── Sidebar (Menu Items)
│   └── Footer
│
├── Pages
│   ├── Login/Register (Auth)
│   ├── Dashboard (Overview)
│   ├── Analytics (5 Advanced Features)
│   │   ├── NetworkTopologyVisualization
│   │   ├── RealTimeMonitor
│   │   ├── StatisticalAnalysis
│   │   ├── PDFReportGenerator
│   │   └── ThemeToggle (Dark Mode)
│   ├── Traditional Network
│   ├── SDN Network
│   ├── Testing Center
│   └── Reports
│
└── Shared Components
    ├── UI Components (Button, Card, Dialog)
    ├── Charts (Recharts)
    └── Forms (React Hook Form)
```

---

## 3. TECHNOLOGY STACK

### 3.1 Frontend Technologies

**Framework & Library:**

- **Next.js 14.2.3** - React framework with SSR/SSG
- **React 18.3.1** - UI library
- **TypeScript 5.x** - Type safety

**State Management:**
- **React Hooks** - useState, useEffect, useContext
- **React Query** - Server state management (optional)

**Styling:**
- **Tailwind CSS 3.4.x** - Utility-first CSS framework
- **ShadCN UI** - Pre-built accessible components
- **next-themes** - Dark mode support

**Visualization:**
- **ReactFlow 11.x** - Interactive network diagrams
- **Recharts 2.x** - Charts and graphs
- **Cytoscape.js** - Alternative topology visualization

**PDF Generation:**
- **jsPDF 2.x** - PDF creation
- **jspdf-autotable** - Table formatting

**Forms:**
- **React Hook Form** - Form validation
- **Zod** - Schema validation

### 3.2 Backend Technologies

**Framework:**
- **Next.js API Routes** - Serverless functions
- **Node.js 18+** - Runtime environment

**Database:**
- **SQLite** - Development database
- **Prisma 5.x** - ORM and type-safe queries
- **PostgreSQL** - Production (optional)

**Authentication:**
- **NextAuth.js 4.x** - Authentication framework
- **bcrypt** - Password hashing
- **JWT** - Token-based auth

### 3.3 Network Simulation

**Core Tools:**
- **Mininet 2.3.0+** - Network emulator
- **Open vSwitch 2.17+** - Virtual switch
- **Ryu Controller 4.34+** - SDN controller
- **Python 3.8+** - Scripting language

**Testing Tools:**
- **ping** - Latency measurement
- **iPerf3** - Throughput testing
- **Wireshark** - Packet analysis (optional)

### 3.4 Development Tools

**Package Manager:**
- **npm 9.x** or **yarn 1.22+**

**Version Control:**
- **Git** - Source control
- **GitHub/GitLab** - Repository hosting

**Code Quality:**
- **ESLint** - JavaScript linting
- **Prettier** - Code formatting
- **TypeScript** - Static type checking

**Containerization:**
- **Docker 20.10+** - Containerization
- **Docker Compose** - Multi-container orchestration

---

## 4. INSTALLATION & SETUP

### 4.1 Prerequisites Installation

#### On Ubuntu (Linux):

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Mininet
sudo apt install -y mininet

# Install Open vSwitch
sudo apt install -y openvswitch-switch

# Install Python and pip
sudo apt install -y python3 python3-pip

# Install Ryu Controller
pip3 install ryu

# Install iPerf3
sudo apt install -y iperf3
```

#### On Windows:

```powershell
# Install Node.js from https://nodejs.org/

# Install Docker Desktop from https://www.docker.com/products/docker-desktop

# Install Python from https://www.python.org/

# Clone repository
git clone <repository-url>
cd amira-capstone
```

### 4.2 Project Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd amira-capstone

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env

# Edit .env file with your configuration:
# DATABASE_URL="file:./dev.db"
# NEXTAUTH_SECRET="your-secret-key-here"
# NEXTAUTH_URL="http://localhost:3000"

# 4. Generate Prisma client
npx prisma generate

# 5. Push database schema
npx prisma db push

# 6. Seed database
npm run db:seed

# 7. Start development server
npm run dev
```

### 4.3 Environment Variables

Create `.env` file in project root:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_SECRET="generate-a-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Production Database
# DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Optional: Email Configuration (for password reset)
# EMAIL_SERVER="smtp://user:password@smtp.example.com:587"
# EMAIL_FROM="noreply@example.com"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 4.4 Database Migration

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Open Prisma Studio (GUI)
npx prisma studio
```

---

## 5. DATABASE SCHEMA

### 5.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │       │   Topology   │       │     Test     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ email        │       │ name         │       │ name         │
│ password     │       │ type         │◄──────│ topologyId   │
│ name         │       │ description  │       │ type         │
│ role         │       │ isActive     │       │ status       │
│ createdAt    │       │ userId (FK)  │       │ userId (FK)  │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │
       │ 1:N                  │ 1:N                  │ 1:N
       │                      │                      │
       └──────────────────────┴──────────────────────┘
                              │
                              │ 1:N
                              ▼
                    ┌──────────────────┐
                    │   TestResult     │
                    ├──────────────────┤
                    │ id (PK)          │
                    │ testId (FK)      │
                    │ topology         │
                    │ latency          │
                    │ throughput       │
                    │ packetLoss       │
                    │ jitter           │
                    │ timestamp        │
                    └──────────────────┘
```

### 5.2 Schema Definition (Prisma)

**File:** `prisma/schema.prisma`

```prisma
// User model
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  role      Role     @default(RESEARCHER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  topologies Topology[]
  tests      Test[]
  reports    Report[]
}

enum Role {
  ADMIN
  RESEARCHER
  PANEL
}

// Topology model
model Topology {
  id          String   @id @default(cuid())
  name        String
  type        TopologyType
  description String?
  config      Json?
  isActive    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tests       Test[]
  devices     Device[]
}

enum TopologyType {
  TRADITIONAL
  SDN
}

// Device model (switches, hosts, servers)
model Device {
  id          String   @id @default(cuid())
  name        String
  type        DeviceType
  ipAddress   String?
  macAddress  String?
  vlan        Int?
  status      String   @default("UNKNOWN")
  config      Json?
  
  topologyId  String
  topology    Topology @relation(fields: [topologyId], references: [id], onDelete: Cascade)
}

enum DeviceType {
  SWITCH
  ROUTER
  HOST
  SERVER
  CONTROLLER
}

// Test model
model Test {
  id          String   @id @default(cuid())
  name        String
  type        TestType
  description String?
  status      TestStatus @default(PENDING)
  startTime   DateTime?
  endTime     DateTime?
  createdAt   DateTime @default(now())
  
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  topologyId  String
  topology    Topology @relation(fields: [topologyId], references: [id], onDelete: Cascade)
  
  results     TestResult[]
}

enum TestType {
  PING
  IPERF
  JITTER
  FAILOVER
  VALIDATION
  LATENCY
  SERVICE
}

enum TestStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

// TestResult model
model TestResult {
  id          String   @id @default(cuid())
  testId      String
  test        Test     @relation(fields: [testId], references: [id], onDelete: Cascade)
  
  topology    String   // "TRADITIONAL" or "SDN"
  metric      String   // "latency", "throughput", etc.
  value       Float
  unit        String   // "ms", "Mbps", "%"
  source      String?  // Source host
  destination String?  // Destination host
  timestamp   DateTime @default(now())
  
  metadata    Json?    // Additional test-specific data
}

// ComparisonResult model (for Traditional vs SDN)
model ComparisonResult {
  id                  String   @id @default(cuid())
  traditionalTestId   String
  sdnTestId           String
  
  metric              String
  traditionalValue    Float
  sdnValue            Float
  improvementPercent  Float
  statistically       Boolean  @default(false)
  pValue              Float?
  
  createdAt           DateTime @default(now())
  
  @@unique([traditionalTestId, sdnTestId])
}

// Report model
model Report {
  id          String   @id @default(cuid())
  title       String
  type        String   // "PDF", "EXCEL", "CSV"
  content     Bytes?   // File content
  filePath    String?  // Or file path
  createdAt   DateTime @default(now())
  
  userId      String
  user        User     @relation(fields: [userId], references: [id])
}
```

### 5.3 Database Queries (Examples)

**Create User:**
```typescript
const user = await prisma.user.create({
  data: {
    email: "user@example.com",
    password: hashedPassword,
    name: "John Doe",
    role: "RESEARCHER"
  }
})
```

**Find User by Email:**
```typescript
const user = await prisma.user.findUnique({
  where: { email: "user@example.com" }
})
```

**Create Test with Results:**
```typescript
const test = await prisma.test.create({
  data: {
    name: "Latency Test",
    type: "LATENCY",
    userId: user.id,
    topologyId: topology.id,
    status: "COMPLETED",
    results: {
      create: [
        { topology: "TRADITIONAL", metric: "latency", value: 25.5, unit: "ms" },
        { topology: "SDN", metric: "latency", value: 12.3, unit: "ms" }
      ]
    }
  },
  include: {
    results: true
  }
})
```

**Get Test Results with Comparison:**
```typescript
const results = await prisma.testResult.groupBy({
  by: ['topology', 'metric'],
  _avg: {
    value: true
  },
  where: {
    testId: test.id
  }
})
```

---

## 6. API DOCUMENTATION

### 6.1 Authentication API

**POST `/api/auth/register`**

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "role": "RESEARCHER"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "clxxxxx",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "RESEARCHER"
  }
}
```

**POST `/api/auth/[...nextauth]`**

Login endpoint (NextAuth.js).

**Request:**
```json
{
  "email": "admin@amira-capstone.com",
  "password": "admin123"
}
```

**Response:**
Sets session cookie and redirects to dashboard.

---

### 6.2 Topology API

**GET `/api/topology`**

Get all topologies.

**Query Parameters:**
- `type` (optional): "TRADITIONAL" or "SDN"
- `active` (optional): "true" or "false"

**Response (200):**
```json
{
  "topologies": [
    {
      "id": "clxxxxx",
      "name": "Enterprise Network - Traditional",
      "type": "TRADITIONAL",
      "isActive": true,
      "deviceCount": 51,
      "createdAt": "2026-06-25T10:00:00Z"
    }
  ]
}
```

**POST `/api/topology`**

Create new topology.

**Request:**
```json
{
  "name": "My Custom Topology",
  "type": "SDN",
  "description": "Custom SDN topology for testing",
  "config": {
    "hosts": 27,
    "switches": 18,
    "vlans": 14
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "topology": {
    "id": "clxxxxx",
    "name": "My Custom Topology",
    "type": "SDN"
  }
}
```

**PUT `/api/topology?id=clxxxxx`**

Update topology.

**Request:**
```json
{
  "isActive": true
}
```

**Response (200):**
```json
{
  "success": true,
  "topology": {
    "id": "clxxxxx",
    "isActive": true
  }
}
```

**DELETE `/api/topology?id=clxxxxx`**

Delete topology.

**Response (200):**
```json
{
  "success": true,
  "message": "Topology deleted successfully"
}
```

---

### 6.3 Test API

**GET `/api/tests`**

Get all tests.

**Query Parameters:**
- `type` (optional): "PING", "IPERF", "LATENCY", etc.
- `status` (optional): "PENDING", "RUNNING", "COMPLETED", "FAILED"
- `limit` (optional): Number of results (default: 50)

**Response (200):**
```json
{
  "tests": [
    {
      "id": "clxxxxx",
      "name": "Latency Test - Traditional",
      "type": "LATENCY",
      "status": "COMPLETED",
      "createdAt": "2026-06-25T10:00:00Z",
      "resultCount": 27
    }
  ],
  "total": 150
}
```

**POST `/api/tests`**

Create new test.

**Request:**
```json
{
  "name": "Throughput Test",
  "type": "IPERF",
  "topologyId": "clxxxxx",
  "config": {
    "duration": 30,
    "protocol": "TCP"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "test": {
    "id": "clxxxxx",
    "name": "Throughput Test",
    "status": "PENDING"
  }
}
```

**GET `/api/results`**

Get test results.

**Query Parameters:**
- `testId` (optional): Filter by test ID
- `topology` (optional): "TRADITIONAL" or "SDN"
- `metric` (optional): "latency", "throughput", etc.

**Response (200):**
```json
{
  "results": [
    {
      "id": "clxxxxx",
      "testId": "clxxxxx",
      "topology": "TRADITIONAL",
      "metric": "latency",
      "value": 25.5,
      "unit": "ms",
      "source": "h1",
      "destination": "INET",
      "timestamp": "2026-06-25T10:05:00Z"
    }
  ]
}
```

**POST `/api/results`**

Save test results.

**Request:**
```json
{
  "testId": "clxxxxx",
  "results": [
    {
      "topology": "TRADITIONAL",
      "metric": "latency",
      "value": 25.5,
      "unit": "ms",
      "source": "h1",
      "destination": "INET"
    }
  ]
}
```

---

### 6.4 Comparison API

**GET `/api/comparison`**

Get performance comparison (Traditional vs SDN).

**Query Parameters:**
- `metric` (optional): Filter by specific metric
- `limit` (optional): Number of results

**Response (200):**
```json
{
  "comparisons": [
    {
      "metric": "latency",
      "traditional": {
        "avg": 25.5,
        "min": 18.2,
        "max": 32.1,
        "stdDev": 4.2
      },
      "sdn": {
        "avg": 12.3,
        "min": 8.5,
        "max": 15.8,
        "stdDev": 2.1
      },
      "improvement": 51.8,
      "pValue": 0.0023,
      "significant": true
    }
  ]
}
```

**POST `/api/comparison`**

Create new comparison.

**Request:**
```json
{
  "traditionalTestId": "clxxxxx",
  "sdnTestId": "clyyyyy",
  "metrics": ["latency", "throughput", "packetLoss"]
}
```

---

### 6.5 Monitoring API

**GET `/api/monitoring`**

Get real-time network metrics.

**Response (200):**
```json
{
  "timestamp": "2026-06-25T10:00:00Z",
  "traditional": {
    "latency": 25.5,
    "throughput": 850,
    "packetLoss": 0.8,
    "activeConnections": 142
  },
  "sdn": {
    "latency": 12.3,
    "throughput": 980,
    "packetLoss": 0.2,
    "activeFlows": 87,
    "controllerStatus": "ONLINE"
  }
}
```

---

### 6.6 Error Responses

All API endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid request",
  "message": "Missing required field: email"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Please login to access this resource"
}
```

**403 Forbidden:**
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "error": "Not found",
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## 7. FRONTEND COMPONENTS

### 7.1 Component Structure

```
src/components/
├── ui/                           # ShadCN UI primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   └── ...
├── dashboard/                    # Dashboard components
│   ├── MetricsCard.tsx
│   ├── StatsOverview.tsx
│   └── QuickActions.tsx
├── network/                      # Network visualization
│   ├── NetworkTopologyVisualization.tsx
│   ├── TopologyNode.tsx
│   └── TopologyEdge.tsx
├── analytics/                    # Analytics components
│   ├── StatisticalAnalysis.tsx
│   ├── ComparisonChart.tsx
│   └── PerformanceTable.tsx
├── monitoring/                   # Real-time monitoring
│   ├── RealTimeMonitor.tsx
│   ├── MetricCard.tsx
│   └── LiveChart.tsx
├── reports/                      # Report generation
│   ├── PDFReportGenerator.tsx
│   ├── ReportPreview.tsx
│   └── ExportButton.tsx
├── theme/                        # Theme components
│   ├── ThemeProvider.tsx
│   └── ThemeToggle.tsx
└── shared/                       # Shared components
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    └── Pagination.tsx
```

### 7.2 Key Components

#### NetworkTopologyVisualization.tsx

Interactive network topology using ReactFlow.

**Props:**
```typescript
interface NetworkTopologyProps {
  topologyType: 'TRADITIONAL' | 'SDN';
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onNodeClick?: (node: NetworkNode) => void;
}

interface NetworkNode {
  id: string;
  type: 'host' | 'switch' | 'router' | 'controller';
  label: string;
  position: { x: number; y: number };
  data: {
    ip?: string;
    vlan?: number;
    status: 'online' | 'offline';
    metrics?: {
      latency?: number;
      throughput?: number;
    };
  };
}

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}
```

**Usage:**
```tsx
<NetworkTopologyVisualization
  topologyType="SDN"
  nodes={networkNodes}
  edges={networkEdges}
  onNodeClick={handleNodeClick}
/>
```

**Features:**
- Drag-and-drop nodes
- Zoom and pan
- Real-time metric updates
- Color-coded status indicators
- Animated control plane connections (SDN only)

#### RealTimeMonitor.tsx

Live network monitoring dashboard.

**Props:**
```typescript
interface RealTimeMonitorProps {
  updateInterval?: number; // milliseconds
  metrics: MetricDefinition[];
}

interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  threshold?: {
    warning: number;
    critical: number;
  };
}
```

**Usage:**
```tsx
<RealTimeMonitor
  updateInterval={1000}
  metrics={[
    { key: 'latency', label: 'Latency', unit: 'ms', threshold: { warning: 20, critical: 50 } },
    { key: 'throughput', label: 'Throughput', unit: 'Mbps' }
  ]}
/>
```

**Features:**
- Auto-refresh every second
- Live charts (Recharts)
- Color-coded alerts
- 20-point rolling window

#### StatisticalAnalysis.tsx

Statistical comparison with T-tests.

**Props:**
```typescript
interface StatisticalAnalysisProps {
  traditionalData: number[];
  sdnData: number[];
  metric: string;
  unit: string;
}
```

**Features:**
- T-test calculation
- P-value computation
- 95% confidence intervals
- Bar and radar charts
- Statistical significance badges

#### PDFReportGenerator.tsx

Generate professional PDF reports.

**Props:**
```typescript
interface PDFReportProps {
  data: ReportData;
  template: 'executive' | 'technical' | 'comparison';
}
```

**Usage:**
```tsx
<PDFReportGenerator
  data={reportData}
  template="executive"
  onGenerate={(pdf) => pdf.save('report.pdf')}
/>
```

**Features:**
- Multi-page layout
- Tables and charts
- Headers and footers
- Automatic page numbering

---

## 8. NETWORK SIMULATION

### 8.1 Traditional Network Topology

**File:** `scripts/mininet/traditional_topology.py`

**Architecture:**
```
              INET (198.51.100.100)
                      │
                    [ISP]
                      │
                   [EDGE] (NAT Router)
                      │
              ┌───────┴────────┐
           [CS1] ◄─VRRP─► [CS2]  (Core Layer)
              │              │
    ┌─────────┼──────────────┼──────────┐
    │         │              │          │
  [DS_A1]─[DS_A2]  [DS_B1]─[DS_B2]  [DS_C1]─[DS_C2]  [DS_S1]─[DS_S2]
    │         │      │         │      │         │      │         │
  [AS_A1]        [AS_B1]           [AS_C1]           [AS_S1]
    │             │                 │                  │
  h1-h9         h10-h18           h19-h27         erp1-dhcp1
```

**Key Features:**
- **OSPF Routing:** Dynamic route advertisement between core and distribution
- **VRRP Redundancy:** Virtual IPs on distribution layer
- **NAT:** EdgeRtr provides internet access
- **VLANs:** 14 VLANs for segmentation
- **ACLs:** Service-specific access control

**Startup:**
```bash
sudo python scripts/mininet/traditional_topology.py

# With DHCP
sudo python scripts/mininet/traditional_topology.py --dhcp

# Without CLI (background)
sudo python scripts/mininet/traditional_topology.py --no-cli
```

**Implementation Details:**

```python
class TraditionalHierarchicalTopo(Topo):
    VLAN_CONFIG = {
        10: {'subnet': '10.1.0.0/22', 'gateway': '10.1.3.254'},
        # ... 14 VLANs total
    }
    
    HOST_VLAN_MAP = {
        'h1': 10, 'h2': 10, 'h3': 10,  # Finance
        # ... 27 hosts total
    }
    
    SERVICE_CONFIG = {
        'erp1': {'vlan': 91, 'ip': '10.3.0.10/28'},
        # ... 6 services total
    }
    
    def build(self, use_dhcp=False):
        # Create switches
        cs1 = self.addSwitch('CS1', ...)
        cs2 = self.addSwitch('CS2', ...)
        
        # Create hosts
        for hostname, vlan in self.HOST_VLAN_MAP.items():
            h = self.addHost(hostname, ip=...)
            self.addLink(access_switch, h)
        
        # Create links
        self.addLink(cs1, cs2, bw=1000, delay='1ms')
```

### 8.2 SDN Network Topology

**File:** `scripts/mininet/sdn_topology.py`

**Architecture:**
Same physical topology as Traditional, but with:
- Centralized Ryu Controller
- OpenFlow 1.3 switches
- Flow-based forwarding

**Startup:**
```bash
# Terminal 1: Start Ryu Controller
ryu-manager scripts/ryu/controller.py --ofp-tcp-listen-port 6633

# Terminal 2: Start Mininet
sudo python scripts/mininet/sdn_topology.py
```

**Controller Connection:**
```python
class SDNHierarchicalTopo(Topo):
    def build(self, use_dhcp=False):
        # Switches connect to remote controller
        cs1 = self.addSwitch('CS1', 
                           cls=OVSKernelSwitch,
                           protocols='OpenFlow13')
```

**Network Initialization:**
```python
def run(use_dhcp=False, start_cli=True):
    topo = SDNHierarchicalTopo()
    net = Mininet(
        topo=topo,
        switch=OVSKernelSwitch,
        controller=lambda name: RemoteController(
            name, ip='127.0.0.1', port=6633, protocols='OpenFlow13'
        ),
        link=TCLink
    )
    net.start()
```

### 8.3 Ryu SDN Controller

**File:** `scripts/ryu/controller.py`

**Key Functions:**

```python
from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import MAIN_DISPATCHER, set_ev_cls
from ryu.ofproto import ofproto_v1_3

class SDNController(app_manager.RyuApp):
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]
    
    def __init__(self, *args, **kwargs):
        super(SDNController, self).__init__(*args, **kwargs)
        self.mac_to_port = {}
    
    @set_ev_cls(ofp_event.EventOFPPacketIn, MAIN_DISPATCHER)
    def packet_in_handler(self, ev):
        """Handle packets from switches"""
        msg = ev.msg
        datapath = msg.datapath
        
        # Learn MAC address
        self.mac_to_port[datapath.id] = {}
        
        # Install flow rule
        self.add_flow(datapath, priority, match, actions)
    
    def add_flow(self, datapath, priority, match, actions):
        """Install flow entry in switch"""
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        
        inst = [parser.OFPInstructionActions(
            ofproto.OFPIT_APPLY_ACTIONS, actions)]
        
        mod = parser.OFPFlowMod(
            datapath=datapath,
            priority=priority,
            match=match,
            instructions=inst)
        
        datapath.send_msg(mod)
```

**Features:**
- MAC learning
- Flow table management
- Topology discovery
- Path computation
- QoS enforcement

---

## 9. TEST SCRIPTS

### 9.1 Test Script Architecture

All test scripts follow a common pattern:

```python
class TestRunner:
    def __init__(self, net):
        self.net = net
        self.results = {}
    
    def run_test(self):
        # Execute test
        pass
    
    def save_results(self, filename):
        # Save to JSON
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
```

### 9.2 Available Test Scripts

| Script | Purpose | Output |
|--------|---------|--------|
| **HNDValidationS_ACL.py** | Full network validation (OSPF, VRRP, ACL) | validation_results.json |
| **latencytest.py** | 20-ping latency tests (ACL-aware) | latency_results.json |
| **servicetest.py** | Application-level service tests | service_results.json |
| **ping_test.py** | Basic connectivity tests | ping_results.json |
| **iperf_test.py** | Throughput measurement | iperf_results.json |
| **jitter_test.py** | Jitter analysis | jitter_results.json |
| **failover_test.py** | Failover recovery time | failover_results.json |

### 9.3 Running Tests

**From Mininet CLI:**
```bash
mininet> py execfile('scripts/tests/HNDValidationS_ACL.py')
mininet> py execfile('scripts/tests/latencytest.py')
mininet> py execfile('scripts/tests/servicetest.py')
```

**Automated Test Suite:**
```bash
# Create test runner script
cat > run_all_tests.sh << 'EOF'
#!/bin/bash
echo "Running all tests..."
sudo python scripts/mininet/traditional_topology.py --no-cli &
MININET_PID=$!
sleep 10
python scripts/tests/HNDValidationS_ACL.py
python scripts/tests/latencytest.py
python scripts/tests/servicetest.py
kill $MININET_PID
echo "Tests complete!"
EOF

chmod +x run_all_tests.sh
./run_all_tests.sh
```

---

## 10. AUTHENTICATION & SECURITY

### 10.1 Authentication Flow

```
1. User submits credentials
      ↓
2. NextAuth.js receives request
      ↓
3. CredentialsProvider validates
      ↓
4. Query database for user
      ↓
5. Compare password (bcrypt)
      ↓
6. Generate JWT token
      ↓
7. Set HTTP-only cookie
      ↓
8. Redirect to dashboard
```

### 10.2 Password Hashing

```typescript
import bcrypt from 'bcrypt';

// Hash password during registration
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password during login
const isValid = await bcrypt.compare(password, user.password);
```

### 10.3 Session Management

**JWT Token Structure:**
```json
{
  "user": {
    "id": "clxxxxx",
    "email": "user@example.com",
    "role": "RESEARCHER"
  },
  "iat": 1719312000,
  "exp": 1719398400
}
```

**Session Cookie:**
- Name: `next-auth.session-token`
- HttpOnly: true
- Secure: true (production)
- SameSite: lax
- Max-Age: 30 days

### 10.4 Role-Based Access Control (RBAC)

**Permission Matrix:**

| Feature | ADMIN | RESEARCHER | PANEL |
|---------|-------|------------|-------|
| View Dashboard | ✅ | ✅ | ✅ |
| Run Tests | ✅ | ✅ | ❌ |
| Create Topology | ✅ | ✅ | ❌ |
| Delete Data | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ |
| Generate Reports | ✅ | ✅ | ✅ |

**Implementation:**
```typescript
// Middleware
export async function requireAuth(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

// Route protection
export async function GET(req: Request) {
  const session = await requireAuth(req);
  
  if (session.user.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Admin-only logic
}
```

---

## 11. DEPLOYMENT

### 11.1 Production Build

```bash
# Build application
npm run build

# Start production server
npm start

# Or with PM2
pm2 start npm --name "amira-capstone" -- start
```

### 11.2 Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./dev.db
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=https://yourdomain.com
    volumes:
      - ./prisma:/app/prisma
    restart: unless-stopped
```

### 11.3 Environment Configuration

**Production `.env`:**
```env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@db:5432/amira"
NEXTAUTH_SECRET="<production-secret>"
NEXTAUTH_URL="https://yourdomain.com"
```

---

## 12. TROUBLESHOOTING

### Common Issues and Solutions

**Issue: "Port 3000 already in use"**
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

**Issue: "Prisma Client not found"**
```bash
npx prisma generate
```

**Issue: "Database locked"**
```bash
# Close all Prisma Studio instances
# Restart application
```

**Issue: "Mininet: command not found"**
```bash
sudo apt install mininet
```

**Issue: "Ryu Controller won't start"**
```bash
pip3 install ryu
ryu-manager --version
```

---

## 13. PERFORMANCE OPTIMIZATION

### 13.1 Frontend Optimization

- **Code Splitting:** Automatic with Next.js
- **Image Optimization:** Use `next/image`
- **Lazy Loading:** Dynamic imports
- **Caching:** SWR or React Query

### 13.2 Database Optimization

- **Indexes:** Add indexes on frequently queried fields
- **Connection Pooling:** Use Prisma connection pooling
- **Query Optimization:** Use `select` to fetch only needed fields

---

## 14. APPENDICES

### 14.1 Glossary

- **SDN:** Software-Defined Networking
- **VRRP:** Virtual Router Redundancy Protocol
- **OSPF:** Open Shortest Path First
- **ACL:** Access Control List
- **JWT:** JSON Web Token
- **ORM:** Object-Relational Mapping

### 14.2 References

- Next.js Documentation: https://nextjs.org/docs
- Prisma Documentation: https://www.prisma.io/docs
- Mininet Documentation: http://mininet.org/
- Ryu Documentation: https://ryu.readthedocs.io/

---

**END OF TECHNICAL DOCUMENTATION**

**Version:** 1.0.0  
**Last Updated:** June 25, 2026  
**Maintained By:** Amira Capstone Research Team
