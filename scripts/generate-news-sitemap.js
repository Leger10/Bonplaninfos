import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import path from "path";

// 🔒 SECURITE : Utilise la clé ANON (publishable) ou quitte proprement
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// ⚠️ Si pas de clés, on génère un sitemap minimal pour les news
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log("🔒 Mode sécurité : news sitemap minimal généré");
  
  const BASE_URL = "https://bonplaninfos.net";
  const today = new Date().toISOString().split("T")[0];
  
  const newsSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/news</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
  
  writeFileSync(path.join(process.cwd(), "dist", "news-sitemap.xml"), newsSitemap.trim());
  console.log("✅ News sitemap minimal généré");
  process.exit(0);
}

// Connecte-toi avec la clé ANON (pas besoin de service_role)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log("✅ Connecté à Supabase pour les news");

const BASE_URL = "https://bonplaninfos.net";

async function generateNewsSitemap() {
  console.log("📰 Génération du sitemap news...");
  const today = new Date().toISOString().split("T")[0];

  try {
    // Essaie de récupérer les articles si la table existe
    const { data: articles, error } = await supabase
      .from("news_articles")  // ou "articles", "posts" selon ta table
      .select("id, slug, updated_at, created_at, published_at")
      .eq("status", "published")
      .limit(1000);

    let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/news</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

    // Ajoute les articles si on en a
    if (articles && !error && articles.length > 0) {
      articles.forEach((article) => {
        const lastmod = article.updated_at || article.published_at || article.created_at || today;
        const slug = article.slug || article.id;
        
        sitemapXml += `
  <url>
    <loc>${BASE_URL}/news/${slug}</loc>
    <lastmod>${lastmod.split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
      });
      console.log(`✅ ${articles.length} articles ajoutés`);
    } else if (error) {
      console.log("ℹ️ Pas de table news trouvée, sitemap basique généré");
    }

    sitemapXml += "\n</urlset>";

    // Écris le fichier
    writeFileSync(path.join(process.cwd(), "dist", "news-sitemap.xml"), sitemapXml.trim());
    console.log("✅ News sitemap généré avec succès");
    console.log("📍 Fichier : dist/news-sitemap.xml");

  } catch (error) {
    console.error("❌ Erreur génération news sitemap:", error);
    
    // Fallback: génère un sitemap minimal
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/news</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
    
    writeFileSync(path.join(process.cwd(), "dist", "news-sitemap.xml"), fallbackSitemap);
    console.log("✅ Fallback news sitemap généré");
  }
}

// Exécute le script
generateNewsSitemap().catch((error) => {
  console.error("❌ Erreur fatale:", error);
  // Quitte silencieusement
});