import react from '@astrojs/react'
import AstroPureIntegration from 'astro-pure'
import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'
import { createSiteMarkdownProcessor, markdownOptions } from './src/lib/markdown'
// Configuration is evaluated before Astro exposes import.meta.env to pages.
const env = loadEnv(process.env.NODE_ENV === 'development' ? 'development' : 'production', process.cwd(), 'PUBLIC_')
for (const key of ['PUBLIC_SITE_URL', 'PUBLIC_WALINE_SERVER_URL']) {
  if (process.env[key] === undefined && env[key] !== undefined) process.env[key] = env[key]
}
const { default: config } = await import('./src/site.config')

const pure = AstroPureIntegration(config)
const setupPure = pure.hooks['astro:config:setup']
// Pure still reads Astro 6's removed legacy flag; these are modern collections.
pure.hooks['astro:config:setup'] = (context) =>
  setupPure?.({
    ...context,
    config: Object.assign({}, context.config, { legacy: { collectionsBackwardsCompat: false } })
  })

// Static hosting adaptation of joyehuang/blog with its original Pure theme.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://Alinerml.github.io',
  output: 'static',
  trailingSlash: 'always',
  redirects: {
    '/articles': '/blog',
    '/articles/[...id]': '/blog/[...id]'
  },
  integrations: [pure, react()],
  prefetch: true,
  devToolbar: { enabled: false },
  vite: { optimizeDeps: { include: ['@waline/client', 'medium-zoom'] } },
  markdown: {
    ...markdownOptions,
    processor: createSiteMarkdownProcessor()
  }
})
