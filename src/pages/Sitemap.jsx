import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import path from "path";

// 🔒 SECURITE : Les clés viennent SEULEMENT de Netlify
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// ⚠️ Si pas de clés (en local), on génère un sitemap minimal
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log("🔒 Mode sécurité : sitemap statique généré");
  
  const BASE_URL = "https://bonplaninfos.net";
  const today = new Date().toISOString().split("T")[0];
  
  const staticPages = [
    "/", "/discover", "/events", "/promotions", "/news", 
    "/events", "/sponsors", "/about", "/how-it-works",
    "/pricing", "/packs", "/wallet", "/create-event",
    "/boost", "/help-center", "/faq", "/terms",
    "/privacy-policy", "/legal-mentions", "/partner-signup",
    "/marketing"
  ];
  
  let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  staticPages.forEach(page => {
    sitemapXml += `
  <url>
    <loc>${BASE_URL}${page === "/" ? "" : page}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page === "/" ? "1.0" : "0.7"}</priority>
  </url>`;
  });

  sitemapXml += "\n</urlset>";
  
  writeFileSync(path.join(process.cwd(), "dist", "sitemap.xml"), sitemapXml.trim());
  console.log(`✅ Sitemap statique généré avec ${staticPages.length} pages`);
  process.exit(0);
}

// Seulement sur Netlify on se connecte à Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log("✅ Connecté à Supabase (Netlify)");

// Le reste de ton code original...
const BASE_URL = "https://bonplaninfos.net";
const africanCountries = ["ci", "sn", "cm", "ml", "bf", "bj", "tg", "ga", "cg", "cd", "gn", "ne", "td", "cf", "mg", "gh", "ng", "ke"];
const languages = ["fr", "en"];
const staticPages = ["/", "/discover", "/events", "/promotions", "/news", "/events", "/sponsors", "/about", "/how-it-works", "/pricing", "/packs", "/wallet", "/create-event", "/boost", "/help-center", "/faq", "/terms", "/privacy-policy", "/legal-mentions", "/partner-signup", "/marketing"];

async function fetchDynamicRoutes() {
  const dynamicRoutes = [];

  try {
    // Fetch events
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, updated_at, created_at")
      .eq("status", "active")
      .limit(10000);

    if (eventsError) {
      console.error("❌ Error fetching events:", eventsError);
    } else {
      events.forEach((event) => {
        const lastmod = event.updated_at || event.created_at || new Date().toISOString().split("T")[0];
        dynamicRoutes.push({
          path: `/event/${event.id}`,
          lastmod: lastmod,
        });
      });
      console.log(`✅ Fetched ${events.length} events`);
    }

    // Fetch promotion_packs
    const { data: promotionPacks, error: promotionPacksError } = await supabase
      .from("promotion_packs")
      .select("id, created_at")
      .limit(10000);

    if (promotionPacksError) {
      console.error("❌ Error fetching promotion_packs:", promotionPacksError);
    } else {
      promotionPacks.forEach((promo) => {
        dynamicRoutes.push({
          path: `/promotion/${promo.id}`,
          lastmod: promo.created_at || new Date().toISOString().split("T")[0],
        });
      });
      console.log(`✅ Fetched ${promotionPacks.length} promotion_packs`);
    }
  } catch (error) {
    console.error("❌ Error in fetchDynamicRoutes:", error);
  }

  return dynamicRoutes;
}

function generateUrlEntry(url, lastmod, alternates = [], priority = "0.8") {
  let alternatesXml = "";

  if (alternates.length > 0) {
    alternatesXml = alternates
      .map(
        (alt) =>
          `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}"/>`
      )
      .join("\n");
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
  console.log("🚀 Starting sitemap generation...");

  try {
    const dynamicRoutes = await fetchDynamicRoutes();
    const today = new Date().toISOString().split("T")[0];

    let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

    // Generate static pages with internationalization
    staticPages.forEach((page) => {
      const alternates = [];

      languages.forEach((lang) => {
        africanCountries.forEach((country) => {
          alternates.push({
            hreflang: `${lang}-${country.toUpperCase()}`,
            href: `${BASE_URL}/${lang}/${country}${page === "/" ? "" : page}`,
          });
        });
      });

      // Add default language
      alternates.push({
        hreflang: "x-default",
        href: `${BASE_URL}/fr/ci${page === "/" ? "" : page}`,
      });

      const priority = page === "/" ? "1.0" : "0.7";
      sitemapXml += generateUrlEntry(
        `${BASE_URL}${page === "/" ? "" : page}`,
        today,
        alternates,
        priority
      );
    });
    console.log(`✅ Generated ${staticPages.length} static pages`);

    // Generate dynamic pages
    dynamicRoutes.forEach((route) => {
      const alternates = [];

      languages.forEach((lang) => {
        africanCountries.forEach((country) => {
          alternates.push({
            hreflang: `${lang}-${country.toUpperCase()}`,
            href: `${BASE_URL}/${lang}/${country}${route.path}`,
          });
        });
      });

      alternates.push({
        hreflang: "x-default",
        href: `${BASE_URL}/fr/ci${route.path}`,
      });

      sitemapXml += generateUrlEntry(
        `${BASE_URL}${route.path}`,
        route.lastmod,
        alternates,
        "0.9"
      );
    });
    console.log(`✅ Generated ${dynamicRoutes.length} dynamic pages`);

    sitemapXml += "\n</urlset>";

    // Write sitemap file
    writeFileSync(path.join(process.cwd(), "dist", "sitemap.xml"), sitemapXml.trim());

    console.log("✅ Sitemap generated successfully at dist/sitemap.xml");
    console.log(`📊 Total URLs: ${staticPages.length + dynamicRoutes.length}`);

  } catch (error) {
    console.error("❌ Error generating sitemap:", error);
    // Ne quitte pas en erreur, Netlify continuera le build
  }
}

// Run the script
generateSitemap().catch((error) => {
  console.error("❌ Fatal error:", error);
  // Sortie silencieuse pour ne pas casser le build Netlify
});