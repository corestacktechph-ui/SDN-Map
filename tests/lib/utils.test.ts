import { cn, calculateImprovement, formatBytes, formatLatency, formatDuration, truncate } from '../../src/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })
})

describe('calculateImprovement', () => {
  it('calculates improvement percentage', () => {
    expect(calculateImprovement(100, 50)).toBe(50)
    expect(calculateImprovement(100, 0)).toBe(100)
  })

  it('returns 0 when traditional is 0', () => {
    expect(calculateImprovement(0, 50)).toBe(0)
  })
})

describe('formatBytes', () => {
  it('formats bytes to human readable', () => {
    expect(formatBytes(0)).toBe('0 Bytes')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1048576)).toBe('1 MB')
  })
})

describe('formatLatency', () => {
  it('formats latency with ms suffix', () => {
    expect(formatLatency(10.5)).toBe('10.50 ms')
  })
})

describe('formatDuration', () => {
  it('formats seconds to readable duration', () => {
    expect(formatDuration(30)).toBe('30s')
    expect(formatDuration(120)).toBe('2m 0s')
    expect(formatDuration(3661)).toBe('1h 1m 1s')
  })
})

describe('truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('hello world', 5)).toBe('hello...')
  })

  it('returns original string if shorter than limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })
})
