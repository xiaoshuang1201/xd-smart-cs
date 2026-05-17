export function useScrollToBottom(containerRef: Ref<HTMLElement | null>) {
  let userScrolledUp = false
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null

  function scrollToBottom(smooth = true) {
    const el = containerRef.value
    if (!el || userScrolledUp) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
  }

  function onScroll() {
    const el = containerRef.value
    if (!el) return

    const threshold = 80
    userScrolledUp = el.scrollHeight - el.scrollTop - el.clientHeight > threshold

    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      userScrolledUp = false
    }, 3000)
  }

  function reset() {
    userScrolledUp = false
    scrollToBottom(false)
  }

  onUnmounted(() => {
    if (scrollTimeout) clearTimeout(scrollTimeout)
  })

  return { scrollToBottom, onScroll, reset }
}
