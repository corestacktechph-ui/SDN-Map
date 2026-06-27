'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import {
  Network, Activity, Shield, Zap, BarChart3, Download,
  ArrowRight, Layers, Radio, Server, Sun, Moon,
  ChevronDown, GitCompare, FileText, ScrollText, Wrench,
  FlaskConical, TrendingUp, CheckCircle2, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: Network,
    title: 'Dual Architecture',
    description: 'Traditional OSPF/VRRP and SDN/OpenFlow running side by side for direct comparison',
    color: 'from-blue-500 to-cyan-500',
    gradient: 'group-hover:shadow-blue-500/25',
  },
  {
    icon: Activity,
    title: 'Real-Time Monitoring',
    description: 'Live network metrics, topology visualization, and WebSocket-driven updates',
    color: 'from-purple-500 to-pink-500',
    gradient: 'group-hover:shadow-purple-500/25',
  },
  {
    icon: Shield,
    title: 'QoS Implementation',
    description: 'Six-class traffic prioritization with OpenFlow queues and VRF isolation',
    color: 'from-emerald-500 to-teal-500',
    gradient: 'group-hover:shadow-emerald-500/25',
  },
  {
    icon: Zap,
    title: 'Performance Testing',
    description: 'Latency, throughput, jitter, failover, and ACL validation test suites',
    color: 'from-amber-500 to-orange-500',
    gradient: 'group-hover:shadow-amber-500/25',
  },
  {
    icon: GitCompare,
    title: 'Side-by-Side Comparison',
    description: 'Direct metrics comparison between traditional and SDN architectures',
    color: 'from-rose-500 to-red-500',
    gradient: 'group-hover:shadow-rose-500/25',
  },
  {
    icon: Download,
    title: 'Report Generation',
    description: 'Thesis-ready PDF, Excel, and CSV exports with auto-generated analysis',
    color: 'from-indigo-500 to-blue-500',
    gradient: 'group-hover:shadow-indigo-500/25',
  },
]

const stats = [
  { value: 14, label: 'OpenFlow Switches', suffix: '', icon: Radio },
  { value: 24, label: 'Network Devices', suffix: '', icon: Server },
  { value: 14, label: 'VLANs', suffix: '', icon: Layers },
  { value: 6, label: 'QoS Policies', suffix: '', icon: Shield },
]

const methodology = [
  {
    step: '01',
    title: 'Network Design',
    description: 'Dual topology design with identical traditional and SDN network layouts',
    icon: Network,
  },
  {
    step: '02',
    title: 'Baseline Testing',
    description: 'Measure latency, throughput, and failover in the traditional architecture',
    icon: BarChart3,
  },
  {
    step: '03',
    title: 'SDN Migration',
    description: 'Phased migration using Ryu controller with OpenFlow 1.3 protocol',
    icon: Radio,
  },
  {
    step: '04',
    title: 'Comparative Analysis',
    description: 'Side-by-side performance evaluation and improvement calculations',
    icon: GitCompare,
  },
]

const architectureItems = [
  {
    title: 'Traditional LAN',
    icon: Server,
    items: ['OSPF dynamic routing', 'VRRP gateway redundancy', 'Manual QoS policies', 'Device-by-device ACLs', 'STP loop prevention', 'VLAN trunking (802.1Q)'],
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    title: 'SDN with Ryu',
    icon: Radio,
    items: ['Centralized flow control', 'Ryu controller API', 'OpenFlow 1.3 queues', 'Controller-managed ACLs', 'Loop-free topology', 'VN mapping with VRFs'],
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
]

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    const duration = 1500
    const steps = 30
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [isInView, value])

  return <div ref={ref}>{count}{suffix}</div>
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      setProgress(Math.min((window.scrollY / total) * 100, 100))
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="fixed top-0 left-0 z-50 h-0.5 w-full bg-muted/30">
      <motion.div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${progress}%` }} />
    </div>
  )
}

function FloatingThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border bg-background shadow-lg hover:shadow-xl transition-all"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 90 }}
          transition={{ duration: 0.2 }}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-slate-700" />}
        </motion.div>
      </AnimatePresence>
    </button>
  )
}

function FadeInSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session, router])

  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgress />
      <FloatingThemeToggle />

      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className={cn(
          'absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px]',
          isDark ? 'bg-blue-600' : 'bg-blue-400'
        )} />
        <div className={cn(
          'absolute -bottom-40 right-0 h-[400px] w-[400px] rounded-full opacity-15 blur-[100px]',
          isDark ? 'bg-purple-600' : 'bg-purple-400'
        )} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-semibold">SDN Migration Analysis</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <button
                onClick={() => router.push('/login')}
                className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/login')}
                className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-primary/25"
              >
                Get Started
              </button>
            </motion.div>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-8">
                <FlaskConical className="h-3.5 w-3.5" />
                Capstone Thesis &mdash; A.Y. 2024&ndash;2025
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              Migration of Traditional LAN to{' '}
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Software Defined Network
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              A comparative analysis of network connectivity, performance, and recovery
              between traditional hierarchical LAN architecture and SDN-based architecture
              using Ryu Controller in Mininet.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center justify-center gap-4 flex-wrap"
            >
              <button
                onClick={() => router.push('/login')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-medium transition-all hover:shadow-xl hover:shadow-primary/25 inline-flex items-center gap-2"
              >
                Launch Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="border border-border text-muted-foreground hover:text-foreground px-8 py-3 rounded-xl font-medium transition-all inline-flex items-center gap-2"
              >
                Learn More
                <ChevronDown className="h-4 w-4" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* Architecture Comparison Preview */}
        <FadeInSection>
          <section className="py-16 lg:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-3">Architecture Comparison</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Side-by-side network architecture design &mdash; same topology, two different control planes
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {architectureItems.map((arch, i) => {
                  const Icon = arch.icon
                  return (
                    <motion.div
                      key={arch.title}
                      initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className={cn('rounded-2xl border p-6', arch.border, arch.bg)}
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', arch.bg)}>
                          <Icon className={cn('h-5 w-5', arch.color)} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{arch.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {i === 0 ? 'OSPF / VRRP / STP' : 'OpenFlow 1.3 / Ryu API'}
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-2.5">
                        {arch.items.map((item) => (
                          <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                            <CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0', arch.color)} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Features */}
        <section id="features" className="py-16 lg:py-24 border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeInSection>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-3">Platform Features</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Everything you need to analyze, compare, and present your SDN migration research
                </p>
              </div>
            </FadeInSection>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feature, i) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <div className={cn(
                      'group relative rounded-2xl border border-border bg-card p-6 hover:border-primary/30 transition-all duration-300 cursor-default',
                      'hover:shadow-xl hover:-translate-y-0.5'
                    )}>
                      <div className={cn(
                        'inline-flex p-3 rounded-xl bg-gradient-to-br mb-4 transition-all duration-300',
                        feature.color
                      )}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-base font-semibold mb-1.5">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>

                      {/* Hover shine effect */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => {
                const Icon = stat.icon
                return (
                  <FadeInSection key={stat.label}>
                    <div className="text-center group">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-3xl sm:text-4xl font-bold mb-1 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                      </div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  </FadeInSection>
                )
              })}
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="py-16 lg:py-24 border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeInSection>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-3">Research Methodology</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Systematic approach to network migration analysis and performance evaluation
                </p>
              </div>
            </FadeInSection>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {methodology.map((step, i) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="relative"
                  >
                    {/* Connector line */}
                    {i < methodology.length - 1 && (
                      <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/30 to-transparent" />
                    )}

                    <div className="rounded-2xl border border-border bg-card p-6 text-center hover:border-primary/30 transition-colors">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4 text-lg font-bold">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="text-xs font-bold text-primary mb-1 tracking-wider">{step.step}</div>
                      <h3 className="font-semibold mb-1.5">{step.title}</h3>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <FadeInSection>
          <section className="py-16 border-t border-border">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl font-bold mb-3">Technology Stack</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-10">
                Built with industry-standard tools for network emulation and SDN research
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { name: 'Ryu Controller', icon: Radio },
                  { name: 'Mininet', icon: Server },
                  { name: 'OpenFlow 1.3', icon: Layers },
                  { name: 'Python 3', icon: FileText },
                  { name: 'Next.js 14', icon: Zap },
                  { name: 'Docker', icon: Wrench },
                  { name: 'WebSockets', icon: Activity },
                  { name: 'Recharts', icon: BarChart3 },
                ].map((tech) => {
                  const TechIcon = tech.icon
                  return (
                    <motion.div
                      key={tech.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05 }}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:border-primary/30 hover:shadow-md transition-all"
                    >
                      <TechIcon className="h-4 w-4 text-primary" />
                      {tech.name}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* CTA */}
        <section className="py-20 lg:py-28 border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <FadeInSection>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Explore the Platform?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-8 text-lg">
                Access the full dashboard with real-time monitoring, comparative analytics,
                performance testing, and thesis-ready report generation.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-3.5 rounded-xl font-medium transition-all hover:shadow-xl hover:shadow-primary/25 inline-flex items-center gap-2 text-base"
              >
                Launch Dashboard
                <Network className="h-5 w-5" />
              </button>
            </FadeInSection>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              SDN Migration Analysis Platform
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Capstone Thesis &mdash; Amira &copy; {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
