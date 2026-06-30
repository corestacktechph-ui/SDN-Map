# Client Review Response — Action Items & Status

## Items Addressed Today

### ✓ 1. OSPF Configuration (CS ↔ DS)

**Status:** Implemented and verified in `traditional_topology_routed.py`

- FRR (zebra + ospfd) running on all CS and DS switches
- Point-to-point /30 links between CS1/CS2 and all DS switches
- Inter-VLAN routing goes through OSPF via the core layer
- Verified: 8/8 cross-block connectivity tests pass via OSPF L3 routing

---

### ✓ 2. VRRP Per-VLAN (Corrected)

**Status:** Implemented

The VRRP configs now follow the correct per-VLAN design:

| VLAN | Description | Network | DS1 IP | DS2 IP | Virtual IP (Gateway) | Configured In |
|------|-------------|---------|--------|--------|---------------------|---------------|
| 5 | Management | 10.0.0.0/24 | 10.0.0.252 | 10.0.0.253 | 10.0.0.254 | CS1 and CS2 (see note below) |
| 10 | Finance Users | 10.1.0.0/22 | 10.1.3.252 | 10.1.3.253 | 10.1.3.254 | DS_A1 and DS_A2 |
| 20 | HR Users | 10.1.4.0/22 | 10.1.7.252 | 10.1.7.253 | 10.1.7.254 | DS_B1 and DS_B2 |
| 30 | IT Users | 10.1.8.0/22 | 10.1.11.252 | 10.1.11.253 | 10.1.11.254 | DS_B1 and DS_B2 |
| 40 | Compliance Users | 10.1.12.0/22 | 10.1.15.252 | 10.1.15.253 | 10.1.15.254 | DS_A1 and DS_A2 |
| 50 | Corporate Affairs | 10.1.16.0/22 | 10.1.19.252 | 10.1.19.253 | 10.1.19.254 | DS_C1 and DS_C2 |
| 60 | Training Users | 10.1.20.0/22 | 10.1.23.252 | 10.1.23.253 | 10.1.23.254 | DS_C1 and DS_C2 |
| 110 | Guest Users A | 10.2.0.0/24 | 10.2.0.252 | 10.2.0.253 | 10.2.0.254 | DS_A1 and DS_A2 |
| 120 | Guest Users B | 10.2.1.0/24 | 10.2.1.252 | 10.2.1.253 | 10.2.1.254 | DS_B1 and DS_B2 |
| 130 | Guest Users C | 10.2.2.0/24 | 10.2.2.252 | 10.2.2.253 | 10.2.2.254 | DS_C1 and DS_C2 |
| 91 | Finance Services | 10.3.0.0/28 | 10.3.0.12 | 10.3.0.13 | 10.3.0.14 | DS_S1 and DS_S2 |
| 92 | HR Services | 10.3.0.16/28 | 10.3.0.28 | 10.3.0.29 | 10.3.0.30 | DS_S1 and DS_S2 |
| 93 | IT Services | 10.3.0.32/28 | 10.3.0.44 | 10.3.0.45 | 10.3.0.46 | DS_S1 and DS_S2 |
| 94 | Collab Services | 10.3.0.48/28 | 10.3.0.60 | 10.3.0.61 | 10.3.0.62 | DS_S1 and DS_S2 |

**VLAN 5 (Management) Recommendation:**
Since VLAN 5 is for switch management (not host traffic), the VRRP gateway should be hosted on the **core switches (CS1/CS2)** because all managed devices (DS, AS) already have uplinks to core. CS1 = master (10.0.0.252), CS2 = backup (10.0.0.253), VIP = 10.0.0.254.

---

### ✓ 3. Cross-Block Links Removed

**Status:** Fixed in ALL scripts

Removed from:
- `traditional_topology.py`
- `sdn_topology.py`
- `migration_phases.py`
- `failover_testing.py`
- `scalability_test.py`

**Correct link topology now:**
```
CS ↔ CS          (core interconnect)
CS ↔ DS          (core to distribution — OSPF routed)
DS ↔ DS          (intra-block peer only, e.g., DS_A1 ↔ DS_A2)
DS ↔ AS          (distribution to access)
AS ↔ hosts       (access to end devices)
CS ↔ EdgeRtr     (core to edge)
EdgeRtr ↔ ISP    (edge to ISP)
ISP ↔ INET       (ISP to internet)
```

No direct links between blocks. Cross-block = always through CS1/CS2.

---

### Items Still To Be Addressed

### 4. controller_resilience_test.py — Updates Needed

**Action items:**
- Change latency ping count from 5 to 10
- Add the following test pairs:

```python
('h1', 'INET', 'Internal host to Internet'),
('h1', 'monitor1', 'VLAN 10 host to enterprise services'),
('h4', 'monitor1', 'VLAN 40 host to enterprise services'),
('h10', 'monitor1', 'VLAN 20 host to enterprise services'),
('h13', 'monitor1', 'VLAN 30 host to enterprise services'),
('h19', 'monitor1', 'VLAN 50 host to enterprise services'),
('h22', 'monitor1', 'VLAN 60 host to enterprise services'),
('h7', 'INET', 'VLAN 110 to Internet'),
('h16', 'INET', 'VLAN 120 to Internet'),
('h25', 'INET', 'VLAN 130 to Internet'),
```

**Status:** Will implement now.

---

### 5. diag.py — Wrong IP Reference

**Issue:** `print("=== ping h1 -> ERPSrv (10.1.91.10) ===")` is wrong. ERP is at 10.3.0.1.

**Status:** Will fix now.

---

### 6. failover_testing.py — Additional Scenarios Needed

**Add:**
- DS failover: All links for DS_A1 down → traffic reroutes to DS_A2 (replicate for all DS pairs)
- AS failover: Replicate AS_A1 scenario for AS_B1 and AS_C1

**Status:** Will implement now.

---

### 7. scalability_test.py — Cross-Block Links

**Issue:** Still has cross-block links in the ScalableTopo class.

**Status:** Will fix now.

---

### 8. ACL Configuration for Traditional Network

**Question from client:** Where is the ACL configuration for traditional?

**Answer:** There is currently no explicit ACL enforcement in the traditional topology. In the traditional design, ACLs would typically be configured as:
- Extended ACLs on distribution switch interfaces (DS level)
- Applied inbound on VLAN SVIs to restrict inter-VLAN traffic
- Example: Guest VLANs (110/120/130) blocked from reaching service VLANs (91-94)

**Recommendation:** Create ACL rules as `iptables` rules on the distribution routers in the Mininet simulation, since FRR doesn't natively handle ACLs. This demonstrates the distributed management burden of traditional networks (per-switch ACL config) vs SDN's centralized flow-based ACLs.

---

### 9. scripts/tests/ — Host Test Configuration

**Question:** What hosts are tested in `scripts/tests/`?

**Answer:** Will review and document the test host configuration in those scripts.

---

### 10. Additional Test Pairs for All Scripts

The following test pairs will be added to all relevant scripts (failover, migration, VLAN isolation, etc.) to ensure all VLANs are represented:

```python
# Services access (all VLANs → enterprise services)
('h1', 'monitor1', 'VLAN 10 host to enterprise services'),
('h4', 'monitor1', 'VLAN 40 host to enterprise services'),
('h10', 'monitor1', 'VLAN 20 host to enterprise services'),
('h13', 'monitor1', 'VLAN 30 host to enterprise services'),
('h19', 'monitor1', 'VLAN 50 host to enterprise services'),
('h22', 'monitor1', 'VLAN 60 host to enterprise services'),

# Internet access
('h1', 'INET', 'Internal host to Internet'),
('h7', 'INET', 'VLAN 110 (Guest A) to Internet'),
('h16', 'INET', 'VLAN 120 (Guest B) to Internet'),
('h25', 'INET', 'VLAN 130 (Guest C) to Internet'),
```

**Status:** Will implement now.
