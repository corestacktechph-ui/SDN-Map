'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, accentColors } from '@/lib/utils'
import { motion } from 'framer-motion'
import { FlaskConical, Activity, Gauge, Waves, Shield, Play, RotateCcw, Download, BarChart } from 'lucide-react'
import { useTests, useCreateTest, useComparisons } from '@/hooks'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { testService } from '@/services'
import { toast } from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface TestResult {
  metric: string
  traditional: string | number
  sdn: string | number
  improvement: string
}

const testTypes = [
  { id: 'ping', name: 'Ping Test', description: 'Measure ICMP latency and packet loss', icon: Activity, color: 'blue' },
  { id: 'throughput-tcp', name: 'TCP Throughput', description: 'Measure TCP bandwidth using iPerf3 (configurable duration)', icon: Gauge, color: 'purple' },
  { id: 'throughput-udp', name: 'UDP Throughput', description: 'Measure UDP bandwidth with target rate and duration', icon: Gauge, color: 'violet' },
  { id: 'jitter', name: 'UDP Jitter Test', description: 'Measure jitter and packet loss variation', icon: Waves, color: 'emerald' },
  { id: 'failover', name: 'Failover Test', description: 'Measure convergence time after link failure', icon: Shield, color: 'amber' },
]

export default function TestingPage() {
  const [selectedTest, setSelectedTest] = useState('ping')
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { data: tests } = useTests()
  const { data: comparisons } = useComparisons()
  const createTest = useCreateTest()

  const handleRunTest = async () => {
    setIsRunning(true)
    try {
      const tradTopology = await fetch('/api/topology').then(r => r.json()).then(d => d.find((t: { type: string }) => t.type === 'TRADITIONAL'))
      const sdnTopology = await fetch('/api/topology').then(r => r.json()).then(d => d.find((t: { type: string }) => t.type === 'SDN'))

      let tradTest = null
      let sdnTest = null

      if (tradTopology) {
        tradTest = await createTest.mutateAsync({
          name: `${selectedTest.charAt(0).toUpperCase() + selectedTest.slice(1)} Test (Traditional)`,
          type: selectedTest,
          topologyId: tradTopology.id,
          duration: 10,
        })
      }
      if (sdnTopology) {
        sdnTest = await createTest.mutateAsync({
          name: `${selectedTest.charAt(0).toUpperCase() + selectedTest.slice(1)} Test (SDN)`,
          type: selectedTest,
          topologyId: sdnTopology.id,
          duration: 10,
        })
      }

      // Build results from actual DB response
      const results: TestResult[] = []

      if (tradTest?.results && sdnTest?.results) {
        // Match metrics between traditional and SDN
        const tradMetrics = tradTest.results as Array<{ metric: string; value: number; unit: string }>
        const sdnMetrics = sdnTest.results as Array<{ metric: string; value: number; unit: string }>

        for (const tradResult of tradMetrics) {
          const sdnResult = sdnMetrics.find(s => s.metric === tradResult.metric)
          if (sdnResult) {
            const tradVal = tradResult.value
            const sdnVal = sdnResult.value
            const unit = tradResult.unit
            // For throughput, higher is better
            const higherIsBetter = unit === 'Mbps' || unit === 'paths passed'
            const improvement = tradVal !== 0
              ? higherIsBetter
                ? `${(((sdnVal - tradVal) / tradVal) * 100).toFixed(1)}%`
                : `${(((tradVal - sdnVal) / tradVal) * 100).toFixed(1)}%`
              : 'N/A'

            results.push({
              metric: tradResult.metric,
              traditional: `${tradVal} ${unit}`,
              sdn: `${sdnVal} ${unit}`,
              improvement,
            })
          }
        }
      }

      // If no matched results, show a message
      if (results.length === 0) {
        results.push({
          metric: 'Awaiting Mininet Data',
          traditional: '—',
          sdn: '—',
          improvement: 'Run Mininet simulation first',
        })
      }

      setTestResults(results)
      queryClient.invalidateQueries({ queryKey: ['tests'] })
      queryClient.invalidateQueries({ queryKey: ['comparisons'] })
      toast.success('Test completed successfully!')
    } catch {
      toast.error('Test failed. Please try again.')
    } finally {
      setIsRunning(false)
    }
  }

  const handleExport = () => {
    if (testResults.length === 0) return
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width

    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, pageWidth, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.text('Test Results Export', pageWidth / 2, 20, { align: 'center' })

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Test Type: ${selectedTest.toUpperCase()}`, 15, 45)
    doc.text(`Date: ${new Date().toLocaleString()}`, 15, 52)
    doc.text(`User: ${session?.user?.name || 'Unknown'}`, 15, 59)

    const tableData = testResults.map((r) => [r.metric, r.traditional.toString(), r.sdn.toString(), r.improvement])
    autoTable(doc, {
      startY: 70,
      head: [['Metric', 'Traditional', 'SDN', 'Improvement']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
    })

    doc.save(`test_results_${selectedTest}_${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('Report exported as PDF')
  }

  const completedTests = tests?.filter((t) => t.status === 'COMPLETED') || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Testing Center</h1>
          <p className="text-muted-foreground">Run performance tests and compare Traditional vs SDN architectures</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRunTest}
            disabled={isRunning}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isRunning ? <><RotateCcw className="h-4 w-4 animate-spin" /> Running...</> : <><Play className="h-4 w-4" /> Run Test</>}
          </button>
          <button
            onClick={handleExport}
            disabled={testResults.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-transparent px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {testTypes.map((test, i) => {
          const Icon = test.icon
          const isSelected = selectedTest === test.id
          return (
            <motion.div key={test.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <button
                onClick={() => setSelectedTest(test.id)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${isSelected ? 'border-blue-500 bg-blue-500/5' : 'border-border bg-card hover:bg-accent'}`}
              >
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg mb-3', accentColors[test.color as keyof typeof accentColors]?.bg ?? accentColors.blue.bg)}>
                  <Icon className={cn('h-5 w-5', accentColors[test.color as keyof typeof accentColors]?.text ?? accentColors.blue.text)} />
                </div>
                <h3 className="font-medium">{test.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{test.description}</p>
              </button>
            </motion.div>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Source Device</label>
                <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select source...</option>
                  <option value="h1">h1 — Finance (VLAN 10, Block A)</option>
                  <option value="h10">h10 — HR (VLAN 20, Block B)</option>
                  <option value="h19">h19 — Corporate (VLAN 50, Block C)</option>
                  <option value="h7">h7 — Guest A (VLAN 110)</option>
                  <option value="h13">h13 — IT (VLAN 30, Block B)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Target Device</label>
                <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select target...</option>
                  <option value="erp_server">ERP Server (10.3.0.1)</option>
                  <option value="hr_server">HR Server (10.3.0.17)</option>
                  <option value="voip_server">VoIP Server (10.3.0.49)</option>
                  <option value="monitor1">Monitor Server (10.3.0.18)</option>
                  <option value="inet">INET — Internet (198.51.100.100)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Duration (seconds)</label>
              <input type="number" defaultValue={10} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            {selectedTest === 'throughput-udp' && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Target Bandwidth (Mbps)</label>
                <input type="number" defaultValue={50} placeholder="e.g. 50" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <p className="text-[10px] text-muted-foreground mt-1">UDP target rate for iPerf3 (-b flag)</p>
              </div>
            )}
            {selectedTest === 'throughput-tcp' && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-2">
                <p className="text-[10px] text-blue-700 dark:text-blue-300">TCP test runs for the specified duration. iPerf3 will maximize throughput automatically.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedTests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No completed tests yet</p>
            ) : (
              completedTests.slice(0, 5).map((test) => (
                <div key={test.id} className="flex items-center justify-between rounded-lg border p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="text-[8px] px-1">{test.type}</Badge>
                    <span className="truncate max-w-[120px]">{test.name}</span>
                  </div>
                  <span className="text-muted-foreground">{new Date(test.createdAt).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {testResults.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Test Results</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Metric</th>
                      <th className="text-right py-3 px-4 font-medium">Traditional</th>
                      <th className="text-right py-3 px-4 font-medium">SDN</th>
                      <th className="text-right py-3 px-4 font-medium">Improvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.map((result) => (
                      <tr key={result.metric} className="border-b last:border-0">
                        <td className="py-3 px-4">{result.metric}</td>
                        <td className="text-right py-3 px-4 text-muted-foreground">{result.traditional}</td>
                        <td className="text-right py-3 px-4 text-green-500 font-medium">{result.sdn}</td>
                        <td className="text-right py-3 px-4"><Badge variant="success">{result.improvement}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
