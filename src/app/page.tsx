'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Network, Activity, Shield, Zap, BarChart3, Download } from 'lucide-react'

const features = [
  {
    icon: Network,
    title: 'Dual Architecture',
    description: 'Traditional OSPF/VRRP and SDN/OpenFlow side by side',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Activity,
    title: 'Real-Time Monitoring',
    description: 'Live metrics and topology visualization via WebSockets',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Shield,
    title: 'QoS Implementation',
    description: 'Traffic prioritization with OpenFlow queues',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Zap,
    title: 'Performance Testing',
    description: 'Latency, throughput, jitter, and failover analysis',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics Engine',
    description: 'Automatic comparison with improvement calculations',
    color: 'from-rose-500 to-red-500',
  },
  {
    icon: Download,
    title: 'Report Generation',
    description: 'Thesis-ready PDF, Excel, and CSV exports',
    color: 'from-indigo-500 to-blue-500',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    if (session) {
      router.push('/dashboard')
    }
  }, [session, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#3b82f6_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,#8b5cf6_0%,transparent_30%)]" />
      </div>

      <header className="relative border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-500" />
              <span className="font-semibold text-white">SDN Migration Analysis</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/login')}
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/login')}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6">
              Migration of Traditional LAN to{' '}
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Software Defined Network
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10">
              A comparative analysis of network connectivity, performance, and recovery
              between traditional hierarchical LAN architecture and SDN-based architecture
              using Ryu Controller in Mininet.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => router.push('/login')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors"
              >
                Launch Dashboard
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('features')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="border border-slate-700 text-slate-300 hover:text-white px-8 py-3 rounded-xl font-medium transition-colors"
              >
                Learn More
              </button>
            </div>
          </div>
        </section>

        <section id="features" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              Platform Features
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div
                    key={feature.title}
                    className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-slate-700 transition-all"
                  >
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-400">{feature.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: '14', label: 'OpenFlow Switches' },
                { value: '24', label: 'Network Devices' },
                { value: '14', label: 'VLANs' },
                { value: '5', label: 'QoS Policies' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
              Deploy on your VPS or run locally with Docker. Complete thesis-ready system
              with real-time monitoring, performance testing, and automatic report generation.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2"
            >
              Launch Dashboard
              <Network className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-500">
            Amira Capstone - SDN Migration Analysis Platform
          </p>
        </div>
      </footer>
    </div>
  )
}
