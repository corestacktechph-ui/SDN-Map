# 🚀 Network Simulation Setup Guide

## Quick Start (Docker Method - Recommended for Windows)

### Prerequisites
1. **Install Docker Desktop** for Windows
   - Download: https://www.docker.com/products/docker-desktop
   - Enable WSL2 backend during installation
   - Restart computer after installation

2. **Verify Docker Installation**
   ```bash
   docker --version
   docker-compose --version
   ```

---

## 🎯 Method 1: Docker Compose (EASIEST)

### Step 1: Start the Simulation Environment

```bash
# Navigate to project directory
cd "C:\Users\PC\Documents\Amira Capstone"

# Start Traditional Network
docker-compose -f docker-compose.mininet.yml up -d mininet-traditional

# OR start SDN Network with Ryu Controller
docker-compose -f docker-compose.mininet.yml up -d ryu-controller mininet-sdn

# View logs
docker-compose -f docker-compose.mininet.yml logs -f
```

### Step 2: Run Traditional Topology

```bash
# Enter the traditional network container
docker exec -it amira-traditional-network bash

# Inside container - Run simulation
python3 scripts/mininet/traditional_topology.py

# Or with DHCP enabled
python3 scripts/mininet/traditional_topology.py --dhcp

# Inside Mininet CLI:
mininet> pingall          # Test connectivity
mininet> h1 ping h10      # Ping specific hosts
mininet> iperf h1 h10     # Throughput test
mininet> exit
```

### Step 3: Run SDN Topology

```bash
# Enter the SDN network container
docker exec -it amira-sdn-network bash

# Inside container - Run SDN simulation
python3 scripts/mininet/sdn_topology.py

# Or with DHCP
python3 scripts/mininet/sdn_topology.py --dhcp

# Inside Mininet CLI:
mininet> pingall
mininet> dpctl dump-flows  # View OpenFlow flows
mininet> exit
```

### Step 4: Run Performance Tests

```bash
# From inside container:
cd scripts/tests

# Run all tests
python3 ping_test.py
python3 iperf_test.py
python3 jitter_test.py
python3 failover_test.py

# Results saved to: /workspace/results/tests/
```

### Step 5: Generate Analysis

```bash
# Generate comparison charts
cd scripts/analysis
python3 comparison_matrix.py
python3 chart_generator.py
python3 ai_conclusion_engine.py

# Results in: /workspace/results/research/
```

### Step 6: Stop Containers

```bash
# Stop all simulation containers
docker-compose -f docker-compose.mininet.yml down

# Or stop specific service
docker-compose -f docker-compose.mininet.yml stop mininet-traditional
```

---

## 🎯 Method 2: WSL2 (Native Linux Experience)

### Step 1: Install WSL2

```powershell
# Run in PowerShell as Administrator
wsl --install -d Ubuntu

# Restart computer
# After restart, Ubuntu will auto-start
```

### Step 2: Install Mininet in WSL2

```bash
# Inside WSL2 Ubuntu terminal
sudo apt-get update
sudo apt-get install -y mininet openvswitch-switch python3-pip
sudo apt-get install -y dnsmasq iperf3 tcpdump

# Install Python dependencies
pip3 install matplotlib numpy pandas ryu
```

### Step 3: Navigate to Project

```bash
# Access Windows files from WSL2
cd /mnt/c/Users/PC/Documents/Amira\ Capstone

# Make scripts executable
chmod +x scripts/mininet/*.sh
chmod +x network/configs/**/*.sh
```

### Step 4: Run Simulations

```bash
# Traditional Topology
sudo python3 scripts/mininet/traditional_topology.py

# SDN Topology (start Ryu first in another terminal)
ryu-manager scripts/ryu/sdn_controller.py &
sudo python3 scripts/mininet/sdn_topology.py
```

---

## 🎯 Method 3: Manual Docker (More Control)

### Build Custom Mininet Image

```bash
# Create Dockerfile
cat > Dockerfile.mininet << 'EOF'
FROM iwaseyusuke/mininet:latest

RUN apt-get update && apt-get install -y \
    dnsmasq \
    iperf3 \
    tcpdump \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install matplotlib numpy pandas

WORKDIR /workspace

CMD ["/bin/bash"]
EOF

# Build image
docker build -t amira-mininet -f Dockerfile.mininet .

# Run traditional network
docker run -it --privileged --rm \
  -v "${PWD}/scripts:/workspace/scripts" \
  -v "${PWD}/network:/workspace/network" \
  amira-mininet \
  python3 scripts/mininet/traditional_topology.py

# Run SDN network (with Ryu)
docker run -d --name ryu-controller --network host \
  osrg/ryu ryu-manager --observe-links /root/ryu-apps/sdn_controller.py

docker run -it --privileged --rm --network host \
  -v "${PWD}/scripts:/workspace/scripts" \
  -v "${PWD}/network:/workspace/network" \
  amira-mininet \
  python3 scripts/mininet/sdn_topology.py
```

---

## 📊 Running Tests

### Automated Test Suite

```bash
# Inside container or WSL2
cd scripts/tests

# Run individual tests
python3 ping_test.py --topology traditional
python3 iperf_test.py --topology sdn
python3 jitter_test.py --topology traditional
python3 failover_test.py --topology sdn

# Run all tests
bash run_all_tests.sh
```

### Manual Testing

```bash
# Start simulation
sudo python3 scripts/mininet/traditional_topology.py

# In Mininet CLI:
mininet> h1 ping -c 10 h10                    # Latency test
mininet> iperf h1 h10                         # Throughput test
mininet> h1 ping -i 0.2 -c 50 h10             # Jitter test
mininet> link CS1 DS_A1 down                  # Simulate failure
mininet> h1 ping h10                          # Test recovery
mininet> link CS1 DS_A1 up                    # Restore link
```

---

## 🔧 Troubleshooting

### Docker Issues

**Problem:** "Cannot connect to Docker daemon"
```bash
# Start Docker Desktop
# Or in PowerShell:
Start-Service docker
```

**Problem:** "Privileged mode required"
```bash
# Make sure --privileged flag is used
docker run --privileged ...
```

**Problem:** "Port already in use"
```bash
# Find and stop conflicting container
docker ps
docker stop <container-id>
```

### WSL2 Issues

**Problem:** "ovs-vswitchd not running"
```bash
sudo service openvswitch-switch start
sudo ovs-vsctl show
```

**Problem:** "Permission denied"
```bash
# Run with sudo
sudo python3 scripts/mininet/traditional_topology.py
```

**Problem:** "Module not found"
```bash
# Install missing dependencies
pip3 install ryu mininet
```

### Network Issues

**Problem:** "No connectivity in simulation"
```bash
# Check OVS status
sudo ovs-vsctl show
sudo ovs-ofctl show <switch-name>

# Restart OVS
sudo service openvswitch-switch restart
```

**Problem:** "DHCP not working"
```bash
# Check dnsmasq
ps aux | grep dnsmasq
cat /tmp/dhcp_leases.conf

# Restart DHCP
sudo pkill dnsmasq
bash network/configs/dhcp/dhcp_server.sh start
```

---

## 📈 Viewing Results

### Real-time Monitoring

```bash
# Start network monitor
docker exec -it amira-network-monitor bash
python3 scripts/mininet/network_diagnostics.py monitor --interval 10
```

### View Generated Results

```bash
# On Windows, open in browser:
# C:\Users\PC\Documents\Amira Capstone\network\results\research\

# Latest comparison matrix
start network/results/research/comparison_matrix_*.html

# Latest charts
start network/results/charts/comparison_chart.html
start network/results/charts/radar_comparison.html
```

---

## 🎓 Example Workflow

### Complete Comparison Test

```bash
# 1. Start Traditional Network
docker-compose -f docker-compose.mininet.yml up -d mininet-traditional
docker exec -it amira-traditional-network bash
python3 scripts/mininet/traditional_topology.py --no-cli &

# 2. Run traditional tests
cd scripts/tests
python3 ping_test.py --topology traditional --output /workspace/results/tests/trad_ping.json
python3 iperf_test.py --topology traditional --output /workspace/results/tests/trad_iperf.json
python3 failover_test.py --topology traditional --output /workspace/results/tests/trad_failover.json

# 3. Stop traditional, start SDN
exit
docker-compose -f docker-compose.mininet.yml down
docker-compose -f docker-compose.mininet.yml up -d ryu-controller mininet-sdn
docker exec -it amira-sdn-network bash

# 4. Run SDN tests
python3 scripts/tests/ping_test.py --topology sdn --output /workspace/results/tests/sdn_ping.json
python3 scripts/tests/iperf_test.py --topology sdn --output /workspace/results/tests/sdn_iperf.json
python3 scripts/tests/failover_test.py --topology sdn --output /workspace/results/tests/sdn_failover.json

# 5. Generate comparison
cd scripts/analysis
python3 comparison_matrix.py
python3 chart_generator.py
python3 ai_conclusion_engine.py

# Results will be in: /workspace/results/research/
```

---

## 📚 Additional Resources

- **Mininet Documentation:** http://mininet.org/walkthrough/
- **Ryu Controller:** https://ryu.readthedocs.io/
- **Docker Networking:** https://docs.docker.com/network/
- **Open vSwitch:** https://www.openvswitch.org/

---

## ⚡ Quick Commands Reference

```bash
# Docker Compose
docker-compose -f docker-compose.mininet.yml up -d    # Start
docker-compose -f docker-compose.mininet.yml down     # Stop
docker-compose -f docker-compose.mininet.yml logs -f  # View logs

# Enter container
docker exec -it amira-traditional-network bash
docker exec -it amira-sdn-network bash

# Mininet CLI Commands
pingall                 # Test all hosts
h1 ping h10            # Specific ping
iperf h1 h10           # Throughput
link CS1 DS_A1 down    # Simulate failure
dpctl dump-flows       # View flows (SDN)
net                    # Show topology
nodes                  # List nodes
links                  # List links
```

---

## 🎯 Next Steps

1. **Choose your method** (Docker Compose recommended)
2. **Install prerequisites** (Docker Desktop)
3. **Run traditional simulation** first
4. **Run SDN simulation** with Ryu
5. **Compare results** using analysis scripts
6. **View charts and reports** in web browser

Good luck with your capstone project! 🚀
