import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ⚠️ CORRECTION : Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

// Maintenant ces variables seront chargées correctement
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// ⚠️ CORRECTION : Vérification des variables
console.log('🔧 Configuration Supabase:');
console.log('URL:', supabaseUrl ? '✓ Défini' : '✗ Non défini');
console.log('Key:', supabaseKey ? '✓ Défini (' + supabaseKey.substring(0, 10) + '...)' : '✗ Non défini');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERREUR: Variables Supabase manquantes dans le fichier .env');
    console.error('   Assurez-vous que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définis');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://bonplaninfos.net';

const africanCountries = [
    'ci', 'sn', 'cm', 'ml', 'bf', 'bj', 'tg', 'ga', 'cg', 'cd', 'gn', 'ne', 'td', 'cf', 'mg', 'gh', 'ng', 'ke'
];
const languages = ['fr', 'en'];
const staticPages = [
    '/', 
    '/decouvrir',           // au lieu de '/discover'
    '/evenements',          // au lieu de '/events'
    '/promotions', 
    '/actualites',          // au lieu de '/news'
    '/partenaires',         // au lieu de '/sponsors'
    '/a-propos',            // au lieu de '/about'
    '/comment-ca-marche',   // au lieu de '/how-it-works'
    '/tarifs',              // au lieu de '/pricing'
    '/aide',                // au lieu de '/help-center'
    '/conditions-utilisation', // au lieu de '/terms'
    '/politique-confidentialite', // au lieu de '/privacy-policy'
    '/mentions-legales'     // au lieu de '/legal-mentions'
];

async function fetchDynamicRoutes() {
    const dynamicRoutes = [];

    try {
        // Fetch events
        console.log('📅 Fetching events from Supabase...');
        const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('id, updated_at')
            .eq('status', 'active')
            .limit(5000);

        if (eventsError) {
            console.error('❌ Error fetching events:', eventsError);
        } else {
            events.forEach(event => {
                dynamicRoutes.push({
                    path: `/event/${event.id}`,
                    lastmod: event.updated_at || new Date().toISOString().split('T')[0]
                });
            });
            console.log(`✅ Fetched ${events.length} events`);
        }

        // Fetch promotions - CORRIGÉ avec les bonnes colonnes
        console.log('🎯 Fetching promotions from Supabase...');
        const { data: promotions, error: promotionsError } = await supabase
            .from('promotion_packs')
            .select('id, slug, created_at, is_active')
            .eq('is_active', true)  // Utilise is_active au lieu de status
            .limit(5000);

        if (promotionsError) {
            console.error('❌ Error fetching promotions:', promotionsError);
        } else {
            promotions.forEach(promo => {
                // Utilise le slug si disponible, sinon l'id
                const pathSlug = promo.slug || promo.id;
                dynamicRoutes.push({
                    path: `/promotion/${pathSlug}`,
                    lastmod: promo.created_at || new Date().toISOString().split('T')[0]
                });
            });
            console.log(`✅ Fetched ${promotions.length} promotions`);
        }

    } catch (error) {
        console.error('❌ Error in fetchDynamicRoutes:', error);
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
        const today = new Date().toISOString().split('T')[0];

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
const distPath = path.resolve(process.cwd(), 'dist');
writeFileSync(path.join(distPath, 'sitemap.xml'), sitemapXml.trim());

console.log('✅ Sitemap generated successfully at dist/sitemap.xml');
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