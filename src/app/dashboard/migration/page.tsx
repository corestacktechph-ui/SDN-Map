'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, ArrowRight, Clock, Target, AlertTriangle, FlaskConical, Rocket, CheckSquare, ChevronLeft, ChevronRight, Calendar, BarChart3, Network, Shield, Wrench } from 'lucide-react'

const PHASES = [
  {
    id: 1, title: 'Assessment', icon: Target, duration: 'Week 1-2', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30',
    description: 'Comprehensive evaluation of existing traditional network infrastructure, identifying all devices, configurations, traffic patterns, and dependencies.',
    tasks: [
      'Network inventory audit — catalog all 42 devices',
      'Document current topology (Core/Distribution/Access)',
      'Traffic analysis — measure baseline performance metrics',
      'Identify critical services and dependencies',
      'Assess staff readiness and training needs',
      'Risk assessment of migration impact',
      'Define success criteria and KPIs',
    ],
    deliverables: ['Network audit report', 'Baseline performance metrics', 'Migration risk matrix', 'Staff competency assessment'],
  },
  {
    id: 2, title: 'Preparation', icon: Wrench, duration: 'Week 3-4', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30',
    description: 'Set up the SDN environment including Ryu controller infrastructure, OpenFlow-capable switches, and parallel testing network.',
    tasks: [
      'Deploy Ryu controller virtual machine',
      'Install Open vSwitch on candidate switches',
      'Set up parallel SDN test network',
      'Configure REST API access and security',
      'Create backup of all traditional configurations',
      'Develop rollback procedures',
      'Train staff on SDN operations',
    ],
    deliverables: ['Ryu controller deployment', 'Test SDN network operational', 'Rollback documentation', 'Training completion report'],
  },
  {
    id: 3, title: 'Pilot Deployment', icon: FlaskConical, duration: 'Week 5-8', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30',
    description: 'Deploy SDN on a non-critical network segment to validate performance, identify issues, and refine procedures before full migration.',
    tasks: [
      'Select pilot segment (e.g., Block C access layer)',
      'Migrate Block C switches to OVS with Ryu controller',
      'Replicate existing VLANs and ACLs in SDN',
      'Run parallel traditional vs SDN performance tests',
      'Monitor for anomalies and issues',
      'Validate all services still operational',
      'Document lessons learned',
    ],
    deliverables: ['Pilot migration report', 'Performance comparison data', 'Issue resolution log', 'Refined migration playbook'],
  },
  {
    id: 4, title: 'Gradual Migration', icon: ArrowRight, duration: 'Week 9-12', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',
    description: 'Systematic migration of remaining network segments following the validated playbook, with continuous monitoring and validation.',
    tasks: [
      'Migrate Block A distribution and access switches',
      'Migrate Block B distribution and access switches',
      'Migrate core switches to SDN control',
      'Configure inter-VLAN routing via controller',
      'Implement QoS policies in SDN',
      'Update monitoring and alerting systems',
      'Continuous performance validation',
    ],
    deliverables: ['Segment migration reports', 'Updated network documentation', 'QoS policy configuration', 'Monitoring system integration'],
  },
  {
    id: 5, title: 'Validation', icon: BarChart3, duration: 'Week 13-14', color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30',
    description: 'Comprehensive validation of the fully migrated SDN network against baseline metrics, ensuring all performance and reliability requirements are met.',
    tasks: [
      'Run full performance comparison tests',
      'Validate all 42 devices under SDN control',
      'Test failover scenarios and recovery times',
      'Verify QoS policies are working as expected',
      'Security audit of SDN configuration',
      'Staff sign-off on all systems',
      'Document final architecture',
    ],
    deliverables: ['Final performance comparison report', 'Security audit report', 'Staff sign-off documentation', 'As-built network documentation'],
  },
  {
    id: 6, title: 'Decommission & Optimize', icon: Rocket, duration: 'Week 15-16', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30',
    description: 'Final phase — decomission legacy traditional network equipment, optimize SDN performance, and establish ongoing management procedures.',
    tasks: [
      'Power down redundant traditional equipment',
      'Remove legacy routing protocols (OSPF/VRRP)',
      'Optimize OpenFlow flow table entries',
      'Fine-tune QoS parameters based on real traffic',
      'Establish ongoing SDN management procedures',
      'Create handover documentation for operations',
      'Celebrate successful migration',
    ],
    deliverables: ['Decommissioning report', 'Optimized SDN configuration', 'Operations handover document', 'Project completion report'],
  },
]

const CHECKLIST = [
  { phase: 'All', task: 'Network inventory complete', done: true },
  { phase: 'Assessment', task: 'Baseline performance documented', done: true },
  { phase: 'Assessment', task: 'Risk assessment completed', done: true },
  { phase: 'Preparation', task: 'Ryu controller deployed', done: true },
  { phase: 'Preparation', task: 'Test network operational', done: true },
  { phase: 'Preparation', task: 'Staff training completed', done: false },
  { phase: 'Pilot', task: 'Pilot segment selected', done: true },
  { phase: 'Pilot', task: 'Pilot migration executed', done: false },
  { phase: 'Pilot', task: 'Performance validated', done: false },
  { phase: 'Migration', task: 'Distribution switches migrated', done: false },
  { phase: 'Migration', task: 'Core switches migrated', done: false },
  { phase: 'Migration', task: 'QoS policies applied', done: false },
  { phase: 'Validation', task: 'Final tests completed', done: false },
  { phase: 'Validation', task: 'Security audit passed', done: false },
  { phase: 'Decommission', task: 'Legacy equipment removed', done: false },
  { phase: 'Decommission', task: 'Operations handover', done: false },
]

export default function MigrationPage() {
  const [activePhase, setActivePhase] = useState(0)
  const [showChecklist, setShowChecklist] = useState(false)

  const phase = PHASES[activePhase]
  const Icon = phase.icon
  const completedTasks = CHECKLIST.filter((t) => t.done).length
  const totalTasks = CHECKLIST.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SDN Migration Model</h1>
          <p className="text-muted-foreground">6-phase, 16-week migration methodology from Traditional to SDN architecture</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="text-sm font-bold">{completedTasks}/{totalTasks}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <span className="text-green-500 text-sm font-bold">{Math.round((completedTasks / totalTasks) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-1 mb-6">
            {PHASES.map((p, i) => (
              <div key={p.id} className="flex-1 flex flex-col items-center">
                <button onClick={() => setActivePhase(i)}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2',
                    i === activePhase ? `${p.bg} ${p.border} scale-110` : i < activePhase ? 'bg-green-500/20 border-green-500/50' : 'bg-muted border-muted-foreground/20'
                  )}
                >
                  {i < activePhase ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <p.icon className={cn('h-4 w-4', i === activePhase ? p.color : 'text-muted-foreground')} />
                  )}
                </button>
                <span className={cn('text-[9px] mt-1 text-center font-medium', i === activePhase ? p.color : 'text-muted-foreground')}>
                  {p.title}
                </span>
                <span className="text-[8px] text-muted-foreground">{p.duration}</span>
              </div>
            ))}
          </div>

          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-rose-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${((activePhase + 1) / PHASES.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Phase Detail */}
      <AnimatePresence mode="wait">
        <motion.div key={activePhase} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', phase.bg)}>
                    <Icon className={cn('h-5 w-5', phase.color)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">Phase {phase.id}: {phase.title}</CardTitle>
                      <Badge variant="outline" className={cn(phase.color, phase.border)}>
                        <Calendar className="h-3 w-3 mr-1" />{phase.duration}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{phase.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <h4 className="text-sm font-medium mb-3">Tasks</h4>
                <div className="space-y-2">
                  {phase.tasks.map((task, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{task}</span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Card>
                <CardHeader><CardTitle className="text-sm">Deliverables</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {phase.deliverables.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                      <span>{d}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <button onClick={() => setShowChecklist(!showChecklist)} className="flex items-center justify-between w-full">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Migration Checklist
                    </CardTitle>
                    <Badge variant="outline">{completedTasks}/{totalTasks}</Badge>
                  </button>
                </CardHeader>
                {showChecklist && (
                  <CardContent className="space-y-1 max-h-60 overflow-y-auto scrollbar-thin">
                    {CHECKLIST.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                        {item.done ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                        ) : (
                          <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <span className={item.done ? 'text-muted-foreground' : ''}>{item.task}</span>
                        <Badge variant="outline" className="text-[8px] ml-auto">{item.phase}</Badge>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setActivePhase(Math.max(0, activePhase - 1))} disabled={activePhase === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous Phase
        </Button>
        <span className="text-xs text-muted-foreground">Phase {activePhase + 1} of {PHASES.length}</span>
        <Button variant="outline" size="sm" onClick={() => setActivePhase(Math.min(PHASES.length - 1, activePhase + 1))} disabled={activePhase === PHASES.length - 1}>
          Next Phase <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-3">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Migration Strategy</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              The migration follows a phased approach to minimize risk and ensure business continuity. Each phase includes specific deliverables and validation criteria.
              Total estimated duration: <strong>16 weeks</strong>. The gradual migration strategy allows for rollback at any phase if issues are encountered.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
