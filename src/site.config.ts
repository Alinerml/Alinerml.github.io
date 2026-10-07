import type { Config, IntegrationUserConfig, ThemeUserConfig } from 'astro-pure/types'

import { comments } from './data/comments'
import { site } from './data/site'

export const theme: ThemeUserConfig = {
  title: site.title,
  author: site.nickname,
  description: site.description,
  favicon: '/favicon.svg',
  locale: {
    lang: 'zh-CN',
    attrs: 'zh_CN',
    dateLocale: 'zh-CN',
    dateOptions: { day: 'numeric', month: 'short', year: 'numeric' }
  },
  logo: { src: 'src/assets/avatar.webp', alt: 'Alinerml' },
  titleDelimiter: '•',
  prerender: true,
  npmCDN: 'https://cdn.jsdelivr.net/npm',
  head: [],
  customCss: [],
  header: {
    menu: [
      { title: 'Blog', link: '/blog/' },
      { title: 'Projects', link: '/projects/' },
      { title: 'Links', link: '/links/' },
      { title: 'About', link: '/about/' },
      { title: 'Contact', link: '/contact/' }
    ]
  },
  footer: {
    year: '© 2026\u00a0',
    links: [],
    credits: true,
    social: [
      { icon: 'github', label: 'GitHub', href: site.github },
      { icon: 'rss', label: 'RSS', href: '/rss.xml' }
    ]
  },
  content: {
    externalLinks: { content: ' ↗', properties: { target: '_blank', rel: 'noopener noreferrer' } },
    blogPageSize: 8,
    share: []
  }
}

export const integ: IntegrationUserConfig = {
  links: {
    logbook: [],
    applyTip: [
      { name: 'Name', val: theme.title },
      { name: 'Desc', val: site.description },
      { name: 'Link', val: `${site.url}/` },
      { name: 'Avatar', val: `${site.url}/assets/avatar.webp` }
    ]
  },
  pagefind: false,
  quote: { server: '', target: '' },
  typography: { class: 'prose text-base text-muted-foreground' },
  mediumZoom: { enable: true, selector: '.prose .zoomable', options: { className: 'zoomable' } },
  waline: {
    enable: comments.enabled,
    server: comments.serverURL,
    additionalConfigs: {
      pageview: false,
      comment: false,
      dark: 'html.dark',
      login: 'disable',
      requiredMeta: ['nick']
    }
  }
}

export default { ...theme, integ } as Config
