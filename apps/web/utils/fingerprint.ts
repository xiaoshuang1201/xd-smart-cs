export function generateFingerprint(): string {
  const components: string[] = []

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 50
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillStyle = '#f60'
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = '#069'
      ctx.fillText('XD-Smart-CS 新鼎电炉', 2, 15)
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
      ctx.fillText('XD-Smart-CS 新鼎电炉', 4, 17)
      components.push(canvas.toDataURL())
    }
  } catch { /* ignore */ }

  // WebGL fingerprint
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext & { getExtension(name: string): { getParameter(p: number): string } | null }).getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        components.push(debugInfo.getParameter(37446)) // UNMASKED_RENDERER
      }
    }
  } catch { /* ignore */ }

  // Navigator properties
  components.push(navigator.language)
  components.push(navigator.hardwareConcurrency?.toString() || 'unknown')
  components.push(screen.colorDepth.toString())
  components.push(screen.width + 'x' + screen.height)
  components.push(new Date().getTimezoneOffset().toString())

  const raw = components.join('|')
  return hashString(raw)
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Mix with simple djb2-like transform for better distribution
  const h2 = str.split('').reduce((acc, c) => {
    acc = ((acc << 5) + acc) ^ c.charCodeAt(0)
    return acc & 0xffffffff
  }, 5381)
  return Math.abs(hash ^ h2).toString(16).padStart(8, '0')
}

export function getStoredFingerprint(): string | null {
  try {
    return localStorage.getItem('xd_fingerprint')
  } catch {
    return null
  }
}

export function storeFingerprint(fp: string): void {
  try {
    localStorage.setItem('xd_fingerprint', fp)
  } catch { /* ignore */ }
}
