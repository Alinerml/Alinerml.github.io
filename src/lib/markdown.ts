import { unified, type AstroMarkdownOptions } from '@astrojs/markdown-remark'
import rehypeKatex from 'rehype-katex'
import remarkCjkFriendly from 'remark-cjk-friendly'
import remarkMath from 'remark-math'

import rehypeAutolinkHeadings from '../plugins/rehype-auto-link-headings'
import remarkReadingTime from '../plugins/remark-reading-time'
import {
  addCopyButton,
  addLanguage,
  addTitle,
  transformerNotationDiff,
  transformerNotationHighlight,
  updateStyle
} from '../plugins/shiki-transformers'

// Use the same rendering rules on the article page and in the terminal reader.
export function createSiteMarkdownProcessor() {
  return unified({
    remarkPlugins: [remarkMath, remarkCjkFriendly, remarkReadingTime],
    rehypePlugins: [
      rehypeKatex,
      [rehypeAutolinkHeadings, {
        behavior: 'append',
        properties: { className: ['anchor'] },
        content: { type: 'text', value: '#' }
      }]
    ]
  })
}

export const markdownOptions: AstroMarkdownOptions = {
  shikiConfig: {
    themes: { light: 'github-light', dark: 'github-dark' },
    transformers: [
      transformerNotationDiff(),
      transformerNotationHighlight(),
      updateStyle(),
      addTitle(),
      addLanguage(),
      addCopyButton(2000)
    ]
  }
}
