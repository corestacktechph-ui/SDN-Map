'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { Clock, Settings, Wrench, BarChart3, Activity, Shield, Users, DollarSign, CheckCircle2, XCircle } from 'lucide-react'

const taskData = [
  { task: 'Add VLAN', traditional: 17.5, sdn: 2.5, unit: 'min', savings: 86 },
  { task: 'Update Routing', traditional: 12.5, sdn: 1.5, unit: 'min', savings: 88 },
  { task: 'Apply ACLs', traditional: 25, sdn: 6.5, unit: 'min', savings: 74 },
  { task: 'QoS Config', traditional: 30, sdn: 4, unit: 'min', savings: 87 },
  { task: 'Failover Setup', traditional: 37.5, sdn: 7.5, unit: 'min', savings: 80 },
  { task: 'Troubleshoot', traditional: 45, sdn: 15, unit: 'min', savings: 67 },
  { task: 'Monitoring', traditional: 17.5, sdn: 2.5, unit: 'min', savings: 86 },
  { task: 'Backup Config', traditional: 90, sdn: 10, unit: 'min', savings: 89 },
]

const manageabilityRadar = [
  { category: 'Configuration Ease', traditional: 3, sdn: 9 },
  { category: 'Troubleshooting', traditional: 3, sdn: 8 },
  { category: 'Monitoring', traditional: 4, sdn: 9 },
  { category: 'Automation', traditional: 2, sdn: 9 },
  { category: 'Scalability', traditional: 4, sdn: 8 },
  { category: 'Security Mgmt', traditional: 4, sdn: 7 },
  { category: 'Documentation', traditional: 5, sdn: 8 },
  { category: 'Staff Efficiency', traditional: 3, sdn: 7 },
]

const costData = [
  { category: 'Staff (Monthly)', traditional: 45000, sdn: 15000, unit: 'PHP' },
  { category: 'Config Time/Day', traditional: 345, sdn: 80, unit: 'min' },
  { category: 'Troubleshoot/Week', traditional: 300, sdn: 75, unit: 'min' },
  { category: 'Devices to Manage', traditional: 42, sdn: 1, unit: 'count' },
  { category: 'Error Incidents/Month', traditional: 12, sdn: 2, unit: 'incidents' },
]

const scenarioSteps = [
  {
    title: 'Add New Department VLAN',
    traditional: [
      'SSH into 18 switches individually',
      'Configure VLAN 140 on each',
      'Assign ports per switch',
      'Configure inter-VLAN routing on distribution layer',
      'Update OSPF on all routers',
      'Configure VRRP for each pair',
      'Update DHCP server scope',
      'Update ACLs on each switch',
      'Save config on all 18 devices',
      'Total: ~18 min',
    ],
    sdn: [
      'Open Ryu management console',
      'POST VLAN config to REST API',
      'Auto-propagate to all switches',
      'SDN controller handles routing',
      'Centralized policy update',
      'DHCP auto-configured',
      'ACL updated centrally',
      'Config saved automatically',
      'Verify via dashboard',
      'Total: ~2.5 min',
    ],
  },
  {
    title: 'Network Outage Recovery',
    traditional: [
      'Identify failed device manually',
      'SSH into adjacent devices',
      'Check routing tables',
      'Update OSPF metrics',
      'Adjust VRRP priorities',
      'Verify traffic flow',
      'Troubleshoot remaining issues',
      'Update documentation',
      'Escalate if needed',
      'Total: ~45 min',
    ],
    sdn: [
      'Controller detects failure instantly',
      'Flow rerouted automatically',
      'Notification appears on dashboard',
      'Verify new path in flow table',
      'No manual intervention needed',
      'Auto-generated incident report',
      'Logs updated centrally',
      'Root cause analysis auto',
      'Documentation auto-updated',
      'Total: ~10 min',
    ],
  },
]

export default function ManageabilityPage() {
  const [selectedScenario, setSelectedScenario] = useState(0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manageability Comparison</h1>
        <p className="text-muted-foreground">Side-by-side analysis of Traditional vs SDN network management efficiency</p>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks"><Clock className="h-4 w-4 mr-2" />Task Comparison</TabsTrigger>
          <TabsTrigger value="radar"><BarChart3 className="h-4 w-4 mr-2" />Capability Radar</TabsTrigger>
          <TabsTrigger value="cost"><DollarSign className="h-4 w-4 mr-2" />Cost & Effort</TabsTrigger>
          <TabsTrigger value="scenarios"><Wrench className="h-4 w-4 mr-2" />Real Scenarios</TabsTrigger>
        </TabsList>

        {/* Task Comparison */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration Time Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={taskData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <YAxis dataKey="task" type="category" tick={{ fontSize: 11 }} stroke="#9CA3AF" width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="traditional" name="Traditional (min)" fill="#EF4444" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="sdn" name="SDN (min)" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-4">
            {taskData.slice(0, 4).map((t, i) => (
              <motion.div key={t.task} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">{t.task}</span>
                      <Badge variant="default" className="bg-green-500">{t.savings}% faster</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-500">Trad: {t.traditional}{t.unit === 'min' ? 'm' : ''}</span>
                      <span className="text-emerald-500">SDN: {t.sdn}{t.unit === 'min' ? 'm' : ''}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Radar */}
        <TabsContent value="radar">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Capability Comparison (1-10)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={manageabilityRadar}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                    <Radar name="Traditional" dataKey="traditional" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} />
                    <Radar name="SDN" dataKey="sdn" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                    <Legend />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: 8 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Card>
                <CardHeader><CardTitle className="text-sm">Key Advantages</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { icon: Settings, label: 'Centralized Management', desc: 'Single pane of glass for all 42 devices' },
                    { icon: Activity, label: 'Automated Provisioning', desc: 'Zero-touch configuration via REST API' },
                    { icon: Shield, label: 'Policy Consistency', desc: 'ACLs/QoS applied network-wide instantly' },
                    { icon: Clock, label: 'Faster Troubleshooting', desc: '67-75% reduction in mean time to resolve' },
                    { icon: Users, label: 'Reduced Staff Needs', desc: '3 technicians → 1 with SDN orchestration' },
                    { icon: DollarSign, label: 'Lower OPEX', desc: '60-85% reduction in operational overhead' },
                  ].map((item, i) => {
                    const Icon = item.icon
                    return (
                      <motion.div key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-3 rounded-lg border p-2.5"
                      >
                        <Icon className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                        <div>
                          <p className="text-xs font-medium">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Cost & Effort */}
        <TabsContent value="cost">
          <Card>
            <CardHeader><CardTitle className="text-lg">Operational Cost & Effort Comparison</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costData.map((item, i) => (
                  <motion.div key={item.category} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{item.category}</span>
                      <span className="text-xs text-muted-foreground">{item.unit}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-red-500">Traditional: {item.traditional}</span>
                          <span className="text-emerald-500">SDN: {item.sdn}</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-red-500/60 rounded-full float-left" style={{ width: `${(item.traditional / (item.traditional + item.sdn)) * 100}%` }} />
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden mt-0.5">
                          <div className="h-full bg-emerald-500/60 rounded-full float-left" style={{ width: `${(item.sdn / (item.traditional + item.sdn)) * 100}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="default" className="bg-green-500 text-xs">
                          {Math.round(((item.traditional - item.sdn) / item.traditional) * 100)}% less
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Real Scenarios */}
        <TabsContent value="scenarios">
          <div className="flex gap-2 mb-4">
            {scenarioSteps.map((s, i) => (
              <button key={i} onClick={() => setSelectedScenario(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedScenario === i ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
              >
                {s.title}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Traditional Network
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {scenarioSteps[selectedScenario].traditional.map((step, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-muted-foreground">{step}</span>
                    </motion.li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  SDN Network
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {scenarioSteps[selectedScenario].sdn.map((step, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-muted-foreground">{step}</span>
                    </motion.li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 p-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Verdict</p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  SDN demonstrates 80-90% reduction in operational complexity. Centralized management eliminates the need for device-by-device configuration, reduces human error, and enables rapid network changes. The controller-based architecture transforms network management from a reactive, manual process to a proactive, automated one.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
