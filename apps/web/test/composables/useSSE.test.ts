import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSSE } from '~/composables/useSSE'

describe('useSSE', () => {
  let mockEventSource: any

  beforeEach(() => {
    vi.useFakeTimers()
    mockEventSource = {
      close: vi.fn(),
      addEventListener: vi.fn(),
      onopen: null,
      onerror: null,
      readyState: 0,
    }
    vi.stubGlobal('EventSource', vi.fn(() => mockEventSource))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should create EventSource on connect', () => {
    const { connect } = useSSE()
    connect('/test-url', vi.fn())

    expect(EventSource).toHaveBeenCalledWith('/test-url')
  })

  it('should close existing connection before new one', () => {
    const { connect } = useSSE()
    connect('/url1', vi.fn())
    connect('/url2', vi.fn())

    expect(mockEventSource.close).toHaveBeenCalled()
    expect(EventSource).toHaveBeenCalledTimes(2)
  })

  it('should disconnect on close', () => {
    const { connect, disconnect } = useSSE()
    connect('/url', vi.fn())
    disconnect()

    expect(mockEventSource.close).toHaveBeenCalled()
  })

  it('should retry on error with exponential backoff', () => {
    const { connect, retryCount } = useSSE()
    const onError = vi.fn()
    connect('/url', vi.fn(), onError)

    // Trigger error
    mockEventSource.onerror()
    expect(retryCount.value).toBe(1)

    // Should retry after 1s (first backoff = 1000ms)
    vi.advanceTimersByTime(1100)
    expect(EventSource).toHaveBeenCalledTimes(2)
  })

  it('should reset retry count on open', () => {
    const { connect, retryCount } = useSSE()
    connect('/url', vi.fn())

    retryCount.value = 3
    mockEventSource.onopen()

    expect(retryCount.value).toBe(0)
  })
})
