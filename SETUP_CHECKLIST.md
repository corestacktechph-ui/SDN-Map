# 📋 Setup Checklist for Network Simulation

## ✅ Pre-Installation Checklist

- [ ] **Windows 10/11** (64-bit) installed
- [ ] At least **8GB RAM** available
- [ ] At least **20GB free disk space**
- [ ] **Administrator access** on your computer
- [ ] **Internet connection** for downloading Docker images

---

## 🐳 Docker Installation Steps

### Step 1: Download Docker Desktop
- [ ] Go to: https://www.docker.com/products/docker-desktop
- [ ] Download **Docker Desktop for Windows**
- [ ] Save the installer to your Downloads folder

### Step 2: Install Docker Desktop
- [ ] Run the installer as Administrator
- [ ] **Check** "Use WSL 2 instead of Hyper-V" (recommended)
- [ ] Follow the installation wizard
- [ ] Wait for installation to complete (~5-10 minutes)
- [ ] **Restart your computer** when prompted

### Step 3: Verify Docker Installation
- [ ] Open **PowerShell** or **Command Prompt**
- [ ] Run: `docker --version`
- [ ] Should show: `Docker version 20.x.x` or higher
- [ ] Run: `docker-compose --version`
- [ ] Should show: `docker-compose version 1.29.x` or higher

### Step 4: Test Docker
- [ ] Run: `docker run hello-world`
- [ ] Should see: "Hello from Docker!"
- [ ] If successful, Docker is working! ✅

---

## 🚀 Simulation Setup Steps

### Step 1: Verify Project Files
- [ ] Navigate to: `C:\Users\PC\Documents\Amira Capstone`
- [ ] Verify these files exist:
  - [ ] `docker-compose.mininet.yml`
  - [ ] `run-traditional.bat`
  - [ ] `run-sdn.bat`
  - [ ] `run-tests.bat`
  - [ ] `stop-all.bat`
  - [ ] `SIMULATION_GUIDE.md`

### Step 2: Pull Docker Images (First Time Only)
- [ ] Open **Command Prompt** in project folder
- [ ] Run: `docker pull iwaseyusuke/mininet:latest`
- [ ] Wait ~5-10 minutes for download
- [ ] Run: `docker pull osrg/ryu:latest`
- [ ] Wait ~2-3 minutes for download
- [ ] Run: `docker pull python:3.9-slim`
- [ ] Wait ~2-3 minutes for download

### Step 3: Test Traditional Network
- [ ] Double-click `run-traditional.bat`
- [ ] Wait for "Container is ready!" message
- [ ] In Command Prompt, run:
  ```cmd
  docker exec -it amira-traditional-network bash
  ```
- [ ] Inside container, run:
  ```bash
  python3 scripts/mininet/traditional_topology.py
  ```
- [ ] Should see: "*** Traditional Network started"
- [ ] In Mininet CLI, type: `pingall`
- [ ] Should see successful pings
- [ ] Type: `exit` to quit Mininet
- [ ] Type: `exit` again to leave container

### Step 4: Test SDN Network
- [ ] Run: `docker-compose -f docker-compose.mininet.yml down`
- [ ] Double-click `run-sdn.bat`
- [ ] Wait for "SDN Environment is ready!" message
- [ ] In Command Prompt, run:
  ```cmd
  docker exec -it amira-sdn-network bash
  ```
- [ ] Inside container, run:
  ```bash
  python3 scripts/mininet/sdn_topology.py
  ```
- [ ] Should see: "*** SDN Network started with Ryu Controller"
- [ ] In Mininet CLI, type: `pingall`
- [ ] Should see successful pings
- [ ] Type: `dpctl dump-flows` to see OpenFlow rules
- [ ] Type: `exit` to quit

### Step 5: Run Automated Tests
- [ ] Stop all containers: `docker-compose -f docker-compose.mininet.yml down`
- [ ] Double-click `run-tests.bat`
- [ ] Wait for all tests to complete (~10-15 minutes)
- [ ] Check results in: `network\results\tests\`
- [ ] Check analysis in: `network\results\research\`
- [ ] Check charts in: `network\results\charts\`

---

## 🔧 Troubleshooting Checklist

### If Docker won't start:
- [ ] Check if **WSL 2** is installed: `wsl --status`
- [ ] If not, run: `wsl --install`
- [ ] Restart computer
- [ ] Start **Docker Desktop** from Start Menu
- [ ] Wait for "Docker Desktop is running" in system tray

### If containers won't start:
- [ ] Check Docker is running: `docker ps`
- [ ] Stop all containers: `docker-compose -f docker-compose.mininet.yml down`
- [ ] Remove old containers: `docker container prune -f`
- [ ] Try again

### If "privileged mode" error:
- [ ] Open **Docker Desktop**
- [ ] Go to Settings → General
- [ ] Enable "Use the WSL 2 based engine"
- [ ] Apply & Restart
- [ ] Try again

### If "permission denied" error:
- [ ] Run Command Prompt as **Administrator**
- [ ] Try the command again

### If Python errors inside container:
- [ ] Enter container: `docker exec -it amira-traditional-network bash`
- [ ] Run: `pip3 install matplotlib numpy pandas`
- [ ] Try your command again

### If no connectivity in Mininet:
- [ ] In Mininet CLI, type: `net`
- [ ] Check all nodes are listed
- [ ] Type: `nodes`
- [ ] Type: `links`
- [ ] If something missing, exit and restart simulation

---

## 📊 Expected Results

### Traditional Network:
- [ ] 27 hosts (h1 to h27)
- [ ] 6 service servers (ERP, HR, Monitor, IT, VoIP, DHCP)
- [ ] All hosts can ping each other
- [ ] Ping latency: ~10-30ms average
- [ ] Throughput: ~800-900 Mbps
- [ ] Failover time: ~5-10 seconds

### SDN Network:
- [ ] 27 hosts (h1 to h27)
- [ ] 6 service servers
- [ ] Ryu controller connected
- [ ] OpenFlow flows installed
- [ ] All hosts can ping each other
- [ ] Ping latency: ~5-15ms average (better!)
- [ ] Throughput: ~900-1000 Mbps (better!)
- [ ] Failover time: ~1-2 seconds (much better!)

### Comparison Results:
- [ ] Charts showing SDN improvements
- [ ] Latency reduction: ~40-50%
- [ ] Throughput increase: ~10-15%
- [ ] Failover time reduction: ~70-80%
- [ ] HTML reports generated

---

## 🎯 Quick Command Reference

```cmd
# Start traditional simulation
docker-compose -f docker-compose.mininet.yml up -d mininet-traditional

# Start SDN simulation
docker-compose -f docker-compose.mininet.yml up -d ryu-controller mininet-sdn

# Enter container
docker exec -it amira-traditional-network bash
docker exec -it amira-sdn-network bash

# View logs
docker logs -f amira-traditional-network
docker logs -f amira-ryu-controller

# Stop all
docker-compose -f docker-compose.mininet.yml down

# Clean up
docker system prune -a -f
```

---

## ✅ Final Checklist

- [ ] Docker Desktop installed and running
- [ ] All Docker images pulled
- [ ] Traditional network tested successfully
- [ ] SDN network tested successfully
- [ ] Ryu controller working
- [ ] Automated tests completed
- [ ] Results generated and viewable
- [ ] Charts opening in browser

---

## 📞 Need Help?

If you're stuck on any step:

1. **Check Docker Desktop** is running (green icon in system tray)
2. **Restart Docker Desktop** (Right-click icon → Restart)
3. **Restart your computer** if nothing works
4. **Check the logs**: `docker logs <container-name>`
5. **Review SIMULATION_GUIDE.md** for detailed instructions

---

## 🎓 You're Ready When:

- ✅ You can run `run-traditional.bat` successfully
- ✅ You can run `run-sdn.bat` successfully
- ✅ You can run `run-tests.bat` and see results
- ✅ You can view charts in `network/results/charts/`
- ✅ All hosts can ping each other in both topologies

**Congratulations! Your simulation environment is ready! 🚀**
