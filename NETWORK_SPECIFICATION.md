# 🌐 Complete Network Specification Documentation

## Network Architecture Overview

This document details the complete enterprise network architecture with VLANs, ACLs, DHCP, and service access controls.

---

## 📋 VLAN Configuration

### User VLANs

| VLAN ID | Description | Network | Gateway | DHCP Range | Distribution Switches |
|---------|-------------|---------|---------|------------|---------------------|
| 5 | Management | 10.0.0.0/24 | 10.0.0.254 | 10.0.0.51-10.0.0.240 | Management |
| 10 | Finance Users | 10.1.0.0/22 | 10.1.3.254 | 10.1.0.51-10.1.3.240 | DS_A1, DS_A2 |
| 20 | HR Users | 10.1.4.0/22 | 10.1.7.254 | 10.1.4.51-10.1.7.240 | DS_B1, DS_B2 |
| 30 | IT Users | 10.1.8.0/22 | 10.1.11.254 | 10.1.8.51-10.1.11.240 | DS_B1, DS_B2 |
| 40 | Compliance Users | 10.1.12.0/22 | 10.1.15.254 | 10.1.12.51-10.1.15.240 | DS_A1, DS_A2 |
| 50 | Corporate Affairs | 10.1.16.0/22 | 10.1.19.254 | 10.1.16.51-10.1.19.240 | DS_C1, DS_C2 |
| 60 | Training Users | 10.1.20.0/22 | 10.1.23.254 | 10.1.20.51-10.1.23.240 | DS_C1, DS_C2 |

### Guest VLANs (Internet Only)

| VLAN ID | Description | Network | Gateway | DHCP Range | Distribution Switches |
|---------|-------------|---------|---------|------------|---------------------|
| 110 | Guest Users A | 10.2.0.0/24 | 10.2.0.254 | 10.2.0.51-10.2.0.240 | DS_A1, DS_A2 |
| 120 | Guest Users B | 10.2.1.0/24 | 10.2.1.254 | 10.2.1.51-10.2.1.240 | DS_B1, DS_B2 |
| 130 | Guest Users C | 10.2.2.0/24 | 10.2.2.254 | 10.2.2.51-10.2.2.240 | DS_C1, DS_C2 |

### Service VLANs

| VLAN ID | Description | Network | Gateway | DS1 IP | DS2 IP | Distribution Switches |
|---------|-------------|---------|---------|---------|---------|---------------------|
| 91 | Finance Services | 10.3.0.0/28 | 10.3.0.14 | 10.3.0.12 | 10.3.0.13 | DS_S1, DS_S2 |
| 92 | HR Services | 10.3.0.16/28 | 10.3.0.30 | 10.3.0.28 | 10.3.0.29 | DS_S1, DS_S2 |
| 93 | IT Services | 10.3.0.32/28 | 10.3.0.46 | 10.3.0.44 | 10.3.0.45 | DS_S1, DS_S2 |
| 94 | Collab Services | 10.3.0.48/28 | 10.3.0.62 | 10.3.0.60 | 10.3.0.61 | DS_S1, DS_S2 |

---

## 🔒 Access Control Lists (ACLs)

### Service Access Rules

| Service | VLAN | IP Address | Allowed VLANs | Ports |
|---------|------|-----------|---------------|-------|
| **ERP Server** | 91 | 10.3.0.10 | **VLAN 10 ONLY** | HTTP (80), HTTPS (443) |
| **HR Server** | 92 | 10.3.0.20 | VLANs 10-60 | HTTPS (443) |
| **Monitor Server** | 92 | 10.3.0.21 | VLANs 10-60 | HTTP (80), iperf3 (5201) |
| **IT Server** | 93 | 10.3.0.40 | **VLANs 30, 40 ONLY** | HTTP (80), SNMP (161 UDP) |
| **VoIP Server** | 94 | 10.3.0.50 | VLANs 10-60 | SIP UDP (5060) |
| **DHCP Server** | 94 | 10.3.0.51 | VLANs 10-60 | DHCP (67, 68) |

### Guest VLAN Restrictions

**VLANs 110, 120, 130:**
- ✅ **ALLOW:** Internet access only
- ❌ **DENY:** All internal service access
- ❌ **DENY:** Inter-VLAN communication
- ❌ **DENY:** Access to VLANs 10-60, 91-94

---

## 🖥️ Host Assignments

### Host-to-VLAN Mapping

| Hosts | VLAN | Description | Network |
|-------|------|-------------|---------|
| h1, h2, h3 | 10 | Finance Users | 10.1.0.0/22 |
| h4, h5, h6 | 40 | Compliance Users | 10.1.12.0/22 |
| h7, h8, h9 | 110 | Guest Users A | 10.2.0.0/24 |
| h10, h11, h12 | 20 | HR Users | 10.1.4.0/22 |
| h13, h14, h15 | 30 | IT Users | 10.1.8.0/22 |
| h16, h17, h18 | 120 | Guest Users B | 10.2.1.0/24 |
| h19, h20, h21 | 50 | Corporate Affairs | 10.1.16.0/22 |
| h22, h23, h24 | 60 | Training Users | 10.1.20.0/22 |
| h25, h26, h27 | 130 | Guest Users C | 10.2.2.0/24 |

---

## 🌐 Internet Simulation

### Internet Topology

| Device | Interface | IP Address | Description |
|--------|-----------|-----------|-------------|
| **INET** | eth0 | 198.51.100.100/24 | Internet Simulator |
| **ISP** | isp-inet | 203.0.113.1/30 | ISP Router |
| **ISP** | isp-edge | 203.0.113.2/30 | ISP to Edge |
| **EDGE** | edge-isp | 203.0.113.1/30 | Edge Router |
| **EDGE** | edge-cs1 | 172.16.255.1/30 | Edge to CS1 |
| **EDGE** | edge-cs2 | 172.16.255.5/30 | Edge to CS2 |
| **CS1** | cs1-edge | 172.16.255.2/30 | CS1 to Edge |
| **CS2** | cs2-edge | 172.16.255.6/30 | CS2 to Edge |

### Core Interconnect

| Link | Network | CS1 IP | CS2 IP |
|------|---------|---------|---------|
| Core Interconnect | 172.16.0.0/30 | 172.16.0.1/30 | 172.16.0.2/30 |

---

## 🔗 Distribution Layer Links

### Block A Links (Finance & Compliance)

| Link | Network | Device A | IP A | Device B | IP B |
|------|---------|----------|------|----------|------|
| A Peer | 172.16.1.0/30 | DS_A1 | 172.16.1.1/30 | DS_A2 | 172.16.1.2/30 |
| A1 Uplink | 172.16.1.4/30 | CS1 | 172.16.1.5/30 | DS_A1 | 172.16.1.6/30 |
| A1 Backup | 172.16.1.8/30 | CS2 | 172.16.1.9/30 | DS_A1 | 172.16.1.10/30 |
| A2 Uplink | 172.16.1.12/30 | CS1 | 172.16.1.13/30 | DS_A2 | 172.16.1.14/30 |
| A2 Backup | 172.16.1.16/30 | CS2 | 172.16.1.17/30 | DS_A2 | 172.16.1.18/30 |

### Block B Links (HR & IT)

| Link | Network | Device A | IP A | Device B | IP B |
|------|---------|----------|------|----------|------|
| B Peer | 172.16.2.0/30 | DS_B1 | 172.16.2.1/30 | DS_B2 | 172.16.2.2/30 |
| B1 Uplink | 172.16.2.4/30 | CS1 | 172.16.2.5/30 | DS_B1 | 172.16.2.6/30 |
| B1 Backup | 172.16.2.8/30 | CS2 | 172.16.2.9/30 | DS_B1 | 172.16.2.10/30 |
| B2 Uplink | 172.16.2.12/30 | CS1 | 172.16.2.13/30 | DS_B2 | 172.16.2.14/30 |
| B2 Backup | 172.16.2.16/30 | CS2 | 172.16.2.17/30 | DS_B2 | 172.16.2.18/30 |

### Block C Links (Corporate & Training)

| Link | Network | Device A | IP A | Device B | IP B |
|------|---------|----------|------|----------|------|
| C Peer | 172.16.3.0/30 | DS_C1 | 172.16.3.1/30 | DS_C2 | 172.16.3.2/30 |
| C1 Uplink | 172.16.3.4/30 | CS1 | 172.16.3.5/30 | DS_C1 | 172.16.3.6/30 |
| C1 Backup | 172.16.3.8/30 | CS2 | 172.16.3.9/30 | DS_C1 | 172.16.3.10/30 |
| C2 Uplink | 172.16.3.12/30 | CS1 | 172.16.3.13/30 | DS_C2 | 172.16.3.14/30 |
| C2 Backup | 172.16.3.16/30 | CS2 | 172.16.3.17/30 | DS_C2 | 172.16.3.18/30 |

---

## 🧪 Test Suite

### Test Scripts

| Script | Purpose | Metrics Collected |
|--------|---------|-------------------|
| **HNDValidationS_ACL.py** | Full validation | OSPF, VRRP, connectivity, services, ACLs |
| **latencytest.py** | Latency measurement | RTT to INET and services |
| **servicetest.py** | Service validation | Application-level checks |
| **connectivitytest1.py** | Basic connectivity | Host-to-host, NAT, ACL validation |
| **iperf3_low.py** | Low load (9 hosts) | Baseline throughput, 5 Mbps UDP |
| **iperf3_moderate.py** | Moderate load (18 hosts) | Moderate throughput, 20 Mbps UDP |
| **iperf3_high.py** | High load (27 hosts) | Maximum throughput, 80 Mbps UDP |

### Test Scenarios

#### 1. Baseline Test
- **Connectivity:** OSPF, VRRP, Host-to-Host, Services, Internet, ACL
- **Throughput:** iperf3_low.py
- **Latency:** latencytest.py
- **Services:** servicetest.py

#### 2. Failover Test (CS and DS Redundancy)
- **Connectivity:** connectivitytest1.py
- **Throughput:** iperf3_high.py
- **Recovery Time:** Measure failover duration
- **Services:** servicetest.py

#### 3. Load Testing
- **Low:** iperf3_low.py + latencytest.py (9 hosts, 5 Mbps)
- **Moderate:** iperf3_moderate.py + latencytest.py (18 hosts, 20 Mbps)
- **High:** iperf3_high.py + latencytest.py (27 hosts, 80 Mbps)

---

## 📊 Data Collection Metrics

### Performance Metrics

| Metric | Tool | Data Collection Method |
|--------|------|----------------------|
| **Latency** | ping | RTT from ping results, Wireshark validation |
| **Throughput** | iperf3 | TCP/UDP traffic, various packet sizes |
| **Packet Loss** | iperf3 UDP | Compare sent vs received packets |
| **Jitter** | iperf3 UDP | Real-time traffic simulation |
| **Recovery Time** | ping | Gap between failure and first success |
| **Config Time** | Manual | Duration of configuration deployment |

### Load Test Hosts

#### Low Load (9 hosts @ 5 Mbps)
**To monitor1:** h1, h4, h10, h13, h19, h22  
**To INET:** h7, h16, h25

#### Moderate Load (18 hosts @ 20 Mbps)
**To monitor1:** h1, h2, h4, h5, h10, h11, h13, h14, h19, h20, h22, h23  
**To INET:** h7, h8, h16, h17, h25, h26

#### High Load (27 hosts @ 80 Mbps)
**To monitor1:** h1-h6, h10-h15, h19-h24  
**To INET:** h7-h9, h16-h18, h25-h27

---

## 🔐 ACL Implementation Matrix

### Per-Service ACL Rules

```
ERP Server (10.3.0.10):
  PERMIT: VLAN 10 → TCP 80, 443
  DENY: ALL OTHER VLANs

HR Server (10.3.0.20):
  PERMIT: VLANs 10, 20, 30, 40, 50, 60 → TCP 443
  DENY: Guest VLANs (110, 120, 130)

Monitor Server (10.3.0.21):
  PERMIT: VLANs 10, 20, 30, 40, 50, 60 → TCP 80, 5201
  DENY: Guest VLANs (110, 120, 130)

IT Server (10.3.0.40):
  PERMIT: VLANs 30, 40 → TCP 80, UDP 161
  DENY: ALL OTHER VLANs

VoIP Server (10.3.0.50):
  PERMIT: VLANs 10, 20, 30, 40, 50, 60 → UDP 5060
  DENY: Guest VLANs (110, 120, 130)

DHCP Server (10.3.0.51):
  PERMIT: VLANs 10, 20, 30, 40, 50, 60 → UDP 67, 68
  DENY: Guest VLANs (110, 120, 130)
```

### Guest VLAN Rules

```
VLANs 110, 120, 130:
  PERMIT: → Internet (198.51.100.0/24)
  DENY: → Internal Networks (10.0.0.0/8)
  DENY: → Service VLANs (91-94)
  DENY: → User VLANs (10-60)
```

---

## 📝 Implementation Notes

### VRRP Configuration
- **Master/Backup:** Configured on DS pairs
- **Virtual IPs:** Listed in VLAN table
- **Priority:** Master = 110, Backup = 100
- **Preemption:** Enabled

### OSPF Configuration
- **Area:** 0 (backbone)
- **Router IDs:** Based on device loopback
- **Networks:** All inter-switch links
- **Hello/Dead:** 10s/40s

### NAT Configuration
- **Location:** Edge Router
- **Inside:** 10.0.0.0/8, 172.16.0.0/12
- **Outside:** 198.51.100.0/24
- **Method:** PAT (Port Address Translation)

---

## 🎯 Expected Results

### Traditional Network
- **Latency:** 15-30ms average
- **Throughput:** 800-900 Mbps
- **Packet Loss:** 0.5-1.0%
- **Jitter:** 3-5ms
- **Failover:** 5-10 seconds

### SDN Network
- **Latency:** 7-15ms average (40-50% better)
- **Throughput:** 900-1000 Mbps (10-15% better)
- **Packet Loss:** 0.1-0.3% (60-70% better)
- **Jitter:** 1-2ms (60-70% better)
- **Failover:** 1-2 seconds (70-80% better)

---

**Document Version:** 1.0  
**Last Updated:** June 25, 2026  
**Status:** Production Ready
