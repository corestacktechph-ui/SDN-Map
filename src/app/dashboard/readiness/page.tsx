'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  Network, Users, DollarSign, AlertTriangle, Shield, Wrench,
  CheckCircle2, XCircle, Gauge, ArrowRight, Lightbulb, FileText,
  BarChart3, TrendingUp
} from 'lucide-react'

type Score = 1 | 2 | 3 | 4 | 5

interface Criterion {
  id: string
  label: string
  icon: React.ElementType
  description: string
  weight: number
  value: Score
  options: { value: Score; label: string }[]
}

const CRITERIA: Criterion[] = [
  {
    id: 'network-scale',
    label: 'Network Scale',
    icon: Network,
    description: 'Number of devices and complexity of the network',
    weight: 25,
    value: 3,
    options: [
      { value: 1, label: '< 10 devices, simple topology' },
      { value: 2, label: '10-25 devices, moderate complexity' },
      { value: 3, label: '25-50 devices, multi-layer topology' },
      { value: 4, label: '50-100 devices, distributed sites' },
      { value: 5, label: '100+ devices, multi-site, complex' },
    ],
  },
  {
    id: 'team-skills',
    label: 'Team SDN Skills',
    icon: Users,
    description: 'Current team expertise with SDN/OpenFlow/automation',
    weight: 20,
    value: 3,
    options: [
      { value: 1, label: 'No SDN knowledge, traditional only' },
      { value: 2, label: 'Basic awareness, some training' },
      { value: 3, label: 'Intermediate, can configure OpenFlow' },
      { value: 4, label: 'Advanced, experienced with controllers' },
      { value: 5, label: 'Expert team, production SDN experience' },
    ],
  },
  {
    id: 'budget',
    label: 'Budget Readiness',
    icon: DollarSign,
    description: 'Available budget for SDN migration (hardware, software, training)',
    weight: 20,
    value: 3,
    options: [
      { value: 1, label: 'No budget allocated' },
      { value: 2, label: 'Limited budget (< ₱1M)' },
      { value: 3, label: 'Moderate budget (₱1-3M)' },
      { value: 4, label: 'Good budget (₱3-5M)' },
      { value: 5, label: 'Full budget (> ₱5M)' },
    ],
  },
  {
    id: 'pain-points',
    label: 'Current Pain Points',
    icon: AlertTriangle,
    description: 'Severity of issues with current traditional network',
    weight: 15,
    value: 3,
    options: [
      { value: 1, label: 'No significant issues' },
      { value: 2, label: 'Minor inconveniences' },
      { value: 3, label: 'Moderate pain (slow changes, outages)' },
      { value: 4, label: 'Major issues (frequent outages, complex)' },
      { value: 5, label: 'Critical (downtime affecting business)' },
    ],
  },
  {
    id: 'security',
    label: 'Security Requirements',
    icon: Shield,
    description: 'Need for centralized policy enforcement and segmentation',
    weight: 10,
    value: 3,
    options: [
      { value: 1, label: 'Basic security needs' },
      { value: 2, label: 'Standard ACLs sufficient' },
      { value: 3, label: 'Moderate — need better segmentation' },
      { value: 4, label: 'High — compliance-driven requirements' },
      { value: 5, label: 'Critical — zero-trust, micro-segmentation' },
    ],
  },
  {
    id: 'automation',
    label: 'Automation Potential',
    icon: Wrench,
    description: 'How much benefit automation would bring to operations',
    weight: 10,
    value: 3,
    options: [
      { value: 1, label: 'Manual config is fine' },
      { value: 2, label: 'Some repetitive tasks' },
      { value: 3, label: 'Moderate repetitive config work' },
      { value: 4, label: 'Heavy config burden across many devices' },
      { value: 5, label: 'Extreme — changes daily, many devices' },
    ],
  },
]

function getReadinessLevel(score: number): { label: string; color: string; bg: string; border: string; message: string } {
  if (score >= 80) return { label: 'Fully Ready', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', message: 'Strong candidate for full SDN migration.' }
  if (score >= 60) return { label: 'Moderately Ready', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', message: 'Good foundation — address gaps before migration.' }
  if (score >= 40) return { label: 'Partially Ready', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', message: 'Significant preparation needed before migration.' }
  return { label: 'Not Ready', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', message: 'Focus on fundamentals before considering SDN.' }
}

function getRecommendation(scores: Record<string, Score>, total: number): { action: string; detail: string; icon: React.ElementType; color: string } {
  if (total >= 80) return { action: 'Full SDN Migration Recommended', detail: 'Your organization shows strong readiness across all dimensions. Proceed with the 6-phase migration plan targeting 12-16 weeks.', icon: TrendingUp, color: 'text-emerald-500' }
  if (total >= 60) return { action: 'Hybrid Approach Recommended', detail: 'Start with a pilot deployment on non-critical segments (e.g., Block C). Use the hybrid model while building skills and addressing gaps.', icon: ArrowRight, color: 'text-blue-500' }
  if (total >= 40) return { action: 'Prepare Before Migration', detail: 'Invest in training, budget planning, and addressing current network stability. Consider a small lab pilot first.', icon: Lightbulb, color: 'text-amber-500' }
  return { action: 'Stay Traditional for Now', detail: 'Focus on optimizing your current network. Build team skills and revisit SDN when network complexity grows.', icon: XCircle, color: 'text-red-500' }
}

export default function ReadinessPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [criteria, setCriteria] = useState<Criterion[]>(CRITERIA)
  const [activeTab, setActiveTab] = useState('assess')

  const updateScore = (id: string, value: Score) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  }

  const scores = useMemo(() => {
    const maxPossible = criteria.reduce((sum, c) => sum + c.weight * 5, 0)
    const actual = criteria.reduce((sum, c) => sum + c.weight * c.value, 0)
    const percentage = Math.round((actual / maxPossible) * 100)
    const byCategory = Object.fromEntries(criteria.map((c) => [c.id, c.value]))
    return { maxPossible, actual, percentage, byCategory }
  }, [criteria])

  const level = getReadinessLevel(scores.percentage)
  const recommendation = getRecommendation(scores.byCategory, scores.percentage)
  const RecIcon = recommendation.icon

  const weakAreas = criteria.filter((c) => c.value <= 2)
  const strongAreas = criteria.filter((c) => c.value >= 4)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Readiness Assessment Framework</h1>
          <p className="text-muted-foreground">Evaluate your organization&apos;s readiness for SDN migration</p>
        </div>
        <Badge variant="outline" className={cn('text-sm px-3 py-1', level.color, level.border)}>
          <Gauge className="h-4 w-4 mr-1.5" />
          {level.label}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="assess"><BarChart3 className="h-4 w-4 mr-2" />Assessment</TabsTrigger>
          <TabsTrigger value="results"><Gauge className="h-4 w-4 mr-2" />Results</TabsTrigger>
          <TabsTrigger value="action"><FileText className="h-4 w-4 mr-2" />Action Plan</TabsTrigger>
        </TabsList>

        {/* Assessment Tab */}
        <TabsContent value="assess">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {criteria.map((criterion, i) => {
              const Icon = criterion.icon
              const maxScore = criterion.weight * 5
              const currentScore = criterion.weight * criterion.value
              const pct = Math.round((currentScore / maxScore) * 100)
              return (
                <motion.div key={criterion.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg shrink-0', criterion.value >= 4 ? 'bg-emerald-500/10' : criterion.value <= 2 ? 'bg-red-500/10' : 'bg-blue-500/10')}>
                          <Icon className={cn('h-4 w-4', criterion.value >= 4 ? 'text-emerald-500' : criterion.value <= 2 ? 'text-red-500' : 'text-blue-500')} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{criterion.label}</span>
                            <span className={cn('text-xs font-bold', criterion.value >= 4 ? 'text-emerald-500' : criterion.value <= 2 ? 'text-red-500' : 'text-blue-500')}>
                              {criterion.value}/5
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{criterion.description}</p>
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        {criterion.options.map((opt) => (
                          <button key={opt.value} onClick={() => updateScore(criterion.id, opt.value)}
                            className={cn(
                              'w-full text-left px-2 py-1 rounded text-[10px] transition-colors',
                              criterion.value === opt.value
                                ? opt.value >= 4 ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                                  : opt.value <= 2 ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                                    : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                                : 'text-muted-foreground hover:bg-accent border border-transparent'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className={cn('h-full rounded-full', pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-red-500')}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground shrink-0">Weight: {criterion.weight}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Readiness Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative h-48 w-48 mb-4">
                  <svg className="h-48 w-48 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                    {mounted && (
                      <circle
                        cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
                        className={scores.percentage >= 80 ? 'text-emerald-500' : scores.percentage >= 60 ? 'text-blue-500' : scores.percentage >= 40 ? 'text-amber-500' : 'text-red-500'}
                        style={{
                          strokeDasharray: `${2 * Math.PI * 42}`,
                          strokeDashoffset: `${2 * Math.PI * 42 * (1 - scores.percentage / 100)}`,
                          transition: 'stroke-dashoffset 1s ease-out',
                        }}
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn('text-4xl font-bold', level.color)}>{scores.percentage}%</span>
                    <span className={cn('text-xs font-medium', level.color)}>{level.label}</span>
                  </div>
                </div>

                <div className={cn('rounded-lg border px-4 py-2 text-center', level.bg, level.border)}>
                  <p className={cn('text-sm font-medium', level.color)}>{level.message}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Card>
                <CardHeader><CardTitle className="text-sm">Category Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {criteria.map((c) => {
                    const Icon = c.icon
                    const pct = Math.round((c.value / 5) * 100)
                    return (
                      <div key={c.id}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3 w-3 text-muted-foreground" />
                            <span>{c.label}</span>
                          </div>
                          <span className={cn('font-bold', pct >= 80 ? 'text-emerald-500' : pct >= 50 ? 'text-blue-500' : 'text-red-500')}>
                            {c.value}/5
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={cn('h-full rounded-full', pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-red-500')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Recommendation</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg shrink-0', recommendation.color.replace('text', 'bg').replace('500', '500/10'))}>
                      <RecIcon className={cn('h-4 w-4', recommendation.color)} />
                    </div>
                    <div>
                      <p className={cn('text-sm font-semibold', recommendation.color)}>{recommendation.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{recommendation.detail}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 mt-4 md:grid-cols-2">
            {strongAreas.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Strengths</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {strongAreas.map((c) => {
                    const Icon = c.icon
                    return (
                      <div key={c.id} className="flex items-center gap-2 text-sm">
                        <Icon className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span>{c.label}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">{c.value}/5</Badge>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {weakAreas.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> Areas to Address</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {weakAreas.map((c) => {
                    const Icon = c.icon
                    return (
                      <div key={c.id} className="flex items-center gap-2 text-sm">
                        <Icon className="h-3 w-3 text-red-500 shrink-0" />
                        <span>{c.label}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">{c.value}/5</Badge>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Action Plan Tab */}
        <TabsContent value="action">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-lg">Recommended Action Plan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {criteria.map((c, i) => {
                  const Icon = c.icon
                  const pct = Math.round((c.value / 5) * 100)
                  const needsWork = c.value <= 2
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className={cn('rounded-lg border p-3', needsWork ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5')}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg shrink-0', needsWork ? 'bg-red-500/10' : 'bg-emerald-500/10')}>
                          <Icon className={cn('h-4 w-4', needsWork ? 'text-red-500' : 'text-emerald-500')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{c.label}</span>
                            <div className="flex items-center gap-2">
                              <span className={cn('text-xs font-bold', pct >= 80 ? 'text-emerald-500' : pct >= 50 ? 'text-blue-500' : 'text-red-500')}>
                                Score: {c.value}/5
                              </span>
                              {needsWork && <Badge variant="outline" className="bg-red-500/10 text-red-500 text-[9px]">Action Needed</Badge>}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {c.value <= 2
                              ? `Invest in ${c.label.toLowerCase()} improvement. Target: reach score 4/5 before migration.`
                              : c.value <= 3
                                ? `Adequate ${c.label.toLowerCase()}. Continue building on this foundation.`
                                : `Strong ${c.label.toLowerCase()}. Leverage this advantage during migration.`
                            }
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Card>
                <CardHeader><CardTitle className="text-sm">Next Steps</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    'Address weak areas identified above',
                    'Schedule SDN training for team',
                    'Allocate budget for pilot deployment',
                    'Set up lab environment for testing',
                    'Define success criteria',
                    'Begin Phase 0: Assessment',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</div>
                      <span className="text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Quick Stats</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'Overall Score', value: `${scores.percentage}%` },
                    { label: 'Strong Areas', value: `${strongAreas.length}/6` },
                    { label: 'Needs Improvement', value: `${weakAreas.length}/6` },
                    { label: 'Assessment Date', value: new Date().toLocaleDateString() },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{stat.label}</span>
                      <span className="font-medium">{stat.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950 p-3">
                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">About This Assessment</p>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  This Readiness Assessment Framework evaluates 6 key dimensions: Network Scale, Team Skills, Budget Readiness,
                  Current Pain Points, Security Requirements, and Automation Potential. Each dimension is weighted by importance
                  and scored 1-5. The composite score determines your organization&apos;s readiness level and provides
                  a tailored recommendation. Re-assess periodically as conditions change.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
