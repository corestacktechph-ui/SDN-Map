import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create users
  const adminPassword = await hash('admin123', 12)
  const researcherPassword = await hash('researcher123', 12)
  const panelPassword = await hash('panel123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@amira-capstone.com' },
    update: {},
    create: {
      name: 'Dr. Admin',
      email: 'admin@amira-capstone.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  const researcher = await prisma.user.upsert({
    where: { email: 'researcher@amira-capstone.com' },
    update: {},
    create: {
      name: 'Researcher Amira',
      email: 'researcher@amira-capstone.com',
      password: researcherPassword,
      role: 'RESEARCHER',
    },
  })

  const panelMember = await prisma.user.upsert({
    where: { email: 'panel@amira-capstone.com' },
    update: {},
    create: {
      name: 'Panel Member',
      email: 'panel@amira-capstone.com',
      password: panelPassword,
      role: 'PANEL_MEMBER',
    },
  })

  // Create VLANs
  const vlans = [
    { vlanId: 5, name: 'Management', subnet: '10.0.5.0/24', gateway: '10.0.5.1', type: 'MANAGEMENT' },
    { vlanId: 10, name: 'VLAN_10_Users', subnet: '10.0.10.0/24', gateway: '10.0.10.1', type: 'USER' },
    { vlanId: 20, name: 'VLAN_20_Users', subnet: '10.0.20.0/24', gateway: '10.0.20.1', type: 'USER' },
    { vlanId: 30, name: 'VLAN_30_Users', subnet: '10.0.30.0/24', gateway: '10.0.30.1', type: 'USER' },
    { vlanId: 40, name: 'VLAN_40_Users', subnet: '10.0.40.0/24', gateway: '10.0.40.1', type: 'USER' },
    { vlanId: 50, name: 'VLAN_50_Users', subnet: '10.0.50.0/24', gateway: '10.0.50.1', type: 'USER' },
    { vlanId: 60, name: 'VLAN_60_Users', subnet: '10.0.60.0/24', gateway: '10.0.60.1', type: 'USER' },
    { vlanId: 91, name: 'Services_ERP', subnet: '10.0.91.0/24', gateway: '10.0.91.1', type: 'SERVICES' },
    { vlanId: 92, name: 'Services_HR', subnet: '10.0.92.0/24', gateway: '10.0.92.1', type: 'SERVICES' },
    { vlanId: 93, name: 'Services_Monitoring', subnet: '10.0.93.0/24', gateway: '10.0.93.1', type: 'SERVICES' },
    { vlanId: 94, name: 'Services_IT', subnet: '10.0.94.0/24', gateway: '10.0.94.1', type: 'SERVICES' },
    { vlanId: 110, name: 'Guest_VLAN_110', subnet: '10.0.110.0/24', gateway: '10.0.110.1', type: 'GUEST' },
    { vlanId: 120, name: 'Guest_VLAN_120', subnet: '10.0.120.0/24', gateway: '10.0.120.1', type: 'GUEST' },
    { vlanId: 130, name: 'Guest_VLAN_130', subnet: '10.0.130.0/24', gateway: '10.0.130.1', type: 'GUEST' },
  ]

  for (const vlan of vlans) {
    await prisma.vlan.upsert({
      where: { vlanId: vlan.vlanId },
      update: {},
      create: vlan,
    })
  }

  // Create QoS Policies
  const qosPolicies = [
    { name: 'VoIP_Priority', description: 'High priority for VoIP traffic', priority: 'HIGH', dscpValue: 46, queueId: 1, minRate: 30, maxRate: 50, matchCriteria: 'udp_port_range=5060-5070' },
    { name: 'ERP_Priority', description: 'Medium priority for ERP traffic', priority: 'MEDIUM', dscpValue: 26, queueId: 2, minRate: 20, maxRate: 40, matchCriteria: 'tcp_port=3200' },
    { name: 'HR_Priority', description: 'Medium priority for HR traffic', priority: 'MEDIUM', dscpValue: 24, queueId: 3, minRate: 15, maxRate: 30, matchCriteria: 'tcp_port=8080' },
    { name: 'Guest_Low', description: 'Low priority for Guest VLANs', priority: 'LOW', dscpValue: 10, queueId: 4, minRate: 5, maxRate: 15, matchCriteria: 'vlan_range=110-130' },
    { name: 'Management_High', description: 'High priority for management traffic', priority: 'HIGH', dscpValue: 48, queueId: 5, minRate: 10, maxRate: 20, matchCriteria: 'vlan=5' },
  ]

  for (const policy of qosPolicies) {
    await prisma.qoSPolicy.create({ data: policy })
  }

  // Create topologies
  const traditionalTopology = await prisma.topology.create({
    data: {
      name: 'Traditional Hierarchical Network',
      type: 'TRADITIONAL',
      description: 'Traditional enterprise LAN with OSPF, VRRP, and STP',
      isActive: false,
    },
  })

  const sdnTopology = await prisma.topology.create({
    data: {
      name: 'SDN Network with Ryu Controller',
      type: 'SDN',
      description: 'Software Defined Network using OpenFlow and Ryu Controller',
      isActive: false,
    },
  })

  // Create traditional devices
  const traditionalDevices = [
    { name: 'CS1', type: 'CORE_SWITCH', layer: 'Core', ipAddress: '10.0.0.1', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'CS2', type: 'CORE_SWITCH', layer: 'Core', ipAddress: '10.0.0.2', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'DS_A1', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.1.1', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'DS_A2', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.1.2', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'DS_B1', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.2.1', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'DS_B2', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.2.2', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'DS_C1', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.3.1', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'DS_C2', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.3.2', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'DS_S1', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.4.1', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'DS_S2', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.4.2', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'AS_A1', type: 'ACCESS_SWITCH', layer: 'Access', ipAddress: '10.0.10.1', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'AS_B1', type: 'ACCESS_SWITCH', layer: 'Access', ipAddress: '10.0.20.1', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'AS_C1', type: 'ACCESS_SWITCH', layer: 'Access', ipAddress: '10.0.30.1', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'AS_S1', type: 'ACCESS_SWITCH', layer: 'Access', ipAddress: '10.0.40.1', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'Router-Edge', type: 'ROUTER', layer: 'Edge', ipAddress: '10.0.0.254', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'ERP-Server', type: 'SERVER', layer: 'Server', ipAddress: '10.0.91.10', status: 'OFFLINE', vlanId: 91, topologyId: traditionalTopology.id },
    { name: 'HR-Server', type: 'SERVER', layer: 'Server', ipAddress: '10.0.92.10', status: 'OFFLINE', vlanId: 92, topologyId: traditionalTopology.id },
    { name: 'Monitoring-Server', type: 'SERVER', layer: 'Server', ipAddress: '10.0.93.10', status: 'OFFLINE', vlanId: 93, topologyId: traditionalTopology.id },
    { name: 'IT-Server', type: 'SERVER', layer: 'Server', ipAddress: '10.0.94.10', status: 'OFFLINE', vlanId: 94, topologyId: traditionalTopology.id },
    { name: 'VoIP-Server', type: 'SERVER', layer: 'Server', ipAddress: '10.0.10.100', status: 'OFFLINE', topologyId: traditionalTopology.id },
    { name: 'DHCP-Server', type: 'SERVER', layer: 'Server', ipAddress: '10.0.5.10', status: 'OFFLINE', vlanId: 5, topologyId: traditionalTopology.id },
  ]

  for (const device of traditionalDevices) {
    await prisma.device.create({ data: device })
  }

  // Create SDN devices (same logical topology)
  const sdnDevices = [
    { name: 'CS1', type: 'CORE_SWITCH', layer: 'Core', ipAddress: '10.0.0.1', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000001', topologyId: sdnTopology.id },
    { name: 'CS2', type: 'CORE_SWITCH', layer: 'Core', ipAddress: '10.0.0.2', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000002', topologyId: sdnTopology.id },
    { name: 'DS_A1', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.1.1', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000011', topologyId: sdnTopology.id },
    { name: 'DS_A2', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.1.2', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000012', topologyId: sdnTopology.id },
    { name: 'DS_B1', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.2.1', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000021', topologyId: sdnTopology.id },
    { name: 'DS_B2', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.2.2', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000022', topologyId: sdnTopology.id },
    { name: 'DS_C1', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.3.1', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000031', topologyId: sdnTopology.id },
    { name: 'DS_C2', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.3.2', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000032', topologyId: sdnTopology.id },
    { name: 'DS_S1', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.4.1', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000041', topologyId: sdnTopology.id },
    { name: 'DS_S2', type: 'DISTRIBUTION_SWITCH', layer: 'Distribution', ipAddress: '10.0.4.2', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000042', topologyId: sdnTopology.id },
    { name: 'AS_A1', type: 'ACCESS_SWITCH', layer: 'Access', ipAddress: '10.0.10.1', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000101', topologyId: sdnTopology.id },
    { name: 'AS_B1', type: 'ACCESS_SWITCH', layer: 'Access', ipAddress: '10.0.20.1', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000201', topologyId: sdnTopology.id },
    { name: 'AS_C1', type: 'ACCESS_SWITCH', layer: 'Access', ipAddress: '10.0.30.1', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000301', topologyId: sdnTopology.id },
    { name: 'AS_S1', type: 'ACCESS_SWITCH', layer: 'Access', ipAddress: '10.0.40.1', status: 'OFFLINE', openFlowVersion: '1.3', dpId: '0000000000000401', topologyId: sdnTopology.id },
    { name: 'Router-Edge', type: 'ROUTER', layer: 'Edge', ipAddress: '10.0.0.254', status: 'OFFLINE', topologyId: sdnTopology.id },
    { name: 'ERP-Server', type: 'SERVER', layer: 'Server', ipAddress: '10.0.91.10', status: 'OFFLINE', vlanId: 91, topologyId: sdnTopology.id },
    { name: 'HR-Server', type: 'SERVER', layer: 'Server', ipAddress: '10.0.92.10', status: 'OFFLINE', vlanId: 92, topologyId: sdnTopology.id },
    { name: 'Monitoring-Server', type: 'SERVER', layer: 'Server', ipAddress: '10.0.93.10', status: 'OFFLINE', vlanId: 93, topologyId: sdnTopology.id },
    { name: 'IT-Server', type: 'SERVER', layer: 'Server', ipAddress: '10.0.94.10', status: 'OFFLINE', vlanId: 94, topologyId: sdnTopology.id },
    { name: 'VoIP-Server', type: 'SERVER', layer: 'Server', ipAddress: '10.0.10.100', status: 'OFFLINE', topologyId: sdnTopology.id },
    { name: 'DHCP-Server', type: 'SERVER', layer: 'Server', ipAddress: '10.0.5.10', status: 'OFFLINE', vlanId: 5, topologyId: sdnTopology.id },
  ]

  for (const device of sdnDevices) {
    await prisma.device.create({ data: device })
  }

  console.log('Seed completed successfully!')
  console.log('Admin email: admin@amira-capstone.com / password: admin123')
  console.log('Researcher email: researcher@amira-capstone.com / password: researcher123')
  console.log('Panel email: panel@amira-capstone.com / password: panel123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
