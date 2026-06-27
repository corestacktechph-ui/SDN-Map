import { useAppStore } from '../../src/store/appStore'

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      sidebarCollapsed: false,
      alerts: [],
      unreadNotifications: 0,
      simulationStatus: 'idle',
    })
  })

  it('toggles sidebar', () => {
    expect(useAppStore.getState().sidebarCollapsed).toBe(false)
    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarCollapsed).toBe(true)
    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarCollapsed).toBe(false)
  })

  it('sets alerts', () => {
    const alerts = [{ id: '1', title: 'Test', message: 'Test alert', severity: 'HIGH', source: null, acknowledged: false, resolved: false, createdAt: new Date().toISOString(), resolvedAt: null }]
    useAppStore.getState().setAlerts(alerts)
    expect(useAppStore.getState().alerts).toEqual(alerts)
  })

  it('sets unread notifications count', () => {
    useAppStore.getState().setUnreadNotifications(5)
    expect(useAppStore.getState().unreadNotifications).toBe(5)
  })

  it('sets simulation status', () => {
    useAppStore.getState().setSimulationStatus('running')
    expect(useAppStore.getState().simulationStatus).toBe('running')
  })
})
