export function useScrollAnimation() {
  const observer = ref<IntersectionObserver | null>(null)

  function observe(el: HTMLElement | null) {
    if (!el) return
    el.classList.add('reveal-init')
    getObserver().observe(el)
  }

  function getObserver(): IntersectionObserver {
    if (!observer.value) {
      observer.value = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('reveal-active')
              observer.value?.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
      )
    }
    return observer.value
  }

  onUnmounted(() => {
    observer.value?.disconnect()
    observer.value = null
  })

  return { observe }
}
