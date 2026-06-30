#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# COMPLETE PRESENTATION TEST SUITE RUNNER
# Runs all tests for: HND → Migration → SDN comparison
# ═══════════════════════════════════════════════════════════════

set -e

RESULTS_DIR="/workspace/network/results/tests"
mkdir -p "$RESULTS_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$RESULTS_DIR/full_test_run_${TIMESTAMP}.log"

echo "═══════════════════════════════════════════════════════════════" | tee "$LOG_FILE"
echo "  SDN MIGRATION COMPLETE TEST SUITE" | tee -a "$LOG_FILE"
echo "  Started: $(date)" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Cleanup any previous Mininet state
echo "[SETUP] Cleaning previous Mininet state..." | tee -a "$LOG_FILE"
mn -c 2>/dev/null || true
sleep 2

# ═══════════════════════════════════════════════════════════════
# TEST 1: VLAN Isolation (Traditional vs SDN)
# Covers: VLAN segmentation, ACL validation, Guest isolation
# ═══════════════════════════════════════════════════════════════
echo "" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "  TEST 1: VLAN SEGMENTATION & ACL ISOLATION" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

cd /workspace
python3 scripts/mininet/vlan_isolation_test.py --mode both 2>&1 | tee -a "$LOG_FILE"
mn -c 2>/dev/null || true
sleep 2

# ═══════════════════════════════════════════════════════════════
# TEST 2: QoS Traffic Prioritization (Traditional vs SDN)
# Covers: VoIP priority, congestion handling, latency under load
# ═══════════════════════════════════════════════════════════════
echo "" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "  TEST 2: QoS TRAFFIC PRIORITIZATION" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

python3 scripts/mininet/qos_traffic_test.py --mode both 2>&1 | tee -a "$LOG_FILE"
mn -c 2>/dev/null || true
sleep 2

# ═══════════════════════════════════════════════════════════════
# TEST 3: Failover Testing (Traditional vs SDN)
# Covers: Recovery time, redundancy, link failure scenarios
# ═══════════════════════════════════════════════════════════════
echo "" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "  TEST 3: FAILOVER & RECOVERY TIME" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

python3 scripts/mininet/failover_testing.py --mode both 2>&1 | tee -a "$LOG_FILE"
mn -c 2>/dev/null || true
sleep 2

# ═══════════════════════════════════════════════════════════════
# TEST 4: Load Testing (Traditional vs SDN)
# Covers: Throughput, packet loss at different load levels
# ═══════════════════════════════════════════════════════════════
echo "" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "  TEST 4: LOAD TESTING (THROUGHPUT)" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

python3 scripts/mininet/load_testing.py --mode both 2>&1 | tee -a "$LOG_FILE"
mn -c 2>/dev/null || true
sleep 2

# ═══════════════════════════════════════════════════════════════
# TEST 5: Scalability Test
# Covers: Performance degradation as hosts increase
# ═══════════════════════════════════════════════════════════════
echo "" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "  TEST 5: SCALABILITY TEST" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

python3 scripts/mininet/scalability_test.py --mode both 2>&1 | tee -a "$LOG_FILE"
mn -c 2>/dev/null || true
sleep 2

# ═══════════════════════════════════════════════════════════════
# TEST 6: Migration Phases (0-5)
# Covers: Phased migration validation
# ═══════════════════════════════════════════════════════════════
echo "" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "  TEST 6: MIGRATION PHASES (0-5)" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

python3 scripts/mininet/migration_phases.py --all 2>&1 | tee -a "$LOG_FILE"
mn -c 2>/dev/null || true
sleep 2

# ═══════════════════════════════════════════════════════════════
# TEST 7: Manageability Demo
# Covers: Configuration time comparison (VLAN add)
# ═══════════════════════════════════════════════════════════════
echo "" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "  TEST 7: MANAGEABILITY COMPARISON" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

bash scripts/demo/manageability_demo.sh 2>&1 | tee -a "$LOG_FILE"

# ═══════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════
echo "" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "  ALL TESTS COMPLETE" | tee -a "$LOG_FILE"
echo "  Finished: $(date)" | tee -a "$LOG_FILE"
echo "  Log saved: $LOG_FILE" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
