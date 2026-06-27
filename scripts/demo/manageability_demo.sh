#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# MANAGEABILITY COMPARISON DEMO
# Shows: Adding VLAN in HND (per-switch) vs SDN (controller push)
# ═══════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════"
echo "  MANAGEABILITY COMPARISON: Add VLAN 140 (New Department)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TRADITIONAL (HND) — Per-Switch Manual"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To add VLAN 140 in a traditional network, you must SSH into"
echo "EACH switch and configure it manually. 18 switches total."
echo ""

SWITCHES="CS1 CS2 DS_A1 DS_A2 DS_B1 DS_B2 DS_C1 DS_C2 DS_S1 DS_S2 AS_A1 AS_B1 AS_C1 AS_S1 ISP EdgeRtr"
COUNT=0
START_TIME=$(date +%s)

for SW in $SWITCHES; do
    COUNT=$((COUNT + 1))
    echo "  [$COUNT/16] Configuring $SW..."
    echo "    > ssh admin@$SW"
    echo "    > configure terminal"
    echo "    > vlan 140"
    echo "    >   name NewDepartment"
    echo "    > interface vlan 140"
    echo "    >   ip address 10.1.24.254 255.255.252.0"
    echo "    > router ospf 1"
    echo "    >   network 10.1.24.0 0.0.3.255 area 0"
    echo "    > vrrp 140 ip 10.1.24.254"
    echo "    > write memory"
    echo "    > exit"
    echo ""
    sleep 0.5  # Simulate time per switch
done

END_TIME=$(date +%s)
HND_TIME=$((END_TIME - START_TIME))

echo "  ⏱  Traditional method: ~15-20 minutes real-world"
echo "  ⚠  Risk: inconsistency if you mistype on 1 of 16 switches"
echo "  ⚠  Risk: no validation until you test manually"
echo ""

# ─────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SDN — Single Controller API Call"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  In SDN, ONE API call to the controller handles everything:"
echo ""
echo '  curl -X POST http://controller:8080/api/vlan \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"vlan_id": 140, "vn_name": "VN_NEWDEPT", "vrf": "VRF_USERS"}'"'"''
echo ""

# Actually call the controller API if available
if curl -s http://localhost:8080/api/stats > /dev/null 2>&1; then
    echo "  [LIVE] Calling controller API..."
    RESULT=$(curl -s -X POST http://localhost:8080/api/vlan \
        -H "Content-Type: application/json" \
        -d '{"vlan_id": 140, "vn_name": "VN_NEWDEPT", "vrf": "VRF_USERS"}' 2>&1)
    echo "  Response: $RESULT"
else
    echo "  [SIMULATED] Controller would respond:"
    echo '  {"status": "success", "message": "VLAN 140 (VN_NEWDEPT) added to VRF_USERS. Pushed to 16 switches.", "switches_configured": 16}'
fi

echo ""
echo "  ⏱  SDN method: ~2-3 minutes (single action)"
echo "  ✓  Consistent: controller pushes identical config to ALL switches"
echo "  ✓  Validated: controller confirms each switch acknowledged"
echo "  ✓  Auditable: logged with timestamp and user"
echo ""

# ─────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  COMPARISON SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ┌────────────────┬──────────────┬──────────────┐"
echo "  │ Metric         │ Traditional  │ SDN          │"
echo "  ├────────────────┼──────────────┼──────────────┤"
echo "  │ Time           │ 15-20 min    │ 2-3 min      │"
echo "  │ Steps          │ 16 × SSH     │ 1 API call   │"
echo "  │ Risk           │ High (typos) │ Low          │"
echo "  │ Consistency    │ Manual check │ Guaranteed   │"
echo "  │ Audit trail    │ None         │ Logged       │"
echo "  │ Rollback       │ Manual       │ 1 API call   │"
echo "  └────────────────┴──────────────┴──────────────┘"
echo ""
echo "  Improvement: 85-87% faster configuration time"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  DEMO COMPLETE"
echo "═══════════════════════════════════════════════════════════"
