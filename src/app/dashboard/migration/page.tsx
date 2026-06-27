'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, Circle, ArrowRight, ChevronLeft, ChevronRight,
  Network, Radio, FlaskConical, Expand, Server, Cpu,
  ShieldCheck, AlertTriangle, Info
} from 'lucide-react'
import MigrationSimulator from '@/components/migration/MigrationSimulator'

const PHASES = [
  {
    id: 0,
    title: 'Phase 0',
    subtitle: 'Baseline LAN',
    icon: Network,
    duration: 'Week 1–2',
    color: 'text-slate-400',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/30',
    badge: 'Baseline',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    objective: 'Establish baseline performance and functionality of the existing hierarchical LAN before introducing SDN.',
    networkState: [
      'ISP → EDGE → CS1 ──── CS2',
      'CS1/CS2 → Distribution Layer (DS_A1/A2, DS_B1/B2, DS_C1/C2, DS_S1/S2)',
      'Distribution → Access Layer (AS_A1, AS_B1, AS_C1, AS_S1)',
      'Access → 27 Hosts + 6 Service Servers',
    ],
    technologies: [
      'Traditional Layer 2 / Layer 3 switching',
      'VLANs (10, 20, 30, 40, 50, 60, 110, 120, 130, 91–94)',
      'OSPF — dynamic routing',
      'VRRP — gateway redundancy',
      'ACLs — service access control',
      'STP — loop prevention',
    ],
    devices: [],
    purpose: [
      'Record baseline metrics: latency, throughput, convergence time, packet loss',
      'Verify all services operate correctly before any migration',
      'Establish go/no-go criteria for each subsequent phase',
    ],
    reason: null,
  },
  {
    id: 1,
    title: 'Phase 1',
    subtitle: 'Deploy Controller',
    icon: Radio,
    duration: 'Week 3–5',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
    badge: 'Monitor-Only',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    objective: 'Introduce centralized control without changing production forwarding.',
    networkState: [
      'Ryu Controller added — monitor-only mode',
      'Controller discovers topology via LLDP',
      'OpenFlow sessions established with all switches',
      'Zero changes to existing forwarding behavior',
    ],
    technologies: [
      'Ryu SDN Controller (Python, OpenFlow 1.3)',
      'OpenFlow management connectivity',
      'LLDP topology discovery',
    ],
    devices: [
      { name: 'Ryu Controller', role: 'Added — monitor-only', type: 'new' },
    ],
    purpose: [
      'Validate controller communication with all switches',
      'Discover full network topology',
      'Establish OpenFlow sessions',
      'Confirm zero impact on production traffic',
    ],
    reason: 'Existing functions remain fully unchanged: Routing, VLANs, ACLs, STP, VRRP.',
  },
  {
    id: 2,
    title: 'Phase 2',
    subtitle: 'Block C Pilot',
    icon: FlaskConical,
    duration: 'Week 6–9',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
    badge: 'Pilot',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    objective: 'Migrate Block C as pilot. Least-critical block — if something fails, only Block C is affected.',
    networkState: [
      'CS1 and CS2 — remain traditional (unchanged)',
      'DS_C1, DS_C2 → Fabric Nodes (OpenFlow)',
      'AS_C1 → Fabric Edge (OpenFlow)',
      'Hosts h19–h27 on VLANs 50, 60, 130',
    ],
    technologies: [
      'OpenFlow forwarding on Block C switches',
      'VN_CORPORATE → mapped from VLAN 50',
      'VN_TRAINING → mapped from VLAN 60',
      'VN_GUESTC → mapped from VLAN 130',
      'Controller-based failover',
      'Centralized ACLs for Block C',
    ],
    devices: [
      { name: 'AS_C1', role: 'Fabric Edge', type: 'migrated' },
      { name: 'DS_C1', role: 'Fabric Node', type: 'migrated' },
      { name: 'DS_C2', role: 'Fabric Node', type: 'migrated' },
    ],
    purpose: [
      'Validate OpenFlow forwarding in a live environment',
      'Test VLAN-to-Virtual Network mapping',
      'Verify controller-based failover works',
      'Train staff on SDN operations with real traffic',
    ],
    reason: 'Block C hosts Corporate Affairs and Training — non-critical services. Easy rollback. Rest of campus remains fully operational.',
  },
  {
    id: 3,
    title: 'Phase 3',
    subtitle: 'Blocks A & B',
    icon: Expand,
    duration: 'Week 10–11',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30',
    badge: '70–80% Migrated',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    objective: 'Expand SDN fabric to Blocks A and B after Block C pilot is validated.',
    networkState: [
      'CS1 and CS2 — still traditional (unchanged)',
      'Block A: DS_A1, DS_A2, AS_A1 → SDN',
      'Block B: DS_B1, DS_B2, AS_B1 → SDN',
      'Block C: Already SDN from Phase 2',
      '~70–80% of campus migrated. Core still stable.',
    ],
    technologies: [
      'VN_FINANCE → VLAN 10 (Block A)',
      'VN_COMPLIANCE → VLAN 40 (Block A)',
      'VN_GUESTA → VLAN 110 (Block A)',
      'VN_HR → VLAN 20 (Block B)',
      'VN_IT → VLAN 30 (Block B)',
      'VN_GUESTB → VLAN 120 (Block B)',
      'Centralized policy enforcement across A, B, C',
      'Dynamic path computation within SDN domain',
    ],
    devices: [
      { name: 'AS_A1', role: 'Fabric Edge', type: 'migrated' },
      { name: 'DS_A1', role: 'Fabric Node', type: 'migrated' },
      { name: 'DS_A2', role: 'Fabric Node', type: 'migrated' },
      { name: 'AS_B1', role: 'Fabric Edge', type: 'migrated' },
      { name: 'DS_B1', role: 'Fabric Node', type: 'migrated' },
      { name: 'DS_B2', role: 'Fabric Node', type: 'migrated' },
    ],
    purpose: [
      'Migrate Finance, Compliance, HR, IT user blocks',
      'Enable consistent VLAN-to-VN mapping across all user blocks',
      'Controller manages all user traffic centrally',
      'Validate before touching the Services block',
    ],
    reason: 'Core remains unchanged — if Blocks A/B migration fails, services remain unaffected.',
  },
  {
    id: 4,
    title: 'Phase 4',
    subtitle: 'Services Block',
    icon: Server,
    duration: 'Week 12',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/30',
    badge: 'Critical Services',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    objective: 'Migrate the Services Block — ERP, HR, IT, VoIP, DHCP, Monitoring.',
    networkState: [
      'CS1 and CS2 — still traditional (last unchanged block)',
      'DS_S1, DS_S2, AS_S1 → SDN',
      'All service VLANs (91–94) under controller management',
      'Centralized ACLs replace all distributed per-switch ACLs',
    ],
    technologies: [
      'VN_ERP → VLAN 91 (erp1: 10.3.0.10)',
      'VN_HR_SVC → VLAN 92 (hr1: 10.3.0.20, monitor1: 10.3.0.21)',
      'VN_IT_SVC → VLAN 93 (it1: 10.3.0.40)',
      'VN_COLLAB → VLAN 94 (voip1: 10.3.0.50, dhcp1: 10.3.0.51)',
      'Controller-distributed OpenFlow ACL rules',
    ],
    devices: [
      { name: 'AS_S1', role: 'Fabric Edge', type: 'migrated' },
      { name: 'DS_S1', role: 'Fabric Node', type: 'migrated' },
      { name: 'DS_S2', role: 'Fabric Node', type: 'migrated' },
    ],
    purpose: [
      'Replace distributed ACLs with centralized controller policies',
      'Guest VLANs (110/120/130) → DENY all service access enforced at controller',
      'User VLANs (10–60) → ALLOW per service ACL rules',
      'Security policies become consistent and centralized across the entire fabric',
    ],
    reason: 'User fabric (Blocks A, B, C) already validated — safe to migrate services now.',
  },
  {
    id: 5,
    title: 'Phase 5',
    subtitle: 'Core Migration',
    icon: Cpu,
    duration: 'Week 13',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/30',
    badge: 'Final Phase',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    objective: 'Migrate CS1 and CS2 — final step. Entire network becomes a fully controller-managed SDN fabric.',
    networkState: [
      'CS1 → SDN Fabric Core',
      'CS2 → SDN Fabric Core',
      'Full SDN fabric: Core + Distribution + Access all OpenFlow',
      'Ryu Controller manages the entire physical infrastructure',
    ],
    technologies: [
      'Controller: Topology discovery, flow installation, path computation',
      'Controller: Traffic engineering, QoS, ACL enforcement',
      'Controller: Monitoring and failure recovery',
      'STP → replaced by Controller-managed loop-free forwarding',
      'VRRP → replaced by Controller-managed distributed gateway',
      'OSPF → replaced by Centralized flow management',
      'Manual config → Centralized automation via REST API',
    ],
    devices: [
      { name: 'CS1', role: 'SDN Fabric Core', type: 'migrated' },
      { name: 'CS2', role: 'SDN Fabric Core', type: 'migrated' },
    ],
    purpose: [
      'Complete the SDN fabric — every switch under controller management',
      'Enable end-to-end flow installation from controller',
      'Activate full controller telemetry and monitoring',
      'Decommission OSPF, VRRP, STP — replaced by controller functions',
    ],
    reason: 'Core migrated LAST — pilot, user blocks, and service blocks are all validated before touching the backbone.',
  },
]

const TECH_MAPPING = [
  { traditional: 'CS1 / CS2 Core Routers', sdn: 'SDN Fabric Core' },
  { traditional: 'DS_A–DS_S Distribution', sdn: 'Fabric Nodes' },
  { traditional: 'AS_A–AS_S Access', sdn: 'Fabric Edge Nodes' },
  { traditional: 'VLANs', sdn: 'Virtual Networks (VN_*)' },
  { traditional: 'ACLs (per-switch)', sdn: 'Controller OpenFlow policies' },
  { traditional: 'Distributed forwarding', sdn: 'Centralized flow management' },
  { traditional: 'STP', sdn: 'Controller loop-free forwarding' },
  { traditional: 'VRRP', sdn: 'Controller distributed gateway' },
  { traditional: 'Manual configuration', sdn: 'Centralized automation' },
  { traditional: 'Distributed monitoring', sdn: 'Controller telemetry' },
]

export default function MigrationPage() {
  const [activePhase, setActivePhase] = useState(0)
  const [showMapping, setShowMapping] = useState(false)

  const phase = PHASES[activePhase]
  const Icon = phase.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SDN Migration Model</h1>
          <p className="text-muted-foreground text-sm">
            6-phase block-by-block migration — Baseline → Controller → Block C → A&B → Services → Core
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowMapping(!showMapping)}>
          <ArrowRight className="h-4 w-4 mr-1" />
          {showMapping ? 'Hide' : 'Tech'} Mapping
        </Button>
      </div>

      {/* Migration Simulator */}
      <MigrationSimulator />

      {/* Tech Mapping Table */}
      <AnimatePresence>
        {showMapping && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Final Technology Mapping — Traditional → SDN</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="font-medium text-muted-foreground border-b pb-1 mb-1">Original Hierarchical Network</div>
                  <div className="font-medium text-muted-foreground border-b pb-1 mb-1">Final SDN Architecture</div>
                  {TECH_MAPPING.map((row, i) => (
                    <>
                      <div key={`t-${i}`} className="py-1 text-muted-foreground">{row.traditional}</div>
                      <div key={`s-${i}`} className="py-1 text-emerald-400 font-medium">{row.sdn}</div>
                    </>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase Timeline */}
      <Card>
        <CardContent className="pt-6 pb-4">
          <div className="flex items-start gap-1">
            {PHASES.map((p, i) => (
              <div key={p.id} className="flex-1 flex flex-col items-center gap-1">
                {/* Connector line */}
                <div className="flex items-center w-full">
                  <div className={cn('flex-1 h-px', i === 0 ? 'bg-transparent' : i <= activePhase ? 'bg-emerald-500/50' : 'bg-muted')} />
                  <button
                    onClick={() => setActivePhase(i)}
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2 shrink-0',
                      i === activePhase
                        ? `${p.bg} ${p.border} scale-110 shadow-lg`
                        : i < activePhase
                        ? 'bg-emerald-500/20 border-emerald-500/50'
                        : 'bg-muted border-muted-foreground/20'
                    )}
                  >
                    {i < activePhase ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <p.icon className={cn('h-4 w-4', i === activePhase ? p.color : 'text-muted-foreground')} />
                    )}
                  </button>
                  <div className={cn('flex-1 h-px', i >= PHASES.length - 1 ? 'bg-transparent' : i < activePhase ? 'bg-emerald-500/50' : 'bg-muted')} />
                </div>
                <span className={cn('text-[9px] text-center font-semibold leading-tight', i === activePhase ? p.color : 'text-muted-foreground')}>
                  {p.title}
                </span>
                <span className="text-[8px] text-muted-foreground text-center leading-tight">{p.subtitle}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Phase Detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePhase}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25 }}
          className="grid gap-4 md:grid-cols-3"
        >
          {/* Main card */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg shrink-0', phase.bg)}>
                  <Icon className={cn('h-5 w-5', phase.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">{phase.title}: {phase.subtitle}</CardTitle>
                    <Badge variant="outline" className={cn('text-[10px]', phase.badgeColor)}>{phase.badge}</Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">{phase.duration}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{phase.objective}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Network State */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Network State</p>
                <div className="space-y-1">
                  {phase.networkState.map((line, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <div className={cn('w-1.5 h-1.5 rounded-full mt-1 shrink-0', phase.color.replace('text-', 'bg-'))} />
                      <span className="text-muted-foreground font-mono">{line}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technologies */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {activePhase === 0 ? 'Technologies In Use' : 'SDN Functions Introduced'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {phase.technologies.map((tech, i) => (
                    <span key={i} className={cn('text-[10px] px-2 py-0.5 rounded-full border', phase.bg, phase.border, phase.color)}>
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Purpose */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Purpose</p>
                <div className="space-y-1">
                  {phase.purpose.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason / Rationale */}
              {phase.reason && (
                <div className={cn('rounded-lg border p-3', phase.bg, phase.border)}>
                  <div className="flex items-start gap-2">
                    <Info className={cn('h-4 w-4 shrink-0 mt-0.5', phase.color)} />
                    <p className={cn('text-xs', phase.color)}>{phase.reason}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Side card — Devices */}
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Devices Migrated</CardTitle>
              </CardHeader>
              <CardContent>
                {phase.devices.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Circle className="h-3 w-3" />
                    <span>No devices migrated this phase</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {phase.devices.map((d, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            d.type === 'new' ? 'bg-blue-400' : 'bg-emerald-400'
                          )} />
                          <span className="text-xs font-mono font-medium">{d.name}</span>
                        </div>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', phase.bg, phase.border, phase.color)}>
                          {d.role}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Migration order rationale */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Migration Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {[
                  { phase: 'Ph 0', label: 'Baseline validation', done: activePhase > 0 },
                  { phase: 'Ph 1', label: 'Controller (no traffic change)', done: activePhase > 1 },
                  { phase: 'Ph 2', label: 'Block C — least critical', done: activePhase > 2 },
                  { phase: 'Ph 3', label: 'Blocks A & B — user blocks', done: activePhase > 3 },
                  { phase: 'Ph 4', label: 'Services Block', done: activePhase > 4 },
                  { phase: 'Ph 5', label: 'Core — last of all', done: false },
                ].map((item, i) => (
                  <div key={i} className={cn(
                    'flex items-center gap-2 text-[10px] rounded px-2 py-1',
                    i === activePhase ? `${phase.bg} ${phase.color} font-semibold` : 'text-muted-foreground'
                  )}>
                    {item.done ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    ) : i === activePhase ? (
                      <div className={cn('w-2 h-2 rounded-full animate-pulse shrink-0', phase.color.replace('text-', 'bg-'))} />
                    ) : (
                      <Circle className="h-3 w-3 shrink-0" />
                    )}
                    <span className="font-mono">{item.phase}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline" size="sm"
          onClick={() => setActivePhase(Math.max(0, activePhase - 1))}
          disabled={activePhase === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <div className="flex items-center gap-1.5">
          {PHASES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActivePhase(i)}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                i === activePhase ? 'bg-white scale-125' : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'
              )}
            />
          ))}
        </div>
        <Button
          variant="outline" size="sm"
          onClick={() => setActivePhase(Math.min(PHASES.length - 1, activePhase + 1))}
          disabled={activePhase === PHASES.length - 1}
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Bottom rationale strip */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className={cn('rounded-lg border p-3', phase.bg, phase.border)}>
            <p className={cn('text-xs font-semibold mb-1', phase.color)}>Why this order?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Baseline first — no migration without a validated starting point.
              Controller second — prove communication before changing forwarding.
              Block C third — pilot on the least critical block, rest of campus unaffected.
              Blocks A &amp; B fourth — expand after pilot success, core still safe.
              Services fifth — user fabric validated before touching critical servers.
              Core last — only after the entire SDN fabric has been proven end-to-end.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
