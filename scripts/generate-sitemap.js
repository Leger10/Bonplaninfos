import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import path from 'path'

// ===============================
// 🔐 SUPABASE (SERVER ONLY)
// ===============================
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase env variables')
  process.exit(1)
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// ===============================
// 🌍 CONFIG
// ===============================
const BASE_URL = 'https://bonplaninfos.net'

const languages = ['fr', 'en']

const africanCountries = [
  'ci','sn','cm','ml','bf','bj','tg','ga','cg','cd',
  'gn','ne','td','cf','mg','gh','ng','ke'
]

// ===============================
// 📄 STATIC ROUTES (SEO OK)
// ===============================
const staticPages = [
  '/',
  '/discover',
  '/events',
  '/promotions',
  '/news',
  '/contests',
  '/sponsors',
  '/about',
  '/how-it-works',
  '/pricing',
  '/packs',
    '/wallet',
    '/create-event',
    '/boost',
    '/discover',
  '/help-center',
  '/faq',
  '/terms',
  '/privacy-policy',
  '/legal-mentions',
  '/partner-signup',
  '/marketing'
]

// ===============================
// 🖼️ IMAGE & VIDEO XML (EVENTS)
// ===============================
function generateMediaXml(event) {
  let xml = ''

  if (event.cover_image) {
    xml += `
    <image:image>
      <image:loc>${event.cover_image}</image:loc>
      <image:title><![CDATA[${event.title || 'Event'}]]></image:title>
    </image:image>`
  }

  if (Array.isArray(event.images)) {
    event.images.forEach(img => {
      xml += `
    <image:image>
      <image:loc>${img}</image:loc>
      <image:title><![CDATA[${event.title || 'Event'}]]></image:title>
    </image:image>`
    })
  }

  if (event.video_url) {
    xml += `
    <video:video>
      <video:content_loc>${event.video_url}</video:content_loc>
      <video:title><![CDATA[${event.title || 'Event'}]]></video:title>
      <video:family_friendly>yes</video:family_friendly>
    </video:video>`
  }

  return xml
}

// ===============================
// 🔁 FETCH DYNAMIC ROUTES
// ===============================
async function fetchDynamicRoutes() {
  const routes = []

  // EVENTS
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title, cover_image, images, video_url, updated_at')
    .eq('status', 'active')
    .limit(5000)

  if (eventsError) {
    console.error('❌ Events error:', eventsError)
  } else {
    events.forEach(e => {
      routes.push({
        path: `/event/${e.id}`,
        lastmod: e.updated_at?.split('T')[0],
        media: generateMediaXml(e)
      })
    })
    console.log(`✅ Fetched ${events.length} events`)
  }

  // PROMOTIONS
  const { data: promotions } = await supabase
    .from('promotion_packs')
    .select('id, updated_at')
    .eq('status', 'active')

  promotions?.forEach(p => {
    routes.push({
      path: `/promotion/${p.id}`,
      lastmod: p.updated_at?.split('T')[0]
    })
  })

  // CONTESTS
  const { data: contests } = await supabase
    .from('contests')
    .select('id, updated_at')
    .eq('status', 'active')

  contests?.forEach(c => {
    routes.push({
      path: `/contest/${c.id}`,
      lastmod: c.updated_at?.split('T')[0]
    })
  })

  return routes
}

// ===============================
// 🧱 URL GENERATOR
// ===============================
function generateAlternates(path) {
  const alternates = []

  languages.forEach(lang => {
    africanCountries.forEach(country => {
      alternates.push(
        `<xhtml:link rel="alternate" hreflang="${lang}-${country.toUpperCase()}" href="${BASE_URL}/${lang}/${country}${path}"/>`
      )
    })
  })

  alternates.push(
    `<xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/fr/ci${path}"/>`
  )

  return alternates.join('\n')
}

// ===============================
// 🗺️ GENERATE SITEMAP
// ===============================
async function generateSitemap() {
  console.log('🚀 Generating sitemap...')

  const dynamicRoutes = await fetchDynamicRoutes()
  const today = new Date().toISOString().split('T')[0]

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`

  // STATIC
  staticPages.forEach(page => {
    xml += `
  <url>
    <loc>${BASE_URL}${page === '/' ? '' : page}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page === '/' ? '1.0' : '0.7'}</priority>
${generateAlternates(page === '/' ? '' : page)}
  </url>`
  })

  // DYNAMIC
  dynamicRoutes.forEach(r => {
    xml += `
  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
${generateAlternates(r.path)}
${r.media || ''}
  </url>`
  })

  xml += '\n</urlset>'

  const distPath = path.resolve(process.cwd(), 'dist')
  writeFileSync(path.join(distPath, 'sitemap.xml'), xml.trim())

  console.log(`✅ Sitemap generated`)
  console.log(`📊 Total URLs: ${staticPages.length + dynamicRoutes.length}`)
}

generateSitemap().catch(err => {
  console.error('❌ Sitemap fatal error:', err)
  process.exit(1)
})
