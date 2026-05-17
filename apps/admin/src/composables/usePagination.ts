export function usePagination(defaultPageSize = 20) {
  const page = ref(1)
  const pageSize = ref(defaultPageSize)
  const total = ref(0)
  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

  function reset() {
    page.value = 1
  }

  function onChange(p: number, ps: number) {
    page.value = p
    pageSize.value = ps
  }

  return { page, pageSize, total, totalPages, reset, onChange }
}
