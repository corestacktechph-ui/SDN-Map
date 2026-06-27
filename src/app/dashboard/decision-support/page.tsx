'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  Network, Server, Users, DollarSign, Activity, Shield,
  ArrowRight, CheckCircle2, XCircle, AlertTriangle, Lightbulb,
  TrendingUp, BarChart3, Scale, Layers, Zap, BrainCircuit
} from 'lucide-react'

type Answer = 1 | 2 | 3 | 4 | 5

interface Question {
  id: string
  category: string
  question: string
  icon: React.ElementType
  weight: number
  answer: Answer
  options: { value: Answer; label: string }[]
}

const QUESTIONS: Question[] = [
  {
    id: 'device-count',
    category: 'Network Scale',
    question: 'How many network devices does your organization manage?',
    icon: Network,
    weight: 20,
    answer: 3,
    options: [
      { value: 1, label: '< 10 devices' },
      { value: 2, label: '10-25 devices' },
      { value: 3, label: '25-50 devices' },
      { value: 4, label: '50-100 devices' },
      { value: 5, label: '100+ devices' },
    ],
  },
  {
    id: 'change-frequency',
    category: 'Operational Agility',
    question: 'How often do you need to make network configuration changes?',
    icon: Activity,
    weight: 15,
    answer: 3,
    options: [
      { value: 1, label: 'Rarely (quarterly or less)' },
      { value: 2, label: 'Occasionally (monthly)' },
      { value: 3, label: 'Regularly (weekly)' },
      { value: 4, label: 'Frequently (daily)' },
      { value: 5, label: 'Constantly (multiple times daily)' },
    ],
  },
  {
    id: 'config-complexity',
    category: 'Configuration Burden',
    question: 'How complex is your current network configuration process?',
    icon: Server,
    weight: 12,
    answer: 3,
    options: [
      { value: 1, label: 'Very simple, few devices' },
      { value: 2, label: 'Manageable with current tools' },
      { value: 3, label: 'Moderately complex, time-consuming' },
      { value: 4, label: 'Very complex, error-prone' },
      { value: 5, label: 'Extremely complex, frequent errors' },
    ],
  },
  {
    id: 'team-expertise',
    category: 'Team Capability',
    question: 'What is your team\'s current SDN/automation expertise level?',
    icon: Users,
    weight: 15,
    answer: 3,
    options: [
      { value: 1, label: 'No SDN experience' },
      { value: 2, label: 'Basic awareness only' },
      { value: 3, label: 'Some hands-on experience' },
      { value: 4, label: 'Good expertise with OpenFlow' },
      { value: 5, label: 'Expert-level SDN skills' },
    ],
  },
  {
    id: 'budget-capacity',
    category: 'Budget',
    question: 'What budget is available for SDN migration?',
    icon: DollarSign,
    weight: 15,
    answer: 3,
    options: [
      { value: 1, label: 'None allocated' },
      { value: 2, label: '< ₱1M (minimal)' },
      { value: 3, label: '₱1-3M (moderate)' },
      { value: 4, label: '₱3-5M (substantial)' },
      { value: 5, label: '> ₱5M (full funding)' },
    ],
  },
  {
    id: 'security-needs',
    category: 'Security',
    question: 'How critical are centralized security policies for your organization?',
    icon: Shield,
    weight: 10,
    answer: 3,
    options: [
      { value: 1, label: 'Basic security is sufficient' },
      { value: 2, label: 'Standard ACLs are enough' },
      { value: 3, label: 'Need better visibility and control' },
      { value: 4, label: 'Compliance-driven requirements' },
      { value: 5, label: 'Zero-trust / micro-segmentation needed' },
    ],
  },
  {
    id: 'outage-impact',
    category: 'Business Impact',
    question: 'What is the business impact of network outages?',
    icon: AlertTriangle,
    weight: 8,
    answer: 3,
    options: [
      { value: 1, label: 'Minimal (internal tools only)' },
      { value: 2, label: 'Low (some inconvenience)' },
      { value: 3, label: 'Moderate (revenue impact < ₱100K/hr)' },
      { value: 4, label: 'High (revenue impact ₱100K-₱1M/hr)' },
      { value: 5, label: 'Critical (revenue impact > ₱1M/hr)' },
    ],
  },
  {
    id: 'multi-tenancy',
    category: 'Architecture',
    question: 'Do you need multi-tenancy / VRF segmentation?',
    icon: Layers,
    weight: 5,
    answer: 3,
    options: [
      { value: 1, label: 'Single tenant, no segmentation' },
      { value: 2, label: 'Basic VLAN separation enough' },
      { value: 3, label: 'Need some VRF-like isolation' },
      { value: 4, label: 'Strong multi-tenancy needed' },
      { value: 5, label: 'Complex multi-tenant with VPNs' },
    ],
  },
]

interface Decision {
  type: 'migrate' | 'hybrid' | 'traditional'
  label: string
  description: string
  color: string
  bg: string
  border: string
  icon: React.ElementType
  score: number
  reasons: string[]
  risks: string[]
}

function computeDecision(questions: Question[]): Decision[] {
  const maxPossible = questions.reduce((sum, q) => sum + q.weight * 5, 0)
  const actual = questions.reduce((sum, q) => sum + q.weight * q.answer, 0)
  const pct = (actual / maxPossible) * 100

  const strongSdn = questions.filter((q) => q.answer >= 4).length
  const strongTraditional = questions.filter((q) => q.answer <= 2).length

  const migrateScore = Math.min(100, Math.round(pct * 0.85 + (strongSdn / questions.length) * 15))
  const traditionalScore = Math.min(100, Math.round((100 - pct) * 0.8 + (strongTraditional / questions.length) * 20))
  const hybridScore = Math.round((migrateScore + traditionalScore) / 2)

  return [
    {
      type: 'migrate', label: 'Full SDN Migration',
      description: 'Your organization is well-positioned for SDN. The benefits of centralized control, automation, and agility align with your needs.',
      color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',
      icon: TrendingUp, score: migrateScore,
      reasons: [
        'High device count benefits from centralized management',
        'Frequent changes will be automated via controller API',
        'Security requirements align with SDN policy engine',
        'Budget is adequate for migration investment',
      ].filter(() => migrateScore > 60),
      risks: [
        'Migration requires careful planning and downtime windows',
        'Team needs SDN-specific training',
        'Initial hardware investment may be significant',
      ],
    },
    {
      type: 'hybrid', label: 'Hybrid Approach',
      description: 'A gradual, phased migration starting with non-critical segments. This balances risk reduction with SDN benefits.',
      color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30',
      icon: ArrowRight, score: hybridScore,
      reasons: [
        'Moderate network scale — hybrid reduces risk',
        'Team can build SDN skills gradually',
        'Pilot deployment validates before full migration',
        'Budget can be spread across multiple phases',
      ],
      risks: [
        'Requires managing two architectures simultaneously',
        'Staff must be proficient in both traditional and SDN',
        'Interoperability between traditional and SDN segments',
      ],
    },
    {
      type: 'traditional', label: 'Stay Traditional',
      description: 'Your current traditional network may be sufficient. Focus on optimizing existing operations before considering SDN.',
      color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30',
      icon: Shield, score: traditionalScore,
      reasons: [
        'Current network scale does not justify SDN complexity',
        'Team expertise is in traditional networking',
        'Limited budget for SDN migration',
        'Current pain points may be addressed with incremental improvements',
      ].filter(() => traditionalScore > 50),
      risks: [
        'May miss out on long-term agility benefits',
        'Configuration burden will grow with network scale',
        'Troubleshooting remains device-by-device',
      ],
    },
  ]
}

export default function DecisionSupportPage() {
  const [questions, setQuestions] = useState<Question[]>(QUESTIONS)
  const [ran, setRan] = useState(false)

  const updateAnswer = (id: string, value: Answer) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, answer: value } : q)))
  }

  const decisions = useMemo(() => computeDecision(questions), [questions])
  const sorted = useMemo(() => [...decisions].sort((a, b) => b.score - a.score), [decisions])
  const top = sorted[0]

  const confidenceSpread = sorted.length >= 2 ? sorted[0].score - sorted[1].score : 0
  const confidenceLabel = confidenceSpread >= 20 ? 'High' : confidenceSpread >= 10 ? 'Medium' : 'Low'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Decision Support Engine</h1>
          <p className="text-muted-foreground">Data-driven recommendation: should you migrate to SDN?</p>
        </div>
        {ran && (
          <Badge variant="outline" className={cn(
            'text-sm px-3 py-1',
            confidenceLabel === 'High' ? 'text-emerald-500 border-emerald-500/30' :
            confidenceLabel === 'Medium' ? 'text-blue-500 border-blue-500/30' :
            'text-amber-500 border-amber-500/30'
          )}>
            <BrainCircuit className="h-4 w-4 mr-1.5" />
            {confidenceLabel} Confidence
          </Badge>
        )}
      </div>

      <Tabs defaultValue="questions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="questions"><BarChart3 className="h-4 w-4 mr-2" />Inputs</TabsTrigger>
          <TabsTrigger value="results" disabled={!ran}><Zap className="h-4 w-4 mr-2" />Decision</TabsTrigger>
          <TabsTrigger value="compare" disabled={!ran}><Scale className="h-4 w-4 mr-2" />Compare</TabsTrigger>
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions">
          <div className="grid gap-3 md:grid-cols-2">
            {questions.map((q, i) => {
              const Icon = q.icon
              const pct = Math.round((q.answer / 5) * 100)
              return (
                <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card>
                    <CardContent className="pt-3">
                      <div className="flex items-start gap-2 mb-2">
                        <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg shrink-0', pct >= 80 ? 'bg-emerald-500/10' : pct <= 40 ? 'bg-red-500/10' : 'bg-blue-500/10')}>
                          <Icon className={cn('h-3.5 w-3.5', pct >= 80 ? 'text-emerald-500' : pct <= 40 ? 'text-red-500' : 'text-blue-500')} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{q.question}</p>
                          <p className="text-[9px] text-muted-foreground">{q.category} &middot; Weight: {q.weight}%</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {q.options.map((opt) => (
                          <button key={opt.value} onClick={() => updateAnswer(q.id, opt.value)}
                            className={cn(
                              'w-full text-left px-2 py-1 rounded text-[10px] transition-colors',
                              q.answer === opt.value
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
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          <div className="flex justify-center mt-6">
            <Button size="lg" onClick={() => setRan(true)} className="gap-2">
              <BrainCircuit className="h-5 w-5" />
              Generate Decision
            </Button>
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          {ran && (
            <>
              <div className="grid gap-4 md:grid-cols-3 mb-4">
                {sorted.map((d, i) => {
                  const DIcon = d.icon
                  const isTop = i === 0
                  return (
                    <motion.div key={d.type} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                      <Card className={cn(isTop ? 'ring-2 ring-emerald-500/50' : 'opacity-60')}>
                        <CardContent className="pt-4 text-center">
                          <div className={cn('mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-2', d.bg)}>
                            <DIcon className={cn('h-6 w-6', d.color)} />
                          </div>
                          <Badge variant="default" className={cn('mb-2', isTop ? 'bg-emerald-500' : 'bg-muted-foreground')}>
                            {isTop ? 'RECOMMENDED' : 'Alternative'}
                          </Badge>
                          <h3 className={cn('text-lg font-bold', d.color)}>{d.score}%</h3>
                          <p className="text-sm font-medium mt-1">{d.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{d.description}</p>
                          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                            <div className={cn('h-full rounded-full', d.color.replace('text', 'bg'))}
                              style={{ width: `${d.score}%` }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Why {top.label}?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {top.reasons.map((r, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-2 text-xs"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{r}</span>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Risks to Consider
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {top.risks.map((r, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-2 text-xs"
                      >
                        <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{r}</span>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-4">
                <CardContent className="pt-4">
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950 p-3">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Decision Confidence: {confidenceLabel}</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      The recommended option ({top.label}) scores {top.score}% with a {confidenceSpread}% spread over the next best option.
                      {confidenceSpread >= 15 ? ' This indicates a clear, data-driven recommendation.' : ' Consider reviewing inputs for a more definitive result.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare">
          {ran && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg">Decision Scores Comparison</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sorted.map((d, i) => {
                      const DIcon = d.icon
                      const isTop = i === 0
                      return (
                        <motion.div key={d.type} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                          <div className="flex items-center gap-3 mb-1">
                            <DIcon className={cn('h-4 w-4', d.color)} />
                            <span className="text-sm font-medium">{d.label}</span>
                            <Badge variant={isTop ? 'default' : 'outline'} className={cn(isTop ? 'bg-emerald-500' : '')}>
                              {isTop ? 'Best Match' : `${d.score}%`}
                            </Badge>
                          </div>
                          <div className="h-4 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className={cn('h-full rounded-full', d.color.replace('text', 'bg'))}
                              initial={{ width: 0 }} animate={{ width: `${d.score}%` }}
                              transition={{ duration: 0.8, delay: i * 0.15 }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{d.description}</p>
                        </motion.div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Detailed Assessment</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">Factor</th>
                          <th className="text-center py-2 px-2">Weight</th>
                          <th className="text-center py-2 px-2">Your Score</th>
                          <th className="text-center py-2 px-2">SDN Fit</th>
                          <th className="text-right py-2 pl-4">Contribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.map((q, i) => {
                          const Icon = q.icon
                          const contribution = Math.round((q.weight * q.answer / (questions.length * 5)) * 100)
                          return (
                            <tr key={q.id} className="border-b border-muted/50">
                              <td className="py-1.5 pr-4">
                                <div className="flex items-center gap-1.5">
                                  <Icon className="h-3 w-3 text-muted-foreground" />
                                  <span>{q.category}</span>
                                </div>
                              </td>
                              <td className="text-center py-1.5 px-2 text-muted-foreground">{q.weight}%</td>
                              <td className="text-center py-1.5 px-2">
                                <Badge variant="outline" className={cn('text-[9px]', q.answer >= 4 ? 'border-emerald-500/50 text-emerald-500' : q.answer <= 2 ? 'border-red-500/50 text-red-500' : '')}>
                                  {q.answer}/5
                                </Badge>
                              </td>
                              <td className="text-center py-1.5 px-2">
                                {q.answer >= 4 ? <CheckCircle2 className="h-3 w-3 text-emerald-500 inline" /> : q.answer <= 2 ? <XCircle className="h-3 w-3 text-red-500 inline" /> : <AlertTriangle className="h-3 w-3 text-amber-500 inline" />}
                              </td>
                              <td className="text-right py-1.5 pl-4">
                                <div className="flex items-center gap-1.5 justify-end">
                                  <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className={cn('h-full rounded-full', q.answer >= 4 ? 'bg-emerald-500' : q.answer <= 2 ? 'bg-red-500' : 'bg-blue-500')}
                                      style={{ width: `${(q.answer / 5) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-3">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">How the Decision Is Calculated</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      The Decision Support Engine uses a weighted multi-criteria scoring model. Each factor
                      (Network Scale, Operational Agility, Team Capability, Budget, etc.) is weighted by importance
                      and scored 1-5. The composite score determines the best recommendation: Full SDN Migration,
                      Hybrid Approach, or Stay Traditional. The confidence level indicates how clear the recommendation is
                      based on the spread between the top two options.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
