# 🎮 Batch Files Guide - Complete Reference

## Quick Reference Table

| File | Purpose | When to Use |
|------|---------|-------------|
| **LAUNCHER.bat** ⭐ | Master control center | **START HERE** - Main menu for everything |
| **first-run.bat** | Complete first-time setup | First time using the system |
| **check-setup.bat** | Verify installation | Check if everything is ready |
| **start-docker.bat** | Start Docker Desktop | When Docker is not running |
| **run-traditional.bat** | Start traditional network | Test traditional architecture |
| **run-sdn.bat** | Start SDN network | Test SDN with Ryu controller |
| **run-tests.bat** | Run all automated tests | Collect data for thesis |
| **stop-all.bat** | Stop all containers | Clean shutdown |
| **view-results.bat** | Open results in browser | View charts and analysis |
| **setup-database.bat** | Fix Prisma database | When database has issues |

---

## 🌟 **LAUNCHER.bat** - Master Control (RECOMMENDED)

### What it does:
Single menu-driven interface for all operations.

### How to use:
1. Double-click `LAUNCHER.bat`
2. Choose from menu options (0-15)
3. Follow on-screen instructions

### Features:
- ✅ First run setup
- ✅ Check system status
- ✅ Start/stop simulations
- ✅ View results
- ✅ Access documentation
- ✅ Manage Docker containers
- ✅ Database setup

### Best for:
Everyone! This is the easiest way to use the platform.

---

## 🚀 **first-run.bat** - Complete Setup

### What it does:
1. Checks Docker installation
2. Starts Docker Desktop if needed
3. Pulls required Docker images
4. Tests container setup
5. Verifies everything works

### How to use:
```cmd
Double-click: first-run.bat
```

### Output:
- Step-by-step verification
- Success/failure messages
- Next steps guidance

### When to use:
- **First time** setting up
- After fresh Docker installation
- When starting from scratch

### Time required:
~5-10 minutes (depending on internet speed)

---

## 🔧 **check-setup.bat** - Verify Installation

### What it does:
Checks if everything is installed correctly:
- Docker installation ✅
- Docker running status ✅
- Node.js (for web app) ✅
- Required files ✅
- Scripts availability ✅

### How to use:
```cmd
Double-click: check-setup.bat
```

### Output:
```
[1/6] Checking Docker installation...
  ✅ Docker is installed
  Docker version 28.4.0

[2/6] Checking Docker status...
  ✅ Docker is running

Results: 6/6 checks passed
✅ Your setup is ready!
```

### When to use:
- Before starting simulations
- After system restart
- When troubleshooting issues
- To verify installation

---

## 🐳 **start-docker.bat** - Docker Management

### What it does:
1. Checks if Docker is running
2. Starts Docker Desktop if needed
3. Waits for Docker to be ready
4. Presents menu of options

### How to use:
```cmd
Double-click: start-docker.bat
```

### Interactive Menu:
```
[1] Start Traditional Network Simulation
[2] Start SDN Network Simulation
[3] Run All Automated Tests
[4] Check Docker Status
[5] Exit
```

### When to use:
- After computer restart
- When Docker is not running
- Before any simulation

### Time required:
~1-2 minutes for Docker to start

---

## 🌐 **run-traditional.bat** - Traditional Network

### What it does:
Starts traditional hierarchical network with:
- VRRP redundancy
- OSPF routing
- 27 hosts across 9 VLANs
- Service servers

### How to use:
```cmd
# 1. Double-click: run-traditional.bat
# 2. Wait for container to start
# 3. Enter container:
docker exec -it amira-traditional-network bash

# 4. Run simulation:
python3 scripts/mininet/traditional_topology.py

# 5. Test connectivity:
mininet> pingall
```

### Container name:
`amira-traditional-network`

### When to use:
- First simulation run
- Collecting traditional network data
- Baseline performance testing

---

## 🤖 **run-sdn.bat** - SDN Network with Ryu

### What it does:
Starts SDN architecture with:
- Ryu SDN controller (port 6633)
- OpenFlow 1.3 switches
- 27 hosts across 9 VLANs
- Service servers

### How to use:
```cmd
# 1. Double-click: run-sdn.bat
# 2. Wait for Ryu + Mininet to start
# 3. Enter container:
docker exec -it amira-sdn-network bash

# 4. Run simulation:
python3 scripts/mininet/sdn_topology.py

# 5. Test SDN features:
mininet> pingall
mininet> dpctl dump-flows
```

### Containers started:
- `amira-ryu-controller` (SDN controller)
- `amira-sdn-network` (Mininet)

### When to use:
- After traditional network testing
- Collecting SDN performance data
- Testing OpenFlow capabilities

---

## 🧪 **run-tests.bat** - Automated Testing

### What it does:
Complete automated test suite:
1. **Traditional Network Tests**
   - Ping test (latency)
   - iPerf test (throughput)
   - Jitter test
   - Failover test
   
2. **SDN Network Tests**
   - Same tests as traditional
   
3. **Analysis Generation**
   - Comparison matrix
   - Charts
   - AI conclusions

### How to use:
```cmd
Double-click: run-tests.bat
```

### Output locations:
```
network\results\tests\        # Raw JSON data
network\results\charts\       # HTML charts
network\results\research\     # Analysis reports
```

### When to use:
- **For thesis data collection** ⭐
- When you need complete comparison
- Automated overnight runs

### Time required:
~10-15 minutes (full suite)

### What you get:
- ✅ Traditional network metrics
- ✅ SDN network metrics
- ✅ Side-by-side comparison
- ✅ Visual charts
- ✅ Statistical analysis
- ✅ AI-generated conclusions

---

## 🛑 **stop-all.bat** - Stop Everything

### What it does:
Cleanly stops all Docker containers:
- Traditional network
- SDN network
- Ryu controller
- Network monitor

### How to use:
```cmd
Double-click: stop-all.bat
```

### Equivalent command:
```cmd
docker-compose -f docker-compose.mininet.yml down
```

### When to use:
- After finishing simulations
- Before system shutdown
- When switching between topologies
- To free up system resources

---

## 📊 **view-results.bat** - Results Viewer

### What it does:
Opens all available results in browser:
- Comparison charts
- Radar charts
- Comparison matrices
- AI conclusions
- Results folder

### How to use:
```cmd
Double-click: view-results.bat
```

### Opens:
1. `comparison_chart.html` - Bar charts
2. `radar_comparison.html` - Radar visualization
3. Latest comparison matrix
4. Latest AI conclusion
5. File explorer with results folder

### When to use:
- After running tests
- To review data
- For thesis screenshots
- Presentation preparation

---

## 💾 **setup-database.bat** - Database Setup

### What it does:
1. Stops Node.js processes
2. Regenerates Prisma client
3. Applies database schema
4. Fixes database issues

### How to use:
```cmd
Double-click: setup-database.bat
```

### When to use:
- After schema changes
- When Prisma errors occur
- First time setup for web app
- Database corruption

### Fixes:
- ✅ Prisma client errors
- ✅ Schema sync issues
- ✅ File lock problems

---

## 🎯 Common Workflows

### Workflow 1: First Time Complete Setup
```
1. first-run.bat
2. Read output and verify success
3. LAUNCHER.bat → Option 4 (Traditional)
4. Test connectivity
5. LAUNCHER.bat → Option 13 (Stop All)
6. LAUNCHER.bat → Option 5 (SDN)
7. Test connectivity
```

### Workflow 2: Quick Daily Research
```
1. check-setup.bat (verify ready)
2. run-tests.bat (collect data)
3. view-results.bat (analyze)
4. stop-all.bat (clean up)
```

### Workflow 3: Interactive Testing
```
1. start-docker.bat
2. Choose simulation from menu
3. Enter container
4. Run manual tests
5. Save results
6. stop-all.bat
```

### Workflow 4: Thesis Data Collection
```
1. run-tests.bat (automated)
2. Wait 10-15 minutes
3. view-results.bat
4. Copy charts for thesis
5. Export data if needed
```

---

## 🚨 Troubleshooting

### "Docker is not installed"
**Solution:** Install Docker Desktop
```
Download: https://www.docker.com/products/docker-desktop
Then run: first-run.bat
```

### "Docker is not running"
**Solution:**
```
Double-click: start-docker.bat
```

### "Container failed to start"
**Solution:**
```
1. stop-all.bat
2. Wait 10 seconds
3. Try again
```

### "Prisma error"
**Solution:**
```
Double-click: setup-database.bat
```

### "Can't view results"
**Solution:**
```
Check if tests completed:
dir network\results\tests

If empty, run: run-tests.bat
```

---

## 💡 Pro Tips

1. **Use LAUNCHER.bat** - It's the easiest way
2. **Run check-setup.bat** before starting work
3. **Always stop-all.bat** before shutting down
4. **Use run-tests.bat** for thesis data (most reliable)
5. **Keep Docker Desktop running** while working

---

## 📋 Checklist Before Running

- [ ] Docker Desktop is installed
- [ ] Docker is running (green icon)
- [ ] check-setup.bat shows all checks passed
- [ ] Previous containers stopped (stop-all.bat)
- [ ] Enough disk space (~5GB free)

---

## 🎓 For Your Thesis

**Best Practice:**
1. Run `run-tests.bat` at least **3 times**
2. Use `view-results.bat` to check consistency
3. Take **screenshots** of charts
4. Export **raw data** from `network\results\tests\`
5. Include **comparison matrix** in appendix

**Data Locations:**
- **Charts:** `network\results\charts\*.html`
- **Raw Data:** `network\results\tests\*.json`
- **Analysis:** `network\results\research\*.html`

---

## ⚡ Quick Command Reference

```cmd
# Check everything
check-setup.bat

# Start Docker
start-docker.bat

# Run simulation
run-traditional.bat   OR   run-sdn.bat

# Run all tests (thesis data)
run-tests.bat

# View results
view-results.bat

# Stop everything
stop-all.bat

# Master menu (easiest!)
LAUNCHER.bat
```

---

## 🎊 You're Ready!

Pick any `.bat` file and double-click to start!

**Recommended first step:** Double-click `LAUNCHER.bat` for the full menu experience! 🚀
