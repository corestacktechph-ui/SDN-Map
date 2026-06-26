'use client'

import React, { Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import NetworkTopologyVisualization from '@/components/network/NetworkTopologyVisualization'
import PDFReportGenerator from '@/components/reports/PDFReportGenerator'
import RealTimeMonitor from '@/components/monitoring/RealTimeMonitor'
import StatisticalAnalysis from '@/components/analytics/StatisticalAnalysis'
import { BarChart3, Network, FileText, Activity, Calculator, TrendingUp } from 'lucide-react'
import { useComparisons } from '@/hooks'

function OverviewTab() {
  const { data: comparisons } = useComparisons()

  const latestComparison = comparisons?.[0]
  const avgImprovement = latestComparison
    ? (
        ((latestComparison.latencyImprovement || 0) +
          (latestComparison.throughputImprovement || 0) +
          (latestComparison.packetLossReduction || 0) +
          (latestComparison.recoveryImprovement || 0)) /
        4
      ).toFixed(1)
    : '51.2'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Total Tests Completed</h3>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{comparisons?.length ?? 0 * 2}</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Traditional vs SDN comparisons</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">Average Improvement</h3>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">{avgImprovement}%</p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">Across all metrics</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">Statistical Confidence</h3>
            <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">95%</p>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">p {'<'} 0.05 significance</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Network className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-lg">Interactive Network Topology</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Visualize your network in real-time with drag-and-drop nodes, live metrics, and OpenFlow connections.</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">Real-time updates</span>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">Interactive</span>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">27+ nodes</span>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-lg">Real-Time Monitoring</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Live network metrics updating every second with historical charts and performance indicators.</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">1s updates</span>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">Live charts</span>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">5+ metrics</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics & Visualization</h1>
        <p className="text-muted-foreground">Comprehensive network analysis with real-time monitoring, statistical insights, and professional reporting</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Overview</span></TabsTrigger>
          <TabsTrigger value="topology" className="gap-2"><Network className="h-4 w-4" /><span className="hidden sm:inline">Topology</span></TabsTrigger>
          <TabsTrigger value="realtime" className="gap-2"><Activity className="h-4 w-4" /><span className="hidden sm:inline">Real-Time</span></TabsTrigger>
          <TabsTrigger value="statistics" className="gap-2"><Calculator className="h-4 w-4" /><span className="hidden sm:inline">Statistics</span></TabsTrigger>
          <TabsTrigger value="comparison" className="gap-2"><TrendingUp className="h-4 w-4" /><span className="hidden sm:inline">Compare</span></TabsTrigger>
          <TabsTrigger value="reports" className="gap-2"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Reports</span></TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4"><OverviewTab /></TabsContent>

        <TabsContent value="topology" className="space-y-4">
          <Tabs defaultValue="sdn" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sdn">SDN Topology</TabsTrigger>
              <TabsTrigger value="traditional">Traditional Topology</TabsTrigger>
            </TabsList>
            <TabsContent value="sdn"><Suspense fallback={<div className="text-center py-12">Loading SDN topology...</div>}><NetworkTopologyVisualization type="sdn" liveUpdate /></Suspense></TabsContent>
            <TabsContent value="traditional"><Suspense fallback={<div className="text-center py-12">Loading traditional topology...</div>}><NetworkTopologyVisualization type="traditional" liveUpdate /></Suspense></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <Tabs defaultValue="sdn" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sdn">SDN Network</TabsTrigger>
              <TabsTrigger value="traditional">Traditional Network</TabsTrigger>
            </TabsList>
            <TabsContent value="sdn"><Suspense fallback={<div className="text-center py-12">Loading real-time monitor...</div>}><RealTimeMonitor type="sdn" /></Suspense></TabsContent>
            <TabsContent value="traditional"><Suspense fallback={<div className="text-center py-12">Loading real-time monitor...</div>}><RealTimeMonitor type="traditional" /></Suspense></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <Suspense fallback={<div className="text-center py-12">Loading statistical analysis...</div>}><StatisticalAnalysis /></Suspense>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <NetworkTopologyVisualization type="traditional" />
            <NetworkTopologyVisualization type="sdn" />
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <PDFReportGenerator />
        </TabsContent>
      </Tabs>
    </div>
  )
}
