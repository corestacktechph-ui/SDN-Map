'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Play, Pause, RotateCcw, SkipForward, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface BlockState {
  id: string
  label: string
  switches: string[]
  status: 'traditional' | 'migrating' | 'sdn'
  x: number
  y: number
  width: number
  height: number
}

interface SimStep {
  phase: number
  title: string
  description: string
  migrateBlocks: string[]
  duration: number // ms
}

const SIM_STEPS: SimStep[] = [
  {
    phase: 0,
    title: 'Phase 0 — Baseline',
    description: 'All blocks running traditional. Recording baseline metrics...',
    migrateBlocks: [],
    duration: 3000,
  },
  {
    phase: 1,
    title: 'Phase 1 — Controller Deployed',
    description: 'Ryu Controller online. Monitor-only mode. No forwarding changes.',
    migrateBlocks: ['controller'],
    duration: 3000,
  },
  {
    phase: 2,
    title: 'Phase 2 — Block C Pilot',
    description: 'Migrating DS_C1, DS_C2, AS_C1 to OpenFlow. VN_CORPORATE, VN_TRAINING active.',
    migrateBlocks: ['blockC'],
    duration: 4000,
  },
  {
    phase: 3,
    title: 'Phase 3 — Blocks A & B',
    description: 'Expanding SDN to Block A (Finance/Compliance) and Block B (HR/IT).',
    migrateBlocks: ['blockA', 'blockB'],
    duration: 4000,
  },
  {
    phase: 4,
    title: 'Phase 4 — Services Block',
    description: 'Migrating DS_S1, DS_S2, AS_S1. Centralized ACL enforcement active.',
    migrateBlocks: ['blockS'],
    duration: 3500,
  },
  {
    phase: 5,
    title: 'Phase 5 — Core Migration',
    description: 'CS1 and CS2 migrated. Full SDN fabric operational. Migration complete!',
    migrateBlocks: ['core'],
    duration: 3500,
  },
]

export default function MigrationSimulator() {
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [controllerOnline, setControllerOnline] = useState(false)
  const [blockStates, setBlockStates] = useState<Record<string, 'traditional' | 'migrating' | 'sdn'>>({
    core: 'traditional',
    blockA: 'traditional',
    blockB: 'traditional',
    blockC: 'traditional',
    blockS: 'traditional',
  })
  const [log, setLog] = useState<string[]>([])

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-8), `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  const reset = useCallback(() => {
    setIsRunning(false)
    setCurrentStep(0)
    setControllerOnline(false)
    setBlockStates({
      core: 'traditional',
      blockA: 'traditional',
      blockB: 'traditional',
      blockC: 'traditional',
      blockS: 'traditional',
    })
    setLog([])
  }, [])

  const executeStep = useCallback((stepIdx: number) => {
    const step = SIM_STEPS[stepIdx]
    if (!step) {
      setIsRunning(false)
      addLog('✅ Migration complete! Full SDN fabric operational.')
      return
    }

    addLog(`▶ ${step.title}`)
    addLog(`  ${step.description}`)

    if (step.phase === 1) {
      setControllerOnline(true)
    }

    // Set migrating state
    if (step.migrateBlocks.length > 0 && step.migrateBlocks[0] !== 'controller') {
      setBlockStates((prev) => {
        const next = { ...prev }
        step.migrateBlocks.forEach((b) => {
          if (next[b] !== undefined) next[b] = 'migrating'
        })
        return next
      })

      // After half duration, set to sdn
      setTimeout(() => {
        setBlockStates((prev) => {
          const next = { ...prev }
          step.migrateBlocks.forEach((b) => {
            if (next[b] !== undefined) next[b] = 'sdn'
          })
          return next
        })
        addLog(`  ✓ ${step.migrateBlocks.map(b => b.replace('block', 'Block ')).join(', ')} → SDN`)
      }, step.duration / 2)
    }
  }, [addLog])

  useEffect(() => {
    if (!isRunning) return

    const step = SIM_STEPS[currentStep]
    if (!step) {
      setIsRunning(false)
      return
    }

    executeStep(currentStep)

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1)
    }, step.duration)

    return () => clearTimeout(timer)
  }, [isRunning, currentStep, executeStep])

  const skipToStep = (idx: number) => {
    setIsRunning(false)
    setCurrentStep(idx)
    // Apply all states up to this step
    const newStates: Record<string, 'traditional' | 'migrating' | 'sdn'> = {
      core: 'traditional',
      blockA: 'traditional',
      blockB: 'traditional',
      blockC: 'traditional',
      blockS: 'traditional',
    }
    let ctrl = false
    for (let i = 0; i <= idx; i++) {
      const s = SIM_STEPS[i]
      if (s.phase === 1) ctrl = true
      s.migrateBlocks.forEach((b) => {
        if (newStates[b] !== undefined) newStates[b] = 'sdn'
      })
    }
    setControllerOnline(ctrl)
    setBlockStates(newStates)
    addLog(`⏩ Jumped to ${SIM_STEPS[idx]?.title || 'end'}`)
  }

  const getBlockColor = (status: string) => {
    switch (status) {
      case 'traditional': return 'fill-slate-600/60 stroke-slate-500'
      case 'migrating': return 'fill-amber-500/40 stroke-amber-400 animate-pulse'
      case 'sdn': return 'fill-emerald-500/30 stroke-emerald-400'
      default: return 'fill-slate-600/60 stroke-slate-500'
    }
  }

  const getBlockLabel = (status: string) => {
    switch (status) {
      case 'traditional': return 'Traditional'
      case 'migrating': return 'Migrating...'
      case 'sdn': return 'SDN ✓'
      default: return ''
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            Migration Simulation
            {isRunning && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse text-[9px]">RUNNING</Badge>}
            {!isRunning && currentStep >= SIM_STEPS.length && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]">COMPLETE</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              onClick={() => { if (!isRunning && currentStep === 0) { setIsRunning(true) } else { setIsRunning(!isRunning) } }}
              disabled={currentStep >= SIM_STEPS.length && !isRunning}
            >
              {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => skipToStep(Math.min(currentStep + 1, SIM_STEPS.length - 1))}>
              <SkipForward className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={reset}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid md:grid-cols-[1fr_200px]">
          {/* SVG Topology */}
          <div className="relative bg-slate-950/50 p-4">
            <svg viewBox="0 0 500 320" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
              {/* Internet */}
              <rect x="200" y="5" width="100" height="25" rx="4" className="fill-sky-900/40 stroke-sky-600" strokeWidth="1" />
              <text x="250" y="21" textAnchor="middle" className="fill-sky-300 text-[9px] font-medium">Internet / ISP / Edge</text>

              {/* Controller */}
              <AnimatePresence>
                {controllerOnline && (
                  <motion.g initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
                    <rect x="380" y="50" width="110" height="30" rx="6"
                      className="fill-blue-600/30 stroke-blue-400" strokeWidth="1.5" strokeDasharray="3,2" />
                    <text x="435" y="69" textAnchor="middle" className="fill-blue-300 text-[8px] font-bold">Ryu Controller</text>
                    {/* Dashed lines to core */}
                    <line x1="380" y1="65" x2="280" y2="70" className="stroke-blue-500/40" strokeWidth="0.5" strokeDasharray="2,2" />
                    <line x1="380" y1="65" x2="220" y2="70" className="stroke-blue-500/40" strokeWidth="0.5" strokeDasharray="2,2" />
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Core (CS1, CS2) */}
              <rect x="170" y="50" width="160" height="35" rx="6"
                className={cn(getBlockColor(blockStates.core), 'transition-all duration-700')} strokeWidth="1.5" />
              <text x="250" y="65" textAnchor="middle" className="fill-white text-[9px] font-bold">CORE: CS1 — CS2</text>
              <text x="250" y="78" textAnchor="middle" className={cn('text-[7px]',
                blockStates.core === 'sdn' ? 'fill-emerald-300' : blockStates.core === 'migrating' ? 'fill-amber-300' : 'fill-slate-400'
              )}>{getBlockLabel(blockStates.core)}</text>

              {/* Link core to internet */}
              <line x1="250" y1="30" x2="250" y2="50" className="stroke-slate-500" strokeWidth="1" />

              {/* Links to distribution */}
              <line x1="195" y1="85" x2="100" y2="130" className="stroke-slate-500/60" strokeWidth="0.8" />
              <line x1="225" y1="85" x2="210" y2="130" className="stroke-slate-500/60" strokeWidth="0.8" />
              <line x1="275" y1="85" x2="310" y2="130" className="stroke-slate-500/60" strokeWidth="0.8" />
              <line x1="310" y1="85" x2="420" y2="130" className="stroke-slate-500/60" strokeWidth="0.8" />

              {/* Block A */}
              <rect x="30" y="125" width="140" height="80" rx="6"
                className={cn(getBlockColor(blockStates.blockA), 'transition-all duration-700')} strokeWidth="1.5" />
              <text x="100" y="143" textAnchor="middle" className="fill-white text-[8px] font-bold">BLOCK A</text>
              <text x="100" y="155" textAnchor="middle" className="fill-slate-300 text-[7px]">DS_A1, DS_A2, AS_A1</text>
              <text x="100" y="167" textAnchor="middle" className="fill-slate-400 text-[6px]">h1–h9 (Finance, Compliance, Guest A)</text>
              <text x="100" y="195" textAnchor="middle" className={cn('text-[7px] font-medium',
                blockStates.blockA === 'sdn' ? 'fill-emerald-300' : blockStates.blockA === 'migrating' ? 'fill-amber-300' : 'fill-slate-500'
              )}>{getBlockLabel(blockStates.blockA)}</text>

              {/* Block B */}
              <rect x="180" y="125" width="140" height="80" rx="6"
                className={cn(getBlockColor(blockStates.blockB), 'transition-all duration-700')} strokeWidth="1.5" />
              <text x="250" y="143" textAnchor="middle" className="fill-white text-[8px] font-bold">BLOCK B</text>
              <text x="250" y="155" textAnchor="middle" className="fill-slate-300 text-[7px]">DS_B1, DS_B2, AS_B1</text>
              <text x="250" y="167" textAnchor="middle" className="fill-slate-400 text-[6px]">h10–h18 (HR, IT, Guest B)</text>
              <text x="250" y="195" textAnchor="middle" className={cn('text-[7px] font-medium',
                blockStates.blockB === 'sdn' ? 'fill-emerald-300' : blockStates.blockB === 'migrating' ? 'fill-amber-300' : 'fill-slate-500'
              )}>{getBlockLabel(blockStates.blockB)}</text>

              {/* Block C */}
              <rect x="30" y="220" width="140" height="80" rx="6"
                className={cn(getBlockColor(blockStates.blockC), 'transition-all duration-700')} strokeWidth="1.5" />
              <text x="100" y="238" textAnchor="middle" className="fill-white text-[8px] font-bold">BLOCK C (PILOT)</text>
              <text x="100" y="250" textAnchor="middle" className="fill-slate-300 text-[7px]">DS_C1, DS_C2, AS_C1</text>
              <text x="100" y="262" textAnchor="middle" className="fill-slate-400 text-[6px]">h19–h27 (Corporate, Training, Guest C)</text>
              <text x="100" y="290" textAnchor="middle" className={cn('text-[7px] font-medium',
                blockStates.blockC === 'sdn' ? 'fill-emerald-300' : blockStates.blockC === 'migrating' ? 'fill-amber-300' : 'fill-slate-500'
              )}>{getBlockLabel(blockStates.blockC)}</text>

              {/* Block S (Services) */}
              <rect x="330" y="125" width="140" height="80" rx="6"
                className={cn(getBlockColor(blockStates.blockS), 'transition-all duration-700')} strokeWidth="1.5" />
              <text x="400" y="143" textAnchor="middle" className="fill-white text-[8px] font-bold">SERVICES</text>
              <text x="400" y="155" textAnchor="middle" className="fill-slate-300 text-[7px]">DS_S1, DS_S2, AS_S1</text>
              <text x="400" y="167" textAnchor="middle" className="fill-slate-400 text-[6px]">ERP, HR, IT, VoIP, DHCP, Monitor</text>
              <text x="400" y="195" textAnchor="middle" className={cn('text-[7px] font-medium',
                blockStates.blockS === 'sdn' ? 'fill-emerald-300' : blockStates.blockS === 'migrating' ? 'fill-amber-300' : 'fill-slate-500'
              )}>{getBlockLabel(blockStates.blockS)}</text>

              {/* Links between blocks */}
              <line x1="100" y1="205" x2="100" y2="220" className="stroke-slate-500/40" strokeWidth="0.8" />
              <line x1="170" y1="165" x2="180" y2="165" className="stroke-slate-500/40" strokeWidth="0.8" />
              <line x1="320" y1="165" x2="330" y2="165" className="stroke-slate-500/40" strokeWidth="0.8" />

              {/* Legend */}
              <rect x="330" y="245" width="8" height="8" rx="2" className="fill-slate-600/60 stroke-slate-500" strokeWidth="0.5" />
              <text x="342" y="252" className="fill-slate-400 text-[7px]">Traditional</text>
              <rect x="330" y="258" width="8" height="8" rx="2" className="fill-amber-500/40 stroke-amber-400" strokeWidth="0.5" />
              <text x="342" y="265" className="fill-amber-400 text-[7px]">Migrating</text>
              <rect x="330" y="271" width="8" height="8" rx="2" className="fill-emerald-500/30 stroke-emerald-400" strokeWidth="0.5" />
              <text x="342" y="278" className="fill-emerald-400 text-[7px]">SDN ✓</text>
              <rect x="330" y="284" width="8" height="8" rx="2" className="fill-blue-600/30 stroke-blue-400" strokeWidth="0.5" strokeDasharray="2,1" />
              <text x="342" y="291" className="fill-blue-300 text-[7px]">Controller</text>
            </svg>

            {/* Current step indicator */}
            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-black/70 backdrop-blur-sm rounded-md px-3 py-1.5 text-[10px]">
                <span className="text-muted-foreground">Step {Math.min(currentStep + 1, SIM_STEPS.length)}/{SIM_STEPS.length}: </span>
                <span className="text-white font-medium">
                  {currentStep < SIM_STEPS.length ? SIM_STEPS[currentStep].title : 'Complete ✓'}
                </span>
              </div>
            </div>
          </div>

          {/* Log panel */}
          <div className="border-l border-border bg-slate-950/30 p-3 max-h-[320px] overflow-y-auto">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Simulation Log</p>
            <div className="space-y-1">
              {log.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic">Press ▶ to start simulation...</p>
              ) : (
                log.map((entry, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'text-[9px] font-mono leading-tight',
                      entry.includes('✅') ? 'text-emerald-400' :
                      entry.includes('✓') ? 'text-emerald-300' :
                      entry.includes('▶') ? 'text-blue-300' :
                      'text-muted-foreground'
                    )}
                  >
                    {entry}
                  </motion.p>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
