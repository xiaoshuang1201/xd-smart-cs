import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTyping } from '~/composables/useTyping'

describe('useTyping', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start with empty text', () => {
    const { displayText, isTyping } = useTyping()
    expect(displayText.value).toBe('')
    expect(isTyping.value).toBe(false)
  })

  it('should type characters progressively', () => {
    const { displayText, isTyping, start } = useTyping()
    start('Hello')

    expect(isTyping.value).toBe(true)

    // Advance timer by 60ms (1 tick = 2 chars)
    vi.advanceTimersByTime(60)
    expect(displayText.value).toBe('He')

    vi.advanceTimersByTime(60)
    expect(displayText.value).toBe('Hell')

    vi.advanceTimersByTime(60)
    expect(displayText.value).toBe('Hello')
    expect(isTyping.value).toBe(false)
  })

  it('should finish immediately on finish()', () => {
    const { displayText, isTyping, start, finish } = useTyping()
    start('Hello World')

    finish()
    expect(displayText.value).toBe('Hello World')
    expect(isTyping.value).toBe(false)
  })

  it('should stop and reset', () => {
    const { isTyping, start, stop } = useTyping()
    start('Test')

    stop()
    expect(isTyping.value).toBe(false)
  })

  it('should handle empty text', () => {
    const { displayText, isTyping, start } = useTyping()
    start('')

    // Should immediately stop since there's nothing to type
    vi.advanceTimersByTime(60)
    expect(displayText.value).toBe('')
    // At t=0: charIndex=0, text.length=0, so displayText='' and stop() called
    expect(isTyping.value).toBe(false)
  })
})
