import { api } from '../../src/services/api'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('api service', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('get makes a GET request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    })
    const result = await api.get('/test')
    expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({}))
    expect(result).toEqual({ data: 'test' })
  })

  it('post sends JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '1' }),
    })
    const result = await api.post('/test', { name: 'foo' })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'foo' }),
      })
    )
    expect(result).toEqual({ id: '1' })
  })

  it('throws on error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    })
    await expect(api.get('/missing')).rejects.toThrow('Not found')
  })

  it('delete sends DELETE method', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
    const result = await api.delete('/resource/1')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/resource/1',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result).toEqual({ success: true })
  })
})
