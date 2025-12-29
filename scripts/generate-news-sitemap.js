import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const BASE_URL = 'https://bonplaninfos.net'
const PUBLICATION_NAME = 'BonPlanInfos'
const LANGUAGE = 'fr'

// ⏱️ 48 dernières heures
const sinceDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

async function generateNewsSitemap() {
  console.log('📰 Generating Google News sitemap...')

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, created_at')
    .eq('status', 'active')
    .gte('created_at', sinceDate)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) {
    console.error('❌ News sitemap error:', error)
    process.exit(1)
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">`

  events.forEach(event => {
    xml += `
  <url>
    <loc>${BASE_URL}/event/${event.id}</loc>
    <news:news>
      <news:publication>
        <news:name>${PUBLICATION_NAME}</news:name>
        <news:language>${LANGUAGE}</news:language>
      </news:publication>
      <news:publication_date>${event.created_at}</news:publication_date>
      <news:title><![CDATA[${event.title.slice(0,110)}]]></news:title>
    </news:news>
  </url>`
  })

  xml += '\n</urlset>'

  const distPath = path.resolve(process.cwd(), 'dist')
  writeFileSync(path.join(distPath, 'sitemap-news.xml'), xml.trim())

  console.log(`✅ Google News sitemap generated`)
  console.log(`📰 Articles: ${events.length}`)
}

generateNewsSitemap()
