import { getCollection, type CollectionEntry } from 'astro:content'
import { createSiteMarkdownProcessor, markdownOptions } from '@/lib/markdown'

export async function getStaticPaths() {
  return (await getCollection('blog')).map((post) => ({ params: { id: post.id }, props: { post } }))
}
const processor = createSiteMarkdownProcessor().createRenderer(markdownOptions)
export async function GET({ props }: { props: { post: CollectionEntry<'blog'> } }) {
  const result = await (await processor).render(props.post.body ?? '')
  return new Response(JSON.stringify({ html: result.code, headings: result.metadata.headings }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
