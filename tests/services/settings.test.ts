import { settingsService, defaultSettings } from '../../src/services/settings'

describe('settingsService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default settings when nothing is stored', () => {
    const settings = settingsService.get()
    expect(settings).toEqual(defaultSettings)
  })

  it('saves and retrieves settings', () => {
    const customSettings = { ...defaultSettings, darkMode: false, ryuPort: 6653 }
    settingsService.save(customSettings)
    const retrieved = settingsService.get()
    expect(retrieved.darkMode).toBe(false)
    expect(retrieved.ryuPort).toBe(6653)
  })

  it('merges partial stored settings with defaults', () => {
    localStorage.setItem('app_settings', JSON.stringify({ darkMode: false }))
    const settings = settingsService.get()
    expect(settings.darkMode).toBe(false)
    expect(settings.autoRefresh).toBe(true)
  })
})
