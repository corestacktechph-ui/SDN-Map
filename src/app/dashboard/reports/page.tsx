'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { FileText, Download, FileSpreadsheet, FileJson, Plus, Clock, User, FileType } from 'lucide-react'
import { useReports, useCreateReport } from '@/hooks'
import { toast } from 'react-hot-toast'
import { useSession } from 'next-auth/react'

export default function ReportsPage() {
  const { data: reports, isLoading } = useReports()
  const createReport = useCreateReport()
  const { data: session } = useSession()
  const [generating, setGenerating] = useState(false)

  const reportTemplates = [
    { name: 'Executive Summary', description: 'High-level findings and recommendations', icon: FileText },
    { name: 'Performance Report', description: 'Detailed performance metrics comparison', icon: FileSpreadsheet },
    { name: 'Methodology Report', description: 'Research methodology and approach', icon: FileText },
    { name: 'Full Thesis Report', description: 'Complete research document with all findings', icon: FileText },
  ]

  const handleGenerate = async (template: string) => {
    setGenerating(true)
    try {
      await createReport.mutateAsync({
        title: `${template} - ${new Date().toLocaleDateString()}`,
        type: template.toLowerCase().replace(/\s+/g, '_'),
        format: 'PDF',
        generatedBy: session?.user?.name || 'Unknown',
      })
      toast.success(`${template} generated successfully!`)
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = async (format: string) => {
    toast.success(`Exporting as ${format}...`)
    try {
      const data = await fetch('/api/comparison').then(r => r.json())
      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comparison_data.${format.toLowerCase()}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported as ${format}`)
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and download thesis-ready reports</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {reportTemplates.map((template, i) => {
          const Icon = template.icon
          return (
            <motion.div key={template.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <button onClick={() => handleGenerate(template.name)} className="w-full text-left group" disabled={generating}>
                <Card className="cursor-pointer hover:border-blue-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 mb-4 group-hover:bg-blue-500/20 transition-colors">
                      <Icon className="h-6 w-6 text-blue-500" />
                    </div>
                    <h3 className="font-medium mb-1">{template.name}</h3>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          )
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Export Options</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { format: 'PDF', icon: FileText, description: 'Document format for submission' },
              { format: 'Excel', icon: FileSpreadsheet, description: 'Data tables and charts' },
              { format: 'CSV', icon: FileJson, description: 'Raw data export' },
            ].map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  className="flex flex-col items-center gap-2 rounded-lg border border-input p-4 hover:bg-accent transition-colors"
                >
                  <Icon className="h-8 w-8 text-muted-foreground" />
                  <span className="font-medium">{option.format}</span>
                  <span className="text-xs text-muted-foreground text-center">{option.description}</span>
                  <Download className="h-4 w-4 text-muted-foreground mt-2" />
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Generated Reports</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
          ) : reports && reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <FileType className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(report.createdAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{report.generatedBy || 'System'}</span>
                        <span>{report.format}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>No reports generated yet</p>
              <p className="text-sm">Generate your first report by clicking a template above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
