import { marked } from 'marked'
import hljs from 'highlight.js'

const renderer = new marked.Renderer()

renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const validLang = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = hljs.highlight(text, { language: validLang }).value
  return `<pre class="bg-gray-100 rounded-lg p-4 overflow-x-auto my-3"><code class="language-${validLang}">${highlighted}</code></pre>`
}

renderer.table = function ({ header, rows }: { header: { text: string }[]; rows: { text: string }[][] }) {
  const headerHtml = header.map((h) => `<th class="border px-3 py-2 bg-gray-100">${h.text}</th>`).join('')
  const bodyHtml = rows
    .map(
      (row) =>
        `<tr>${row.map((c) => `<td class="border px-3 py-2">${c.text}</td>`).join('')}</tr>`,
    )
    .join('')
  return `<div class="overflow-x-auto my-3"><table class="border-collapse border w-full text-sm"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`
}

marked.setOptions({
  renderer,
  breaks: true,
  gfm: true,
})

export function renderMarkdown(text: string): string {
  if (!text) return ''
  return marked.parse(text) as string
}
