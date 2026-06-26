const http = require('http')
const { Server } = require('socket.io')

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: 'WebSocket server running' }))
})

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
  },
})

const generateMetric = (base, variance) => base + (Math.random() - 0.5) * variance

const deviceNames = {
  core: ['CS1', 'CS2'],
  distribution: ['DS_A1', 'DS_A2', 'DS_B1', 'DS_B2', 'DS_C1', 'DS_C2', 'DS_S1', 'DS_S2'],
  access: ['AS_A1', 'AS_B1', 'AS_C1', 'AS_S1'],
  servers: ['ERP Server', 'HR Server', 'Monitoring Server', 'IT Server', 'VoIP Server', 'DHCP Server'],
}

let activeLinks = []
let deviceStatuses = {}

// Initialize all devices as ONLINE
Object.values(deviceNames).flat().forEach((name) => {
  deviceStatuses[name] = 'ONLINE'
})

// Initialize links between layers
function generateLinks() {
  const links = []
  deviceNames.core.forEach((core) => {
    deviceNames.distribution.forEach((dist) => {
      if (Math.random() > 0.3) {
        links.push({ source: core, target: dist, status: 'ACTIVE', bandwidth: Math.floor(Math.random() * 800) + 200 })
      }
    })
  })
  deviceNames.distribution.forEach((dist) => {
    deviceNames.access.forEach((acc) => {
      if (Math.random() > 0.3) {
        links.push({ source: dist, target: acc, status: 'ACTIVE', bandwidth: Math.floor(Math.random() * 400) + 100 })
      }
    })
  })
  deviceNames.access.forEach((acc) => {
    deviceNames.servers.forEach((srv) => {
      if (Math.random() > 0.5) {
        links.push({ source: acc, target: srv, status: 'ACTIVE', bandwidth: Math.floor(Math.random() * 100) + 50 })
      }
    })
  })
  return links
}
activeLinks = generateLinks()

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  const metricsInterval = setInterval(() => {
    const metrics = {
      latency: generateMetric(9, 4),
      throughput: generateMetric(980, 50),
      packetLoss: Math.max(0, generateMetric(0.2, 0.3)),
      flows: Math.floor(Math.random() * 50) + 150,
      connections: Math.floor(Math.random() * 10) + 25,
      timestamp: new Date().toISOString(),
    }
    socket.emit('metrics', metrics)
  }, 2000)

  const eventsInterval = setInterval(() => {
    const eventTypes = ['PacketIn', 'FlowRemoved', 'PortStatus', 'SwitchJoin', 'SwitchLeave']
    const event = {
      type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      message: `Network event detected: ${eventTypes[Math.floor(Math.random() * eventTypes.length)]}`,
    }
    socket.emit('event', event)
  }, 10000)

  // Topology live update — every 2 seconds
  const topologyInterval = setInterval(() => {
    // Randomly toggle 1-2 device statuses
    const allDevices = Object.values(deviceNames).flat()
    const toggles = Math.floor(Math.random() * 2) + 1
    for (let i = 0; i < toggles; i++) {
      const device = allDevices[Math.floor(Math.random() * allDevices.length)]
      deviceStatuses[device] = deviceStatuses[device] === 'ONLINE' ? 'OFFLINE' : 'ONLINE'
      // 70% chance to go back online after one cycle
      if (deviceStatuses[device] === 'OFFLINE' && Math.random() > 0.7) {
        deviceStatuses[device] = 'ONLINE'
      }
    }

    // Update link bandwidths and random flips
    activeLinks = activeLinks.map((link) => ({
      ...link,
      bandwidth: Math.floor(generateMetric(400, 300)),
      status: Math.random() > 0.95 ? 'DOWN' : 'ACTIVE',
    }))

    // Random link flapping
    if (activeLinks.length > 5 && Math.random() > 0.9) {
      const idx = Math.floor(Math.random() * activeLinks.length)
      activeLinks[idx] = {
        ...activeLinks[idx],
        status: activeLinks[idx].status === 'ACTIVE' ? 'DOWN' : 'ACTIVE',
        bandwidth: activeLinks[idx].status === 'ACTIVE' ? Math.floor(Math.random() * 500) + 50 : 0,
      }
    }

    // Compute layer-level traffic stats
    const layerTraffic = {
      core: deviceNames.core.reduce((sum, d) => sum + (deviceStatuses[d] === 'ONLINE' ? 1 : 0), 0),
      distribution: deviceNames.distribution.reduce((sum, d) => sum + (deviceStatuses[d] === 'ONLINE' ? 1 : 0), 0),
      access: deviceNames.access.reduce((sum, d) => sum + (deviceStatuses[d] === 'ONLINE' ? 1 : 0), 0),
      servers: deviceNames.servers.reduce((sum, d) => sum + (deviceStatuses[d] === 'ONLINE' ? 1 : 0), 0),
      totalFlows: Math.floor(Math.random() * 50) + 150,
      activeLinks: activeLinks.filter((l) => l.status === 'ACTIVE').length,
      totalLinks: activeLinks.length,
    }

    socket.emit('topology', {
      devices: { ...deviceStatuses },
      links: activeLinks,
      layerTraffic,
      timestamp: new Date().toISOString(),
    })
  }, 2500)

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
    clearInterval(metricsInterval)
    clearInterval(eventsInterval)
    clearInterval(topologyInterval)
  })

  socket.on('command', (data) => {
    console.log(`Command received: ${JSON.stringify(data)}`)
    socket.emit('command_result', { status: 'ok', command: data })
  })
})

const PORT = process.env.WS_PORT || 3001
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
})
