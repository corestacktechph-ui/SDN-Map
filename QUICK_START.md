# 🚀 Quick Start Guide - 5 Minutes to Running Simulation!

## Step 1: Install Docker Desktop (One-time setup)

### Windows Installation:
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Run installer as Administrator
3. Check "Use WSL 2 instead of Hyper-V" 
4. Restart computer when prompted
5. Wait for Docker Desktop to start (green icon in taskbar)

### Verify Installation:
```cmd
docker --version
```
Should show: `Docker version 20.x.x` or higher ✅

---

## Step 2: Test Docker (30 seconds)

```cmd
docker run hello-world
```
If you see "Hello from Docker!" → You're ready! ✅

---

## Step 3: Run Your First Simulation (2 minutes)

### Option A: Traditional Network (Easiest)

**Just double-click:** `run-traditional.bat`

Then in Command Prompt:
```cmd
docker exec -it amira-traditional-network bash
python3 scripts/mininet/traditional_topology.py
```

In Mininet CLI, type:
```
pingall
```

You should see hosts pinging each other! 🎉

### Option B: SDN Network with Ryu Controller

**Just double-click:** `run-sdn.bat`

Then in Command Prompt:
```cmd
docker exec -it amira-sdn-network bash
python3 scripts/mininet/sdn_topology.py
```

---

## Step 4: Run Automated Tests (10 minutes)

**Just double-click:** `run-tests.bat`

Wait for completion (~10-15 minutes). This will:
- ✅ Test Traditional Network
- ✅ Test SDN Network  
- ✅ Generate comparison charts
- ✅ Create analysis reports

Results in:
- `network\results\tests\` - Raw test data
- `network\results\charts\` - Visual charts
- `network\results\research\` - Analysis reports

---

## Step 5: View Results

Double-click these files to open in browser:
- `network\results\charts\comparison_chart.html`
- `network\results\charts\radar_comparison.html`
- `network\results\research\comparison_matrix_*.html`

---

## 🛑 To Stop Everything

**Just double-click:** `stop-all.bat`

Or run:
```cmd
docker-compose -f docker-compose.mininet.yml down
```

---

## 🔧 Troubleshooting (If something goes wrong)

### Problem: "Docker is not running"
**Solution:** 
1. Open Start Menu
2. Search "Docker Desktop"
3. Click to start it
4. Wait for green icon in taskbar
5. Try again

### Problem: "Container already exists"
**Solution:**
```cmd
docker-compose -f docker-compose.mininet.yml down
docker container prune -f
```
Then try again.

### Problem: "Permission denied"
**Solution:** Run Command Prompt as Administrator

### Problem: "Port already in use"
**Solution:**
```cmd
docker ps
docker stop <container-name>
```

---

## 📋 Available Commands

```cmd
# Start traditional network
run-traditional.bat

# Start SDN network  
run-sdn.bat

# Run all automated tests
run-tests.bat

# Stop everything
stop-all.bat

# Manual control:
docker-compose -f docker-compose.mininet.yml up -d
docker-compose -f docker-compose.mininet.yml down
docker-compose -f docker-compose.mininet.yml logs -f
```

---

## 🎯 What You Can Do

Inside Mininet CLI:

```bash
pingall                # Test all host connectivity
h1 ping h10           # Ping specific hosts
iperf h1 h10          # Throughput test
dpctl dump-flows      # View OpenFlow flows (SDN only)
link CS1 DS_A1 down   # Simulate link failure
link CS1 DS_A1 up     # Restore link
net                   # Show network topology
nodes                 # List all nodes
links                 # List all links
exit                  # Exit Mininet
```

---

## 📚 More Information

- **Full Guide:** Read `SIMULATION_GUIDE.md`
- **Setup Checklist:** Read `SETUP_CHECKLIST.md`
- **Bug Fixes:** Read `BUG_FIXES_SUMMARY.md`

---

## ✅ Success Checklist

- [ ] Docker Desktop installed and running
- [ ] `docker run hello-world` works
- [ ] Traditional network simulation runs
- [ ] Can see "pingall" working
- [ ] SDN network with Ryu controller runs
- [ ] Automated tests complete successfully
- [ ] Can view charts in browser

---

## 🎓 You're Ready When You See:

```
*** Traditional Network started (Expanded Topology)
*** 27 hosts, 9 VLANs, Internet simulation, full services
*** Network ready. Tests available:
  Connectivity:  pingall
  
mininet>
```

**Congratulations! Your simulation is working! 🎉**

Type `pingall` and watch the magic happen! ✨

---

## 💡 Pro Tips

1. **First time?** Start with `run-traditional.bat` - it's simpler
2. **Want SDN?** Use `run-sdn.bat` after testing traditional
3. **Need data?** Use `run-tests.bat` to get all metrics automatically
4. **Something wrong?** Run `stop-all.bat` and start fresh
5. **Check logs:** `docker logs -f <container-name>`

---

## 📞 Quick Help

**Container not starting?**
→ Check Docker Desktop is running (green icon)

**Can't enter container?**
→ Run: `docker ps` to see if it's running

**Tests failing?**
→ Make sure you stopped previous containers first

**Results not showing?**
→ Check: `network\results\` folder

---

## 🚀 Ready to Start?

1. Install Docker Desktop
2. Double-click `run-traditional.bat`
3. Type commands above
4. See your network simulation in action!

**That's it! You're now running a full enterprise network simulation! 🎊**
