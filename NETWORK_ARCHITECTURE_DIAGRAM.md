# 🌐 NETWORK ARCHITECTURE DIAGRAM

## Complete Enterprise Hierarchical LAN Architecture

---

## 📊 TOPOLOGY OVERVIEW

```
                            INTERNET (198.51.100.100)
                                      │
                                    [ISP]
                                      │
                                   [EDGE]
                                      │
                        ┌─────────────┴─────────────┐
                        │                           │
                    ┌──[CS1]◄──────────────────►[CS2]──┐
                    │   │ CORE LAYER (OSPF+VRRP)  │   │
                    │   │                          │   │
    ┌───────────────┼───┼───────┬──────────────┬──┼───┼───────────────┐
    │               │   │       │              │  │   │               │
  [DS_A1]◄─────►[DS_A2]│     [DS_B1]◄─────►[DS_B2] [DS_C1]◄─────►[DS_C2] [DS_S1]◄─────►[DS_S2]
    │               │   │       │              │  │   │               │      │           │
    │   BLOCK A     │   │   BLOCK B            │  │  BLOCK C          │   SERVICES      │
    │  (Finance &   │   │   (HR & IT)          │  │ (Corp & Train)    │   (All Svcs)    │
    │  Compliance)  │   │                      │  │                   │                 │
    │               │   │                      │  │                   │                 │
    └───────┬───────┘   └───────┬──────────────┘  └───────┬───────────┘      ┌──────┴──────┐
            │                   │                          │                   │             │
         [AS_A1]             [AS_B1]                    [AS_C1]             [AS_S1]      [AS_S1]
    ACCESS LAYER            ACCESS LAYER               ACCESS LAYER        ACCESS LAYER
            │                   │                          │                   │
    ┌───────┴─────┐     ┌───────┴─────┐          ┌───────┴─────┐     ┌───────┴─────┐
    │             │     │             │          │             │     │             │
   h1-h9         ...   h10-h18       ...       h19-h27       ...   erp1-dhcp1    ...
  (9 hosts)           (9 hosts)               (9 hosts)          (6 services)
```

---

## 🏢 LAYER BREAKDOWN

### **CORE LAYER** (Redundancy & Routing)
- **CS1** - Core Switch 1 (Master)
- **CS2** - Core Switch 2 (Backup)
- **Features:** OSPF dynamic routing, VRRP failover
- **Links:** 1 Gbps interconnect
- **Purpose:** High-speed backbone, internet gateway

---

### **DISTRIBUTION LAYER** (VLAN Routing & Aggregation)

#### Block A - Finance & Compliance
- **DS_A1** / **DS_A2** (VRRP pair)
- **VLANs:** 10 (Finance), 40 (Compliance), 110 (Guest A)
- **Gateways:** 10.1.3.254, 10.1.15.254, 10.2.0.254
- **Hosts:** h1-h9 (9 hosts)

#### Block B - HR & IT
- **DS_B1** / **DS_B2** (VRRP pair)
- **VLANs:** 20 (HR), 30 (IT), 120 (Guest B)
- **Gateways:** 10.1.7.254, 10.1.11.254, 10.2.1.254
- **Hosts:** h10-h18 (9 hosts)

#### Block C - Corporate & Training
- **DS_C1** / **DS_C2** (VRRP pair)
- **VLANs:** 50 (Corporate Affairs), 60 (Training), 130 (Guest C)
- **Gateways:** 10.1.19.254, 10.1.23.254, 10.2.2.254
- **Hosts:** h19-h27 (9 hosts)

#### Block S - Services
- **DS_S1** / **DS_S2** (VRRP pair)
- **VLANs:** 91 (Finance Svc), 92 (HR Svc), 93 (IT Svc), 94 (Collab Svc)
- **Gateways:** 10.3.0.14, 10.3.0.30, 10.3.0.46, 10.3.0.62
- **Services:** erp1, hr1, monitor1, it1, voip1, dhcp1

---

### **ACCESS LAYER** (Host Connection)
- **AS_A1** - Access Switch for Block A (h1-h9)
- **AS_B1** - Access Switch for Block B (h10-h18)
- **AS_C1** - Access Switch for Block C (h19-h27)
- **AS_S1** - Access Switch for Services (erp1-dhcp1)
- **Features:** VLAN assignment, port security
- **Purpose:** End-device connectivity

---

## 👥 HOST DISTRIBUTION

### Block A Hosts (AS_A1) - 9 hosts
```
┌─────────────────────────────────────────┐
│  h1, h2, h3     → VLAN 10 (Finance)     │
│  h4, h5, h6     → VLAN 40 (Compliance)  │
│  h7, h8, h9     → VLAN 110 (Guest A)    │
└─────────────────────────────────────────┘
```

### Block B Hosts (AS_B1) - 9 hosts
```
┌─────────────────────────────────────────┐
│  h10, h11, h12  → VLAN 20 (HR)          │
│  h13, h14, h15  → VLAN 30 (IT)          │
│  h16, h17, h18  → VLAN 120 (Guest B)    │
└─────────────────────────────────────────┘
```

### Block C Hosts (AS_C1) - 9 hosts
```
┌─────────────────────────────────────────┐
│  h19, h20, h21  → VLAN 50 (Corporate)   │
│  h22, h23, h24  → VLAN 60 (Training)    │
│  h25, h26, h27  → VLAN 130 (Guest C)    │
└─────────────────────────────────────────┘
```

---

## 🖥️ SERVICE SERVERS

### Service Block (AS_S1) - 6 servers
```
┌──────────────────────────────────────────────────────────┐
│  erp1      → 10.3.0.10/28  (VLAN 91) - ERP Server        │
│  hr1       → 10.3.0.20/28  (VLAN 92) - HR Server         │
│  monitor1  → 10.3.0.21/28  (VLAN 92) - Monitor Server    │
│  it1       → 10.3.0.40/28  (VLAN 93) - IT Server         │
│  voip1     → 10.3.0.50/28  (VLAN 94) - VoIP Server       │
│  dhcp1     → 10.3.0.51/28  (VLAN 94) - DHCP Server       │
└──────────────────────────────────────────────────────────┘
```

---

## 🔒 ACL RULES VISUALIZATION

### Service Access Control Matrix

```
┌──────────┬────────┬────────┬────────┬────────┬────────┬────────┐
│  VLAN    │  erp1  │  hr1   │monitor1│  it1   │ voip1  │ dhcp1  │
├──────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ 10       │   ✅   │   ✅   │   ✅   │   ❌   │   ✅   │   ✅   │
│ 20       │   ❌   │   ✅   │   ✅   │   ❌   │   ✅   │   ✅   │
│ 30       │   ❌   │   ✅   │   ✅   │   ✅   │   ✅   │   ✅   │
│ 40       │   ❌   │   ✅   │   ✅   │   ✅   │   ✅   │   ✅   │
│ 50       │   ❌   │   ✅   │   ✅   │   ❌   │   ✅   │   ✅   │
│ 60       │   ❌   │   ✅   │   ✅   │   ❌   │   ✅   │   ✅   │
│ 110      │   ❌   │   ❌   │   ❌   │   ❌   │   ❌   │   ❌   │
│ 120      │   ❌   │   ❌   │   ❌   │   ❌   │   ❌   │   ❌   │
│ 130      │   ❌   │   ❌   │   ❌   │   ❌   │   ❌   │   ❌   │
└──────────┴────────┴────────┴────────┴────────┴────────┴────────┘

✅ = ALLOWED    ❌ = BLOCKED
```

**Key Rules:**
- **erp1:** VLAN 10 ONLY (Finance-exclusive ERP system)
- **it1:** VLANs 30, 40 ONLY (IT and Compliance departments)
- **hr1, monitor1, voip1, dhcp1:** VLANs 10-60 (All user VLANs)
- **Guest VLANs (110, 120, 130):** INTERNET ONLY (no internal access)

---

## 📡 VLAN SUMMARY TABLE

| VLAN | Type | Description | Network | Gateway | Hosts | Dist. Switches |
|------|------|-------------|---------|---------|-------|----------------|
| **5** | Mgmt | Management | 10.0.0.0/24 | 10.0.0.254 | - | Not configured |
| **10** | User | Finance | 10.1.0.0/22 | 10.1.3.254 | h1-h3 | DS_A1, DS_A2 |
| **20** | User | HR | 10.1.4.0/22 | 10.1.7.254 | h10-h12 | DS_B1, DS_B2 |
| **30** | User | IT | 10.1.8.0/22 | 10.1.11.254 | h13-h15 | DS_B1, DS_B2 |
| **40** | User | Compliance | 10.1.12.0/22 | 10.1.15.254 | h4-h6 | DS_A1, DS_A2 |
| **50** | User | Corporate | 10.1.16.0/22 | 10.1.19.254 | h19-h21 | DS_C1, DS_C2 |
| **60** | User | Training | 10.1.20.0/22 | 10.1.23.254 | h22-h24 | DS_C1, DS_C2 |
| **110** | Guest | Guest A | 10.2.0.0/24 | 10.2.0.254 | h7-h9 | DS_A1, DS_A2 |
| **120** | Guest | Guest B | 10.2.1.0/24 | 10.2.1.254 | h16-h18 | DS_B1, DS_B2 |
| **130** | Guest | Guest C | 10.2.2.0/24 | 10.2.2.254 | h25-h27 | DS_C1, DS_C2 |
| **91** | Service | Finance Svc | 10.3.0.0/28 | 10.3.0.14 | erp1 | DS_S1, DS_S2 |
| **92** | Service | HR Svc | 10.3.0.16/28 | 10.3.0.30 | hr1, monitor1 | DS_S1, DS_S2 |
| **93** | Service | IT Svc | 10.3.0.32/28 | 10.3.0.46 | it1 | DS_S1, DS_S2 |
| **94** | Service | Collab Svc | 10.3.0.48/28 | 10.3.0.62 | voip1, dhcp1 | DS_S1, DS_S2 |

**Total:** 14 VLANs | 27 Hosts | 6 Services

---

## 🌍 INTERNET CONNECTIVITY

### NAT Configuration
```
Guest VLANs (110, 120, 130) ──┐
                               │
User VLANs (10-60) ────────────┼──► EdgeRtr (NAT) ──► ISP ──► INET
                               │    10.0.0.0/8 →         (198.51.100.100)
Service VLANs (91-94) ─────────┘    198.51.100.0/24
```

**Features:**
- ✅ PAT (Port Address Translation) on Edge Router
- ✅ All internal IPs (10.0.0.0/8) translated to public IP
- ✅ Guest VLANs: Internet ONLY (no internal routing)
- ✅ User/Service VLANs: Full network access + internet

---

## 🔄 REDUNDANCY & FAILOVER

### VRRP Virtual IPs (Distribution Layer)
```
Block A:  10.1.3.254  (DS_A1 = Master, DS_A2 = Backup)
         10.1.15.254 (DS_A1 = Master, DS_A2 = Backup)
         10.2.0.254  (DS_A1 = Master, DS_A2 = Backup)

Block B:  10.1.7.254  (DS_B1 = Master, DS_B2 = Backup)
         10.1.11.254 (DS_B1 = Master, DS_B2 = Backup)
         10.2.1.254  (DS_B1 = Master, DS_B2 = Backup)

Block C:  10.1.19.254 (DS_C1 = Master, DS_C2 = Backup)
         10.1.23.254 (DS_C1 = Master, DS_C2 = Backup)
         10.2.2.254  (DS_C1 = Master, DS_C2 = Backup)

Services: 10.3.0.14   (DS_S1 = Master, DS_S2 = Backup)
         10.3.0.30   (DS_S1 = Master, DS_S2 = Backup)
         10.3.0.46   (DS_S1 = Master, DS_S2 = Backup)
         10.3.0.62   (DS_S1 = Master, DS_S2 = Backup)
```

### OSPF Routing (Core Layer)
```
CS1 ◄──────OSPF Area 0──────► CS2
 │                             │
 └──────All Distribution───────┘
        Switches Learn
        Dynamic Routes
```

---

## 📊 NETWORK STATISTICS

### Total Infrastructure:
- **Switches:** 18 total
  - Core: 2 (CS1, CS2)
  - Distribution: 8 (DS_A1/A2, DS_B1/B2, DS_C1/C2, DS_S1/S2)
  - Access: 4 (AS_A1, AS_B1, AS_C1, AS_S1)
  - Internet: 2 (ISP, EdgeRtr)
  - NAT: 1 (EdgeRtr)

- **Hosts:** 27 total (h1-h27)
  - User hosts: 18 (VLANs 10, 20, 30, 40, 50, 60)
  - Guest hosts: 9 (VLANs 110, 120, 130)

- **Services:** 6 servers
  - Application: 5 (erp1, hr1, monitor1, it1, voip1)
  - Infrastructure: 1 (dhcp1)

- **VLANs:** 14 total
  - User: 6 (10, 20, 30, 40, 50, 60)
  - Guest: 3 (110, 120, 130)
  - Service: 4 (91, 92, 93, 94)
  - Management: 1 (5 - not yet configured)

- **Links:** ~50+ network links
  - Core-Core: 1
  - Core-Distribution: 16
  - Distribution-Distribution: 8
  - Distribution-Access: 16
  - Access-Host/Service: 33
  - Internet: 4

---

## 🎯 KEY DESIGN FEATURES

### 1. **Hierarchical Design**
- Clear separation of Core/Distribution/Access layers
- Scalable and manageable structure
- Follows Cisco 3-tier best practices

### 2. **High Availability**
- VRRP on all distribution switches
- Dual-homed access switches
- OSPF for dynamic route convergence

### 3. **Security Segmentation**
- 14 VLANs for traffic isolation
- ACL-based service access control
- Guest VLAN isolation (internet-only)

### 4. **Load Distribution**
- 4 blocks evenly distribute 27 hosts
- Redundant paths for failover
- QoS for traffic prioritization

### 5. **Service Isolation**
- Dedicated service VLANs (91-94)
- Granular ACL rules per service
- Separate from user traffic

---

## 📈 COMPARISON: TRADITIONAL vs SDN

### Same Topology, Different Control Plane:

**Traditional:**
- Distributed control (OSPF, VRRP on switches)
- STP for loop prevention
- Manual configuration per switch
- Convergence time: 5-30 seconds

**SDN:**
- Centralized control (Ryu Controller)
- OpenFlow for flow management
- Programmatic configuration via API
- Convergence time: 1-3 seconds

**Both use IDENTICAL physical topology above!**

---

## 🎓 FOR THESIS DEFENSE

### Use This Diagram To:
1. ✅ Explain 3-tier hierarchical design
2. ✅ Show VLAN segmentation strategy
3. ✅ Demonstrate ACL implementation
4. ✅ Illustrate redundancy mechanisms
5. ✅ Compare Traditional vs SDN control planes

**This is your network's "blueprint" for the panel! 📐**

---

**Document Version:** 1.0  
**Last Updated:** June 25, 2026  
**Status:** ✅ Ready for Presentation

## SDN ARCHITECTURE — CONTROL AND DATA PLANE SEPARATION

### Control Plane (Ryu Controller)

```
                    ┌────────────────────────────────────┐
                    │      Application Plane             │
                    │ QoS • ACL • VN • Monitoring        │
                    └────────────────────────────────────┘
                                   │
                    ┌────────────────────────────────────┐
                    │      Ryu SDN Controller            │
                    │ VRF Manager • Policy Engine        │
                    │ Path Computation • Flow Installer  │
                    │ VN Mapper • QoS Manager            │
                    └────────────────────────────────────┘
                                   │
==================== CONTROL PLANE ============================
                                   │
==================== DATA PLANE ===============================

          SDN Fabric Core (CS1, CS2)
               │
        Fabric Nodes (DS_A1–DS_S2)
               │
        Fabric Edge Switches (AS_A1, AS_B1, AS_C1, AS_S1)
               │
             End Hosts
```

### VRF Segmentation

| VRF | Virtual Networks | Purpose |
|-----|-----------------|---------|
| VRF_USERS | VN_FINANCE, VN_COMPLIANCE, VN_HR, VN_IT, VN_CORPORATE, VN_TRAINING | Isolates user traffic per department |
| VRF_GUEST | VN_GUESTA, VN_GUESTB, VN_GUESTC | Guest internet-only access |
| VRF_SERVICES | VN_ERP, VN_HR, VN_IT, VN_COLLAB | Critical service isolation |
| VRF_MGMT | VN_MGMT | Management plane isolation |

### VLAN-to-Virtual Network Mapping

| VLAN | Purpose | Virtual Network | VRF |
|------|---------|-----------------|-----|
| 10 | Finance | VN_FINANCE | VRF_USERS |
| 20 | HR | VN_HR | VRF_USERS |
| 30 | IT | VN_IT | VRF_USERS |
| 40 | Compliance | VN_COMPLIANCE | VRF_USERS |
| 50 | Corporate Affairs | VN_CORPORATE | VRF_USERS |
| 60 | Training | VN_TRAINING | VRF_USERS |
| 91 | ERP | VN_ERP | VRF_SERVICES |
| 92 | HR Services | VN_HR | VRF_SERVICES |
| 93 | IT Services | VN_IT | VRF_SERVICES |
| 94 | Collaboration | VN_COLLAB | VRF_SERVICES |
| 110 | Guest A | VN_GUESTA | VRF_GUEST |
| 120 | Guest B | VN_GUESTB | VRF_GUEST |
| 130 | Guest C | VN_GUESTC | VRF_GUEST |
| 5 | Management | VN_MGMT | VRF_MGMT |

### QoS Queue Design

| Queue | Priority | Traffic | Bandwidth |
|-------|----------|---------|-----------|
| Queue 1 | Highest | VoIP (VLAN 94) | 20% |
| Queue 2 | High | ERP (VLAN 91) | 20% |
| Queue 3 | Medium | HR/IT (VLAN 92, 93) | 30% |
| Queue 4 | Normal | Users (VLAN 10-60) | 25% |
| Queue 5 | Lowest | Guests (VLAN 110-130) | 5% |

### Traffic Flow: Traditional vs SDN

**Traditional:** h19 → ERP

Each hop independently routes and ACL-checks:

```
h19 → AS_C1 → DS_C1 → CS1 → DS_S1 → AS_S1 → ERP
```

**SDN First Packet:** Controller computes path and installs flows end-to-end.

**SDN Subsequent Packets:** Pure data-plane forwarding at wire speed — no controller involvement.
