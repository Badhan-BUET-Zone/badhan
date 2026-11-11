import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

// Links in a model's answer open in a new tab, so following one never loses the chat.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

export const renderMarkdown = (text: string): string =>
  DOMPurify.sanitize(marked.parse(text, { async: false }) as string)
