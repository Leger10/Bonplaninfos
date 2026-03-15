import { createClient } from "@supabase/supabase-js";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔒 Configuration – à adapter selon votre environnement
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const BASE_URL = "https://bonplaninfos.net";
const LANGUAGES = ["fr", "en"];
const AFRICAN_COUNTRIES = ["ci", "sn", "cm", "ml", "bf", "bj", "tg", "ga", "cg", "cd", "gn", "ne", "td", "cf", "mg", "gh", "ng", "ke"];

// Pages statiques
const STATIC_PAGES = [
  "/", "/discover", "/events", "/promotions", "/news",
  "/sponsors", "/about", "/how-it-works",
  "/pricing", "/packs", "/wallet", "/create-event",
  "/boost", "/help-center", "/faq", "/terms",
  "/privacy-policy", "/legal-mentions", "/partner-signup",
  "/marketing"
];

// Si pas de clés, générer un sitemap minimal (pour développement)
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log("🔒 Mode sécurité : sitemap statique généré");
  const today = new Date().toISOString().split("T")[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  STATIC_PAGES.forEach(page => {
    xml += `  <url>\n    <loc>${BASE_URL}${page === "/" ? "" : page}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${page === "/" ? "1.0" : "0.7"}</priority>\n  </url>\n`;
  });

  xml += "</urlset>";
  writeFileSync(path.join(process.cwd(), "dist", "sitemap.xml"), xml.trim());
  console.log(`✅ Sitemap statique généré avec ${STATIC_PAGES.length} pages`);
  process.exit(0);
}

// Connexion Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log("✅ Connecté à Supabase");

/**
 * Récupère toutes les routes dynamiques (événements, promotions, etc.)
 */
async function fetchDynamicRoutes() {
  const dynamicRoutes = [];

  try {
    // Événements actifs
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, updated_at, created_at, cover_image, title, description")
      .eq("status", "active")
      .limit(50000); // limite pour éviter les timeouts, adapter si besoin

    if (eventsError) {
      console.error("❌ Erreur events:", eventsError);
    } else {
      events.forEach((event) => {
        const lastmod = event.updated_at || event.created_at || new Date().toISOString().split("T")[0];
        dynamicRoutes.push({
          path: `/event/${event.id}`,
          lastmod,
          images: event.cover_image ? [{
            loc: event.cover_image,
            title: event.title,
            caption: event.description?.substring(0, 200)
          }] : []
        });
      });
      console.log(`✅ ${events.length} événements chargés`);
    }

    // Packs de promotion (si vous en avez)
    const { data: promotionPacks, error: promoError } = await supabase
      .from("promotion_packs")
      .select("id, created_at")
      .limit(10000);

    if (promoError) {
      console.error("❌ Erreur promotion_packs:", promoError);
    } else {
      promotionPacks.forEach((promo) => {
        dynamicRoutes.push({
          path: `/promotion/${promo.id}`,
          lastmod: promo.created_at || new Date().toISOString().split("T")[0],
          images: []
        });
      });
      console.log(`✅ ${promotionPacks.length} promotions chargées`);
    }
  } catch (error) {
    console.error("❌ Erreur fetchDynamicRoutes:", error);
  }

  return dynamicRoutes;
}

/**
 * Génère une entrée <url> avec hreflang et images
 */
function generateUrlEntry(url, lastmod, priority, alternates = [], images = []) {
  let xml = `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>${priority}</priority>\n`;

  // Images
  images.forEach(img => {
    xml += `    <image:image>\n      <image:loc>${img.loc}</image:loc>\n`;
    if (img.title) xml += `      <image:title>${escapeXml(img.title)}</image:title>\n`;
    if (img.caption) xml += `      <image:caption>${escapeXml(img.caption)}</image:caption>\n`;
    xml += `    </image:image>\n`;
  });

  // Hreflang
  alternates.forEach(alt => {
    xml += `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />\n`;
  });

  xml += `  </url>`;
  return xml;
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Point d'entrée principal
 */
async function generateSitemap() {
  console.log("🚀 Génération du sitemap...");
  const dynamicRoutes = await fetchDynamicRoutes();
  const today = new Date().toISOString().split("T")[0];

  let totalUrls = 0;
  let sitemapIndexEntries = [];

  // Définir le nombre max d'URLs par sitemap (50 000 est la limite Google)
  const MAX_URLS_PER_SITEMAP = 45000; // un peu moins pour être sûr
  let sitemapParts = [];
  let currentPart = [];
  let partIndex = 1;

  // Ajouter les pages statiques
  STATIC_PAGES.forEach(page => {
    const alternates = [];
    LANGUAGES.forEach(lang => {
      AFRICAN_COUNTRIES.forEach(country => {
        alternates.push({
          hreflang: `${lang}-${country.toUpperCase()}`,
          href: `${BASE_URL}/${lang}/${country}${page === "/" ? "" : page}`
        });
      });
    });
    alternates.push({
      hreflang: "x-default",
      href: `${BASE_URL}/fr/ci${page === "/" ? "" : page}`
    });

    currentPart.push({
      url: `${BASE_URL}${page === "/" ? "" : page}`,
      lastmod: today,
      priority: page === "/" ? "1.0" : "0.7",
      alternates,
      images: []
    });

    if (currentPart.length >= MAX_URLS_PER_SITEMAP) {
      sitemapParts.push(currentPart);
      currentPart = [];
    }
  });

  // Ajouter les routes dynamiques
  dynamicRoutes.forEach(route => {
    const alternates = [];
    LANGUAGES.forEach(lang => {
      AFRICAN_COUNTRIES.forEach(country => {
        alternates.push({
          hreflang: `${lang}-${country.toUpperCase()}`,
          href: `${BASE_URL}/${lang}/${country}${route.path}`
        });
      });
    });
    alternates.push({
      hreflang: "x-default",
      href: `${BASE_URL}/fr/ci${route.path}`
    });

    currentPart.push({
      url: `${BASE_URL}${route.path}`,
      lastmod: route.lastmod,
      priority: "0.9",
      alternates,
      images: route.images
    });

    if (currentPart.length >= MAX_URLS_PER_SITEMAP) {
      sitemapParts.push(currentPart);
      currentPart = [];
    }
  });

  if (currentPart.length > 0) {
    sitemapParts.push(currentPart);
  }

  // S'assurer que le dossier dist existe
  const distDir = path.join(process.cwd(), "dist");
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  // Si un seul sitemap, écrire directement sitemap.xml
  if (sitemapParts.length === 1) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    sitemapParts[0].forEach(entry => {
      xml += generateUrlEntry(entry.url, entry.lastmod, entry.priority, entry.alternates, entry.images) + "\n";
    });

    xml += "</urlset>";
    writeFileSync(path.join(distDir, "sitemap.xml"), xml.trim());
    console.log(`✅ Sitemap généré avec ${sitemapParts[0].length} URLs`);
  } else {
    // Générer un sitemap index
    let indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    sitemapParts.forEach((part, idx) => {
      const filename = `sitemap-${idx + 1}.xml`;
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

      part.forEach(entry => {
        xml += generateUrlEntry(entry.url, entry.lastmod, entry.priority, entry.alternates, entry.images) + "\n";
      });

      xml += "</urlset>";
      writeFileSync(path.join(distDir, filename), xml.trim());

      indexXml += `  <sitemap>\n    <loc>${BASE_URL}/${filename}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n`;
    });

    indexXml += "</sitemapindex>";
    writeFileSync(path.join(distDir, "sitemap.xml"), indexXml.trim());
    console.log(`✅ Sitemap index généré avec ${sitemapParts.length} sous‑sitemaps`);
  }

  console.log("🎉 Génération terminée !");
}

generateSitemap().catch(err => {
  console.error("❌ Erreur fatale :", err);
  process.exit(1);
});