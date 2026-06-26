'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Layers, Database, Code2, Map, Users2, Clock, Target, X } from 'lucide-react'

const ROWS = [
  { id: 1, label: 'Contextual', perspective: 'Scope', stakeholder: 'Executive', icon: Layers, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { id: 2, label: 'Conceptual', perspective: 'Business', stakeholder: 'Owner', icon: Database, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { id: 3, label: 'Logical', perspective: 'System', stakeholder: 'Architect', icon: Code2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { id: 4, label: 'Physical', perspective: 'Technology', stakeholder: 'Designer', icon: Map, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { id: 5, label: 'Detailed', perspective: 'Configuration', stakeholder: 'Implementer', icon: Users2, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  { id: 6, label: 'Functioning', perspective: 'Operation', stakeholder: 'User', icon: Clock, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
]

const COLUMNS = [
  { id: 'what', label: 'What', question: 'Data', icon: Database, color: 'text-sky-500' },
  { id: 'how', label: 'How', question: 'Function', icon: Code2, color: 'text-green-500' },
  { id: 'where', label: 'Where', question: 'Network', icon: Map, color: 'text-purple-500' },
  { id: 'who', label: 'Who', question: 'People', icon: Users2, color: 'text-orange-500' },
  { id: 'when', label: 'When', question: 'Time', icon: Clock, color: 'text-rose-500' },
  { id: 'why', label: 'Why', question: 'Motivation', icon: Target, color: 'text-amber-500' },
]

// Zachman matrix data — 36 cells
const MATRIX: Record<number, Record<string, { title: string; content: string; status: 'complete' | 'partial' | 'planned' }>> = {
  1: {
    what: { title: 'Network Entities', content: '14 VLANs, 27 hosts, 6 services, 42 devices, 100+ users. Documented in network inventory and service catalog.', status: 'complete' },
    how: { title: 'Business Processes', content: 'Network provisioning, service delivery, security enforcement, troubleshooting, configuration management.', status: 'complete' },
    where: { title: 'Enterprise Sites', content: 'Single campus, 3 buildings, data center. 1 remote site planned for Phase 2.', status: 'complete' },
    who: { title: 'Stakeholders', content: 'CIO, IT Manager, Network Team (3 engineers), Security Team, End Users (100+). RACI matrix defined.', status: 'complete' },
    when: { title: 'Project Timeline', content: '16 weeks total: Q2 2026. Assessment (2w), Preparation (2w), Pilot (4w), Migration (4w), Validation (2w), Decommission (2w).', status: 'complete' },
    why: { title: 'Business Goals', content: 'Reduce IT costs by 40%, improve network agility, enable automation, competitive advantage, digital transformation readiness.', status: 'complete' },
  },
  2: {
    what: { title: 'Data Flows', content: 'User-to-service (VLAN-based), Service-to-service, Guest-to-Internet, Inter-VLAN routing, Internet egress. Mapped in data flow diagrams.', status: 'complete' },
    how: { title: 'Use Cases', content: 'UC1: Add VLAN, UC2: Apply ACL, UC3: Failover, UC4: QoS Policy, UC5: Troubleshoot, UC6: Monitor, UC7: Generate Reports.', status: 'complete' },
    where: { title: 'Network Topology', content: 'Hierarchical 3-tier: Core (2 switches), Distribution (8), Access (18). Logical groups: Finance, HR/IT, Corporate, Service blocks.', status: 'complete' },
    who: { title: 'Roles & Responsibilities', content: 'Network Engineer (design/configure/monitor), System Admin (servers), Security Analyst (policies), End Users (service consumers).', status: 'complete' },
    when: { title: 'Milestones', content: 'Week 2: Assessment, Week 4: Design approved, Week 8: Pilot complete, Week 12: Migration done, Week 14: Validation, Week 16: Decommission.', status: 'complete' },
    why: { title: 'Business Objectives', content: '80% faster provisioning, 75% fewer outages, 50% cost savings, 90% faster changes, centralized control. User satisfaction >90%, zero security incidents.', status: 'complete' },
  },
  3: {
    what: { title: 'Data Models', content: 'VLAN schema, IP addressing (10.0.0.0/16), ACL rules, QoS classes, routing tables. ER diagrams with entity relationships and cardinality.', status: 'complete' },
    how: { title: 'Activity Diagrams', content: 'Provisioning flow: Request → Design → Configure → Test → Deploy → Document. Failover flow: Detect → Calculate → Push → Verify → Alert.', status: 'complete' },
    where: { title: 'Logical Topology', content: 'Traditional: OSPF area 0, VRRP, STP per VLAN. SDN: OpenFlow 1.3, centralized control, flow-based forwarding. REST API vs CLI comparison.', status: 'complete' },
    who: { title: 'Org Structure', content: 'Network Ops (team lead + 2 engineers + 1 admin), SDN Team (controller admin + API developer), Management (PM + change mgmt).', status: 'complete' },
    when: { title: 'Project Schedule', content: 'Phase 1 (W1-2): Audit & baseline. Phase 2 (W3-4): Design & train. Phase 3 (W5-8): Block C pilot. Phase 4 (W9-12): Full migration.', status: 'complete' },
    why: { title: 'Business Rules', content: '10 business rules: VLAN isolation, Finance-only ERP, guest blocking, service ACLs, auto-failover <2s, zero-touch provisioning, audit trail, policy QoS, RBAC, config as code.', status: 'complete' },
  },
  4: {
    what: { title: 'Physical Schema', content: 'Database: SQLite with Prisma ORM. Models: User, Topology, Device, Controller, FlowEntry, Link, PerformanceTest, Report, Notification, Alert, Log.', status: 'complete' },
    how: { title: 'Program Design', content: 'Ryu SDN Controller framework. Next.js 14 app with TypeScript, React Query, Prisma. Mininet network simulation. Socket.IO real-time events.', status: 'complete' },
    where: { title: 'Physical Topology', content: '18 OpenFlow switches (Huawei/HP/Aruba), 1 Gbps links, dedicated management VLAN. Docker containers for controller + monitoring + simulation.', status: 'complete' },
    who: { title: 'System Interfaces', content: 'Ryu REST API (port 8080), NextAuth (authentication), Prisma (database ORM), Socket.IO (port 3001), Mininet (network simulation API).', status: 'complete' },
    when: { title: 'Timing Diagram', content: 'SDN latency: 3-14ms vs Traditional 8-32ms. SDN throughput: 935-1015 Mbps vs 770-890 Mbps. SDN recovery: 900-1500ms vs 6500-10500ms.', status: 'complete' },
    why: { title: 'Design Rules', content: 'DR1: OpenFlow 1.3+, DR2: 1 Gbps minimum, DR3: <15ms latency budget, DR4: Controller redundancy, DR5: REST-first API design, DR6: Zero-trust security.', status: 'complete' },
  },
  5: {
    what: { title: 'Data Definitions', content: 'SQL schema definitions, Prisma migrations, seed data scripts. Data dictionary with all field types, constraints, and relationships documented.', status: 'complete' },
    how: { title: 'Code Implementation', content: 'TypeScript services (10 files), React hooks (7 files), Zustand store, API routes (18 endpoints), Mininet Python scripts (5 scripts), Ryu controller apps.', status: 'complete' },
    where: { title: 'Network Configuration', content: 'OVS bridge configuration, OpenFlow table pipeline, flow rule specifications, QoS queue configuration, VLAN-to-bridge mappings, port configurations.', status: 'partial' },
    who: { title: 'Security Policies', content: 'Role-based access (ADMIN/RESEARCHER/PANEL_MEMBER), NextAuth JWT authentication, API route protection, middleware for admin-only routes, password hashing with bcrypt.', status: 'complete' },
    when: { title: 'Event Sequences', content: 'Packet-in event processing, flow table miss handling, port status change events, switch join/leave sequences, failover event chain.', status: 'partial' },
    why: { title: 'Rule Specifications', content: 'VLAN ACL rules (finance isolation, guest restrictions), QoS classification rules (VoIP high priority, ERP medium), failover trigger conditions, monitoring thresholds.', status: 'complete' },
  },
  6: {
    what: { title: 'Actual Data', content: 'Production traffic flows, performance test results stored in SQLite, real-time monitoring metrics via Socket.IO, user activity audit logs.', status: 'complete' },
    how: { title: 'Working System', content: 'Next.js dashboard with 11 pages, real-time topology monitoring, automated test execution, PDF/CSV/Excel export, WebSocket live metrics.', status: 'complete' },
    where: { title: 'Deployed Network', content: 'Docker containers (Next.js app, PostgreSQL, Ryu controller, Mininet, Nginx). Local development on port 3000. Production: 80/443 via Nginx.', status: 'partial' },
    who: { title: 'Trained Users', content: 'Admin user, Researcher accounts, Panel Member accounts. Training materials in documentation. User manual generated from UI help sections.', status: 'partial' },
    when: { title: 'Operating Schedule', content: '24/7 monitoring with real-time alerts. Tests run on-demand. Reports generated weekly. Performance comparisons after each test cycle.', status: 'complete' },
    why: { title: 'Achieved Goals', content: 'SDN shows 48-61% latency improvement, 13-16% throughput increase, 80-87% packet loss reduction, 85% faster failover, 71-74% jitter reduction.', status: 'complete' },
  },
}

const STATUS_ORDER = { complete: 0, partial: 1, planned: 2 }
const STATUS_COLORS = { complete: 'bg-green-500/20 border-green-500/50 text-green-400', partial: 'bg-amber-500/20 border-amber-500/50 text-amber-400', planned: 'bg-gray-500/20 border-gray-500/50 text-gray-400' }

export default function ZachmanPage() {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string } | null>(null)

  const completed = Object.values(MATRIX).flatMap((row) => Object.values(row)).filter((c) => c.status === 'complete').length
  const total = 36

  const selectedData = selectedCell ? MATRIX[selectedCell.row]?.[selectedCell.col] : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Zachman EA Framework</h1>
          <p className="text-muted-foreground">Enterprise Architecture mapping for SDN Migration — 6x6 matrix</p>
        </div>
        <div className="flex items-center gap-3">
          {(['complete', 'partial', 'planned'] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={cn('inline-block h-2.5 w-2.5 rounded-full', s === 'complete' ? 'bg-green-500' : s === 'partial' ? 'bg-amber-500' : 'bg-gray-500')} />
              <span className="text-xs text-muted-foreground capitalize">{s}</span>
            </div>
          ))}
          <Badge variant="outline" className="text-xs">{completed}/{total} cells</Badge>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Column Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            <div className="p-2" /> {/* Empty top-left */}
            {COLUMNS.map((col) => {
              const Icon = col.icon
              return (
                <div key={col.id} className={cn('text-center p-2 rounded-lg border', col.color)}>
                  <Icon className="h-4 w-4 mx-auto mb-0.5" />
                  <div className="text-xs font-bold">{col.label}</div>
                  <div className="text-[9px] opacity-70">{col.question}</div>
                </div>
              )
            })}
          </div>

          {/* Rows */}
          {ROWS.map((row) => {
            const RowIcon = row.icon
            return (
              <div key={row.id} className="grid grid-cols-7 gap-1 mb-1">
                {/* Row Header */}
                <div className={cn('flex items-center gap-2 p-2 rounded-lg border', row.border, row.bg)}>
                  <RowIcon className={cn('h-4 w-4 shrink-0', row.color)} />
                  <div className="min-w-0">
                    <div className={cn('text-xs font-bold leading-tight', row.color)}>{row.label}</div>
                    <div className="text-[9px] text-muted-foreground leading-tight">{row.perspective}</div>
                    <div className="text-[8px] text-muted-foreground">{row.stakeholder}</div>
                  </div>
                </div>

                {/* Cells */}
                {COLUMNS.map((col) => {
                  const cell = MATRIX[row.id]?.[col.id]
                  if (!cell) return <div key={col.id} className="rounded-lg border border-dashed p-2 min-h-[70px]" />
                  return (
                    <button key={col.id} onClick={() => setSelectedCell({ row: row.id, col: col.id })}
                      className={cn(
                        'rounded-lg border p-2 text-left transition-all duration-200 min-h-[70px]',
                        STATUS_COLORS[cell.status],
                        selectedCell?.row === row.id && selectedCell?.col === col.id ? 'ring-2 ring-primary scale-[1.02]' : 'hover:scale-[1.02]'
                      )}
                    >
                      <div className="text-[10px] font-semibold leading-tight mb-0.5">{cell.title}</div>
                      <div className="text-[8px] opacity-70 line-clamp-2">{cell.content}</div>
                      <div className={cn('text-[7px] uppercase tracking-wider mt-1 font-medium', cell.status === 'complete' ? 'text-green-400' : cell.status === 'partial' ? 'text-amber-400' : 'text-gray-400')}>
                        {cell.status}
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Cell Detail Modal */}
      <AnimatePresence>
        {selectedCell && selectedData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl"
            >
              <button onClick={() => setSelectedCell(null)} className="absolute top-3 right-3 p-1 rounded-md hover:bg-accent">
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', ROWS[selectedCell.row - 1]?.bg || '')}>
                  {(() => { const Icon = ROWS[selectedCell.row - 1]?.icon || Target; return <Icon className={cn('h-5 w-5', ROWS[selectedCell.row - 1]?.color || '')} /> })()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{selectedData.title}</h3>
                    <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[selectedData.status])}>{selectedData.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ROWS[selectedCell.row - 1]?.label} ({ROWS[selectedCell.row - 1]?.perspective}) × {COLUMNS.find((c) => c.id === selectedCell.col)?.question}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{selectedData.content}</p>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                <span>Row: {ROWS[selectedCell.row - 1]?.stakeholder} perspective</span>
                <span>Column: {COLUMNS.find((c) => c.id === selectedCell.col)?.question}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950 p-3">
            <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Framework Coverage: {Math.round((completed / total) * 100)}%</p>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
              The Zachman Framework provides a comprehensive enterprise architecture view of the SDN migration project.
              {completed}/36 cells are fully documented, covering all 6 perspectives (Executive, Business, Architect, Designer, Implementer, User)
              across all 6 interrogatives (Data, Function, Network, People, Time, Motivation).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
