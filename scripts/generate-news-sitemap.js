import { createClient } from "@supabase/supabase-js";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const BASE_URL = "https://bonplaninfos.net";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log("🔒 Mode sécurité : news sitemap minimal généré");
  const today = new Date().toISOString().split("T")[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/news</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
  if (!existsSync("dist")) mkdirSync("dist");
  writeFileSync(path.join("dist", "news-sitemap.xml"), xml.trim());
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateNewsSitemap() {
  const today = new Date().toISOString().split("T")[0];
  try {
    const { data: articles } = await supabase
      .from("news_articles")
      .select("id, slug, updated_at, published_at, created_at")
      .eq("status", "published")
      .limit(1000);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/news</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

    articles?.forEach(article => {
      const lastmod = article.updated_at || article.published_at || article.created_at || today;
      const slug = article.slug || article.id;
      xml += `
  <url>
    <loc>${BASE_URL}/news/${slug}</loc>
    <lastmod>${lastmod.split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    xml += "\n</urlset>";

    if (!existsSync("dist")) mkdirSync("dist");
    writeFileSync(path.join("dist", "news-sitemap.xml"), xml.trim());
    console.log(`✅ News sitemap généré (${articles?.length || 0} articles)`);

  } catch (err) {
    console.error("❌ Erreur news sitemap:", err);
  }
}

generateNewsSitemap();