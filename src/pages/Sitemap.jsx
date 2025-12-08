
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://jdeuwvaauerzjdtpwjjz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZXV3dmFhdWVyempkdHB3amp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTkxNTksImV4cCI6MjA3NDg5NTE1OX0.ktxs6yjuy3hRXCjsDzK1x6lJg0e5yEEnzl554nx28Kc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BASE_URL = 'https://bonplaninfos.net';

const africanCountries = [
    'ci', 'sn', 'cm', 'ml', 'bf', 'bj', 'tg', 'ga', 'cg', 'cd', 'gn', 'ne', 'td', 'cf', 'mg', 'gh', 'ng', 'ke'
];
const languages = ['fr', 'en'];
const staticPages = [
    '/', '/discover', '/events', '/promotions', '/news', '/sponsors',
    '/about', '/how-it-works', '/pricing', '/help-center',
    '/terms', '/privacy-policy', '/legal-mentions'
];

async function fetchDynamicRoutes() {
    const dynamicRoutes = [];

    try {
        // Fetch events
        const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('id, updated_at')
            .eq('status', 'active')
            .limit(5000); // Limit to avoid timeout

        if (eventsError) {
            console.error('Error fetching events:', eventsError);
        } else {
            events.forEach(event => {
                dynamicRoutes.push({
                    path: `/event/${event.id}`,
                    lastmod: event.updated_at || new Date().toISOString().split('T')[0]
                });
            });
            console.log(`✅ Fetched ${events.length} events`);
        }

        // Fetch promotions
        const { data: promotions, error: promotionsError } = await supabase
            .from('promotions')
            .select('id, updated_at')
            .eq('status', 'active')
            .limit(5000);

        if (promotionsError) {
            console.error('Error fetching promotions:', promotionsError);
        } else {
            promotions.forEach(promo => {
                dynamicRoutes.push({
                    path: `/promotion/${promo.id}`,
                    lastmod: promo.updated_at || new Date().toISOString().split('T')[0]
                });
            });
            console.log(`✅ Fetched ${promotions.length} promotions`);
        }

    } catch (error) {
        console.error('Error in fetchDynamicRoutes:', error);
    }

    return dynamicRoutes;
}

function generateUrlEntry(url, lastmod, alternates = [], priority = '0.8') {
    let alternatesXml = '';

    if (alternates.length > 0) {
        alternatesXml = alternates.map(alt =>
            `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}"/>`
        ).join('\n');
    }

    return `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
${alternatesXml}
  </url>`;
}

async function generateSitemap() {
    console.log('🚀 Starting sitemap generation...');

    try {
        const dynamicRoutes = await fetchDynamicRoutes();
        const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

        let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

        // Generate static pages with internationalization
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

            // Add default language
            alternates.push({
                hreflang: 'x-default',
                href: `${BASE_URL}/fr/ci${page === '/' ? '' : page}`
            });

            const priority = page === '/' ? '1.0' : '0.7';
            sitemapXml += generateUrlEntry(
                `${BASE_URL}${page === '/' ? '' : page}`,
                today,
                alternates,
                priority
            );
        });
        console.log(`✅ Generated ${staticPages.length} static pages`);

        // Generate dynamic pages (events, promotions)
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

            // Add default language
            alternates.push({
                hreflang: 'x-default',
                href: `${BASE_URL}/fr/ci${route.path}`
            });

            sitemapXml += generateUrlEntry(
                `${BASE_URL}${route.path}`,
                route.lastmod,
                alternates,
                '0.9'
            );
        });
        console.log(`✅ Generated ${dynamicRoutes.length} dynamic pages`);

        sitemapXml += '\n</urlset>';

        // Write sitemap file
        const publicPath = path.resolve(process.cwd(), 'public');
        writeFileSync(path.join(publicPath, 'sitemap.xml'), sitemapXml.trim());

        console.log('✅ Sitemap generated successfully at public/sitemap.xml');
        console.log(`📊 Total URLs: ${staticPages.length + dynamicRoutes.length}`);

    } catch (error) {
        console.error('❌ Error generating sitemap:', error);
        process.exit(1);
    }
}

// Run the script
generateSitemap().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});