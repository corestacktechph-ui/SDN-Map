'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Settings, Bell, Shield, Wifi, Database, Save, User } from 'lucide-react'
import { settingsService, type AppSettings } from '@/services'
import { toast } from 'react-hot-toast'

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(settingsService.get)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSettings(settingsService.get())
  }, [])

  const toggleSetting = (key: keyof AppSettings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings((prev) => ({ ...prev, [key]: !prev[key] as never }))
    }
  }

  const updateSetting = (key: keyof AppSettings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [key]: value as never }))
  }

  const handleSave = () => {
    setSaving(true)
    try {
      settingsService.save(settings)
      toast.success('Settings saved successfully!')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure system preferences and network parameters</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general"><Settings className="h-4 w-4 mr-2" />General</TabsTrigger>
          <TabsTrigger value="network"><Wifi className="h-4 w-4 mr-2" />Network</TabsTrigger>
          <TabsTrigger value="monitoring"><Database className="h-4 w-4 mr-2" />Monitoring</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" />Notifications</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-2" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Display Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Use dark theme across the application</p>
                </div>
                <button
                  onClick={() => toggleSetting('darkMode')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.darkMode ? 'bg-blue-600' : 'bg-muted'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto Refresh</p>
                  <p className="text-sm text-muted-foreground">Automatically refresh dashboard data</p>
                </div>
                <button
                  onClick={() => toggleSetting('autoRefresh')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoRefresh ? 'bg-blue-600' : 'bg-muted'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autoRefresh ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Profile Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Full Name</label>
                  <input type="text" defaultValue="Researcher Amira" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <input type="email" defaultValue="researcher@amira-capstone.com" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Network Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Ryu Controller Host</label>
                  <input type="text" value={settings.ryuHost} onChange={(e) => updateSetting('ryuHost', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Ryu Controller Port</label>
                  <input type="number" value={settings.ryuPort} onChange={(e) => updateSetting('ryuPort', parseInt(e.target.value))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">REST API Port</label>
                  <input type="number" value={settings.restApiPort} onChange={(e) => updateSetting('restApiPort', parseInt(e.target.value))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Network CIDR</label>
                  <input type="text" value={settings.networkCidr} onChange={(e) => updateSetting('networkCidr', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Monitoring Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Monitoring Interval (ms)</label>
                <input type="number" value={settings.monitoringInterval} onChange={(e) => updateSetting('monitoringInterval', parseInt(e.target.value))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <p className="text-xs text-muted-foreground mt-1">How often to poll network statistics (lower = more real-time, higher = less CPU)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive browser notifications</p>
                </div>
                <button onClick={() => toggleSetting('notifications')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.notifications ? 'bg-blue-600' : 'bg-muted'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.notifications ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sound Alerts</p>
                  <p className="text-sm text-muted-foreground">Play sound on critical alerts</p>
                </div>
                <button onClick={() => toggleSetting('soundAlerts')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.soundAlerts ? 'bg-blue-600' : 'bg-muted'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.soundAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Reports</p>
                  <p className="text-sm text-muted-foreground">Receive weekly report summaries</p>
                </div>
                <button onClick={() => toggleSetting('emailReports')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.emailReports ? 'bg-blue-600' : 'bg-muted'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.emailReports ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Security Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Current Password</label>
                <input type="password" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">New Password</label>
                  <input type="password" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
                  <input type="password" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
              <Button variant="outline">Update Password</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Active Sessions</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <User className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Current Session</p>
                  <p className="text-xs text-muted-foreground">Started 2 hours ago</p>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
