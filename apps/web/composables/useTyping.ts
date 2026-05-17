export function useTyping() {
  const displayText = ref('')
  const isTyping = ref(false)
  const fullText = ref('')
  let timer: ReturnType<typeof setInterval> | null = null
  let charIndex = 0
  const charsPerTick = 2
  const tickMs = 60

  function start(text: string) {
    stop()
    fullText.value = text
    displayText.value = ''
    charIndex = 0
    isTyping.value = true

    timer = setInterval(() => {
      charIndex += charsPerTick
      if (charIndex >= text.length) {
        displayText.value = text
        stop()
        return
      }
      displayText.value = text.slice(0, charIndex)
    }, tickMs)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    isTyping.value = false
  }

  function finish() {
    stop()
    displayText.value = fullText.value
  }

  onUnmounted(() => stop())

  return { displayText, isTyping, start, stop, finish }
}
