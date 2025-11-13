import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://jdeuwvaauerzjdtpwjjz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZXV3dmFhdWVyanpkdHB3amp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc2NjA4OTcsImV4cCI6MjAzMzIzNjg5N30.kHq-ProW3m_t3f3a3K9i2pM29wZ1jYq22v22i0G5i_o';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BASE_URL = 'https://bonplaninfos.net';

const africanCountries = [
  'ci', 'sn', 'cm', 'ml', 'bf', 'bj', 'tg', 'ga', 'cg', 'cd', 'gn', 'ne', 'td', 'cf', 'mg', 'gh', 'ng', 'ke'
];
const languages = ['fr', 'en'];

const staticPages = [
  '/',
  '/how-it-works',
  '/pricing',
  '/marketing',
  '/about',
  '/privacy-policy',
  '/help-center',
  '/legal-mentions',
  '/terms'
];

async function fetchDynamicRoutes() {
  const { data: events, error: eventsError } = await supabase.from('events').select('id, updated_at').eq('status', 'active');
  if (eventsError) {
    console.error('Error fetching events:', eventsError);
    return [];
  }

  const { data: promotions, error: promotionsError } = await supabase.from('promotions').select('id, updated_at').eq('status', 'active');
  if (promotionsError) {
    console.error('Error fetching promotions:', promotionsError);
    return [];
  }

  const eventRoutes = events.map(event => ({
    path: `/event/${event.id}`,
    lastmod: event.updated_at || new Date().toISOString()
  }));

  const promotionRoutes = promotions.map(promo => ({
    path: `/promotion/${promo.id}`,
    lastmod: promo.updated_at || new Date().toISOString()
  }));

  return [...eventRoutes, ...promotionRoutes];
}

function generateUrlEntry(url, lastmod, alternates, priority = '0.8') {
  const alternatesXml = alternates.map(alt => 
    `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}"/>`
  ).join('\n');

  return `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${priority}</priority>
${alternatesXml}
  </url>`;
}

async function generateSitemap() {
  console.log('🚀 Starting sitemap generation...');
  const dynamicRoutes = await fetchDynamicRoutes();
  const today = new Date().toISOString();

  let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

  // Static pages
  staticPages.forEach(page => {
    const alternates = [];
    languages.forEach(lang => {
      africanCountries.forEach(country => {
        alternates.push({
          hreflang: `${lang}-${country.toUpperCase()}`,
          href: `${BASE_URL}/${lang}/${country}${page === '/' ? '' : page}`
        });
      });
    });
    const priority = page === '/' ? '1.0' : '0.7';
    sitemapXml += generateUrlEntry(`${BASE_URL}${page}`, today, alternates, priority);
  });
  console.log(`✅ Generated ${staticPages.length} static pages.`);

  // Dynamic pages (events, promotions)
  dynamicRoutes.forEach(route => {
    const alternates = [];
    languages.forEach(lang => {
      africanCountries.forEach(country => {
        alternates.push({
          hreflang: `${lang}-${country.toUpperCase()}`,
          href: `${BASE_URL}/${lang}/${country}${route.path}`
        });
      });
    });
    sitemapXml += generateUrlEntry(`${BASE_URL}${route.path}`, route.lastmod, alternates, '0.9');
  });
  console.log(`✅ Generated ${dynamicRoutes.length} dynamic pages (events & promotions).`);

  sitemapXml += `\n</urlset>`;

  try {
    const publicPath = path.resolve(process.cwd(), 'public');
    writeFileSync(path.join(publicPath, 'sitemap.xml'), sitemapXml);
    console.log('✅ Sitemap generated successfully at public/sitemap.xml');
  } catch (error) {
    console.error('❌ Error writing sitemap file:', error);
  }
}

generateSitemap().catch(console.error);