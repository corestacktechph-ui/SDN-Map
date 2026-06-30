'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Calculator,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Info,
  BarChart3,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

interface StatisticalResult {
  metric: string
  traditional: {
    mean: number
    stdDev: number
    min: number
    max: number
    samples: number
  }
  sdn: {
    mean: number
    stdDev: number
    min: number
    max: number
    samples: number
  }
  improvement: number
  tStatistic: number
  pValue: number
  confidenceInterval: [number, number]
  significant: boolean
}

export default function StatisticalAnalysis() {
  const [results, setResults] = useState<StatisticalResult[]>([])
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<'live' | 'none'>('none')

  // Try to fetch live results from the database
  const fetchLiveData = async () => {
    try {
      const response = await fetch('/api/results')
      if (!response.ok) return null
      const allResults = await response.json()
      if (!allResults || allResults.length === 0) return null

      // Group results by metric and topology type
      const grouped: Record<string, { traditional: number[]; sdn: number[] }> = {}

      for (const result of allResults) {
        const topologyType = result.test?.topology?.type?.toUpperCase()
        if (!topologyType) continue

        const metricKey = result.metric.toLowerCase().includes('latency') ? 'latency'
          : result.metric.toLowerCase().includes('throughput') ? 'throughput'
          : result.metric.toLowerCase().includes('packet loss') ? 'packetLoss'
          : result.metric.toLowerCase().includes('jitter') ? 'jitter'
          : result.metric.toLowerCase().includes('recovery') ? 'failoverTime'
          : null

        if (!metricKey) continue

        if (!grouped[metricKey]) grouped[metricKey] = { traditional: [], sdn: [] }

        if (topologyType === 'TRADITIONAL') {
          grouped[metricKey].traditional.push(result.value)
        } else if (topologyType === 'SDN') {
          grouped[metricKey].sdn.push(result.value)
        }
      }

      // Only use live data if we have enough samples (at least 3 for each side)
      const validMetrics = Object.entries(grouped).filter(
        ([, data]) => data.traditional.length >= 3 && data.sdn.length >= 3
      )

      if (validMetrics.length >= 2) {
        return Object.fromEntries(validMetrics) as Record<string, { traditional: number[]; sdn: number[] }>
      }
      return null
    } catch {
      return null
    }
  }

  const calculateStats = (data: number[]) => {
    const n = data.length
    const mean = data.reduce((a, b) => a + b, 0) / n
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1)
    const stdDev = Math.sqrt(variance)
    const min = Math.min(...data)
    const max = Math.max(...data)

    return { mean, stdDev, min, max, samples: n }
  }

  const calculateTTest = (
    data1: number[],
    data2: number[],
    stats1: ReturnType<typeof calculateStats>,
    stats2: ReturnType<typeof calculateStats>
  ) => {
    const n1 = data1.length
    const n2 = data2.length

    // Pooled standard deviation
    const pooledStdDev = Math.sqrt(
      ((n1 - 1) * Math.pow(stats1.stdDev, 2) + (n2 - 1) * Math.pow(stats2.stdDev, 2)) /
        (n1 + n2 - 2)
    )

    // T-statistic
    const tStat = (stats1.mean - stats2.mean) / (pooledStdDev * Math.sqrt(1 / n1 + 1 / n2))

    // Degrees of freedom
    const df = n1 + n2 - 2

    // Approximate p-value (simplified)
    // For accurate p-value, would need complete t-distribution implementation
    const pValue = tStat > 2.5 ? 0.01 : tStat > 2.0 ? 0.05 : 0.1

    // 95% confidence interval for difference
    const marginOfError = 2.0 * pooledStdDev * Math.sqrt(1 / n1 + 1 / n2)
    const meanDiff = stats1.mean - stats2.mean
    const confidenceInterval: [number, number] = [
      meanDiff - marginOfError,
      meanDiff + marginOfError,
    ]

    return {
      tStatistic: tStat,
      pValue,
      confidenceInterval,
      significant: Math.abs(tStat) > 2.0, // p < 0.05
    }
  }

  const runAnalysis = async () => {
    setLoading(true)

    // Fetch live data from DB (actual Mininet results)
    const liveData = await fetchLiveData()

    if (!liveData) {
      setDataSource('none')
      setResults([])
      setLoading(false)
      return
    }

    setDataSource('live')

    const analysisResults: StatisticalResult[] = Object.entries(liveData).map(
      ([metric, data]) => {
        const tradStats = calculateStats(data.traditional)
        const sdnStats = calculateStats(data.sdn)
        const testResults = calculateTTest(
          data.traditional,
          data.sdn,
          tradStats,
          sdnStats
        )

        const improvement =
          metric === 'throughput'
            ? ((sdnStats.mean - tradStats.mean) / tradStats.mean) * 100
            : ((tradStats.mean - sdnStats.mean) / tradStats.mean) * 100

        return {
          metric: metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1'),
          traditional: tradStats,
          sdn: sdnStats,
          improvement,
          ...testResults,
        }
      }
    )

    setResults(analysisResults)
    setLoading(false)
  }

  useEffect(() => {
    runAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const comparisonData = results.map((r) => ({
    metric: r.metric,
    Traditional: r.traditional.mean,
    SDN: r.sdn.mean,
  }))

  const radarData = results.map((r) => ({
    metric: r.metric,
    improvement: Math.abs(r.improvement),
  }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Statistical Significance Analysis
                {dataSource === 'live' && (
                  <Badge variant="default" className="ml-2 text-[10px]">LIVE MININET DATA</Badge>
                )}
                {dataSource === 'none' && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">NO DATA — RUN MININET FIRST</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                T-test analysis with 95% confidence intervals
              </p>
            </div>
            <Button onClick={runAnalysis} disabled={loading} variant="outline">
              {loading ? 'Analyzing...' : 'Recalculate'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detailed Statistical Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.metric}
                className="rounded-lg border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{result.metric}</h3>
                    <p className="text-sm text-muted-foreground">
                      {result.traditional.samples} samples per group
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={result.significant ? 'default' : 'secondary'}
                      className="mb-1"
                    >
                      {result.significant ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Significant
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not Significant
                        </>
                      )}
                    </Badge>
                    <div className="text-2xl font-bold text-green-500">
                      {result.improvement > 0 ? '+' : ''}
                      {result.improvement.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Traditional Mean</p>
                    <p className="font-semibold">
                      {result.traditional.mean.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ± {result.traditional.stdDev.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">SDN Mean</p>
                    <p className="font-semibold text-blue-500">
                      {result.sdn.mean.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ± {result.sdn.stdDev.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">T-Statistic</p>
                    <p className="font-semibold">{result.tStatistic.toFixed(3)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">P-Value</p>
                    <p
                      className={`font-semibold ${
                        result.pValue < 0.05 ? 'text-green-500' : 'text-yellow-500'
                      }`}
                    >
                      {result.pValue < 0.01 ? '< 0.01' : result.pValue.toFixed(3)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">95% CI</p>
                    <p className="font-semibold text-xs">
                      [{result.confidenceInterval[0].toFixed(1)},{' '}
                      {result.confidenceInterval[1].toFixed(1)}]
                    </p>
                  </div>
                </div>

                {result.significant && (
                  <div className="mt-3 flex items-start gap-2 rounded-md bg-green-50 dark:bg-green-950 p-2 text-xs">
                    <Info className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-green-700 dark:text-green-300">
                      The difference is statistically significant (p {result.pValue < 0.01 ? '< 0.01' : '< 0.05'}), 
                      indicating that the improvement is unlikely due to random chance.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Visual Comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Mean Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="metric" 
                  tick={{ fontSize: 10 }}
                  stroke="#9CA3AF"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="Traditional" fill="#EF4444" />
                <Bar dataKey="SDN" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Improvement Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis 
                  dataKey="metric" 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                />
                <Radar
                  name="Improvement %"
                  dataKey="improvement"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.6}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Interpretation Guide */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-base text-blue-900 dark:text-blue-100">
            📊 Statistical Interpretation Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <p>
            <strong>P-Value:</strong> Probability that results occurred by chance. 
            p {'<'} 0.05 indicates statistical significance.
          </p>
          <p>
            <strong>T-Statistic:</strong> Measures the size of the difference relative to variation. 
            |t| {'>'} 2.0 typically indicates significance.
          </p>
          <p>
            <strong>Confidence Interval:</strong> 95% CI shows the range where the true difference likely falls.
          </p>
          <p>
            <strong>Standard Deviation:</strong> Measures variability in test results. 
            Lower values indicate more consistent performance.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
